# Technology Stack

**Project:** Save the Date / Wedding Invitation SaaS
**Researched:** 2026-03-09
**Research Mode:** Ecosystem — standard 2025 stack for template-based SaaS with in-browser editing, per-user Vercel deployments, PDF export, WhatsApp Business API, and tiered subscriptions

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 16.x | Full-stack framework, app shell, API routes, SSR/SSG | Official blog confirmed v16 released Oct 2025. App Router is the stable default. Turbopack is now the default bundler. Natural fit for Vercel deployment. React 19.2 included. |
| React | 19.2 | UI layer | Bundled with Next.js 16. View Transitions API enables smooth invitation preview animations. React Compiler (stable in v16) reduces manual memoization. |
| TypeScript | 5.1+ | Type safety | Required minimum for Next.js 16. Strong typing is essential for template schema, tier checks, and Vercel API response shapes. |

**Confidence:** HIGH — verified via [https://nextjs.org/blog/next-16](https://nextjs.org/blog/next-16), published October 21, 2025.

---

### In-Browser Template Editor

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Craft.js | 0.2.x | React-native page builder / drag-drop editor | Designed specifically for building React component editors. User edits React components directly — the serialized state (JSON) maps 1:1 to the template props that get deployed. No canvas/iframe indirection. Actively maintained on GitHub with 7k+ stars as of mid-2025. |
| Zustand | 4.x | Editor state management | Lighter than Redux for managing editor selection state, undo/redo history, and template prop diffs. Works seamlessly alongside Craft.js's own state. |

**Confidence:** MEDIUM — Craft.js is well-documented and the most purpose-built option for React component editing. Version numbers estimated from training data; verify latest at https://github.com/prevwong/craft.js before install.

**Why NOT GrapesJS:** GrapesJS targets HTML/CSS drag-drop, not React component trees. Deploying a GrapesJS output as a React static site requires a conversion layer that adds fragility. Craft.js keeps the entire stack in React.

**Why NOT TipTap/Lexical (standalone):** These are rich-text editors, not component-level editors. They handle text fields within the invitation template (embed them as Craft.js leaf nodes), not the template structure itself.

---

### PDF Export (Gold tier)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Puppeteer (via @sparticuz/chromium) | 21.x / latest | Headless browser PDF generation | Renders the actual deployed invitation URL (or a server-side preview URL) in a real Chromium instance and exports it as PDF. Produces pixel-perfect output because it uses the exact same rendering engine as Chrome. Critical for print-quality A4/A5 exports. |
| @sparticuz/chromium | 123.x | Chromium binary compatible with Vercel Serverless (Lambda) | The standard Puppeteer Chromium binary is too large for Vercel serverless functions. @sparticuz/chromium is the community-maintained slim binary that fits within the 250MB Lambda limit. |

**Confidence:** MEDIUM — Puppeteer + @sparticuz/chromium is the widely-adopted pattern for Vercel serverless PDF generation (confirmed in multiple community guides through 2025). Verify Lambda size limits haven't changed at Vercel docs before finalizing.

**Why NOT @react-pdf/renderer:** react-pdf renders a separate React-to-PDF component tree. That means maintaining TWO render paths (web template + PDF template) that must be kept in sync. With Puppeteer, the PDF IS the web invitation — zero duplication.

**Why NOT jsPDF:** DOM manipulation approach is unreliable for complex CSS layouts. Print fidelity is poor.

**Alternative if Puppeteer proves too heavy for serverless:** Use a Vercel Background Function or an external render service (e.g., Browserless.io) instead of an inline serverless function. Flag this as a Phase risk.

---

### Automated Vercel Deployment (per invitation)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel REST API v13 | v13 | Programmatic project creation and deployment | Confirmed: `POST /v13/deployments` accepts `files[]` array with inline file content or SHA references, `projectSettings.framework`, and returns `{ id, url, status }`. No SDK needed — native `fetch` suffices. |
| GitHub API (via Octokit) | @octokit/rest 20.x | Push invitation template code to per-user branch | PROJECT.md constraint: "each published invitation creates/updates a branch named after the user — pipeline pushes template to that branch before Vercel picks it up." Octokit handles branch creation, file commits, and push. Vercel's GitHub integration then triggers automatically on branch push. |

**Confidence:** HIGH for Vercel REST API — endpoint shape confirmed via [https://vercel.com/docs/deployments/overview](https://vercel.com/docs/deployments/overview) official docs. MEDIUM for Octokit — well-established library, version from training data.

**Deployment flow (confirmed from Vercel docs):**
1. User clicks "Publish"
2. Backend calls GitHub API (Octokit) to push template files to `users/{userId}` branch
3. Vercel GitHub integration triggers deployment automatically on branch push
4. Backend polls `GET /v13/deployments/{id}` until `status === "READY"`
5. Return the deployment URL to the user

**Alternative direct-upload approach:** Skip GitHub and use `POST /v13/deployments` with inline `files[]`. Simpler, but loses Git history. Recommended for Phase 1 MVP simplicity; switch to branch-per-user if auditability becomes important.

---

### WhatsApp Business API (Platinum tier)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| WhatsApp Cloud API (Meta) | v19+ | Bulk message sending | Official Meta-hosted API. No self-hosted infrastructure required. Requires a Meta Business account, verified phone number, and approved message templates. Supports sending up to 1,000 unique users/day on the free tier; more with tiered limits as trust builds. |
| `node-fetch` or native `fetch` | Built-in (Node 18+) | HTTP client for WhatsApp Cloud API calls | The WhatsApp Cloud API is a REST API. No official Node.js SDK exists — use native fetch with typed wrapper functions. The `POST /messages` endpoint handles sending. |

**Confidence:** MEDIUM — WhatsApp Cloud API capabilities based on training data (Meta documentation). Rate limits and pricing tiers change frequently. Verify at [https://developers.facebook.com/docs/whatsapp/cloud-api/](https://developers.facebook.com/docs/whatsapp/cloud-api/) before implementation.

**Critical constraint:** WhatsApp requires pre-approved message templates for bulk sending. The invitation URL cannot be sent as freeform text in bulk — it must be part of an approved template (e.g., `"You're invited! View your invitation here: {{1}}"`). Template approval takes 1–7 days. Build this into the Platinum onboarding flow.

**Why NOT Twilio for WhatsApp:** Twilio adds a per-message markup on top of Meta's own costs (~$0.005–$0.015/message). For a product where bulk sending is the premium differentiator, going direct to Meta Cloud API is cheaper and more configurable.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Auth.js (NextAuth) | v5.x | User auth, session management | v5 (auth.js) is fully compatible with Next.js App Router and Edge runtime. Supports OAuth (Google, Facebook — relevant for wedding demographic) and email magic links. No separate auth service costs. |

**Confidence:** MEDIUM — Auth.js v5 released as stable in 2024; Next.js 16 compatibility expected but verify at [https://authjs.dev](https://authjs.dev).

**Alternative — Clerk:** Better DX, built-in user management UI, organization support (for event planners managing multiple events). Monthly cost ($25–$35+/month at scale). Choose Clerk if the team is small and DX speed matters more than cost. Choose Auth.js if you want zero auth costs.

**Recommendation:** Start with Clerk for speed. The event planner use case (multiple events per account) maps well to Clerk's Organizations feature. Migrate to Auth.js if costs become a concern.

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| PostgreSQL (via Neon) | Postgres 16 | Primary data store — users, invitations, subscriptions, template configs | Neon is serverless Postgres with connection pooling built for Vercel serverless. Auto-scales to zero. Free tier available. Pairs directly with Vercel's Storage marketplace. |
| Drizzle ORM | 0.30.x | Type-safe query builder and migrations | Drizzle generates TypeScript types from schema — critical for safely serializing/deserializing invitation template configs (stored as JSONB). Lightweight vs. Prisma; no Prisma Engine binary weight. Native SQL when needed. |

**Confidence:** MEDIUM — Neon + Drizzle is the dominant 2025 pattern for Vercel-hosted Next.js SaaS apps. Version numbers from training data; verify at https://orm.drizzle.team and https://neon.tech before install.

**Why NOT Prisma:** Prisma's query engine binary causes cold start delays in Vercel serverless functions. Drizzle is pure JS/TS, so it cold-starts faster.

**Why NOT PlanetScale:** PlanetScale removed its free tier in 2024. Neon maintains a free tier.

**Why NOT MongoDB:** Template configs are relational (user → invitations → guests → messages). Postgres JSONB handles flexible template data within a relational model better than a document store.

---

### Payments / Subscriptions

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Stripe | stripe@17.x | Subscription billing for Free/Gold/Platinum tiers | Industry standard. Stripe Billing handles recurring charges, tier upgrades/downgrades, proration, and webhooks for subscription state changes. Stripe Customer Portal allows users to self-manage plans. |
| Stripe Checkout | Built into Stripe | Hosted checkout page | Use Stripe-hosted Checkout for PCI compliance out of the box. No custom payment form to build or maintain. |

**Confidence:** MEDIUM — Stripe is the unambiguous standard for SaaS billing. Version number estimate; verify latest at https://github.com/stripe/stripe-node.

**Subscription model mapping:**
```
Free     → Stripe Price: $0/month   → feature flags: { pdf: false, whatsapp: false }
Gold     → Stripe Price: $X/month   → feature flags: { pdf: true, whatsapp: false }
Platinum → Stripe Price: $Y/month   → feature flags: { pdf: true, whatsapp: true }
```
Store `stripeCustomerId`, `subscriptionId`, and `tier` on the User record in Postgres. Check tier server-side on every feature-gated API route.

---

### File Storage (invitation images/assets)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel Blob | @vercel/blob 0.22.x | Store user-uploaded photos for invitations | Native Vercel product. Zero configuration. Returned URLs are CDN-backed and work directly as `src` attributes in templates. Free tier: 500MB. |

**Confidence:** MEDIUM — Vercel Blob is the obvious choice for a Vercel-hosted project; avoids S3 bucket configuration entirely. Verify current pricing/limits at https://vercel.com/docs/storage/vercel-blob.

**Alternative:** Cloudinary if advanced image transformation (cropping, filters) is needed. Adds cost and complexity. Defer until user research validates demand.

---

### Queue / Background Jobs

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel Background Functions (or QStash) | N/A / QStash v2 | Async deployment polling, bulk WhatsApp sending | Vercel deployments are async — polling must happen outside the user's request. WhatsApp bulk sends (potentially 100s of messages) must not block HTTP responses. QStash (by Upstash) is an HTTP-based durable queue that works with Vercel serverless. |

**Confidence:** MEDIUM — QStash is the established pattern for durable queues on Vercel (no Redis/SQS required). Verify limits at https://upstash.com/docs/qstash/overall/getstarted.

**Why NOT BullMQ/Redis:** Requires persistent Redis connection. Vercel serverless functions are stateless; a persistent Redis instance works but adds operational complexity. QStash is serverless-native.

---

### UI Component Library

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Utility-first styling | Tailwind v4 ships with a new Vite/PostCSS pipeline and works with Turbopack (Next.js 16 default). Zero-config design system integration. |
| shadcn/ui | Latest (not versioned — copy-paste) | Accessible component primitives for dashboard UI | shadcn components are copied into the project, not imported from npm. Tailwind-native. Used for forms, modals, table (guest list), navigation, settings pages. Do NOT use for the invitation templates themselves — those are custom React components. |

**Confidence:** MEDIUM — Tailwind v4 is current as of 2025; shadcn/ui is the standard companion. Verify Tailwind v4 + Turbopack compatibility at https://tailwindcss.com/docs/installation/framework-guides before scaffolding.

---

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hook Form + Zod | 7.x / 3.x | Form validation | Guest list entry, customization forms, plan upgrade forms. Zod schemas validate at API boundary too. |
| TanStack Query (React Query) | 5.x | Server state management | Polling deployment status, fetching invitation list. Avoids manual loading/error state. |
| Papa Parse | 5.x | CSV parsing | Guest list CSV upload (Platinum feature). Runs in-browser — no server round-trip for parsing. |
| xlsx (SheetJS) | 0.18.x | Excel parsing | Guest list Excel upload (Platinum feature). Only include if CSV alone is insufficient. |
| date-fns | 3.x | Date formatting | Wedding date display in invitation templates. Locale-aware. |
| sharp | 0.33.x | Image optimization on server | Resize/compress uploaded photos before storing in Vercel Blob. Runs in Next.js API routes. |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Framework | Next.js 16 | Remix / Astro | Remix lacks Vercel deployment API integration depth. Astro is better for content-only sites; we need React interactivity for the editor. |
| Editor | Craft.js | GrapesJS | GrapesJS outputs HTML, not React. Requires conversion layer for Vercel deployment. |
| PDF | Puppeteer + @sparticuz/chromium | @react-pdf/renderer | Two render paths to maintain (web + PDF). Puppeteer renders the actual invitation. |
| Auth | Clerk | Auth.js v5 | Clerk costs money but saves weeks. Auth.js is free but requires more boilerplate. Start with Clerk, migrate later. |
| Database | Neon (Postgres) | PlanetScale | PlanetScale removed free tier. Neon has free tier and native Vercel integration. |
| ORM | Drizzle | Prisma | Prisma query engine binary causes serverless cold start issues on Vercel. |
| Queue | QStash | BullMQ + Redis | Redis requires persistent connection; QStash is serverless-native. |
| WhatsApp | Meta Cloud API direct | Twilio for WhatsApp | Twilio adds per-message cost markup. Direct Meta API is cheaper for bulk sending at scale. |
| Storage | Vercel Blob | AWS S3 | S3 requires IAM config, bucket policies, CORS. Vercel Blob is zero-config. |
| Payments | Stripe | Paddle / Lemon Squeezy | Paddle/LS are merchant-of-record options. Useful for avoiding VAT complexity in EU — reconsider if targeting European market primarily. |

---

## Installation

```bash
# Core framework
npx create-next-app@latest wedding-app --typescript --tailwind --app --turbopack

# ORM + Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Auth
npm install @clerk/nextjs

# Payments
npm install stripe @stripe/stripe-js

# Editor
npm install @craftjs/core

# State management
npm install zustand @tanstack/react-query

# Forms + validation
npm install react-hook-form zod @hookform/resolvers

# File handling
npm install papaparse xlsx sharp
npm install -D @types/papaparse

# PDF generation (server-side, Vercel serverless)
npm install puppeteer-core @sparticuz/chromium

# Blob storage
npm install @vercel/blob

# Queue
npm install @upstash/qstash

# GitHub API (for branch-per-user deployment flow)
npm install @octokit/rest

# Date utilities
npm install date-fns
```

---

## Confidence Assessment by Area

| Area | Confidence | Basis |
|------|------------|-------|
| Next.js 16 | HIGH | Official Next.js blog, October 2025 |
| Vercel REST API v13 | HIGH | Official Vercel docs, confirmed endpoint shape |
| Craft.js for editor | MEDIUM | Community reputation; WebFetch to craftjs.org denied; verify at GitHub |
| Puppeteer PDF strategy | MEDIUM | Established Vercel pattern; @sparticuz/chromium version needs verification |
| Stripe for billing | MEDIUM | Industry standard; version number needs npm verification |
| Auth.js / Clerk | MEDIUM | Both are current; Clerk recommended but verify Next.js 16 support |
| Drizzle + Neon | MEDIUM | Dominant 2025 Vercel pattern; versions need verification |
| WhatsApp Cloud API | MEDIUM | Meta-official API; rate limits and template requirements verified via training |
| QStash for queues | MEDIUM | Established pattern; verify current limits before committing |
| Tailwind v4 + shadcn | MEDIUM | Both current; verify Turbopack v4 compatibility |

---

## Version Verification Checklist

Before scaffolding, verify these at their official sources (WebFetch was denied for most during research):

- [ ] `@craftjs/core` — latest version: `npm view @craftjs/core version`
- [ ] `drizzle-orm` — latest version: `npm view drizzle-orm version`
- [ ] `stripe` — latest version: `npm view stripe version`
- [ ] `@sparticuz/chromium` — latest version + confirmed Lambda size fit: GitHub releases
- [ ] `puppeteer-core` — compatible version with chosen @sparticuz/chromium
- [ ] `@clerk/nextjs` — Next.js 16 support: authjs.dev or clerk.com/docs
- [ ] `tailwindcss` v4 — Turbopack compatibility: tailwindcss.com
- [ ] QStash limits — message size and rate limits: upstash.com/docs/qstash
- [ ] WhatsApp Cloud API — current rate limits per tier: developers.facebook.com/docs/whatsapp

---

## Sources

| Source | URL | Confidence | Date |
|--------|-----|------------|------|
| Next.js 16 release blog | https://nextjs.org/blog/next-16 | HIGH | October 21, 2025 |
| Vercel Deployment API docs | https://vercel.com/docs/deployments/overview | HIGH | Fetched March 2026 |
| Vercel REST API endpoint | https://vercel.com/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment | HIGH | Fetched March 2026 |
| Craft.js GitHub | https://github.com/prevwong/craft.js | MEDIUM | Training data — verify |
| Drizzle ORM | https://orm.drizzle.team | MEDIUM | Training data — verify |
| Neon serverless Postgres | https://neon.tech | MEDIUM | Training data — verify |
| Stripe Node.js SDK | https://github.com/stripe/stripe-node | MEDIUM | Training data — verify |
| @sparticuz/chromium | https://github.com/Sparticuz/chromium | MEDIUM | Training data — verify |
| QStash by Upstash | https://upstash.com/docs/qstash | MEDIUM | Training data — verify |
| WhatsApp Cloud API | https://developers.facebook.com/docs/whatsapp/cloud-api | MEDIUM | Training data — verify |
| Clerk auth | https://clerk.com/docs | MEDIUM | Training data — verify |
| Vercel Blob | https://vercel.com/docs/storage/vercel-blob | MEDIUM | Training data — verify |
