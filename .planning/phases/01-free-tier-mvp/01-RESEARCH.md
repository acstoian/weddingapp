# Phase 1: Free Tier MVP - Research

**Researched:** 2026-03-09
**Domain:** Next.js 16 + Clerk + Neon/Drizzle + Vercel Blob + Octokit + Vercel REST API + Resend + SSE
**Confidence:** HIGH (all critical flags resolved via official docs; see per-area breakdown)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Next.js 16 App Router + Clerk + Neon/Drizzle + Vercel Blob
- Field-based form editor (NOT drag-and-drop canvas)
- Template JSON schema: title + names + date/time + venue + cover photo + personal message + dress code/RSVP note
- 6 templates: 3 minimal wedding + 1 decorative + 2 minimal baptism — production-ready with Google Fonts
- Gallery: card grid + filter tabs (All/Wedding/Baptism) + full-screen preview with mobile toggle
- Editor: left sidebar (fields) + right live preview; mobile = tab switcher
- Publish: confirmation dialog → inline progress in sidebar → success with URL + Copy + Open
- Email on publish via Resend
- Re-publish updates same Vercel URL in place (no new project)
- Delete invitation removes Vercel project
- Dashboard: card grid, status badge (Draft/Publishing/Live), welcome empty state
- Free tier: 3 drafts, 1 published
- i18n: RO/EN toggle in header nav, RO default
- Auto-generated Vercel URL (no custom slug in v1)
- Invitation title = user-set, first field in editor
- Pricing page in Phase 1 (Stripe Checkout inactive — "Coming soon")

### Claude's Discretion
- Loading skeleton design for gallery and dashboard
- Exact card hover states and animation
- Toast vs inline error messages for non-publish errors
- Color palette, exact typography choices within minimal/decorative style guidelines
- Pricing page layout details (Phase 2 will wire the actual Stripe Checkout)
- Form field validation error styling

### Deferred Ideas (OUT OF SCOPE)
- RSVP form / response tracking
- Real-time collaboration / multi-user editing
- Custom domain per invitation
- Animated/video invitation templates
- Template marketplace (third-party templates)
- Invitation analytics (view count, link clicks)
- Manual crop/reposition tool for uploaded photos
- Onboarding tour or tooltips
- Help/support link in nav
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| REQ-01 | User can browse a gallery of wedding/baptism invitation templates | Template registry pattern, gallery UI with filter tabs |
| REQ-02 | User can customize a template in-browser (text, images, sections) | Form-based editor + Zod schema + autosave pattern |
| REQ-04 | Free tier: template selection + customization + Vercel deployment + shareable URL | Full publish pipeline researched |
| REQ-08 | On publish, a Vercel project is created/deployed per invitation and URL is returned to user | Vercel REST API v13 + Octokit branch writes confirmed |
</phase_requirements>

---

## Summary

Phase 1 delivers the entire Free tier vertical slice: auth → gallery → editor → publish pipeline → shareable URL → dashboard. All 8 critical research flags have been resolved against official documentation. The most important finding is that **Vercel Pro plan has unlimited projects** (Hobby is capped at 200), which resolves the architectural fork. The per-invitation Vercel project model is valid under Pro. The DeploymentService abstraction is still mandatory as a Phase 5 quota monitor integration point, but the immediate risk of hitting limits is eliminated on Pro.

The second most important finding is that **Clerk v7.0.1 explicitly supports Next.js 16** (`^16.0.10 || ^16.1.0-0` in peer dependencies). No compatibility workaround needed. Clerk v7 uses `clerkMiddleware()` from `@clerk/nextjs/server` as the standard App Router middleware setup.

The full technology stack is verified at current versions: `@clerk/nextjs@7.0.1`, `drizzle-orm@0.45.1`, `@neondatabase/serverless@1.0.2`, `@octokit/rest@22.0.1`, `@vercel/blob@2.3.1`, `resend@6.9.3`. SSE in Next.js App Router uses native `ReadableStream` — no additional library needed. The Vercel REST API v13 deployment flow (gitSource → branch push → poll for READY) is confirmed from official docs.

**Primary recommendation:** Use Vercel Pro plan (unlimited projects). Build the DeploymentService abstraction interface now — Phase 5 plugs the quota monitor into it. All 7 sub-plans can proceed against the verified stack.

