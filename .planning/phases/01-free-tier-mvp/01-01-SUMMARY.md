---
phase: 01-free-tier-mvp
plan: 01
subsystem: infra
tags: [nextjs, clerk, tailwind, vitest, playwright, typescript, pnpm]

requires: []

provides:
  - Next.js 16 app scaffold with all Phase 1 production and dev dependencies installed
  - Clerk v7 auth middleware protecting all non-public routes
  - App Router route groups: (auth) for sign-in/sign-up, (dashboard) for protected pages
  - TopNav shell with Logo, Free tier badge, RO/EN language toggle (localStorage + cookie), Clerk UserButton
  - StubFeatureGate implementing FeatureGate interface (FREE tier, permissive until 01-02 wires DB)
  - i18n string stubs for RO and EN (nav + dashboard keys)
  - Wave 0 test infrastructure: 7 unit stubs + 3 E2E stubs, all it.todo/test.todo
  - GitHub Actions CI workflow (push + PR: install, build, test:unit)

affects:
  - 01-02 (schema): depends on this scaffold for Next.js + DB connection wiring
  - 01-03 (templates): depends on Tailwind config and app router structure
  - 01-04 (gallery): depends on (dashboard) route group and TopNav layout
  - 01-05 (editor): implements upload.test.ts and templates.test.ts stubs created here
  - All plans: CI workflow runs on every commit from here forward

tech-stack:
  added:
    - next@16.1.6
    - react@19.2.4
    - "@clerk/nextjs@7.0.1"
    - drizzle-orm@0.45.1
    - "@neondatabase/serverless@1.0.2"
    - "@vercel/blob@2.3.1"
    - "@octokit/rest@22.0.1"
    - resend@6.9.3
    - react-hook-form@7.71.2
    - zod@4.3.6
    - "@hookform/resolvers"
    - "@tanstack/react-query@5.90.21"
    - date-fns@4.1.0
    - lucide-react@0.577.0
    - next-intl@4.8.3
    - vitest@4.0.18
    - "@vitejs/plugin-react"
    - "@testing-library/react"
    - "@playwright/test@1.58.2"
    - drizzle-kit
    - msw
    - tailwindcss@4.2.1
  patterns:
    - App Router route groups (auth) and (dashboard) for layout isolation
    - clerkMiddleware() with createRouteMatcher for public/protected route split
    - "use client" on interactive nav components; server components by default
    - StubFeatureGate interface pattern — stub now, wire DB in 01-02, replace with StripeFeatureGate in Phase 2

key-files:
  created:
    - middleware.ts
    - src/app/layout.tsx
    - src/app/page.tsx
    - "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx"
    - "src/app/(auth)/sign-up/[[...sign-up]]/page.tsx"
    - src/app/(dashboard)/layout.tsx
    - src/app/(dashboard)/dashboard/page.tsx
    - src/components/nav/TopNav.tsx
    - src/lib/feature-gate.ts
    - src/i18n/ro.json
    - src/i18n/en.json
    - vitest.config.ts
    - playwright.config.ts
    - tests/unit/schema.test.ts
    - tests/unit/feature-gate.test.ts
    - tests/unit/deployment.test.ts
    - tests/unit/git-service.test.ts
    - tests/unit/autosave.test.ts
    - tests/unit/upload.test.ts
    - tests/unit/templates.test.ts
    - tests/e2e/gallery.spec.ts
    - tests/e2e/editor.spec.ts
    - tests/e2e/publish.spec.ts
    - .github/workflows/ci.yml
    - .env.local.example
    - .env.example
  modified:
    - package.json
    - tsconfig.json

key-decisions:
  - "Clerk v7 UserButton: afterSignOutUrl prop removed in v7 API — drop prop, sign-out handled by Clerk default"
  - "feature-gate.ts: dynamic import of db rejected by TypeScript strict moduleResolution at build time — use permissive stub with TODO comments; 01-02 replaces stub body with real DB queries"
  - "pnpm create next-app rejected directory name WeddingGame (capitals not allowed in npm names) — scaffolded manually with name save-the-date"
  - "Root page.tsx added (not in original plan) — Next.js requires a root page; redirect to /dashboard"
  - "tailwind.config.ts kept alongside globals.css @import tailwindcss — Tailwind v4 uses CSS-first config but explicit config file kept for content paths"

patterns-established:
  - "Pattern 10 (Clerk middleware): clerkMiddleware() + createRouteMatcher with exact public route list from RESEARCH.md"
  - "Pattern 11 (FeatureGate): interface + StubFeatureGate class + singleton export — swap class body in 01-02, swap entire class in Phase 2"
  - "TopNav: client component with localStorage + cookie lang toggle — no URL change on toggle (localePrefix: never strategy)"

requirements-completed:
  - REQ-04

duration: 45min
completed: 2026-03-09
---

# Phase 1 Plan 01: Next.js 16 Scaffold Summary

**Next.js 16 + Clerk v7 auth scaffold with TopNav shell, Wave 0 test infrastructure (37 todo stubs), and GitHub Actions CI — ready for feature plan execution**

## Performance

- **Duration:** 45 min
- **Started:** 2026-03-09T10:41:30Z
- **Completed:** 2026-03-09T19:20:00Z
- **Tasks:** 3
- **Files created:** 32

## Accomplishments

