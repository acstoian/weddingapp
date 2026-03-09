# Architecture Patterns

**Domain:** SaaS platform — per-user Vercel deployments, in-browser React template editor, git automation, PDF export, WhatsApp bulk sending
**Researched:** 2026-03-09

---

## Recommended Architecture

The platform is a **Next.js monolith** acting as the control plane. It does not host the published invitations — those are separate Vercel deployments. The platform orchestrates: editing, git automation, Vercel API calls, PDF rendering, and WhatsApp dispatch.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PLATFORM (Next.js)                              │
│                                                                          │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────────────┐   │
│  │ Auth +      │   │ Template     │   │ Subscription / Billing      │   │
│  │ User Accts  │   │ Editor UI    │   │ (Stripe)                    │   │
│  └──────┬──────┘   └──────┬───────┘   └────────────────────────────┘   │
│         │                 │                                              │
│  ┌──────▼──────────────────▼──────────────────────────────────────────┐ │
│  │                     API Layer (Next.js API Routes / tRPC)           │ │
│  └──────┬──────────────────┬────────────────┬────────────┬────────────┘ │
│         │                  │                │            │               │
│  ┌──────▼──────┐  ┌────────▼──────┐  ┌─────▼──────┐  ┌─▼───────────┐  │
│  │ Git          │  │ Vercel Deploy  │  │ PDF Export  │  │ WhatsApp    │  │
│  │ Automation   │  │ Pipeline       │  │ (Puppeteer/ │  │ Dispatcher  │  │
│  │ Service      │  │ Service        │  │  Playwright)│  │ Service     │  │
│  └──────┬──────┘  └────────┬───────┘  └─────┬───────┘  └─▬───────────┘ │
└─────────┼──────────────────┼────────────────┼────────────┼──────────────┘
          │                  │                │            │
          ▼                  ▼                ▼            ▼
   GitHub Repo API    Vercel REST API   File system /   WhatsApp
   (octokit)          (Vercel SDK)      temp storage    Cloud API
   acstoian/          create project,                   (Meta)
   weddingapp.git     deploy from branch

                              │
                              ▼
                  ┌───────────────────────┐
                  │  Per-User Invitation   │
                  │  Deployment (Vercel)   │
                  │  alice.vercel.app      │
                  │  bob.vercel.app        │
                  │  ...                   │
                  └───────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Communicates With | Notes |
|-----------|---------------|-------------------|-------|
| **Platform Web App** (Next.js) | Hosts the UI for browse, edit, publish, manage | All internal services via API layer | Single deployable unit for the control plane |
| **Auth + User Accounts** | Sign-up, login, session management, user profiles | Platform API, Stripe | Use NextAuth.js or Clerk for speed |
| **Subscription / Billing** | Tier gating (Free/Gold/Platinum), payment | Auth, Platform API | Stripe Checkout + webhooks |
| **Template Editor UI** | In-browser WYSIWYG editing of React template fields | Platform API (save/load state), Template Registry | Does NOT render live React — renders a preview iframe or visual layer |
| **Template Registry** | Stores base templates (React source + metadata) in DB or object storage | Template Editor, Git Automation Service | Template definitions (JSX/TSX strings + config schema) |
| **API Layer** (Next.js API routes or tRPC) | Validates auth, tier, routes requests to services | All services, DB, external APIs | Thin orchestration layer — no business logic lives here |
| **Git Automation Service** | Creates/updates a branch per username in the monorepo; writes hydrated template files to that branch | GitHub API (via Octokit), Vercel Deploy Pipeline | Runs server-side on publish action |
| **Vercel Deploy Pipeline** | Creates Vercel project if new user; triggers deployment from the user's git branch; returns the live URL | Vercel REST API, Git Automation Service | Stores Vercel project ID per invitation in DB |
| **PDF Export Service** | Renders the invitation URL in a headless browser and exports to PDF | Puppeteer/Playwright (server-side), temp file storage | Triggered on Gold+ download action |
| **WhatsApp Dispatcher** | Accepts guest list + invitation URL; sends templated WhatsApp messages per recipient | WhatsApp Cloud API (Meta), DB (guest list) | Platinum tier only; requires approved WA Business Account |
| **Admin Dashboard** | Manage invitations, view deployment status, trigger sends | Platform API | Thin CRUD UI with tier/status filters |
| **Database** (PostgreSQL) | Users, invitations, deployment metadata, guest lists, subscription state | All services via API layer | Single source of truth; Prisma ORM |

---

## Data Flow

### Publish Flow (Free tier)

```
User clicks Publish
  → API: validate auth + tier
  → Git Automation Service:
      1. GET current SHA of main branch (GitHub API)
      2. Create branch user/{username} if not exists (GitHub Refs API)
      3. Write hydrated template files to that branch (GitHub Contents API)
      4. Return commit SHA
  → Vercel Deploy Pipeline:
      1. Create Vercel project if first publish (POST /v11/projects, gitRepository linked)
      2. Trigger deployment (POST /v13/deployments, gitSource.ref = user/{username})
      3. Poll /v13/deployments/{id} until readyState = READY
      4. Return deployment URL
  → DB: store { invitationId, vercelProjectId, deploymentId, url }
  → API: return URL to user
  → UI: show shareable link
```

