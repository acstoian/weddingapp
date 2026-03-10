---
phase: 01-free-tier-mvp
plan: 06
subsystem: git-automation
tags: [octokit, github-api, msw, vitest, typescript, tdd]

requires:
  - phase: 01-02
    provides: InvitationFields type (via schema.ts placeholder), deployment patterns established

provides:
  - GitService class with writeInvitationBranch(invitationId, fields) method
  - gitService singleton exported from src/lib/services/git.service.ts
  - InvitationFieldsSchema (Zod) + InvitationFields type in src/lib/templates/schema.ts
  - 3 passing unit tests with msw mocks covering new branch, existing file update, and 422 handling

affects:
  - 01-07 (deploy pipeline): calls gitService.writeInvitationBranch() before triggerDeploy
  - 01-03 (templates): schema.ts already exists with correct exports — 01-03 reuses or overwrites identically

tech-stack:
  added: []
  patterns:
    - "Octokit@22 encodes '/' in URL path segments as '%2F' — msw handler URLs must use encodeURIComponent() on path segments"
    - "GitService safe upsert: getContent → check for existing SHA → createOrUpdateFileContents with sha only on update"
    - "422 on git.createRef = branch already exists — catch and continue, not a failure"
    - "GitService instantiated with new Octokit({ auth: process.env.GITHUB_PAT }) — env var injected at runtime"

key-files:
  created:
    - src/lib/services/git.service.ts
    - src/lib/templates/schema.ts
  modified:
    - tests/unit/git-service.test.ts

key-decisions:
  - "Octokit URL encoding: Octokit@22 percent-encodes '/' as '%2F' in URL path segments — msw handler URLs must use encodeURIComponent() to match. Discovered during RED phase, fixed before GREEN."
  - "schema.ts created in 01-06 (not 01-03) to unblock GitService import — 01-03 will find the file already correct and either reuse or overwrite with identical content"
  - "InvitationFields import from @/lib/templates/schema (not @/lib/db/schema) — establishes the correct import path for all downstream consumers"

metrics:
  duration: 15min
  completed: "2026-03-09"
  tasks: 1
  files: 3
---

# Phase 1 Plan 06: GitService Summary

**Octokit-based GitHub branch automation with safe file upsert — creates `invitation/{id}` branch from main SHA, writes `invitations/{id}/invitation-config.json`, handles existing branches (422) and existing files (SHA fetch) correctly**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-03-09
- **Tasks:** 1 (TDD)
- **Files modified:** 3

## Accomplishments

- `GitService.writeInvitationBranch(invitationId, fields)` implements the full 4-step Octokit write pipeline:
  1. `git.getRef` — fetches main branch SHA as the base for new branches
  2. `git.createRef` — creates `invitation/{invitationId}` branch; 422 (already exists) is caught and ignored
  3. `repos.getContent` — fetches existing file SHA if the file already exists; 404 is caught and ignored
  4. `repos.createOrUpdateFileContents` — writes `invitation-config.json` with SHA on update, without SHA on create
- `gitService` singleton exported for use by 01-07 publish route
- `src/lib/templates/schema.ts` created with `InvitationFieldsSchema` (Zod) and `InvitationFields` type — unblocks the import and establishes the canonical path for all downstream plans
- 3 unit tests pass with msw mocks — no real GitHub API calls during test run
- `pnpm build` exits 0 — zero TypeScript errors

## Task Commits

1. **Task 1: GitService implementation (TDD)** — `feat(01-06): implement GitService with safe Octokit branch upsert`

## Files Created/Modified

- `src/lib/services/git.service.ts` — GitService class + gitService singleton; safe upsert via Octokit@22
- `src/lib/templates/schema.ts` — InvitationFieldsSchema (Zod) + InvitationFields type [Rule 3 auto-fix]
- `tests/unit/git-service.test.ts` — 3 tests: new branch write, existing file update with SHA, 422 branch-exists handling

## Decisions Made

- **Octokit URL encoding:** Octokit@22 encodes `/` as `%2F` in URL path segments. The msw handler for `git.getRef({ ref: 'heads/main' })` must use `heads%2Fmain`, and `repos.getContent({ path: '...' })` handler must use `encodeURIComponent(path)`. This was discovered on the first test run and fixed immediately.
- **schema.ts created early:** 01-03 was the planned owner of `src/lib/templates/schema.ts`. Since 01-06 has a hard import dependency on `InvitationFields`, creating the file here is the correct unblocking move (Rule 3). The file content is identical to what 01-03 plans to create — 01-03 will find it already correct.
- **Import path is `@/lib/templates/schema`:** All consumers (git.service, templates, editor) should import from this path. The `@/lib/db/schema` placeholder type is now superseded — 01-03 should update that TODO to import from `@/lib/templates/schema`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created src/lib/templates/schema.ts to unblock GitService import**
- **Found during:** Task 1 (pre-implementation)
- **Issue:** `git.service.ts` imports `InvitationFields` from `@/lib/templates/schema` but that file did not exist (01-03 was its planned owner)
- **Fix:** Created `src/lib/templates/schema.ts` with the Zod schema matching exactly what 01-03 plans to write. File is forward-compatible — 01-03 will reuse or overwrite identically.
- **Files modified:** `src/lib/templates/schema.ts` (created)

**2. [Rule 1 - Bug] Fixed Octokit@22 URL encoding in msw handler URLs**
- **Found during:** Task 1 RED phase (first test run)
- **Issue:** Octokit@22 percent-encodes `/` as `%2F` in URL path segments. The msw handlers used literal slash paths (`heads/main`, `invitations/id/file`), causing all three tests to fail with unmatched request errors.
- **Fix:** Changed `git/ref/heads/main` handler to `git/ref/heads%2Fmain`; used `encodeURIComponent(FILE_PATH)` for the contents endpoint URL.
- **Files modified:** `tests/unit/git-service.test.ts`

## Issues Encountered

None beyond the auto-fixed items above.

## User Setup Required

`GITHUB_PAT` env var must be set in `.env.local` before `gitService.writeInvitationBranch()` can make real GitHub API calls at runtime. `GITHUB_OWNER` and `GITHUB_REPO` default to `acstoian`/`weddingapp` if not set.

## Next Phase Readiness

- Plan 01-07 (publish pipeline) can call `gitService.writeInvitationBranch(invitationId, fields)` — the return value `{ branch, commitSha, filePath }` is ready
- `src/lib/templates/schema.ts` is in place — 01-03 (templates) picks it up directly
- All Wave 0 test stubs remain passing (28 todo, 8 unit passing)

## Self-Check: PASSED

All files verified present. Commit verified in git log after commit step.

---
*Phase: 01-free-tier-mvp*
*Completed: 2026-03-09*
