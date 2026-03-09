# Save the Date Platform

## What This Is

A web platform that lets couples, families, and event planners create personalized Wedding and Baptism "Save the Date" digital invitations. Users pick from a gallery of React-based templates, customize them in-browser (text, photos, sections), and publish them as live sites via automated Vercel deployment. Three paid tiers unlock progressively richer distribution options — from a shareable link, to PDF print exports, to direct WhatsApp bulk sending.

## Core Value

Every invitation goes from template to live, shareable link with zero technical effort from the user — then reaches guests however they prefer.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can browse a gallery of wedding/baptism invitation templates
- [ ] User can customize a template in-browser (text, images, sections)
- [ ] Platform offers 3 tiers: Free, Gold, Platinum
- [ ] Free tier: template selection + customization + Vercel deployment + shareable URL
- [ ] Gold tier: everything in Free + PDF print export in standard sizes
- [ ] Platinum tier: everything in Gold + WhatsApp bulk sending via WhatsApp Business API
- [ ] Platinum tier: guest list via CSV/Excel upload or manual phone entry
- [ ] On publish, a Vercel project is created/deployed per invitation and URL is returned to user
- [ ] Admin dashboard for managing invitations and sending WhatsApp messages

### Out of Scope

- Mobile app — web-first, app later if validated
- Real-time collaboration — single-user editing per invitation
- Custom domain mapping per invitation — use Vercel auto-generated URLs for v1

## Context

- Templates are React-based components, deployed as static sites via Vercel
- Vercel deployment is fully automated on user publish action (no manual steps)
- WhatsApp sending uses WhatsApp Business API (requires API credentials setup)
- Print export (Gold+) generates high-res PDF in predefined sizes (A4, A5, etc.)
- Target users: couples/families (self-service) and event planners (managing multiple events)
- The repository already exists: https://github.com/acstoian/weddingapp.git

## Constraints

- **Tech stack**: React/Next.js frontend — natural fit for Vercel deployment
- **Deployment**: Vercel API used to programmatically deploy per-invitation projects
- **WhatsApp**: WhatsApp Business API requires an approved business account and API credentials
- **Git**: Each published invitation creates/updates a branch named after the user — pipeline pushes template to that branch before Vercel picks it up

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React-based templates | Composable, editable in-browser, natural fit for Vercel/Next.js | — Pending |
| Vercel for deployment | Full automation, instant URLs, free tier available | — Pending |
| WhatsApp Business API for Platinum | Enables true bulk sending vs. manual wa.me links | — Pending |
| Git branch per user | Each invitation isolated in version control, traceable | — Pending |

---
*Last updated: 2026-03-09 after initialization*
