import { describe, it, expect } from "vitest";
import { users, stripeEvents } from "@/lib/db/schema";

describe("DB schema — Phase 2 billing changes", () => {
  it("stripeEvents table has correct columns", () => {
    const cols = Object.keys(stripeEvents);
    expect(cols).toContain("id");
    expect(cols).toContain("stripeEventId");
    expect(cols).toContain("eventType");
    expect(cols).toContain("userId");
    expect(cols).toContain("processedAt");
  });

  it("users table has stripeCustomerId field", () => {
    const cols = Object.keys(users);
    expect(cols).toContain("stripeCustomerId");
  });

  it("subscriptions is not exported from schema", async () => {
    const schema = await import("@/lib/db/schema");
    expect((schema as Record<string, unknown>).subscriptions).toBeUndefined();
  });
});
