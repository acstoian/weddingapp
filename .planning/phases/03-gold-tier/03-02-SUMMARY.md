---
phase: 03-gold-tier
plan: 02
subsystem: ui
tags: [react, qrcode, pdf, next.js, tailwind, typescript]

# Dependency graph
requires:
  - phase: 03-gold-tier plan 01
    provides: "Railway PDF microservice, canExportPdf(), pdf.service.ts, /api/export/pdf/[id] route, Tier type"
  - phase: 02-billing-infrastructure
    provides: "StripeFeatureGate, getUserTier(), FeatureGate interface, tier-gated editor UI skeleton"
provides:
  - "QROverlay component (src/components/templates/QROverlay.tsx) — renders QR code when ?print=true, used by Puppeteer PDF renderer"
  - "PdfExportButton with size selector (Card/Pliant), real fetch, loading/error states, disabled-when-unpublished"
  - "isLive state threaded through EditorPage→EditorLayout→FieldSidebar→PdfExportButton"
  - "PublishProgress onPublished callback — enables Export PDF button without page reload after publish"
  - "All 6 invitation templates render QROverlay inside photo div"
affects: [04-platinum-tier, 05-admin-dashboard]

# Tech tracking
tech-stack:
  added:
    - "qrcode.react (QRCodeSVG for SVG QR rendering in templates)"
  patterns:
    - "QROverlay wrapped in Suspense (useSearchParams requires Suspense boundary in Next.js App Router)"
    - "isLive useState in EditorLayout, set to true by onPublished callback from PublishProgress when stage=live"
    - "Client-side blob download: fetch → res.blob() → URL.createObjectURL → anchor click → revokeObjectURL"
    - "Segmented size selector: border-based toggle, two buttons, no gap, CSS classes for active/inactive state"
    - "Inline error display (not toast) for 429 and render failures, with retry button"

key-files:
  created:
    - "src/components/templates/QROverlay.tsx"
  modified:
    - "src/components/templates/MinimalWedding1.tsx"
    - "src/components/templates/MinimalWedding2.tsx"
    - "src/components/templates/MinimalWedding3.tsx"
    - "src/components/templates/DecorativeWedding1.tsx"
    - "src/components/templates/MinimalBaptism1.tsx"
    - "src/components/templates/MinimalBaptism2.tsx"
    - "src/components/editor/EditorLockedFeatures.tsx"
    - "src/components/editor/EditorLayout.tsx"
    - "src/components/editor/FieldSidebar.tsx"
    - "src/components/editor/PublishProgress.tsx"
    - "src/app/(dashboard)/editor/[id]/page.tsx"
    - "tests/unit/templates.test.tsx"

key-decisions:
  - "QROverlay reads window.location.origin + pathname at render time (not passed as prop) — Puppeteer navigates to the live URL so the QR encodes the correct canonical URL"
  - "size={170} for QRCodeSVG — 15mm/100mm * 1134px (CSS_SCALE=3 viewport) gives ~170px, renders ~15mm in print"
  - "Inline error for 429 with 'Serverul este ocupat — Incearca din nou in cateva secunde.' — matches Romanian UI language"
  - "onPublished callback pattern (not polling/refetch) for isLive update — zero page reload, zero extra network request"
  - "a.download fallback with invitatie-{size}.pdf — server Content-Disposition is the primary filename signal; blob URL fallback for browsers that ignore it"
  - "Two Railway hotfixes committed after 03-01 docs commit: PORT env var and single-page PDF constraint"

patterns-established:
  - "Locked feature wiring: server page fetches tier, passes to EditorLayout, EditorLayout distributes to sidebar, sidebar renders gated component"
  - "TDD flow for UI components: write failing tests → create component → tests go green → commit each phase"

requirements-completed:
  - "Gold tier: PDF print export in standard sizes"

# Metrics
duration: ~3 sessions
completed: 2026-03-15
---

# Phase 3 Plan 02: Frontend Integration Summary

**PdfExportButton with Card/Pliant size selector, real fetch + download, and QROverlay in all 6 templates — Gold tier PDF export complete end-to-end**

## Performance

- **Duration:** ~3 sessions (spread across multiple days including Railway hotfixes)
- **Started:** 2026-03-10 (after 03-01 docs commit)
- **Completed:** 2026-03-15
- **Tasks:** 3 (Task 1 TDD + Task 2 wiring + Task 3 human checkpoint — APPROVED)
- **Files modified:** 12

## Accomplishments

- All 6 invitation templates render a scannable QR code (size=170) at bottom-center of photo area when Puppeteer navigates with ?print=true; QR is absent in normal browser view
- PdfExportButton shows size selector (Card 10x15cm / Pliant 15x20cm), triggers POST /api/export/pdf/[id]?size=..., streams blob to browser download; shows spinner + "Se genereaza..." while in flight; 429 shows inline Romanian retry message
- Free users see locked button that opens UpgradeModal; GOLD/PLATINUM users with unpublished invitation see disabled button with "Publica mai intai" tooltip; after publish (SSE reaches live), button activates without page reload via onPublished callback

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): QROverlay failing tests** - `45023fc` (test)
2. **Task 1 (GREEN): QROverlay component + 6 templates** - `05662e7` (feat)
3. **Task 2: Tier+isLive wiring + PdfExportButton** - `6890406` (feat)
4. **Railway hotfix: PORT env var** - `eda4594` (fix)
5. **Railway hotfix: single-page PDF output** - `9faac51` (fix)

