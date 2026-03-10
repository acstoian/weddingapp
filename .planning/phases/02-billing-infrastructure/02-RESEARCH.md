# Phase 2: Billing Infrastructure - Research

**Researched:** 2026-03-10
**Domain:** Stripe one-time payments, Drizzle schema migration, Next.js App Router webhook handling, FeatureGate DB service
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- One-time lifetime payment — NOT a subscription. Users pay once and have Gold/Platinum access permanently
- No auto-renewal, no recurring charges, no trial periods
- Stripe Checkout uses `payment` mode (not `subscription`)
- Only webhook needed: `checkout.session.completed`
- `subscriptions` table dropped — users.tier is the single source of truth
- Add `stripeCustomerId` column to users table (populated at first Checkout)
- Gold: "Save the Date — Gold" — 99 RON one-time
- Platinum: "Save the Date — Platinum" — 149 RON one-time
- Platinum Upgrade from Gold: "Save the Date — Platinum Upgrade" — 50 RON one-time
- Price IDs stored in env vars: `STRIPE_GOLD_PRICE_ID`, `STRIPE_PLATINUM_PRICE_ID`, `STRIPE_PLATINUM_UPGRADE_PRICE_ID`
- Currency displayed as RON (not lei)
- VAT included in displayed prices (no Stripe Tax)
- Stripe-hosted Checkout page (not embedded)
- Checkout session metadata: `{ userId, targetTier }` — webhook uses this to identify user to upgrade
- Create Stripe Customer at first Checkout, store `stripeCustomerId` in users table
- No email pre-fill on Stripe Checkout page
- Payment methods: Card + Google Pay / Apple Pay (Stripe auto-enables wallets)
- Duplicate purchase blocked server-side before creating Checkout session (check current tier)
- Return URL: `/billing/success?session_id={CHECKOUT_SESSION_ID}&return={encodedReturnUrl}`
- Cancel URL: `/billing/cancel` or back to wherever they came from
- Checkout session created via: `POST /api/billing/checkout`
- Webhook route: `POST /api/webhooks/stripe`
- `stripe_events` table for idempotency: `(id uuid PK, stripe_event_id text unique, event_type text, user_id text, processed_at timestamp)`
- On `checkout.session.completed`: read `metadata.userId` + `metadata.targetTier`, update `users.tier`, save `stripeCustomerId`
- Send purchase confirmation email via Resend on successful webhook processing
- Replace `StubFeatureGate` with `StripeFeatureGate` in `src/lib/feature-gate.ts`
- FeatureGate reads `users.tier` from DB on every call (no cache)
- Upserts user row if not exists (tier = FREE)
- FREE: 3 drafts max, 1 published max; GOLD/PLATINUM: unlimited
- `featureGate` singleton exported — all existing call sites work unchanged
- `GET /api/user/tier` — returns current user's tier from DB
- On app start, log warning if `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` are missing
- Stripe test mode badge on pricing page when `NODE_ENV === 'development'`
- Upgrade prompt modal with tier cards — both Gold and Platinum shown; benefit-focused copy
- Subtle tier badge in TopNav, links to /pricing; nav order: Logo | Preturi | Tier badge | Clerk menu
- Dashboard usage indicators: "1/3 ciorne • 1/1 publicate"
- `POST /api/admin/users/:id/tier` — protected by `X-Admin-Secret` header matching `ADMIN_SECRET` env var
- Drop `subscriptions` table migration
- Add `stripeCustomerId text` column to users table
- Add `stripe_events` table
- Drizzle migration for all three schema changes
- /pricing URL unchanged; no auth required to view
- Pricing page: hero + social proof + tier cards + comparison table + FAQ + footer note
- Dynamic CTAs by user tier (guest/FREE/GOLD/PLATINUM)
- /billing/success polls `/api/user/tier` for up to 10s waiting for webhook, then auto-redirects

### Claude's Discretion
- Exact comparison table row content
- Exact FAQ answer copy
- Loading/polling UI on /billing/success while waiting for webhook
- Exact email template design for purchase confirmation and downgrade notification
- Dashboard usage indicator exact visual design (pill, inline text, etc.)
- Upgrade modal exact layout (card dimensions, button placement)