**UI work note:** The ui-ux-pro-max skill is available at `.claude/skills/ui-ux-pro-max/`. All UI work in plans 01-03 through 01-05 must run the design system script before implementing components. Stack = `nextjs` + `shadcn`. Pattern: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "wedding invitation saas elegant minimal" --design-system -p "Save the Date"`.

---

## Standard Stack

### Core (Phase 1 scope)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.x | Full-stack framework, App Router, API routes | Framework + host from same team; confirmed Oct 2025 |
| React | 19.2 | UI layer | Bundled with Next.js 16 |
| TypeScript | 5.1+ | Type safety for schema, API shapes | Required by Next.js 16 minimum |
| @clerk/nextjs | 7.0.1 | Auth, session, middleware | Supports Next.js `^16.x`; confirmed in peerDeps |
| drizzle-orm | 0.45.1 | Type-safe ORM, migrations | Pure JS, no binary, fast cold starts |
| @neondatabase/serverless | 1.0.2 | Serverless Postgres HTTP driver | Designed for Vercel/serverless; no TCP connections |
| drizzle-kit | latest | Migration CLI | Paired with drizzle-orm |
| @vercel/blob | 2.3.1 | CDN-backed user asset storage | Zero-config, native Vercel product |
| @octokit/rest | 22.0.1 | GitHub REST API client for branch automation | Official GitHub SDK, serverless-safe |
| resend | 6.9.3 | Transactional email | Simple API, React template support |
| tailwindcss | 4.x | Utility-first styling | Turbopack-compatible, CSS-native |
| shadcn/ui | latest (copy-paste) | Accessible component primitives | Tailwind-native, copied into project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-hook-form | 7.x | Form state management | Editor field forms, all form validation |
| zod | 3.x | Schema validation | Template JSON schema type + API boundaries |
| @hookform/resolvers | 3.x | Connects Zod to RHF | Always paired with react-hook-form + zod |
| @tanstack/react-query | 5.x | Server state, SSE polling | Deployment status polling, invitation list |
| date-fns | 3.x | Date formatting with locale | Wedding date display in templates |
| lucide-react | latest | SVG icon set | Dashboard icons (ui-ux-pro-max: no emoji icons) |
| next-intl | 3.x | i18n (RO/EN) | Language toggle in nav, RO default |

### Phase 1 Installation

```bash
# Scaffold
npx create-next-app@latest wedding-app --typescript --tailwind --app --turbopack

# Auth
npm install @clerk/nextjs

# ORM + DB
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# Storage
npm install @vercel/blob

# Git automation
npm install @octokit/rest

# Email
npm install resend

# Forms + validation
npm install react-hook-form zod @hookform/resolvers

# Data fetching + state
npm install @tanstack/react-query

# i18n
npm install next-intl

# Date utilities
npm install date-fns

# Icons
npm install lucide-react
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Clerk auth routes (sign-in, sign-up)
│   ├── (dashboard)/
│   │   ├── dashboard/           # Invitation card grid
│   │   ├── gallery/             # Template selection (not standalone page)
│   │   ├── editor/[id]/         # In-browser field editor
│   │   └── pricing/             # Static pricing page (Stripe inactive)
│   └── api/
│       ├── invitations/         # CRUD, autosave
│       ├── publish/             # Trigger deploy pipeline
│       ├── deploy-status/[id]/  # SSE stream for deployment status
│       ├── upload/              # Vercel Blob photo upload
│       └── webhooks/            # Future (Stripe Phase 2)
├── components/
│   ├── ui/                      # shadcn/ui copied components
│   ├── templates/               # 6 invitation template React components
│   ├── editor/                  # Editor sidebar + live preview
│   ├── gallery/                 # Gallery grid + preview modal
│   └── dashboard/               # Dashboard cards + empty state
├── lib/
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema
│   │   └── index.ts             # Neon connection
│   ├── services/
│   │   ├── deployment.service.ts  # DeploymentService abstraction
│   │   ├── git.service.ts         # Octokit operations
│   │   └── vercel.service.ts      # Vercel REST API calls
│   ├── templates/
│   │   ├── registry.ts          # Template metadata + schema
│   │   └── schema.ts            # InvitationFieldSchema (Zod)
│   └── feature-gate.ts          # Stub for Phase 2 wiring
├── middleware.ts                 # Clerk clerkMiddleware()
└── i18n/
    ├── ro.json
    └── en.json
```

### Pattern 1: DeploymentService Abstraction (MANDATORY)

**What:** All Vercel API calls go through a `DeploymentService` interface. No component or API route calls Vercel directly.

**Why:** Vercel Pro is unlimited projects but Phase 5 adds a quota monitor that hooks into this interface. When the monitor detects approaching limits, it can route to an alternative deployment backend without touching call sites.

```typescript
// Source: architecture decision from ARCHITECTURE.md + PITFALLS.md
// lib/services/deployment.service.ts
export interface DeploymentService {
  createOrUpdateProject(invitationId: string, templateBranch: string): Promise<{ projectId: string; url: string }>
  triggerDeploy(projectId: string, branch: string): Promise<{ deploymentId: string }>
  pollStatus(deploymentId: string): Promise<'QUEUED' | 'BUILDING' | 'READY' | 'ERROR'>
  deleteProject(projectId: string): Promise<void>
}

