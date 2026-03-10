# Context Snapshot — 2026-03-10 (Session 10)

## What Was Worked On

Ran `/gsd:discuss-phase 3` — exhaustive context gathering for Phase 3 (Gold Tier: PDF export + QR code).

Created `.planning/phases/03-gold-tier/03-CONTEXT.md` with all implementation decisions locked for the researcher and planner.

Commits this session: `d0b32a8` (03-CONTEXT.md), `a00029c` (STATE.md updated)

---

## Current State

| Item | Status |
|------|--------|
| Phase 1 | Complete ✓ |
| Phase 2 | Complete ✓ — verified and committed |
| Phase 3 (gold-tier) | Context gathered ✓ — ready for planning |
| Git branch | master, last commit `a00029c` |

---

## Phase 3 Decisions — Full Summary

### PDF Sizes
- **Card:** 100×150mm, **Pliant:** 148×200mm (these exact dimensions, NOT A4/A5)
- Portrait only, 3mm white margins on all sides, `printBackground: true`
- Scale factor: **3.125** (= 300 DPI equivalent at 96 DPI screen resolution)
- No PDF metadata (Puppeteer defaults)

### PDF Rendering
- Puppeteer navigates to the **live Vercel URL** (invitation must be PUBLISHED — status === LIVE)
- URL is publicly accessible — no auth bypass token needed
- If not published: Export PDF button disabled, tooltip "Publica mai intai"
- Wait strategy: `waitUntil: 'networkidle0'` + `page.evaluate(() => document.fonts.ready)`
- PDF bytes **streamed directly** to browser — not stored in Vercel Blob
- Direct HTTP call to Railway — no job queue

### Railway PDF Microservice
- **Location:** `/services/pdf-renderer` in the monorepo
- **Config:** `railway.toml` in that subfolder specifying Dockerfile builder
- **Runtime:** Node 20 LTS, `ghcr.io/puppeteer/puppeteer` Docker base image
- **Language:** TypeScript, compiled (`tsc`), run as `node dist/index.js`
- **Framework:** Express.js
- **Chromium:** `puppeteer-core` + `@sparticuz/chromium` (no bundled Chrome)
- **Browser:** Single persistent instance; new page per request, page closed after
- **Chromium args:** `--no-sandbox`, `--disable-setuid-sandbox` hardcoded (Docker requirement)
- **Concurrency:** Max 2 simultaneous renders; 3rd+ → 429 returned to browser
- **Memory:** 512MB Railway instance
- **Cold start:** Acceptable (hobby plan, no always-on)
- **Graceful shutdown:** SIGTERM → stop new requests → wait up to 30s for in-flight → close browser
- **Local dev:** `docker-compose.yml` included
- **Endpoints:** `POST /render` + `GET /health`
- **Request body:** `{ url: string, widthMm: number, heightMm: number, scaleFactor?: number }`
- **Auth:** `X-PDF-Secret` header checked against `PDF_SERVICE_SECRET` env var
- **Error response:** JSON `{ error: string, code: string }`
- **Logging:** Structured JSON to stdout — `{ url, size, durationMs, status }` per request
- **No CORS** (server-to-server only)

### Next.js PDF Export Route
- **Route:** `POST /api/export/pdf/[id]?size=card` or `?size=pliant`
- `size=card` → 100×150mm; `size=pliant` → 148×200mm
- Clerk `auth()` required; ownership check (invitation.userId === userId), 404 if not owned
- **Gate:** `featureGate.canExportPdf(userId)` — new method on FeatureGate interface (GOLD + PLATINUM allowed)
- **Timeout:** 60 seconds (`export const maxDuration = 60`)
- No rate limit on Next.js side
- **Env vars needed:** `PDF_SERVICE_URL`, `PDF_SERVICE_SECRET`

### Export UX (PdfExportButton)
- Extend existing `PdfExportButton` in `EditorLockedFeatures.tsx` in-place
- **New props from EditorLayout:** `invitationId`, `isLive` (bool), `tier` (already there)
- `isLive` is lifted state in `EditorLayout` (initialized from `invitation.status === 'LIVE'`)
- `PublishProgress` gets new optional `onPublished?: () => void` callback → calls `setIsLive(true)` in EditorLayout
- **Size selector:** Segmented control above Export button — "Card (10x15cm)" / "Pliant (15x20cm)"
- Default: Card; persists in component state until unmount
- **Disabled states:** FREE → locked (upgrade modal); GOLD/PLATINUM + not LIVE → disabled + tooltip "Publica mai intai"
- **Loading:** Spinner + "Se genereaza..."
- **Error:** 429 → "Serverul este ocupat — Incearca din nou in cateva secunde." | 500/timeout → "Generarea PDF a esuat — Incearca din nou." — both inline with retry
- **Caption:** "PDF-ul reflecta versiunea publicata"
- **Filename:** `{invitation-title-slugified}-{size}.pdf`
- Editor sidebar only — not on dashboard
- No autosave before export

