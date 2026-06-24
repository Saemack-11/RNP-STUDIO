# RNP-STUDIO
<p align="center">
  <img src="docs/banner.png" alt="RNP Studio — Real Ninja Poetics" width="100%" />
</p>

<h1 align="center">RNP Studio</h1>

<p align="center">
  <b>A creative headquarters that turns life into music.</b><br/>
  A living council of AI agents helps write lyrics, hooks, cover art, and more — inside a black &amp; gold war-room studio.
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-D4AF37" />
  <img alt="PWA" src="https://img.shields.io/badge/PWA-installable-D4AF37" />
  <img alt="Single file" src="https://img.shields.io/badge/frontend-single--file-D4AF37" />
  <img alt="Deploy" src="https://img.shields.io/badge/deploy-Vercel-000" />
</p>

-----

## What it is

RNP Studio is **not** a DAW. BandLab handles recording — RNP handles **inspiration**. It’s a digital mythology vault and creative war room where AI agents help transform real life (fatherhood, the road, rebuilding, faith, legacy) into songs.

> **The workflow:** Upload a beat in BandLab → choose a chapter → enter a thought, story, or feeling → the council activates → it shapes verses, hooks, concepts, and visuals → take it back to BandLab and record.

### The four pillars

- **Mythology Vault** — life chapters, stories, lessons, symbols the council pulls from.
- **The Council** — a roster of agents, each a different part of the artist’s mind.
- **Creative Lab** — where ideas become lyrics, hooks, cover art, and previews.
- **Legacy Archive** — every session, saved.

-----

## Features

- 🎛️ **Living Council** — animated agents that lean, write, nod, study, and sketch during a session. Tap any one to **talk to them** in character.
- 🎚️ **Vibe Engine** — 25 primary vibes, optional secondary blend with a strength slider, 18 mood tags, and a reference-era selector — all shaping the output.
- 🧩 **Council Control** — turn members on/off before or during a cook. Off members go quiet, stop influencing the song, and their avatar sleeps. Eight preset lineups (Pain Song, Street Anthem, Dark Luxury, Fatherhood/Legacy…).
- ✍️ **Lyric Engine** — four authentic versions per cook (Raw Street-Poetic, Melodic Pain, Aggressive Punchline, Simple Modern Flow). No technical terms in the bars; characteristics, never artist clones.
- 💬 **Council Discussion** — the room proposes refinements you can approve, reject, or regenerate.
- 🤖 **Auto-Council** — let the council critique and re-cook the record one pass on its own.
- 🎤 **Vocal Preview** — record your own voice (with consent) and run a tape-player teleprompter with verse/hook switching and 8 vocal presets.
- 🖼️ **Cover Art** — builds an art prompt from the song and sends it to your image system (8 styles).
- 📜 **Mythology Vault & Legacy Archive** — browse life chapters and saved sessions.
- 📱 **Installable PWA** — add to home screen, works offline (the app shell is cached; generation always hits the network).

-----

## Architecture

```
┌──────────────────────────────┐        ┌─────────────────────────────┐
│  rnp-studio.html             │  POST  │  Vercel serverless (Node 18) │
│  single-file PWA frontend    │ ─────► │  /api/cook   → Claude        │
│  • UI, council, vibe engine  │        │  /api/ask    → Claude        │
│  • offline preview fallback  │ ◄───── │  /api/image  → image provider│
└──────────────────────────────┘  JSON  └─────────────────────────────┘
        served by sw.js (cache)              keys live in env vars only
```

- **Frontend:** one HTML file. No build step, no framework, no bundler.
- **Backend:** three small serverless routes. Your API keys are read **only on the server** from environment variables — never shipped to the browser.
- **Resilience:** if a route is unreachable, the app shows an explicit local preview instead of silently faking data.

-----

## Quick start

### Deploy on Vercel (recommended)

1. Push this repo to GitHub.
1. Import it into Vercel (the `api/` folder must be at the project root).
1. Add environment variables (Settings → Environment Variables):
- `ANTHROPIC_API_KEY` — **required** (cook + ask)
- `OPENAI_API_KEY` — optional (cover image generation)
- `COOK_MODEL` — optional, defaults to `claude-sonnet-4-6`
1. Deploy. Open the site — the root loads the studio.

### Run locally (frontend only)

```bash
# any static server works; the API routes need Vercel dev or deployment
npx serve .
# then open http://localhost:3000/rnp-studio.html
```

Without the backend the app still runs and falls back to the local preview.

-----

## Project structure

```
.
├── rnp-studio.html          # the entire app (UI + logic)
├── manifest.json            # PWA manifest
├── sw.js                    # service worker (offline shell)
├── icons/                   # app + favicon icons
├── api/
│   ├── cook.js              # council writes the 4 lyric versions
│   ├── ask.js               # talk to a single council member
│   ├── image.js             # cover art generation
│   ├── _guard.js            # same-origin check + rate limit
│   └── README.md            # backend deploy notes
├── docs/banner.png          # readme hero
├── vercel.json
├── .env.example
└── LICENSE
```

-----

## Security notes

- API keys never reach the client — they’re server-side env vars.
- `api/_guard.js` adds a **same-origin check** and a **per-IP rate limit** so a public deploy can’t be trivially abused. The limiter is in-memory (per serverless instance, best effort); for hard global limits, wire in **Vercel KV** or **Upstash Redis**.
- The generator never invents data offline — it shows an explicit preview state instead.

-----

## Roadmap

- [ ] “Ask the whole room” — one question, every active agent answers
- [ ] Drop approved Ask answers straight into the record
- [ ] Real BPM detection from the uploaded beat
- [ ] Optional vocal DSP for the preset previews
- [ ] Global rate limiting via KV

-----

## Credits

Built by **Sae** — *Real Ninja Poetics* ($@€).
*Discipline creates freedom. Creativity creates legacy.* · 11:11

## License

[MIT](LICENSE)