// lib/services/vercel.service.ts
export class VercelDeploymentService implements DeploymentService { ... }
```

### Pattern 2: Invitation State Machine

**What:** The `invitations` table has a `status` column with enum: `DRAFT | PUBLISHING | LIVE | FAILED`.

**When to use:** Every state transition is explicit. The editor shows the correct UI (inline progress vs. success) based on DB status, not client-side state.

```typescript
// Source: PITFALLS.md Pitfall 8 — confirmed pattern
// lib/db/schema.ts
export const invitationStatusEnum = pgEnum('invitation_status', [
  'DRAFT', 'PUBLISHING', 'LIVE', 'FAILED'
]);

export const invitations = pgTable('invitations', {
  id:              uuid('id').primaryKey().defaultRandom(),
  userId:          text('user_id').notNull(),       // Clerk user ID
  templateId:      text('template_id').notNull(),
  title:           text('title').notNull().default(''),
  fields:          jsonb('fields').notNull().$type<InvitationFields>(),
  status:          invitationStatusEnum('status').notNull().default('DRAFT'),
  vercelProjectId: text('vercel_project_id'),
  vercelDeployId:  text('vercel_deploy_id'),
  liveUrl:         text('live_url'),                // last-known-good URL
  lastPublishedAt: timestamp('last_published_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
});
```

### Pattern 3: Template JSON Schema Contract (LOCKED — define before any template is built)

**What:** All 6 templates read from a single `InvitationFields` type. The editor renders form controls from this schema. The deployed Vercel site reads the same JSON.

```typescript
// Source: CONTEXT.md Template JSON Schema Contract
// lib/templates/schema.ts
import { z } from 'zod'

export const InvitationFieldsSchema = z.object({
  title:          z.string().min(1),       // user-set invitation name (first field)
  names:          z.string().min(1),       // couple names or child name
  eventDatetime:  z.string(),             // ISO 8601
  venueName:      z.string(),
  venueAddress:   z.string(),
  coverPhotoUrl:  z.string().url().optional(),  // Vercel Blob CDN URL
  personalMessage: z.string().max(500).optional(),
  dresscodeRsvpNote: z.string().optional(),
})

export type InvitationFields = z.infer<typeof InvitationFieldsSchema>
```

### Pattern 4: Octokit Branch-Per-Invitation Write

**What:** On publish, the Git Automation Service creates or updates an `invitation/{invitationId}` branch and writes the template config file.

**Operations required (confirmed from GitHub REST API docs):**

```typescript
// Source: GitHub REST API docs + ARCHITECTURE.md
// lib/services/git.service.ts
import { Octokit } from '@octokit/rest'

const octokit = new Octokit({ auth: process.env.GITHUB_PAT })

// 1. Get default branch SHA
const { data: ref } = await octokit.git.getRef({
  owner: 'acstoian', repo: 'weddingapp', ref: 'heads/main'
})
const baseSha = ref.object.sha

// 2. Create branch if it doesn't exist
await octokit.git.createRef({
  owner: 'acstoian', repo: 'weddingapp',
  ref: `refs/heads/invitation/${invitationId}`,
  sha: baseSha,
})

// 3. Write invitation-config.json to branch
await octokit.repos.createOrUpdateFileContents({
  owner: 'acstoian', repo: 'weddingapp',
  path: `invitations/${invitationId}/invitation-config.json`,
  message: `chore: update invitation ${invitationId}`,
  content: Buffer.from(JSON.stringify(fields)).toString('base64'),
  branch: `invitation/${invitationId}`,
  // sha: currentFileSha  // required for updates; omit for first write
})
```

### Pattern 5: Vercel REST API v13 Deploy + Poll

**What:** After branch write, trigger deployment and poll until READY.

```typescript
// Source: https://vercel.com/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment
// lib/services/vercel.service.ts

// Create deployment from branch
const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: `invitation-${invitationId}`,
    gitSource: {
      type: 'github',
      org: 'acstoian',
      repo: 'weddingapp',
      ref: `invitation/${invitationId}`,
    },
    projectSettings: { framework: 'nextjs', nodeVersion: '20.x' },
    target: 'production',
  }),
})
const { id: deploymentId } = await deployResponse.json()

