# Feature Landscape

**Domain:** Save the Date / Wedding & Baptism Invitation SaaS
**Researched:** 2026-03-09
**Confidence:** MEDIUM (training data through Aug 2025; WebSearch/WebFetch unavailable for live verification)

---

## Competitive Landscape Overview

Platforms surveyed (from training knowledge):

| Platform | Model | Core Differentiator |
|----------|-------|---------------------|
| Zola | Freemium + print upsell | Full wedding planning suite; invitations bundled |
| Greenvelope | Per-send pricing | Premium animated digital envelopes, RSVP tracking |
| Paperless Post | Credit-based | Design polish, postal-style UX, large template library |
| Minted | Print-first | Foil/letterpress print, artists submit designs |
| Joy (withjoy.com) | Free digital | Simple, fast wedding website + invite combo |
| Evite | Ad-supported free | Mass consumer market, lowest friction |
| Canva | Subscription | DIY design tool, not invitation-specific |

**This project's niche:** Couples and families in Romanian/European markets who want a live-URL digital invitation (not email-based), with WhatsApp as the primary sharing channel and optional high-quality PDF for print shops. This differs from US-centric email-delivery platforms.

---

## Table Stakes

Features users expect. Missing = product feels incomplete or users bounce immediately.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Template gallery (browseable) | Entry point for all users; without it users have nothing to start with | Low | Grid/card layout, filter by event type (wedding, baptism), style (modern, rustic, floral) |
| Template preview (full-screen) | Users need to see the invitation at actual quality before choosing | Low | Modal or dedicated preview page; mobile preview is a plus |
| In-browser text editing | Must be able to change names, date, venue without code | Medium | WYSIWYG or field-based form; field-based is simpler and safer for v1 |
| Photo upload and placement | Couples expect their own photo in the invitation | Medium | Upload to CDN (Cloudinary, S3, or Vercel Blob); cropping/positioning is nice-to-have |
| Shareable link (live URL) | The whole value prop — invitation as a URL you can send anywhere | High | Vercel deployment per invitation; must be fast (<30s) |
| Mobile-responsive invitation | Most guests open on phone; non-responsive = embarrassing | Low-Medium | Templates must be built responsively from the start |
| Event details section | Date, time, venue — the absolute minimum content | Low | Template fields: couple names, date, time, venue name, address |
| Free tier (no credit card) | Reduces signup friction; competitors all offer a free entry point | Low | Free = link only; captures email for upsell |
| User account / saved invitations | Users return to edit or re-share; stateless = dead end | Medium | Auth (email/password or Google OAuth); saved invitations per account |
| Invitation status (published / draft) | Users need to know what's live | Low | Simple status flag in dashboard |

---

## Differentiators

Features that set this product apart. Not universally expected, but create stickiness and justify paid tiers.

| Feature | Value Proposition | Complexity | Tier | Notes |
|---------|-------------------|------------|------|-------|
| WhatsApp bulk sending | Romanian/EU market shares invitations via WhatsApp, not email; no competitor does this natively | High | Platinum | WhatsApp Business API; requires approved account + phone number; cost per message varies by country |
| PDF export (print-ready) | Couples still print for grandparents / notice boards; PDF bridges digital and physical | Medium | Gold | Puppeteer/Playwright headless render or react-pdf; standard sizes A4, A5, 10x15cm |
| Vercel-hosted live URL (not email delivery) | The invitation IS a website, not a card in an email; shareable anywhere (WhatsApp, Facebook, SMS, QR code) | High | Free+ | Core architecture differentiator vs Greenvelope/Paperless Post |
| QR code for the invitation URL | Print QR on physical cards pointing to the live invitation; bridges old-school print with digital | Low | Gold | Library: `qrcode` npm package; generate on publish |
| Baptism-specific templates | Competitors are wedding-focused; baptism is underserved and popular in Romanian/Orthodox market | Low | Free+ | Dedicate 20-30% of template library to baptism; distinct visual language |
| CSV/Excel guest list import | Event planners managing 100+ guests need bulk import; manual entry is painful at scale | Medium | Platinum | Parse CSV/XLSX; validate phone numbers; map columns |
| Manual phone number entry | For users without structured guest lists; name + phone number pairs | Low | Platinum | Simple form; add one at a time |
| Delivery receipt / open tracking | Knowing which guests opened the WhatsApp invite is high-value for planners | High | Platinum | Webhook from WhatsApp API; store delivery + read status per recipient |
| Multiple invitations per account | Event planners manage multiple events; couples may have separate Save the Date + Formal Invite | Low-Medium | Gold/Platinum | Dashboard listing all invitations; one active deployment per invitation |
| Invitation password protection | Private events; not everyone wants a public URL | Low | Gold | Simple password gate on the deployed Next.js page |
| Custom slug / vanity URL | `vercel-app-url/ana-si-ion` instead of random hash; more shareable | Medium | Gold | Vercel project name controls subdomain; collision detection required |

