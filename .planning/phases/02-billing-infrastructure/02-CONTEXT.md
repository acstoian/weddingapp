# Phase 2: Billing Infrastructure - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire Stripe payment collection for Gold (99 RON) and Platinum (149 RON) lifetime access tiers. Replace StubFeatureGate with real DB-backed tier enforcement. Update pricing page with live Checkout CTAs, comparison table, FAQ, and lifetime-access messaging. Provide admin tooling for manual tier management.

No recurring billing. No subscription management. One payment = permanent access.

</domain>

<decisions>
## Implementation Decisions

### Billing Model
- **One-time lifetime payment** — NOT a subscription. Users pay once and have Gold/Platinum access permanently
- No auto-renewal, no recurring charges, no trial periods
- Stripe Checkout uses `payment` mode (not `subscription`)
- Only webhook needed: `checkout.session.completed`
- `subscriptions` table dropped — users.tier is the single source of truth
- Add `stripeCustomerId` column to users table (populated at first Checkout)

### Stripe Products & Prices
- Gold: "Save the Date — Gold" — 99 RON one-time
- Platinum: "Save the Date — Platinum" — 149 RON one-time
- Platinum Upgrade from Gold: "Save the Date — Platinum Upgrade" — 50 RON one-time (for Gold users upgrading)
- Price IDs stored in env vars: `STRIPE_GOLD_PRICE_ID`, `STRIPE_PLATINUM_PRICE_ID`, `STRIPE_PLATINUM_UPGRADE_PRICE_ID`
- Currency displayed as RON (not lei)
- VAT included in displayed prices (no Stripe Tax)
- Stripe branding configured: logo + #DB2777, business name = "Save the Date"

### Stripe Checkout Flow
- Stripe-hosted Checkout page (not embedded)
- Checkout session metadata: `{ userId, targetTier }` — webhook uses this to identify user to upgrade
- Create Stripe Customer at first Checkout, store `stripeCustomerId` in users table
- No email pre-fill on Stripe Checkout page (let Stripe ask)
- Payment methods: Card + Google Pay / Apple Pay (Stripe auto-enables wallets)
- Duplicate purchase blocked server-side before creating Checkout session (check current tier)
- Return URL: passed as custom `success_url` parameter — `/billing/success?session_id={CHECKOUT_SESSION_ID}&return={encodedReturnUrl}`
- Cancel URL: `/billing/cancel` or back to wherever they came from (stored in `cancel_url`)
- Checkout session created via standard Next.js API route: `POST /api/billing/checkout`

### Upgrade Paths
- Free → Gold: 99 RON (direct)
- Free → Platinum: 149 RON (direct — no need to buy Gold first)
- Gold → Platinum: 50 RON (separate Stripe product via new Checkout session; server detects Gold tier and uses upgrade Price ID)
- No downgrade path in-app (lifetime access)

### Webhook Handler
- Route: `POST /api/webhooks/stripe`
- Verify signature with `stripe.webhooks.constructEvent` using `STRIPE_WEBHOOK_SECRET`
- Events handled: `checkout.session.completed` only
- Idempotency: `stripe_events` table — insert before processing; skip if event ID already exists
- `stripe_events` schema: `(id uuid PK, stripe_event_id text unique, event_type text, user_id text, processed_at timestamp)`
- On `checkout.session.completed`: read `metadata.userId` + `metadata.targetTier`, update `users.tier`, save `stripeCustomerId`
- Send purchase confirmation email via Resend on successful webhook processing
- Webhook registered manually in Stripe Dashboard (production) and via Stripe CLI (`stripe listen`) for local dev

### FeatureGate Replacement
- Replace `StubFeatureGate` with `StripeFeatureGate` in `src/lib/feature-gate.ts`
- Reads `users.tier` from DB on every call (no cache — DB queries are fast at this scale)
- Upserts user row if not exists (tier = FREE) — handles first-time login auto-provisioning
- Tier limits:
  - FREE: 3 drafts max, 1 published max
  - GOLD: unlimited drafts, unlimited published
  - PLATINUM: unlimited drafts, unlimited published
- `featureGate` singleton exported — all existing call sites (publish route etc.) work unchanged

### /api/user/tier Endpoint
- `GET /api/user/tier` — returns current user's tier from DB
- Used by client components (dashboard usage indicators, editor locked features)
- Auth required (Clerk `auth()`)

### Startup Validation
- On app start, log warning if `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` are missing
- Stripe test mode indicator: small "Stripe Test Mode" badge on pricing page when `NODE_ENV === 'development'`

