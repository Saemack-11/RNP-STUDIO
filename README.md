# RNP Studio 3.1 — Sanctuary Man Cave

This build preserves the complete RNP workflow while restoring the man-cave atmosphere and making the top room rail functional.

## Added
- Functional scrollable top room navigation
- Room-specific active state and deep links
- Sanctuary-wide backgrounds instead of flat black voids
- Smoke/haze, amber lamp, purple/green LED atmosphere
- Late Night and Atmosphere controls
- AI Cover Generation through `/api/generate-cover`
- Manual cover composer remains available

## Vercel environment
Set `OPENAI_API_KEY`. Optional: `OPENAI_IMAGE_MODEL` (defaults to `gpt-image-1`).

Keep only one `/api/rnp` route. This package contains `api/rnp.js`; do not keep an older `api/rnp.mjs` beside it.
