import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const ALLOWED_MODES = new Set([
  "council",
  "hook",
  "verse",
  "pocket",
  "rewrite"
]);

const MAX_TRUTH_LENGTH = 12_000;
const MAX_LYRICS_LENGTH = 16_000;
const MAX_MEMORIES = 12;
const MAX_MEMORY_LENGTH = 1_500;

/*
 * Best-effort rate limiting.
 *
 * Because Vercel Functions can run across multiple instances, this Map is
 * not a permanent global rate limiter. It still protects each warm instance.
 * A durable limiter such as Upstash can be connected later.
 */
const requestsByIp = new Map();

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function getRequestIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowLength = 60_000;
  const maximumRequests = 10;

  const existing = requestsByIp.get(ip) || {
    count: 0,
    startedAt: now
  };

  if (now - existing.startedAt > windowLength) {
    requestsByIp.set(ip, {
      count: 1,
      startedAt: now
    });

    return false;
  }

  existing.count += 1;
  requestsByIp.set(ip, existing);

  return existing.count > maximumRequests;
}

function validateSameOrigin(request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  /*
   * Requests made directly by some browsers or local tools may omit Origin.
   * When it exists, require it to match the deployed host.
   */
  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function sanitizeMemories(memories) {
  if (!Array.isArray(memories)) {
    return [];
  }

  return memories
    .slice(0, MAX_MEMORIES)
    .map((memory) => ({
      title: cleanText(memory?.title, 140),
      category: cleanText(memory?.category, 80),
      body: cleanText(memory?.body, MAX_MEMORY_LENGTH),
      lesson: cleanText(memory?.lesson, 500)
    }))
    .filter((memory) => memory.title || memory.body);
}

function buildSystemInstructions() {
  return `
You are the intelligence engine inside RNP Studio: Real Ninja Poetics.

RNP is a private, truth-first creative studio built around the artist Sae.

CORE PURPOSE
Help Sae transform real experiences, emotions, memories, observations,
fatherhood, route life, rebuilding, spirituality, relationships, discipline,
business, adversity, and legacy into original music.

NON-NEGOTIABLE RULES

1. Never fabricate life experiences, crimes, wealth, violence, relationships,
   losses, possessions, or achievements.

2. Treat the supplied truth and memories as the factual boundary.

3. If a detail is missing, give a creative direction or mark it as a detail
   Sae should supply. Do not invent it.

4. Do not impersonate or imitate any named living artist.

5. When musical influences are mentioned, translate them into broad,
   non-identifying qualities such as:
   - layered wordplay
   - philosophical imagery
   - melodic phrasing
   - conversational cadence
   - emotional honesty
   - internal rhyme
   - rugged storytelling
   - atmospheric trap production

6. Preserve Sae's natural voice. Do not make the writing sound academic,
   overly polished, generic, preachy, or like an AI demonstration.

7. Prefer specific physical images taken from the supplied story:
   highways, receipts, gas stations, dashboards, hotel rooms, phone calls,
   work routes, weather, family moments, mechanical problems, and other
   details actually provided.

8. Lyrics and concepts must remain original.

9. Do not place labels such as "AI generated" inside creative writing.

10. The goal is creative support, not replacement. Give Sae usable lanes,
    options, structures, and starting points that leave room for his pen.

RNP PRINCIPLE
BandLab records. RNP thinks.

Return only the requested structured response.
`.trim();
}

function buildUserInput(data) {
  return JSON.stringify(
    {
      requested_mode: data.mode,
      session: {
        title: data.title,
        chapter: data.chapter,
        vibe: data.vibe,
        bpm: data.bpm,
        musical_key: data.key,
        beat_name: data.beatName
      },
      raw_truth: data.truth,
      current_lyrics: data.lyrics,
      relevant_memories: data.memories,
      instruction:
        data.mode === "council"
          ? "Hold a concise Producer's Table session. Analyze the truthful creative center, imagery, hook direction, rhyme opportunities, pocket, arrangement, recording approach, and authenticity risks."
          : data.mode === "hook"
            ? "Develop three original hook directions grounded only in the supplied truth. Keep them concise, memorable, natural, and emotionally clear."
            : data.mode === "verse"
              ? "Develop an original verse framework and starter bars grounded only in the supplied truth. Preserve room for Sae to finish the writing."
              : data.mode === "pocket"
                ? "Create a pocket and cadence plan using BPM, vibe, lyrical density, pauses, and section movement."
                : "Improve the supplied lyrics while preserving meaning, voice, factual truth, and originality."
    },
    null,
    2
  );
}

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    creative_center: {
      type: "string",
      description:
        "The truthful emotional center of the record in one or two sentences."
    },

    council: {
      type: "array",
      minItems: 5,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          agent: {
            type: "string"
          },
          direction: {
            type: "string"
          }
        },
        required: ["agent", "direction"]
      }
    },

    hook_directions: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "string"
      }
    },

    pocket_plan: {
      type: "string"
    },

    imagery: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "string"
      }
    },

    starter_material: {
      type: "array",
      minItems: 0,
      maxItems: 12,
      items: {
        type: "string"
      }
    },

    recording_notes: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "string"
      }
    },

    authenticity_checks: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "string"
      }
    }
  },

  required: [
    "creative_center",
    "council",
    "hook_directions",
    "pocket_plan",
    "imagery",
    "starter_material",
    "recording_notes",
    "authenticity_checks"
  ]
};

