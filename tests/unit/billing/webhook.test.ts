import { describe, it } from "vitest";

describe("POST /api/webhooks/stripe", () => {
  it.todo("returns 400 on invalid signature");
  it.todo("returns 200 and skips processing on duplicate event ID");
  it.todo("updates users.tier on checkout.session.completed");
});