### PDF Export Flow (Gold+)

```
User clicks Download PDF
  → API: validate auth + Gold tier
  → PDF Export Service:
      1. Retrieve invitation deployment URL from DB
      2. Launch Puppeteer, navigate to URL
      3. Wait for hydration / network idle
      4. Call page.pdf({ format: 'A4' })
      5. Write PDF to temp storage or stream back
  → API: return PDF file / download URL
```

### WhatsApp Dispatch Flow (Platinum)

```
User uploads CSV or enters guests manually
  → API: parse + validate phone numbers, store guest list in DB
User clicks Send
  → API: validate auth + Platinum tier
  → WhatsApp Dispatcher:
      1. Load guest list from DB (batch: up to 250 per API call)
      2. For each recipient:
         POST /messages (WhatsApp Cloud API)
         body: { type: "template", template: { name: "invitation_link", language: { code: "en_US" },
                 components: [{ type: "body", parameters: [{ type: "text", text: invitationUrl }] }] }}
      3. Record delivery status per guest in DB
  → API: return send summary (delivered/failed counts)
```

### Editor Save Flow

```
User edits template fields in-browser
  → Autosave: PATCH /api/invitations/{id}/draft (debounced 2s)
  → DB: store invitation_state as JSON blob (field values, image URLs)
  → On next load: GET /api/invitations/{id} → restore editor state
  NOTE: editor does NOT edit React source directly — it edits a structured config
        that the template renders from props. The config is what gets baked into
        the git branch at publish time.
```

---

## Key Architectural Decisions

### Template as Config, Not Raw Source Editing

**Pattern:** Templates are parameterized React components. The editor manipulates a typed JSON config (couple names, dates, venue, photo URLs, color scheme). At publish time, the config is injected into the template as static props or a JSON file alongside the component.

**Why not raw source editing:** Letting users edit JSX in-browser adds enormous complexity (sandboxed runtime, AST manipulation, security surface). Config-driven templates are safe, fast, and maintainable.

**Implementation:** Each template has a `schema.json` defining editable fields. Editor reads schema, renders form controls. Config saved as `invitation-config.json`. At publish, Git Automation writes both the template component and the config to the branch.

### One Vercel Project Per Invitation (Not Per User)

**Pattern:** Create one Vercel project per invitation (not per user account). A user creating multiple invitations (e.g., a wedding + a baptism, or an event planner with 10 clients) gets one project per invitation, each on its own branch.

**Branch naming:** `invitation/{invitationId}` rather than `user/{username}` — more precise, avoids collision if a user has multiple invitations.

**Why:** Vercel project = unit of URL assignment. One project → one production URL. Multiple invitations under one project would require complex alias management.

### Git Automation via GitHub REST API (Not git CLI)

**Pattern:** Use Octokit (official GitHub SDK) server-side to manipulate refs and file trees via the GitHub REST API. No git binary needed on the server.

**Operations required:**
1. `GET /repos/{owner}/{repo}/git/ref/heads/{branch}` — check if branch exists
2. `POST /repos/{owner}/{repo}/git/refs` — create branch from main SHA
3. `PUT /repos/{owner}/{repo}/contents/{path}` — write template + config files
4. Return commit SHA to Vercel deployment trigger

**Why not git CLI:** Stateless serverless functions cannot maintain a git working directory. The GitHub API is the correct abstraction for this environment.

### PDF Export via Headless Browser (Server-Side)

**Pattern:** Puppeteer (or Playwright) running on a dedicated server route or a background job worker. Navigate to the live Vercel URL, wait for full render, export PDF.

**Why not a canvas/print CSS approach:** The invitation is a rich React component that may include animations, custom fonts, and responsive layouts. Headless browser capture is the only way to guarantee pixel-fidelity that matches what guests see.

**Constraint:** Puppeteer/Playwright require a long-running process environment. Cannot run in a standard Vercel serverless function (50MB limit, no Chrome binary). Must run in a Vercel Function with increased memory, a Railway/Render worker, or use an external service like Browserless.io.

### WhatsApp: Per-Message API Calls with Job Queue

**Pattern:** Do not attempt to send all messages in a single request handler. Enqueue a dispatch job (BullMQ + Redis, or a Vercel background function) and process in batches.

**Why:** A 500-guest list at ~300ms per API call = 150 seconds. HTTP request timeout is 30s on most platforms. The job queue handles retries, rate limiting (WhatsApp Cloud API: 80 messages/second per phone number), and status tracking.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Letting Users Edit Raw React/JSX
**What goes wrong:** Users corrupt template syntax, XSS surface area explodes, you need a sandboxed runtime (cost + complexity).
**Instead:** Config-driven templates. The schema controls what is editable.

### Anti-Pattern 2: One Git Branch Per User Account
**What goes wrong:** A user with 3 invitations shares a branch — publish of invitation B corrupts invitation A's deployment.
**Instead:** One branch per invitation (keyed on `invitationId`).

