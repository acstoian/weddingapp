---
phase: 03-gold-tier
plan: "01"
subsystem: pdf-export
tags: [pdf, railway, puppeteer, microservice, feature-gate, gold-tier]
dependency_graph:
  requires: []
  provides: [pdf-renderer-service, canExportPdf, renderPdf, pdf-export-route]
  affects: [feature-gate, billing-tier-checks]
tech_stack:
  added: [puppeteer-core@24, "@sparticuz/chromium@131", express@4, slugify]
  patterns: [railway-microservice, express-concurrency-gate, eager-browser-launch, tdd-red-green]
key_files:
  created:
    - services/pdf-renderer/src/index.ts
    - services/pdf-renderer/Dockerfile
    - services/pdf-renderer/railway.toml
    - services/pdf-renderer/docker-compose.yml
    - services/pdf-renderer/package.json
    - services/pdf-renderer/tsconfig.json
    - src/lib/services/pdf.service.ts
    - src/app/api/export/pdf/[id]/route.ts
    - tests/unit/pdf-export.test.ts
    - tests/integration/pdf-service.test.ts
  modified:
    - src/lib/feature-gate.ts
    - tests/unit/feature-gate.test.ts
decisions:
  - "Buffer->Uint8Array conversion required for NextResponse BodyInit compatibility"
  - "Integration tests placed in tests/integration/ (outside vitest include path) — requires vitest/globals reference directive"
  - "PDF route returns Buffer wrapped in Uint8Array to satisfy Next.js Response type constraints"
metrics:
  duration: "~6 minutes"
  completed_date: "2026-03-10"
  tasks_completed: 3
  tasks_total: 3
  files_created: 10
  files_modified: 2
---

# Phase 3 Plan 01: PDF Compute Microservice and Backend Wiring Summary

**One-liner:** Railway Express+Puppeteer PDF microservice with concurrency gate, FeatureGate.canExportPdf(), and Next.js /api/export/pdf/[id] route for Gold-tier print export.

## What Was Built

### Task 1: Wave 0 test stubs (TDD RED)

Three test files written before any implementation:
- `tests/unit/feature-gate.test.ts` — 4 canExportPdf tests (GOLD/PLATINUM/FREE + delegation check)
- `tests/unit/pdf-export.test.ts` — 8 route tests covering 401/403/404/429/500/200 and filename slugification
- `tests/integration/pdf-service.test.ts` — 4 integration tests (skipped when TEST_INVITATION_URL unset)

All unit tests were RED (TypeError: gate.canExportPdf is not a function) before implementation.

### Task 2: Railway PDF Microservice

Complete deployable service in `/services/pdf-renderer/`:

- **src/index.ts**: Express app with `/render` (POST) and `/health` (GET)
  - Eager browser launch via `startBrowser()` at startup
  - `MAX_RENDERS=2` concurrency gate — 3rd concurrent request returns 429
  - `/health` returns 503 until `browserReady=true`, then 200
  - Graceful SIGTERM: sets `shuttingDown` flag, waits up to 30s for active renders, then `browser.close() + process.exit(0)`
  - Structured JSON logging to stdout: `{ url, widthMm, heightMm, durationMs, status }`
  - PDF dimensions: `width: widthMm + 'mm'`, scale: 2, 3mm margins, `printBackground: true`
  - Viewport: `widthMm * MM_TO_PX * CSS_SCALE` where MM_TO_PX=96/25.4, CSS_SCALE=3
- **Dockerfile**: Multi-stage build from `ghcr.io/puppeteer/puppeteer:latest`
- **railway.toml**: DOCKERFILE builder, /health healthcheck, ALWAYS restart policy
- **docker-compose.yml**: Local dev on port 3001 with PDF_SERVICE_SECRET=dev-secret

### Task 3: Application Wiring (TDD GREEN)

**src/lib/feature-gate.ts** — Added `canExportPdf()` to FeatureGate interface and StripeFeatureGate:
- GOLD/PLATINUM: `{ allowed: true }`
- FREE: `{ allowed: false, reason: 'Gold tier required' }`
- Delegates to `this.getUserTier()` — no tier logic duplication

**src/lib/services/pdf.service.ts** — New service:
- `renderPdf(liveUrl, size)` — POST to `$PDF_SERVICE_URL/render` with `X-PDF-Secret` auth header
- card: 100x150mm, pliant: 148x200mm
- 55s AbortSignal timeout, 429→RATE_LIMITED, 5xx→RENDER_FAILED
- Returns `Buffer.from(await res.arrayBuffer())`

**src/app/api/export/pdf/[id]/route.ts** — Next.js POST handler:
- `maxDuration = 60` for serverless function timeout
- Auth (401) → ownership check (404) → feature gate (403) → renderPdf → stream
- Romanian error messages: "Serverul este ocupat" (429), "Generarea PDF a esuat" (500)
- Filename: `slugify(title, { lower: true, strict: true })-{size}.pdf`
- Returns `new NextResponse(new Uint8Array(buffer), ...)` for BodyInit compatibility

## Test Results

```
Test Files  15 passed (15)
Tests       81 passed | 7 todo (88)
```

All existing tests continued to pass. New tests for canExportPdf and PDF export route pass green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Buffer not assignable to NextResponse BodyInit**
- **Found during:** Task 3 (TypeScript check)
- **Issue:** `new NextResponse(buffer, ...)` fails because `Buffer<ArrayBufferLike>` is not assignable to `BodyInit`
- **Fix:** Wrapped buffer in `new Uint8Array(buffer)` before passing to NextResponse
- **Files modified:** `src/app/api/export/pdf/[id]/route.ts`
- **Commit:** 07752c6

**2. [Rule 2 - Missing] Integration test missing vitest globals reference**
- **Found during:** Task 3 (TypeScript check)
- **Issue:** Integration test file at `tests/integration/` is outside vitest include path (`tests/unit/`), so TypeScript tsc doesn't know about vitest globals
- **Fix:** Added `/// <reference types="vitest/globals" />` directive at top of file
- **Files modified:** `tests/integration/pdf-service.test.ts`
- **Commit:** 07752c6

**3. [Rule 3 - Improvement] Test type assertions required `as unknown as` pattern**
- **Found during:** Task 3 (TypeScript check)
- **Issue:** Mock type casting in pdf-export.test.ts used direct `as ReturnType<typeof vi.fn>` like older tests — TypeScript requires `as unknown as` double-cast for incompatible types
- **Fix:** Updated all mock type assertions to use `as unknown as` pattern
- **Files modified:** `tests/unit/pdf-export.test.ts`
- **Commit:** 07752c6

## Self-Check

### Files created/exist:
- services/pdf-renderer/src/index.ts: FOUND
- services/pdf-renderer/Dockerfile: FOUND
- services/pdf-renderer/railway.toml: FOUND
- services/pdf-renderer/docker-compose.yml: FOUND
- src/lib/services/pdf.service.ts: FOUND
- src/app/api/export/pdf/[id]/route.ts: FOUND
- tests/unit/pdf-export.test.ts: FOUND
- tests/integration/pdf-service.test.ts: FOUND

### Commits:
- da3d97f: test(03-01): add failing Wave 0 test stubs for PDF feature
- 854d4e7: feat(03-01): add Railway PDF microservice (pdf-renderer)
- 07752c6: feat(03-01): extend FeatureGate, add pdf.service.ts, and create PDF export route

## Self-Check: PASSED
