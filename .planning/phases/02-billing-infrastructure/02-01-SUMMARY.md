---
phase: 02-billing-infrastructure
plan: "01"
subsystem: billing-backend
tags: [stripe, payments, webhooks, schema, drizzle, testing]
dependency_graph:
  requires: []
  provides:
    - POST /api/billing/checkout
    - POST /api/webhooks/stripe
    - src/lib/stripe.ts (stripe singleton)
    - src/lib/services/billing.service.ts (createCheckoutSession)
    - stripeEvents table (idempotency log)
    - users.stripe_customer_id (returning customer reuse)
  affects:
    - src/lib/db/schema.ts (subscriptions removed, stripeCustomerId + stripeEvents added)
    - src/lib/services/email.service.ts (sendPurchaseConfirmation + emailService added)
tech_stack:
  added:
    - stripe@20.4.1
  patterns:
    - Stripe Checkout (one-time payment, no subscriptions)
    - Webhook idempotency via unique constraint on stripe_event_id
    - Fire-and-forget email (does not block webhook 200)
    - Drizzle Proxy pattern for lazy DB init (existing)
key_files:
  created:
    - src/lib/stripe.ts
    - src/lib/services/billing.service.ts
    - src/app/api/billing/checkout/route.ts
    - src/app/api/webhooks/stripe/route.ts
    - drizzle/migrations/0001_billing_phase.sql
    - scripts/apply-billing-migration.mjs
    - tests/unit/billing/schema.test.ts
    - tests/unit/billing/checkout-route.test.ts
    - tests/unit/billing/webhook.test.ts
  modified:
    - src/lib/db/schema.ts
    - src/lib/services/email.service.ts
    - package.json / pnpm-lock.yaml
decisions:
  - "Used drizzle-kit push workflow (not migrate) — project uses push; interactive prompt for rename detection bypassed by applying migration directly via Node.js script using @neondatabase/serverless"
  - "emailService added as named object export on email.service.ts — matches webhook usage pattern without introducing a class"
  - "Schema test uses real Drizzle table object key inspection (not DB query) — fast, no network needed"
metrics:
  duration: "~30 minutes"
  completed: "2026-03-10"
  tasks_completed: 3
  files_created: 9
  files_modified: 3
---

# Phase 2 Plan 01: Stripe Billing Backend Summary

**One-liner:** Stripe one-time payment backend with idempotent webhook, tier upgrade logic, and 9 GREEN unit tests — zero regressions in 54-test suite.

## What Was Built

### DB Schema Changes (src/lib/db/schema.ts)
- Removed `subscriptions` table export entirely
- Added `stripeCustomerId: text("stripe_customer_id")` to `users` table
- Added `stripeEvents` table with `stripeEventId` (unique), `eventType`, `userId`, `processedAt`

### Migration (drizzle/migrations/0001_billing_phase.sql)
Applied to Neon DB via `scripts/apply-billing-migration.mjs` (used `@neondatabase/serverless` directly since `drizzle-kit push` presented an interactive rename-vs-create prompt for `stripe_events`).

Changes applied:
1. `DROP CONSTRAINT IF EXISTS subscriptions_user_id_users_id_fk`
2. `DROP TABLE IF EXISTS subscriptions`
3. `ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id text`
4. `CREATE TABLE IF NOT EXISTS stripe_events (...)` with UNIQUE on `stripe_event_id`

### Stripe Singleton (src/lib/stripe.ts)
- Exports `stripe` — initialized with `STRIPE_SECRET_KEY` and `apiVersion: "2025-01-27.acacia"`
- Logs `console.warn` at startup for any missing required env vars (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)

### Billing Service (src/lib/services/billing.service.ts)
- Exports `createCheckoutSession(userId, targetTier, returnUrl)`
- Tier-to-price-ID mapping: FREE→GOLD = `STRIPE_GOLD_PRICE_ID`, FREE→PLATINUM = `STRIPE_PLATINUM_PRICE_ID`, GOLD→PLATINUM = `STRIPE_PLATINUM_UPGRADE_PRICE_ID`
- Returning customer: `sessionParams.customer = stripeCustomerId`
- New customer: `sessionParams.customer_creation = "always"`
- Throws `Error("Already on this tier")` for duplicate purchase attempts

