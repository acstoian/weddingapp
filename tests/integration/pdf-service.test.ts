/// <reference types="vitest/globals" />

/**
 * Integration tests for the Railway PDF microservice.
 *
 * These tests require:
 * 1. The PDF renderer service running on localhost:3001
 * 2. TEST_INVITATION_URL env var set to a live invitation URL
 * 3. PDF_SERVICE_SECRET env var set to match the service's secret
 *
 * Skip behavior: if TEST_INVITATION_URL is not set, the entire suite is skipped.
 */

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL ?? "http://localhost:3001";
const PDF_SERVICE_SECRET = process.env.PDF_SERVICE_SECRET ?? "dev-secret";
const TEST_INVITATION_URL = process.env.TEST_INVITATION_URL;

const skipIntegration = !TEST_INVITATION_URL;

async function isServiceRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${PDF_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

describe.skipIf(skipIntegration)("PDF Service integration", () => {
  beforeAll(async () => {
    const running = await isServiceRunning();
    if (!running) {
      console.warn(`[pdf-service.test] Service not reachable at ${PDF_SERVICE_URL}/health — skipping all tests`);
      // We can't skip dynamically in vitest afterAll, but the tests will fail with clear messages
    }
  });

  it("GET /health returns 200", async () => {
    const res = await fetch(`${PDF_SERVICE_URL}/health`);
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe("ok");
  });

  it("POST /render with valid URL returns non-empty buffer with Content-Type: application/pdf", async () => {
    const res = await fetch(`${PDF_SERVICE_URL}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PDF-Secret": PDF_SERVICE_SECRET,
      },
      body: JSON.stringify({
        url: TEST_INVITATION_URL,
        widthMm: 100,
        heightMm: 150,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  }, 65_000);

  it("POST /render with wrong X-PDF-Secret returns 401", async () => {
    const res = await fetch(`${PDF_SERVICE_URL}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PDF-Secret": "wrong-secret",
      },
      body: JSON.stringify({
        url: TEST_INVITATION_URL,
        widthMm: 100,
        heightMm: 150,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    expect(res.status).toBe(401);
  });

  it("POST /render: fire 3 concurrent requests, at least one returns 429", async () => {
    const makeRequest = () =>
      fetch(`${PDF_SERVICE_URL}/render`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PDF-Secret": PDF_SERVICE_SECRET,
        },
        body: JSON.stringify({
          url: TEST_INVITATION_URL,
          widthMm: 100,
          heightMm: 150,
        }),
        signal: AbortSignal.timeout(60_000),
      });

    const responses = await Promise.all([makeRequest(), makeRequest(), makeRequest()]);
    const statuses = responses.map((r) => r.status);
    const has429 = statuses.some((s) => s === 429);
    expect(has429).toBe(true);
  }, 65_000);
});
