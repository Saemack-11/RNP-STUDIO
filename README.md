# RNP Studio 8.0.5 — Exact Egyptian VVS Icon Lock

This package keeps the corrected mural, Council, and Adaptive systems from 8.0.4 and locks the user-supplied Egyptian VVS artwork as the official Home Screen/PWA icon.

## Restored
- Wake the Council (`/api/rnp`)
- Adaptive Predictive Lyrics (`/api/predict-bars`)
- Full-width responsive mural using an actual image element instead of `background-size: cover`
- Clean studio-equipment continuation with baked duplicate cards/navigation cropped out
- Exact user-supplied Egyptian VVS artwork used as the icon master, with only size conversion for Apple/PWA/favicon requirements

## Deploy on Vercel
1. Upload the entire folder, not only `index.html`.
2. Add `OPENAI_API_KEY` in Vercel Project Settings → Environment Variables.
3. Optional: set `OPENAI_TEXT_MODEL`.
4. Redeploy.

## Refresh the iPhone Home Screen icon
iOS caches installed website icons aggressively. Delete the old Home Screen shortcut, open the freshly deployed URL in Safari, then use Share → Add to Home Screen. The manifest and touch-icon filenames include a new 8.0.5 cache identity.

## Truth boundary
Local waveform energy remains available without AI. BPM and key are never fabricated. Council and Adaptive clearly report when the backend is unavailable.
