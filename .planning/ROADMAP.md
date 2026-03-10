# Roadmap: Save the Date Platform

## Milestones

- ✅ **v1.0 Free Tier MVP** — Phase 1 (shipped 2026-03-10)
- 🚧 **v1.1 Billing + Gold** — Phase 2 complete; Phase 3 next
- 📋 **v1.2 Platinum** — Phase 4 (planned)
- 📋 **v2.0 Admin + Hardening** — Phase 5 (planned)

## Phases

<details>
<summary>✅ v1.0 Free Tier MVP (Phase 1) — SHIPPED 2026-03-10</summary>

- [x] Phase 1: Free Tier MVP (7/7 plans) — completed 2026-03-10
  - 01-01: Next.js 16 scaffold + Clerk auth + CI
  - 01-02: Drizzle schema + DeploymentService abstraction
  - 01-03: 6 production-ready invitation templates (4 wedding, 2 baptism)
  - 01-04: Template gallery + preview modal + mobile toggle
  - 01-05: Field editor + photo upload + autosave + live preview
  - 01-06: Octokit git automation (branch-per-invitation)
  - 01-07: Vercel deploy pipeline + SSE polling + live URL

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### 🚧 v1.1 Billing + Gold (Phases 2-3)

- [x] **Phase 2: Billing Infrastructure** - Stripe subscriptions + FeatureGate service + tier-gated API routes (completed 2026-03-10)
- [ ] **Phase 3: Gold Tier** - PDF print export (A4/A5) via dedicated Puppeteer compute + QR code on publish

### 📋 v1.2 Platinum (Phase 4)

- [ ] **Phase 4: Platinum Tier** - WhatsApp bulk send via Meta Cloud API + guest list management (CSV + manual)

### 📋 v2.0 Admin + Hardening (Phase 5)

- [ ] **Phase 5: Admin Dashboard + Hardening** - Deployment visibility, quota monitoring, billing reconciliation, branch cleanup

## Phase Details

### Phase 2: Billing Infrastructure
**Goal**: The platform correctly collects payment, tracks subscription tier, and enforces feature
access server-side — so Gold and Platinum features can be built against a working gate.
**Depends on**: Phase 1
**Requirements**: Platform offers 3 tiers: Free, Gold, Platinum
**Success Criteria**:
  1. User can upgrade from Free to Gold or Platinum via Stripe Checkout; new tier reflected immediately.
  2. Free-tier user attempting Gold-gated action gets a clear upgrade prompt, not an error.
  3. Downgrade locks gated features at end of billing period; invitation data never deleted.
  4. Failed payment returns account to Free tier within one billing cycle; Stripe webhook + DB stay in sync.
**Plans**: TBD

Plans:
- [x] 02-01: Stripe integration — products/prices, Stripe Checkout, webhook handler (idempotent) — DONE 2026-03-10
- [x] 02-02: FeatureGate service — StripeFeatureGate, pricing page, upgrade modal, TopNav tier badge, billing success/cancel pages, editor locked features — DONE 2026-03-10

### Phase 3: Gold Tier
**Goal**: Gold subscribers can download a print-ready PDF of their invitation in A4 or A5, and
receive a QR code pointing to their live URL.
**Depends on**: Phase 2
**Requirements**: Gold tier: PDF print export in standard sizes
**Success Criteria**:
  1. Gold user can click "Download PDF", select A4 or A5, receive print-shop-ready file (300 DPI equivalent, fonts embedded).
  2. PDF is pixel-faithful to browser view including custom fonts and uploaded photo.
  3. QR code pointing to live URL generated on publish, available for download from dashboard.
  4. PDF generation does not block the main platform.
**Plans**: TBD

Plans:
- [ ] 03-01: PDF compute environment — deploy Puppeteer + @sparticuz/chromium on Railway/Render/Fly.io (spike first)
- [ ] 03-02: PDF export service — headless render, A4/A5 config, font-wait, stream-back; QR code generation on publish