### Checkout Route (src/app/api/billing/checkout/route.ts)
- `POST /api/billing/checkout` — Clerk auth guard, targetTier validation
- Returns 401 (unauthenticated), 400 (invalid tier), 409 (already on tier), 200+url (success)

### Webhook Route (src/app/api/webhooks/stripe/route.ts)
- `POST /api/webhooks/stripe` — raw body via `request.text()` (FIRST operation)
- Signature verification with `stripe.webhooks.constructEvent` — returns 400 on failure
- Idempotency: inserts into `stripe_events` before any other DB write
- Duplicate events (code `"23505"` unique violation) return 200 without processing
- Other DB errors re-thrown (Stripe retries)
- `checkout.session.completed`: updates `users.tier` and `users.stripeCustomerId`
- Fire-and-forget purchase confirmation email via `emailService.sendPurchaseConfirmation`

### Email Service (src/lib/services/email.service.ts)
- Added `sendPurchaseConfirmationEmail({ email, tier })` — subject "Plata confirmata — {tier}"
- Added `emailService` named export object (convenience wrapper for fire-and-forget usage)
- Existing `sendPublishSuccessEmail` preserved unchanged

## Test Results

```
tests/unit/billing/ — 9/9 PASSED
  schema.test.ts     — 3 passed (stripeEvents columns, users.stripeCustomerId, subscriptions not exported)
  checkout-route.test.ts — 3 passed (401, 409, 200+url)
  webhook.test.ts    — 3 passed (400 bad sig, 200 duplicate, tier update)

Full suite: 54 passed | 7 todo | 0 failed — NO REGRESSIONS
```

## Deviations from Plan

### Auto-applied: drizzle-kit push → direct SQL migration

**Found during:** Task 1, step 5

**Issue:** `drizzle-kit push` presented an interactive prompt asking whether `stripe_events` should be created as a new table or renamed from `subscriptions`. The prompt cannot be answered non-interactively.

**Fix:** Created `scripts/apply-billing-migration.mjs` that applies the exact SQL from `0001_billing_phase.sql` directly via `@neondatabase/serverless`. This achieves the same result as `drizzle-kit push` (correct table structure in Neon DB) without the interactive prompt.

**Files modified:** `scripts/apply-billing-migration.mjs` (new)

**Classification:** Rule 3 — blocking issue resolved automatically.

---

### Auto-applied: emailService object export on existing email.service.ts

**Found during:** Task 3

**Issue:** `email.service.ts` exported only standalone functions; webhook handler needed `emailService.sendPurchaseConfirmation(...)` per the plan spec.

**Fix:** Added `sendPurchaseConfirmationEmail` function + `emailService` named export object that wraps both email functions. No behavior change to existing `sendPublishSuccessEmail`.

**Classification:** Rule 2 — missing functionality required for correct operation.

## Env Vars Required for 02-02 UI Work

The following env vars must be set before Plan 02-02 (FeatureGate + UI) can test end-to-end:

| Variable | Source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key (test mode) |
| `STRIPE_WEBHOOK_SECRET` | Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy signing secret |
| `STRIPE_GOLD_PRICE_ID` | Stripe Dashboard → Products → "Save the Date — Gold" (99 RON one-time) → Price ID |
| `STRIPE_PLATINUM_PRICE_ID` | Stripe Dashboard → Products → "Save the Date — Platinum" (149 RON one-time) → Price ID |
| `STRIPE_PLATINUM_UPGRADE_PRICE_ID` | Stripe Dashboard → Products → "Save the Date — Platinum Upgrade" (50 RON one-time) → Price ID |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for dev, production URL for prod |

## Commits

| Task | Hash | Description |
|---|---|---|
| Task 1 | 73bbcc2 | feat(02-01): DB schema migration, Stripe singleton, and test stubs |
| Task 2 | aec450e | feat(02-01): checkout session API route and billing service |
| Task 3 | 509e3ea | feat(02-01): webhook handler — signature verify, idempotency, tier update |

## Self-Check: PASSED

All 9 expected files exist. All 3 task commits verified in git log. Full test suite 54/54 GREEN.
