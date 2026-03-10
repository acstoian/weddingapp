import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock DB
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// Mock drizzle-orm operators (no-ops for mocking)
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: "eq" })),
  and: vi.fn((...args: unknown[]) => ({ args, op: "and" })),
}));

// Mock feature gate
vi.mock("@/lib/feature-gate", () => ({
  featureGate: {
    canExportPdf: vi.fn(),
  },
}));

// Mock PDF service
vi.mock("@/lib/services/pdf.service", () => {
  class PdfServiceError extends Error {
    code: string;
    status: number;
    constructor(code: string, status: number) {
      super(code);
      this.code = code;
      this.status = status;
    }
  }
  return {
    renderPdf: vi.fn(),
    PdfServiceError,
  };
});

// Mock slugify
vi.mock("slugify", () => ({
  default: vi.fn((str: string) => str.toLowerCase().replace(/\s+/g, "-")),
}));

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { featureGate } from "@/lib/feature-gate";
import { renderPdf, PdfServiceError } from "@/lib/services/pdf.service";
import { POST } from "@/app/api/export/pdf/[id]/route";

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockDb = db as unknown as { select: ReturnType<typeof vi.fn> };
const mockFeatureGate = featureGate as unknown as { canExportPdf: ReturnType<typeof vi.fn> };
const mockRenderPdf = renderPdf as unknown as ReturnType<typeof vi.fn>;

function makeDbSelect(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  };
}

const fakeInvitation = {
  id: "test-id",
  userId: "user-123",
  title: "My Wedding",
  liveUrl: "https://invite.example.com",
  status: "LIVE",
};

describe("POST /api/export/pdf/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when auth() returns { userId: null }", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const req = new Request("http://localhost/api/export/pdf/test-id", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    expect(res.status).toBe(401);
  });

  it("returns 404 when invitation not found in DB", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });
    mockDb.select.mockReturnValue(makeDbSelect([]));
    const req = new Request("http://localhost/api/export/pdf/test-id", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    expect(res.status).toBe(404);
  });

  it("returns 403 when featureGate.canExportPdf returns { allowed: false }", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });
    mockDb.select.mockReturnValue(makeDbSelect([fakeInvitation]));
    mockFeatureGate.canExportPdf.mockResolvedValue({ allowed: false, reason: "Gold tier required" });
    const req = new Request("http://localhost/api/export/pdf/test-id", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    expect(res.status).toBe(403);
  });

  it("returns 429 when renderPdf throws PdfServiceError with code RATE_LIMITED", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });
    mockDb.select.mockReturnValue(makeDbSelect([fakeInvitation]));
    mockFeatureGate.canExportPdf.mockResolvedValue({ allowed: true });
    mockRenderPdf.mockRejectedValue(new PdfServiceError("RATE_LIMITED", 429));
    const req = new Request("http://localhost/api/export/pdf/test-id", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    expect(res.status).toBe(429);
  });

  it("returns 500 when renderPdf throws PdfServiceError with code RENDER_FAILED", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });
    mockDb.select.mockReturnValue(makeDbSelect([fakeInvitation]));
    mockFeatureGate.canExportPdf.mockResolvedValue({ allowed: true });
    mockRenderPdf.mockRejectedValue(new PdfServiceError("RENDER_FAILED", 500));
    const req = new Request("http://localhost/api/export/pdf/test-id", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    expect(res.status).toBe(500);
  });

  it("returns 200 with Content-Type: application/pdf on success", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });
    mockDb.select.mockReturnValue(makeDbSelect([fakeInvitation]));
    mockFeatureGate.canExportPdf.mockResolvedValue({ allowed: true });
    const fakeBuffer = Buffer.from("fake-pdf-bytes");
    mockRenderPdf.mockResolvedValue(fakeBuffer);
    const req = new Request("http://localhost/api/export/pdf/test-id", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
  });

  it("sets Content-Disposition attachment with slugified title and default size card", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });
    mockDb.select.mockReturnValue(makeDbSelect([fakeInvitation]));
    mockFeatureGate.canExportPdf.mockResolvedValue({ allowed: true });
    const fakeBuffer = Buffer.from("fake-pdf-bytes");
    mockRenderPdf.mockResolvedValue(fakeBuffer);
    const req = new Request("http://localhost/api/export/pdf/test-id", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("attachment");
    expect(disposition).toContain("-card.pdf");
  });

  it("uses pliant size when ?size=pliant query param is set", async () => {
    mockAuth.mockResolvedValue({ userId: "user-123" });
    mockDb.select.mockReturnValue(makeDbSelect([fakeInvitation]));
    mockFeatureGate.canExportPdf.mockResolvedValue({ allowed: true });
    const fakeBuffer = Buffer.from("fake-pdf-bytes");
    mockRenderPdf.mockResolvedValue(fakeBuffer);
    const req = new Request("http://localhost/api/export/pdf/test-id?size=pliant", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "test-id" }) });
    const disposition = res.headers.get("Content-Disposition");
    expect(disposition).toContain("-pliant.pdf");
  });
});
