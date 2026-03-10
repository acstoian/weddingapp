import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { featureGate } from "@/lib/feature-gate";
import { templates } from "@/lib/templates/registry";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: invitations.id,
      templateId: invitations.templateId,
      title: invitations.title,
      status: invitations.status,
      liveUrl: invitations.liveUrl,
      updatedAt: invitations.updatedAt,
    })
    .from(invitations)
    .where(eq(invitations.userId, userId))
    .orderBy(desc(invitations.updatedAt));

  return NextResponse.json({ invitations: rows });
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature gate: check draft limit
  const { allowed, reason } = await featureGate.canCreateDraft(userId);
  if (!allowed) {
    return NextResponse.json(
      { error: reason ?? "Free tier: 3 drafts max" },
      { status: 403 }
    );
  }

  // Validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const templateId =
    body && typeof body === "object" && "templateId" in body
      ? (body as Record<string, unknown>).templateId
      : undefined;

  if (!templateId || typeof templateId !== "string") {
    return NextResponse.json(
      { error: "templateId is required" },
      { status: 400 }
    );
  }

  // Validate templateId exists in registry
  const templateExists = templates.some((t) => t.id === templateId);
  if (!templateExists) {
    return NextResponse.json(
      { error: `Template "${templateId}" not found in registry` },
      { status: 400 }
    );
  }

  // Insert to DB
  const [invitation] = await db
    .insert(invitations)
    .values({
      userId,
      templateId,
      title: "",
      fields: {
        title: "",
        names: "",
        eventDatetime: "",
        venueName: "",
        venueAddress: "",
      },
      status: "DRAFT",
    })
    .returning({ id: invitations.id, status: invitations.status });

  return NextResponse.json({ invitation }, { status: 201 });
}
