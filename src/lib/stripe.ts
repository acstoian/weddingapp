import Stripe from "stripe";

const requiredVars = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
for (const v of requiredVars) {
  if (!process.env[v]) console.warn(`[stripe] WARNING: ${v} is not set`);
}

/**
 * Stripe singleton — initialized once at module load.
 * Uses test key in dev, live key in production.
 * Startup warnings are emitted if required env vars are missing.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-01-27.acacia",
});
