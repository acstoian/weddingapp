---
phase: 01-free-tier-mvp
plan: 04
subsystem: dashboard-gallery-ui
tags: [next-app-router, clerk-auth, drizzle-orm, tailwind, shadcn-radix, date-fns, lucide-react, vitest, tdd]

requires:
  - phase: 01-02
    provides: DeploymentService, DB schema (invitations table), featureGate stub
  - phase: 01-03
    provides: 6 template components, template registry, InvitationFields schema

provides:
  - GET /api/invitations — authenticated list endpoint (userId-scoped, ordered by updatedAt desc)
  - POST /api/invitations — authenticated create endpoint with featureGate + templateId validation
  - Dashboard page (/dashboard) — invitation card grid + EmptyState + "+ New" card
  - Gallery page (/gallery) — template filter tabs + 6 TemplateCard components + FreeLimitBanner
  - TemplatePreviewModal — full-screen dialog with desktop/mobile toggle + "Use this template" CTA
  - Pricing page (/pricing) — 3 tier cards (Free/Gold/Platinum) with "Coming soon" on paid CTAs
  - EmptyState component — welcome banner with Sparkles icon + CTA to /gallery
  - InvitationCard component — thumbnail, status badge, date-fns RO locale, hover actions (Edit/Copy/Delete)

affects:
  - 01-05 (editor): POST /api/invitations route is the entry point to editor flow
  - 01-07 (publish): dashboard status badge reads LIVE from invitations table

tech-stack:
  added:
    - class-variance-authority@0.7.1
    - clsx@2.1.1
    - tailwind-merge@3.5.0
    - "@radix-ui/react-dialog@1.1.15"
    - "@radix-ui/react-alert-dialog@1.1.15"
    - "@radix-ui/react-slot@1.2.4"
  patterns:
    - "Lazy DB proxy: db/index.ts uses a Proxy + getter to defer neon() call until first access — prevents build failures when DATABASE_URL is absent in build environment"
    - "Server Component + Client Component split: gallery/page.tsx (server) computes atLimit, passes to TemplateGallery (client) for filter state"
    - "Dynamic import with ssr:false for template preview: avoids hydration mismatch since template components use Google Fonts"
    - "Template component name mapping: templateId 'minimal-wedding-1' → 'MinimalWedding1' by splitting on '-' and capitalizing each segment"
    - "TDD Red-Green: invitations API tests written first, route implemented after confirming all 8 tests failed"

key-files:
  created:
    - src/app/api/invitations/route.ts
    - src/app/(dashboard)/gallery/page.tsx
    - src/app/(dashboard)/pricing/page.tsx
    - src/components/dashboard/EmptyState.tsx
    - src/components/dashboard/InvitationCard.tsx
    - src/components/gallery/TemplateGallery.tsx
    - src/components/gallery/TemplateCard.tsx
    - src/components/gallery/FreeLimitBanner.tsx
    - src/components/gallery/TemplatePreviewModal.tsx
    - src/lib/utils.ts
    - tests/unit/invitations.test.ts
  modified:
    - src/app/(dashboard)/dashboard/page.tsx
    - src/lib/db/index.ts

key-decisions:
  - "Lazy DB proxy: wrapping db in a Proxy to call neon() lazily prevents Next.js build from failing when DATABASE_URL is not set in the CI/build environment. The actual connection is only established at request time."
  - "Inline DeleteDialog: built a lightweight inline confirmation dialog instead of importing full shadcn AlertDialog — radix-ui packages are installed but no shadcn component files were scaffolded yet. Avoids adding a full component dependency for a single use."
  - "TemplatePreviewModal as full-page overlay: used position:fixed inset-0 instead of shadcn Dialog to avoid the max-w-none override complexity. Achieves the same visual result with simpler CSS."

metrics:
  duration: 35min
  completed: "2026-03-09"
  tasks: 3
  files: 13
---

# Phase 1 Plan 04: Dashboard, Gallery, and Invitations API Summary

**Invitation CRUD API (GET+POST with featureGate + templateId validation) + dashboard card grid (empty state, invitation cards, "+ New" card) + template gallery (filter tabs, 6 template cards, full-screen preview modal with desktop/mobile toggle, "Use this template" CTA) + pricing page (3 tier cards)**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-03-09
- **Tasks:** 3 (Task 1: TDD API + dashboard UI; Task 2: gallery + pricing; Task 3: preview modal)
- **Files modified:** 13

## Accomplishments

### Task 1: Invitations CRUD API + Dashboard UI (TDD)

