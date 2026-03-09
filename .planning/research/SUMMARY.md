# Project Research Summary

**Project:** Save the Date Platform — Wedding & Baptism Invitation SaaS
**Domain:** Multi-tenant SaaS with per-user deployments, in-browser React editor, WhatsApp bulk sending, PDF export, tiered subscriptions
**Researched:** 2026-03-09
**Confidence:** MEDIUM (Vercel and Next.js core confirmed HIGH; third-party integrations MEDIUM)

---

## Executive Summary

This is a template-based SaaS where the core value proposition — an invitation as a live URL, not an email attachment — is architecturally unusual. Unlike competitors (Greenvelope, Paperless Post) that deliver invitations via email, this platform deploys each invitation as an independent Vercel project, making it natively shareable over any channel: WhatsApp, SMS, Facebook, or QR code. The recommended approach is a Next.js 16 monolith acting as a control plane that orchestrates GitHub API automation, Vercel REST API deployments, Puppeteer PDF rendering, and WhatsApp Cloud API dispatch. Invitation state lives in PostgreSQL (Neon) as a typed JSON config; git branches are deployment artifacts, not the source of truth for editor state. Craft.js drives the in-browser React template editor, keeping the entire stack in React and making the editor-preview-to-deployed-output pipeline coherent.

The biggest architectural risk is that the "per-project Vercel deployment" model will hit Vercel plan limits at even modest scale. This must be abstracted behind a `DeploymentService` interface from day one so Vercel can be swapped or supplemented. The second existential risk is WhatsApp Business API approval: Meta's verification is slow and opaque, and an unapproved or suspended WABA account makes the Platinum tier entirely non-functional. Both risks require action in Phase 1, before any users touch the product. The good news is that the Romanian/EU market gap — WhatsApp-native bulk invitations, baptism-specific templates, URL-first design — is a genuine blue ocean that none of the major English-market competitors address.

The v1 recommendation is deliberately narrow: a working Free tier (browse templates → edit in-browser → publish → shareable URL) with PDF export (Gold) and WhatsApp bulk send (Platinum) as the two paid unlocks. RSVP collection, custom domains, real-time collaboration, and template marketplaces are explicitly out of scope for v1. The editor must be scoped to a form-based field editor (not drag-and-drop canvas) in v1 to avoid the most common scope explosion pattern in SaaS builder products.

---

## Key Findings

### Recommended Stack

The platform runs on Next.js 16 (App Router, Turbopack) with React 19.2 and TypeScript 5.1+. This is the unambiguous choice for a Vercel-hosted product — the framework and hosting platform are from the same team, and the Vercel REST API integration is documented to v13. Neon (serverless Postgres) + Drizzle ORM is the dominant 2025 pattern for Vercel serverless SaaS; Drizzle is preferred over Prisma specifically because Prisma's query engine binary causes cold start delays in serverless functions.

Authentication should start with Clerk (not Auth.js) for DX speed and its Organizations feature, which maps well to event planners managing multiple events. Payments are Stripe with Stripe Checkout for PCI compliance. The editor is Craft.js (React-native component builder), which avoids the conversion layer required by GrapesJS. PDF generation uses Puppeteer + `@sparticuz/chromium` in a dedicated compute environment — NOT a standard Vercel serverless function, which cannot fit the Chromium binary. WhatsApp sending uses the Meta Cloud API directly (not Twilio) to avoid per-message markup costs.

**Core technologies:**
- Next.js 16 + React 19.2: full-stack framework, App Router, Vercel-native — confirmed via official blog October 2025
- Neon (Postgres 16) + Drizzle ORM: serverless database, fast cold starts, free tier — dominant 2025 Vercel pattern
- Clerk: auth with Organizations for multi-event planners — start here, migrate to Auth.js if costs become an issue
- Craft.js: in-browser React component editor — keeps template state serializable as JSON without iframe/canvas indirection
- Stripe + Stripe Checkout: subscription billing (Free/Gold/Platinum), hosted checkout for PCI compliance
- Vercel REST API v13 + Octokit: programmatic deployment pipeline and GitHub branch automation — confirmed endpoint shape from official Vercel docs
- Puppeteer + @sparticuz/chromium: server-side PDF generation, pixel-perfect output using the actual template render
- WhatsApp Cloud API (Meta): bulk message sending for Platinum tier, direct REST — cheaper than Twilio at scale
- QStash (Upstash): durable job queue for async deployment polling and WhatsApp bulk dispatch
- Vercel Blob: CDN-backed user asset storage, zero-config for a Vercel-hosted project
- Tailwind CSS 4 + shadcn/ui: styling and accessible component primitives for dashboard UI

