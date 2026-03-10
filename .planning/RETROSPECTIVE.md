# Retrospective

---

## Milestone: v1.0 — Free Tier MVP

**Shipped:** 2026-03-10
**Phases:** 1 | **Plans:** 7 | **Sessions:** ~6

### What Was Built

- Next.js 16 + Clerk v7 scaffold with CI, TopNav, auth route groups
- Drizzle schema + DeploymentService abstraction (3 tables)
- 6 production-ready invitation templates (4 wedding, 2 baptism) with Zod field schema
- Template gallery: filter by event type, full-screen preview modal, mobile/desktop toggle
- In-browser field editor: live preview, Vercel Blob photo upload, 2s autosave debounce
- Octokit git automation: branch-per-invitation create/update
- Vercel deploy pipeline: project create → SSE polling → stable live URL (90s end-to-end)

### What Worked

- **DeploymentService abstraction from Day 1** — clean separation made debugging the publish pipeline straightforward; call sites never changed even as the implementation was fixed 3 times
- **UAT catching real bugs** — the re-publish URL bug (data.url vs data.alias[]) only showed up in manual UAT, not in code review. Conversational UAT is worth running.
- **Field-based editor decision** — validating against Craft.js canvas was right. Form fields + live preview covered all UAT scenarios with no friction.
- **Planning agents (planner + checker loop)** — checker caught 2 blockers before execution started; saved rework during implementation.

### What Was Inefficient

- **Background agents can't use Bash** — gsd-executor agents spawned with run_in_background can't execute shell commands. Caused Wave 3 (01-03, 01-06) to stall. Fix: always run executors foreground.
- **01-03 SUMMARY.md never written** — templates were committed in a bulk multi-plan commit; the individual plan SUMMARY was skipped. Creates a gap in the paper trail.
- **Multiple bug-fix sessions for the publish pipeline** — 5 bugs found and fixed in 01-06/01-07 code that was already committed. More thorough executor review of integration points would help.
- **Rate limits hit twice** — long foreground executor runs (80+ tool uses) hit API limits mid-task. Smaller wave sizes or more frequent checkpoints would mitigate.

### Patterns Established

- **Wave-based execution**: Wave 1 (scaffold) → Wave 2 (schema) → Wave 3 (templates+git) → Wave 4 (UI) → Wave 5 (deploy) — dependencies flow cleanly in this order
- **DeploymentService factory**: `getDeploymentService()` as sole import point; Phase 5 swaps implementation without touching call sites
- **SSE for async deploy status**: `ReadableStream` with BUILDING/READY/ERROR events — works for 90s deploys within Vercel's 300s serverless limit
- **UAT file persistence**: `.planning/phases/{phase}/{num}-UAT.md` survives /clear and session resets; resume works reliably

### Key Lessons

1. **Run executors foreground** — background agents block on Bash permission requests, stalling silently
2. **Write SUMMARY.md immediately after each plan** — bulk commits obscure individual plan outcomes
3. **Integration bugs are common at plan boundaries** — 01-06 → 01-07 boundary had 3 bugs; plan transition points deserve extra scrutiny
4. **`data.url` on Vercel deployment ≠ stable URL** — always use `data.alias[]` to get the production alias; deployment URL rotates on every publish
5. **Clerk v7 breaking changes** — afterSignOutUrl prop removed; fallbackRedirectUrl needed on SignIn/SignUp for post-auth redirect. Check Clerk changelog before any auth plan.

### Cost Observations

- Sessions: ~6 sessions over 2 days
- Model: Claude Sonnet 4.6 (all sessions)
- Notable: Long foreground executor sessions (45-80 min each) were the main cost driver; parallelization would reduce this

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 1 |
| Plans | 7 |
| Days | 2 |
| LOC (TS/TSX) | 5,534 |
| UAT pass rate | 85% (11/13) |
| Bugs found in UAT | 2 (1 fixed, 1 deferred) |
| Bugs fixed post-commit | 5 |
