import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    sendPurchaseConfirmation: vi.fn().mockResolvedValue(undefined),
  },
}));

// --- Imports after mocks ---

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { POST } from "@/app/api/webhooks/stripe/route";

const mockConstructEvent = stripe.webhooks.constructEvent as ReturnType<typeof vi.fn>;
const mockDb = db as {
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function makeWebhookRequest(body = "{}", sig = "valid-sig"): Request {
  return new Request("http://localhost:3000/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": sig,
    },
    body,
  });
}

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 on invalid signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("No signatures found matching the expected signature");
    });

    const req = makeWebhookRequest("{}", "bad-sig");
    const res = await POST(req);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Webhook signature verification failed");
  });

  it("returns 200 and skips processing on duplicate event ID", async () => {
    const fakeEvent = {
      id: "evt_duplicate",
      type: "checkout.session.completed",
      data: { object: { metadata: {} } },
    };
    mockConstructEvent.mockReturnValue(fakeEvent);

    // Simulate unique constraint violation (already processed)
    const uniqueConstraintError = Object.assign(new Error("duplicate key value"), {
      code: "23505",
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockRejectedValue(uniqueConstraintError),
    });

    const req = makeWebhookRequest();
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    // DB update should NOT be called since we short-circuited
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("updates users.tier on checkout.session.completed", async () => {
    const fakeEvent = {
      id: "evt_new",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { userId: "user_abc", targetTier: "GOLD" },
          customer: "cus_stripe_xyz",
          customer_details: { email: "test@example.com" },
        },
      },
    };
    mockConstructEvent.mockReturnValue(fakeEvent);

    // insert succeeds (new event)
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    // update chain: update(users).set({...}).where(...)
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockDb.update.mockReturnValue({ set: mockSet });

    const req = makeWebhookRequest();
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);

    // Verify DB update was called with correct tier and stripeCustomerId
    expect(mockDb.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: "GOLD",
        stripeCustomerId: "cus_stripe_xyz",
      })
    );
  });
});
