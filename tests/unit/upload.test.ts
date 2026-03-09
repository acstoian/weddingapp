// REQ-02 — implemented in 01-05 Task 1
import { describe, it } from "vitest";

describe("upload API", () => {
  it.todo("rejects files larger than 5MB with 413");
  it.todo("accepts valid image file and returns blob URL");
  it.todo("rejects request with no file with 400");
});
