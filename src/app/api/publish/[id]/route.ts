import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { featureGate } from "@/lib/feature-gate";
import { gitService } from "@/lib/services/git.service";
import { getDeploymentService } from "@/lib/services/deployment.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Fetch invitation and verify ownership
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.userId, userId)));

  if (!invitation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Feature gate check
  const { allowed, reason } = await featureGate.canPublish(userId);
  if (!allowed) {
    return NextResponse.json(
      { error: reason ?? "Free tier: 1 published invitation max" },
      { status: 403 }
    );
  }

  // Stub mode: when credentials are not yet configured, return a fake deploymentId
  // so the UI can be tested end-to-end without real Vercel/GitHub tokens.
  if (!process.env.GITHUB_PAT || !process.env.VERCEL_TOKEN) {
    const stubDeployId = `stub_${Date.now()}`;
    await db
      .update(invitations)
      .set({ status: "PUBLISHING", vercelDeployId: stubDeployId, updatedAt: new Date() })
      .where(eq(invitations.id, id));
    return NextResponse.json({ deploymentId: stubDeployId, status: "BUILDING" });
  }

  // Real flow: git write → project create/find → deploy trigger
  const { branch } = await gitService.writeInvitationBranch(id, invitation.fields);

  const deploymentSvc = getDeploymentService();
  let vercelProjectId = invitation.vercelProjectId;
  if (!vercelProjectId) {
    const { projectId } = await deploymentSvc.createOrUpdateProject(id, branch);
    vercelProjectId = projectId;

    // Save projectId immediately so retries reuse the same project
    await db
      .update(invitations)
      .set({ vercelProjectId, updatedAt: new Date() })
      .where(eq(invitations.id, id));

    // Inject required env vars into the new Vercel project
    await setVercelProjectEnvVars(vercelProjectId, id);
  }

  const projectName = `invitation-${id}`;
  const { deploymentId } = await deploymentSvc.triggerDeploy(vercelProjectId, projectName, branch);

  await db
    .update(invitations)
    .set({
      status: "PUBLISHING",
      vercelProjectId,
      vercelDeployId: deploymentId,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, id));

  return NextResponse.json({ deploymentId, status: "BUILDING" });
}

/**
 * Copies required environment variables from the admin app into a newly created
 * Vercel project so the deployed invitation page can initialise Clerk and DB.
 * Best-effort — failure is logged but does not block the publish response.
 */
async function setVercelProjectEnvVars(projectId: string, invitationId: string): Promise<void> {
  const vars = [
    {
      key: "INVITATION_ID",
      value: invitationId,
        type: "plain" as const,
    },
    {
      key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      value: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
      type: "plain" as const,
    },
    {
      key: "CLERK_SECRET_KEY",
      value: process.env.CLERK_SECRET_KEY ?? "",
      type: "sensitive" as const,
    },
    {
      key: "DATABASE_URL",
      value: process.env.DATABASE_URL ?? "",
      type: "sensitive" as const,
    },
    {
      key: "BLOB_READ_WRITE_TOKEN",
      value: process.env.BLOB_READ_WRITE_TOKEN ?? "",
      type: "sensitive" as const,
    },
  ].filter((v) => v.value);

  const body = vars.map((v) => ({
    key: v.key,
    value: v.value,
    type: v.type,
    target: ["production", "preview"],
  }));

  try {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/env`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`[publish] Failed to set env vars on ${projectId}: ${res.status} ${text}`);
    }
  } catch (err) {
    console.error(`[publish] Error setting env vars on ${projectId}:`, err);
  }
}