// Poll until READY (readyState values: QUEUED | BUILDING | INITIALIZING | READY | ERROR | CANCELED)
async function pollDeployment(deploymentId: string): Promise<string> {
  while (true) {
    const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
      headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
    })
    const { readyState, url } = await res.json()
    if (readyState === 'READY') return `https://${url}`
    if (readyState === 'ERROR') throw new Error('Deployment failed')
    await new Promise(r => setTimeout(r, 3000))
  }
}
```

### Pattern 6: SSE in Next.js App Router

**What:** Deployment status streamed from `GET /api/deploy-status/[id]` using `ReadableStream`. Client uses TanStack Query or native EventSource.

**Verified:** Next.js 16 App Router Route Handlers support `ReadableStream` responses natively.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route (Next.js 16.1.6 docs)
// app/api/deploy-status/[deploymentId]/route.ts
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ deploymentId: string }> }
) {
  const { deploymentId } = await params
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      // Poll Vercel API and stream status updates
      let done = false
      while (!done) {
        const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
          headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}` },
        })
        const { readyState, url } = await res.json()
        send({ status: readyState, url })

        if (readyState === 'READY' || readyState === 'ERROR') {
          done = true
          controller.close()
        } else {
          await new Promise(r => setTimeout(r, 3000))
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

### Pattern 7: Vercel Blob Photo Upload from App Router

**What:** Client uploads via a Next.js API route that calls `put()`. File size limit is enforced in the route (max 5MB per CONTEXT.md).

```typescript
// Source: https://vercel.com/docs/storage/vercel-blob/using-blob-sdk (verified March 2026)
// app/api/upload/route.ts
import { put } from '@vercel/blob'

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) return Response.json({ error: 'No file' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024)
    return Response.json({ error: 'File too large (max 5MB)' }, { status: 413 })

  const blob = await put(`covers/${crypto.randomUUID()}-${file.name}`, file, {
    access: 'public',
    addRandomSuffix: false,  // UUID already in path
  })

  return Response.json({ url: blob.url })
}
```

### Pattern 8: Resend from App Router

**What:** Send publish-success email after deployment confirms READY.

```typescript
// Source: https://resend.com/docs/send-with-nextjs (verified March 2026)
// app/api/publish/route.ts (called after deployment READY)
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const { data, error } = await resend.emails.send({
  from: 'Invitations <no-reply@yourdomain.com>',
  to: [userEmail],
  subject: 'Your invitation is live!',
  react: PublishSuccessEmail({ title: invitation.title, url: liveUrl }),
})
```

### Pattern 9: Neon + Drizzle Connection

**What:** Use `@neondatabase/serverless` HTTP driver (not postgres.js) for Vercel serverless.

```typescript
// Source: https://neon.com/docs/guides/drizzle (verified March 2026)
// lib/db/index.ts
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

### Pattern 10: Clerk Middleware Setup

**What:** Clerk v7 with Next.js 16 App Router uses `clerkMiddleware()`.

```typescript
// Source: @clerk/nextjs@7.0.1 peerDeps confirms Next.js 16 support (verified March 2026)
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing',
  '/invitations/(.*)',  // live invitation pages are public
])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth.protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

### Pattern 11: FeatureGate Stub (for Phase 2 wiring)

**What:** Phase 1 builds the stub; Phase 2 wires the real Stripe check. Every gated action calls through this.

```typescript
// lib/feature-gate.ts
export type Tier = 'FREE' | 'GOLD' | 'PLATINUM'

export interface FeatureGate {
  canPublish(userId: string): Promise<{ allowed: boolean; reason?: string }>
  canCreateDraft(userId: string): Promise<{ allowed: boolean; reason?: string }>
  getUserTier(userId: string): Promise<Tier>
}

// Phase 1 stub — always FREE tier, enforces 3 draft / 1 published limits from DB
export class StubFeatureGate implements FeatureGate {
  async canPublish(userId: string) {
    const publishedCount = await db.select()...  // count LIVE invitations
    return publishedCount >= 1
      ? { allowed: false, reason: 'Free tier: 1 published invitation max' }
      : { allowed: true }
  }
  async canCreateDraft(userId: string) {
    const draftCount = await db.select()...
    return draftCount >= 3
      ? { allowed: false, reason: 'Free tier: 3 drafts max' }
      : { allowed: true }
  }
  async getUserTier() { return 'FREE' as const }
}
```

### Anti-Patterns to Avoid

- **Calling Vercel API directly from components or hooks:** All Vercel calls go through `DeploymentService`. Never import `vercel.service.ts` in a React component.
- **Storing invitation state in the git branch:** DB is authoritative. Git branch is a write-only deploy artifact.
- **Returning the Vercel URL before polling READY:** Causes broken links. Always poll until `readyState === 'READY'`.
- **SSR of template components in the editor:** Use `dynamic(() => import('./Template'), { ssr: false })` in the editor preview to prevent hydration mismatches.
- **Images committed to git:** All user photos go to Vercel Blob. Only the `coverPhotoUrl` CDN string is in the invitation-config.json committed to the branch.
- **User-branch naming collision:** Branch name is `invitation/{invitationId}` (UUID), never `user/{userId}` — avoids collision for multi-invitation users.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth, session, middleware | Custom JWT + session | Clerk 7.x | Next.js 16 middleware, org support, email verification included |
| Phone-number form validation | Custom regex | libphonenumber-js (Phase 4) | E.164 normalization across 200+ country codes |
| Date parsing/formatting | Custom format code | date-fns 3.x | Locale-aware, handles RO date formats |
| File upload to CDN | Direct S3/R2 setup | @vercel/blob | Zero-config, CDN-backed, no IAM policies |
| Email transport | Nodemailer + SMTP | Resend | SPF/DKIM preconfigured, React email templates |
| Postgres migrations | SQL files | drizzle-kit | Type-safe, reversible, auto-generated |
| Schema validation | Manual type checks | zod | Compile-time + runtime validation from same schema |
| Form state management | Uncontrolled inputs | react-hook-form | Debounced autosave, field-level error control |
| GitHub branch writes | git CLI in serverless | @octokit/rest | Stateless HTTP API, no filesystem required |
| Deployment status polling | setInterval + fetch | ReadableStream SSE + TanStack Query | Native App Router streaming, no WebSocket server |

