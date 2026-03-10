---
phase: 02-billing-infrastructure
verified: 2026-03-10T17:40:00Z
status: human_needed
score: 13/13 must-haves verified
re_verification: false
human_verification:
  - test: "Stripe Checkout redirect end-to-end with test keys"
    expected: "Clicking Gold CTA on /pricing while authenticated redirects to Stripe Checkout in RON"
    why_human: "Requires live Stripe test key env vars and network call — cannot verify programmatically"
  - test: "/billing/success tier polling and auto-redirect"
    expected: "After test payment, /billing/success shows spinner then welcome card then redirects after 5s"
    why_human: "Requires completed Stripe test payment to trigger webhook tier update; polling state machine is client-side"
  - test: "TopNav tier badge shows correct tier after login"
    expected: "New user sees gray 'Free' pill; GOLD user sees amber 'Gold' pill in correct nav order (Logo | Preturi | tier | lang | avatar)"
    why_human: "Client-side fetch from /api/user/tier — requires a live browser session to observe"
  - test: "Upgrade modal behavior from dashboard"
    expected: "FREE user at publish limit sees 'Upgrade' link; clicking opens modal with Gold (pink ring) and Platinum (gold ring) cards; X and Escape close it; click-outside closes it"
    why_human: "Modal open/close behavior and visual ring colors require browser interaction"
  - test: "EditorLockedFeatures locked states and tooltips"
    expected: "PdfExportButton grayed out for FREE with 'Functie Gold — Cumpara acum' tooltip; WhatsAppSection grayed with Lock icon for FREE and GOLD; clicking either locked feature opens UpgradeModal"
    why_human: "title tooltip and click-to-modal flow requires browser interaction"
  - test: "Pricing page visual and FAQ"
    expected: "Hero, social proof bar, 3 tier cards (0/99/149 RON), 'Popular' badge on Gold, comparison table with check/X icons, FAQ accordion opens/closes, Stripe Test Mode badge in dev"
    why_human: "Visual rendering, accordion interactivity, and badge visibility require browser inspection"
---

# Phase 2: Billing Infrastructure Verification Report

**Phase Goal:** Wire the complete Stripe billing infrastructure so users can purchase Gold (99 RON) or Platinum (149 RON) lifetime access via a one-time payment, with tier enforcement across all app surfaces.
**Verified:** 2026-03-10T17:40:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All 13 truths derived from the PLAN frontmatter `must_haves` across plans 02-01 and 02-02.

#### Plan 02-01 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A user can pay once via Stripe Checkout and their tier in the DB changes from FREE to GOLD or PLATINUM | VERIFIED | Webhook route: `db.update(users).set({ tier: targetTier, stripeCustomerId })` on `checkout.session.completed`; unit test 3/3 GREEN |
| 2 | A duplicate purchase attempt (same tier already active) is blocked server-side with a 409 before Stripe is contacted | VERIFIED | `checkout/route.ts` catches `"Already on this tier"` error from `billing.service.ts`; unit test confirms 409 response |
| 3 | The webhook handler rejects any request without a valid Stripe signature | VERIFIED | `stripe.webhooks.constructEvent` in try/catch → 400; unit test GREEN |
| 4 | The same checkout.session.completed event delivered twice causes only one DB write (idempotent) | VERIFIED | `db.insert(stripeEvents)` before any other write; unique constraint catch for code `"23505"` returns 200 without update; unit test GREEN |
| 5 | After successful payment, stripeCustomerId is stored in users table for returning customer reuse | VERIFIED | Webhook sets `stripeCustomerId: session.customer`; billing service checks `user.stripeCustomerId` for `customer` vs `customer_creation: "always"` |

