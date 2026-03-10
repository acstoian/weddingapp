import { describe, it } from "vitest";

describe("POST /api/billing/checkout", () => {
  it.todo("returns 401 when unauthenticated");
  it.todo("returns 409 when user already on target tier");
  it.todo("returns { url } on success");
});
