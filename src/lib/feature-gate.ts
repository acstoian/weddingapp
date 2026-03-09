// lib/feature-gate.ts
// Phase 1 stub — always FREE tier, enforces 3 draft / 1 published limits from DB.
// Phase 2 replaces StubFeatureGate with StripeFeatureGate.
// DB integration is wired in plan 01-02 when lib/db/index.ts is created.

export type Tier = "FREE" | "GOLD" | "PLATINUM";

export interface FeatureGate {
  canPublish(userId: string): Promise<{ allowed: boolean; reason?: string }>;
  canCreateDraft(userId: string): Promise<{ allowed: boolean; reason?: string }>;
  getUserTier(userId: string): Promise<Tier>;
}

// Phase 1 scaffold stub — db not yet available (created in 01-02).
// Methods return permissive values until 01-02 wires the real DB query.
export class StubFeatureGate implements FeatureGate {
  async canPublish(
    _userId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // TODO (01-02): query invitations WHERE user_id = _userId AND status = 'LIVE'
    // if count >= 1 return { allowed: false, reason: 'Free tier: 1 published invitation max' }
    return { allowed: true };
  }

  async canCreateDraft(
    _userId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // TODO (01-02): query invitations WHERE user_id = _userId AND status = 'DRAFT'
    // if count >= 3 return { allowed: false, reason: 'Free tier: 3 drafts max' }
    return { allowed: true };
  }

  async getUserTier(_userId: string): Promise<Tier> {
    return "FREE" as const;
  }
}

export const featureGate = new StubFeatureGate();
