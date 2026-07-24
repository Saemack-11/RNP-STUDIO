# RNP Studio 3.3 — Test Ready

## What changed

- Expanded the optional Nostalgia Wall into a searchable, category-based reference library.
- Nostalgia Wall defaults OFF and only influences Generate Track when enabled.
- Added light / noticeable / reference-driven weighting and meaning / punchline / story / humor modes.
- Added Cultural Pulse in Culture Vault with server-side OpenAI web search for current, verifiable cultural moments.
- Saved Cultural Pulse references flow into Generate Track as optional context.
- Kept the existing Vocal Lab workflow intact; only added the circular mic-booth visual inspired by the supplied Vocal Lab reference.
- Kept top navigation only.

## Vercel deployment

Upload this folder as-is. Set `OPENAI_API_KEY` in Vercel Environment Variables. Optional: set `OPENAI_MODEL`; otherwise the routes use `gpt-5-mini`.

API routes:

- `/api/rnp`
- `/api/generate-track`
- `/api/generate-cover`
- `/api/cultural-pulse`

Do not add an older `api/rnp.mjs`; this package intentionally contains `api/rnp.js`.

## Testing order

1. Load a beat and confirm local analysis.
2. Generate once with Nostalgia Wall OFF.
3. Turn the Wall ON, select 1–3 references, choose a weight/mode, and generate again.
4. Open Culture Vault, scan Cultural Pulse, save one reference, then generate from the Writing Desk.
5. Confirm Vocal Lab recording, Voice Locker, punch-in, and WAV bounce still behave as before.