export default async function handler(request) {
  if (request.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        error: "Method not allowed."
      },
      405
    );
  }

  if (!validateSameOrigin(request)) {
    return jsonResponse(
      {
        ok: false,
        error: "Origin not allowed."
      },
      403
    );
  }

  const ip = getRequestIp(request);

  if (isRateLimited(ip)) {
    return jsonResponse(
      {
        ok: false,
        error: "Too many requests. Try again shortly."
      },
      429
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("RNP configuration error: OPENAI_API_KEY is missing.");

    return jsonResponse(
      {
        ok: false,
        error: "The RNP intelligence engine is not configured."
      },
      503
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "Invalid JSON body."
      },
      400
    );
  }

  const mode = cleanText(body?.mode, 30).toLowerCase();

  if (!ALLOWED_MODES.has(mode)) {
    return jsonResponse(
      {
        ok: false,
        error: "Unsupported RNP mode."
      },
      400
    );
  }

  const data = {
    mode,
    title: cleanText(body?.title, 180),
    chapter: cleanText(body?.chapter, 100),
    vibe: cleanText(body?.vibe, 100),
    bpm: Number.isFinite(Number(body?.bpm))
      ? Math.max(30, Math.min(300, Number(body.bpm)))
      : null,
    key: cleanText(body?.key, 40),
    beatName: cleanText(body?.beatName, 180),
    truth: cleanText(body?.truth, MAX_TRUTH_LENGTH),
    lyrics: cleanText(body?.lyrics, MAX_LYRICS_LENGTH),
    memories: sanitizeMemories(body?.memories)
  };

  if (!data.truth && !data.lyrics) {
    return jsonResponse(
      {
        ok: false,
        error: "RNP needs truthful source material before the Council can work."
      },
      400
    );
  }

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",

      instructions: buildSystemInstructions(),

      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildUserInput(data)
            }
          ]
        }
      ],

      text: {
        format: {
          type: "json_schema",
          name: "rnp_creative_session",
          description:
            "A structured, truth-grounded RNP creative council response.",
          strict: true,
          schema: responseSchema
        }
      },

      max_output_tokens: 2_400,

      /*
       * Prevent this response from being deliberately stored as an
       * application-state Response object.
       */
      store: false
    });

    const rawOutput = response.output_text;

    if (!rawOutput) {
      throw new Error("The model returned no structured output.");
    }

    const result = JSON.parse(rawOutput);

    return jsonResponse({
      ok: true,
      model: response.model,
      requestId: response._request_id || null,
      result
    });
  } catch (error) {
    console.error("RNP model request failed:", {
      message: error?.message,
      status: error?.status,
      requestId: error?.request_id
    });

    const status =
      Number.isInteger(error?.status) &&
      error.status >= 400 &&
      error.status < 600
        ? error.status
        : 500;

    return jsonResponse(
      {
        ok: false,
        error:
          status === 401
            ? "The RNP model key was rejected."
            : status === 429
              ? "The model is receiving too many requests. Try again shortly."
              : "The RNP intelligence engine could not complete this session."
      },
      status
    );
  }
}