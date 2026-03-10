# Architectural & Design Decisions

---

## 2026-03-09 — Project Initialization

### React-based templates (not plain HTML)
**Decision:** Templates are React components, not static HTML/CSS files.
**Rationale:** Composable, editable in-browser via Craft.js (which operates natively on React component trees), and natural fit for Vercel/Next.js deployment pipeline.

### Vercel for per-invitation deployment
**Decision:** Each published invitation is deployed as an independent Vercel project via Vercel REST API v13.
**Rationale:** Full automation, instant URLs, zero-config hosting. Vercel is the natural companion to Next.js. Async deployment pattern: return `{status: "building", deploymentId}` immediately, poll via SSE.

### WhatsApp Business API (not wa.me links)
**Decision:** Platinum tier uses WhatsApp Cloud API (Meta-direct) for bulk sending.
**Rationale:** True bulk sending capability vs. manually clicking wa.me links. Enables contact list upload, delivery tracking, and sending from admin dashboard.

### Field-based template editor (not drag-and-drop canvas)
**Decision:** In-browser editor is field-based (name, date, venue, photo fields) not a Canva-style canvas.
**Rationale:** Canvas editors are complex to build correctly. Field-based forms cover 95% of user needs at 10% of engineering cost. Explicitly recommended by features research.

### Branch naming: invitation/{invitationId} not user/{username}
**Decision:** Git branches for invitation deployments named `invitation/{invitationId}`.
**Rationale:** One user can have multiple invitations. User-based branch naming causes collisions. Raised by architecture research.

### PDF generation on dedicated compute (not Vercel serverless)
**Decision:** Puppeteer PDF export runs on a dedicated service (Railway/Render/Fly.io or Browserless.io), not Vercel serverless functions.
**Rationale:** Chrome binary exceeds Vercel's 50MB Lambda limit. Memory and timeout constraints also insufficient for high-res PDF rendering.

### BullMQ + Redis for WhatsApp job queue
**Decision:** WhatsApp bulk sending uses a job queue, not synchronous HTTP dispatch.
**Rationale:** 500 guests × ~300ms/call = ~150 seconds — far beyond any HTTP request timeout. Queue enables retry, status tracking, and rate limit compliance.

### Octokit for git automation (not git CLI)
**Decision:** Git branch creation/updates use GitHub REST API via Octokit.
**Rationale:** Serverless functions are stateless — cannot maintain a git working directory. Octokit is the correct pattern for server-side git operations in serverless environments.

---

## 2026-03-09 — Phase 1 UX & Product Decisions (discuss-phase)

### Template distribution: 3 minimal + 1 decorative wedding, 2 minimal baptism
**Rationale:** Mixed styles cover modern and traditional preferences. Skews modern (urban RO market) while including one decorative option.

### Template quality bar: production-ready at launch
**Rationale:** Templates must look good enough to share — real Google Fonts, proper spacing, mobile-responsive. Not placeholders.

### Gallery flow: Dashboard → "New invitation" → Gallery → Preview → Editor
**Rationale:** Dashboard is the home base. Gallery is a flow, not a persistent page. Cleaner architecture.

### Free tier limits: 3 drafts, 1 published
**Rationale:** Allows exploration (try templates) without committing, while gating the monetizable action (publishing/sharing).

### Publish feedback: inline sidebar progress (not modal/overlay)
**Rationale:** Keeps user grounded in the editor context while deployment runs. Less disruptive than a full-screen overlay.

### Email on publish via Resend
**Rationale:** Resend is the modern standard for Next.js transactional email. Official Vercel integration, generous free tier.

### i18n: RO default, EN toggle in header nav
**Rationale:** Romanian market is primary. EN needed for diaspora. Toggle in nav is discoverable without requiring settings page.

### Invitation title: user-set, first editor field
**Rationale:** Avoids auto-generated names that feel impersonal. First field ensures it gets filled early.

### Pricing page in Phase 1 (Stripe inactive)
**Rationale:** Users hitting limits need somewhere to land. Page sets expectations. Stripe wired in Phase 2.

### CLAUDE.md: mandatory ui-ux-pro-max skill for all UI work
**Decision:** Every UI implementation task must invoke `/ui-ux-pro-max` before writing code.
**Rationale:** Enforces consistent design quality across all frontend work from the first line of code.

---

## 2026-03-10 — Phase 2 Billing Decisions (discuss-phase)

### Billing model: one-time lifetime payment (not subscription)
**Decision:** Gold (99 RON) and Platinum (149 RON) are one-time lifetime purchases. No monthly recurring billing. Gold→Platinum upgrade is a separate 50 RON Stripe product.
**Rationale:** Simpler to build, no churn from failed renewals, strong value proposition for Romanian market. No Stripe Customer Portal needed. Only `checkout.session.completed` webhook required.

### Drop subscriptions table
**Decision:** Remove the `subscriptions` table stub from Phase 1 schema. `users.tier` is the sole source of truth for access level.
**Rationale:** With one-time payments there is no subscription object to track. The stub table would create confusion about which table is authoritative.

### StripeFeatureGate: DB read on every call, no cache
**Decision:** `StripeFeatureGate` reads `users.tier` from Neon DB on every `canPublish()`/`canCreateDraft()` call. No in-memory or Redis cache.
**Rationale:** At current scale DB queries are fast. Caching adds complexity and can serve stale tier data (e.g., after admin reset). Simplicity wins.

### Stripe webhook idempotency via stripe_events table
**Decision:** New `stripe_events` table (stripe_event_id, event_type, user_id, processed_at). Insert before processing; skip if event ID already exists.
**Rationale:** Stripe may deliver the same event multiple times. Without idempotency, duplicate webhooks could grant the same tier twice or cause inconsistent state.

### Upgrade modal: benefit-focused, both tiers shown, Gold highlighted
**Decision:** When a Free user hits a limit, show a modal with both Gold and Platinum cards (Gold highlighted). Copy is benefit-focused ("Deblochează invitatii nelimitate"). Modal always dismissible. Clicking a tier CTA goes directly to Stripe Checkout.
**Rationale:** In-context modal keeps user in flow (vs. redirect to pricing page). Benefit focus reduces friction. Showing both tiers gives user full information for decision.

### PDF export and WhatsApp visible-but-locked for lower tiers
**Decision:** PDF export button visible (disabled) for Free users; WhatsApp section visible (disabled) for Free and Gold users. Both open the upgrade modal on click.
**Rationale:** Teaser approach shows users what they're missing and creates upgrade motivation. Hiding features removes the upsell signal entirely.
