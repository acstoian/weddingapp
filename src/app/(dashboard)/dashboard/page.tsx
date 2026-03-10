import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { invitations, users } from "@/lib/db/schema";
import { eq, desc, and, count } from "drizzle-orm";
import InvitationCard, {
  type InvitationRow,
} from "@/components/dashboard/InvitationCard";
import EmptyState from "@/components/dashboard/EmptyState";
import DashboardUsageBar from "@/components/dashboard/DashboardUsageBar";
import { templates } from "@/lib/templates/registry";
import type { Tier } from "@/lib/feature-gate";

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

  // Fetch user tier
  const [userRow] = await db
    .select({ tier: users.tier })
    .from(users)
    .where(eq(users.id, userId));
  const tier = (userRow?.tier ?? "FREE") as Tier;

  // Count drafts and live invitations for usage bar
  const [draftCountRow] = await db
    .select({ value: count() })
    .from(invitations)
    .where(and(eq(invitations.userId, userId), eq(invitations.status, "DRAFT")));

  const [liveCountRow] = await db
    .select({ value: count() })
    .from(invitations)
    .where(and(eq(invitations.userId, userId), eq(invitations.status, "LIVE")));

  const draftCount = draftCountRow?.value ?? 0;
  const liveCount = liveCountRow?.value ?? 0;

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

      {/* Usage bar (client component — only visible for FREE tier) */}
      <DashboardUsageBar
        draftCount={draftCount}
        liveCount={liveCount}
        tier={tier}
      />

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