### Deferred Ideas (OUT OF SCOPE)
- Stripe Customer Portal (no subscriptions = nothing to cancel)
- Annual pricing / discount plans
- Charge.refunded webhook handling — admin handles refunds manually
- Admin dashboard UI — Phase 5
- Stripe Tax / automatic VAT collection
- WABA Meta Business Verification (external task — must be started but not delivered in Phase 2)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BILLING-01 | Platform offers 3 tiers: Free, Gold, Platinum | DB schema (users.tier), FeatureGate service, Stripe products |
| BILLING-02 | User can upgrade Free → Gold or Platinum via Stripe Checkout; tier reflected immediately | Stripe Checkout `payment` mode, `checkout.session.completed` webhook, /billing/success polling |
| BILLING-03 | Free-tier user hitting gated action gets upgrade prompt, not an error | StripeFeatureGate returns `{ allowed: false }` → UI shows upgrade modal |
| BILLING-04 | Downgrade locks gated features; invitation data never deleted | Admin endpoint updates tier, locked invitations remain in DB |
| BILLING-05 | Failed payment returns to Free within one billing cycle; webhook + DB stay in sync | `stripe_events` idempotency table, webhook upsert pattern |
</phase_requirements>

---

## Summary

Phase 2 wires real payment collection onto an already-built Free-tier foundation. The architecture is deliberately narrow: one-time Stripe Checkout in `payment` mode, one webhook event (`checkout.session.completed`), and `users.tier` as the single source of truth. There are no subscriptions, no Customer Portal, and no proration — all of which removes significant Stripe complexity.

The three main work streams are independent and can be planned as parallel tracks: (1) Stripe plumbing — install SDK, create products/prices, build checkout API route, build webhook handler with idempotency; (2) FeatureGate replacement — swap StubFeatureGate with StripeFeatureGate backed by `users.tier` DB query; (3) UI surface — pricing page overhaul, upgrade modal, TopNav tier badge, /billing/success polling page, and dashboard usage indicators.

The DB migration is the only shared dependency between all three tracks: drop `subscriptions`, add `stripeCustomerId` to `users`, add `stripe_events`. That migration must land first (Wave 0 or Plan 02-01 task 1).

**Primary recommendation:** Install stripe@20.4.1, create one `billing.service.ts` for Stripe SDK calls, implement the webhook handler with `request.text()` for raw body (required for `constructEvent`), use the `stripe_events` table for idempotency before any DB write.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | 20.4.1 | Node.js SDK for Stripe API + webhook verification | Official Stripe SDK; `constructEvent` for webhook verification; session creation |
| drizzle-orm | 0.45.1 (already installed) | Schema migration + DB queries | Already in project; `db.insert`, `db.update`, `db.select` patterns established |
| @neondatabase/serverless | 1.0.2 (already installed) | Neon Postgres driver | Already in project; connection pooling for serverless |
| resend | 6.9.3 (already installed) | Transactional email | Already in project; `email.service.ts` pattern established |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @stripe/stripe-js | 8.9.0 | Client-side Stripe (redirectToCheckout, if needed) | Only needed if using client-side redirect; for server-side redirect via `session.url`, not required |

**Note:** `@stripe/stripe-js` is NOT needed for server-side redirect flow (our approach). The server creates the session and returns `session.url`; the client does `window.location.href = session.url`. No client-side Stripe SDK required.

**Installation (only new dependency):**
```bash
npm install stripe@20.4.1
```

---

## Architecture Patterns

### Recommended Project Structure (new files only)
```
src/
├── lib/
│   ├── feature-gate.ts          # REPLACE StubFeatureGate → StripeFeatureGate
│   ├── stripe.ts                # Stripe singleton (new)
│   └── services/
│       └── billing.service.ts  # Stripe Checkout session creation (new)
├── app/
│   ├── api/
│   │   ├── billing/
│   │   │   └── checkout/
│   │   │       └── route.ts    # POST /api/billing/checkout (new)
│   │   ├── webhooks/
│   │   │   └── stripe/
│   │   │       └── route.ts    # POST /api/webhooks/stripe (new)
│   │   ├── user/
│   │   │   └── tier/
│   │   │       └── route.ts    # GET /api/user/tier (new)
│   │   └── admin/
│   │       └── users/
│   │           └── [id]/
│   │               └── tier/
│   │                   └── route.ts  # POST /api/admin/users/:id/tier (new)
│   └── (billing)/               # New route group for billing pages
│       ├── billing/
│       │   ├── success/
│       │   │   └── page.tsx    # /billing/success (new)
│       │   └── cancel/
│       │       └── page.tsx    # /billing/cancel (new)
│       └── layout.tsx
└── components/
    └── upgrade/
        └── UpgradeModal.tsx     # Upgrade prompt modal (new)
drizzle/
└── 0001_billing_phase.sql      # Migration: drop subscriptions, add stripeCustomerId, add stripe_events
```

