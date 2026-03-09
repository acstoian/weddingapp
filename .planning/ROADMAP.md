# Roadmap: Save the Date Platform

## Overview

This platform takes a couple or family from zero to a live, shareable wedding or baptism invitation
in under two minutes. Phase 1 builds the complete Free tier vertical slice — auth, template gallery,
in-browser editor, and Vercel publish pipeline — proving the core differentiator before any paid
features are built. Phase 2 adds the billing infrastructure that gates everything downstream.
Phase 3 unlocks Gold (PDF export). Phase 4 unlocks Platinum (WhatsApp bulk send). Phase 5 hardens
the system with admin tooling, quota monitoring, and operational cleanup. WABA approval must be
initiated as a business task during Phase 1 so Meta's 2–10 week review runs in parallel with
engineering, arriving before Phase 4 begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Free Tier MVP** - Auth + template gallery + in-browser editor + Vercel publish pipeline + shareable URL
- [ ] **Phase 2: Billing Infrastructure** - Stripe subscriptions + FeatureGate service + tier-gated API routes
- [ ] **Phase 3: Gold Tier** - PDF print export (A4/A5) via dedicated Puppeteer compute + QR code on publish
- [ ] **Phase 4: Platinum Tier** - WhatsApp bulk send via Meta Cloud API + guest list management (CSV + manual)
- [ ] **Phase 5: Admin Dashboard + Hardening** - Deployment visibility, quota monitoring, billing reconciliation, branch cleanup

## Phase Details

### Phase 1: Free Tier MVP
**Goal**: Any user can sign up, browse invitation templates, customize one in-browser, publish it to
a live Vercel URL, and share that URL — with zero technical steps required.
**Depends on**: Nothing (first phase)
**Requirements**: REQ-01, REQ-02, REQ-04, REQ-08
**Success Criteria** (what must be TRUE):
  1. User can sign up or log in with email/password or Google OAuth, and their session persists across browser refreshes.
  2. User can browse a gallery of at least 6 templates (4 wedding, 2 baptism), see a full-screen preview with mobile toggle, and select one to edit.
  3. User can fill in template fields (couple/child names, event date, venue, upload a photo) and see their changes reflected in the preview without writing any code.
  4. User can click Publish and receive a working Vercel URL within 90 seconds; the live invitation matches what they saw in the editor.
  5. User can return to the dashboard, see their invitation listed with draft or published status, and re-open it to continue editing.
**Plans**: 7 plans

Plans:
- [ ] 01-01: Platform scaffold — Next.js 16 + Neon/Drizzle + Clerk auth + CI/CD
- [ ] 01-02: Database schema — users, invitations, subscriptions tables; DeploymentService abstraction
- [ ] 01-03: Template registry — base template components + JSON field schema contract
- [ ] 01-04: Template gallery + preview UI — browse, filter by event type, mobile preview toggle
- [ ] 01-05: In-browser editor — form-based field editor, photo upload to Vercel Blob, autosave (2s debounce)
- [ ] 01-06: Git automation service — Octokit branch-per-invitation writes (invitation/{invitationId})
- [ ] 01-07: Vercel deploy pipeline — project create + async deploy trigger + SSE polling + URL return

### Phase 2: Billing Infrastructure
**Goal**: The platform correctly collects payment, tracks subscription tier, and enforces feature
access server-side — so Gold and Platinum features can be built against a working gate.
**Depends on**: Phase 1
**Requirements**: REQ-03
**Success Criteria** (what must be TRUE):
  1. User can upgrade from Free to Gold or Platinum via Stripe Checkout, and their new tier is reflected immediately in the dashboard after payment.
  2. User on Free tier who attempts to trigger a Gold-gated action (e.g., PDF export) receives a clear upgrade prompt instead of an error.
  3. Downgrading a subscription locks gated features at the end of the current billing period; the user's invitation and data are never deleted.
  4. A failed or disputed payment returns the account to Free tier within one billing cycle; the Stripe webhook state and the local DB stay in sync.
**Plans**: TBD

Plans:
- [ ] 02-01: Stripe integration — products/prices, Stripe Checkout, webhook handler (idempotent)
- [ ] 02-02: FeatureGate service — server-side tier check on every gated API route; invitation count limits (1/3/unlimited)

### Phase 3: Gold Tier
**Goal**: Gold subscribers can download a print-ready PDF of their invitation in A4 or A5, and
receive a QR code pointing to their live URL — bridging digital sharing and physical print.
**Depends on**: Phase 2
**Requirements**: REQ-05
**Success Criteria** (what must be TRUE):
  1. A Gold user can click "Download PDF", select A4 or A5, and receive a file that a print shop can print without further adjustment (300 DPI equivalent, bleeds preserved, fonts embedded).
  2. The PDF output is pixel-faithful to what guests see in the browser, including custom fonts and the uploaded photo.
  3. A QR code pointing to the invitation's live URL is generated on publish and available for download from the dashboard.
  4. PDF generation does not block the main platform — a user triggering a PDF export can continue using the app while the file is being prepared.
