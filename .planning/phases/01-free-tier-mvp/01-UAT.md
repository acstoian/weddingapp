---
status: complete
phase: 01-free-tier-mvp
source: 01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-04-SUMMARY.md, 01-05-SUMMARY.md, 01-06-SUMMARY.md, 01-07-SUMMARY.md
started: 2026-03-10T08:30:00Z
updated: 2026-03-10T09:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Auth Protection + Sign-in
expected: Visiting http://localhost:3000 while signed out redirects you to the Clerk sign-in page. After signing in, you land on the dashboard.
result: pass
note: Required fix — added fallbackRedirectUrl="/dashboard" to SignIn/SignUp components

### 2. TopNav — Language Toggle + UserButton
expected: The navigation bar shows the logo, a "Free" tier badge, and a RO/EN toggle. Clicking the toggle switches the language. The Clerk UserButton (avatar/initials) is visible top-right and clicking it opens the Clerk account menu.
result: issue
reported: "i press the language toggle but it remains in romanian"
severity: minor
note: Toggle button highlight switches visually but UI text stays in Romanian — i18n content switching not implemented (Phase 1 stubs only)

### 3. Dashboard — Empty State
expected: A freshly signed-in account with no invitations shows a welcome banner with a button/link that takes you to the gallery page.
result: pass

### 4. Gallery — Browse and Filter Templates
expected: The gallery shows 6 template cards. Clicking "Nunta" filter shows only the 4 wedding templates. Clicking "Botez" shows the 2 baptism templates. "Toate" restores all 6.
result: pass

### 5. Gallery — Template Preview Modal
expected: Clicking a template card opens a full-screen modal with a rendered preview of that template. A Monitor/Smartphone toggle switches between full-width and a 375px mobile-framed view. An "X" closes the modal.
result: pass

### 6. Gallery — "Use This Template" Creates Invitation
expected: Clicking "Foloseste acest sablon" in the preview modal creates a new invitation and navigates you to the editor page for that invitation (URL is /editor/{id}).
result: pass

### 7. Editor — Field Editing with Live Preview
expected: The editor has a left sidebar with form fields (title, names, date, venue, personal message) and a right panel showing a live preview of the template. Typing in any field updates the preview in real time (within ~1 second).
result: pass

### 8. Editor — Autosave
expected: After editing a field and waiting ~2 seconds without clicking anything, "Se salveaza..." appears briefly, then changes to "Salvat" with a green checkmark. No manual save action required.
result: pass

### 9. Editor — Photo Upload
expected: The photo upload area accepts a drag-and-drop or click-to-select image (JPEG/PNG/WebP, max 5MB). After uploading, a thumbnail appears in the field sidebar and the template preview shows the photo. A "Sterge poza" button clears it.
result: pass

### 10. Editor — Publish Flow
expected: Clicking "Publica" opens a confirmation dialog. Confirming starts the publish pipeline: the sidebar shows "Se pregateste...", then "Se construieste site-ul...", then "Invitatia ta este live!" with a live Vercel URL. The full flow completes within 90 seconds.
result: pass

### 11. Dashboard — Live Status After Publish
expected: After a successful publish, returning to the dashboard (/dashboard) shows the invitation card with a green "Live" status badge. The card also shows or links to the live URL.
result: pass

### 12. Re-publish Keeps Same URL
expected: Opening the editor for a Live invitation, changing a field, and clicking Publica again results in the SAME Vercel URL being updated — not a new URL.
result: issue
reported: "it created a new url in the same branch"
severity: major

### 13. Pricing Page
expected: Visiting /pricing shows three tier cards: Free, Gold (Coming soon), and Platinum (Coming soon). The Gold and Platinum CTAs are disabled.
result: pass

## Summary

total: 13
passed: 11
issues: 2
pending: 0
skipped: 0

## Gaps

- truth: "Re-publishing an invitation updates the existing Vercel deployment at the same URL"
  status: failed
  reason: "User reported: it created a new url in the same branch"
  severity: major
  test: 12
  artifacts: []
  missing: []
