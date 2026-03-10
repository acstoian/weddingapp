import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import InvitationCard, {
  type InvitationRow,
} from "@/components/dashboard/InvitationCard";
import EmptyState from "@/components/dashboard/EmptyState";
import { templates } from "@/lib/templates/registry";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Fetch user's invitations from DB directly (server component)
  const rows = await db
    .select({
      id: invitations.id,
      templateId: invitations.templateId,
      title: invitations.title,
      status: invitations.status,
      liveUrl: invitations.liveUrl,
      updatedAt: invitations.updatedAt,
    })
    .from(invitations)
    .where(eq(invitations.userId, userId))
    .orderBy(desc(invitations.updatedAt));

  // Enrich with thumbnail from registry (registry lookup is O(n) but n=6 always)
  const enrichedRows: InvitationRow[] = rows.map((row) => {
    const template = templates.find((t) => t.id === row.templateId);
    return {
      ...row,
      updatedAt: row.updatedAt.toISOString(),
      thumbnailUrl: template?.thumbnailUrl,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-['Playfair_Display',_serif] text-3xl font-semibold text-[#831843]">
          Invitatiile mele
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestioneaza si publica invitatiile tale digitale
        </p>
      </div>

      {enrichedRows.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
          {enrichedRows.map((invitation) => (
            <InvitationCard key={invitation.id} invitation={invitation} />
          ))}
          {/* "+ New" card always last */}
          <InvitationCard type="new" />
        </div>
      )}
    </div>
  );
}