### Expected Features

**Must have (table stakes):**
- Template gallery (6-10 templates, 4 wedding + 2-3 baptism minimum) — entry point for every user
- Template preview with mobile toggle — users won't choose without seeing it at quality
- Form-based in-browser editor (names, date, venue, photo) — field editor, NOT drag-and-drop canvas in v1
- Photo upload and CDN storage — couples expect their photo in the invitation
- Vercel publish → shareable URL — the entire value proposition; must be reliable, under 30s
- Mobile-responsive invitation templates — most guests open on phones
- User account with saved invitations and draft/published status
- Free tier with no credit card — reduces signup friction

**Should have (competitive differentiators):**
- WhatsApp bulk send with CSV/manual guest entry (Platinum) — genuine blue ocean for Romanian/EU market
- PDF export A4/A5 (Gold) — bridges digital and physical for print shops and grandparents
- QR code generation on publish (Gold) — trivial add-on once URL exists; bridges print and digital
- Baptism-specific templates — underserved by all English-market competitors; high relevance to Romanian Orthodox market
- Multiple invitations per account: 1 (Free) / 3 (Gold) / Unlimited (Platinum)

**Defer to v2+:**
- RSVP collection — separate product surface with significant backend complexity
- Custom domain mapping — DNS UX is poor; Vercel auto-URLs are sufficient for v1
- Vanity URL slugs — adds routing complexity; low priority for save-the-dates
- Invitation password protection — low demand for the specific use case
- WhatsApp delivery and read receipts — can ship bulk send first, add tracking in v1.1
- Real-time collaborative editing — WebSockets/CRDTs are out of scope
- Email delivery of invitations — not the target channel; adds SPF/DKIM/bounce complexity
- Mobile app — web-first per project spec
- RSVP site / full wedding website builder — Zola/Joy territory; far out of scope

### Architecture Approach

The platform is a Next.js monolith acting as a control plane. It does not host the invitations — each invitation is a separate Vercel project deployment. The editor manipulates a typed JSON config (couple names, dates, venue, photo URLs, color scheme), not raw JSX. At publish time, the Git Automation Service writes the hydrated template and config to an `invitation/{invitationId}` branch, and the Vercel Deploy Pipeline creates/updates the Vercel project and triggers deployment. The database (PostgreSQL) is the authoritative source for invitation state; git branches are deployment artifacts only. Deployment is asynchronous — the UI must poll status via QStash or TanStack Query until `READY` before surfacing the URL to the user.

**Major components:**
1. Platform Web App (Next.js) — control plane UI: browse, edit, publish, manage, billing
2. Template Registry — stores base template React components and their JSON field schemas in DB
3. Template Editor UI — reads schema, renders form controls, autosaves JSON config to DB every 2s
4. Git Automation Service — writes hydrated template + config files to `invitation/{invitationId}` branch via Octokit
5. Vercel Deploy Pipeline — creates Vercel project per invitation, triggers deployment, polls until READY, returns URL
6. PDF Export Service — headless Puppeteer navigates live URL, exports print-ready PDF (runs on dedicated compute, NOT Vercel serverless)
7. WhatsApp Dispatcher — accepts guest list + invitation URL, sends via Meta Cloud API in batches via QStash job queue
8. Subscription / Billing — Stripe webhooks drive tier state in DB; FeatureGate service checks tier server-side on every gated API call
9. Admin Dashboard — visibility into deployments, tiers, send status

### Critical Pitfalls

1. **Vercel project quota exhaustion** — One project per invitation will silently exhaust Vercel plan limits (historically 200 on Pro) before user growth feels meaningful. Build a `DeploymentService` abstraction layer from day one so Vercel can be swapped out. Add a Vercel quota monitor to the admin dashboard. Verify current Pro plan limits before architecture lock-in.

2. **WhatsApp WABA approval delays and post-launch suspension** — Meta's Business Verification is a manual process taking 2-10 days minimum; opaque rejections can extend this indefinitely. More critically, bulk sending without explicit per-recipient opt-in triggers spam classification and account suspension. Start the WABA application in Phase 1 (before WhatsApp feature is built), design Platinum with a "pending approval" fallback state, and implement a daily sending cap in the application layer (250-1,000/day initially).

