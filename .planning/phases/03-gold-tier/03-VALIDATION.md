---
phase: 3
slug: gold-tier
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (already installed) |
| **Config file** | `vitest.config.ts` at repo root |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test:unit && pnpm test:e2e` |
| **Estimated runtime** | ~30 seconds (unit); ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit`
- **After every plan wave:** Run `pnpm test:unit && pnpm test:e2e`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 03-01 | 1 | Gold tier PDF | unit | `pnpm test:unit -- tests/unit/feature-gate.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-02 | 03-01 | 1 | Gold tier PDF | integration | `TEST_INVITATION_URL=... pnpm test:unit -- tests/integration/pdf-service.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-03 | 03-01 | 1 | Gold tier PDF | integration | same as above | ❌ W0 | ⬜ pending |
| 3-02-01 | 03-02 | 2 | Gold tier PDF | unit | `pnpm test:unit -- tests/unit/pdf-export.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-02 | 03-02 | 2 | Gold tier PDF | unit | `pnpm test:unit -- tests/unit/pdf-export.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-03 | 03-02 | 2 | Gold tier PDF | unit | `pnpm test:unit -- tests/unit/templates.test.tsx` | Partial | ⬜ pending |
| 3-02-04 | 03-02 | 2 | Gold tier PDF | manual | Visual PDF check | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/feature-gate.test.ts` — add `canExportPdf()` tests for GOLD (allowed), PLATINUM (allowed), FREE (denied)
- [ ] `tests/unit/pdf-export.test.ts` — Next.js route unit tests: 401 without auth, 403 for FREE tier, 404 wrong owner, 429 forwarded from PDF service, 500/timeout handling
- [ ] `tests/integration/pdf-service.test.ts` — integration tests: POST /render returns buffer + Content-Type: application/pdf; 3rd concurrent → 429; GET /health → 200
- [ ] `tests/unit/templates.test.tsx` — extend existing: QROverlay renders with ?print=true; does NOT render without it; useSearchParams mock required

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PDF visual fidelity (fonts, photo) | Gold tier PDF | Requires visual inspection of generated PDF | Export Card PDF of a live invitation; open in PDF viewer; verify Playfair Display renders, photo visible, QR code at bottom-center of photo |
| PDF print dimensions | Gold tier PDF | Requires measuring PDF page size | Verify Card PDF is exactly 100×150mm; Pliant is 148×200mm using PDF properties |
| QR code scanability | Gold tier PDF | Requires camera/QR scanner | Scan QR code in exported PDF; verify it navigates to correct live URL |
| Railway cold start | Gold tier PDF | Requires live Railway service | First request after 15min idle; verify PDF returns (may be slow); no 502 |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