---

## Common Pitfalls

### Pitfall 1: Hobby Plan Project Limit (RESOLVED)

**What goes wrong:** Vercel Hobby plan caps at 200 projects. On Pro, projects are unlimited.

**Resolution:** Verified at `https://vercel.com/docs/platform/limits` (March 2026). Projects: Hobby=200, Pro=Unlimited, Enterprise=Unlimited. Deploy on **Vercel Pro**. The per-invitation project model is safe.

**Residual risk:** Vercel API rate limits apply at team level regardless of plan. Deployments per day: Pro = 6,000. For Phase 1 scale, irrelevant. Phase 5 adds a quota/rate monitor.

**Action:** The `DeploymentService` abstraction remains mandatory so Phase 5 can attach monitoring. Document the Pro plan requirement in the project README.

### Pitfall 2: Deployment Returned Before READY (HIGH)

**What goes wrong:** Returning the Vercel URL immediately after `POST /v13/deployments` (before READY state) gives users broken links.

**Prevention:** Always poll `GET /v13/deployments/{id}` until `readyState === 'READY'`. Store the URL in DB only after READY is confirmed. Keep `liveUrl` column as last-known-good so failed re-deployments don't overwrite a working URL.

**SSE strategy:** The publish API immediately returns `{ status: 'BUILDING', deploymentId }`. Client subscribes to `/api/deploy-status/{deploymentId}` via SSE for status updates. Sidebar shows inline progress ("Preparing…" → "Building your site…" → "Live!") without polling on a timer.

### Pitfall 3: SSE Function Timeout

**What goes wrong:** Vercel serverless functions have a default max duration. A deployment that takes 90 seconds will be cut off.

**Prevention:** Set `export const maxDuration = 120` in the SSE route handler (Pro plan allows up to 300s). For deployments that exceed this, fall back to client-side polling via TanStack Query against the DB status endpoint.

### Pitfall 4: Template Preview vs. Deployed Output Mismatch

**What goes wrong:** Editor preview uses different CSS/fonts than the deployed Vercel output.

**Prevention:** The template React component is **identical** in both editor preview and deployed invitation. In the editor, wrap with `dynamic(() => import('./templates/MinimalWedding'), { ssr: false })`. The deployed invitation page is the same component with the same props, but with SSR enabled. Test parity between editor preview and deployed URL before Phase 1 ships.

### Pitfall 5: Octokit File Update Without SHA

**What goes wrong:** Updating an existing file via `createOrUpdateFileContents` requires the current file's SHA. Omitting `sha` on an existing file returns a 422 error.

**Prevention:** Before writing, call `repos.getContent` to check if the file exists and retrieve its `sha`. Pass `sha` only when updating. Store nothing — just check before each write.

```typescript
// Pattern: safe upsert
try {
  const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch })
  const sha = Array.isArray(data) ? undefined : data.sha
  await octokit.repos.createOrUpdateFileContents({ ..., sha })
} catch (e) {
  if (e.status === 404) {
    await octokit.repos.createOrUpdateFileContents({ ... }) // create without sha
  }
}
```

### Pitfall 6: i18n and next-intl Routing

**What goes wrong:** next-intl requires either locale-prefixed paths (`/ro/dashboard`) or domain-based routing. Without proper config, the language toggle breaks SSR.

**Prevention:** Use next-intl's middleware with `localePrefix: 'never'` strategy (locale stored in cookie/user preference, not in URL). This avoids changing the URL when toggling RO/EN, which matches the CONTEXT.md decision ("RO default, EN toggle in header nav, persists in user preferences").

### Pitfall 7: Vercel Blob `put()` Without `addRandomSuffix`

**What goes wrong:** Two users upload a file with the same name (e.g., `photo.jpg`). The second upload silently overwrites the first.

**Prevention:** Always include the user's `invitationId` in the path: `covers/${invitationId}/${filename}`. Or use `addRandomSuffix: true`. Use `allowOverwrite: true` when re-uploading for the same invitation (intentional update).

### Pitfall 8: Resend Domain Verification Required for Production

**What goes wrong:** Using the test sender (`onboarding@resend.dev`) works in development but is blocked in production.

**Prevention:** Verify the sending domain in Resend dashboard before Phase 1 ships. Store verified domain in environment variables.

### Pitfall 9: Free Tier Enforcement Not Server-Side

**What goes wrong:** If draft/publish limits are only checked client-side (e.g., hiding the "New" button), a user can bypass via API.