### Upgrade Prompt UX
- **Trigger:** Any gated action hit (publish limit, draft limit)
- **Presentation:** Modal with tier cards — both Gold and Platinum shown, Gold visually highlighted as recommended
- **Tone:** Benefit-focused ("Deblochează invitatii nelimitate + export PDF")
- **Price shown inline:** "Gold — 99 RON" / "Platinum — 149 RON" (no extra click to see price)
- **Modal behavior:** Always dismissible (X button / click-outside). User can stay on Free
- **On CTA click:** Immediate redirect to Stripe Checkout (no intermediary confirm page)
- **Same modal** for both publish limit and draft limit triggers
- **Locked future features in editor:**
  - PDF export button: visible but disabled (greyed out) for Free users. Hover tooltip: "Functie Gold — Cumpara acum". Click opens upgrade modal
  - WhatsApp send section: visible but disabled for Free AND Gold users. Hover tooltip: "Functie Platinum — Cumpara acum"

### Dashboard Tier UI
- Subtle "Free" / "Gold" / "Platinum" badge in TopNav, links to /pricing
- TopNav order: Logo | Preturi | Tier badge | Clerk account menu
- Usage progress indicators on dashboard: "1/3 ciorne • 1/1 publicate"
- At limit: inline Upgrade link — "1/1 publicate • ↑ Upgrade" (opens upgrade modal or goes to /pricing)
- If user is Free with locked invitations (after admin downgrade): dashboard banner — "Unele invitatii sunt blocate. Contacteaza-ne sau cumpara din nou Gold."

### /billing/success Page
- Polls `users.tier` via `/api/user/tier` for up to 10s (waiting for webhook to fire)
- Shows tier-specific feature highlights once upgrade confirmed (e.g., "Bun venit la Gold! Ai acum: • Invitatii nelimitate • Export PDF (in curand)")
- Auto-redirects to original return URL (from `?return=` param) after 5 seconds
- User can also click "Mergi la dashboard" immediately
- Includes `?session_id` in URL for verification

