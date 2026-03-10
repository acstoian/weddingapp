---
phase: 01-free-tier-mvp
plan: "05"
subsystem: editor-ui
tags: [editor, autosave, upload, react-hook-form, live-preview, drizzle, vercel-blob]
dependency_graph:
  requires: [01-03, 01-04]
  provides: [invitation-crud-api, upload-api, editor-page, autosave-hook]
  affects: [01-07]
tech_stack:
  added: [use-debounce]
  patterns:
    - react-hook-form with watch() for live preview
    - 2s debounce autosave with PATCH to /api/invitations/[id]
    - dynamic import per-template (ssr:false) for live preview
    - FormData + Vercel Blob for photo upload with client-side validation
    - Radix UI AlertDialog for publish confirmation
key_files:
  created:
    - src/app/(dashboard)/editor/[id]/page.tsx
    - src/app/api/invitations/[id]/route.ts
    - src/app/api/upload/route.ts
    - src/components/editor/EditorLayout.tsx
    - src/components/editor/FieldSidebar.tsx
    - src/components/editor/LivePreview.tsx
    - src/components/editor/AutosaveIndicator.tsx
    - src/components/editor/PublishButton.tsx
    - src/components/editor/PublishProgress.tsx
    - src/components/editor/PhotoUpload.tsx
    - src/components/editor/useAutosave.ts
    - src/components/ui/alert-dialog.tsx
    - tests/unit/autosave.test.ts
    - tests/unit/upload.test.ts
  modified: []
decisions:
  - "Used static templateComponents map in LivePreview instead of dynamic template string interpolation — TypeScript types are resolved at build time, avoiding TS errors from untyped dynamic imports"
  - "Patched Request.formData() in upload tests because jsdom/undici throws AssertionError on multipart/form-data parsing — cleaner than mocking the whole Request"
  - "Built AlertDialog from @radix-ui/react-alert-dialog primitives (already in package.json) rather than installing shadcn/ui — avoids CLI dependency"
  - "useAutosave skips first render via isFirstRender ref to avoid saving unchanged form defaults on mount"
metrics:
  duration: "~40 minutes"
  completed: "2026-03-09"
  tasks: 2
  files: 14
---

# Phase 01 Plan 05: In-Browser Editor Summary

Complete in-browser invitation editor with two-panel desktop layout, mobile tab switcher, react-hook-form autosave, Vercel Blob photo upload, and publish confirmation dialog.

## Tasks Completed

### Task 1: Invitation CRUD API + Upload API + Tests

**`src/app/api/invitations/[id]/route.ts`** — GET/PATCH/DELETE per invitation:
- GET: auth -> ownership check (id AND userId) -> 404 or full invitation
- PATCH: auth -> ownership -> partial field validation via `InvitationFieldsSchema.partial()` -> merge fields with existing -> update DB -> return `{ invitation: { id, updatedAt } }`
- DELETE: auth -> ownership -> best-effort `getDeploymentService().deleteProject()` with catch+log -> hard delete from DB -> 204

**`src/app/api/upload/route.ts`** — Photo upload to Vercel Blob:
- Auth required -> 401
- 5MB size gate -> 413 `{ error: 'File too large (max 5MB)' }`
- MIME type gate (jpeg/png/webp only) -> 415
- `put('covers/{invitationId}/{uuid}-{filename}', file, { access: 'public' })` -> `{ url }`

**Tests:**
- `tests/unit/autosave.test.ts`: 3 tests — no-fire-before-2s, fires-exactly-once, status-transitions (all pass)
- `tests/unit/upload.test.ts`: 4 tests — 401 no-auth, 200 valid-JPEG, 413 large-file, 415 gif (all pass)

### Task 2: Editor UI

**`src/app/(dashboard)/editor/[id]/page.tsx`** — Server Component:
- DB fetch with ownership guard -> redirect('/dashboard') if not found
- `getTemplate()` call -> redirect('/dashboard') if template invalid
- Serializes invitation (converts Date to ISO string) -> `<EditorLayout>`

**`src/components/editor/EditorLayout.tsx`** — Client Component:
- Desktop (lg+): `grid-cols-[380px_1fr] h-screen` — FieldSidebar left, LivePreview right
- Mobile (<lg): tab switcher "Editeaza" | "Previzualizeaza", Publish sticky bottom in both tabs
- `useForm<InvitationFields>({ defaultValues: invitation.fields })` + `form.watch()`
- `useAutosave(invitation.id, watchedFields, setAutosaveStatus)`
- Google Fonts injected via `useEffect` based on templateDef.googleFonts

