import puppeteer, { Browser } from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import express, { Request, Response, NextFunction } from "express";
import http from "http";

// ── Types ──────────────────────────────────────────────────────────────────────

interface RenderRequest {
  url: string;
  widthMm: number;
  heightMm: number;
  scaleFactor?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PORT = 3001;
const MAX_RENDERS = 2;
const MM_TO_PX = 96 / 25.4;
const CSS_SCALE = 3;

// ── Browser singleton ─────────────────────────────────────────────────────────

let browser: Browser | null = null;
let browserReady = false;
let activeRenders = 0;
let shuttingDown = false;

// ── Startup: eager browser launch ────────────────────────────────────────────

export async function startBrowser(): Promise<void> {
  browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", ...chromium.args],
    executablePath: await chromium.executablePath(),
    headless: true,
  });
  browserReady = true;
  console.log(JSON.stringify({ event: "browser_ready" }));
}

// ── Auth middleware ───────────────────────────────────────────────────────────

function requireSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = process.env.PDF_SERVICE_SECRET;
  if (!secret) {
    // No secret configured — allow all (dev mode without env var)
    next();
    return;
  }
  const provided = req.headers["x-pdf-secret"];
  if (provided !== secret) {
    res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    return;
  }
  next();
}

// ── Express app ───────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// GET /health — ready only after browser is initialised
app.get("/health", (_req: Request, res: Response) => {
  if (browserReady) {
    res.status(200).json({ status: "ok" });
  } else {
    res.status(503).json({ status: "starting" });
  }
});

// POST /render
app.post("/render", requireSecret, async (req: Request, res: Response) => {
  if (shuttingDown) {
    res.status(503).json({ error: "Service shutting down", code: "SHUTTING_DOWN" });
    return;
  }

  const { url, widthMm, heightMm } = req.body as RenderRequest;

  // Validate required fields
  if (!url || widthMm == null || heightMm == null) {
    res.status(400).json({ error: "url, widthMm, and heightMm are required", code: "BAD_REQUEST" });
    return;
  }

  // Concurrency gate
  if (activeRenders >= MAX_RENDERS) {
    res.status(429).json({ error: "Too many concurrent renders", code: "RATE_LIMITED" });
    return;
  }

  activeRenders++;
  const start = Date.now();
  let page: Awaited<ReturnType<Browser["newPage"]>> | null = null;

  try {
    page = await browser!.newPage();

    // Set viewport: physical pixel size = mm * px/mm * CSS_SCALE
    await page.setViewport({
      width: Math.round(widthMm * MM_TO_PX * CSS_SCALE),
      height: Math.round(heightMm * MM_TO_PX * CSS_SCALE),
      deviceScaleFactor: 1,
    });

    // Navigate and wait for network idle
    await page.goto(url, { waitUntil: "networkidle0", timeout: 45_000 });

    // Wait for web fonts to load
    await page.evaluate(() => document.fonts.ready);

    // Generate PDF at physical print dimensions
    const buffer = await page.pdf({
      width: widthMm + "mm",
      height: heightMm + "mm",
      scale: 2,
      printBackground: true,
      margin: { top: "3mm", right: "3mm", bottom: "3mm", left: "3mm" },
    });

    const durationMs = Date.now() - start;
    console.log(JSON.stringify({ url, widthMm, heightMm, durationMs, status: 200 }));

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", String(buffer.byteLength));
    res.status(200).end(buffer);
  } catch (err) {
    const durationMs = Date.now() - start;
    console.error(JSON.stringify({ url, widthMm, heightMm, durationMs, status: 500, error: String(err) }));
    res.status(500).json({ error: "Render failed", code: "RENDER_FAILED" });
  } finally {
    activeRenders--;
    if (page) {
      await page.close().catch(() => {
        // ignore close errors
      });
    }
  }
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────

function gracefulShutdown(server: http.Server): void {
  console.log(JSON.stringify({ event: "shutdown_initiated" }));
  shuttingDown = true;

  const MAX_WAIT_MS = 30_000;
  const CHECK_INTERVAL_MS = 200;
  let elapsed = 0;

  const waitForRenders = setInterval(async () => {
    elapsed += CHECK_INTERVAL_MS;
    if (activeRenders === 0 || elapsed >= MAX_WAIT_MS) {
      clearInterval(waitForRenders);
      server.close(async () => {
        if (browser) {
          await browser.close().catch(() => {
            // ignore
          });
        }
        console.log(JSON.stringify({ event: "shutdown_complete" }));
        process.exit(0);
      });
    }
  }, CHECK_INTERVAL_MS);
}

// ── Server startup ────────────────────────────────────────────────────────────

const server = app.listen(PORT, () => {
  console.log(JSON.stringify({ event: "server_started", port: PORT }));
});

process.on("SIGTERM", () => gracefulShutdown(server));

startBrowser().catch((err) => {
  console.error("Browser launch failed", err);
  process.exit(1);
});

export { app };