### Phase 4: Platinum Tier
**Goal**: Platinum subscribers can manage a guest list and send their invitation URL to every guest
via WhatsApp in a single action.
**Depends on**: Phase 2 (billing gate) and WABA approval (external gate — must be approved before Phase 4 ships)
**Requirements**: Platinum tier: WhatsApp bulk sending + guest list management
**Success Criteria**:
  1. User can upload CSV/Excel with guest names + phone numbers; validation errors shown for malformed entries.
  2. User can add guests manually (name + phone), edit or remove, see full list before sending.
  3. User can click "Send via WhatsApp"; all valid guests receive invitation URL via WhatsApp within daily send cap.
  4. User can see per-guest send status (delivered / failed) after batch completes.
  5. If WABA approval pending, send button shows "pending approval" state rather than silently failing.
**Plans**: TBD

Plans:
- [ ] 04-01: Guest list management — CSV/XLSX parse (PapaParse + xlsx), E.164 phone validation, manual entry UI, DB storage
- [ ] 04-02: WhatsApp dispatcher — Meta Cloud API integration, QStash job queue, per-guest status tracking, daily send cap, WABA pending-approval fallback

### Phase 5: Admin Dashboard + Hardening
**Goal**: The operator can monitor platform health, catch billing/deployment drift early, and keep
the system clean as invitation volume grows.
**Depends on**: Phase 4
**Requirements**: Admin dashboard for managing invitations and WhatsApp sends
**Success Criteria**:
  1. Operator can view all invitations across all users with current deployment status and subscription tier.
  2. Operator receives alert before Vercel project quota reaches 80% of plan limit.
  3. Scheduled reconciliation job detects Stripe/DB tier mismatches and flags for review.
  4. Stale branches for deleted/expired invitations cleaned up on weekly schedule.
**Plans**: TBD

Plans:
- [ ] 05-01: Admin dashboard UI — invitation list with status/tier filters, WhatsApp send log, WABA quality rating display
- [ ] 05-02: Operational hardening — Vercel quota monitor + alert, Stripe/DB reconciliation cron, branch cleanup cron

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Free Tier MVP | v1.0 | 7/7 | Complete | 2026-03-10 |
| 2. Billing Infrastructure | 2/2 | Complete   | 2026-03-10 | - |
| 3. Gold Tier | v1.1 | 0/2 | Not started | - |
| 4. Platinum Tier | v1.2 | 0/2 | Not started | - |
| 5. Admin Dashboard + Hardening | v2.0 | 0/2 | Not started | - |

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| Template gallery (wedding/baptism) | Phase 1 | ✅ v1.0 |
| In-browser customization (text, images) | Phase 1 | ✅ v1.0 |
| Free tier end-to-end (select + edit + deploy + URL) | Phase 1 | ✅ v1.0 |
| Vercel project created/deployed per invitation | Phase 1 | ✅ v1.0 |
| Platform offers 3 tiers: Free, Gold, Platinum | Phase 2 | ✅ v1.1 |
| Gold tier: PDF print export in standard sizes | Phase 3 | Pending |
| Platinum tier: WhatsApp bulk sending via WABA | Phase 4 | Pending |
| Platinum tier: guest list via CSV/Excel or manual | Phase 4 | Pending |
| Admin dashboard for managing invitations | Phase 5 | Pending |

## Critical Non-Engineering Tasks

**WABA Application (start NOW — runs during Phase 2 development):**
Apply for WhatsApp Business Account approval with Meta before or during Phase 2. Meta's review
takes 2–10 weeks. Submit at least one message template for the invitation link use case. Platinum
tier cannot ship to production until WABA status is "Approved".

**PDF Compute Provider Spike (before Phase 3 planning):**
Compare Railway vs. Render vs. Fly.io vs. Browserless.io for cold start, cost per PDF, and
deployment complexity. Resolve before writing Phase 3 plans.

## Research Flags

- **Phase 2:** Verify current Vercel Pro plan project limits at vercel.com/pricing. If per-project
  model hits limits sooner than expected, fallback is single Vercel project with path-based routing.
- **Phase 3:** Spike on PDF compute provider before writing Phase 3 plans.
- **Phase 4:** Verify WhatsApp Cloud API per-message pricing for Romania/EU and current Meta template
  content policy (utility vs. marketing classification) before Phase 4 plans.
