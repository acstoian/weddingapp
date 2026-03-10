# Phase 3: Gold Tier - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Gold subscribers can download a print-ready PDF of their invitation in two sizes (Card 100×150mm, Pliant 148×200mm), with the QR code pointing to the live URL embedded at the bottom of the PDF overlaid on the photo. QR code generation is part of the PDF export — no separate QR download. Free-tier users see the Export PDF button as locked (opens upgrade modal).

</domain>

<decisions>
## Implementation Decisions

### PDF Sizes
- **Card:** 100×150mm
- **Pliant:** 148×200mm
- Portrait only — no landscape
- 3mm white margins on all sides (not bleed-to-edge)
- `printBackground: true` — CSS backgrounds and images are included
- No PDF metadata (title/author) — Puppeteer defaults are fine

### PDF Rendering Source
- Puppeteer navigates to the **live Vercel URL** of the published invitation
- URL is publicly accessible — no auth needed
- If invitation is not published (status !== LIVE): Export PDF button is disabled with tooltip "Publica mai intai" — no auto-publish
- Wait strategy: `waitUntil: 'networkidle0'` + `page.evaluate(() => document.fonts.ready)` — ensures Playfair Display and uploaded photos are fully loaded
- Scale factor: **3.125** (= 300 DPI equivalent at 96 DPI screen resolution) — passed as `scaleFactor` in request body (overridable)
- PDF service called via **direct HTTP** — no job queue (renders in 3–15 seconds)
- PDF bytes **streamed directly** to browser — not stored in Vercel Blob

### PDF Compute Service (Railway Microservice)
- **Platform:** Railway (cold start acceptable — hobby plan)
- **Location:** `/services/pdf-renderer` subfolder in monorepo
- **Config:** `railway.toml` in `/services/pdf-renderer` specifying Dockerfile builder
- **Runtime:** Node 20 LTS, `ghcr.io/puppeteer/puppeteer` base Docker image
- **Language:** TypeScript, compiled with `tsc`, run as `node dist/index.js`
- **Framework:** Express.js
- **Chromium:** `puppeteer-core` + `@sparticuz/chromium` — no bundled Chrome
- **Browser strategy:** Single persistent browser instance launched on startup; new page per request, page closed after render
- **Chromium launch args:** `--no-sandbox`, `--disable-setuid-sandbox` — hardcoded (required in Docker)
- **Concurrency limit:** Max 2 simultaneous renders; 3rd+ request gets 429
- **Memory:** 512MB Railway instance
- **Graceful shutdown:** On SIGTERM, stop new requests, wait up to 30 seconds for in-flight renders to complete before closing browser
- **Local dev:** `docker-compose.yml` included for local development

### PDF Service API Contract
- **Endpoints:** `POST /render` + `GET /health`
- **Request body:** `{ url: string, widthMm: number, heightMm: number, scaleFactor?: number }`
- **Auth:** `X-PDF-Secret` header checked against `PDF_SERVICE_SECRET` env var
- **Success response:** PDF bytes with `Content-Type: application/pdf`
- **Error response:** JSON `{ error: string, code: string }` with appropriate HTTP status
- **Orientation:** Portrait only
- **Logging:** Structured JSON to stdout — `{ url, size, durationMs, status }` per request
- **No CORS** — server-to-server call only

### Next.js PDF Export Route
- **Route:** `POST /api/export/pdf/[id]?size=card` or `?size=pliant`
- `size=card` → 100×150mm; `size=pliant` → 148×200mm
- **Auth:** Clerk `auth()` required
- **Ownership check:** Load invitation from DB, verify `invitation.userId === userId` — return 404 if not found or not owned
- **Gate:** `featureGate.canExportPdf(userId)` — new method added to `FeatureGate` interface, returns `true` for GOLD and PLATINUM
- **Timeout:** 60 seconds (`export const maxDuration = 60`)
- **No rate limit** on Next.js side — Railway concurrency limit is the effective throttle
- **Env vars needed:** `PDF_SERVICE_URL` (Railway deploy URL), `PDF_SERVICE_SECRET` (shared secret)

### Export UX (PdfExportButton)
- **Component:** Extend existing `PdfExportButton` in `EditorLockedFeatures.tsx` in-place (no new component)
- **Location:** Editor sidebar only — not on dashboard
- **New props passed from EditorLayout:** `invitationId`, `isLive` (bool, lifted state from `invitation.status === 'LIVE'`), `tier` (already passed)
- **isLive updates:** `EditorLayout` tracks `isLive` in `useState`. `PublishProgress` gets a new optional `onPublished?: () => void` callback; calls it when deployment reaches LIVE. `EditorLayout` sets `setIsLive(true)`.
- **Size selector:** Segmented control (toggle group) above the Export PDF button — "Card (10x15cm)" / "Pliant (15x20cm)"
- **Default size:** Card selected by default; selection persists in component state until unmount
- **Disabled states:**
  - FREE tier: button locked (wrapper clickable → opens UpgradeModal) — existing behavior
  - GOLD/PLATINUM + not published: Export PDF button disabled, tooltip "Publica mai intai"
  - GOLD/PLATINUM + published: size selector + active Export PDF button
- **Loading state:** Button shows spinner + "Se genereaza..." while fetching PDF
- **Success:** Browser download dialog with PDF — no further UI change needed
- **Error states:**
  - 429: "Serverul este ocupat — Incearca din nou in cateva secunde." + retry button
  - 500/timeout: "Generarea PDF a esuat — Incearca din nou." + retry button
  - Both: inline on button, not a toast