---

## Anti-Features

Features to explicitly NOT build in v1. These create complexity without validating core value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time collaborative editing | High infrastructure complexity (WebSockets/CRDTs); single-user editing per invitation covers 99% of use cases | Single editor with last-write-wins; out of scope per PROJECT.md |
| Email delivery of invitations | Requires email deliverability infrastructure (SPF/DKIM/DMARC), bounce handling, unsubscribe flows; email is not the target channel | Shareable URL + WhatsApp covers the use case |
| Custom domain mapping (e.g., ana-si-ion.ro) | DNS propagation UX is terrible; requires domain registrar integrations; adds support burden | Vercel auto-generated URL is good enough for v1; revisit at scale |
| Mobile app (iOS/Android) | Web-first is specified in PROJECT.md; app requires separate dev pipeline | Responsive web; PWA possible later |
| Wedding website builder (full suite) | Zola/Joy do this; it's a much larger scope — registry, hotel blocks, RSVP site, FAQ page | Single-page invitation only; RSVP is a separate consideration |
| RSVP collection and management | Significant backend complexity (guest records, dietary requirements, +1 handling, reporting); dilutes the invitation-as-product focus | Out of scope v1; can be a standalone Phase 2 feature |
| Online payment / registry links | Cross-sells to registry products; not the core loop | Skip v1; potentially a Gold/Platinum add-on later |
| Print-on-demand / physical mail | Minted's model; requires print fulfillment partnerships and shipping logistics | PDF export (Gold) covers print intent without fulfillment complexity |
| AI image generation | Trendy but adds cost (API calls), moderation complexity, and output quality variance | Curated template library with professional designs is more reliable |
| Localization / multi-language editor | Important eventually but adds UI complexity | Romanian + English UI; templates can be in any language the user types |
| Template marketplace (user-submitted) | Community quality control is hard; IP issues; moderation overhead | Internal design team or licensed templates only |

---

## Feature Dependencies

```
User Account
  └── Saved Invitations
        └── Draft / Published Status
              └── Template Selection
                    └── In-Browser Customization (text, photo)
                          └── [Free] Vercel Publish → Shareable URL
                                └── [Gold] QR Code generation
                                └── [Gold] PDF Export (print-ready)
                                └── [Gold] Vanity URL / custom slug
                                └── [Platinum] Guest List (CSV upload OR manual entry)
                                      └── [Platinum] WhatsApp Bulk Send
                                            └── [Platinum] Delivery / Read Receipt Tracking

Template Gallery
  └── Preview (fullscreen / mobile toggle)
        └── Template Selection (branches into above)
```

Key dependency notes:
- Vercel publish must work before ANY tier-gated feature is meaningful
- PDF export depends on published invitation (needs a stable URL to render, OR renders from template state directly — Puppeteer approach captures live URL; react-pdf approach renders from state)
- WhatsApp send depends on guest list existing AND invitation being published (URL to send)
- QR code is a trivial add-on once URL exists; should be bundled with Gold publish confirmation

