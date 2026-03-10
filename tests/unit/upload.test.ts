// REQ-02 — photo upload unit tests
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Module mocks (hoisted by vitest) ----------------------------------------

vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({ url: "https://blob.vercel-storage.com/test.jpg" }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

// ---- Import after mocks -------------------------------------------------------
import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { POST } from "@/app/api/upload/route";

// ---- Helpers -----------------------------------------------------------------

/**
 * Build a Request that properly contains FormData with a File.
 * We create the Request, then patch its formData() method so the
 * route handler gets a real File object — necessary because jsdom's
 * undici Request.formData() doesn't support multipart/form-data parsing.
 */
function makeUploadRequest(file: File | null, invitationId = "inv-123"): Request {
  const req = new Request(
    `http://localhost/api/upload?invitationId=${invitationId}`,
    { method: "POST" }
  );

  // Patch formData to return controlled data
  req.formData = async () => {
    const fd = new FormData();
    if (file) fd.append("file", file);
    return fd;
  };

  return req;
}

function makeFile(sizeBytes: number, type = "image/jpeg", name = "test.jpg"): File {
  const buffer = new Uint8Array(sizeBytes).fill(65); // 'A'
  return new File([buffer], name, { type });
}

// ---- Tests -------------------------------------------------------------------

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (put as ReturnType<typeof vi.fn>).mockResolvedValue({
      url: "https://blob.vercel-storage.com/test.jpg",
    });
  });

  it("returns 401 when not authenticated", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: null,
    });

    const req = makeUploadRequest(makeFile(1024));
    const res = await POST(req);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 200 with blob URL for a valid 1MB JPEG", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user_123",
    });

    const file = makeFile(1 * 1024 * 1024, "image/jpeg", "photo.jpg");
    const req = makeUploadRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("url");
    expect(typeof body.url).toBe("string");
    expect(body.url).toContain("blob.vercel-storage.com");
  });

  it("returns 413 for a file larger than 5MB", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user_123",
    });

    const file = makeFile(6 * 1024 * 1024, "image/jpeg", "large.jpg");
    const req = makeUploadRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toMatch(/too large/i);
  });

  it("returns 415 for an unsupported MIME type (image/gif)", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: "user_123",
    });

    const file = makeFile(100 * 1024, "image/gif", "animated.gif");
    const req = makeUploadRequest(file);
    const res = await POST(req);

    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });
});
