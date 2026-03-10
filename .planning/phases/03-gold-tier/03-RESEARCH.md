# Phase 3: Gold Tier - Research

**Researched:** 2026-03-10
**Domain:** Puppeteer PDF generation, Railway microservice deployment, QR code overlay, Next.js feature-gating
**Confidence:** HIGH (core stack decisions), MEDIUM (viewport math), HIGH (Railway config, qrcode.react)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- PDF sizes: Card 100x150mm, Pliant 148x200mm (portrait only, 3mm white margins on all sides)
- Platform: Railway (hobby plan, cold start acceptable)
- Service location: /services/pdf-renderer in monorepo
- Base image: ghcr.io/puppeteer/puppeteer
- Chromium: puppeteer-core + @sparticuz/chromium
- Framework: Express.js, TypeScript, compiled with tsc
- Concurrency: Max 2 renders, 3rd request -> 429
- Auth: X-PDF-Secret header checked against PDF_SERVICE_SECRET env var
- QR: qrcode.react, ?print=true trigger, bottom-center of photo area
- Scale factor: 3.125
- Browser strategy: Single persistent browser instance on startup; new page per request
- Chrome args: --no-sandbox, --disable-setuid-sandbox (hardcoded)
- Puppeteer wait: networkidle0 + document.fonts.ready
- Next.js route: POST /api/export/pdf/[id]?size=card|pliant
- Service API: POST /render + GET /health
- Logging: Structured JSON to stdout

### Claude's Discretion
- Exact Puppeteer page viewport width when rendering (matching mm dimensions vs. device-pixel approach)
- QR code border-radius value for the white background
- Exact bottom-center positioning offset from the photo container edge
- Dockerfile multi-stage build details
- railway.toml exact builder configuration syntax

### Deferred Ideas (OUT OF SCOPE)
- QR code as a separate downloadable (PNG/SVG)
- Landscape PDF orientation
- PDF stored in Vercel Blob for re-download
- Puppeteer browser pool (multiple instances)
- Prometheus /metrics endpoint
- Rate limiting on Next.js PDF route
- Custom PDF metadata (author, title)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| Gold tier: PDF print export in standard sizes | Gold user downloads a print-ready PDF (Card 100x150mm or Pliant 148x200mm) with QR code overlay, pixel-faithful to browser view, generated via dedicated Puppeteer service on Railway | Covered by: Puppeteer PDF options, Railway deployment, @sparticuz/chromium stack, qrcode.react overlay, Next.js API route pattern |
</phase_requirements>

---

## Summary

Phase 3 introduces a headless-Chromium PDF rendering microservice hosted on Railway. The service navigates to the live Vercel invitation URL (appended with `?print=true`), waits for fonts and images to fully load, then uses `page.pdf()` with explicit `width`/`height` in mm and a `scale` parameter to produce a print-shop-quality file. The Next.js main app calls this service via a new `POST /api/export/pdf/[id]` route, streams the PDF bytes directly to the browser, and gates access behind `canExportPdf()` in `FeatureGate`.

The QR code is handled entirely in the browser: templates check `?print=true` via `useSearchParams` (wrapped in Suspense) and conditionally render a `qrcode.react` `QRCodeSVG` component positioned absolutely at the bottom-center of the photo area. Puppeteer captures this since it navigates to the full live URL with `?print=true`.

**Primary recommendation:** Use `page.pdf({ width: '100mm', height: '150mm', scale: 3.125, printBackground: true, margin: { top: '3mm', right: '3mm', bottom: '3mm', left: '3mm' } })` with viewport set to the CSS pixel equivalent of the target physical width (100mm at 96 dpi = 378px). The `scale` parameter (range 0.1-2) conflicts with the locked 3.125 value — see Viewport Math section for the correct approach.

---

## Standard Stack

### Core (PDF Microservice)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| puppeteer-core | ^24.x (latest ~24.31) | Headless Chrome control | Lightweight, no bundled Chrome |
| @sparticuz/chromium | ^131.x | Chromium binary for serverless/containers | Optimized for constrained environments |
| express | ^4.x | HTTP server | Minimal, well-tested |
| typescript | ^5.x | Type safety | Consistent with main app |

