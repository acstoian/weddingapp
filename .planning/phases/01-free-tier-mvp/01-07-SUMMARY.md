---
phase: 01-free-tier-mvp
plan: 07
status: DONE
completed: 2026-03-10
---

# 01-07 Summary — Vercel Deploy Pipeline

## What Was Built

Complete publish pipeline wiring the editor's "Publica" button to live Vercel deployments.

### Files Created

| File | Purpose |
|------|---------|
| `src/app/api/publish/[id]/route.ts` | POST endpoint: auth → feature gate → git write → project create/find → deploy trigger → return deploymentId |
| `src/app/api/deploy-status/[deploymentId]/route.ts` | GET SSE endpoint: polls Vercel every 3s, streams BUILDING→READY events, updates DB on completion, sends email |
| `src/lib/services/email.service.ts` | `sendPublishSuccessEmail(to, title, url)` via Resend — gracefully skips if key not set |

### Files Modified

| File | Change |
|------|--------|
| `tests/unit/deployment.test.ts` | Added SSE shape test + ensured all 6 DeploymentService tests pass |

## Key Behaviors

- **Stub mode**: When `GITHUB_PAT` or `VERCEL_TOKEN` are absent, publish returns a `stub_*` deploymentId and the SSE endpoint simulates BUILDING→READY in 2s with a fake URL. Allows UI testing without real credentials.
- **Re-publish**: If `invitation.vercelProjectId` already exists, reuses it — same Vercel project, same URL.
- **Env var injection**: On first publish, copies `DATABASE_URL`, `CLERK_SECRET_KEY`, `BLOB_READ_WRITE_TOKEN`, etc. into the new Vercel project so the deployed invitation page works.
- **Email**: Sends Resend email on READY; skips gracefully if `RESEND_API_KEY` unset; falls back to `onboarding@resend.dev` if `RESEND_FROM_DOMAIN` unset.
- **Error handling**: Poll errors set `status='FAILED'` in DB and emit `{ status: 'ERROR', url: null }` SSE event.
- **SSE format**: `event: status\ndata: {"status":"READY","url":"https://..."}\n\n` — `maxDuration=120` prevents serverless timeout.

## Verification

- `pnpm build` exits 0 — all routes compile without TypeScript errors
- `pnpm test:unit -- deployment` — 6/6 pass (pollStatus READY, pollStatus ERROR throws, triggerDeploy, deleteProject, createOrUpdateProject, SSE shape)
- Full test suite: 45/45 pass, 7 skipped file (feature-gate todos)

## Human Checkpoint

Pending user verification of end-to-end publish flow with real credentials per plan steps 1-14.

## Architectural Notes

- Vercel Pro plan confirmed; 60-project-per-repo ceiling is accepted Phase 1 limit
- Re-publish reuses same `vercelProjectId` — no new project created, same URL preserved
- Email failure never blocks publish success response (best-effort)
