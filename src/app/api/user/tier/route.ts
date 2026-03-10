import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/user/tier
 *
 * Returns the authenticated user's current tier.
 *
 * Response: { tier: "FREE" | "GOLD" | "PLATINUM" }
 * Errors:
 *   401 — not authenticated
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [user] = await db
    .select({ tier: users.tier })
    .from(users)
    .where(eq(users.id, userId));

  return NextResponse.json({ tier: user?.tier ?? "FREE" });
}