### Core (Next.js additions)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| qrcode.react | ^4.x | QR code SVG rendering | Already decided; React component, SVG output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| slugify | ^1.x | Filename generation from invitation title | Needed for `{title-slug}-{size}.pdf` filename |
| @types/express | ^4.x | Express TypeScript types | Dev dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @sparticuz/chromium | ghcr.io built-in Chrome | Built-in Chrome is available in the base image; @sparticuz/chromium is needed only for serverless (Lambda/Render) — on Railway with a real container, the base image's Chrome is sufficient and simpler |
| Express | Fastify | Express chosen; no change |
| page.pdf scale | deviceScaleFactor in setViewport | deviceScaleFactor is confirmed ignored in PDF generation (GitHub issue #4043) — scale in page.pdf() is the only working lever |

**IMPORTANT — @sparticuz/chromium vs base image Chrome:**
The `ghcr.io/puppeteer/puppeteer` base image already bundles Chrome for Testing. On Railway (a real container, not Lambda), using the bundled Chrome directly with `puppeteer-core` is simpler and avoids the @sparticuz/chromium binary extraction overhead. However, CONTEXT.md locks `@sparticuz/chromium`. Both approaches work; the key difference is `executablePath`: with the base image Chrome, use `process.env.PUPPETEER_EXECUTABLE_PATH` or let puppeteer-core auto-detect; with @sparticuz/chromium, use `await chromium.executablePath()`.

**Version compatibility matrix (verified 2026-03-10):**
- `puppeteer-core@24.x` targets Chromium 131.x
- `@sparticuz/chromium@131.x` matches Chromium 131
- Node 20 LTS is required by @sparticuz/chromium

**Installation (PDF service):**
```bash
npm install puppeteer-core @sparticuz/chromium express
npm install -D typescript @types/express @types/node ts-node
```

**Installation (Next.js app):**
```bash
pnpm add qrcode.react
pnpm add -D @types/qrcode.react   # may not be needed — qrcode.react v4 ships types
```

---

## Architecture Patterns

### Recommended Project Structure

```
services/
└── pdf-renderer/
    ├── Dockerfile
    ├── railway.toml
    ├── docker-compose.yml        # local dev
    ├── package.json
    ├── tsconfig.json
    └── src/
        └── index.ts              # Express app, browser singleton, /render + /health

src/
├── app/
│   └── api/
│       └── export/
│           └── pdf/
│               └── [id]/
│                   └── route.ts  # Next.js PDF export route
├── components/
│   └── editor/
│       └── EditorLockedFeatures.tsx  # PdfExportButton extended in-place
│       └── EditorLayout.tsx          # isLive state + onPublished wiring
│       └── PublishProgress.tsx       # onPublished callback added
├── lib/
│   ├── feature-gate.ts               # canExportPdf() method added
│   └── services/
│       └── pdf.service.ts            # Railway HTTP call abstraction
└── components/
    └── templates/
        ├── MinimalWedding1.tsx        # QR overlay added (same for all 6)
        └── ... (5 more templates)
```

### Pattern 1: Puppeteer Viewport Math for mm PDFs

**What:** `page.pdf()` accepts `width` and `height` in mm strings directly (e.g., `'100mm'`, `'150mm'`). The PDF output page size is controlled by these parameters. The `scale` parameter in `page.pdf()` (range: 0.1 to 2) scales the rendered page content — it is the only working quality lever for PDFs (deviceScaleFactor in setViewport is confirmed ignored for PDF output).

**Critical constraint:** `scale` maximum is 2.0. The locked value of 3.125 CANNOT be passed as `scale` directly.

**Recommended resolution (Claude's Discretion):**
- Set viewport width to the mm target converted to CSS pixels at 96 dpi, multiplied by 3.125: Card = (100/25.4 * 96) * 3.125 = ~1181px; Pliant = (148/25.4 * 96) * 3.125 = ~1748px
- Set `scale: 2` (the maximum allowed) in `page.pdf()` — this gives the best sharpness Puppeteer's PDF engine allows
- The PDF output dimensions are controlled by `width: '100mm', height: '150mm'` in `page.pdf()` — these are independent of viewport
- The scale factor of 3.125 is best interpreted as a viewport pixel density multiplier, not a PDF scale value

**Practical approach:**
```typescript
// Source: pptr.dev/api/puppeteer.pdfoptions + GitHub #1057 + #4043
const MM_TO_PX_AT_96DPI = 96 / 25.4;  // = 3.7795
const CSS_SCALE = 3;  // viewport multiplier for layout quality (use 3, not 3.125 — integer is safer)

await page.setViewport({
  width: Math.round(widthMm * MM_TO_PX_AT_96DPI * CSS_SCALE),
  height: Math.round(heightMm * MM_TO_PX_AT_96DPI * CSS_SCALE),
  deviceScaleFactor: 1,  // intentionally 1 — has no effect on PDFs
});

const pdfBuffer = await page.pdf({
  width: `${widthMm}mm`,
  height: `${heightMm}mm`,
  scale: 2,  // max allowed; improves image/text sharpness in PDF
  printBackground: true,
  margin: {
    top: `${marginMm}mm`,
    right: `${marginMm}mm`,
    bottom: `${marginMm}mm`,
    left: `${marginMm}mm`,
  },
});
```

**Why the viewport width matters:** When page.pdf() renders, it uses the viewport width as the CSS layout width. If viewport is too narrow, the invitation template (which uses `min-h-screen w-full`) will render too small and get scaled up, losing quality. Setting viewport proportional to the physical output size ensures the CSS layout fills the page correctly.

**Known size precision issue:** Puppeteer PDF dimensions may be off by ~0.2mm due to CSS px/pt rounding (96dpi vs 72pt). For print-shop purposes (3mm margin already included), this is acceptable.

### Pattern 2: Browser Singleton + Per-Request Page

**What:** Launch one browser at startup; create a new page for each render request; close the page after render. The browser persists across requests.

**When to use:** Always for this service — reduces cold-start overhead from ~3s to ~0.3s per render after initial launch.

```typescript
// Source: puppeteer docs + @sparticuz/chromium README
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser) return browser;
  browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox', ...chromium.args],
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  return browser;
}
```

**Graceful shutdown:**
```typescript
process.on('SIGTERM', async () => {
  // Stop new requests (set a flag), wait for in-flight renders, then close
  server.close();
  if (browser) await browser.close();
  process.exit(0);
});
```

### Pattern 3: Concurrency Gate (Semaphore)

**What:** Track active render count; reject with 429 when at max.

```typescript
let activeRenders = 0;
const MAX_RENDERS = 2;

app.post('/render', async (req, res) => {
  if (activeRenders >= MAX_RENDERS) {
    return res.status(429).json({ error: 'Too many concurrent renders', code: 'RATE_LIMITED' });
  }
  activeRenders++;
  try {
    // ... render
  } finally {
    activeRenders--;
  }
});
```

### Pattern 4: QR Overlay in Templates

**What:** Each template checks `?print=true` via `useSearchParams` and renders a `QRCodeSVG` absolutely positioned at the bottom-center of the photo container div.

**Key insight from template code:** Every template has a photo area with `className="w-full relative"` and `style={{ aspectRatio: "16/9" }}` (or `"4/3"`). The QR overlay sits inside this relative container.

**Implementation per template:**
```tsx
// Source: qrcode.react v4 README + Next.js useSearchParams docs
"use client";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { QRCodeSVG } from 'qrcode.react';

function QROverlay() {
  const searchParams = useSearchParams();
  const isPrint = searchParams.get('print') === 'true';
  if (!isPrint) return null;

  // Derive canonical URL by stripping ?print=true
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : '';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '8px',         // ~2mm offset from bottom edge of photo
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'white',
        borderRadius: '6px',   // ~1.5mm at 96dpi — visually comfortable
        padding: '6px',        // ~1.5mm padding
        display: 'inline-flex',
        zIndex: 10,
      }}
    >
      <QRCodeSVG
        value={url}
        size={57}              // ~15mm at 96dpi: 15 * 3.7795 = ~57px
        level="M"              // Medium error correction — good for printed QR
        bgColor="#ffffff"
        fgColor="#000000"
        marginSize={0}         // Container padding handles visual margin
      />
    </div>
  );
}

// In the photo div (which is already `relative`):
// <div className="w-full relative" style={{ aspectRatio: "16/9", ... }}>
//   <Image ... />
//   <Suspense fallback={null}>
//     <QROverlay />
//   </Suspense>
// </div>
```

**Suspense is mandatory:** `useSearchParams()` in Next.js App Router requires a Suspense boundary or the build will fail with "Missing Suspense boundary with useSearchParams".

**The QR size in print:** At viewport width ~1181px for a 100mm card, 57px viewport ≈ 57/1181 * 100mm ≈ 4.8mm — too small. At the effective scale, QR rendered at `size={Math.round(15 * MM_TO_PX_AT_96DPI * CSS_SCALE)}` (≈ 170px) renders ~15mm in the printed PDF. Use dynamic size calculated from the template's viewport, or use a fixed px size and calibrate against the Card size (worst case for space).

**Corrected size calculation for print:**
- Card: 100mm wide, viewport ≈ 1134px (100 * 3.7795 * 3)
- 15mm QR = 15/100 * 1134px ≈ 170px
- Use `size={170}` — renders ~15mm in Card PDF, proportionally in Pliant

### Pattern 5: Railway Deployment (Dockerfile + Monorepo)

**What:** A `railway.toml` in `/services/pdf-renderer` specifying a Dockerfile builder. Root directory is set to `/services/pdf-renderer` in Railway UI or via `rootDirectory` in railway.toml (UI preferred for monorepo).

**Verified railway.toml syntax (HIGH confidence — Railway official docs):**
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 60
restartPolicyType = "ALWAYS"
```

**Root directory:** Railway docs state the config file path must be absolute (`/services/pdf-renderer/railway.toml`). Set Root Directory in Railway dashboard to `/services/pdf-renderer` — this scopes all build/deploy commands to that subdirectory. Alternatively set via `RAILWAY_ROOT_DIRECTORY` env var.

**Watch paths:** Use Railway's watchPaths to only redeploy when `/services/pdf-renderer/**` changes.

### Pattern 6: Next.js PDF Export Route

**What:** Extends the existing `publish/[id]/route.ts` pattern exactly.

```typescript
// Source: existing src/app/api/publish/[id]/route.ts pattern
// File: src/app/api/export/pdf/[id]/route.ts

export const maxDuration = 60;  // Next.js Vercel function timeout

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const size = searchParams.get('size') === 'pliant' ? 'pliant' : 'card';

  // Ownership check
  const [invitation] = await db.select().from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.userId, userId)));
  if (!invitation) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Feature gate
  const { allowed } = await featureGate.canExportPdf(userId);
  if (!allowed) return NextResponse.json({ error: 'Gold tier required' }, { status: 403 });

  // Call PDF service
  const pdfBuffer = await pdfService.render(invitation.liveUrl!, size);
  // pdfService handles 429/500 and re-throws with appropriate error codes

  const slug = slugify(invitation.title ?? 'invitatie', { lower: true, strict: true });
  const filename = `${slug}-${size}.pdf`;

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(pdfBuffer.byteLength),
    },
  });
}
```

### Pattern 7: PDF Service Abstraction

**What:** `src/lib/services/pdf.service.ts` encapsulates the Railway HTTP call, following the billing.service.ts pattern.

```typescript
// Source: existing src/lib/services/billing.service.ts pattern
type PdfSize = 'card' | 'pliant';

const SIZE_DIMENSIONS: Record<PdfSize, { widthMm: number; heightMm: number }> = {
  card: { widthMm: 100, heightMm: 150 },
  pliant: { widthMm: 148, heightMm: 200 },
};

export async function renderPdf(liveUrl: string, size: PdfSize): Promise<Buffer> {
  const { widthMm, heightMm } = SIZE_DIMENSIONS[size];
  const res = await fetch(`${process.env.PDF_SERVICE_URL}/render`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PDF-Secret': process.env.PDF_SERVICE_SECRET ?? '',
    },
    body: JSON.stringify({ url: `${liveUrl}?print=true`, widthMm, heightMm }),
    signal: AbortSignal.timeout(55_000),  // slightly under Next.js 60s maxDuration
  });

  if (res.status === 429) throw new PdfServiceError('RATE_LIMITED', 429);
  if (!res.ok) throw new PdfServiceError('RENDER_FAILED', res.status);

  return Buffer.from(await res.arrayBuffer());
}
```

### Pattern 8: Express Streaming PDF Response

**What:** Return PDF buffer directly with correct headers. `res.end(buffer)` is correct for Buffer objects.

```typescript
// Source: Node.js http docs + Express res.end() docs
res.set({
  'Content-Type': 'application/pdf',
  'Content-Length': buffer.length,
});
res.status(200).end(buffer);
```

Do NOT use `res.send()` for binary — it may set incorrect Content-Type. Do NOT use streams unless you need true streaming (not needed here since the full buffer is in memory).

### Pattern 9: EditorLayout isLive Wiring

**What:** The editor page server component fetches `tier` and passes it down. `EditorLayout` gets `tier` + `isLive` as new props.

**Current state:** `EditorPage` does NOT pass `tier` to `EditorLayout`. `PdfExportButton` exists in `EditorLockedFeatures.tsx` but is not rendered anywhere — `FieldSidebar` renders `PublishButton` but not `PdfExportButton`. The `FieldSidebar` needs to receive and render the PDF export section.

**Change chain:**
1. `EditorPage` (server component): fetch `tier` via `featureGate.getUserTier(userId)`, pass `invitation.status` and `tier` to `EditorLayout`
2. `EditorLayout`: add `tier: Tier` and initial `isLive: boolean` to props; add `useState<boolean>` for `isLive`; pass `onPublished` to `PublishButton`/`FieldSidebar`
3. `PublishButton` + `PublishProgress`: add `onPublished?: () => void` prop; `PublishProgress` calls it when `stage === 'live'`
4. `FieldSidebar`: add `tier`, `invitationId`, `isLive`, `onPublished` props; render `PdfExportButton` in sticky bottom section
5. `PdfExportButton`: extend with size selector, real export logic, loading/error states

**Note:** `FieldSidebar` is the correct home for PdfExportButton since it's in the sticky bottom section alongside `PublishButton`. `EditorLayout` passes tier down through FieldSidebar.

### Anti-Patterns to Avoid

- **Do NOT pass `scale: 3.125` to `page.pdf()`** — max allowed is 2.0; will throw or clamp silently
- **Do NOT use `deviceScaleFactor` expecting PDF improvement** — confirmed ignored by Chromium's PDF engine (GitHub issue #4043)
- **Do NOT skip `await page.evaluate(() => document.fonts.ready)`** — Puppeteer's `networkidle0` does not guarantee Google Fonts are applied to the DOM; without this wait, fonts may render as fallback
- **Do NOT render `useSearchParams` without Suspense** — Next.js App Router build will fail
- **Do NOT call `browser.close()` after each render** — defeats the singleton pattern; only close the `page`
- **Do NOT use `res.send()` for PDF buffer in Express** — may add charset header; use `res.end(buffer)` after setting Content-Type
- **Do NOT assume `@sparticuz/chromium` and bundled base image Chrome coexist cleanly** — when using `@sparticuz/chromium`, set `executablePath: await chromium.executablePath()` explicitly to override auto-detection of the base image's Chrome

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| QR code generation | Custom SVG/canvas QR encoder | qrcode.react QRCodeSVG | Reed-Solomon error correction, module sizing, quiet zone — dozens of edge cases |
| Chromium binary in Docker | Manual Chromium install + deps | ghcr.io/puppeteer/puppeteer base image | Font rendering deps, sandbox config, user permissions all pre-configured |
| PDF page size math | Custom mm-to-pt conversion | page.pdf({ width: '100mm' }) | Puppeteer accepts mm strings directly |
| Filename slugification | Manual replace chains | slugify | Unicode, special chars, edge cases |
| HTTP abort on timeout | Manual timer + controller | AbortSignal.timeout(55_000) | Single-line, handles cleanup automatically |

**Key insight:** The Chromium environment setup (fonts, sandbox, shared libs) is the hardest part of Puppeteer in containers. The official Docker image eliminates this entirely.

---

## Common Pitfalls

### Pitfall 1: scale > 2 throws or silently clamps
**What goes wrong:** Passing `scale: 3.125` to `page.pdf()` — the API enforces 0.1–2.0 range. It may throw `Error: Scale must be between 0.1 and 2` or silently clamp to 2.0 depending on Chromium version.
**Why it happens:** The locked scale factor of 3.125 was likely intended as a viewport CSS pixel multiplier, not a `page.pdf()` scale value.
**How to avoid:** Use scale factor as viewport width multiplier (see Pattern 1). Use `scale: 2` in `page.pdf()`.
**Warning signs:** PDF content appears cut off or unexpectedly sized.

### Pitfall 2: Fonts not loaded at screenshot time
**What goes wrong:** Google Fonts CDN responds but browser hasn't applied them to DOM when `networkidle0` fires. PDF renders with fallback serif/sans.
**Why it happens:** `networkidle0` triggers when no network requests for 500ms — font CSS is loaded but `FontFace.load()` may still be pending.
**How to avoid:** Add `await page.evaluate(() => document.fonts.ready)` after `networkidle0`.
**Warning signs:** PDF shows generic serif where Playfair Display / Cormorant Garamond should appear.

### Pitfall 3: ?print=true QR missing — Suspense not added
**What goes wrong:** Build fails with "Missing Suspense boundary with useSearchParams" error. Or during static prerender, QR is missing because `useSearchParams` returns null server-side.
**Why it happens:** `useSearchParams()` is a client-only hook in Next.js App Router.
**How to avoid:** Wrap `QROverlay` component in `<Suspense fallback={null}>` at every usage site.
**Warning signs:** `next build` error; or QR appears in dev but not in deployed version.

### Pitfall 4: Railway cold start + Puppeteer launch timeout
**What goes wrong:** First request after cold start hits Railway before browser is launched; browser launch takes 3-5s; request times out.
**Why it happens:** Railway hobby plan has cold starts. Browser is launched lazily on first request.
**How to avoid:** Launch browser eagerly at service startup (not lazily on first request). Add `/health` endpoint that returns 200 only after browser is ready.
**Warning signs:** Occasional 502/504 on first PDF request after idle period.

### Pitfall 5: @sparticuz/chromium + base image Chrome conflict
**What goes wrong:** `chromium.executablePath()` returns a path to extracted binary; if the base image Chrome is on PATH, puppeteer-core may use the wrong one.
**Why it happens:** `ghcr.io/puppeteer/puppeteer` base image sets `PUPPETEER_EXECUTABLE_PATH` env var pointing to its bundled Chrome. `@sparticuz/chromium.executablePath()` returns a different path. If not explicitly passed, puppeteer-core may use either.
**How to avoid:** Always pass `executablePath: await chromium.executablePath()` explicitly in `puppeteer.launch()`. Alternatively, skip @sparticuz/chromium entirely and use `process.env.PUPPETEER_EXECUTABLE_PATH` which the base image sets correctly. Either is valid.
**Warning signs:** "Could not find Chrome" errors; wrong Chrome version launched.

### Pitfall 6: EditorPage missing tier fetch
**What goes wrong:** `EditorLayout` needs `tier` but `EditorPage` (server component) doesn't currently fetch it from DB — it only fetches the invitation row.
**Why it happens:** Tier was added in Phase 2 but the editor page wasn't updated since PdfExportButton was a Phase 3 placeholder.
**How to avoid:** In `EditorPage`, add `await featureGate.getUserTier(userId)` and pass `tier` as a prop to `EditorLayout`. The `featureGate` singleton is already available.
**Warning signs:** TypeScript error on `EditorLayout` tier prop; or PdfExportButton always shows FREE-locked state.

### Pitfall 7: PdfExportButton not rendered anywhere
**What goes wrong:** `PdfExportButton` exists in `EditorLockedFeatures.tsx` but is not imported/rendered by `FieldSidebar` or `EditorLayout` currently.
**Why it happens:** Phase 2 created the component as a placeholder but didn't wire it into the sidebar.
**How to avoid:** Add import and render of `PdfExportButton` in `FieldSidebar`'s sticky bottom section, alongside `PublishButton`. Also add `WhatsAppSection` here.
**Warning signs:** PDF export button never appears in the editor despite correct implementation.

### Pitfall 8: QR size mismatch between viewport and printed output
**What goes wrong:** QR code renders correctly in browser (small) but appears tiny in PDF because viewport pixels don't correspond 1:1 to printed mm.
**Why it happens:** The viewport is scaled up (multiplied by CSS_SCALE) so the template fills the PDF page. A `size={57}` QR (targeting 15mm naively at 96dpi) becomes tiny because it's relative to the upscaled viewport.
**How to avoid:** Calculate QR size in pixels as `Math.round(15 * (widthMm_target_viewport / 100))`. For Card (100mm), viewport width ~1134px: `15 * (1134/100) = ~170px`. Use `size={170}`.

---

## Code Examples

### Dockerfile (multi-stage, verified pattern)
```dockerfile
# Source: ghcr.io/puppeteer/puppeteer base image + official Puppeteer Docker guide
FROM ghcr.io/puppeteer/puppeteer:latest AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # tsc compiles to dist/

FROM ghcr.io/puppeteer/puppeteer:latest
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

### railway.toml (verified syntax)
```toml
# Source: docs.railway.com/reference/config-as-code
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "node dist/index.js"
healthcheckPath = "/health"
healthcheckTimeout = 60
restartPolicyType = "ALWAYS"
```

### @sparticuz/chromium basic usage
```typescript
// Source: github.com/Sparticuz/chromium README
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', ...chromium.args],
  executablePath: await chromium.executablePath(),
  headless: true,
});
```

### qrcode.react QRCodeSVG usage
```tsx
// Source: github.com/zpao/qrcode.react README (v4)
import { QRCodeSVG } from 'qrcode.react';

<QRCodeSVG
  value="https://example.com/invitatie/abc123"
  size={170}
  level="M"
  bgColor="#ffffff"
  fgColor="#000000"
  marginSize={0}
/>
```

### page.pdf() with mm dimensions
```typescript
// Source: pptr.dev/api/puppeteer.pdfoptions + verified by multiple community reports
const pdf = await page.pdf({
  width: '100mm',
  height: '150mm',
  scale: 2,             // max allowed; best sharpness
  printBackground: true,
  margin: {
    top: '3mm',
    right: '3mm',
    bottom: '3mm',
    left: '3mm',
  },
});
// Returns Buffer
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `format: 'A4'` in page.pdf | Explicit `width`/`height` in mm strings | Always supported | Direct mm control without format tables |
| `deviceScaleFactor` for PDF DPI | `scale` in page.pdf() (0.1–2.0) | Long-standing; deviceScaleFactor confirmed ignored | Must use scale <= 2, not deviceScaleFactor |
| Bundled puppeteer | puppeteer-core + external binary | puppeteer-core split ~2019 | Lighter installs; explicit binary control |
| `require('chromium')` | `@sparticuz/chromium` | ~2022 fork from `chrome-aws-lambda` | Better Node 20 support; serverless-first |
| qrcode.react default export | Named exports `QRCodeSVG`/`QRCodeCanvas` | v3.1+ | Default export deprecated in v4 |
| `includeMargin` prop (qrcode.react) | `marginSize` prop | v4 | Any margin size, not just 0/4 |

**Deprecated/outdated:**
- `format: 'Letter'`/`'A4'` format string: Still works but irrelevant for our custom sizes
- `puppeteer` (full package) in Docker: Works but installs ~300MB Chrome; use base image instead
- Default export from qrcode.react: `import QRCode from 'qrcode.react'` — deprecated, use `{ QRCodeSVG }`

---

## Open Questions

1. **scale: 3.125 vs scale: 2 — acceptable quality difference?**
   - What we know: Puppeteer PDF scale max is 2.0; 3.125 will fail or clamp
   - What's unclear: Whether scale=2 with large viewport (1134px) produces visually acceptable output for print shop use
   - Recommendation: Use scale=2 with CSS_SCALE=3 viewport multiplier. Test empirically on a real PDF export. If text is jagged, the PDF vectors (not rasters) should be fine regardless.

2. **Does ghcr.io/puppeteer/puppeteer base image conflict with @sparticuz/chromium?**
   - What we know: Base image sets PUPPETEER_EXECUTABLE_PATH; @sparticuz/chromium provides its own binary
   - What's unclear: Whether CONTEXT.md decision to use both was intentional (for serverless portability) or if using the base image Chrome directly is preferred
   - Recommendation: Use base image Chrome via `process.env.PUPPETEER_EXECUTABLE_PATH` unless there's a specific reason for @sparticuz/chromium on Railway containers. If @sparticuz/chromium is kept, always pass `executablePath` explicitly.

3. **railway.toml rootDirectory field**
   - What we know: Root directory can be set in Railway dashboard UI; railway.toml path must be absolute
   - What's unclear: Whether `rootDirectory` is a supported field in railway.toml schema or UI-only
   - Recommendation: Set root directory in Railway dashboard to `/services/pdf-renderer`; place `railway.toml` in that subdirectory; Railway will find it at the absolute path `/services/pdf-renderer/railway.toml`.

---

## Validation Architecture

nyquist_validation is enabled in config.json.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (already installed) |
| Config file | `vitest.config.ts` at repo root |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test:unit && pnpm test:e2e` |
| PDF service integration | Vitest with `TEST_INVITATION_URL` env var |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PDF-01 | canExportPdf returns true for GOLD | unit | `pnpm test:unit -- --reporter=verbose tests/unit/feature-gate.test.ts` | Partial (stubs only) — Wave 0 |
| PDF-02 | canExportPdf returns false for FREE | unit | `pnpm test:unit -- --reporter=verbose tests/unit/feature-gate.test.ts` | Partial — Wave 0 |
| PDF-03 | /api/export/pdf/[id] returns 401 without auth | unit | `pnpm test:unit -- tests/unit/pdf-export.test.ts` | ❌ Wave 0 |
| PDF-04 | /api/export/pdf/[id] returns 403 for FREE tier | unit | `pnpm test:unit -- tests/unit/pdf-export.test.ts` | ❌ Wave 0 |
| PDF-05 | /api/export/pdf/[id] returns 404 for wrong owner | unit | `pnpm test:unit -- tests/unit/pdf-export.test.ts` | ❌ Wave 0 |
| PDF-06 | /api/export/pdf/[id] forwards 429 from PDF service | unit | `pnpm test:unit -- tests/unit/pdf-export.test.ts` | ❌ Wave 0 |
| PDF-07 | PDF service /render returns buffer + application/pdf | integration | `TEST_INVITATION_URL=... pnpm test:unit -- tests/integration/pdf-service.test.ts` | ❌ Wave 0 |
| PDF-08 | PDF service returns 429 on 3rd concurrent request | integration | Same as above | ❌ Wave 0 |
| PDF-09 | PDF service /health returns 200 | integration | Same as above | ❌ Wave 0 |
| QR-01 | QROverlay renders when ?print=true | unit | `pnpm test:unit -- tests/unit/templates.test.tsx` | Partial — extend existing |
| QR-02 | QROverlay does not render without ?print=true | unit | Same as above | Partial — extend existing |

### Sampling Rate
- **Per task commit:** `pnpm test:unit`
- **Per wave merge:** `pnpm test:unit && pnpm test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/unit/feature-gate.test.ts` — implement existing stubs; add canExportPdf() tests for GOLD/PLATINUM/FREE
- [ ] `tests/unit/pdf-export.test.ts` — Next.js route unit tests (auth, ownership, gate, 429/500 forwarding) using MSW to mock PDF service
- [ ] `tests/integration/pdf-service.test.ts` — integration tests for Railway service requiring `TEST_INVITATION_URL` env var; start service in test setup
- [ ] `tests/unit/templates.test.tsx` — extend existing templates.test.tsx to cover QROverlay print/no-print behavior; needs `useSearchParams` mock
- [ ] Add `@types/node` for Buffer in pdf.service.ts — may already be present (check package.json devDeps; it is listed)

---

## Sources

### Primary (HIGH confidence)
- [pptr.dev/api/puppeteer.pdfoptions](https://pptr.dev/api/puppeteer.pdfoptions) — PDF options interface, scale range, margin format
- [pptr.dev/guides/docker](https://pptr.dev/guides/docker) — ghcr.io/puppeteer/puppeteer image details
- [docs.railway.com/reference/config-as-code](https://docs.railway.com/reference/config-as-code) — railway.toml schema: builder, dockerfilePath, healthcheckPath, startCommand
- [github.com/Sparticuz/chromium](https://github.com/Sparticuz/chromium) — @sparticuz/chromium usage, versioning schema, executablePath()
- [github.com/zpao/qrcode.react](https://github.com/zpao/qrcode.react) — QRCodeSVG props, v4 named exports
- [nextjs.org/docs/app/api-reference/functions/use-search-params](https://nextjs.org/docs/app/api-reference/functions/use-search-params) — Suspense boundary requirement

### Secondary (MEDIUM confidence)
- [github.com/puppeteer/puppeteer/issues/4043](https://github.com/puppeteer/puppeteer/issues/4043) — deviceScaleFactor confirmed ignored for PDFs
- [github.com/puppeteer/puppeteer/issues/1057](https://github.com/puppeteer/puppeteer/issues/1057) — DPI control limitations in Puppeteer PDFs
- [pptr.dev/chromium-support](https://pptr.dev/chromium-support/) — puppeteer version to Chromium version mapping

### Tertiary (LOW confidence — verify before use)
- Scale value of 3.125 as CSS viewport multiplier interpretation — derived from math (96dpi * scale = 300dpi equivalent), not from official docs
- @sparticuz/chromium v131 + puppeteer-core v24 pairing — inferred from version schema, not verified against release notes

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — puppeteer-core/express/qrcode.react are well-documented; version matrix verified via npm/GitHub
- Architecture: HIGH — all patterns follow existing project conventions; Railway toml syntax verified
- Viewport math: MEDIUM — PDF scale max of 2.0 verified; recommended calculation is derived math, needs empirical test
- Pitfalls: HIGH — most drawn from official GitHub issues with high engagement; confirmed not speculation
- Railway config: HIGH — official Railway docs confirm builder/dockerfilePath/healthcheckPath fields

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (30 days — @sparticuz/chromium releases frequently; verify version before install)
