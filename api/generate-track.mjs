import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_SEED = 6000;
const MAX_CONTEXT = 12000;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}

function clean(value, max = 1000) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}

function cleanArray(value, maxItems = 20, maxLength = 200) {
  return Array.isArray(value) ? value.slice(0, maxItems).map(v => clean(v, maxLength)).filter(Boolean) : [];
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mode: { type: "string", enum: ["continue_hook", "continue_verse", "build_full_track", "fill_empty_bars"] },
    seed_preserved: { type: "boolean" },
    pocket_read: { type: "string" },
    rhyme_read: { type: "string" },
    generated_track: { type: "string" },
    alternate_pockets: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          direction: { type: "string" },
          sample: { type: "string" }
        },
        required: ["name", "direction", "sample"]
      }
    },
    rewind_lines: { type: "array", minItems: 1, maxItems: 8, items: { type: "string" } },
    recording_notes: { type: "array", minItems: 2, maxItems: 8, items: { type: "string" } },
    truth_flags: { type: "array", minItems: 0, maxItems: 6, items: { type: "string" } }
  },
  required: ["mode", "seed_preserved", "pocket_read", "rhyme_read", "generated_track", "alternate_pockets", "rewind_lines", "recording_notes", "truth_flags"]
};

const instructions = `
You are RNP Writing Engine: Sae's seed-to-track collaborator.

PRIMARY RULE
The user's seed lines are the record's DNA. Preserve them exactly, in their original order and wording. Never silently rewrite, polish, censor, or replace them. Build around them.

VOICE FINGERPRINT
- Smooth, conversational, mysterious, confident.
- Calm danger: relaxed in public, clearly capable if provoked, never performing toughness.
- Slight Scorpio humor: dry, observant, self-aware, occasionally spiritual.
- Millennial Black American slang used naturally, not as a checklist.
- Metaphors should feel effortless and visual. Favor a perspective flip or memorable image over dense rhyme displays.
- One rewind-worthy thought every 2–4 bars.
- Natural pockets, pauses, breath, and sentence rhythm matter more than constant end rhymes.
- Use "ninja" instead of the N-word where natural.

AVOID
- Lyrical-miracle writing, multisyllabic exhibitions, battle-rap clutter, academic vocabulary, Edgar Allan Poe narration, generic motivation, forced internal rhymes, fake luxury, fabricated crime, or invented biography.
- Imitating any named artist. Broad qualities such as wit, imagery, economy, melody, or pocket switching are allowed; copied cadence, lyrics, or signature phrasing are not.
- Rhyming every line merely to prove technical skill.

WRITING METHOD
1. Read the seed for sentence length, landing words, repeated sounds, slang, emotional temperature, implied melody, and breath gaps.
2. Continue the thought before introducing a new topic.
3. Use beat metadata and the supplied arrangement as timing guidance. State uncertainty when BPM/key/sections are estimates.
4. Let section energy change naturally: cool observation, wider confidence, tighter intensity, humor release, quiet resolution when appropriate.
5. Keep facts inside supplied truth/context. Put anything uncertain in truth_flags instead of inventing it.
6. For build_full_track, create a complete record that fits the supplied beat map. For fill_empty_bars, preserve all non-empty supplied lines and fill only obvious blanks or labeled empty sections.
7. Do not explain the song inside generated_track. Output lyrics with clear section labels.
8. Alternate pockets are short optional continuations, not complete replacement songs.

REFERENCE IMPACT
A line like "I ain't paranoid, I just waved at karma first" works because it is plainspoken, spiritual, slightly funny, quietly dangerous, and reveals a second meaning after it passes. Recreate that level of impact without copying the line or formula repeatedly.
`.trim();

export function GET(request) {
  return json({
    ok: true,
    route: "/api/generate-track",
    method: request.method,
    keyConfigured: Boolean(process.env.OPENAI_API_KEY),
    engineVersion: "rnp-writing-seed-1.0"
  });
}

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) return json({ ok: false, error: "OPENAI_API_KEY is missing in Vercel." }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "RNP received an invalid request." }, 400); }

  const mode = clean(body?.mode, 40);
  const allowed = new Set(["continue_hook", "continue_verse", "build_full_track", "fill_empty_bars"]);
  const data = {
    mode: allowed.has(mode) ? mode : "build_full_track",
    seed: clean(body?.seed, MAX_SEED),
    title: clean(body?.title, 180),
    truth: clean(body?.truth, MAX_CONTEXT),
    existingLyrics: clean(body?.existingLyrics, MAX_CONTEXT),
    vibe: clean(body?.vibe, 120),
    emotionalArc: cleanArray(body?.emotionalArc, 12, 80),
    slangNotes: cleanArray(body?.slangNotes, 30, 220),
    beat: {
      name: clean(body?.beat?.name, 180),
      bpm: Number.isFinite(Number(body?.beat?.bpm)) ? Number(body.beat.bpm) : null,
      key: clean(body?.beat?.key, 40),
      durationSeconds: Number.isFinite(Number(body?.beat?.durationSeconds)) ? Number(body.beat.durationSeconds) : null,
      arrangement: Array.isArray(body?.beat?.arrangement)
        ? body.beat.arrangement.slice(0, 16).map(x => ({
            name: clean(x?.name, 30),
            start: Number.isFinite(Number(x?.start)) ? Number(x.start) : null,
            end: Number.isFinite(Number(x?.end)) ? Number(x.end) : null,
            energy: Number.isFinite(Number(x?.energy)) ? Number(x.energy) : null
          }))
        : []
    }
  };

  if (!data.seed) return json({ ok: false, error: "Give RNP at least one seed line first." }, 400);

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      instructions,
      input: JSON.stringify({ task: "Continue Sae's writing from his exact seed lines.", ...data }, null, 2),
      text: {
        format: {
          type: "json_schema",
          name: "rnp_seed_to_track",
          description: "A seed-preserving track continuation in Sae's authentic writing voice.",
          strict: true,
          schema
        }
      },
      max_output_tokens: 7000,
      store: false
    });

    if (response.status === "incomplete" || !response.output_text) {
      return json({ ok: false, error: "The Writing Engine stopped before the track was complete." }, 502);
    }

    const result = JSON.parse(response.output_text);
    const normalizedSeed = data.seed.replace(/\r\n/g, "\n").trim();
    const normalizedTrack = String(result.generated_track || "").replace(/\r\n/g, "\n");
    const seedLines = normalizedSeed.split("\n").map(x => x.trim()).filter(Boolean);
    const missing = seedLines.filter(line => !normalizedTrack.includes(line));

    if (missing.length) {
      return json({ ok: false, error: "The Writing Engine changed or dropped part of your seed. Nothing was accepted—run it again." }, 502);
    }

    return json({ ok: true, model: response.model, engineVersion: "rnp-writing-seed-1.0", result: { ...result, seed_preserved: true } });
  } catch (error) {
    console.error("RNP Writing Engine error", { message: error?.message, status: error?.status, code: error?.code });
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return json({ ok: false, error: status === 429 ? "The Writing Engine is temporarily rate-limited." : "The Writing Engine could not complete this track." }, status);
  }
}
