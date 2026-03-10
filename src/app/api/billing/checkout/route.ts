import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/services/billing.service";

/**
 * POST /api/billing/checkout
 *
 * Auth-protected. Creates a Stripe Checkout Session for a tier upgrade.
 *
 * Body: { targetTier: "GOLD" | "PLATINUM", returnUrl: string }
 * Returns: { url: string } — the Stripe Checkout redirect URL
 *
 * Errors:
 *   401 — not authenticated
 *   400 — invalid targetTier
 *   409 — user already on targetTier
 *   500 — unexpected error
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { targetTier?: string; returnUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { targetTier, returnUrl = "/" } = body;

  if (targetTier !== "GOLD" && targetTier !== "PLATINUM") {
    return NextResponse.json(
      { error: "targetTier must be GOLD or PLATINUM" },
      { status: 400 }
    );
  }

  try {
    const { url } = await createCheckoutSession(userId, targetTier, returnUrl);
    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === "Already on this tier") {
      return NextResponse.json(
        { error: "Already on this tier" },
        { status: 409 }
      );
    }
    console.error("[checkout] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