**`src/components/editor/FieldSidebar.tsx`** — Client Component:
- 7 fields in order: title, names (wedding/baptism label), datetime-local, venueName+venueAddress, PhotoUpload, personalMessage (500 char counter), dresscodeRsvpNote
- "Alege alt sablon" -> AlertDialog warning -> navigate to /gallery
- AutosaveIndicator + PublishButton sticky at bottom

**`src/components/editor/LivePreview.tsx`** — Client Component:
- Static map of templateId -> `dynamic(() => import(...), { ssr: false })`
- Skeleton shown during load
- Receives spread `{...fields}` as props

**`src/components/editor/AutosaveIndicator.tsx`**: idle=hidden, saving="Se salveaza…"+Loader2, saved="Salvat"+Check (green, auto-hides after 3s)

**`src/components/editor/PhotoUpload.tsx`**: drag-drop + click, client-side 5MB check, progress bar during upload, thumbnail preview, "Sterge poza" to clear

**`src/components/editor/PublishButton.tsx`**: AlertDialog confirmation ("Publicati invitatia?") -> POST /api/publish/{id} -> PublishProgress

**`src/components/editor/PublishProgress.tsx`**: SSE EventSource from /api/deploy-status/{id}, stages: preparing -> building -> live/error

**`src/components/ui/alert-dialog.tsx`**: AlertDialog primitive built from `@radix-ui/react-alert-dialog` (already installed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed jsdom FormData/File incompatibility in upload tests**
- **Found during:** Task 1 — upload test implementation
- **Issue:** jsdom's undici `Request.formData()` throws `AssertionError` when parsing multipart/form-data with File objects created via `new File()`
- **Fix:** Patched `req.formData` method directly in test helper to return controlled FormData — avoids undici's multipart parser entirely
- **Files modified:** `tests/unit/upload.test.ts`

**2. [Rule 1 - Bug] Fixed TypeScript error in LivePreview dynamic imports**
- **Found during:** Task 2 — `pnpm build`
- **Issue:** `dynamic(() => import(...))` without explicit type parameter returns `ComponentType<{}>`, which is incompatible with `InvitationFields` props
- **Fix:** Changed from string-interpolated dynamic import to a static `templateComponents` map with `dynamic<InvitationFields>()` typed calls — TypeScript resolves types at build time
- **Files modified:** `src/components/editor/LivePreview.tsx`

**3. [Rule 2 - Missing] Created AlertDialog UI component**
- **Found during:** Task 2 — PublishButton and FieldSidebar implementation
- **Issue:** Plan referenced `shadcn Tabs` and `shadcn AlertDialog` but neither was installed; no `src/components/ui/` directory existed
- **Fix:** Built `alert-dialog.tsx` from `@radix-ui/react-alert-dialog` (already in package.json). Mobile tabs implemented with simple state + CSS (no Radix Tabs needed — simpler and avoids extra install)
- **Files modified:** `src/components/ui/alert-dialog.tsx` (created)

## Verification

- `pnpm test:unit -- autosave`: 3/3 pass
- `pnpm test:unit -- upload`: 4/4 pass
- All 44 unit tests pass (7 skipped/todo from earlier plans)
- `pnpm build`: exits 0, no TypeScript errors

## Notes

- `BLOB_READ_WRITE_TOKEN` not in `.env.local` — upload API will build fine but fail at runtime until the token is added. All other editor features work without it.
- `/api/publish/{id}` returns 404 until plan 01-07 (deploy pipeline) — PublishButton will enter error state. This is expected and documented.

## Self-Check: PASSED

Files verified:
- `src/app/(dashboard)/editor/[id]/page.tsx` — exists
- `src/app/api/invitations/[id]/route.ts` — exists
- `src/app/api/upload/route.ts` — exists
- `src/components/editor/EditorLayout.tsx` — exists
- `src/components/editor/FieldSidebar.tsx` — exists
- `src/components/editor/LivePreview.tsx` — exists
- `src/components/editor/AutosaveIndicator.tsx` — exists
- `src/components/editor/PublishButton.tsx` — exists
- `src/components/editor/PublishProgress.tsx` — exists
- `src/components/editor/PhotoUpload.tsx` — exists
- `src/components/editor/useAutosave.ts` — exists
- `src/components/ui/alert-dialog.tsx` — exists
- `tests/unit/autosave.test.ts` — exists, 3/3 pass
- `tests/unit/upload.test.ts` — exists, 4/4 pass
- Build: `pnpm build` exits 0