### QR Code
- **Embedded in the PDF** — NOT a separate download
- **Position:** Bottom-center of the photo area, overlaid on the photo
- **Constraint:** Must NOT cover any text or other UI elements — photo zone only
- **Size:** ~15×15mm in printed output
- **Background:** White rounded background with ~2mm padding (scannable over any photo)
- **Trigger:** `?print=true` query param — PDF service navigates to `liveUrl + ?print=true`
- **QR data:** Canonical live URL derived in-page (`window.location.origin + pathname`, strips `?print=true`)
- **Library:** `qrcode.react` (SVG output)
- **Scope:** All 6 invitation templates implement the `?print=true` QR overlay

### FeatureGate Extension
- Add `canExportPdf(userId: string): Promise<{ allowed: boolean; reason?: string }>` to `FeatureGate` interface
- `StripeFeatureGate`: true for GOLD + PLATINUM, false for FREE
- Follows same shape as `canPublish()`

### Testing
- Railway service: Vitest integration tests — start service locally, render `TEST_INVITATION_URL` (real deployed invitation URL, from env var), assert buffer non-empty + `Content-Type: application/pdf`; also assert concurrency limit (3 concurrent → at least one 429)
- Next.js route: unit tests for auth, ownership, gate, 429/500 error handling

---

## Key Files for Next Session

| File | Purpose |
|------|---------|
| `.planning/phases/03-gold-tier/03-CONTEXT.md` | Full decisions doc for planner/researcher |
| `src/components/editor/EditorLockedFeatures.tsx` | PdfExportButton to extend |
| `src/components/editor/EditorLayout.tsx` | Needs isLive state + onPublished wiring |
| `src/components/editor/PublishProgress.tsx` | Needs onPublished callback |
| `src/lib/feature-gate.ts` | Add canExportPdf() method |
| `src/app/api/publish/[id]/route.ts` | Template for new /api/export/pdf/[id] route |
| `/services/pdf-renderer/` | New Railway microservice (doesn't exist yet) |
| `src/lib/templates/` | All 6 templates need ?print=true QR overlay |

---

## Key Architecture Decisions (Phase 2 — confirmed in production)

- One-time lifetime payment, Stripe `payment` mode (NOT subscription)
- Gold: 99 RON, Platinum: 149 RON, Gold→Platinum upgrade: 50 RON
- Only webhook: `checkout.session.completed`
- Drop `subscriptions` table — `users.tier` is source of truth
- Webhook MUST use `request.text()` first (raw body)
- `customer_creation: "always"` for new users; `customer: existingId` for returning
- Idempotency: insert to `stripe_events` before DB write, catch only `code === "23505"`
- StripeFeatureGate: no cache, DB read every call, upserts user on first check
- FREE: 3 drafts / 1 published; GOLD/PLATINUM: unlimited
- `featureGate` singleton export name unchanged (zero call-site changes)

## Next.js 15+ Gotcha (critical)
`params` in Route Handlers is now a `Promise<{ id: string }>` and MUST be awaited:
```ts
// WRONG (Next.js 14 style)
{ params }: { params: { id: string } }
const userId = params.id; // undefined!

// CORRECT (Next.js 15+)
{ params }: { params: Promise<{ id: string }> }
const { id: userId } = await params;
```
Already fixed in `src/app/api/admin/users/[id]/tier/route.ts`. Apply same pattern to ANY future dynamic route handlers.

## Stripe Dev Workflow
- `stripe listen --forward-to localhost:3000/api/webhooks/stripe` must be running in a terminal
- The `whsec_...` it prints is ephemeral — copy to `.env.local` STRIPE_WEBHOOK_SECRET each dev session
- Current webhook secret in `.env.local`: `whsec_77fdadc8964067ba62a800723ebd11718ca9f38082650499ddd7eecec1ca34a7`
- Admin user ID: `user_3Aio6Xy2KqoD3WtbIQGZQpVOVoV`
- Admin secret: `8f3a2c1e9d4b7f6a0e5c8d2b4a9f1e3c`

## Gotchas
- Python: use `py` not `python3`
- Background agents cannot use Bash — always run gsd-executor foreground
- `stripe listen` must be running before testing any billing flows (webhook secret is session-specific)
- RESEND_FROM_DOMAIN is empty — email skips gracefully (not a bug)
- Test user ID: `user_3Aio6Xy2KqoD3WtbIQGZQpVOVoV`
- PDF sizes are 100×150mm (Card) and 148×200mm (Pliant) — NOT A4/A5
- WABA Meta Business Verification: still needs to be initiated manually (2–10 week lead time for Phase 4)
