import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

// --- Imports after mocks ---

import { db } from "@/lib/db";
import { StripeFeatureGate } from "@/lib/feature-gate";

const mockDb = db as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
};

/**
 * Helper: mock db.select to return a chain that resolves to a given value.
 * Usage: mockSelect([ { tier: "GOLD" } ]) — single call
 *
 * Since StripeFeatureGate calls db.select multiple times (once for tier, once
 * for count), we use mockReturnValueOnce chaining to control each call.
 */
function mockSelectOnce(result: unknown[]) {
  const mockFrom = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue(result),
  });
  mockDb.select.mockReturnValueOnce({ from: mockFrom });
}

function mockInsertOnce() {
  mockDb.insert.mockReturnValueOnce({
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    }),
  });
}

describe("StripeFeatureGate", () => {
  let gate: StripeFeatureGate;

  beforeEach(() => {
    vi.clearAllMocks();
    gate = new StripeFeatureGate();
  });

  describe("getUserTier", () => {
    it("returns FREE when user row does not exist (upsert creates it)", async () => {
      // insert (upsert) resolves
      mockInsertOnce();
      // select returns no row (user just created with default FREE)
      mockSelectOnce([{ tier: "FREE" }]);

      const tier = await gate.getUserTier("user_new");
      expect(tier).toBe("FREE");
    });

    it("returns GOLD when users.tier = GOLD", async () => {
      mockInsertOnce();
      mockSelectOnce([{ tier: "GOLD" }]);

      const tier = await gate.getUserTier("user_gold");
      expect(tier).toBe("GOLD");
    });
  });

  describe("canPublish", () => {
    it("returns { allowed: false } when FREE user already has 1 LIVE invitation", async () => {
      // getUserTier calls: insert + select(tier)
      mockInsertOnce();
      mockSelectOnce([{ tier: "FREE" }]);
      // canPublish count call
      mockSelectOnce([{ value: 1 }]);

      const result = await gate.canPublish("user_free");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/free tier/i);
    });

    it("returns { allowed: true } when FREE user has 0 LIVE invitations", async () => {
      mockInsertOnce();
      mockSelectOnce([{ tier: "FREE" }]);
      mockSelectOnce([{ value: 0 }]);

      const result = await gate.canPublish("user_free_empty");
      expect(result.allowed).toBe(true);
    });

    it("returns { allowed: true } for GOLD user regardless of LIVE count", async () => {
      mockInsertOnce();
      mockSelectOnce([{ tier: "GOLD" }]);
      // No count query needed for non-FREE

      const result = await gate.canPublish("user_gold");
      expect(result.allowed).toBe(true);
    });
  });

  describe("canCreateDraft", () => {
    it("returns { allowed: false } when FREE user already has 3 DRAFT invitations", async () => {
      mockInsertOnce();
      mockSelectOnce([{ tier: "FREE" }]);
      mockSelectOnce([{ value: 3 }]);

      const result = await gate.canCreateDraft("user_free_full");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/free tier/i);
    });

    it("returns { allowed: true } when FREE user has 2 DRAFT invitations", async () => {
      mockInsertOnce();
      mockSelectOnce([{ tier: "FREE" }]);
      mockSelectOnce([{ value: 2 }]);

      const result = await gate.canCreateDraft("user_free_partial");
      expect(result.allowed).toBe(true);
    });

    it("returns { allowed: true } for PLATINUM user regardless of draft count", async () => {
      mockInsertOnce();
      mockSelectOnce([{ tier: "PLATINUM" }]);
      // No count query needed for non-FREE

      const result = await gate.canCreateDraft("user_platinum");
      expect(result.allowed).toBe(true);
    });
  });
});
