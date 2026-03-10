import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// --- Mocks ---

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/billing.service", () => ({
  createCheckoutSession: vi.fn(),
}));

// --- Imports after mocks ---

import { auth } from "@clerk/nextjs/server";
import { createCheckoutSession } from "@/lib/services/billing.service";
import { POST } from "@/app/api/billing/checkout/route";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockCreateCheckout = createCheckoutSession as ReturnType<typeof vi.fn>;

function makeRequest(body: object): Request {
  return new Request("http://localhost:3000/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const req = makeRequest({ targetTier: "GOLD", returnUrl: "/dashboard" });
    const res = await POST(req);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 409 when user already on target tier", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreateCheckout.mockRejectedValue(new Error("Already on this tier"));

    const req = makeRequest({ targetTier: "GOLD", returnUrl: "/dashboard" });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("Already on this tier");
  });

  it("returns { url } on success", async () => {
    mockAuth.mockResolvedValue({ userId: "user_123" });
    mockCreateCheckout.mockResolvedValue({ url: "https://checkout.stripe.com/pay/test_abc" });

    const req = makeRequest({ targetTier: "GOLD", returnUrl: "/dashboard" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("https://checkout.stripe.com/pay/test_abc");
    expect(mockCreateCheckout).toHaveBeenCalledWith(
      "user_123",
      "GOLD",
      "/dashboard"
    );
  });
});
