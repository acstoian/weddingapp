import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users, stripeEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { emailService } from "@/lib/services/email.service";
import type { Tier } from "@/lib/feature-gate";

/**
 * POST /api/webhooks/stripe
 *
 * Receives and processes Stripe webhook events.
 *
 * CRITICAL: reads raw body text FIRST — never call request.json() here.
 * App Router does not need `export const config` for raw body access.
 *
 * Idempotency: inserts into stripe_events BEFORE any other DB write.
 * Duplicate events (unique constraint violation code "23505") return 200.
 * Other DB errors are re-thrown so Stripe retries.
 */
export async function POST(request: Request) {
  // CRITICAL: raw text FIRST — never call request.json() in this route
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  // Idempotency: insert BEFORE any other DB write
  try {
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      userId: null,
      processedAt: new Date(),
    });
  } catch (err: unknown) {
    // Only skip for unique constraint violation (already processed)
    if ((err as { code?: string }).code === "23505") {
      return NextResponse.json({ received: true });
    }
    throw err; // Let Stripe retry on other DB errors
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, targetTier } = session.metadata ?? {};

    if (userId && targetTier) {
      await db
        .update(users)
        .set({
          tier: targetTier,
          stripeCustomerId: session.customer as string,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      // Fire-and-forget: purchase confirmation email via Resend
      // Does not block webhook 200 response
      const email = session.customer_details?.email;
      if (email) {
        emailService
          .sendPurchaseConfirmation({ email, tier: targetTier as Tier })
          .catch((e) => console.error("[webhook] email failed", e));
      }
    }
  }

  return NextResponse.json({ received: true });
}