### Admin Tier Management
- `POST /api/admin/users/:id/tier` — protected by `X-Admin-Secret` header (matches `ADMIN_SECRET` env var)
- Body: `{ tier: "FREE" | "GOLD" | "PLATINUM" }`
- On execution: updates `users.tier` in DB + sends downgrade notification email via Resend
- When reset to Free with extra invitations beyond Free limits: existing invitation data preserved, extras locked (can't be re-published until tier restored)
- No in-app trigger for this — admin uses curl/Postman/etc.

### DB Schema Changes
- Drop `subscriptions` table (migration down + schema removed)
- Add `stripeCustomerId text` column to `users` table
- Add `stripe_events` table for idempotency
- Add Drizzle migration for all three changes

### Pricing Page Updates
- **URL:** /pricing (unchanged)
- **Public:** No auth required to view
- **Hero:** Value proposition above cards — 3 bullets: "Template → site live in minute", "Acces permanent — fara taxe lunare", "Trimite prin link, PDF sau WhatsApp"
- **Social proof stats:** 200+ cupluri fericite | 4.9/5 rating | Sub 2 minute publicare
- **Tier cards:** Mobile-responsive (stack vertically on mobile)
  - Free card: current usage for logged-in users ("1/3 ciorne, 1/1 publicate"). CTA: "Planul tau actual" (disabled) for logged-in users; "Incepe gratuit" (link to sign-up) for guests
  - Gold card: "Acces permanent" badge in amber/gold. CTA: dynamic per user tier (see below)
  - Platinum card: "Acces permanent" badge in deeper slate/purple. CTA: dynamic per user tier
  - 'Popular' badge stays on Gold
- **Dynamic CTAs by user tier:**
  - Guest/unauthenticated: "Incepe gratuit" (Free), "Cumpara acum" (Gold), "Cumpara acum" (Platinum)
  - FREE user: "Planul tau actual" (Free, disabled), "Cumpara acum — 99 RON" (Gold), "Cumpara acum — 149 RON" (Platinum)
  - GOLD user: "Planul tau actual" (Gold, disabled), "Upgrade la Platinum — 50 RON" (Platinum)
  - PLATINUM user: "Planul tau actual" (Platinum, disabled)
- **Pricing label format:** Large price (99 RON) + "Acces permanent" badge in tier color
- **Comparison table:** Below pricing cards, grouped by category (Invitatii | Distributie | Suport | Acces). CTA row repeated at bottom of table
- **FAQ section:** 4 questions:
  1. Ce include accesul permanent?
  2. Ce se intampla cu invitatiile mele dupa plata?
  3. Cum platesc? (card, Google Pay?)
  4. Pot face upgrade de la Gold la Platinum?
- **Footer note:** "Ai intrebari? contact@savethedate.ro"
- **Free-tier signup CTA:** "Creeaza cont gratuit" link below pricing cards for unauthenticated visitors
- **Stripe test mode badge:** Small dev-only indicator when `NODE_ENV === 'development'`
- No mention of downgrade, refunds, or subscription cancellation on pricing page

### Claude's Discretion
- Exact comparison table row content (what features appear in which rows)
- Exact FAQ answer copy
- Loading/polling UI on /billing/success while waiting for webhook
- Exact email template design for purchase confirmation and downgrade notification
- Dashboard usage indicator exact visual design (pill, inline text, etc.)
- Upgrade modal exact layout (card dimensions, button placement)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/feature-gate.ts`: StubFeatureGate with `FeatureGate` interface — Phase 2 implements StripeFeatureGate against this interface, no call-site changes needed
- `src/app/(dashboard)/pricing/page.tsx`: Full pricing page exists with tier cards — needs major update (prices, CTAs, lifetime messaging, comparison table, FAQ, hero)
- `src/lib/services/email.service.ts`: Resend email service already wired — reuse for purchase confirmation + downgrade notification
- `src/lib/db/schema.ts`: `users` table exists (add stripeCustomerId), `subscriptions` table exists (to be dropped)
- `src/app/api/publish/[id]/route.ts`: Already imports and calls `featureGate.canPublish()` — StripeFeatureGate plugs in transparently
- `src/components/nav/TopNav.tsx`: Tier badge already rendered — wire to `/api/user/tier`, add /pricing link, update nav order
- Design system: #DB2777 primary, #CA8A04 gold accent, Playfair Display headings, lucide-react icons only

### Established Patterns
- Next.js API routes in `src/app/api/` — follow same pattern for `/api/billing/checkout`, `/api/webhooks/stripe`, `/api/user/tier`, `/api/admin/users/:id/tier`
- Drizzle ORM with Neon — follow existing schema patterns in `src/lib/db/schema.ts`
- Clerk `auth()` for user ID in API routes
- Service abstraction pattern: `src/lib/services/` — consider `billing.service.ts` for Stripe logic

### Integration Points
- `featureGate` singleton: replace export in feature-gate.ts (StripeFeatureGate instead of StubFeatureGate)
- pricing/page.tsx: convert from static to dynamic (Server Component that reads user tier) or keep static + client fetch
- TopNav: needs `/api/user/tier` data — convert to Server Component or add client fetch hook
- New env vars needed: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_GOLD_PRICE_ID`, `STRIPE_PLATINUM_PRICE_ID`, `STRIPE_PLATINUM_UPGRADE_PRICE_ID`, `ADMIN_SECRET`

</code_context>

<specifics>
## Specific Ideas

- The upgrade modal should feel encouraging, not punishing — benefit-focused copy ("Deblochează...") not limit-focused ("Ai depasit limita...")
- Pricing page communicates clearly this is lifetime (not monthly): prominent "Acces permanent" badge per tier in their accent color
- The 50 RON Gold→Platinum upgrade path needs its own dedicated Stripe product (not a coupon/discount approach)
- Stripe test mode badge is purely a developer convenience — small, dev-only, non-intrusive
- /billing/success auto-redirect after 5s to wherever user came from (encoded in return URL param) — user feels returned to context
- Dashboard usage indicators ("1/1 publicate • ↑ Upgrade") are the primary passive upgrade nudge
- Admin endpoint is a simple internal tool (curl/Postman), not a dashboard — Phase 5 can build a proper admin UI

</specifics>

<deferred>
## Deferred Ideas

- Stripe Customer Portal (no subscriptions = nothing to cancel — revisit if model changes)
- Annual pricing / discount plans — deferred; lifetime pricing is the current model
- Charge.refunded webhook handling — admin handles refunds manually for now
- Admin dashboard UI — Phase 5
- Stripe Tax / automatic VAT collection — deferred; prices are VAT-inclusive for now
- WABA Meta Business Verification — must be initiated during Phase 2 (external task, 2-10 week lead time); not a Phase 2 deliverable but must be started

</deferred>

---

*Phase: 02-billing-infrastructure*
*Context gathered: 2026-03-10*
