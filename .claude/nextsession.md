# Next Session

## Most Important Thing

Plan Phase 2 — context is ready, run:

`/gsd:plan-phase 2`

This will spawn the researcher (Stripe + billing patterns) then the planner. `/clear` first for a fresh context window.

## Ordered Tasks

1. **`/gsd:plan-phase 2`** — research + plan Phase 2 Billing Infrastructure
   - Researcher will investigate: Stripe `payment` mode one-time checkout, webhook idempotency patterns, Drizzle schema migrations, Next.js API route patterns for billing
   - Planner will create plans for: 02-01 (Stripe integration) and 02-02 (FeatureGate + pricing page)

2. **After planning** — `/gsd:execute-phase 2`

3. **Reminder during Phase 2 execution:** Initiate WABA Meta Business Verification application (2–10 week lead time, needed before Phase 4 Platinum WhatsApp). External task — do it manually.

## Warnings
- Python: use `py` not `python3`
- Background agents cannot use Bash — always run gsd-executor foreground
- Billing model is **lifetime one-time payment** (NOT subscription) — researcher/planner must understand this
- `subscriptions` table in current schema needs to be DROPPED (migration down required)
- Playwright UI plugin available for visual design checking — install if needed during UI tasks
- RESEND_FROM_DOMAIN may be empty — email skips gracefully (not a bug)
