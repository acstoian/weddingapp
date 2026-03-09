# Domain Pitfalls

**Domain:** Save the Date / Wedding Invitation SaaS — per-user Vercel deployments, WhatsApp Business API, PDF generation, git automation, in-browser template editor, subscription billing
**Researched:** 2026-03-09
**Confidence note:** Web search and WebFetch were unavailable for this session. All findings are based on training knowledge (cutoff August 2025). Confidence levels reflect that constraint. Validation against current official docs is strongly recommended before implementation.

---

## Critical Pitfalls

Mistakes that cause rewrites, account bans, or irrecoverable architectural damage.

---

### Pitfall 1: Vercel Project-Per-User Hits Plan Limits Silently

**Confidence:** MEDIUM (Vercel plan limits well-documented in training data; exact current numbers need verification at https://vercel.com/pricing)

**What goes wrong:** The Vercel free (Hobby) plan caps teams at a low number of projects (historically 200 on Pro, lower on Hobby). When the platform creates one Vercel project per invitation, you exhaust project quota long before user growth feels meaningful. The API returns a 403 or plan-upgrade error, deployments silently fail, and users get no live URL — the platform's core value prop breaks at scale.

**Why it happens:** Developers test with 5-10 invitations and never hit the limit. The "per-user deployment" model feels natural until it collides with Vercel's billing model, which was designed for dev teams — not multi-tenant SaaS.

**Consequences:**
- Deployments fail without user-visible error if not caught at API layer
- All new users after quota hit get broken URLs
- Upgrading to a higher Vercel plan mid-flight requires migrating existing projects
- Vercel Pro plan (~$20/user/month model) does not cleanly map to a per-invitation pricing model

**Prevention:**
- Verify current project limits for Vercel Pro and Enterprise before architecture is locked
- Build a Vercel quota monitor into the admin dashboard from day 1
- Design the deployment layer behind an abstraction (a `DeploymentService` interface) so Vercel can be swapped or supplemented with Netlify/Cloudflare Pages if limits become a blocker
- Consider a single Vercel project with path-based routing per invitation as a fallback architecture (e.g., `weddingapp.com/invitations/[id]`) — avoids project count limits entirely

**Warning signs:**
- Vercel API returns HTTP 403 with "exceeded plan limit" on project creation
- Deployment success rate drops below 100% in monitoring

**Phase:** Address in Phase 1 (core deployment pipeline). The abstraction layer must be built before any invitations go live.

---

### Pitfall 2: WhatsApp Business API Account Never Gets Approved (or Gets Banned Post-Launch)

**Confidence:** HIGH (Meta's approval process behavior is extensively documented and consistent across sources)

**What goes wrong:** Meta's WhatsApp Business API approval is a manual review process gated by a Facebook Business Manager account in "Business Verified" status. Verification requires uploading legal business documents. The process takes 2-10 business days — or indefinitely if the business category is not clearly a legitimate service. Post-launch, bulk-sending without explicit opt-in from each recipient triggers spam classification, which leads to account suspension. A suspended WABA (WhatsApp Business Account) means Platinum tier is entirely non-functional with no refund obligation unless you have explicit SLA language in your terms.

**Why it happens:** Developers assume approval is a checkbox. Meta's review is opaque — rejection reasons are vague and appeal cycles are slow. Many teams plan Platinum features for launch, only to discover WABA verification takes weeks longer than the timeline.

**Consequences:**
- Platinum tier cannot launch on schedule
- Users who paid for Platinum expect WhatsApp sending; silence from the platform damages trust
- Account suspension post-launch locks all Platinum users out with no warning
- Message templates must be pre-approved by Meta and cannot be changed freely — "We invite you to our wedding" phrasing must match approved template exactly

**Prevention:**
- Start the WABA application process in Phase 1 (parallel to development), not Phase 3
- Design Platinum tier with a "WhatsApp pending approval" fallback state so it can ship the guest list and CSV features before WhatsApp is live
- Implement double opt-in: before sending any WhatsApp message to a guest, show the couple a clear confirmation that "guests will receive a message from [business name]" — store that consent log
- Only send to guests via approved message templates (utility or marketing category); never deviate from approved template content dynamically
- Set a daily sending cap in your application layer (start conservatively at 250-1,000 per day) below Meta's tier limits to avoid spam detection
- Never send to numbers that haven't been validated as active WhatsApp numbers before the campaign

**Warning signs:**
- Meta Business Manager shows "Business Verification: Pending" more than 10 days after submission
- Message template status shows "Rejected" without clear reason
- Quality rating on WABA drops to "Red" (triggers sending limit reduction)

**Phase:** Start WABA application in Phase 1. Build WhatsApp feature scaffold in Phase 2. Only unlock Platinum tier in production after WABA is "Approved" status.

---

### Pitfall 3: Git Branch Automation Creates Merge Conflicts and Repo Bloat

**Confidence:** HIGH (standard git behavior, no external verification needed)

**What goes wrong:** The architecture uses one git branch per user/invitation. When multiple users publish simultaneously, automated git pushes to different branches are safe — but if templates share a root branch and template updates need to propagate downstream (e.g., a bug fix to a base template), there is no clean merge path. Over time, thousands of long-lived branches make the repo a maintenance nightmare. Clone times grow. GitHub/GitLab repository operations slow down. The "branch per user" model also makes it impossible to deploy hotfixes to all live invitations simultaneously.

**Why it happens:** The branch-per-user pattern feels clean for isolation but conflates version control (source tracking) with deployment isolation (serving distinct content). These are different concerns that git does not solve simultaneously.

**Consequences:**
- Template hotfixes require touching every user branch — either manual or a complex fan-out automation
- Repo grows to gigabytes if images or build artifacts are committed alongside source
- GitHub API rate limits on branch operations under load
- CI/CD pipelines triggered on every branch push become expensive or slow

**Prevention:**
- Never commit build artifacts or user-uploaded images to git — keep only source template files; store assets in object storage (S3/Cloudflare R2)
- Build a branch cleanup job that deletes branches for deleted/expired invitations
- Add a git prune + GC cron job to keep repo lean
- Reconsider whether git branching is necessary at all: Vercel can deploy a subdirectory or a JSON config that parameterizes a single shared template repo — this eliminates branch proliferation entirely
- If branches are kept, implement a "template version pinning" system so user branches don't need to track upstream template changes unless explicitly re-deployed

**Warning signs:**
- `git branch -a | wc -l` exceeds 500 branches within 3 months
- Vercel webhook processing time for branch push events exceeds 30 seconds
- GitHub Actions minutes billed per month grow super-linearly with user signups

**Phase:** Phase 1 (before any user invitations go live). The branch strategy must be validated as a proof of concept with 100 simulated branches before launch.

---

### Pitfall 4: In-Browser Template Editor Complexity Explodes Scope

**Confidence:** HIGH (consistent pattern across all visual editor SaaS products)

**What goes wrong:** Building a drag-and-drop, in-browser template editor for React components is one of the hardest UI engineering problems. Teams consistently underestimate: (1) how to serialize editor state into props that reconstruct the React component at deploy time, (2) how to handle fonts, colors, and custom images without breaking the deployed output, (3) how to maintain pixel-perfect parity between the editor preview and the deployed Vercel site. The editor always becomes the longest pole in the timeline.

**Why it happens:** Early prototypes feel fast because the first 60% of editor features (text editing, color picker, image upload) are well-understood. The last 40% — responsive behavior, undo/redo, state serialization, cross-browser font rendering, mobile preview — each take as long as the first 60% combined.

**Consequences:**
- Phase 1 extends indefinitely waiting for the editor to be "good enough"
- The deployed Vercel output looks different from the editor preview (WYSIWYG parity gap)
- Undo/redo is missing at launch, causing user frustration and support tickets
- Mobile template preview is broken because the editor is desktop-only

**Prevention:**
- Scope the MVP editor ruthlessly: text editing, image replacement, and color theme selection only. No drag-and-drop reordering in v1.
- Implement editor state as a well-typed JSON schema from day 1 (not ad-hoc props) — this is the serialization format that drives both preview and deployment
- Use the same React component for editor preview and the deployed Vercel site (single source of truth) — if they diverge, WYSIWYG breaks
- Evaluate existing headless editor libraries (Craft.js, GrapeJS) before building from scratch
- Build undo/redo using a command pattern over the JSON state — do this in Phase 1, not as an afterthought
- Define the editor/template contract (the JSON schema) before building either the editor or templates — schema changes later are breaking changes

**Warning signs:**
- Editor preview uses iframe with a different stylesheet than the deployed site
- Template props are passed as individual React component props (not a single serializable config object)
- "We'll add undo/redo later" appears in planning documents

**Phase:** Phase 1. The JSON schema contract between editor and template must be defined before any templates are built.

---

## Moderate Pitfalls

---

### Pitfall 5: PDF Generation Produces Low-Quality or Inconsistent Output

**Confidence:** MEDIUM (headless Chrome behavior well-known; specific version/API behavior may have changed)

**What goes wrong:** PDF generation from web content (via Puppeteer/Playwright headless Chrome) produces output that differs from the on-screen invitation in: font rendering (web fonts not loaded before screenshot), image quality (default DPI is 72 — print requires 300 DPI), page bleed areas (no crop marks, wrong dimensions for A4/A5 physical print). Users who pay for Gold tier and send to a print shop get a PDF that looks blurry or is the wrong size.

**Why it happens:** Headless browser PDF generation is designed for web-to-PDF document conversion, not print-quality output. The defaults are wrong for physical printing.

**Consequences:**
- Print shop rejects PDF due to insufficient DPI or incorrect dimensions
- User complains and requests refund for Gold tier
- Team scrambles to add print-specific CSS and re-test across all templates

**Prevention:**
- Define PDF output spec before implementing: resolution (300 DPI equivalent), color space (sRGB for digital, CMYK for print shops — headless Chrome does not support CMYK natively, so document this limitation), bleed area, dimensions
- Add a `@media print` stylesheet to every template that controls layout for PDF export
- Use Puppeteer's `page.pdf()` with explicit `width`, `height`, `printBackground: true`, and `scale` parameters rather than defaults
- Force all web fonts to load before triggering PDF generation (add explicit `await page.evaluateHandle('document.fonts.ready')`)
- Implement a PDF preview step in the UI (show a low-res preview before allowing download) so users see output before downloading
- Consider hosting a dedicated PDF generation service (Node.js with Puppeteer) rather than running it in serverless functions — cold starts and memory limits cause timeouts for complex templates

**Warning signs:**
- PDF generation runs in a Vercel serverless function (memory limit: 1GB, timeout: 10s — not enough for complex templates)
- `printBackground: false` anywhere in PDF generation code
- No web font load confirmation before PDF capture

**Phase:** Phase 2 (Gold tier). Build a PDF quality checklist and test against a physical print shop before launch.

---

### Pitfall 6: WhatsApp Message Template Rejection Delays Launch

**Confidence:** HIGH (Meta template approval behavior is well-documented)

**What goes wrong:** Before sending any WhatsApp message, the specific message template (including variables like `{{guest_name}}`, `{{event_date}}`) must be submitted to and approved by Meta. Approval takes 24-48 hours for straightforward templates but can be rejected for ambiguous phrasing, missing opt-out instructions, or classification as "promotional" rather than "utility." Wedding invitation messages sit in a gray zone between utility (event notification) and promotional (marketing) — Meta's category classification affects per-message cost and daily volume limits.

**Why it happens:** Teams write template content during feature development without consulting Meta's content policies. The first submission fails, the team rewrites, waits another 48 hours, and loses a week.

**Consequences:**
- Platinum tier launch delayed by template review cycles
- Approved templates cannot be edited — any wording change requires a new template submission and re-approval
- Using "marketing" category templates is more expensive per message than "utility" — affects unit economics of Platinum tier

**Prevention:**
- Submit initial message templates to Meta during Phase 1 (even before the WhatsApp feature is built) to get approval out of the critical path
- Design templates to clearly qualify as "utility" (transactional event notification): include event name, date, and a direct link — avoid promotional language
- Prepare at least 3 template variants (different languages if targeting multiple markets) and submit all simultaneously
- Store the approved template ID in the database; never reconstruct template content dynamically
- Add a fallback: if WhatsApp send fails, offer SMS or email delivery as backup

**Phase:** Phase 1 (parallel to development). Template submission is a business task, not an engineering task — assign to non-engineering stakeholder.

---

### Pitfall 7: Subscription Billing Edge Cases Cause Revenue Leakage and Support Burden

**Confidence:** HIGH (Stripe billing edge cases are extensively documented)

**What goes wrong:** Subscription billing with Stripe appears simple until edge cases accumulate: (1) user upgrades from Gold to Platinum mid-cycle — who gets prorated, and does WhatsApp sending unlock immediately or at next cycle start? (2) user publishes invitation on Free tier, upgrades to Gold, downloads PDF, then downgrades back — are they entitled to the PDF forever? (3) failed payments should disable Platinum features but not delete invitations — failed payment handling must be graceful. Teams build the happy path and discover these cases only from angry users.

**Why it happens:** Billing logic is tested manually during development with test cards and the happy path. Edge cases only surface in production under real user behavior.

**Consequences:**
- Users who downgrade retain Platinum features they no longer pay for (revenue leakage)
- Users who upgrade don't immediately get features they paid for (support tickets)
- Webhook event processing failures cause billing state to desync from feature access
- Dunning management (failed payment retries) defaults are often wrong for the business model

**Prevention:**
- Model tier entitlements as a server-side gate (check subscription status on every API call) rather than a client-side flag set at upgrade time
- Implement a `FeatureGate` service that queries Stripe subscription status in real time (or with a short cache) — never trust the client to report its own tier
- Handle all Stripe webhook events idempotently using `idempotency_key` — duplicate webhook deliveries must not double-process
- Define and document the downgrade policy explicitly before building billing: "Features from a higher tier are accessible until end of current billing period" or "immediate lockout" — pick one and enforce it consistently
- Test with Stripe's test clock feature to simulate subscription lifecycle events (renewal, failed payment, upgrade, downgrade) before launch
- Build a billing state reconciliation job that runs daily and corrects any desync between Stripe and local database

**Warning signs:**
- Feature access is controlled by a boolean column set in a webhook handler without idempotency checks
- No test coverage for `customer.subscription.deleted` and `invoice.payment_failed` webhook events
- Upgrade/downgrade paths are only tested manually

**Phase:** Phase 3 (billing). Stripe integration must include webhook idempotency and test clock simulation before going live.

---

### Pitfall 8: Vercel Deployment Pipeline Has No Rollback for Failed Deployments

**Confidence:** MEDIUM (Vercel rollback behavior known; specific API behavior may vary by plan)

**What goes wrong:** When a user publishes an invitation and the Vercel deployment fails (build error, timeout, template bug), the system has no automatic recovery. The user sees a success message (the publish action completed on the platform side) but their URL is broken or shows a 404. There is no rollback to the previous working deployment.

**Why it happens:** The deployment pipeline is designed as fire-and-forget. The platform triggers the Vercel API call and returns a URL before checking whether the deployment actually succeeded.

**Consequences:**
- User shares URL with guests, URL is broken
- User contacts support; team must manually re-trigger deployment or fix template
- No audit trail to diagnose what caused the build failure

**Prevention:**
- Poll Vercel deployment status after triggering — wait for `READY` state before returning URL to user (Vercel `GET /v13/deployments/{id}` endpoint exposes status)
- Implement a deployment state machine in the platform database: `pending → building → live` or `pending → building → failed`
- Show users a "deploying..." progress state rather than immediately showing the URL
- On deployment failure, surface actionable error message and offer retry
- Keep the last-known-good deployment URL in the database so failed re-deployments don't break existing live links

**Warning signs:**
- Deployment creation API call returns URL immediately without status polling
- No `deployment_status` column in the invitations table
- No alert/notification when deployment fails in the background

**Phase:** Phase 1 (core deployment pipeline). Status polling must be part of the initial implementation, not added later.

---

## Minor Pitfalls

---

### Pitfall 9: User-Uploaded Images Served from Vercel Deployment Break After Rebuild

**What goes wrong:** If user photos are bundled into the Vercel deployment (copied into the build artifact), a rebuild for any reason (template update, bug fix) requires re-uploading all images. If images are only referenced by filename, they may be lost or mis-referenced across deploys.

**Prevention:** Store all user-uploaded images in a dedicated object storage bucket (Cloudflare R2 or AWS S3) with a stable CDN URL. Vercel deployment only contains the template source; all asset URLs are injected from the stored CDN paths at build time via environment variables or a config JSON.

**Phase:** Phase 1.

---

### Pitfall 10: CSV/Excel Guest List Parsing Assumes Clean Data

**What goes wrong:** Guests submit CSV/Excel files with phone numbers in every conceivable format: `+40 721 234 567`, `0721234567`, `(40)721-234-567`, international prefixes missing. WhatsApp requires E.164 format. Unformatted numbers cause silent API failures where Meta silently drops the message.

**Prevention:** Use a phone number parsing library (libphonenumber-js) with a required country code hint. Surface validation errors per-row during CSV import, before the user triggers any sends. Show a "clean guest list" step in the UI where invalid numbers are flagged for correction.

**Phase:** Phase 2 (Platinum guest list feature).

---

### Pitfall 11: React Template Server-Side Rendering Conflicts with Editor State

**What goes wrong:** Next.js server-side rendering of React templates can cause hydration mismatches if the editor injects dynamic state (fonts, colors, user content) that differs between server render and client hydration.

**Prevention:** Render templates client-side only in the editor context (`dynamic(() => import('./Template'), { ssr: false })`). The deployed Vercel static export should be a fully server-rendered or statically generated output with state baked in at build time.

**Phase:** Phase 1 (template/editor architecture).

---

### Pitfall 12: WhatsApp 24-Hour Session Window Misunderstood

**What goes wrong:** WhatsApp's API has a "customer service window" concept: if a guest responds to the invitation message, the business has 24 hours to reply using free-form text. Outside this window, only pre-approved templates can be sent. Teams build reply handling without understanding this rule and use free-form API calls that fail silently outside the window.

**Prevention:** For a Save the Date platform, guests are unlikely to reply in a way that matters, but if two-way messaging is ever added, this constraint must be understood upfront. In v1, clearly document that the platform only sends outbound messages and does not handle replies.

**Phase:** Phase 2. Document the constraint explicitly.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Vercel deployment pipeline | Project quota exhaustion, no status polling | Build quota monitor + status polling before user-facing launch |
| Template editor | Scope explosion, WYSIWYG parity gap, no undo | Define JSON schema contract first; hard-scope MVP editor |
| Git branch automation | Repo bloat, no hotfix path across branches | Evaluate need for branch-per-user; consider config-parameterized single-project alternative |
| WhatsApp WABA setup | Approval delays, template rejection | Start application and template submission in Phase 1 |
| PDF generation | Wrong DPI, font loading, serverless timeout | Dedicated PDF service, print-specific CSS, font-load confirmation |
| Subscription billing | Feature access desync, no idempotent webhooks | FeatureGate service + Stripe test clock simulation |
| CSV guest list import | Malformed phone numbers, silent WhatsApp failures | libphonenumber-js validation at import time |
| User image assets | Images lost on redeploy | CDN object storage separate from Vercel deployment |

---

## Sources

- Vercel plan limits and REST API behavior: training knowledge (cutoff August 2025). Verify at https://vercel.com/pricing and https://vercel.com/docs/rest-api — **LOW-MEDIUM confidence on exact numbers**
- WhatsApp Business API approval, message templates, opt-in requirements, quality ratings: training knowledge consistent across multiple sources (cutoff August 2025). Verify at https://developers.facebook.com/docs/whatsapp — **HIGH confidence on process; MEDIUM on current pricing tiers**
- Puppeteer/Playwright PDF generation limitations: training knowledge (cutoff August 2025) — **HIGH confidence**
- Stripe subscription billing edge cases and webhook idempotency: training knowledge (cutoff August 2025) — **HIGH confidence**
- Git branch proliferation and repo bloat: standard git behavior — **HIGH confidence**
- In-browser editor complexity: established pattern across SaaS builder products — **HIGH confidence**
- WhatsApp 24-hour session window: Meta documentation behavior (training knowledge) — **MEDIUM confidence, verify current policy**