- **Caption:** Small text below button: "PDF-ul reflecta versiunea publicata"
- **Filename:** `{invitation-title-slugified}-{size}.pdf` (e.g. `nunta-ana-si-ion-card.pdf`)
- **No autosave** before export — PDF renders the live published version, not editor draft

### QR Code
- **Placement:** Embedded in the PDF, positioned **bottom-center of the photo area**, overlaid on the photo
- **Must not cover** any text or UI elements — lives in the photo zone only
- **Size:** ~15×15mm in printed output
- **Background:** White rounded background with ~2mm padding (ensures scanability over any photo color)
- **Trigger:** QR appears only in print context — invitation page checks `?print=true` query param in URL
- **PDF service behavior:** Navigates to `liveUrl + ?print=true` instead of plain `liveUrl`
- **QR data:** The invitation's canonical live URL — page derives it via `window.location.origin + pathname` (strips `?print=true`)
- **Library:** `qrcode.react` — SVG output, rendered as a React component inside the template
- **Scope:** All 6 invitation templates implement the `?print=true` QR overlay

### FeatureGate Extension
- Add `canExportPdf(userId: string): Promise<{ allowed: boolean; reason?: string }>` to `FeatureGate` interface
- `StripeFeatureGate` implements it: returns `allowed: true` for GOLD and PLATINUM, `allowed: false` for FREE
- `StubFeatureGate` (if still referenced in tests): returns `allowed: true` for convenience

### Testing
- **Railway service:** Integration tests using Vitest
  - Start service locally in test setup
  - Render against a **real deployed invitation URL** from `TEST_INVITATION_URL` env var
  - Assert: response buffer is non-empty + `Content-Type: application/pdf`
  - Assert concurrency limit: fire 3 concurrent requests, verify at least one returns 429
- **Next.js route:** Unit tests for auth check, ownership check, gate check, 429/500 error handling

### Claude's Discretion
- Exact Puppeteer page viewport width when rendering (matching mm dimensions vs. device-pixel approach)
- QR code border-radius value for the white background
- Exact bottom-center positioning offset from the photo container edge
- Dockerfile multi-stage build details
- `railway.toml` exact builder configuration syntax

</decisions>

<specifics>
## Specific Ideas

- QR code at bottom-center of photo, overlaid on the image but **not covering any text or other elements** — strictly in the photo zone
- PDF reflects what guests see on the live URL — exact pixel match is the goal
- "Card" = 100×150mm (postcard-like), "Pliant" = 148×200mm (folded insert)
- Small caption on Export button: "PDF-ul reflecta versiunea publicata" — sets correct expectations
- Cold start on Railway is acceptable — users understand occasional slow first render

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/editor/EditorLockedFeatures.tsx`: `PdfExportButton` already exists — Gold+ shows placeholder, FREE shows locked state. Extend in-place with size selector + real export logic.
- `src/components/editor/PublishButton.tsx` + `PublishProgress.tsx`: Add `onPublished` callback to `PublishProgress` to signal publish completion back to `EditorLayout`
- `src/lib/feature-gate.ts`: `FeatureGate` interface + `StripeFeatureGate` — add `canExportPdf()` method following same pattern as `canPublish()`
- `src/app/api/publish/[id]/route.ts`: Template for the new `/api/export/pdf/[id]` route — ownership check, feature gate check, same pattern
- `src/lib/services/billing.service.ts`: Pattern for service abstraction — consider `pdf.service.ts` for Railway HTTP call
- `src/lib/db/schema.ts`: `invitations` table has `liveUrl`, `status`, `id` — all needed for PDF export route

### Established Patterns
- Dynamic API routes: `{ params }: { params: Promise<{ id: string }> }` with `await params` (Next.js 15+ requirement — already established)
- Feature gate: `featureGate.canPublish(userId)` → `featureGate.canExportPdf(userId)` same shape
- Clerk auth: `auth()` from `@clerk/nextjs/server` in API routes
- Service layer: `src/lib/services/` folder — new `pdf.service.ts` fits here

### Integration Points
- `EditorLayout.tsx`: Needs `isLive` state + `onPublished` wiring to `PublishProgress` + new props to `EditorLockedFeatures`
- 6 invitation templates in `src/lib/templates/` (or wherever they live): Each needs `?print=true` QR overlay added
- New env vars: `PDF_SERVICE_URL`, `PDF_SERVICE_SECRET` — add to `.env.local` and Vercel project settings
- New monorepo directory: `/services/pdf-renderer/` — Express + Puppeteer + Docker

</code_context>

<deferred>
## Deferred Ideas

- QR code as a separate downloadable (PNG/SVG) from the editor — not needed; it's embedded in PDF only
- Landscape PDF orientation — no current use case
- PDF stored in Vercel Blob for re-download without regenerating — add if users request it
- Puppeteer browser pool (multiple browser instances) — single instance is sufficient at current scale
- Prometheus /metrics endpoint — structured logs are sufficient for Phase 3
- Rate limiting on Next.js PDF route — Railway concurrency limit is sufficient
- Custom PDF metadata (author, title) — not needed for print-shop use

</deferred>

---

*Phase: 03-gold-tier*
*Context gathered: 2026-03-10*
