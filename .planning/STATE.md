---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Billing + Gold
status: in_progress
stopped_at: Completed 03-02-PLAN.md
last_updated: "2026-03-15T00:00:00.000Z"
last_activity: 2026-03-15 — 03-02 all 3 tasks done, checkpoint APPROVED, Phase 3 complete
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 4
  completed_plans: 4
  percent: 70
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10 after v1.0 milestone)

**Core value:** Every invitation goes from template to live, shareable link with zero technical effort — then reaches guests however they prefer.
**Current focus:** Phase 3 complete — Phase 4 (Platinum Tier) next

## Current Position

Phase: 3 of 5 (Gold Tier) — COMPLETE
Plan: Phase 3 complete — ready to start Phase 4
Status: Phase 3 fully done — human checkpoint APPROVED; ready for Phase 4 planning
Last activity: 2026-03-15 — 03-02 all 3 tasks done, checkpoint APPROVED, Railway hotfixes committed

Progress: [███████░░░] ~70% (Phase 1 done, Phase 2 done, Phase 3 done — Phase 4 next)

## Performance Metrics

**Velocity:**
- Total plans completed: 10 (7 Phase 1 + 2 Phase 2 + 2 Phase 3 = 10 total, but 4 tracked in this state)
- Phase 1: 2 days for 7 plans (~7 hours/plan)
- Phase 2 plan 01: ~6 minutes (backend only, no UI)
- Phase 3: 2 plans — Railway microservice + frontend wiring + QROverlay

## Accumulated Context

### Decisions

- React-based templates + Vercel per-invitation + field-based editor — all validated in v1.0 UAT
- DeploymentService abstraction ready for Phase 5 swap
- Branch naming: invitation/{invitationId} — confirmed correct
- SSE polling for deploy status — confirmed working within 90s
- data.alias[] for stable liveUrl — fixed in UAT; must use alias not data.url
- Stripe one-time payments (not subscriptions) — Gold 99 RON, Platinum 149 RON, upgrade 50 RON
- stripeEvents table for idempotent webhook processing (unique constraint, code 23505 = skip)
- emailService object export on email.service.ts — fire-and-forget purchase confirmation
- StripeFeatureGate: upsert user row on getUserTier to ensure row exists before gate check
- PricingCards client component pattern: server fetches tier, client handles checkout redirect
- Locked feature UI: wrapper div is clickable, inner button has disabled attr (pointer-events workaround)
- DashboardUsageBar returns null for non-FREE users — avoids clutter for paid users
- Billing success polls tier !== FREE (not specific tier) — works for both GOLD and PLATINUM upgrades
- [Phase 03-gold-tier]: Buffer->Uint8Array required for NextResponse BodyInit in Next.js PDF streaming
- [Phase 03-gold-tier]: PDF Railway service uses eager browser launch (not lazy) with MAX_RENDERS=2 concurrency gate
- [Phase 03-gold-tier]: QROverlay reads window.location at render time (not prop) — Puppeteer navigates to live URL so origin+pathname is canonical
- [Phase 03-gold-tier]: QRCodeSVG size=170 — 15mm/100mm * 1134px (CSS_SCALE=3) ≈ 170px → ~15mm in print
- [Phase 03-gold-tier]: onPublished callback (not polling) for isLive update after publish — no extra network traffic
- [Phase 03-gold-tier]: Inline error (not toast) for 429 with Romanian message + retry button
- [Phase 03-gold-tier]: Railway PORT env var fix required — hardcoded 3001 crashes Railway deployments
- [Phase 03-gold-tier]: Single-page PDF constraint required — Puppeteer paginates by default without explicit size enforcement

### Pending Todos

- Start WABA Meta Business Verification application (2–10 week lead time, needed before Phase 4)
- Configure Railway service: PDF_SERVICE_URL + PDF_SERVICE_SECRET in Vercel env vars (user setup required)

### Blockers/Concerns

- WABA approval is a hard external gate for Phase 4 Platinum — start Meta application immediately
- Railway PDF service requires user to add PDF_SERVICE_URL and PDF_SERVICE_SECRET to Vercel environment variables before PDF export goes live
- Vercel project limits unconfirmed — verify Pro plan limits before high-volume usage

## Session Continuity

Last session: 2026-03-15T00:00:00.000Z
Stopped at: Completed 03-02-PLAN.md
Resume file: None