### Pattern 1: Stripe Singleton
**What:** One Stripe instance shared across all server-side code.
**When to use:** All Stripe SDK calls import from this singleton.

```typescript
// src/lib/stripe.ts
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV !== "test") {
  console.warn("[stripe] STRIPE_SECRET_KEY is not set — Stripe calls will fail");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-01-27.acacia", // pin to stable API version
});
```

### Pattern 2: Checkout Session Creation
**What:** Server-side API route creates a Checkout session and returns the URL. Client redirects.
**When to use:** `POST /api/billing/checkout`

```typescript
// src/app/api/billing/checkout/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { targetTier, returnUrl } = await request.json();

  // Server-side duplicate purchase guard
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user?.tier === targetTier) {
    return NextResponse.json({ error: "Already on this tier" }, { status: 409 });
  }

  // Determine correct price ID
  const priceId =
    targetTier === "GOLD" ? process.env.STRIPE_GOLD_PRICE_ID :
    (user?.tier === "GOLD" && targetTier === "PLATINUM")
      ? process.env.STRIPE_PLATINUM_UPGRADE_PRICE_ID
      : process.env.STRIPE_PLATINUM_PRICE_ID;

  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}&return=${encodeURIComponent(returnUrl ?? "/dashboard")}`;
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing/cancel`;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, targetTier },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  // Reuse existing Stripe customer if we have one
  if (user?.stripeCustomerId) {
    sessionParams.customer = user.stripeCustomerId;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  return NextResponse.json({ url: session.url });
}
```

### Pattern 3: Webhook Handler — Raw Body + Idempotency
**What:** Verifies Stripe signature with raw body text; inserts idempotency record before any DB write.
**Critical:** Must use `request.text()` — NOT `request.json()`. Parsing JSON before `constructEvent` will break signature verification.

```typescript
// src/app/api/webhooks/stripe/route.ts
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { users, stripeEvents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const body = await request.text(); // RAW TEXT — required for constructEvent
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  // Idempotency check — insert BEFORE processing
  try {
    await db.insert(stripeEvents).values({
      stripeEventId: event.id,
      eventType: event.type,
      userId: null, // populated below if applicable
      processedAt: new Date(),
    });
  } catch (err) {
    // Unique constraint violation = already processed — safe to skip
    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, targetTier } = session.metadata ?? {};
    if (userId && targetTier) {
      await db.update(users)
        .set({
          tier: targetTier,
          stripeCustomerId: session.customer as string,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
      // Send purchase confirmation email (see billing.service.ts)
    }
  }

  return NextResponse.json({ received: true });
}

// CRITICAL: Disable body parsing — Next.js must not parse the body before we read it as text
export const config = { api: { bodyParser: false } };
```

**Note on `config`:** In Next.js App Router, raw body access via `request.text()` works without disabling body parsing. The `export const config = { api: { bodyParser: false } }` pattern is for Pages Router only. In App Router, `request.text()` reads the raw body directly.

### Pattern 4: StripeFeatureGate
**What:** Implements the existing `FeatureGate` interface backed by `users.tier` from DB. Upserts user row on first call.
**Key:** The `featureGate` export name is unchanged — all call sites (`featureGate.canPublish(userId)`) continue working.