- `GET /api/invitations`: Clerk auth → 401 if not signed in → query invitations by userId ordered by updatedAt desc → return `{ invitations: [...] }`
- `POST /api/invitations`: Clerk auth → featureGate.canCreateDraft() → 403 if blocked → templateId validation against registry → 400 if invalid → DB insert → 201 `{ invitation: { id, status: 'DRAFT' } }`
- `InvitationCard`: thumbnail image, title (fallback "Fara titlu"), status badge (Draft=gray, Publishing=amber, Live=green), date formatted with date-fns `ro` locale, hover actions (Edit link, Copy URL if Live, Delete with confirmation dialog)
- `EmptyState`: Sparkles icon, RO welcome text, pink CTA button to /gallery
- Dashboard page: server component, fetches invitations from DB, renders card grid or EmptyState
- 8 unit tests pass (TDD RED → GREEN)

### Task 2: Gallery + Pricing Pages

- `TemplateGallery`: client component with filter tabs (Toate/Nunta/Botez), 2-col mobile / 3-col lg grid, FreeLimitBanner when atLimit
- `TemplateCard`: portrait aspect-ratio (2/3), thumbnail with scale-on-hover, category badge, click opens preview modal
- `FreeLimitBanner`: amber warning with AlertTriangle icon, RO text about draft limit
- Gallery page: server component, counts DRAFT invitations, passes atLimit to TemplateGallery
- Pricing page: 3 tier cards (Free/Gold/Platinum) with Check icon feature lists, "Coming soon" disabled buttons for Gold/Platinum

### Task 3: TemplatePreviewModal

- Full-screen fixed overlay (no Dialog complexity needed)
- Header: template name (left), Monitor/Smartphone toggle (center), X close (right)
- Desktop mode: full-width scrollable template render
- Mobile mode: 375px centered frame with device chrome (dark rounded border + notch)
- Template loaded via `dynamic(() => import(...), { ssr: false })` with component cache to avoid re-loading
- Footer: Back button + "Foloseste acest sablon" primary button with loading spinner
- POST /api/invitations on "Use": 201 → router.push('/editor/{id}'), 403 → close modal + inline error

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Lazy DB proxy to fix build failure**
- **Found during:** Task 2 `pnpm build` (first run)
- **Issue:** `src/lib/db/index.ts` called `neon(process.env.DATABASE_URL!)` at module load time. Next.js page data collection triggered this during build, throwing `Error: No database connection string was provided to neon()` because DATABASE_URL is not set in the build environment.
- **Fix:** Replaced the eager `const db = drizzle(...)` with a lazy Proxy that defers the `neon()` call until the first property access. The connection is now established at request time, not module import time.
- **Files modified:** `src/lib/db/index.ts`

**2. [Rule 2 - Missing critical] Added `src/lib/utils.ts` with `cn()` helper**
- **Found during:** Task 1 component implementation
- **Issue:** `cn()` (clsx + tailwind-merge) is a standard utility needed by all components. Without it, className composition is error-prone and unreadable.
- **Fix:** Created `src/lib/utils.ts` with the standard `cn()` implementation. Installed `clsx` and `tailwind-merge` as dependencies.
- **Files modified:** `src/lib/utils.ts` (created)

**3. [Rule 3 - Blocking] Installed radix-ui + cn dependencies**
- **Found during:** Task 1 setup
- **Issue:** Plan references shadcn/ui (Dialog, AlertDialog, etc.) and `cn()` but `@radix-ui/react-dialog`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-slot`, `class-variance-authority`, `clsx`, `tailwind-merge` were not in package.json.
- **Fix:** `pnpm add class-variance-authority clsx tailwind-merge @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-slot`

## Issues Encountered

None beyond the auto-fixed items above. Build exits 0, all 37 unit tests pass.

## User Setup Required

`DATABASE_URL` must be set in `.env.local` pointing to a Neon database for the runtime API calls to work. Build succeeds without it.

## Next Phase Readiness

- Plan 01-05 (editor): POST /api/invitations creates the invitation row; router navigates to `/editor/{id}` — the editor can read the invitation from the same DB
- Plan 01-07 (publish): dashboard card reads `status` from DB — will show PUBLISHING/LIVE once publish pipeline is wired
- All 37 unit tests pass; build exits 0

## Self-Check: PASSED

All files verified present on disk. Build exits 0. All 37 unit tests pass.

---
*Phase: 01-free-tier-mvp*
*Completed: 2026-03-09*
