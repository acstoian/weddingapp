# Context Snapshot — 2026-03-10 (Session 7)

## What Was Worked On

Started Phase 2 planning: ran `/gsd:plan-phase 2`, triggered `/gsd:discuss-phase 2`. Conducted exhaustive discuss-phase covering all four gray areas for Phase 2 Billing Infrastructure. Wrote and committed `02-CONTEXT.md`.

## Key Outcome

`02-CONTEXT.md` written and committed (`912335a`). Phase 2 is fully contexted and ready for `/gsd:plan-phase 2`.

## Phase 2 Critical Decisions Made

### Billing Model (Most Important)
- **One-time lifetime payments — NOT subscriptions**
- Gold: 99 RON, Platinum: 149 RON, Gold→Platinum upgrade: 50 RON (separate Stripe product)
- Currency: RON. Stripe Checkout `payment` mode (not `subscription`)
- Only webhook needed: `checkout.session.completed`
- **Drop `subscriptions` table** — `users.tier` is the single source of truth
- Add `stripeCustomerId` column to `users` table
- Add `stripe_events` table for idempotency (stripe_event_id, event_type, user_id, processed_at)

### Stripe Setup
- Hosted Checkout (not embedded). 3 Stripe products: Gold (99 RON), Platinum (149 RON), Platinum Upgrade from Gold (50 RON)
- Env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_GOLD_PRICE_ID`, `STRIPE_PLATINUM_PRICE_ID`, `STRIPE_PLATINUM_UPGRADE_PRICE_ID`, `ADMIN_SECRET`
- Checkout metadata: `{ userId, targetTier }`. Stripe Customer created at first Checkout, saved to `users.stripeCustomerId`
- No email pre-fill. Card + Google Pay / Apple Pay. Branding: logo + #DB2777, name "Save the Date"
- Webhook: manual Stripe Dashboard + CLI for local. Signature verification required

### Checkout Flow
- Success URL: `/billing/success?session_id={ID}&return={encodedReturnUrl}`
- `/billing/success`: polls `users.tier` up to 10s, shows feature highlights, auto-redirects after 5s
- Duplicate purchase blocked server-side. Purchase confirmation email via Resend

### Upgrade UX
- Upgrade modal: both tiers shown, Gold highlighted, benefit-focused copy, price inline, always dismissible
- Same modal for publish limit and draft limit. Immediate Checkout redirect on CTA click
- PDF export button: visible/disabled for Free → opens upgrade modal on click
- WhatsApp section: visible/disabled for Free AND Gold → opens upgrade modal
- Dashboard usage indicators: "1/3 ciorne • 1/1 publicate", inline "↑ Upgrade" at limit
- TopNav order: Logo | Preturi | Tier badge (links to /pricing) | Account

### FeatureGate
- Replace `StubFeatureGate` → `StripeFeatureGate` in `src/lib/feature-gate.ts`
- Reads `users.tier` from DB (no cache), upserts user on first gate check
- Gold/Platinum: unlimited. Free: 3 drafts / 1 published

### Pricing Page (major rewrite)
- Public (no auth). Hero: 3 value props. Social proof stats: 200+ cupluri, 4.9/5, sub 2 min
- Tier cards: "Acces permanent" badge (tier-colored amber/slate). Price: "99 RON" + badge
- Dynamic CTAs per user tier (full matrix in 02-CONTEXT.md)
- Free card shows current usage for logged-in users
- Comparison table (grouped by category) + CTA row at bottom
- FAQ: 4 questions. Footer: contact@savethedate.ro. "Creeaza cont gratuit" for guests
- 'Popular' badge on Gold. Mobile responsive. Stripe test mode badge (dev only)
- "Preturi" in TopNav. VAT inclusive. No mention of downgrade

### Admin
- `POST /api/admin/users/:id/tier` protected by `X-Admin-Secret` header
- On reset: updates tier + sends downgrade email via Resend in same call
- Dashboard banner shown when Free with locked invitations

### New Routes Needed
- `POST /api/billing/checkout` — creates Stripe Checkout session
- `POST /api/webhooks/stripe` — webhook handler
- `GET /api/user/tier` — returns current user's tier
- `POST /api/admin/users/:id/tier` — admin tier override
- `/billing/success` and `/billing/cancel` pages

## Current State

| Item | Status |
|------|--------|
| Phase 1 | Complete, all committed |
| Phase 2 CONTEXT.md | Done — committed `912335a` |
| Phase 2 RESEARCH.md | Not started |
| Phase 2 PLAN.md files | Not started |
| Phase 2 execution | Not started |

Git: branch master, last commit `d7edcc3`, working tree clean.

## File Paths of Interest
- `.planning/phases/02-billing-infrastructure/02-CONTEXT.md` — full decision record
- `src/lib/feature-gate.ts` — StubFeatureGate to replace
- `src/lib/db/schema.ts` — drop subscriptions, add stripeCustomerId to users, add stripe_events
- `src/app/(dashboard)/pricing/page.tsx` — major rewrite needed
- `src/components/nav/TopNav.tsx` — add Preturi link, wire tier badge to /api/user/tier
- `src/app/api/publish/[id]/route.ts` — already uses featureGate (transparent upgrade)

## Gotchas
- Python: use `py` not `python3`
- Background agents cannot use Bash — always run gsd-executor foreground
- Playwright UI plugin available for visual design checking (install when needed)
- RESEND_FROM_DOMAIN may be empty — email skips gracefully (not a bug)