- Full Next.js 16 app with pnpm, all Phase 1 production and dev dependencies pinned per RESEARCH.md
- Clerk v7 middleware protecting (dashboard) route group; auth pages at catch-all `/sign-in/[[...sign-in]]` and `/sign-up/[[...sign-up]]`
- TopNav component: Logo link, Free tier badge, RO/EN toggle (localStorage + lang cookie), Clerk UserButton — accessible with aria-labels and focus rings, no emojis, Lucide-ready
- Wave 0: 7 unit test stubs + 3 E2E stubs; `pnpm test:unit` runs clean (37 todo, 0 failures)
- CI workflow triggers on every push and PR; runs pnpm build + test:unit

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 16 and install all dependencies** — `a3e9215` (chore)
2. **Task 2: Wave 0 test stubs** — `ec76244` (test)
3. **Task 3: Clerk auth middleware, route groups, top nav, i18n stub, FeatureGate stub, CI** — `0f1c626` (feat)

## Files Created/Modified

- `middleware.ts` — Clerk clerkMiddleware, public/protected route split
- `src/app/layout.tsx` — ClerkProvider, Inter font, lang=ro
- `src/app/page.tsx` — Root redirect to /dashboard (auto-added, required by Next.js)
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — Clerk SignIn component
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — Clerk SignUp component
- `src/app/(dashboard)/layout.tsx` — TopNav + pt-16 for fixed nav
- `src/app/(dashboard)/dashboard/page.tsx` — Placeholder heading shell
- `src/components/nav/TopNav.tsx` — Logo | Free badge | RO/EN toggle | UserButton
- `src/lib/feature-gate.ts` — FeatureGate interface + StubFeatureGate + singleton
- `src/i18n/ro.json` + `src/i18n/en.json` — nav and dashboard string stubs
- `vitest.config.ts` — jsdom env, @ alias, tests/unit glob
- `playwright.config.ts` — baseURL http://localhost:3000, tests/e2e dir
- `tests/unit/*.test.ts` (7 files) — Wave 0 unit stubs
- `tests/e2e/*.spec.ts` (3 files) — Wave 0 E2E stubs
- `.github/workflows/ci.yml` — CI pipeline
- `.env.local.example` + `.env.example` — 11 required env vars
- `package.json` — name save-the-date, all scripts, all deps
- `tsconfig.json` — @ path alias, Next.js jsx:react-jsx

## Decisions Made

- **Clerk v7 UserButton API change:** `afterSignOutUrl` prop was removed in Clerk v7 — dropped the prop. Clerk handles sign-out redirect internally.
- **StubFeatureGate DB import:** Dynamic `import('@/lib/db/index')` inside try/catch still fails TypeScript strict moduleResolution at build time — rewrote as a pure stub with TODO comments. Plan 01-02 will replace the method bodies with real DB queries.
- **pnpm create next-app capital letters:** `WeddingGame` rejected by npm naming rules — scaffolded manually with package name `save-the-date`.
- **Root page.tsx:** Not in original plan file list, but required by Next.js App Router — added redirect to /dashboard. Treated as Rule 3 auto-fix (blocking).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Clerk v7 UserButton prop incompatibility**
- **Found during:** Task 3 (TopNav implementation)
- **Issue:** `afterSignOutUrl` prop was removed in @clerk/nextjs@7 — TypeScript build error
- **Fix:** Removed the prop; Clerk v7 UserButton handles sign-out redirect without it
- **Files modified:** `src/components/nav/TopNav.tsx`
- **Verification:** `pnpm build` exits 0 with no TypeScript errors
- **Committed in:** `0f1c626` (Task 3 commit)

**2. [Rule 1 - Bug] Removed dynamic DB import that failed TypeScript moduleResolution**
- **Found during:** Task 3 (feature-gate.ts compilation)
- **Issue:** `await import('@/lib/db/index')` inside try/catch still fails TypeScript strict moduleResolution at build time — module must exist at compile time even for dynamic imports
- **Fix:** Replaced complex dynamic import with clean stub pattern using TODO comments; 01-02 will wire real DB queries
- **Files modified:** `src/lib/feature-gate.ts`
- **Verification:** `pnpm build` exits 0
- **Committed in:** `0f1c626` (Task 3 commit)

**3. [Rule 3 - Blocking] Added root src/app/page.tsx**
- **Found during:** Task 1 (build verification)
- **Issue:** Next.js App Router requires a root page component; without it the app is incomplete
- **Fix:** Created `src/app/page.tsx` with `redirect('/dashboard')`
- **Files modified:** `src/app/page.tsx`
- **Verification:** `pnpm build` exits 0; route `/` appears in build output
- **Committed in:** `0f1c626` (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes essential for correctness. No scope creep.

## Issues Encountered

- `pnpm create next-app` rejected the directory name `WeddingGame` due to npm package naming restrictions (no capital letters). Scaffolded manually by writing `package.json` and config files directly — identical outcome.
- Python not installed on host machine, so `ui-ux-pro-max` design system script could not run. Applied skill guidelines from SKILL.md directly: minimal style, no emoji icons, cursor-pointer on all interactive elements, aria-labels, focus rings, consistent Lucide icon set.

## User Setup Required

None at this plan level. Clerk, Neon DB, Vercel Blob, and other services are configured in later plans. Copy `.env.local.example` to `.env.local` and fill in values before running `pnpm dev`.

## Next Phase Readiness

- Plan 01-02 (DB schema) can proceed immediately — scaffold provides the Next.js + TypeScript foundation
- `src/lib/feature-gate.ts` has TODO comments marking exactly where DB queries go in 01-02
- All Wave 0 test stubs are in place; `pnpm test:unit` is the per-commit gate from here forward
- CI runs on every push — must stay green

---
*Phase: 01-free-tier-mvp*
*Completed: 2026-03-09*