**Prevention:** `StubFeatureGate` checks DB counts server-side in the API route before any action is taken. Phase 2 replaces the stub with real Stripe tier checks but the enforcement point stays server-side.

---

## Code Examples

### Autosave with 2s Debounce (Editor)

```typescript
// Source: CONTEXT.md Editor Layout spec; pattern from react-hook-form + TanStack
// components/editor/useAutosave.ts
import { useEffect, useRef } from 'react'
import { useDebounce } from 'use-debounce'  // or implement inline

export function useAutosave(invitationId: string, fields: InvitationFields) {
  const [debouncedFields] = useDebounce(fields, 2000)

  useEffect(() => {
    if (!debouncedFields) return
    fetch(`/api/invitations/${invitationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: debouncedFields }),
    })
  }, [debouncedFields, invitationId])
}
```

### Template Registry

```typescript
// lib/templates/registry.ts
export interface TemplateDefinition {
  id: string
  name: string
  category: 'WEDDING' | 'BAPTISM'
  style: 'MINIMAL' | 'DECORATIVE'
  thumbnailUrl: string
  googleFonts: string[]  // font names to preload
  component: React.ComponentType<InvitationFields>
}

export const templates: TemplateDefinition[] = [
  { id: 'minimal-wedding-1', category: 'WEDDING', style: 'MINIMAL', ... },
  { id: 'minimal-wedding-2', category: 'WEDDING', style: 'MINIMAL', ... },
  { id: 'minimal-wedding-3', category: 'WEDDING', style: 'MINIMAL', ... },
  { id: 'decorative-wedding-1', category: 'WEDDING', style: 'DECORATIVE', ... },
  { id: 'minimal-baptism-1', category: 'BAPTISM', style: 'MINIMAL', ... },
  { id: 'minimal-baptism-2', category: 'BAPTISM', style: 'MINIMAL', ... },
]

export function getTemplate(id: string): TemplateDefinition {
  const t = templates.find(t => t.id === id)
  if (!t) throw new Error(`Template not found: ${id}`)
  return t
}
```

### Gallery Filter

```typescript
// components/gallery/TemplateGallery.tsx
type FilterTab = 'ALL' | 'WEDDING' | 'BAPTISM'

const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL')

const filtered = templates.filter(t =>
  activeFilter === 'ALL' ? true : t.category === activeFilter
)
```

### Re-publish (update in place)

```typescript
// When invitation already has vercelProjectId, trigger new deploy to SAME project
// gitSource.ref is updated to latest invitation/{id} branch commit
// No new project creation needed — Vercel updates the existing project's production deployment
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 (pages router) | Clerk v7 or Auth.js v5 (App Router) | 2024-2025 | `clerkMiddleware()` replaces `authMiddleware()`; Pages Router patterns no longer apply |
| Prisma (Vercel serverless) | Drizzle ORM | 2024 | Prisma binary causes cold start penalty; Drizzle is pure JS |
| Vercel Serverless for PDF | Railway/Render/Fly.io (Phase 3 only) | Always true | 250MB function limit excludes Chromium; deferred to Phase 3 |
| git CLI in deploy pipeline | Octokit REST API | Always true for serverless | No git binary available in serverless functions |
| Next.js Pages Router | App Router (stable since Next.js 13.4) | 2023-2024 | All new projects use App Router; Server Components, Route Handlers |
| `authMiddleware` (Clerk <5) | `clerkMiddleware` (Clerk 5+/7) | Clerk v5 (2024) | Breaking rename; current pattern confirmed in Clerk v7 docs |

---

## Open Questions

1. **Vercel project connection limit to same git repo**
   - What we know: Official limits doc says Hobby=10, Pro=60 Vercel projects can connect to the same git repository
   - What's unclear: The per-invitation model commits to `acstoian/weddingapp.git`. With Pro, up to 60 Vercel projects can connect to one git repo. At 60 invitations this becomes a constraint.
   - Recommendation: **This is a real constraint.** Each invitation Vercel project connects to the same repo via a different branch. The 60-project-per-repo limit on Pro is the actual architectural ceiling, not the unlimited project count. **Options:** (a) Use the `files[]` upload approach in `POST /v13/deployments` to bypass the git integration entirely (direct file upload, no repo connection required — this removes the 60-project-per-repo constraint), or (b) upgrade to Enterprise for custom limits. The `files[]` approach is architecturally simpler for this use case. **This must be decided before 01-07 is planned.**

2. **Vercel Blob: no documented per-file size limit**
   - What we know: The SDK docs describe multipart upload for files >100MB. Vercel Blob is backed by S3 (11 nines durability). No explicit per-file cap was found.
   - What's unclear: Is there a practical per-upload size limit for serverless route handlers given the 4.5MB request body limit on Vercel serverless?
   - Recommendation: Use client-side upload (`@vercel/blob` client upload) or the multipart approach for anything over 4MB. The CONTEXT.md 5MB cover photo limit may require client-side upload token approach to bypass the serverless request body limit. Research the `handleUpload` + client-side token pattern.