```typescript
// src/lib/feature-gate.ts
export class StripeFeatureGate implements FeatureGate {
  async getUserTier(userId: string): Promise<Tier> {
    // Upsert: insert FREE tier row if user doesn't exist yet
    await db.insert(users)
      .values({ id: userId, email: "", tier: "FREE" })
      .onConflictDoNothing();

    const [user] = await db.select({ tier: users.tier })
      .from(users)
      .where(eq(users.id, userId));

    return (user?.tier ?? "FREE") as Tier;
  }

  async canPublish(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const tier = await this.getUserTier(userId);
    if (tier !== "FREE") return { allowed: true };

    const liveCount = await db.select({ count: count() })
      .from(invitations)
      .where(and(eq(invitations.userId, userId), eq(invitations.status, "LIVE")));

    if ((liveCount[0]?.count ?? 0) >= 1) {
      return { allowed: false, reason: "Free tier: 1 published invitation max" };
    }
    return { allowed: true };
  }

  async canCreateDraft(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const tier = await this.getUserTier(userId);
    if (tier !== "FREE") return { allowed: true };

    const draftCount = await db.select({ count: count() })
      .from(invitations)
      .where(and(eq(invitations.userId, userId), eq(invitations.status, "DRAFT")));

    if ((draftCount[0]?.count ?? 0) >= 3) {
      return { allowed: false, reason: "Free tier: 3 drafts max" };
    }
    return { allowed: true };
  }
}

export const featureGate = new StripeFeatureGate(); // same export name — zero call-site changes
```

### Pattern 5: /billing/success Polling
**What:** Client component polls `/api/user/tier` after successful Checkout, with 10s timeout.

```typescript
// Polling logic for /billing/success page
useEffect(() => {
  const start = Date.now();
  const poll = setInterval(async () => {
    const res = await fetch("/api/user/tier");
    const { tier } = await res.json();
    if (tier !== "FREE") {
      clearInterval(poll);
      setConfirmedTier(tier);
      setTimeout(() => router.push(returnUrl), 5000);
    }
    if (Date.now() - start > 10_000) {
      clearInterval(poll);
      setTimedOut(true); // show "Refresh if upgrade not reflected" message
    }
  }, 1000);
  return () => clearInterval(poll);
}, []);
```

### Anti-Patterns to Avoid
- **Parsing JSON before constructEvent:** `await request.json()` modifies the body bytes. Always use `await request.text()` in the webhook handler.
- **Trusting client-provided price:** Never pass `amount` from the client. Always derive the price from `targetTier` server-side and map to a known `STRIPE_*_PRICE_ID` env var.
- **Trusting metadata alone without signature verification:** Always `constructEvent` before reading `event.data` or `event.metadata`.
- **Assuming `session.customer` is a string:** It can be a `Stripe.Customer` object if `expand[]` is set. Cast as `string` only when not expanding customer.
- **Writing tier before idempotency insert:** Insert `stripe_events` row first; if the insert throws a unique constraint error, the event was already processed — return 200 immediately.
- **Using `payment` mode metadata for subscriptions table:** The `subscriptions` table is dropped. Never write to it. `users.tier` is the only source of truth.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC comparison | `stripe.webhooks.constructEvent()` | Stripe handles timing-safe comparison; replay protection built in |
| Idempotency for webhooks | In-memory seen-set or Redis | `stripe_events` table with unique constraint on `stripe_event_id` | Persists across serverless function restarts; survives deploys |
| Customer de-duplication | Custom lookup logic | Store `stripeCustomerId` on first Checkout and pass `customer:` param on subsequent sessions | Stripe links all payments to one customer record |
| Duplicate purchase guard | Stripe-side restriction | Server-side check of `users.tier` before creating Checkout session; return 409 | Stripe doesn't prevent same product being purchased twice natively |
| Polling/timeout on success page | WebSocket or SSE | Simple `setInterval` fetch of `/api/user/tier` with 10s cap | Webhook fires within 1-3s in production; simple polling is sufficient |

**Key insight:** Stripe Checkout's hosted page handles PCI compliance, Apple Pay/Google Pay enablement, localization, and mobile optimization out of the box. Do not build a custom payment form.

---

## Common Pitfalls

