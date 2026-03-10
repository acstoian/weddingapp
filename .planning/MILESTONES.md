# Milestones

---

## v1.0 — Free Tier MVP

**Shipped:** 2026-03-10
**Phases:** 1
**Plans:** 7
**Git range:** a3e9215 → 65c2dd8
**Files changed:** 91 | **Insertions:** 7,407 | **Codebase:** 5,534 lines TypeScript/TSX
**Timeline:** 2 days (2026-03-09 → 2026-03-10)

### Delivered

Complete Free tier vertical slice — sign up, pick a template, customize in-browser, publish to a live Vercel URL — zero technical steps required.

### Key Accomplishments

1. Next.js 16 + Clerk v7 auth scaffold with TopNav, CI pipeline, and 37 Wave 0 test stubs
2. Drizzle ORM schema (users, invitations, subscriptions) + DeploymentService abstraction layer
3. 6 production-ready invitation templates (4 wedding styles, 2 baptism styles) with Zod field schema
4. Template gallery with event-type filters + full-screen preview modal with mobile/desktop toggle
5. Field-based in-browser editor: live preview, Vercel Blob photo upload, 2s autosave debounce
6. Vercel deploy pipeline: Octokit branch-per-invitation → Vercel project create → SSE polling → stable live URL

### UAT Results

11/13 tests passed | 1 bug fixed (stable re-publish URL — `data.alias[]` vs `data.url`) | 1 minor gap deferred (i18n EN toggle, Phase 2+)

### Known Gaps

- i18n language toggle: UI text stays in Romanian regardless of toggle state. Content strings are RO-only stubs. Full next-intl wiring deferred to Phase 2+.

### Archive

- Roadmap: `.planning/milestones/v1.0-ROADMAP.md`
- Phase dirs: `.planning/phases/01-free-tier-mvp/`
