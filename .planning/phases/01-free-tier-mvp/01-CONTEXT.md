# Phase 1: Free Tier MVP - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the complete Free tier vertical slice: user auth → template gallery → in-browser field editor → Vercel publish pipeline → shareable URL → dashboard. No paid features. No RSVP forms. No custom domains. This phase proves the core product loop end-to-end.

</domain>

<decisions>
## Implementation Decisions

### Template Visual Style
- **6 templates total: 3 minimal wedding + 1 decorative wedding + 2 minimal baptism**
- All templates must be production-ready at launch: real Google Fonts, proper spacing, mobile-responsive — not placeholders
- Minimal style: clean typography, lots of whitespace, muted palettes (cream, sage, dusty rose)
- Decorative style: ornate elements, botanical or floral motifs, gold accents
- Template thumbnail previews shown in the gallery must accurately represent the final design

### Template JSON Schema Contract (all templates implement all fields)
All 6 templates share the same field schema — this is the contract:
1. **Invitation title** — user-set custom name (e.g. "Elena & Andrei"), first field in editor sidebar
2. **Names** — couple names (wedding) or child name (baptism)
3. **Event date & time**
4. **Venue name and address**
5. **Cover photo** — single hero photo (couple portrait or baby photo), max 5MB, stored in Vercel Blob; template controls aspect ratio/crop area — no manual crop UI in v1
6. **Short personal message** — 1–2 sentence optional text from the couple/family
7. **Dress code & RSVP note** — optional freetext field (no actual RSVP form)

### Template Gallery
- **Card grid layout** (2–3 columns): each card shows thumbnail + invitation name + event type tag (Wedding / Baptism)
- **Filter tabs at top: All (6) / Wedding (4) / Baptism (2)** — visible, persistent, one-click to switch
- **Template selection flow:** click card → full-screen preview with desktop/mobile toggle → "Use this template" CTA → editor
- **Gallery navigation:** Gallery is NOT a standalone page — accessed via "New invitation" button from the dashboard
- **Free tier limit banner:** When user has 3 drafts and clicks "New invitation", gallery opens WITH a top banner warning of the limit. Publish is gated separately when they try to publish
- **No onboarding guidance in editor** — fields are self-explanatory; no tooltips, tour, or step indicator

### Editor Layout & Experience
- **Desktop layout:** Left sidebar (fields) + right live preview (two-panel). Preview updates live as user types (2s debounce autosave, immediate live preview)
- **Mobile layout:** Tab switcher — "Edit" tab shows fields, "Preview" tab shows full template. Publish button visible in both tabs
- **Invitation title** is the first field in the editor sidebar (required before publish)
- **Autosave:** Subtle status indicator near the Publish button — "Saving…" / "✓ Saved". No toast notifications
- **Template switch:** User can go back to gallery and pick a different template mid-editing. Confirmation dialog warns that layout changes but field content (names, date, photo) carries over since all templates share the same JSON schema
- **Photo upload:** Drag-drop or click to upload. Max 5MB size limit with clear error. Template controls display/crop. No manual crop UI in v1

### Publish Flow
- **Confirmation dialog** before deploying: "Publish your invitation? This creates a live website. You can update or delete it at any time." [Cancel] [Publish →]
- **Progress indicator** in the editor sidebar (inline, not full-screen overlay) with status messages: "Preparing…" → "Building your site…" → "Live!"
- **Re-publish (updates):** Same Vercel URL is updated in place. User sees the same progress flow. URL stays the same — guests who already received the link are not broken
- **On publish success, sidebar shows:** "✓ Your invitation is live!" + URL + [📋 Copy] + [Open ↑] (new tab) + [Back to Dashboard]
- **Email notification:** After successful publish, the live URL is automatically emailed to the user's registered email address via Resend

### Delete / Unpublish
- **Delete action** is available on each dashboard card. Confirmation dialog required
- Deleting an invitation also removes the Vercel project (takes the URL offline) — prevents orphaned deployments
- No "archive" or "hide" state in v1 — it's either active or deleted

### Dashboard Design
- **Card grid layout:** Each card shows template thumbnail, invitation title (user-set), status badge (Draft / Publishing / Live), last-edited date
- **"+ New" card** in the grid to create new invitations
- **Card actions:** Edit, Copy URL (Live only), Preview/Open (Live only), Delete
- **Empty state (first login):** Welcome banner explaining the platform's value ("Create beautiful digital invitations for your special moments") + prominent "Create your first invitation" CTA button
- **Invitation title shown on card** is the user-set title from the editor's first field

### Free Tier Limits
- **3 drafts max** (draft = created but not published)
- **1 published invitation max**
- Hitting the draft limit: gallery opens with top banner warning. Publish is gated when they try to publish a second one
- **Upgrade path:** Dedicated `/pricing` page with 3 tier cards (Free / Gold / Platinum) showing features and prices. In Phase 1, Checkout is inactive — upgrade CTA shows "Coming soon" (Phase 2 wires Stripe)

### App Navigation
- **Top nav:** Logo/home → dashboard | Tier badge (Free / Gold / Platinum) | Language toggle (RO / EN) | Clerk account menu
- **Language:** Romanian default (RO), English option (EN). Toggle in header nav. Selection persists in user preferences
- **Post-auth landing:** After sign-up or login, user always lands on the dashboard. No onboarding step before the gallery

### Email (Resend)
- Provider: **Resend** for transactional email
- Use case in Phase 1: publish success notification with live URL
- Email is sent to the user's Clerk-registered email address

### Claude's Discretion
- Loading skeleton design for gallery and dashboard
- Exact card hover states and animation
- Toast vs inline error messages for non-publish errors
- Color palette, exact typography choices within minimal/decorative style guidelines
- Pricing page layout details (Phase 2 will wire the actual Stripe Checkout)
- Form field validation error styling

</decisions>

<specifics>
## Specific Ideas

- Templates should feel production-ready enough that a user would actually share the URL — not prototype quality
- The welcome banner on the empty dashboard should reinforce the core value: "from template to live site in minutes"
- The publish confirmation dialog should be reassuring, not alarming — emphasize that the invitation can always be updated or deleted
- The inline publish progress (not a modal/overlay) keeps the user grounded in the editor context — they can still see their invitation while it deploys
- Email notification on publish is a nice "wow" moment — user gets a confirmation in their inbox with the link they can immediately share

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project. No existing components, hooks, or utilities.

### Established Patterns
- None yet — this phase establishes the patterns all future phases will follow

### Integration Points
- Phase 2 (Billing) will wire the `/pricing` page Stripe Checkout buttons — page is built in Phase 1 but CTAs are inactive
- Phase 2 will add FeatureGate enforcement to the publish endpoint and draft count check
- Phase 5 will add the Vercel quota monitor (Phase 1 creates the DeploymentService abstraction it hooks into)

</code_context>

<deferred>
## Deferred Ideas

- RSVP form / response tracking — explicitly out of scope for v1 (out of scope per PROJECT.md)
- Real-time collaboration / multi-user editing — out of scope per PROJECT.md
- Custom domain per invitation — out of scope per PROJECT.md
- Animated/video invitation templates — future template expansion phase
- Template marketplace (third-party templates) — future phase
- Invitation analytics (view count, link clicks) — future phase
- Manual crop/reposition tool for uploaded photos — deferred; template controls crop in v1
- Onboarding tour or tooltips — deferred; fields are self-explanatory for v1
- Help/support link in nav — deferred to a later phase

</deferred>

---

*Phase: 01-free-tier-mvp*
*Context gathered: 2026-03-09*