### Pitfall 1: Raw Body Destroyed by Next.js Body Parser
**What goes wrong:** `constructEvent` throws "No signatures found matching the expected signature for payload" even though the webhook secret is correct.
**Why it happens:** If anything reads or parses `request.json()` before `constructEvent`, the raw bytes fed to the HMAC check differ from what Stripe signed.
**How to avoid:** The webhook route handler must call `await request.text()` as the VERY FIRST read of the body. Never call `request.json()` in this route.
**Warning signs:** `WebhookSignatureVerificationError` in logs; test events fail but prod events "work" (they don't — they just never verify).

### Pitfall 2: Stripe `payment` Mode — `session.customer` May Be Null
**What goes wrong:** Writing `session.customer` to the DB when it is null for guest checkouts (no Customer created).
**Why it happens:** Stripe creates a Customer only if `customer_creation: "always"` is set in `payment` mode, or if `customer:` param is passed. Without this, `session.customer` may be null for first-time users.
**How to avoid:** Either always pass `customer_creation: "always"` in Checkout session params, or handle null in the webhook and create a Customer then. Decision: always create Customer on first Checkout by passing `customer_creation: "always"` when no `stripeCustomerId` exists on the user.
**Warning signs:** `stripeCustomerId` null in DB after successful payment; repeat purchases create multiple Customers.

### Pitfall 3: Webhook Fires Before DB Transaction Completes
**What goes wrong:** `/billing/success` polls tier, gets FREE, times out — user sees stale state.
**Why it happens:** Webhook can fire within milliseconds of redirect. If DB write in webhook takes >1s, first poll sees old tier.
**How to avoid:** Normal Stripe webhooks fire 1-5s after redirect; 10s polling window with 1s intervals is sufficient. Ensure the webhook DB write is fast (single update, no nested queries). Do not block the webhook response on email sending — fire email async.
**Warning signs:** /billing/success page consistently shows "checking..." for the full 10s; users report tier not updated.

### Pitfall 4: Idempotency Check with Wrong Error Handling
**What goes wrong:** Webhook processes the same event twice, upgrading a GOLD user to PLATINUM without payment.
**Why it happens:** If the idempotency `try/catch` catches a non-unique-constraint error (e.g., network timeout) and swallows it, the second event is also "skipped."
**How to avoid:** In the catch block, only return early if the error is a unique constraint violation (check `error.code === "23505"` for Postgres). Re-throw or return 500 for any other error so Stripe retries.
**Warning signs:** Duplicate rows in `stripe_events` (they shouldn't exist — if they do, the unique constraint is not enforced).

### Pitfall 5: Missing `NEXT_PUBLIC_APP_URL` in Checkout Session URLs
**What goes wrong:** `success_url` contains `undefined/billing/success?...` — Stripe rejects the session creation with "invalid URL."
**Why it happens:** Forgetting to set `NEXT_PUBLIC_APP_URL` env var, or using `process.env.VERCEL_URL` (which has no protocol).
**How to avoid:** Always construct URLs as `${process.env.NEXT_PUBLIC_APP_URL}/billing/success?...`. Add startup validation that logs a warning if this env var is missing.
**Warning signs:** `stripe.checkout.sessions.create` throws "URL is not valid."

### Pitfall 6: Drizzle Migration — Dropping a Table with FK References
**What goes wrong:** `DROP TABLE subscriptions` fails because the FK constraint from `subscriptions.user_id` references `users.id`.
**Why it happens:** The FK constraint must be dropped before the table.
**How to avoid:** In the migration SQL, drop the constraint first: `ALTER TABLE subscriptions DROP CONSTRAINT subscriptions_user_id_users_id_fk; DROP TABLE subscriptions;` — or use `DROP TABLE subscriptions CASCADE`.
**Warning signs:** Migration fails with "cannot drop table subscriptions because other objects depend on it."

### Pitfall 7: Upgrade Modal Calling Checkout Without Auth Check
**What goes wrong:** A guest user (not logged in) opens the upgrade modal, clicks "Cumpara acum", and gets a 401 from `/api/billing/checkout`.
**Why it happens:** The pricing page is public; the upgrade modal may be reachable by guests.
**How to avoid:** In the upgrade modal CTA handler, check auth state first. If not logged in, redirect to sign-up with return URL. If logged in, call `/api/billing/checkout`.
**Warning signs:** Unauthenticated POST to `/api/billing/checkout` returns 401 visible to end user.

---

## Code Examples

Verified patterns from project codebase and official Stripe docs:

### DB Schema Changes (Drizzle migration SQL)
```sql
-- 0001_billing_phase.sql
-- Step 1: Drop FK constraint from subscriptions
ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "subscriptions_user_id_users_id_fk";
-- Step 2: Drop subscriptions table
DROP TABLE IF EXISTS "subscriptions";
-- Step 3: Add stripeCustomerId to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;
-- Step 4: Create stripe_events idempotency table
CREATE TABLE "stripe_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stripe_event_id" text UNIQUE NOT NULL,
  "event_type" text NOT NULL,
  "user_id" text,
  "processed_at" timestamp NOT NULL DEFAULT now()
);
```

### Drizzle Schema Updates
```typescript
// In src/lib/db/schema.ts

// Add to users table:
stripeCustomerId: text("stripe_customer_id"),

// Remove: subscriptions table entirely

// Add new table:
export const stripeEvents = pgTable("stripe_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  stripeEventId: text("stripe_event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  userId: text("user_id"),
  processedAt: timestamp("processed_at").notNull().defaultNow(),
});
```

### Stripe Environment Variable Validation (startup)
```typescript
// Add to src/lib/stripe.ts or a startup check module
const requiredVars = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
for (const v of requiredVars) {
  if (!process.env[v]) {
    console.warn(`[stripe] WARNING: ${v} is not set`);
  }
}
```

### GET /api/user/tier — Minimal Implementation
```typescript
// src/app/api/user/tier/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user] = await db.select({ tier: users.tier }).from(users).where(eq(users.id, userId));
  return NextResponse.json({ tier: user?.tier ?? "FREE" });
}
```

### TopNav Tier Badge (client fetch pattern)
```typescript
// TopNav.tsx — add tier display
const [tier, setTier] = useState<string>("FREE");
useEffect(() => {
  fetch("/api/user/tier")
    .then((r) => r.json())
    .then((d) => setTier(d.tier))
    .catch(() => {}); // fail silently — badge just shows FREE
}, []);
// Render: <Link href="/pricing"><span>{tier}</span></Link>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `export const config` to disable body parser | App Router `request.text()` directly | Next.js 13 App Router | No config needed; `request.text()` works natively |
| `stripe.webhooks.constructEvent(rawBody, sig, secret)` with Buffer | Same API; `request.text()` returns string directly usable | Stable | String or Buffer both accepted |
| Subscription-based tier tracking (`subscriptions` table) | One-time payment, `users.tier` as source of truth | This project decision | No subscription lifecycle management needed |
| `@stripe/stripe-js` for client redirect | Server returns `session.url`; client does `window.location.href` | Always valid | No client-side Stripe SDK needed for server-side redirect |

**Deprecated/outdated for this project:**
- `subscriptions` table: replaced by `users.tier` column (already exists)
- `stripeSubId`, `currentPeriodEnd` columns: not applicable to one-time payments
- StubFeatureGate: replaced by StripeFeatureGate

---

## Open Questions

1. **Stripe API version to pin**
   - What we know: Current stable Stripe API version as of early 2026 is in the `2025-xx-xx.acacia` family
   - What's unclear: Exact current API version string — the SDK auto-selects if not pinned, but pinning is recommended for stability
   - Recommendation: Run `npm view stripe` after install to see bundled API version; pin to whatever is bundled with stripe@20.4.1

2. **RON minimum charge amount**
   - What we know: RON minimum charge is 2.00 lei per Stripe docs; our minimum (50 RON) is well above this
   - What's unclear: Whether Stripe requires RON to be set up as a settlement currency for a Romanian Stripe account, or if card-processing-only is sufficient
   - Recommendation: Verify in Stripe Dashboard that RON is available for the configured Stripe account country before creating products

3. **Email address availability for purchase confirmation**
   - What we know: `session.customer_details.email` is available on `checkout.session.completed`; user email also stored in `users.email`
   - What's unclear: Whether `users.email` is populated at the point of first Checkout (it is populated at Clerk sign-in via the `users` upsert)
   - Recommendation: Use `session.customer_details.email` from the webhook event as the authoritative email for purchase confirmation — does not require `users.email` to be pre-populated

4. **`customer_creation` behavior in `payment` mode**
   - What we know: In Stripe `payment` mode, `session.customer` may be null unless `customer_creation: "always"` is specified
   - What's unclear: Whether passing `customer: existingCustomerId` in the session params is sufficient to guarantee customer creation for first-time users (it should be — but only if an existing Customer ID is passed)
   - Recommendation: For first-time users (no `stripeCustomerId`), add `customer_creation: "always"` to session params. For returning users, pass `customer: user.stripeCustomerId`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test:unit && npm run test:e2e` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BILLING-01 | StripeFeatureGate returns correct tier from DB | unit | `npm run test:unit -- --testPathPattern feature-gate` | ❌ Wave 0 |
| BILLING-01 | StripeFeatureGate blocks 4th draft for FREE tier | unit | `npm run test:unit -- --testPathPattern feature-gate` | ❌ Wave 0 |
| BILLING-01 | StripeFeatureGate blocks 2nd publish for FREE tier | unit | `npm run test:unit -- --testPathPattern feature-gate` | ❌ Wave 0 |
| BILLING-01 | StripeFeatureGate allows unlimited for GOLD/PLATINUM | unit | `npm run test:unit -- --testPathPattern feature-gate` | ❌ Wave 0 |
| BILLING-02 | Webhook: `checkout.session.completed` updates users.tier | unit | `npm run test:unit -- --testPathPattern webhook` | ❌ Wave 0 |
| BILLING-02 | Webhook: duplicate event ID skipped (idempotency) | unit | `npm run test:unit -- --testPathPattern webhook` | ❌ Wave 0 |
| BILLING-03 | POST /api/billing/checkout returns 409 for duplicate purchase | unit | `npm run test:unit -- --testPathPattern checkout` | ❌ Wave 0 |
| BILLING-04 | Admin endpoint updates tier to FREE | unit | `npm run test:unit -- --testPathPattern admin-tier` | ❌ Wave 0 |
| BILLING-05 | Webhook handler verifies signature; rejects invalid signature | unit | `npm run test:unit -- --testPathPattern webhook` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit`
- **Per wave merge:** `npm run test:unit && npm run test:e2e`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/feature-gate.test.ts` — exists but all tests are `.todo()` — must be implemented; covers BILLING-01
- [ ] `tests/unit/stripe-webhook.test.ts` — does not exist; covers BILLING-02, BILLING-05
- [ ] `tests/unit/billing-checkout.test.ts` — does not exist; covers BILLING-03
- [ ] `tests/unit/admin-tier.test.ts` — does not exist; covers BILLING-04
- [ ] MSW handlers for Stripe API mocking — check if `tests/unit/setup.ts` sets up MSW; if not, add Stripe mock handlers

---

## Sources

### Primary (HIGH confidence)
- [Stripe Checkout Docs — How Checkout Works](https://docs.stripe.com/payments/checkout/how-checkout-works)
- [Stripe Supported Currencies](https://docs.stripe.com/currencies) — RON confirmed supported; minimum 2.00 RON
- [Stripe Webhook Signature Verification](https://docs.stripe.com/webhooks/signature)
- Project codebase — `src/lib/db/schema.ts`, `src/lib/feature-gate.ts`, `src/app/api/publish/[id]/route.ts`, `package.json` — read directly

### Secondary (MEDIUM confidence)
- [Stripe + Next.js 15 Complete 2025 Guide](https://www.pedroalonso.net/blog/stripe-nextjs-complete-guide-2025/) — `request.text()` raw body pattern, App Router webhook handler structure
- [Stripe Checkout and Webhook in Next.js 15 (2025) — Medium](https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e) — App Router route handler patterns confirmed
- [Stripe Webhook Signature in Next.js App Router — Medium](https://kitson-broadhurst.medium.com/next-js-app-router-stripe-webhook-signature-verification-ea9d59f3593f) — `request.text()` confirmed required
- npm registry — `stripe@20.4.1`, `@stripe/stripe-js@8.9.0` — current versions verified

### Tertiary (LOW confidence)
- Drizzle migration patterns from [orm.drizzle.team/docs/migrations](https://orm.drizzle.team/docs/migrations) via WebSearch — migration workflow documented; verify `drizzle-kit generate` behavior for drop table before running

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Stripe SDK version verified via npm; all other deps already in project
- Architecture: HIGH — patterns match existing codebase conventions; webhook raw body requirement verified from multiple 2025 sources
- Pitfalls: HIGH — raw body / idempotency / null customer pitfalls verified from official docs and community sources
- Drizzle migration: MEDIUM — drop table with FK constraint is documented behavior; verify generated SQL before applying

**Research date:** 2026-03-10
**Valid until:** 2026-04-10 (Stripe API is stable; Next.js App Router patterns are stable)
