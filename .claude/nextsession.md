# Next Session

## Most Important Thing

Phase 3 context is captured. Run plan-phase:

```
/gsd:plan-phase 3
```

Then execute:
```
/gsd:execute-phase 3
```

## Ordered Tasks

1. **`/gsd:plan-phase 3`** — create Phase 3 plan
2. **`/gsd:execute-phase 3`** — execute
3. **External: WABA Meta Business Verification** — initiate manually (2–10 week lead time, needed before Phase 4)

## Critical Phase 3 Reminders

- PDF sizes: **Card 100×150mm**, **Pliant 148×200mm** (NOT A4/A5)
- QR: embedded in PDF, bottom-center of photo, must NOT cover text/elements, `?print=true` trigger, `qrcode.react`, 15×15mm, white rounded background
- Railway: `/services/pdf-renderer`, `ghcr.io/puppeteer/puppeteer` Docker base, `puppeteer-core` + `@sparticuz/chromium`, single persistent browser, 2 concurrent limit → 429
- Add `canExportPdf()` to FeatureGate interface
- EditorLayout needs: `isLive` state + `onPublished` callback on PublishProgress + pass `invitationId`/`isLive` to EditorLockedFeatures

## Warnings
- Python: use `py` not `python3`
- Background agents cannot use Bash — run gsd-executor foreground
- Next.js 15+: `await params` in dynamic route handlers
- Test user ID: `user_3Aio6Xy2KqoD3WtbIQGZQpVOVoV`, Admin secret: `8f3a2c1e9d4b7f6a0e5c8d2b4a9f1e3c`
- `stripe listen` required before billing flow tests