_Task 3 was a human verification checkpoint — approved by user, no code commit._

## Files Created/Modified

- `src/components/templates/QROverlay.tsx` - "use client" component; reads useSearchParams for ?print=true; renders QRCodeSVG size=170 at absolute bottom-center of photo div; wrapped in Suspense
- `src/components/templates/MinimalWedding1.tsx` - Added QROverlay inside photo div
- `src/components/templates/MinimalWedding2.tsx` - Added QROverlay inside photo div
- `src/components/templates/MinimalWedding3.tsx` - Added QROverlay inside photo div
- `src/components/templates/DecorativeWedding1.tsx` - Added QROverlay inside photo div
- `src/components/templates/MinimalBaptism1.tsx` - Added QROverlay inside photo div
- `src/components/templates/MinimalBaptism2.tsx` - Added QROverlay inside photo div
- `src/components/editor/EditorLockedFeatures.tsx` - Extended PdfExportButton: size selector, handleExport fetch, loading/error states, FREE lock
- `src/components/editor/EditorLayout.tsx` - Added tier + initialIsLive props, isLive useState, handlePublished callback, wired to FieldSidebar
- `src/components/editor/FieldSidebar.tsx` - Added tier/isLive/onPublished props, renders PdfExportButton in sticky bottom section
- `src/components/editor/PublishProgress.tsx` - Added onPublished?: () => void prop; calls it when stage transitions to 'live'
- `src/app/(dashboard)/editor/[id]/page.tsx` - Fetches tier via featureGate.getUserTier(userId); passes tier + initialIsLive to EditorLayout
- `tests/unit/templates.test.tsx` - Extended with QROverlay print/no-print tests

## Decisions Made

- QROverlay reads window.location at render time rather than receiving URL as prop — this is correct because Puppeteer navigates to the live invitation URL before screenshotting, so window.location.origin + pathname is the canonical live URL.
- size={170} based on RESEARCH.md Pattern 4: 15mm / 100mm * 1134px (CSS_SCALE=3) ≈ 170px.
- Inline error display (not toast) for 429 and render failures — keeps user in context and provides a clear retry path.
- onPublished callback pattern (not polling) for enabling Export PDF after publish — no extra network traffic, immediate UI update.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Railway service used hardcoded port 3001 instead of PORT env var**
- **Found during:** Post-Task-2 Railway deployment testing
- **Issue:** pdf-renderer Express server bound to hardcoded port 3001; Railway injects PORT dynamically, causing service crash
- **Fix:** Updated server startup to use `process.env.PORT || 3001`
- **Files modified:** services/pdf-renderer (server entry)
- **Verification:** Railway deployment succeeded after fix
- **Committed in:** eda4594

**2. [Rule 1 - Bug] PDF renderer generated multi-page output instead of single page**
- **Found during:** Post-Task-2 Railway deployment testing
- **Issue:** Puppeteer PDF output spanning multiple pages for some invitation heights; should always be single-page matching selected size
- **Fix:** Added explicit page size constraint forcing single-page PDF output
- **Files modified:** services/pdf-renderer (PDF render logic)
- **Verification:** Card and Pliant exports are single-page at correct dimensions
- **Committed in:** 9faac51

---

**Total deviations:** 2 auto-fixed (2 bugs in Railway service discovered during live testing)
**Impact on plan:** Both Railway fixes necessary for PDF export to function correctly. No scope creep.

## Issues Encountered

- Railway ENV variable for PORT not present in initial deployment; service started on 3001 but Railway routes external traffic to the dynamic PORT value — caught during live PDF export testing and fixed immediately.
- Single-page PDF constraint: Puppeteer's default behavior paginates content that overflows; explicit size constraints needed to force single-page output matching the Card/Pliant dimensions.

## User Setup Required

**External services require manual configuration.** See [03-USER-SETUP.md](./03-USER-SETUP.md) for:

- `PDF_SERVICE_URL` — Railway dashboard → your pdf-renderer service → Settings → Domains
- `PDF_SERVICE_SECRET` — random secret set in both Railway service env vars AND Vercel project env vars
- Railway deployment: New Project → Deploy from GitHub → Root Directory: /services/pdf-renderer
- Vercel: Settings → Environment Variables → add PDF_SERVICE_URL + PDF_SERVICE_SECRET

## Next Phase Readiness

- Gold tier PDF export is feature-complete and human-approved.
- Phase 3 is fully done (03-01 + 03-02 both complete).
- Phase 4 (Platinum Tier) can start: WhatsApp bulk send + guest list management.
- WABA Meta Business Verification application should be in progress (2-10 week lead time).

---
*Phase: 03-gold-tier*
*Completed: 2026-03-15*
