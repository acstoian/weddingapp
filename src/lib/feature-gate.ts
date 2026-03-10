// lib/feature-gate.ts
// Phase 2: StripeFeatureGate — real DB-backed implementation.
// Replaces StubFeatureGate. Same exports to avoid call-site changes.

import { db } from "@/lib/db";
import { users, invitations } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";

export type Tier = "FREE" | "GOLD" | "PLATINUM";

export interface FeatureGate {
  canPublish(userId: string): Promise<{ allowed: boolean; reason?: string }>;
  canCreateDraft(userId: string): Promise<{ allowed: boolean; reason?: string }>;
  getUserTier(userId: string): Promise<Tier>;
}

export class StripeFeatureGate implements FeatureGate {
  /**
   * Returns the user's current tier from DB.
   * Upserts the user row to ensure it exists (onConflictDoNothing).
   */
  async getUserTier(userId: string): Promise<Tier> {
    // Ensure the user row exists; if not, create it with default FREE tier
    await db
      .insert(users)
      .values({ id: userId, email: "", tier: "FREE" })
      .onConflictDoNothing();

    const [user] = await db
      .select({ tier: users.tier })
      .from(users)
      .where(eq(users.id, userId));

    return (user?.tier ?? "FREE") as Tier;
  }

  /**
   * Returns { allowed: true } for GOLD/PLATINUM users.
   * For FREE users: checks that they have fewer than 1 LIVE invitation.
   */
  async canPublish(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const tier = await this.getUserTier(userId);

    if (tier !== "FREE") {
      return { allowed: true };
    }

    const [{ value }] = await db
      .select({ value: count() })
      .from(invitations)
      .where(and(eq(invitations.userId, userId), eq(invitations.status, "LIVE")));

    if (value >= 1) {
      return {
        allowed: false,
        reason: "Free tier: 1 published invitation max",
      };
    }

    return { allowed: true };
  }

  /**
   * Returns { allowed: true } for GOLD/PLATINUM users.
   * For FREE users: checks that they have fewer than 3 DRAFT invitations.
   */
  async canCreateDraft(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const tier = await this.getUserTier(userId);

    if (tier !== "FREE") {
      return { allowed: true };
    }

    const [{ value }] = await db
      .select({ value: count() })
      .from(invitations)
      .where(and(eq(invitations.userId, userId), eq(invitations.status, "DRAFT")));

    if (value >= 3) {
      return {
        allowed: false,
        reason: "Free tier: 3 drafts max",
      };
    }

    return { allowed: true };
  }
}

// Same export name as Phase 1 StubFeatureGate — zero call-site changes required.
export const featureGate = new StripeFeatureGate();