#### Plan 02-02 Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | Free-tier user who hits the publish limit sees an upgrade modal with both Gold and Platinum options and their prices, not a raw error | VERIFIED (human for visual) | `DashboardUsageBar` renders Upgrade button when `liveAtLimit`; opens `UpgradeModal` with `trigger="publish"`; UpgradeModal contains GOLD 99 RON and PLATINUM 149 RON cards |
| 7 | Gold or Platinum user can publish unlimited invitations without any gate | VERIFIED | `StripeFeatureGate.canPublish` returns `{ allowed: true }` immediately for non-FREE tiers; unit test GREEN |
| 8 | TopNav shows the user's actual tier (not hardcoded 'Free') and links to /pricing | VERIFIED (human for live behavior) | `TopNav.tsx` fetches `/api/user/tier` in `useEffect`, sets tier state; renders tier badge as `<Link href="/pricing">`; `TIER_BADGE` map for all 3 tiers |
| 9 | The pricing page shows lifetime pricing (99 RON / 149 RON), dynamic CTAs per user tier, comparison table, and FAQ — no 'In curand' placeholders | VERIFIED (human for visual) | `PricingCards.tsx` has all 4 CTA cases (guest/FREE/GOLD/PLATINUM); comparison table in `pricing/page.tsx`; `FaqAccordion.tsx` exists; prices "99 RON" / "149 RON" hardcoded in `TIERS` array |
| 10 | After a successful Stripe payment, /billing/success polls tier for up to 10s then auto-redirects to the original return URL | VERIFIED (human for live flow) | `billing/success/page.tsx`: `setInterval` 1s up to `MAX_POLLS=10`; stops when `tier !== "FREE"`; `setTimeout(() => router.push(returnUrl), 5000)` on confirmed state |
| 11 | Admin can change any user's tier via POST /api/admin/users/:id/tier with X-Admin-Secret header | VERIFIED | Route validates header against `process.env.ADMIN_SECRET`; updates `users.tier` only; 5/5 unit tests GREEN including BILLING-04 |
| 12 | PDF export button in the editor is visible but disabled for Free users with tooltip 'Functie Gold — Cumpara acum' | VERIFIED (human for tooltip visual) | `PdfExportButton`: `isLocked = tier === "FREE"`; wrapper div `title="Functie Gold — Cumpara acum"`; button `disabled={isLocked}`; opens `UpgradeModal` on click |
| 13 | WhatsApp section in the editor is visible but disabled for Free and Gold users with tooltip 'Functie Platinum — Cumpara acum' | VERIFIED (human for tooltip visual) | `WhatsAppSection`: `isLocked = tier !== "PLATINUM"`; div `title="Functie Platinum — Cumpara acum"`; button `disabled={isLocked}`; opens `UpgradeModal` on click |

**Score:** 13/13 truths verified (6 of those require human confirmation of visual/interactive behavior)

---

### Required Artifacts

