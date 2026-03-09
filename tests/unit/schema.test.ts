import { describe, it } from "vitest";

describe("InvitationFieldsSchema", () => {
  it.todo("validates all 7 fields");
  it.todo("rejects missing required title");
  it.todo("rejects missing required names");
  it.todo("rejects coverPhotoUrl that is not a URL");
  it.todo("allows personalMessage up to 500 chars");
  it.todo("rejects personalMessage over 500 chars");
  it.todo("accepts valid ISO 8601 eventDatetime");
});
