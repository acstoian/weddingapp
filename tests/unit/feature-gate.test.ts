import { describe, it, expect, vi, beforeEach } from "vitest";
import { StripeFeatureGate } from "@/lib/feature-gate";

// Mock the DB layer so canExportPdf tests don't need a real DB connection
vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ tier: "FREE" }]),
      }),
    }),
  },
}));

describe("StripeFeatureGate — canExportPdf", () => {
  let gate: StripeFeatureGate;

  beforeEach(() => {
    gate = new StripeFeatureGate();
    vi.clearAllMocks();
  });

  it("returns { allowed: true } for GOLD tier", async () => {
    vi.spyOn(gate, "getUserTier").mockResolvedValue("GOLD");
    const result = await gate.canExportPdf("user-gold");
    expect(result.allowed).toBe(true);
  });

  it("returns { allowed: true } for PLATINUM tier", async () => {
    vi.spyOn(gate, "getUserTier").mockResolvedValue("PLATINUM");
    const result = await gate.canExportPdf("user-platinum");
    expect(result.allowed).toBe(true);
  });

  it("returns { allowed: false } for FREE tier", async () => {
    vi.spyOn(gate, "getUserTier").mockResolvedValue("FREE");
    const result = await gate.canExportPdf("user-free");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("does not re-implement getUserTier logic (delegates to getUserTier)", async () => {
    const spy = vi.spyOn(gate, "getUserTier").mockResolvedValue("GOLD");
    await gate.canExportPdf("user-123");
    expect(spy).toHaveBeenCalledWith("user-123");
  });
});

describe("StubFeatureGate", () => {
  it.todo("blocks 4th draft");
  it.todo("allows 1st draft");
  it.todo("allows 2nd draft");
  it.todo("allows 3rd draft");
  it.todo("blocks 2nd published invitation");
  it.todo("allows 1st published invitation");
  it.todo("getUserTier always returns FREE in Phase 1");
});
