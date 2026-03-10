import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getTemplate } from "@/lib/templates/registry";
import EditorLayout from "@/components/editor/EditorLayout";
import type { InvitationFields } from "@/lib/templates/schema";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;

  const [row] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.userId, userId)));

  if (!row) redirect("/dashboard");

  let templateDef;
  try {
    templateDef = getTemplate(row.templateId);
  } catch {
    redirect("/dashboard");
  }

  // Serialize invitation for client component
  const invitation = {
    id: row.id,
    userId: row.userId,
    templateId: row.templateId,
    title: row.title,
    fields: row.fields as InvitationFields,
    status: row.status,
    vercelProjectId: row.vercelProjectId,
    vercelDeployId: row.vercelDeployId,
    liveUrl: row.liveUrl,
    lastPublishedAt: row.lastPublishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };

  return <EditorLayout invitation={invitation} templateDef={templateDef} />;
}