3. **Template editor scope explosion** — The first 60% of editor features feel fast; the last 40% (responsive preview, undo/redo, WYSIWYG parity, font rendering) take as long as the first 60% combined. Scope v1 ruthlessly: text fields, image replacement, color theme selection only. Define the JSON schema contract before building either the editor or any templates — schema changes later are breaking changes.

4. **Deployment returned as success before polling confirms READY** — If the deploy pipeline returns a URL immediately after triggering (not after polling for READY state), users will receive broken links. Implement a deployment state machine (`pending → building → live | failed`) and poll `GET /v13/deployments/{id}` before surfacing the URL. Keep the last-known-good URL in the database so failed re-deployments don't break existing live links.

5. **Git branch proliferation and repo bloat** — Thousands of long-lived branches slow GitHub operations, make template hotfixes impossible across all live invitations, and have no clean propagation path for bug fixes. Never commit images or build artifacts to git; evaluate whether a config-parameterized single-project Vercel deployment (no git branching) is simpler for v1 and validate the branch-per-invitation model with 100 simulated branches before launch.

---

## Implications for Roadmap

Based on the combined research, the architecture has a clear linear dependency chain from auth through deployment that unlocks the Free tier, after which Gold and Platinum can be built in parallel. Four or five phases is the right granularity.

### Phase 1: Foundation + Free Tier MVP
**Rationale:** Everything downstream — PDF, WhatsApp, billing — depends on the core loop working: auth → edit → publish → shareable URL. This phase builds the entire vertical slice that proves the core differentiator.
**Delivers:** Working Free tier end-to-end. User can sign up, browse templates, customize in-browser, publish to a live Vercel URL, and share it.
**Addresses features:** Template gallery, template preview, form-based editor, photo upload, Vercel deployment, user account with draft/published status
**Critical work in parallel (non-engineering):** Start WhatsApp WABA application and message template submission to Meta immediately — this is off the critical path for Phase 1 engineering but must not be deferred.
**Pitfalls to avoid:** Define JSON schema contract before building editor or templates (Pitfall 4). Build DeploymentService abstraction and deployment status polling now, not later (Pitfalls 1 and 8). Use `invitation/{invitationId}` branch naming, not per-user (Architecture anti-pattern 2). Store all user images in Vercel Blob, not git (Pitfall 9). Render templates client-side only in the editor context to avoid SSR hydration mismatches (Pitfall 11).
**Research flag:** Phase 1 is well-documented; standard patterns apply. However, verify current Vercel Pro plan project limits at vercel.com/pricing before committing to the per-project deployment model.

### Phase 2: Paid Tiers Infrastructure (Stripe)
**Rationale:** Billing must exist before Gold or Platinum features can be gated. Building it as a standalone phase keeps the feature work clean — Gold and Platinum features are built against an already-working gate, not retrofitted.
**Delivers:** Stripe subscription integration (Free/Gold/Platinum), Stripe Checkout, webhook handling, FeatureGate service, tier-gated API routes, user plan management
**Pitfalls to avoid:** Feature access must be enforced server-side via FeatureGate on every API call, never via client-side flags (Pitfall 7). Handle all Stripe webhooks idempotently. Use Stripe test clock to simulate upgrade, downgrade, failed payment, and renewal before going live. Define and document the downgrade policy explicitly before building.
**Research flag:** Stripe billing is well-documented. The edge cases (proration, failed payment grace period, downgrade policy) need explicit product decisions before implementation — not more research, but product design.

### Phase 3: Gold Tier (PDF Export + QR Code)
**Rationale:** PDF export is the simpler of the two paid features (no external account approval required) and can go live as soon as billing is working. QR code is trivial to bundle at the same time.
**Delivers:** PDF export (A4/A5, print-ready) gated behind Gold subscription; QR code generated on publish for Gold users; vanity URL slugs (optional, evaluate complexity)
**Stack:** Puppeteer + @sparticuz/chromium on a dedicated compute environment (Railway, Render, or Fly.io) — NOT a standard Vercel serverless function. This is mandatory, not optional.
**Pitfalls to avoid:** PDF output spec must be defined before implementation — 300 DPI equivalent, explicit `width`/`height`, `printBackground: true`, web font load confirmation before capture (Pitfall 5). Test against an actual print shop before Gold launch. A dedicated PDF generation service is required; do not run Puppeteer in a Vercel serverless function (Pitfall 4 / Architecture anti-pattern 4).
**Research flag:** Puppeteer serverless constraints are well-documented. The choice of dedicated compute provider (Railway vs. Render vs. Fly.io vs. Browserless.io) warrants a brief spike before Phase 3 kicks off.

