---
phase: 02-billing-infrastructure
plan: "02"
subsystem: billing-ui
tags: [stripe, feature-gate, react, nextjs, drizzle, pricing, upgrade-modal, dashboard]

requires:
  - phase: 02-01
    provides: "Stripe checkout backend, webhook tier update, stripeEvents table, users.tier column"
provides:
  - StripeFeatureGate backed by users.tier DB query (replaces StubFeatureGate)
  - GET /api/user/tier — returns { tier } for authenticated user
  - POST /api/admin/users/:id/tier — X-Admin-Secret protected tier override
  - Full pricing page at /pricing (hero, social proof, 3-tier cards 0/99/149 RON, comparison table, FAQ)
  - UpgradeModal component (Gold + Platinum cards, Stripe Checkout redirect)
  - TopNav with live tier badge fetched from /api/user/tier
  - /billing/success — polls /api/user/tier up to 10s, tier-specific welcome card, auto-redirects after 5s
  - /billing/cancel — "Plata anulata" with nav links
  - DashboardUsageBar — draft/live usage indicators for FREE users with Upgrade link
  - EditorLockedFeatures — PdfExportButton and WhatsAppSection with locked states and upgrade tooltips
affects:
  - Phase 3 (PDF export — PdfExportButton already scaffolded)
  - Phase 4 (WhatsApp — WhatsAppSection already scaffolded)
  - Any editor page that imports EditorLockedFeatures

tech-stack:
  added: []
  patterns:
    - Server component fetches tier server-side, passes as prop to client sub-component (pricing page, dashboard)
    - Client polling pattern for webhook confirmation (billing/success 1s interval up to 10s)
    - UpgradeModal trigger prop distinguishes publish vs draft context for copy variance
    - Locked feature UI: wrapper div handles click, inner button has disabled attr (click propagation through disabled button)

key-files:
  created:
    - src/lib/feature-gate.ts (StripeFeatureGate replaces StubFeatureGate)
    - src/app/api/user/tier/route.ts
    - src/app/api/admin/users/[id]/tier/route.ts
    - src/app/(dashboard)/pricing/page.tsx
    - src/app/(dashboard)/pricing/PricingCards.tsx
    - src/app/(dashboard)/pricing/FaqAccordion.tsx
    - src/components/upgrade/UpgradeModal.tsx
    - src/app/(billing)/layout.tsx
    - src/app/(billing)/billing/success/page.tsx
    - src/app/(billing)/billing/cancel/page.tsx
    - src/components/dashboard/DashboardUsageBar.tsx
    - src/components/editor/EditorLockedFeatures.tsx
    - tests/unit/billing/feature-gate.test.ts
    - tests/unit/billing/user-tier-route.test.ts
    - tests/unit/billing/admin-tier.test.ts
  modified:
    - src/app/(dashboard)/dashboard/page.tsx (added tier + count queries, DashboardUsageBar)
    - src/components/nav/TopNav.tsx (tier badge + Preturi link)

key-decisions:
  - "StripeFeatureGate upserts user row on getUserTier — ensures user exists before any gate check, avoids race conditions on first login"
  - "PricingCards.tsx is a separate client component — keeps pricing/page.tsx as server component for SSR tier fetch without full page client conversion"
  - "Locked feature click handler is on wrapper div (not disabled button) — disabled buttons block pointer events; wrapper div pattern allows click-to-upgrade on locked features"
  - "DashboardUsageBar renders null for GOLD/PLATINUM — no clutter for paid users; only FREE users see limits"
  - "Billing success polling stops on tier !== FREE (not specific tier match) — works correctly for both GOLD and PLATINUM upgrades"

patterns-established:
  - "Server component tier fetch + client CTA pattern: server fetches tier, passes as prop; client handles checkout redirect"
  - "Locked feature UI pattern: wrapper div clickable, inner button disabled, title tooltip, UpgradeModal mounted only when isLocked"
  - "Usage bar pattern: server computes counts, client component DashboardUsageBar receives draftCount/liveCount/tier props"

requirements-completed:
  - "Platform offers 3 tiers: Free, Gold, Platinum"

duration: ~35min
completed: 2026-03-10
---

# Phase 2 Plan 02: FeatureGate + Billing UI Summary

**DB-backed StripeFeatureGate with full billing UI layer: pricing page (0/99/149 RON), upgrade modal, TopNav tier badge, billing success polling, dashboard usage bar, and EditorLockedFeatures — completing the Stripe payment-to-product loop.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-03-10T15:04:11Z
- **Completed:** 2026-03-10T15:14:00Z
- **Tasks:** 5 (4 auto + 1 checkpoint:human-verify — APPROVED)
- **Files created:** 14
- **Files modified:** 2