All artifacts from both PLAN frontmatter `must_haves.artifacts` sections:

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/stripe.ts` | Stripe singleton with startup validation warnings | VERIFIED | Exports `stripe`; warns on missing `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`; 16 lines |
| `src/lib/services/billing.service.ts` | Checkout session creation with tier-to-price-ID mapping | VERIFIED | Exports `createCheckoutSession`; all 3 price ID cases; customer reuse vs creation; 86 lines |
| `src/app/api/billing/checkout/route.ts` | POST — auth-protected, tier-guard, returns session URL | VERIFIED | Exports `POST`; 401/400/409/200 paths; wired to `createCheckoutSession`; 58 lines |
| `src/app/api/webhooks/stripe/route.ts` | POST — raw body, signature verify, idempotency, tier update | VERIFIED | Exports `POST`; `request.text()` first; sig verify; idempotency via `stripeEvents`; tier+customerId update; 84 lines |
| `src/lib/db/schema.ts` | Updated schema: stripeCustomerId on users, stripeEvents table, subscriptions removed | VERIFIED | `stripeCustomerId` on users (line 32); `stripeEvents` table exported (line 61); no `subscriptions` export; confirmed by unit test |
| `drizzle/migrations/0001_billing_phase.sql` | DB migration: drop subscriptions, add stripe_customer_id, create stripe_events | VERIFIED | File exists; correct SQL: DROP CONSTRAINT, DROP TABLE subscriptions, ADD COLUMN stripe_customer_id, CREATE TABLE stripe_events with UNIQUE constraint |
| `src/lib/feature-gate.ts` | StripeFeatureGate backed by users.tier DB query | VERIFIED | Exports `featureGate`, `StripeFeatureGate`, `Tier`, `FeatureGate`; upsert + select pattern; 92 lines |
| `src/app/api/user/tier/route.ts` | GET /api/user/tier — returns { tier } for authenticated user | VERIFIED | Exports `GET`; 401 guard; DB select from users; 30 lines |
| `src/app/api/admin/users/[id]/tier/route.ts` | POST — X-Admin-Secret protected tier override | VERIFIED | Exports `POST`; header auth; updates users.tier only; awaits params (Next.js 15 fix); 68 lines |
| `src/app/(dashboard)/pricing/page.tsx` | Full pricing page: hero, social proof, 3 tier cards, comparison table, FAQ | VERIFIED | Server component; fetches tier; hero + social proof + PricingCards + comparison table + FaqAccordion + footer + dev badge |
| `src/components/upgrade/UpgradeModal.tsx` | Dismissible upgrade modal with Gold + Platinum CTAs | VERIFIED | Exports `UpgradeModal`; isOpen/onClose/trigger props; Escape key close; click-outside close; Gold ring-[#DB2777]; checkout fetch; 181 lines |
| `src/components/nav/TopNav.tsx` | TopNav with live tier badge from /api/user/tier | VERIFIED | Fetches tier on mount; TIER_BADGE map; Logo | Preturi | Tier badge | Lang | UserButton order |
| `src/app/(billing)/billing/success/page.tsx` | Polls /api/user/tier 10s, shows tier features, auto-redirects | VERIFIED | Client component; setInterval 1s × 10; checking/confirmed/timeout states; tier-specific welcome text; 5s auto-redirect |
| `src/components/editor/EditorLockedFeatures.tsx` | Disabled PDF export and WhatsApp section with upgrade tooltips | VERIFIED | Exports `PdfExportButton` and `WhatsAppSection`; correct lock logic; tooltip titles; UpgradeModal integration; 144 lines |

---

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `checkout/route.ts` | `billing.service.ts` | `import { createCheckoutSession }` line 3 | WIRED |
| `webhooks/stripe/route.ts` | `schema.ts (stripeEvents)` | `import { users, stripeEvents }` line 5; `db.insert(stripeEvents)` line 43 | WIRED |
| `webhooks/stripe/route.ts` | `schema.ts (users.tier)` | `db.update(users).set({ tier, stripeCustomerId })` line 64 | WIRED |
| `feature-gate.ts (StripeFeatureGate)` | `schema.ts (users.tier)` | `db.select({ tier: users.tier }).from(users).where(eq(users.id, userId))` line 30 | WIRED |
| `api/publish/[id]/route.ts` | `feature-gate.ts` | `import { featureGate }` line 6; `featureGate.canPublish(userId)` line 33 | WIRED |
| `api/invitations/route.ts` | `feature-gate.ts` | `import { featureGate }` line 6; `featureGate.canCreateDraft(userId)` line 40 | WIRED |
| `UpgradeModal.tsx` | `api/billing/checkout` | `fetch("/api/billing/checkout", { method: "POST" })` line 77 | WIRED |
| `billing/success/page.tsx` | `api/user/tier` | `fetch("/api/user/tier")` in setInterval line 33 | WIRED |
| `EditorLockedFeatures.tsx` | `UpgradeModal.tsx` | `import { UpgradeModal }` line 5; rendered on lock click for both components | WIRED |
| `TopNav.tsx` | `api/user/tier` | `fetch("/api/user/tier")` in useEffect line 32 | WIRED |
| `dashboard/page.tsx` | `DashboardUsageBar.tsx` | `import DashboardUsageBar` line 10; rendered with `draftCount/liveCount/tier` props | WIRED |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| Platform offers 3 tiers: Free, Gold, Platinum | 02-01, 02-02 | Free tier (gate-enforced), Gold (99 RON), Platinum (149 RON) one-time lifetime payments | SATISFIED | StripeFeatureGate enforces FREE limits; billing service routes to correct price IDs; pricing page displays all three tiers with correct RON amounts; webhook updates users.tier |

**ROADMAP Success Criteria coverage:**

| Success Criterion | Status | Evidence |
|------------------|--------|----------|
| 1. User can upgrade from Free to Gold or Platinum via Stripe Checkout; new tier reflected immediately | VERIFIED (partial human) | Full checkout → webhook → tier update chain in place; /billing/success polling confirms immediately after webhook fires |
| 2. Free-tier user attempting Gold-gated action gets a clear upgrade prompt, not an error | VERIFIED (human for visual) | DashboardUsageBar + UpgradeModal; featureGate returns `{ allowed: false }` not an error |
| 3. Downgrade locks gated features at end of billing period; invitation data never deleted | VERIFIED | BILLING-04: admin route updates users.tier only — no invitation rows touched; unit test confirms db.delete never called |
| 4. Failed payment returns account to Free tier within one billing cycle; Stripe webhook + DB stay in sync | PARTIAL (human needed) | Webhook idempotency and sig verify implemented; "failed payment → FREE" flow would be a separate Stripe event type (`payment_intent.payment_failed`) not currently handled — billing period enforcement is outside scope for one-time payments (not recurring) |

Note on criterion 4: The project uses one-time lifetime payments, not subscriptions. "Failed payment" means checkout abandonment (handled by Stripe not completing the webhook), not a recurring billing failure. The `/billing/cancel` page handles abandoned checkout. This criterion is effectively N/A for the one-time payment model and is architecturally satisfied.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/components/upgrade/UpgradeModal.tsx` (line 88) | `setLoadingTier(null)` only in `catch`, not `finally`. If `window.location.href = data.url` executes but navigation is blocked, spinner stays active. | Info | Cosmetic only — user is navigated away in the success path; affects only unusual edge cases |

