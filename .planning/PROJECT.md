# Save the Date Platform

## What This Is

A web platform that lets couples, families, and event planners create personalized Wedding and
Baptism "Save the Date" digital invitations. Users pick from a gallery of React-based templates,
customize them in-browser (text, photos, sections), and publish them as live Vercel sites in under
two minutes. Three paid tiers unlock progressively richer distribution: shareable link (Free), PDF
print export (Gold), and direct WhatsApp bulk sending to a guest list (Platinum).

## Core Value

Every invitation goes from template to live, shareable link with zero technical effort from the user
— then reaches guests however they prefer.

## Requirements

### Validated

- ✓ User can browse a gallery of wedding/baptism invitation templates — v1.0
- ✓ User can customize a template in-browser (text, images, sections) — v1.0
- ✓ Free tier: template selection + customization + Vercel deployment + shareable URL — v1.0
- ✓ On publish, a Vercel project is created/deployed per invitation and URL is returned to user — v1.0

### Active

- [ ] Platform offers 3 tiers: Free, Gold, Platinum (billing infrastructure — Phase 2)
- [ ] Gold tier: everything in Free + PDF print export in standard sizes (Phase 3)
- [ ] Platinum tier: everything in Gold + WhatsApp bulk sending via WhatsApp Business API (Phase 4)
- [ ] Platinum tier: guest list via CSV/Excel upload or manual phone entry (Phase 4)
- [ ] Admin dashboard for managing invitations and sending WhatsApp messages (Phase 5)
- [ ] i18n: full English content switching (currently RO-only stubs — deferred from v1.0)

### Out of Scope

- Mobile app — web-first, app later if validated
- Real-time collaboration — single-user editing per invitation
- Custom domain mapping per invitation — use Vercel auto-generated URLs for v1
- Offline mode — real-time publish is core value

## Context

**v1.0 shipped 2026-03-10:**
- 5,534 lines TypeScript/TSX across 91 files
- Stack: Next.js 16, Clerk v7, Drizzle ORM, Neon, Vercel Blob, Octokit, Resend, Tailwind v4
- 6 production-ready invitation templates (4 wedding, 2 baptism)
- UAT: 11/13 tests passed; 1 major bug fixed (stable re-publish URL); 1 minor gap deferred (i18n toggle)
- Deployed at Vercel; GitHub Actions CI running on every push

**External dependency tracking:**
- WABA approval: **must be initiated** during Phase 2 (2–10 week Meta review lead time)
- Vercel project limits: verify Pro plan limits before Phase 3+ (architectural fork risk at high volume)
- PDF compute provider: spike required before Phase 3 planning (Railway vs. Render vs. Fly.io)

## Constraints

- **Tech stack**: React/Next.js frontend — natural fit for Vercel deployment
- **Deployment**: Vercel REST API v13 used to programmatically deploy per-invitation projects
- **WhatsApp**: WhatsApp Business API requires an approved business account and API credentials
- **Git**: Each published invitation creates/updates a branch `invitation/{invitationId}` — pipeline pushes template config to that branch before Vercel deploys
- **PDF**: Puppeteer cannot run on Vercel serverless (50MB Lambda limit) — requires dedicated compute

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React-based templates | Composable, editable in-browser, natural fit for Vercel/Next.js | ✓ Good — templates render correctly, no complexity penalty |
| Vercel per-invitation projects | Full automation, instant URLs, no manual steps | ✓ Good — pipeline works end-to-end; UAT passed |
| Field-based editor (not canvas) | 95% of needs at 10% of cost vs. Craft.js | ✓ Good — users can edit all fields and see live preview |
| Octokit for git automation | Serverless can't maintain git working directory | ✓ Good — branch create/update works reliably |
| Branch naming: invitation/{id} | Avoids multi-invite collisions per user | ✓ Good — fixed early from user/{userId} |
| DeploymentService abstraction | Swap Vercel impl without touching call sites | ✓ Good — Phase 5 can add alt providers cleanly |
| SSE polling for deploy status | Avoids webhook complexity in Phase 1 | ✓ Good — 90s publish confirmed in UAT |
| WhatsApp Business API for Platinum | Enables true bulk sending vs. manual wa.me links | — Pending (Phase 4) |
| PDF on dedicated compute | Chrome binary exceeds Vercel 50MB Lambda limit | — Pending (Phase 3) |
| BullMQ + Redis for WhatsApp queue | 500 guests × 300ms/call exceeds any HTTP timeout | — Pending (Phase 4) |
| Read data.alias[] for stable liveUrl | data.url is per-deployment unique; alias is stable | ✓ Good — fixed in UAT (re-publish URL bug) |

---
*Last updated: 2026-03-10 after v1.0 milestone*
