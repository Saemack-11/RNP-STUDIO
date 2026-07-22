import OpenAI from "openai";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function clean(value, maxLength = 12000) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function systemInstructions() {
  return `
You are the secure intelligence engine inside RNP Studio.

RNP means Real Ninja Poetics.

Help Sae turn real experiences, emotions, fatherhood, route life,
relationships, rebuilding, discipline, spirituality, adversity,
business, and legacy into original music.

Rules:

- Never invent experiences, crimes, money, possessions, violence,
  relationships, losses, or achievements.
- Use only the truth and memories supplied by the user.
- Never imitate a named artist.
- Translate influences into broad qualities such as layered wordplay,
  philosophical imagery, melodic phrasing, emotional honesty,
  internal rhyme, rugged storytelling, and trap atmosphere.
- Preserve Sae's natural voice.
- Avoid academic, generic, preachy, or overly polished writing.
- Give creative support without replacing his pen.
- Keep all lyrics and concepts original.

Return valid JSON only with these exact keys:

{
  "creative_center": "string",
  "council": [
    {
      "agent": "string",
      "direction": "string"
    }
  ],
  "hook_directions": ["string"],
  "pocket_plan": "string",
  "imagery": ["string"],
  "starter_material": ["string"],
  "recording_notes": ["string"],
  "authenticity_checks": ["string"]
}
`.trim();
}

export default {
  async fetch(request) {
    if (request.method === "GET") {
      return json({
        ok: true,
        route: "/api/rnp",
        status: "RNP function online",
        keyConfigured: Boolean(process.env.OPENAI_API_KEY)
      });
    }

    if (request.method !== "POST") {
      return json(
        {
          ok: false,
          error: "Method not allowed."
        },
        405
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return json(
        {
          ok: false,
          error: "OPENAI_API_KEY is missing in Vercel."
        },
        503
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          ok: false,
          error: "Invalid JSON request."
        },
        400
      );
    }

    const truth = clean(body?.truth);
    const lyrics = clean(body?.lyrics, 16000);

    if (!truth && !lyrics) {
      return json(
        {
          ok: false,
          error: "RNP needs truth or lyrics before waking the Council."
        },
        400
      );
    }

    try {
      /*
       * Create the client inside the request.
       * This prevents a missing key from crashing the entire function
       * before the handler can return a readable error.
       */
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const input = {
        title: clean(body?.title, 180),
        chapter: clean(body?.chapter, 100),
        vibe: clean(body?.vibe, 100),
        bpm: Number(body?.bpm) || null,
        key: clean(body?.key, 40),
        beatName: clean(body?.beatName, 180),
        truth,
        lyrics,
        memories: Array.isArray(body?.memories)
          ? body.memories.slice(0, 10)
          : []
      };

      const response = await openai.responses.create({
        model: process.env.OPENAI_MODEL || "gpt-5-mini",

        instructions: systemInstructions(),

        input: JSON.stringify(input, null, 2),

        max_output_tokens: 2200,

        store: false
      });

      if (!response.output_text) {
        throw new Error("The model returned an empty response.");
      }

      let result;

      try {
        result = JSON.parse(response.output_text);
      } catch {
        throw new Error("The model response was not valid JSON.");
      }

      return json({
        ok: true,
        model: response.model,
        result
      });
    } catch (error) {
      console.error("RNP function error:", {
        name: error?.name,
        message: error?.message,
        status: error?.status,
        requestId: error?.request_id
      });

      return json(
        {
          ok: false,
          error: error?.message || "RNP model request failed."
        },
        Number.isInteger(error?.status)
          ? error.status
          : 500
      );
    }
  }
};