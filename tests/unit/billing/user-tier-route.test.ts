import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

// --- Imports after mocks ---

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { GET } from "@/app/api/user/tier/route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockDb = db as { select: ReturnType<typeof vi.fn> };

describe("GET /api/user/tier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns { tier: 'GOLD' } when user is GOLD", async () => {
    mockAuth.mockResolvedValue({ userId: "user_gold" });

    const mockWhere = vi.fn().mockResolvedValue([{ tier: "GOLD" }]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    mockDb.select.mockReturnValue({ from: mockFrom });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.tier).toBe("GOLD");
  });
});
