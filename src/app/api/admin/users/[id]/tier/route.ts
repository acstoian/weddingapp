import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { emailService } from "@/lib/services/email.service";
import type { Tier } from "@/lib/feature-gate";

const VALID_TIERS: Tier[] = ["FREE", "GOLD", "PLATINUM"];

/**
 * POST /api/admin/users/:id/tier
 *
 * Admin-only endpoint to override a user's tier.
 * Requires X-Admin-Secret header matching ADMIN_SECRET env var.
 *
 * Body: { tier: "FREE" | "GOLD" | "PLATINUM" }
 * Response: { success: true, userId: string, tier: string }
 * Errors:
 *   401 — missing or invalid X-Admin-Secret
 *   400 — invalid tier value
 *
 * BILLING-04: Does NOT delete or modify invitation rows on downgrade.
 * Only users.tier is updated.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validate admin secret
  const adminSecret = request.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { tier?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { tier } = body;

  if (!tier || !VALID_TIERS.includes(tier as Tier)) {
    return NextResponse.json(
      { error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` },
      { status: 400 }
    );
  }

  const { id: userId } = await params;

  // Update only users.tier — do NOT touch invitation rows (BILLING-04)
  await db
    .update(users)
    .set({ tier, updatedAt: new Date() })
    .where(eq(users.id, userId));

  // Fire-and-forget downgrade notification email
  if (tier === "FREE") {
    emailService
      .sendPurchaseConfirmation({ email: "", tier: "FREE" })
      .catch((err) => console.error("[admin-tier] Downgrade email error:", err));
  }

  return NextResponse.json({ success: true, userId, tier });
}