### Phase 4: Platinum Tier (WhatsApp Bulk Send)
**Rationale:** WhatsApp is the highest-complexity feature (external approval gate, job queue, phone number validation, template compliance). It should not be started until WABA is approved and billing is proven. Building it last lets earlier phases de-risk the foundation it depends on.
**Delivers:** Guest list management (CSV/Excel upload + manual entry), phone number validation (libphonenumber-js), WhatsApp bulk send via Meta Cloud API, send status tracking per guest
**Stack:** WhatsApp Cloud API direct (not Twilio), QStash job queue for async dispatch, PapaParse + xlsx for CSV/Excel parsing, libphonenumber-js for E.164 validation
**Prerequisite gate:** WABA must be in "Approved" status and at least one message template must be Meta-approved before Platinum is unlocked in production
**Pitfalls to avoid:** Never send without WABA approval (account suspension = Platinum entirely non-functional) (Pitfall 2). Apply daily sending cap in application layer from day one (250-1,000/day initially). Validate all phone numbers to E.164 at CSV import time, not at send time (Pitfall 10). Process WhatsApp sends in async job queue — never in a synchronous HTTP request handler (Architecture anti-pattern 5). Whitelist only approved template IDs in the DB; never reconstruct template content dynamically (Pitfall 6).
**Research flag:** Meta's WhatsApp Cloud API rate limits, per-message pricing for Romania/EU market, and current template content policies should be verified against live Meta documentation before Phase 4 planning. These change frequently.

### Phase 5: Admin Dashboard + Hardening
**Rationale:** Admin tooling is read-mostly and depends on a mature data model from all prior phases. Building it last avoids premature optimization of an incomplete system.
**Delivers:** Admin dashboard (deployment status, billing overview, WABA quality rating monitor), Vercel quota monitor and alert, billing reconciliation job, branch cleanup cron, performance hardening
**Pitfalls to avoid:** Include Vercel project quota monitor as a mandatory admin feature (Pitfall 1). Add billing state reconciliation job that corrects desync between Stripe and local DB (Pitfall 7). Add branch cleanup job for deleted/expired invitations (Pitfall 3).
**Research flag:** Standard CRUD dashboard; no additional research needed.

### Phase Ordering Rationale

- Steps 1-4 in ARCHITECTURE.md's suggested build order (auth → DB schema → template registry → editor) must complete inside Phase 1 because they are sequential dependencies.
- Billing (Phase 2) gates everything else — building Gold/Platinum features without a working FeatureGate is risky because feature access can silently bypass tier checks if billing lands later.
- Gold (Phase 3) is simpler than Platinum and has no external approval dependency, making it the right first paid tier to ship.
- Platinum (Phase 4) has the WABA approval dependency, which is a hard external gate. Starting WABA in Phase 1 means the approval process runs in parallel with Phases 1-3, arriving (ideally) before Phase 4 begins.
- Admin and hardening (Phase 5) are last because they observe a complete system — building them earlier means rebuilding them as the data model matures.

### Research Flags

Phases needing deeper research or spikes during planning:

- **Phase 1:** Verify current Vercel Pro plan project limits before committing to per-invitation Vercel project model. If limits are too low, evaluate the config-parameterized single-project alternative as a fallback (one Vercel project, path-based routing per invitation). This is an architectural fork that must be resolved before Phase 1 begins.
- **Phase 3:** Spike on dedicated PDF compute provider selection (Railway vs. Render vs. Fly.io vs. Browserless.io) — compare cold start behavior, cost per PDF, and deployment complexity before Phase 3 kicks off.
- **Phase 4:** Verify WhatsApp Cloud API per-message pricing for Romania/EU market and current rate limits per business tier. Also verify current Meta template content policy for event invitations (utility vs. marketing classification affects cost and volume limits).

Phases with well-documented patterns (skip `/gsd:research-phase`):