### Anti-Pattern 3: Triggering Vercel Deployment Synchronously in the Request Handler
**What goes wrong:** Deployment takes 30–90 seconds. Request times out. User sees error.
**Instead:** Trigger deployment, return `{ status: "building", deploymentId }` immediately. Poll via WebSocket or SSE from the UI until `readyState === READY`.

### Anti-Pattern 4: Running Puppeteer in Standard Vercel Functions
**What goes wrong:** Chrome binary exceeds the 50MB function size limit. Cold starts are extreme. Function times out on first render.
**Instead:** Use a dedicated compute environment (Railway, Render, Fly.io) or Browserless.io for PDF generation.

### Anti-Pattern 5: Sending WhatsApp Messages in a Synchronous HTTP Request
**What goes wrong:** Timeout for 50+ guests. No retry on failure. No status tracking.
**Instead:** Job queue (BullMQ) with per-message status written to DB. UI polls or subscribes to status.

### Anti-Pattern 6: Storing Invitation State Only in the Git Branch
**What goes wrong:** To show the user their saved work, you'd need to read from GitHub API every time. No single source of truth for the editor.
**Instead:** DB is authoritative for invitation state (JSON config). Git branch is a deployment artifact, written at publish time.

---

## Suggested Build Order

Dependencies flow left to right. Each tier unlocks the next.

```
1. Platform shell + Auth
        │
        ▼
2. Database schema (users, invitations, subscriptions)
        │
        ▼
3. Template Registry (base templates stored, schema defined)
        │
        ▼
4. Template Editor UI (reads schema, saves config to DB)
        │
        ▼
5. Git Automation Service (GitHub API integration, branch per invitation)
        │
        ▼
6. Vercel Deploy Pipeline (project create + deploy from branch, poll for URL)
        │  ← This is the Free tier MVP
        ▼
7. Subscription / Billing (Stripe, tier gating)
        │
        ├─▶ 8. PDF Export Service (Gold tier unlock)
        │
        └─▶ 9. WhatsApp Dispatcher + Job Queue (Platinum tier unlock)
                │
                ▼
           10. Admin Dashboard (visibility into all of the above)
```

**Rationale for this order:**
- Steps 1–6 deliver the Free tier MVP end-to-end (browse → edit → publish → shareable URL).
- Subscription/billing (step 7) gates everything after it — must exist before Gold/Platinum features ship.
- PDF and WhatsApp are independent of each other; they can be built in parallel after step 7.
- Admin dashboard is last because it reads from a mature data model.

---

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| Vercel projects | 100 projects — fine, all in one team account | 10K projects — monitor Vercel team limits, consider cleanup of abandoned projects | May hit Vercel API rate limits; need queueing for deploy triggers |
| GitHub branches | 100 branches — trivial | 10K branches — functional but repo gets large; consider archiving | Branch per invitation model breaks down; migrate to file-upload deployment model |
| Database | Single PostgreSQL instance | Read replicas for dashboard queries | Sharding or managed cloud DB (PlanetScale, Neon) |
| PDF generation | Single Puppeteer worker | Worker pool or Browserless.io | Dedicated PDF microservice, async job queue with priorities |
| WhatsApp sending | Single queue worker | Multiple queue workers, per-account rate limiting | Dedicated dispatch service with webhook-based status updates |

---

## Component Communication Summary

```
Browser (user) ──HTTPS──► Platform Web App (Next.js)
                                │
                    ┌───────────┼────────────────────┐
                    ▼           ▼                     ▼
               PostgreSQL   GitHub API           Vercel REST API
               (via Prisma)  (Octokit)           (Vercel SDK)
                                │                     │
                                ▼                     ▼
                         weddingapp.git         Invitation Deployments
                         branches               (*.vercel.app URLs)
                    ▼
               Puppeteer Worker   WhatsApp Cloud API
               (PDF generation)   (Meta, per-message HTTP)
                    ▼
               Stripe API
               (webhooks → subscription state)
```

---

## Sources

- Vercel REST API (create deployment): https://vercel.com/docs/rest-api/reference/deployments/create-a-new-deployment — HIGH confidence, official docs fetched
- Vercel REST API (create project): https://vercel.com/docs/rest-api/reference/projects/create-a-new-project — HIGH confidence, official docs fetched
- Vercel deployments overview: https://vercel.com/docs/deployments/overview — HIGH confidence, official docs fetched
- GitHub REST API (refs/git automation): https://docs.github.com/en/rest/git/refs — MEDIUM confidence, standard well-known API pattern; WebFetch denied, based on training knowledge of Octokit
- WhatsApp Cloud API (bulk messaging): https://developers.facebook.com/docs/whatsapp/cloud-api — MEDIUM confidence; WebFetch denied, based on training knowledge of Meta's Cloud API patterns
- Puppeteer PDF export in serverless environments: MEDIUM confidence (training knowledge; known constraint re: 50MB function limit is well-documented community pattern)
- BullMQ + Redis job queue pattern: MEDIUM confidence (training knowledge; standard Node.js queue pattern for async jobs)
