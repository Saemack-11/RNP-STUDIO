import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_TRUTH_LENGTH = 12000;
const MAX_LYRICS_LENGTH = 16000;
const MAX_MEMORIES = 10;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function cleanText(value, maxLength = 1000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanMemories(memories) {
  if (!Array.isArray(memories)) {
    return [];
  }

  return memories
    .slice(0, MAX_MEMORIES)
    .map((memory) => ({
      title: cleanText(memory?.title, 140),
      category: cleanText(memory?.category, 80),
      body: cleanText(memory?.body, 1500),
      lesson: cleanText(memory?.lesson, 500)
    }))
    .filter((memory) => memory.title || memory.body);
}

const councilSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    creative_center: {
      type: "string"
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

        required: [
          "agent",
          "direction"
        ]
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

const instructions = `
You are the secure intelligence engine inside RNP Studio,
which means Real Ninja Poetics.

RNP is Sae's private, truth-first creative studio.

Your purpose is to help him transform real experiences,
emotions, fatherhood, route life, relationships, rebuilding,
discipline, spirituality, business, adversity, and legacy
into original music.

NON-NEGOTIABLE RULES

1. Never invent experiences, crimes, violence, possessions,
   money, relationships, losses, or accomplishments.

2. Treat the supplied truth, lyrics, and memories as the
   factual boundary.

3. When information is missing, suggest a direction or identify
   the detail Sae should provide. Never fabricate it.

4. Never imitate or impersonate a named artist.

5. Musical influences may only be translated into broad qualities,
   such as layered wordplay, internal rhyme, philosophical imagery,
   melodic phrasing, emotional honesty, conversational cadence,
   atmospheric production, or rugged storytelling.

6. Preserve Sae's natural voice. Avoid generic AI writing,
   academic wording, preachiness, and unnecessary polish.

7. Use specific imagery from the supplied material whenever possible.

8. Keep all concepts and starter lines original.

9. The Council supports Sae's pen. It does not replace it.

10. Keep starter material usable but leave room for Sae to finish
    and personalize the record.

PRODUCER'S TABLE AGENTS

- Story Architect: protects the timeline, truth, and narrative.
- Wordplay Smith: finds doubles, flips, punchlines, and layered phrasing.
- Philosopher: turns lived adversity into wisdom without preaching.
- Pocket Finder: suggests cadence, pauses, density, and flow movement.
- Hook Architect: identifies the simplest emotional center.
- Rhyme Engineer: develops internal rhyme and structural patterns.
- Ad-Lib Director: adds energy without overcrowding the record.
- Studio Engineer: recommends doubles, punches, harmonies, and space.

BandLab records. RNP thinks.
`.trim();

export function GET(request) {
  return json({
    ok: true,
    route: "/api/rnp",
    status: "RNP Council model route is online",
    method: request.method,
    keyConfigured: Boolean(process.env.OPENAI_API_KEY)
  });
}

export async function POST(request) {
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
        error: "RNP received an invalid request."
      },
      400
    );
  }

  const data = {
    title: cleanText(body?.title, 180),
    chapter: cleanText(body?.chapter, 100),
    vibe: cleanText(body?.vibe, 100),

    bpm: Number.isFinite(Number(body?.bpm))
      ? Math.max(30, Math.min(300, Number(body.bpm)))
      : null,

    key: cleanText(body?.key, 40),
    beatName: cleanText(body?.beatName, 180),

    truth: cleanText(
      body?.truth,
      MAX_TRUTH_LENGTH
    ),

    lyrics: cleanText(
      body?.lyrics,
      MAX_LYRICS_LENGTH
    ),

    memories: cleanMemories(
      body?.memories
    )
  };

  if (!data.truth && !data.lyrics) {
    return json(
      {
        ok: false,
        error: "Tell the story before waking the Council."
      },
      400
    );
  }

  try {
    const response = await client.responses.create({
      model:
        process.env.OPENAI_MODEL ||
        "gpt-5-mini",

      instructions,

      input: JSON.stringify(
        {
          task:
            "Hold a Producer's Table session for this RNP record.",

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
          relevant_memories: data.memories
        },
        null,
        2
      ),

      text: {
        format: {
          type: "json_schema",
          name: "rnp_council_session",

          description:
            "A structured, truth-grounded RNP Producer's Table response.",

          strict: true,
          schema: councilSchema
        }
      },

      max_output_tokens: 6000,
      store: false
      });

if (response.status === "incomplete") {
  const reason =
    response.incomplete_details?.reason ||
    "unknown";

  console.error(
    "RNP response incomplete:",
    {
      reason,
      usage: response.usage
    }
  );

  return json(
    {
      ok: false,
      error:
        reason === "max_output_tokens" ||
        reason === "max_tokens"
          ? "The Council developed a response that was too long. Run it again or shorten the story slightly."
          : "The Council response stopped before completion."
    },
    502
  );
}
    if (!response.output_text) {
      return json(
        {
          ok: false,
          error: "The Council returned an empty response."
        },
        502
      );
    }

    let result;

    try {
      result = JSON.parse(
        response.output_text
      );
    } catch {
      console.error(
        "RNP invalid model output:",
        response.output_text
      );

      return json(
        {
          ok: false,
          error: "The Council returned unreadable structured output."
        },
        502
      );
    }

    return json({
      ok: true,
      model: response.model,
      result
    });
  
        } catch (error) {
    console.error("RNP Council error:", {
      name: error?.name,
      message: error?.message,
      status: error?.status,
      code: error?.code,
      requestId: error?.request_id
    });

    const status =
      Number.isInteger(error?.status) &&
      error.status >= 400 &&
      error.status < 600
        ? error.status
        : 500;

    let message =
      "The RNP Council could not complete this session.";

    const errorCode = String(
      error?.code ||
      error?.error?.code ||
      error?.cause?.code ||
      ""
    ).toLowerCase();

    const errorMessage = String(
      error?.message || ""
    ).toLowerCase();

    if (status === 401) {
      message =
        "The OpenAI API key was rejected. Check the key saved in Vercel.";
    } else if (
      status === 429 &&
      (
        errorCode === "insufficient_quota" ||
        errorMessage.includes("insufficient_quota") ||
        errorMessage.includes("exceeded your current quota") ||
        errorMessage.includes("billing")
      )
    ) {
      message =
        "The RNP API balance is empty or the spending limit has been reached. Add API credits or increase the project budget.";
    } else if (status === 429) {
      message =
        "The Council is temporarily rate-limited. Wait briefly, then try again once.";
    } else if (
      status === 403 &&
      (
        errorMessage.includes("budget") ||
        errorMessage.includes("quota")
      )
    ) {
      message =
        "The RNP project budget or usage limit is blocking model requests.";
    } else if (
      errorMessage.includes("model")
    ) {
      message = error.message;
    }

    return json(
      {
        ok: false,
        error: message
      },
      status
    );
  }
}