3. **i18n routing strategy for next-intl with no URL prefix**
   - What we know: next-intl supports `localePrefix: 'never'` to avoid URL changes on language toggle
   - What's unclear: How locale detection works for first-visit (Accept-Language header vs. cookie) and whether middleware conflicts with Clerk middleware
   - Recommendation: Set RO as the default locale in next-intl config, store user preference in DB after first toggle, use `localePrefix: 'never'` strategy. Stack Clerk middleware and next-intl middleware using the `createMiddleware` compose pattern.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (for unit/integration) + Playwright (for e2e) |
| Config file | `vitest.config.ts` — Wave 0 gap |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run && npx playwright test` |

**Rationale for Vitest:** Next.js 16 with Turbopack works with Vitest (Jest has known compatibility issues with App Router Server Components). Playwright covers the critical publish flow end-to-end.

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | Template registry returns 6 templates with correct category/style | unit | `npx vitest run src/lib/templates/registry.test.ts` | Wave 0 |
| REQ-01 | Gallery filters: All=6, Wedding=4, Baptism=2 | unit | `npx vitest run src/components/gallery/TemplateGallery.test.tsx` | Wave 0 |
| REQ-02 | InvitationFieldsSchema validates all 7 required fields | unit | `npx vitest run src/lib/templates/schema.test.ts` | Wave 0 |
| REQ-02 | Autosave debounce fires after 2s, not before | unit | `npx vitest run src/components/editor/useAutosave.test.ts` | Wave 0 |
| REQ-02 | Photo upload rejects files > 5MB | unit | `npx vitest run src/app/api/upload/route.test.ts` | Wave 0 |
| REQ-04 | StubFeatureGate: blocks 4th draft, allows 1st-3rd | unit | `npx vitest run src/lib/feature-gate.test.ts` | Wave 0 |
| REQ-04 | StubFeatureGate: blocks 2nd publish, allows 1st | unit | `npx vitest run src/lib/feature-gate.test.ts` | Wave 0 |
| REQ-08 | Git service creates branch for new invitation | integration | `npx vitest run src/lib/services/git.service.test.ts` | Wave 0 |
| REQ-08 | DeploymentService.pollStatus returns READY for successful deploy | unit (mock) | `npx vitest run src/lib/services/deployment.service.test.ts` | Wave 0 |
| REQ-08 | SSE endpoint streams BUILDING → READY states | integration | `npx vitest run src/app/api/deploy-status/route.test.ts` | Wave 0 |
| Full flow | Sign up → select template → fill fields → publish → receive URL | e2e | `npx playwright test e2e/publish-flow.spec.ts` | Wave 0 |

### Key Contracts to Validate

1. **InvitationFieldsSchema contract** — every template must accept the schema and render without error for all 7 field values. Test: render each of the 6 templates with a fixture `InvitationFields` object and assert no thrown errors.

2. **DeploymentService interface** — `VercelDeploymentService` and `StubFeatureGate` must satisfy their TypeScript interfaces. Tests are typed — implementation errors surface at compile time. Additionally: mock `VercelDeploymentService` for tests to avoid real API calls; assert that the interface methods are called with correct arguments.

3. **SSE protocol** — the `data:` lines emitted by `/api/deploy-status/[id]` must parse as valid JSON with `{ status: string, url?: string }`. Test with a ReadableStream reader in Vitest.

4. **FeatureGate stub** — free tier limits (3 drafts, 1 published) are enforced server-side. Test: insert 3 drafts for a user, assert 4th returns `{ allowed: false }`. Insert 1 LIVE invitation, assert publish returns `{ allowed: false }`.

### Vercel Quota Architecture Decision Verification

The "unlimited projects on Pro" claim was verified at `https://vercel.com/docs/platform/limits` (fetched March 2026). To validate this holds in practice before committing to the per-project model:

1. **During 01-01 (scaffold):** Configure a Vercel Pro team for the project. Confirm via Vercel dashboard that no project count limit is displayed.
2. **During 01-07 (deploy pipeline):** Create 3 test invitations and verify 3 separate Vercel projects appear in the team dashboard, all successfully deployed.
3. **Verify the 60-project-per-repo constraint (open question #1):** Test whether the `files[]` upload approach (no git integration) works for the deployment. If yes, adopt it to remove the 60-project-per-repo ceiling and simplify the pipeline (no Octokit needed).

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run && npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — configure with `@testing-library/react` + jsdom + path aliases
- [ ] `playwright.config.ts` — configure base URL, auth setup
- [ ] `tests/fixtures/invitation.ts` — shared InvitationFields fixture
- [ ] `src/lib/templates/registry.test.ts` — REQ-01 template count/category
- [ ] `src/lib/templates/schema.test.ts` — REQ-02 Zod schema validation
- [ ] `src/lib/feature-gate.test.ts` — REQ-04 free tier limit enforcement
- [ ] `src/lib/services/deployment.service.test.ts` — REQ-08 mock deploy interface
- [ ] `src/lib/services/git.service.test.ts` — REQ-08 Octokit branch write (use nock/msw)
- [ ] `src/app/api/deploy-status/route.test.ts` — SSE stream contract
- [ ] `e2e/publish-flow.spec.ts` — full flow smoke test
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react @testing-library/react jsdom playwright`

---

## Integration Points Between Plans

| From Plan | To Plan | Contract | Validation Point |
|-----------|---------|----------|-----------------|
| 01-01 (scaffold) | 01-02 (schema) | Neon `DATABASE_URL` env var available | `db.query.users.findFirst()` succeeds |
| 01-02 (schema) | 01-03 (templates) | `InvitationFieldsSchema` Zod type exported from `lib/templates/schema.ts` | Template renders without type error |
| 01-03 (templates) | 01-04 (gallery) | `TemplateDefinition[]` exported from registry with thumbnail URLs | Gallery renders 6 cards |
| 01-04 (gallery) | 01-05 (editor) | `templateId` passed to editor; `InvitationFields` passed back | Editor loads correct template |
| 01-05 (editor) | 01-06 (git) | `fields: InvitationFields` serialized to `invitation-config.json` | Git branch contains valid JSON |
| 01-06 (git) | 01-07 (deploy) | `commitSha` returned from Octokit write; `gitSource.ref` + `sha` passed to Vercel | Deployment uses correct commit |
| 01-07 (deploy) | 01-05 (editor) | SSE stream delivers `{ status: 'READY', url: string }` | Editor sidebar shows live URL |
| All plans | Phase 2 | `FeatureGate` interface with `canPublish` / `canCreateDraft` / `getUserTier` | Phase 2 replaces `StubFeatureGate` with `StripeFeatureGate` |

---

## Sources

### Primary (HIGH confidence)

- Vercel platform limits (projects, deployments, rate limits) — `https://vercel.com/docs/platform/limits` — fetched March 2026
- Vercel REST API v13 create deployment — `https://vercel.com/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment` — fetched March 2026
- Vercel Blob SDK docs — `https://vercel.com/docs/storage/vercel-blob/using-blob-sdk` — fetched March 2026
- Vercel Blob overview — `https://vercel.com/docs/storage/vercel-blob` — fetched March 2026
- Next.js 16 Route Handler + SSE — `https://nextjs.org/docs/app/api-reference/file-conventions/route` (v16.1.6, updated 2026-02-27) — fetched March 2026
- Resend + Next.js App Router — `https://resend.com/docs/send-with-nextjs` — fetched March 2026
- Neon + Drizzle serverless driver — `https://neon.com/docs/guides/drizzle` — fetched March 2026

### Secondary (MEDIUM confidence)

- @clerk/nextjs@7.0.1 peerDependencies — verified via npm registry March 2026: `"next": "^16.0.10 || ^16.1.0-0"` confirmed
- drizzle-orm@0.45.1, @neondatabase/serverless@1.0.2, @octokit/rest@22.0.1, @vercel/blob@2.3.1, resend@6.9.3 — verified via npm registry March 2026

### Tertiary (LOW confidence — validate during implementation)

- 60-project-per-repo limit for Pro plan — documented in Vercel limits table; implications for `files[]` vs. `gitSource` approach need practical validation
- Vercel Blob per-upload size limit via serverless route — no explicit cap found; 5MB cover photo may require client-side upload token approach (verify during 01-05)
- next-intl `localePrefix: 'never'` + Clerk middleware composition — training knowledge; verify during 01-01 scaffold

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|------|-------|--------|
| Standard stack (versions) | HIGH | All package versions verified via npm registry March 2026 |
| Vercel limits (Pro = unlimited projects) | HIGH | Verified at official limits doc March 2026 |
| Clerk Next.js 16 compatibility | HIGH | peerDependencies in @clerk/nextjs@7.0.1 confirm `^16.x` |
| Vercel REST API deploy flow | HIGH | Official Vercel docs confirmed endpoint shape and status values |
| Neon/Drizzle serverless setup | HIGH | Official Neon docs confirm HTTP driver for serverless |
| SSE in App Router | HIGH | Official Next.js 16.1.6 docs show ReadableStream response pattern |
| Resend setup | HIGH | Official Resend docs confirm minimal 4-line setup |
| Octokit branch write pattern | MEDIUM | Standard documented API; sha-on-update pitfall identified from training |
| 60-project-per-repo constraint | MEDIUM | Documented in official limits but architectural implications need validation |
| next-intl + Clerk compose | LOW | Common pattern but no official combined guide verified |

**Research date:** 2026-03-09
**Valid until:** 2026-04-09 (30 days — stable ecosystem)
