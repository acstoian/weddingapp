---
phase: 2
slug: billing-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (already in project) |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 02-01 | 1 | Schema migration (drop subscriptions, add stripeCustomerId, add stripe_events) | unit | `npx vitest run tests/unit/billing/schema.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-02 | 02-01 | 1 | POST /api/billing/checkout — creates Checkout session | unit | `npx vitest run tests/unit/billing/checkout-route.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-03 | 02-01 | 1 | POST /api/webhooks/stripe — raw body + HMAC + idempotency | unit | `npx vitest run tests/unit/billing/webhook.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-04 | 02-01 | 1 | Webhook updates users.tier on checkout.session.completed | unit | `npx vitest run tests/unit/billing/webhook.test.ts` | ❌ W0 | ⬜ pending |
| 2-01-05 | 02-01 | 1 | Duplicate purchase blocked server-side | unit | `npx vitest run tests/unit/billing/checkout-route.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-01 | 02-02 | 2 | StripeFeatureGate reads tier from DB | unit | `npx vitest run tests/unit/billing/feature-gate.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-02 | 02-02 | 2 | FeatureGate enforces FREE limits (3 drafts, 1 published) | unit | `npx vitest run tests/unit/billing/feature-gate.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-03 | 02-02 | 2 | GET /api/user/tier returns current tier | unit | `npx vitest run tests/unit/billing/user-tier-route.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-04 | 02-02 | 2 | POST /api/admin/users/:id/tier protected by X-Admin-Secret | unit | `npx vitest run tests/unit/billing/admin-tier.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-05 | 02-02 | 2 | Downgrade to FREE preserves invitation rows (BILLING-04) | unit | `npx vitest run tests/unit/billing/admin-tier.test.ts` | ❌ W0 | ⬜ pending |
| 2-02-06 | 02-02 | 2 | Pricing page renders all 3 tiers | manual | — | n/a | ⬜ pending |
| 2-02-07 | 02-02 | 2 | /billing/success polls tier and redirects | manual | — | n/a | ⬜ pending |
| 2-02-08 | 02-02 | 2 | PDF export button disabled for FREE with tooltip | manual | — | n/a | ⬜ pending |
| 2-02-09 | 02-02 | 2 | WhatsApp section disabled for FREE and GOLD with tooltip | manual | — | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/billing/schema.test.ts` — stubs for schema migration assertions
- [ ] `tests/unit/billing/checkout-route.test.ts` — stubs for checkout creation + duplicate block
- [ ] `tests/unit/billing/webhook.test.ts` — stubs for raw body, HMAC, idempotency, tier update
- [ ] `tests/unit/billing/feature-gate.test.ts` — stubs for StripeFeatureGate tier reads + limits
- [ ] `tests/unit/billing/user-tier-route.test.ts` — stub for GET /api/user/tier
- [ ] `tests/unit/billing/admin-tier.test.ts` — stub for admin tier override + auth guard + BILLING-04 data preservation

*All test files are stubs that assert the correct shape; implementation fills them in.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe Checkout page renders with correct RON price | Platform offers 3 tiers | Requires live Stripe test key + browser | Open checkout URL, verify price shown as RON, card field present |
| /billing/success auto-redirects after tier upgrade | Tier reflected immediately | Requires end-to-end Stripe test mode flow | Complete test checkout, verify success page polls then redirects |
| Upgrade modal shown when Free user hits gated action | Tier enforcement UX | Requires UI interaction | Log in as Free user, attempt publish 2nd invitation, verify modal opens |
| TopNav tier badge shows correct tier | UI reflects tier | Visual verification | Log in as Gold user, verify "Gold" badge visible and links to /pricing |
| Stripe test mode badge visible in dev | Dev UX | Requires local dev server | Run dev server, visit /pricing, verify orange test badge visible |
| PDF export button disabled for FREE with tooltip | Locked feature UX | Visual + interaction | Render PdfExportButton with tier="FREE"; verify disabled appearance and "Functie Gold — Cumpara acum" tooltip; click opens UpgradeModal |
| WhatsApp section disabled for FREE and GOLD with tooltip | Locked feature UX | Visual + interaction | Render WhatsAppSection with tier="FREE" and tier="GOLD"; verify lock icon, disabled appearance, "Functie Platinum — Cumpara acum" tooltip; click opens UpgradeModal |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