## Accomplishments

- StripeFeatureGate replaced StubFeatureGate — all existing call sites work unchanged via same `featureGate` singleton export
- Full pricing page at /pricing with correct lifetime RON pricing, dynamic CTAs per tier, comparison table, accordion FAQ
- Upgrade modal and TopNav tier badge wired to live DB tier via /api/user/tier polling
- EditorLockedFeatures scaffolds future PDF and WhatsApp features with disabled-but-visible locked states

## Task Commits

Each task was committed atomically:

1. **Task 1: StripeFeatureGate + /api/user/tier + /api/admin/users/:id/tier + tests** — `18b9d01` (test) + `b757b70` (feat)
2. **Task 2: Pricing page + UpgradeModal + TopNav tier badge** — `e816bed` (feat)
3. **Task 3: /billing/success + /billing/cancel + DashboardUsageBar + dashboard** — `2a78650` (feat)
4. **Task 4: EditorLockedFeatures** — `b5ec088` (feat)
5. **Post-checkpoint bug fixes** — `46615ec` (fix) + `7f39852` (fix)

## Files Created/Modified

- `src/lib/feature-gate.ts` — StripeFeatureGate implementing FeatureGate; DB-backed getUserTier, canPublish (1 LIVE limit for FREE), canCreateDraft (3 DRAFT limit for FREE)
- `src/app/api/user/tier/route.ts` — GET /api/user/tier; 401 if unauthenticated
- `src/app/api/admin/users/[id]/tier/route.ts` — POST with X-Admin-Secret; BILLING-04 compliant (no invitation rows deleted on downgrade)
- `src/app/(dashboard)/pricing/page.tsx` — Server component; fetches tier; renders full pricing page
- `src/app/(dashboard)/pricing/PricingCards.tsx` — Client component; dynamic CTAs (guest/FREE/GOLD/PLATINUM cases); Stripe checkout redirect
- `src/app/(dashboard)/pricing/FaqAccordion.tsx` — Client accordion with 4 FAQs (no external library)
- `src/components/upgrade/UpgradeModal.tsx` — Dismissible modal (Escape + click-outside); Gold ring-[#DB2777], Platinum ring-[#CA8A04]
- `src/components/nav/TopNav.tsx` — Fetches /api/user/tier on mount; tier badge with correct colors; nav order Logo | Preturi | Tier | Lang | UserButton
- `src/app/(billing)/layout.tsx` — Minimal standalone layout (no TopNav) for Stripe redirect pages
- `src/app/(billing)/billing/success/page.tsx` — Polls /api/user/tier every 1s up to 10s; confirmed/timeout/checking states; auto-redirects after 5s
- `src/app/(billing)/billing/cancel/page.tsx` — "Plata anulata" with links to /pricing and /dashboard
- `src/components/dashboard/DashboardUsageBar.tsx` — FREE-tier usage bar; renders null for paid tiers; Upgrade button opens UpgradeModal
- `src/app/(dashboard)/dashboard/page.tsx` — Added tier + draft/live count queries; passes to DashboardUsageBar
- `src/components/editor/EditorLockedFeatures.tsx` — PdfExportButton (FREE locked) + WhatsAppSection (FREE+GOLD locked); keyboard accessible; meets ui-ux-pro-max touch target and accessibility requirements

## Decisions Made

- StripeFeatureGate upserts user row on `getUserTier` — ensures row exists without a separate creation step
- `PricingCards.tsx` is a separate client component — pricing page stays as a server component for tier SSR without converting the whole page to client
- Locked feature click uses wrapper div pattern — `disabled` buttons block pointer events, so the wrapper div is clickable; inner button gets `disabled` for correct HTML semantics
- Billing success polling stops when `tier !== "FREE"` — works for both GOLD and PLATINUM upgrades
- `DashboardUsageBar` returns null for non-FREE users — keeps UI clean for paid users

## Deviations from Plan

### Auto-fixed Issues (found during human verification)

**1. [Rule 1 - Bug] Reset loading state on checkout error; upsert user before checkout**
- **Found during:** Task 5 (checkpoint:human-verify — Stripe Checkout redirect scenario)
- **Issue:** Loading spinner stayed active if checkout API returned an error; also, checkout could fail if user row did not yet exist in DB (first-time buyer)
- **Fix:** Added `finally { setLoading(false) }` in the checkout handler; added upsert of user row before creating Stripe session
- **Files modified:** `src/components/upgrade/UpgradeModal.tsx`, `src/app/api/billing/checkout/route.ts`
- **Verification:** Checkout redirect worked end-to-end; error state recovers correctly
- **Committed in:** `46615ec`

**2. [Rule 1 - Bug] Await params in admin tier route — Next.js 15+ requirement**
- **Found during:** Task 5 (checkpoint:human-verify — admin endpoint scenario)
- **Issue:** Next.js 15+ requires `params` to be awaited in dynamic route handlers; accessing `params.id` directly caused a runtime error
- **Fix:** Changed `{ params }: { params: { id: string } }` to `{ params }: { params: Promise<{ id: string }> }` and added `const { id } = await params`
- **Files modified:** `src/app/api/admin/users/[id]/tier/route.ts`
- **Verification:** Admin endpoint returned 200 and correctly updated user tier in DB
- **Committed in:** `7f39852`

---

**Total deviations:** 2 auto-fixed (2 bugs found during human verification checkpoint)
**Impact on plan:** Both fixes were required for end-to-end correctness. No scope creep.

## Test Results

```
tests/unit/billing/ — 15/15 PASSED (new tests from 02-02)
  feature-gate.test.ts    — 8 passed (getUserTier, canPublish, canCreateDraft)
  user-tier-route.test.ts — 2 passed (401, GOLD tier response)
  admin-tier.test.ts      — 5 passed (401 missing/wrong secret, 200 update, 400 invalid, BILLING-04)

Full suite: 69 passed | 7 todo | 0 failed — NO REGRESSIONS
```

## StripeFeatureGate Call Site Compatibility

Confirmed zero call-site changes required:
- `src/app/api/publish/[id]/route.ts` imports `featureGate` from `@/lib/feature-gate` — export name unchanged
- `src/app/api/invitations/route.ts` imports `featureGate` — export name unchanged
- All existing tests that mock the feature gate continue to work

## Checkpoint Status

Task 5 (`checkpoint:human-verify`) — **APPROVED by human on 2026-03-10.**

All 8 verification scenarios passed:
1. Pricing page renders correctly with hero, 3-tier cards (0/99/149 RON), comparison table, FAQ, and Stripe Test Mode badge
2. TopNav badge reflects user tier (Free gray pill) with correct nav order
3. Upgrade modal opens from dashboard Upgrade link; Gold highlighted with ring-[#DB2777]
4. Dashboard usage bar shows correct draft/live counts for FREE user
5. Stripe Checkout redirect works end-to-end (required post-checkpoint bug fix: upsert user + reset loading state)
6. /billing/success polling detects tier update after webhook, shows welcome card, auto-redirects after 5s
7. Admin endpoint returns 200 and updates tier (required post-checkpoint bug fix: await params)
8. EditorLockedFeatures: PDF locked for FREE, WhatsApp locked for FREE+GOLD, both open upgrade modal when clicked

## Next Phase Readiness

- Phase 3 (PDF export): `PdfExportButton` in EditorLockedFeatures is scaffolded and ready; enabling it requires implementing actual PDF generation and changing `isLocked` logic
- Phase 4 (WhatsApp): `WhatsAppSection` is scaffolded and ready; enabling it requires WABA integration
- Admin endpoint: `/api/admin/users/:id/tier` is production-ready for manual tier overrides during UAT

## Self-Check: PASSED

All 9 checked files found:
- FOUND: src/lib/feature-gate.ts
- FOUND: src/app/api/user/tier/route.ts
- FOUND: src/app/api/admin/users/[id]/tier/route.ts
- FOUND: src/app/(dashboard)/pricing/page.tsx
- FOUND: src/components/upgrade/UpgradeModal.tsx
- FOUND: src/components/nav/TopNav.tsx
- FOUND: src/app/(billing)/billing/success/page.tsx
- FOUND: src/components/editor/EditorLockedFeatures.tsx
- FOUND: .planning/phases/02-billing-infrastructure/02-02-SUMMARY.md

All 7 commits verified in git log:
- 18b9d01 (test 02-02): failing tests
- b757b70 (feat 02-02): StripeFeatureGate + API routes
- e816bed (feat 02-02): pricing page + UpgradeModal + TopNav
- 2a78650 (feat 02-02): billing pages + DashboardUsageBar
- b5ec088 (feat 02-02): EditorLockedFeatures
- 46615ec (fix 02-02): reset loading state on checkout error; upsert user before checkout
- 7f39852 (fix 02-02): await params in admin tier route

Full vitest suite: 69/69 passed, 0 failed.
Human checkpoint: APPROVED — all 8 scenarios passed.

---
*Phase: 02-billing-infrastructure*
*Completed: 2026-03-10*