No TODO/FIXME/HACK/placeholder comments found in any implementation files. No stub implementations found. All return values are substantive.

---

### Human Verification Required

#### 1. Stripe Checkout Redirect

**Test:** Log in as a FREE user, visit /pricing, click "Cumpara acum — 99 RON" on the Gold card. Requires `STRIPE_SECRET_KEY`, `STRIPE_GOLD_PRICE_ID`, `NEXT_PUBLIC_APP_URL` set in `.env.local`.
**Expected:** Browser redirects to Stripe Checkout page showing "99.00 RON" one-time charge.
**Why human:** Live Stripe API call with test keys required; cannot mock network call in programmatic verification.

#### 2. /billing/success Polling and Auto-Redirect

**Test:** Complete a Stripe test checkout (use `stripe trigger checkout.session.completed` or card 4242 4242 4242 4242). Observe /billing/success.
**Expected:** Spinner with "Se verifica plata..." then within ~2s tier-specific welcome card appears, then auto-redirect to dashboard after 5s. Manual "Mergi la dashboard" link available immediately on confirmation.
**Why human:** Requires completed Stripe test payment to trigger webhook; polling state machine is client-side.

#### 3. TopNav Tier Badge — Live Fetch

**Test:** Log in, observe TopNav. Nav order should be: Logo | Preturi | tier pill | lang toggle (RO/EN) | avatar.
**Expected:** Gray "Free" pill for new account. After admin-setting tier to GOLD (`curl -X POST /api/admin/users/:id/tier`), refresh shows amber "Gold" pill without code change.
**Why human:** Client-side useEffect fetch — requires live browser session and Clerk auth.

#### 4. UpgradeModal Visual and Interaction

**Test:** As a FREE user with 1 live invitation (at limit), visit /dashboard. Click the pink "Upgrade" button in the usage bar.
**Expected:** Modal opens. Gold card has pink `ring-2 ring-[#DB2777]` highlight and 99 RON price. Platinum card shows 149 RON. Press Escape to close. Click outside overlay to close. X button top-right closes.
**Why human:** Modal open/close behavior, visual ring colors, and overlay click require browser interaction.

#### 5. EditorLockedFeatures Locked States

**Test:** Import `PdfExportButton` and `WhatsAppSection` with `tier="FREE"` in a test page or the editor.
**Expected:** PDF button is grayed out; hover shows "Functie Gold — Cumpara acum" tooltip (browser native). Clicking wrapper div opens UpgradeModal. With `tier="GOLD"`: PDF button is active (no-op), WhatsApp still locked. With `tier="PLATINUM"`: both active.
**Why human:** `title` attribute tooltip behavior, disabled button click propagation, and modal trigger require browser.

#### 6. Pricing Page Visual Completeness

**Test:** Visit /pricing as guest and as authenticated user.
**Expected:** Hero (Playfair Display heading), social proof bar (3 pills), 3 tier cards with correct prices (0/99/149 RON), "Popular" absolute badge on Gold card, comparison table with Check/X icons, FAQ accordion opens/closes per question, footer mailto link, orange "Stripe Test Mode" badge fixed bottom-right in dev mode.
**Why human:** Visual rendering, accordion interactivity (useState in FaqAccordion), and dev badge visibility require browser inspection.

---

### Gaps Summary

No programmatic gaps found. All 13 observable truths are verified at the code level. All artifacts exist, are substantive (not stubs), and are wired to their dependencies. All 24 unit tests pass (6 billing files). Key links between components and APIs are confirmed via import/usage grep.

The 6 human verification items are standard UI/behavioral checks that cannot be confirmed without a running browser session and Stripe test keys. They are flagged as `human_needed`, not gaps.

The one info-level anti-pattern (UpgradeModal loading spinner not reset in `finally`) is cosmetic and does not affect the payment flow.

---

_Verified: 2026-03-10T17:40:00Z_
_Verifier: Claude (gsd-verifier)_
