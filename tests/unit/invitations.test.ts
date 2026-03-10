/**
 * Invitations API route tests.
 * Tests the GET and POST handlers for /api/invitations.
 *
 * We test the handler logic directly by mocking its dependencies:
 * - @clerk/nextjs/server  → auth()
 * - @/lib/db             → db
 * - @/lib/feature-gate   → featureGate
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Module mocks (hoisted by vitest) ----------------------------------------

// Mock Clerk auth
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// Mock DB module — expose a controllable mock
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock feature gate
vi.mock("@/lib/feature-gate", () => ({
  featureGate: {
    canCreateDraft: vi.fn(),
  },
}));

// ---- Import after mocks -------------------------------------------------------
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { featureGate } from "@/lib/feature-gate";
import { GET, POST } from "@/app/api/invitations/route";

// ---- Helpers -----------------------------------------------------------------

function makeRequest(body?: unknown): Request {
  if (body !== undefined) {
    return new Request("http://localhost/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  return new Request("http://localhost/api/invitations");
}

// Build a chainable drizzle-like select mock that returns `rows`
function mockDbSelect(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue(rows),
  };
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

// Build a chainable drizzle-like insert mock that returns `rows`
function mockDbInsert(rows: unknown[]) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(rows),
  };
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

// ---- Tests -------------------------------------------------------------------

describe("GET /api/invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: null,
    });

    const res = await GET();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns empty invitations array for a new user", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user_123",
    });
    mockDbSelect([]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ invitations: [] });
  });

  it("returns user invitations with correct shape", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user_123",
    });
    const fakeInvitation = {
      id: "inv-uuid-1",
      templateId: "minimal-wedding-1",
      title: "Elena & Andrei",
      status: "DRAFT",
      liveUrl: null,
      updatedAt: new Date("2026-03-09T12:00:00Z"),
    };
    mockDbSelect([fakeInvitation]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.invitations).toHaveLength(1);
    expect(body.invitations[0]).toMatchObject({
      id: "inv-uuid-1",
      templateId: "minimal-wedding-1",
      title: "Elena & Andrei",
      status: "DRAFT",
    });
  });
});

describe("POST /api/invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: null,
    });

    const req = makeRequest({ templateId: "minimal-wedding-1" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user has reached the draft limit", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user_123",
    });
    (featureGate.canCreateDraft as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      reason: "Free tier: 3 drafts max",
    });

    const req = makeRequest({ templateId: "minimal-wedding-1" });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/3 drafts/i);
  });

  it("returns 400 when templateId is missing", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user_123",
    });
    (featureGate.canCreateDraft as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
    });

    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when templateId is not in registry", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user_123",
    });
    (featureGate.canCreateDraft as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
    });

    const req = makeRequest({ templateId: "non-existent-template" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 201 with invitation id and DRAFT status on success", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user_123",
    });
    (featureGate.canCreateDraft as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
    });
    mockDbInsert([{ id: "new-inv-uuid", status: "DRAFT" }]);

    const req = makeRequest({ templateId: "minimal-wedding-1" });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toEqual({
      invitation: { id: "new-inv-uuid", status: "DRAFT" },
    });
  });
});