**Plans**: TBD

Plans:
- [ ] 03-01: PDF compute environment — deploy Puppeteer + @sparticuz/chromium on Railway/Render/Fly.io (spike to select provider first)
- [ ] 03-02: PDF export service — headless render of live URL, A4/A5 config, font-wait, stream-back to client; QR code generation on publish

### Phase 4: Platinum Tier
**Goal**: Platinum subscribers can manage a guest list and send their invitation URL to every guest
via WhatsApp in a single action — without touching their phone.
**Depends on**: Phase 2 (billing gate) and WABA approval (external gate — must be approved before Phase 4 ships to production)
**Requirements**: REQ-06, REQ-07
**Success Criteria** (what must be TRUE):
  1. User can upload a CSV/Excel file with guest names and phone numbers, see validation errors for malformed or unrecognized numbers, and fix them before sending.
  2. User can add guests manually (name + phone number), edit or remove them, and see the full list before sending.
  3. User can click "Send via WhatsApp" and all valid guests receive the invitation URL as a WhatsApp message within the daily send cap.
  4. User can see a per-guest send status (delivered / failed) after the batch completes, without the UI freezing or timing out.
  5. If WABA approval is pending, the Platinum send button displays a clear "pending approval" state rather than silently failing.
**Plans**: TBD

Plans:
- [ ] 04-01: Guest list management — CSV/XLSX parse (PapaParse + xlsx), E.164 phone validation (libphonenumber-js), manual entry UI, DB storage
- [ ] 04-02: WhatsApp dispatcher — Meta Cloud API integration, QStash job queue, per-guest status tracking, daily send cap, WABA pending-approval fallback state

### Phase 5: Admin Dashboard + Hardening
**Goal**: The operator can monitor platform health, catch billing/deployment drift early, and keep
the system clean as invitation volume grows.
**Depends on**: Phase 4
**Requirements**: REQ-09
**Success Criteria** (what must be TRUE):
  1. Operator can view all invitations across all users with current deployment status (building / live / failed) and subscription tier.
  2. Operator receives an alert before Vercel project quota reaches 80% of the plan limit.
  3. A scheduled reconciliation job detects any mismatch between Stripe subscription state and local DB tier, and flags it for review.
  4. Stale branches for deleted or expired invitations are automatically cleaned up on a weekly schedule, preventing unbounded repo growth.
**Plans**: TBD

Plans:
- [ ] 05-01: Admin dashboard UI — invitation list with status/tier filters, WhatsApp send log, WABA quality rating display
- [ ] 05-02: Operational hardening — Vercel quota monitor + alert, Stripe/DB reconciliation cron, branch cleanup cron

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Free Tier MVP | 2/7 | In Progress|  |
| 2. Billing Infrastructure | 0/2 | Not started | - |
| 3. Gold Tier | 0/2 | Not started | - |
| 4. Platinum Tier | 0/2 | Not started | - |
| 5. Admin Dashboard + Hardening | 0/2 | Not started | - |

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-01: Template gallery (wedding/baptism) | Phase 1 | Pending |
| REQ-02: In-browser customization (text, images, sections) | Phase 1 | Pending |
| REQ-04: Free tier end-to-end (select + edit + deploy + URL) | Phase 1 | Pending |
| REQ-08: Vercel project created/deployed per invitation, URL returned | Phase 1 | Pending |
| REQ-03: Platform offers 3 tiers: Free, Gold, Platinum | Phase 2 | Pending |
| REQ-05: Gold tier — PDF print export in standard sizes | Phase 3 | Pending |
| REQ-06: Platinum tier — WhatsApp bulk sending via WABA | Phase 4 | Pending |
| REQ-07: Platinum tier — guest list via CSV/Excel or manual phone entry | Phase 4 | Pending |
| REQ-09: Admin dashboard for managing invitations and WhatsApp sends | Phase 5 | Pending |

Coverage: 9/9 requirements mapped. No orphans.

## Critical Non-Engineering Task

**WABA Application (start in Phase 1, runs in parallel):**
Apply for WhatsApp Business Account approval with Meta before Phase 1 engineering begins. Meta's
review takes 2–10 weeks. Submit at least one message template for the invitation link use case.
Platinum tier cannot ship to production until WABA status is "Approved". Track approval status
in the admin dashboard (Phase 5).

## Research Flags (resolve before phase planning)

- **Phase 1:** Verify current Vercel Pro plan project limits at vercel.com/pricing. If the per-project
  model hits limits sooner than expected, the fallback is a single Vercel project with path-based
  routing per invitation. This is an architectural fork — resolve before Phase 1 plans are written.
- **Phase 3:** Spike on PDF compute provider (Railway vs. Render vs. Fly.io vs. Browserless.io)
  before writing Phase 3 plans. Compare cold start behavior, cost per PDF, and deployment complexity.
- **Phase 4:** Verify WhatsApp Cloud API per-message pricing for Romania/EU and current Meta template
  content policy (utility vs. marketing classification) before Phase 4 plans are written. These change
  frequently.
