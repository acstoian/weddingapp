// lib/services/pdf.service.ts
// Phase 3: PDF export service — calls the Railway PDF microservice.

export class PdfServiceError extends Error {
  constructor(
    public code: "RATE_LIMITED" | "RENDER_FAILED",
    public status: number
  ) {
    super(code);
    this.name = "PdfServiceError";
  }
}

export type PdfSize = "card" | "pliant";

const SIZE_DIMENSIONS: Record<PdfSize, { widthMm: number; heightMm: number }> = {
  card: { widthMm: 100, heightMm: 150 },
  pliant: { widthMm: 148, heightMm: 200 },
};

/**
 * Calls the Railway PDF renderer and returns the PDF bytes as a Buffer.
 *
 * @param liveUrl - The public URL of the invitation page to render
 * @param size    - "card" (100x150mm) or "pliant" (148x200mm)
 * @throws PdfServiceError with code RATE_LIMITED (429) or RENDER_FAILED (5xx)
 */
export async function renderPdf(liveUrl: string, size: PdfSize): Promise<Buffer> {
  const { widthMm, heightMm } = SIZE_DIMENSIONS[size];

  const res = await fetch(`${process.env.PDF_SERVICE_URL}/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-PDF-Secret": process.env.PDF_SERVICE_SECRET ?? "",
    },
    body: JSON.stringify({ url: `${liveUrl}?print=true`, widthMm, heightMm }),
    signal: AbortSignal.timeout(55_000),
  });

  if (res.status === 429) throw new PdfServiceError("RATE_LIMITED", 429);
  if (!res.ok) throw new PdfServiceError("RENDER_FAILED", res.status);

  return Buffer.from(await res.arrayBuffer());
}
