# RNP — Real Ninja Poetics v1

RNP is Sae's iPhone-first studio, lyrical dojo, Flow Forge and Voice Locker.

## Working now
- Instrumental upload and playback
- Microphone permission, live waveform, count-in, record/pause/resume/stop
- Take markers
- Local IndexedDB storage for dry vocals and writing
- Replay, export and delete takes
- Seed-bar analysis and offline Dojo coaching
- Secure server-side AI continuation bridge
- Complete RNP doctrine
- Installable PWA and offline shell

## Deploy on Vercel
1. Upload this folder to GitHub.
2. Import the repository into Vercel.
3. Add `OPENAI_API_KEY` under Project Settings → Environment Variables.
4. Optional: add `OPENAI_MODEL`; fallback is `gpt-5`.
5. Deploy and open the HTTPS URL in Safari.
6. Share → Add to Home Screen.
7. Allow microphone access.

Never place an API key in `index.html`.

## Honest limits
- Use headphones to reduce instrumental bleed.
- The dry vocal is preserved. Beat/vocal bounce, waveform editing, pitch correction and mastering are future production modules.
- iOS chooses the recording format supported by Safari.
- Export important takes because browser storage can be cleared.
