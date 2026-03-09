---
phase: 01-free-tier-mvp
plan: 02
subsystem: database
tags: [drizzle-orm, neon, postgresql, vercel-api, msw, vitest, typescript]

requires:
  - phase: 01-01
    provides: Next.js 16 scaffold with pnpm, TypeScript, vitest, msw — foundation for db and service files

provides:
  - Drizzle ORM schema: users, invitations (status enum DRAFT/PUBLISHING/LIVE/FAILED), subscriptions tables
  - Neon HTTP driver + Drizzle singleton exported from src/lib/db/index.ts
  - DeploymentService interface (4 methods) exported from src/lib/services/deployment.service.ts
  - VercelDeploymentService implementing all 4 methods via Vercel REST API v10/v13
  - getDeploymentService() factory as the sole import point for all call sites
  - drizzle.config.ts with postgresql dialect targeting schema.ts
  - db:push, db:generate, db:studio scripts in package.json
  - SQL migration in drizzle/ directory for all 3 tables

affects:
  - 01-03 (templates): replaces InvitationFields placeholder type with Zod-inferred type
  - 01-04 (gallery): reads invitations table via db singleton
  - 01-05 (editor): writes to invitations table, uses fields jsonb column
  - 01-07 (SSE publish): uses getDeploymentService() + pollStatus in polling loop
  - feature-gate.ts: TODO comments in place — 01-02 schema ready for DB queries to be wired

tech-stack:
  added: []
  patterns:
    - "DeploymentService factory pattern: getDeploymentService() is the only import point — no direct VercelDeploymentService imports in call sites"
    - "Drizzle schema: pgEnum for status column; jsonb with .$type<T>() for typed fields"
    - "Neon HTTP driver singleton: neon(DATABASE_URL) + drizzle(sql, { schema }) — one module, one export"
    - "msw setupServer in Vitest: beforeAll(server.listen) + afterEach(resetHandlers) + afterAll(server.close)"

key-files:
  created:
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - src/lib/services/deployment.service.ts
    - src/lib/services/vercel.service.ts
    - drizzle.config.ts
    - drizzle/0000_opposite_silhouette.sql
  modified:
    - tests/unit/deployment.test.ts
    - package.json

key-decisions:
  - "InvitationFields type defined inline as Record<string,unknown> with TODO — 01-03 will import Zod-inferred type and replace this placeholder"
  - "VercelDeploymentService handles 409 conflict by GETting existing project — avoids duplicate project creation errors on retry"
  - "pollStatus throws (not returns error value) on ERROR/CANCELED states — caller (SSE route) handles exceptions for clean control flow"

patterns-established:
  - "Pattern 12 (DeploymentService): interface + factory function — call sites never depend on concrete class; Phase 5 quota monitor swaps implementation without touching routes"
  - "Pattern 13 (Drizzle DB singleton): single neon() + drizzle() instance in src/lib/db/index.ts; all routes import { db } from '@/lib/db'"

requirements-completed:
  - REQ-08

duration: 5min
completed: 2026-03-09
---

# Phase 1 Plan 02: DB Schema and DeploymentService Summary

**Drizzle schema (users/invitations/subscriptions) + VercelDeploymentService abstraction layer with msw-tested pollStatus, triggerDeploy, createOrUpdateProject, and deleteProject**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-09T17:53:58Z
- **Completed:** 2026-03-09T17:58:29Z
- **Tasks:** 2 (TDD: 3 commits each — test/feat)
- **Files modified:** 8

## Accomplishments

- Drizzle schema with `invitationStatusEnum` (DRAFT | PUBLISHING | LIVE | FAILED), 11-column `invitations` table, `users` table keyed on Clerk user ID, `subscriptions` stub with FK to users
- Neon HTTP driver singleton — all routes import `{ db }` from one module
- `DeploymentService` interface + `getDeploymentService()` factory established as the abstraction boundary
- `VercelDeploymentService` implements all 4 methods with proper HTTP calls to Vercel v10/v13 APIs
- 5 unit tests pass with msw mocks covering all method behaviors including error paths
- `drizzle-kit generate` produces valid SQL migration with all 3 tables and FK constraint

## Task Commits

Each task was committed atomically:

1. **Task 1: Drizzle schema — users, invitations, subscriptions** — `41d6949` (feat)
2. **Task 2 RED: Failing deployment tests** — `386b180` (test)
3. **Task 2 GREEN: DeploymentService + VercelDeploymentService** — `8411fd4` (feat)

## Files Created/Modified

- `src/lib/db/schema.ts` — Drizzle schema: invitationStatusEnum + 3 tables with proper types
- `src/lib/db/index.ts` — Neon HTTP driver + Drizzle ORM singleton export
- `drizzle.config.ts` — drizzle-kit config: postgresql dialect, schema path, output dir
- `drizzle/0000_opposite_silhouette.sql` — Generated SQL migration (CREATE TABLE for all 3 tables)
- `src/lib/services/deployment.service.ts` — DeploymentService interface + getDeploymentService() factory
- `src/lib/services/vercel.service.ts` — VercelDeploymentService: Vercel REST API v10/v13 implementation
- `tests/unit/deployment.test.ts` — 5 unit tests with msw mocks (replaces Wave 0 stubs)
- `package.json` — Added db:push, db:generate, db:studio scripts

## Decisions Made

- **InvitationFields placeholder:** `Record<string, unknown>` with TODO comment — 01-03 will import the Zod-inferred type from `lib/templates/schema` and replace this. Avoids circular dependency and missing file at build time.
- **409 conflict handling:** `createOrUpdateProject` GETs existing project on 409 — allows safe retry/idempotent calls without duplicate Vercel projects.
- **pollStatus throws on ERROR:** Throws rather than returning an error enum value — the SSE polling route (01-07) handles exceptions for cleaner control flow.

## Deviations from Plan

None — plan executed exactly as written. All code matches the target shapes specified in the interfaces block.

## Issues Encountered

None.

## User Setup Required

None at this plan level. DATABASE_URL must be set in `.env.local` before `pnpm db:push` can create tables in Neon. VERCEL_TOKEN and VERCEL_TEAM_ID required for deployment API calls at runtime.

## Next Phase Readiness

- Plan 01-03 (templates/Zod schema) can proceed immediately — `InvitationFields` placeholder is marked with TODO
- `src/lib/feature-gate.ts` has TODO comments pointing to the exact DB queries (invitations table ready)
- All Wave 0 test stubs remain passing (37 todo, 5 new passing)
- CI workflow runs on every push — schema files included in build verification

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 01-free-tier-mvp*
*Completed: 2026-03-09*
