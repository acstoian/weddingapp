import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { eq } from "drizzle-orm";

export type BillingTier = "GOLD" | "PLATINUM";

/**
 * Maps target tier (and current tier for upgrade detection) to the
 * correct Stripe Price ID from environment variables.
 *
 * Pricing (one-time, RON):
 *   FREE  → GOLD      = 99 RON  (STRIPE_GOLD_PRICE_ID)
 *   FREE  → PLATINUM  = 149 RON (STRIPE_PLATINUM_PRICE_ID)
 *   GOLD  → PLATINUM  = 50 RON  (STRIPE_PLATINUM_UPGRADE_PRICE_ID)
 */
function resolvePriceId(
  currentTier: string,
  targetTier: BillingTier
): string {
  if (targetTier === "GOLD") {
    return process.env.STRIPE_GOLD_PRICE_ID ?? "";
  }
  // targetTier === "PLATINUM"
  if (currentTier === "GOLD") {
    return process.env.STRIPE_PLATINUM_UPGRADE_PRICE_ID ?? "";
  }
  return process.env.STRIPE_PLATINUM_PRICE_ID ?? "";
}

/**
 * Creates a Stripe Checkout Session for a one-time tier upgrade.
 *
 * @throws Error("Already on this tier") if the user is already on targetTier.
 */
export async function createCheckoutSession(
  userId: string,
  targetTier: BillingTier,
  returnUrl: string
): Promise<{ url: string }> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.tier === targetTier) {
    throw new Error("Already on this tier");
  }

  const priceId = resolvePriceId(user.tier, targetTier);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] =
    {
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId, targetTier },
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(returnUrl)}`,
      cancel_url: `${appUrl}/billing/cancel`,
    };

  // Returning customer: reuse existing Stripe customer ID.
  // New customer: instruct Stripe to always create a customer record.
  if (user.stripeCustomerId) {
    sessionParams.customer = user.stripeCustomerId;
  } else {
    sessionParams.customer_creation = "always";
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return { url: session.url! };
}
