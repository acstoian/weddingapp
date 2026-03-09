---
phase: 1
slug: free-tier-mvp
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (unit/integration) + Playwright (E2E) |
| **Config file** | `vitest.config.ts` / `playwright.config.ts` — Wave 0 installs both |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds (unit) / ~120 seconds (full with E2E) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (unit)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| scaffold | 01-01 | 1 | REQ-04 | smoke | `pnpm build` | ❌ W0 | ⬜ pending |
| clerk-auth | 01-01 | 1 | REQ-04 | integration | `pnpm test:unit -- auth` | ❌ W0 | ⬜ pending |
| db-schema | 01-02 | 1 | REQ-04 | unit | `pnpm test:unit -- schema` | ❌ W0 | ⬜ pending |
| deployment-service | 01-02 | 1 | REQ-08 | unit | `pnpm test:unit -- deployment` | ❌ W0 | ⬜ pending |
| json-schema-contract | 01-03 | 1 | REQ-01 | unit | `pnpm test:unit -- template-schema` | ❌ W0 | ⬜ pending |
| template-components | 01-03 | 1 | REQ-01 | unit | `pnpm test:unit -- templates` | ❌ W0 | ⬜ pending |
| gallery-ui | 01-04 | 2 | REQ-01 | E2E | `pnpm test:e2e -- gallery` | ❌ W0 | ⬜ pending |
| preview-modal | 01-04 | 2 | REQ-01 | E2E | `pnpm test:e2e -- preview` | ❌ W0 | ⬜ pending |
| editor-fields | 01-05 | 2 | REQ-02 | E2E | `pnpm test:e2e -- editor` | ❌ W0 | ⬜ pending |
| photo-upload | 01-05 | 2 | REQ-02 | integration | `pnpm test:unit -- blob` | ❌ W0 | ⬜ pending |
| autosave | 01-05 | 2 | REQ-02 | unit | `pnpm test:unit -- autosave` | ❌ W0 | ⬜ pending |
| octokit-branch | 01-06 | 2 | REQ-08 | unit | `pnpm test:unit -- git-service` | ❌ W0 | ⬜ pending |
| vercel-deploy | 01-07 | 3 | REQ-08 | integration | `pnpm test:unit -- deploy-pipeline` | ❌ W0 | ⬜ pending |
| sse-polling | 01-07 | 3 | REQ-08 | unit | `pnpm test:unit -- sse` | ❌ W0 | ⬜ pending |
| publish-e2e | 01-07 | 3 | REQ-04 | E2E | `pnpm test:e2e -- publish` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `pnpm add -D vitest @vitejs/plugin-react jsdom` — install vitest
- [ ] `pnpm add -D @playwright/test` + `npx playwright install chromium` — install Playwright
- [ ] `vitest.config.ts` — configure with jsdom environment
- [ ] `playwright.config.ts` — configure with baseURL: `http://localhost:3000`
- [ ] `tests/unit/schema.test.ts` — stubs for JSON schema contract (REQ-01)
- [ ] `tests/unit/deployment.test.ts` — stubs for DeploymentService interface (REQ-08)
- [ ] `tests/unit/git-service.test.ts` — stubs for Octokit branch write (REQ-08)
- [ ] `tests/unit/autosave.test.ts` — stubs for debounce autosave (REQ-02)
- [ ] `tests/e2e/gallery.spec.ts` — stubs for gallery + filter tabs (REQ-01)
- [ ] `tests/e2e/editor.spec.ts` — stubs for editor field → preview (REQ-02)
- [ ] `tests/e2e/publish.spec.ts` — stubs for publish flow E2E (REQ-04, REQ-08)
- [ ] `package.json` scripts: `test:unit`, `test:e2e`, `test`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Vercel URL resolves publicly after deploy | REQ-08 | Requires real Vercel project + network | Click URL in success state; confirm invitation renders in browser |
| Email received on publish | REQ-04 | Requires real Resend credentials + inbox | Publish invitation; check registered email inbox within 60s |
| Mobile preview toggle in gallery | REQ-01 | Visual viewport test | Open template preview; click Mobile toggle; verify layout shrinks to ~375px |
| Template switch carries content | REQ-02 | Cross-template state | Fill fields on Template A; switch to Template B; confirm all fields populated |
| i18n toggle RO/EN | REQ-04 | Visual/text verification | Click EN in nav; confirm all UI strings switch to English |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (unit)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
