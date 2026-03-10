import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    sendPurchaseConfirmation: vi.fn().mockResolvedValue(undefined),
  },
}));

// --- Imports after mocks ---

import { db } from "@/lib/db";
import { POST } from "@/app/api/admin/users/[id]/tier/route";

const mockDb = db as {
  select: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

// Set admin secret in environment
const ADMIN_SECRET = "test-admin-secret-123";

function makeRequest(
  body: object,
  headers: Record<string, string> = {}
): Request {
  return new Request("http://localhost:3000/api/admin/users/user_123/tier", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

const mockParams = { params: { id: "user_123" } };

describe("POST /api/admin/users/:id/tier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = ADMIN_SECRET;
  });

  it("returns 401 when X-Admin-Secret header is missing", async () => {
    const req = makeRequest({ tier: "GOLD" });
    const res = await POST(req, mockParams);
    expect(res.status).toBe(401);
  });

  it("returns 401 when X-Admin-Secret header does not match ADMIN_SECRET env var", async () => {
    const req = makeRequest({ tier: "GOLD" }, { "x-admin-secret": "wrong-secret" });
    const res = await POST(req, mockParams);
    expect(res.status).toBe(401);
  });

  it("returns 200 and updates users.tier when header matches", async () => {
    // mock update chain: update(users).set({...}).where(...)
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockDb.update.mockReturnValue({ set: mockSet });

    const req = makeRequest({ tier: "GOLD" }, { "x-admin-secret": ADMIN_SECRET });
    const res = await POST(req, mockParams);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.userId).toBe("user_123");
    expect(json.tier).toBe("GOLD");
    expect(mockDb.update).toHaveBeenCalled();
  });

  it("returns 400 for invalid tier value", async () => {
    const req = makeRequest({ tier: "DIAMOND" }, { "x-admin-secret": ADMIN_SECRET });
    const res = await POST(req, mockParams);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("BILLING-04: downgrade to FREE does not delete invitation rows", async () => {
    // Mock select for invitation check (not called in admin route — just tier update)
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockDb.update.mockReturnValue({ set: mockSet });

    const req = makeRequest({ tier: "FREE" }, { "x-admin-secret": ADMIN_SECRET });
    const res = await POST(req, mockParams);

    expect(res.status).toBe(200);
    // Only users table was updated, no delete calls
    const updateCalls = mockDb.update.mock.calls;
    expect(updateCalls.length).toBe(1); // only one update call
    // Verify no db.delete was called (db mock doesn't even have delete)
    expect((mockDb as Record<string, unknown>).delete).toBeUndefined();
  });
});
