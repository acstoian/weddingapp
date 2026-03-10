// app/api/export/pdf/[id]/route.ts
// Phase 3: Gold tier PDF export endpoint.
// Generates a print-ready PDF via the Railway PDF microservice.

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { featureGate } from "@/lib/feature-gate";
import { renderPdf, PdfServiceError, type PdfSize } from "@/lib/services/pdf.service";
import slugify from "slugify";

// Increase the serverless function timeout to accommodate PDF rendering
export const maxDuration = 60;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Fetch invitation and verify ownership
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(and(eq(invitations.id, id), eq(invitations.userId, userId)));

  if (!invitation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Feature gate — Gold/Platinum only
  const { allowed, reason } = await featureGate.canExportPdf(userId);
  if (!allowed) {
    return NextResponse.json({ error: reason ?? "Gold tier required" }, { status: 403 });
  }

  // Parse size from query param — default to "card"
  const { searchParams } = new URL(request.url);
  const sizeParam = searchParams.get("size");
  const size: PdfSize = sizeParam === "pliant" ? "pliant" : "card";

  // Call PDF microservice
  try {
    const buffer = await renderPdf(invitation.liveUrl!, size);

    // Build slugified filename: e.g. "my-wedding-card.pdf"
    const slug = slugify(invitation.title ?? "invitation", { lower: true, strict: true });
    const filename = `${slug}-${size}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    if (err instanceof PdfServiceError) {
      if (err.code === "RATE_LIMITED") {
        return NextResponse.json(
          { error: "Serverul este ocupat", code: "RATE_LIMITED" },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Generarea PDF a esuat", code: "RENDER_FAILED" },
        { status: 500 }
      );
    }
    // Unexpected error
    console.error("[pdf-export] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
