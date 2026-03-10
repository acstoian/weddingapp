import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { InvitationFieldsSchema } from "@/lib/templates/schema";
import { getDeploymentService } from "@/lib/services/deployment.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.userId, userId)));

  if (!invitation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ invitation });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Verify ownership
  const [existing] = await db
    .select({ id: invitations.id, userId: invitations.userId })
    .from(invitations)
    .where(eq(invitations.id, id));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const bodyObj = body && typeof body === "object" ? (body as Record<string, unknown>) : {};

  // Validate partial fields if provided
  let parsedFields: Partial<ReturnType<typeof InvitationFieldsSchema.parse>> | undefined;
  if (bodyObj.fields !== undefined) {
    const result = InvitationFieldsSchema.partial().safeParse(bodyObj.fields);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid fields", details: result.error.issues },
        { status: 400 }
      );
    }
    parsedFields = result.data;
  }

  const updateValues: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (parsedFields !== undefined) {
    // Merge with existing fields — we need to fetch them first for a partial update
    const [current] = await db
      .select({ fields: invitations.fields })
      .from(invitations)
      .where(eq(invitations.id, id));

    updateValues.fields = { ...current.fields, ...parsedFields };
  }

  if (typeof bodyObj.title === "string") {
    updateValues.title = bodyObj.title;
  }

  const [updated] = await db
    .update(invitations)
    .set(updateValues)
    .where(eq(invitations.id, id))
    .returning({ id: invitations.id, updatedAt: invitations.updatedAt });

  return NextResponse.json({ invitation: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Verify ownership and get vercelProjectId
  const [existing] = await db
    .select({
      id: invitations.id,
      userId: invitations.userId,
      vercelProjectId: invitations.vercelProjectId,
    })
    .from(invitations)
    .where(eq(invitations.id, id));

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Best-effort: delete Vercel project (don't block on failure)
  if (existing.vercelProjectId) {
    try {
      await getDeploymentService().deleteProject(existing.vercelProjectId);
    } catch (err) {
      console.error(
        `Failed to delete Vercel project ${existing.vercelProjectId}:`,
        err
      );
    }
  }

  // Delete from DB
  await db.delete(invitations).where(eq(invitations.id, id));

  return new Response(null, { status: 204 });
}