---

## Tier Feature Mapping

| Feature | Free | Gold | Platinum |
|---------|------|------|----------|
| Template gallery + preview | Yes | Yes | Yes |
| In-browser customization | Yes | Yes | Yes |
| Photo upload | Yes | Yes | Yes |
| Vercel deployment (live URL) | Yes | Yes | Yes |
| Shareable link | Yes | Yes | Yes |
| Multiple invitations | 1 | 3 | Unlimited |
| QR code for URL | No | Yes | Yes |
| PDF export (A4, A5) | No | Yes | Yes |
| Vanity URL slug | No | Yes | Yes |
| Invitation password protection | No | Yes | Yes |
| CSV / Excel guest list import | No | No | Yes |
| Manual phone number entry | No | No | Yes |
| WhatsApp bulk send | No | No | Yes |
| Delivery + read receipt tracking | No | No | Yes |

Note: invitation count limits (1 / 3 / Unlimited) are a recommendation based on competitor patterns — validate with product team.

---

## MVP Recommendation

**Prioritize for v1 launch:**

1. Template gallery with 6-10 templates (4 wedding, 2-3 baptism) — quality over quantity
2. Field-based in-browser editor (names, date, venue, photo) — NOT a drag-and-drop canvas
3. Vercel publish → shareable URL (the core differentiator; must be reliable and fast)
4. User account with saved invitations and draft/published status
5. PDF export (Gold) — second most requested feature based on market; straightforward with Puppeteer
6. WhatsApp bulk send with CSV upload (Platinum) — the top-tier differentiator; complex but is the revenue story

**Defer from v1:**

| Feature | Reason |
|---------|--------|
| RSVP collection | Scope creep; separate product surface |
| QR code | Easy to add post-launch (1 day of work) |
| Vanity URL slugs | Adds collision/routing complexity; auto-URLs work fine initially |
| Delivery receipts (WhatsApp) | Can ship bulk send without tracking first; add in v1.1 |
| Invitation password protection | Low demand for save-the-dates specifically |
| Template marketplace | Way too early; needs proven template demand first |

---

## Competitor Feature Gaps (Opportunities)

| Gap | Competitor Weakness | This Platform's Opportunity |
|-----|--------------------|-----------------------------|
| WhatsApp as delivery channel | All major competitors send via email or in-app | Native WhatsApp bulk send is a genuine blue ocean for European/LATAM markets |
| Baptism-specific templates | Zola/Greenvelope are wedding-only; Evite has generic party | First-class baptism support captures Romanian Orthodox market |
| Invitation as live website (not email attachment) | Greenvelope/Paperless Post are email-centric | URL-first design means invitation works on any channel: WhatsApp, SMS, Facebook, QR code |
| Speed to publish | Competitors have multi-step flows; some require payment before preview | Free tier with instant publish lowers the "try it" barrier dramatically |

---

## Sources

**Note:** Live web research was unavailable during this session (WebSearch/WebFetch restricted). The following reflects training knowledge through August 2025. Confidence is MEDIUM — patterns are well-established but specific pricing tiers and feature sets should be verified against current competitor sites before roadmap finalization.

- Training knowledge: Zola.com, Greenvelope.com, Paperless Post, Minted.com, Joy (withjoy.com), Evite.com as of ~mid-2025
- Project requirements: `/Work/WeddingGame/.planning/PROJECT.md`
- WhatsApp Business API capabilities: Meta developer documentation (training knowledge; verify at developers.facebook.com/docs/whatsapp)

**Verification recommended before Phase 1 kickoff:**
- Current Zola save-the-date feature set and pricing
- Greenvelope per-send pricing model (understanding how they monetize helps tier design)
- WhatsApp Business API per-message pricing for Romania/EU market