- **Phase 2 (Stripe billing):** Well-documented. Product decisions (downgrade policy, proration behavior) need to be made, but engineering patterns are standard. Use Stripe's own test clock tooling.
- **Phase 5 (Admin dashboard):** Standard CRUD UI on top of existing data model. No novel patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Next.js 16 and Vercel REST API v13 are HIGH (confirmed official sources). Craft.js, Drizzle, Neon, Clerk, QStash are MEDIUM (dominant community patterns; version numbers need npm verification before scaffold). |
| Features | MEDIUM | Competitive landscape based on training data through mid-2025; live competitor pricing and feature sets should be verified before roadmap finalization. Core feature set is stable. |
| Architecture | MEDIUM-HIGH | Vercel deployment flow confirmed via official docs. Git automation via Octokit is standard. Puppeteer serverless constraint is well-documented community pattern. WhatsApp batch dispatch pattern is MEDIUM (training knowledge). |
| Pitfalls | HIGH | Critical pitfalls (Vercel quota, WABA approval, editor scope explosion, deployment async handling) are consistent across multiple independent sources and are based on standard behavior of documented systems. PDF DPI/font issues are HIGH confidence from established Puppeteer usage patterns. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Vercel project quota numbers:** Exact current limits for Pro vs. Enterprise plans are not confirmed. This must be verified at vercel.com/pricing before Phase 1 architecture is locked. The fallback architecture (path-based routing in a single project) must be designed at the same time in case limits are lower than expected.
- **WhatsApp pricing for Romanian market:** Meta's per-message pricing varies by destination country. The unit economics of Platinum tier depend on this. Verify before pricing the Platinum subscription.
- **Craft.js production readiness:** Craft.js has strong community reputation but WebFetch was denied during research. Verify current maintenance status, Next.js 16 compatibility, and production case studies at github.com/prevwong/craft.js before committing to it as the editor foundation. If it has known issues with Next.js App Router, the fallback is a hand-rolled form-based editor (which FEATURES.md recommends for v1 anyway as a simpler alternative).
- **Downgrade and proration policy:** This is a product decision (not a research gap) that must be made before Phase 2 begins. "Features accessible until end of current billing period" vs. "immediate lockout on downgrade" has significant UX and support implications.
- **Romanian VAT / EU tax compliance for SaaS:** STACK.md notes that Paddle/Lemon Squeezy are merchant-of-record options that handle EU VAT automatically. Stripe requires you to handle VAT collection and remittance yourself. For a Romanian-market product, this is a non-trivial compliance question. Validate the tax handling approach before billing goes live.

---

## Sources

### Primary (HIGH confidence)
- Next.js 16 official blog — https://nextjs.org/blog/next-16 (October 21, 2025)
- Vercel REST API v13 deployment endpoint — https://vercel.com/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment (fetched March 2026)
- Vercel deployments overview — https://vercel.com/docs/deployments/overview (fetched March 2026)
- Vercel project creation API — https://vercel.com/docs/rest-api/reference/projects/create-a-new-project (fetched March 2026)

### Secondary (MEDIUM confidence)
- Craft.js GitHub (prevwong/craft.js) — React component editor, 7k+ stars mid-2025
- Drizzle ORM (orm.drizzle.team) — TypeScript ORM, dominant 2025 Vercel pattern
- Neon serverless Postgres (neon.tech) — serverless Postgres with free tier, Vercel integration
- Stripe Node.js SDK (stripe/stripe-node) — subscription billing, industry standard
- @sparticuz/chromium (GitHub) — slim Chromium binary for Vercel serverless
- QStash by Upstash (upstash.com/docs/qstash) — durable HTTP queue, serverless-native
- WhatsApp Cloud API (developers.facebook.com/docs/whatsapp) — Meta-official bulk messaging API
- Clerk (clerk.com/docs) — auth with Organizations
- Vercel Blob (vercel.com/docs/storage/vercel-blob) — CDN-backed asset storage
- Competitive landscape: Zola, Greenvelope, Paperless Post, Joy, Evite — training knowledge through mid-2025

### Tertiary (LOW-MEDIUM confidence — verify before implementation)
- Vercel Pro plan project limits — https://vercel.com/pricing (current numbers not confirmed)
- WhatsApp Cloud API per-message pricing for Romania/EU — https://developers.facebook.com/docs/whatsapp/pricing (changes frequently)
- Meta WABA approval process timeline — training knowledge, consistent across sources but process may have changed

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
