import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MAX_TRUTH_LENGTH = 12000;
const MAX_LYRICS_LENGTH = 16000;
const MAX_MEMORIES = 12;
const MAX_GLOSSARY_TERMS = 48;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function cleanText(
  value,
  maxLength = 1000
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

function cleanStringArray(
  value,
  maxItems = 20,
  maxLength = 140
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, maxItems)
    .map((item) =>
      cleanText(
        item,
        maxLength
      )
    )
    .filter(Boolean);
}

function cleanMemories(memories) {
  if (!Array.isArray(memories)) {
    return [];
  }

  return memories
    .slice(0, MAX_MEMORIES)
    .map((memory) => ({
      title:
        cleanText(
          memory?.title,
          140
        ),

      category:
        cleanText(
          memory?.category,
          80
        ),

      body:
        cleanText(
          memory?.body,
          1600
        ),

      lesson:
        cleanText(
          memory?.lesson,
          500
        )
    }))
    .filter(
      (memory) =>
        memory.title ||
        memory.body
    );
}

function cleanGlossary(glossary) {
  if (!Array.isArray(glossary)) {
    return [];
  }

  return glossary
    .slice(
      0,
      MAX_GLOSSARY_TERMS
    )
    .map((entry) => ({
      term:
        cleanText(
          entry?.term,
          80
        ),

      meaning:
        cleanText(
          entry?.meaning,
          500
        ),

      context:
        cleanText(
          entry?.context,
          500
        )
    }))
    .filter(
      (entry) =>
        entry.term &&
        entry.meaning
    );
}

const saeGlossary = [
  {
    term: "snaps",

    meaning:
      "Dope fiends or street customers who arrive to buy drugs.",

    context:
      "Older regional street language—not Snapchat, photographs, text messages, or handoffs."
  },

  {
    term:
      "dressed bummy",

    meaning:
      "Intentionally dressing plain, worn-down, or unflashy to remain low-profile.",

    context:
      "Can communicate strategy, secrecy, restraint, survival, and refusing to advertise money."
  },

  {
    term:
      "trapping",

    meaning:
      "Past street-level drug dealing described as lived history and survival context.",

    context:
      "Do not glorify or invent operations. Center consequences, choices, lessons, and evolution."
  },

  {
    term:
      "touch down / walk out",

    meaning:
      "Returning home after incarceration or confinement.",

    context:
      "Natural in promises about being ready when a loved one comes home."
  },

  {
    term: "motion",

    meaning:
      "Active income, opportunity, business, movement, or momentum.",

    context:
      "May describe quiet progress, not only public flexing."
  },

  {
    term: "ninja",

    meaning:
      "Sae's preferred clean substitute for the N-word in lyrics.",

    context:
      "Use only where it sounds natural in his voice."
  }
];

const councilSchema = {
  type: "object",

  additionalProperties: false,

  properties: {
    creative_center: {
      type: "string"
    },

    emotional_momentum: {
      type: "object",

      additionalProperties: false,

      properties: {
        arc: {
          type: "array",
          minItems: 3,
          maxItems: 10,

          items: {
            type: "string"
          }
        },

        transition_notes: {
          type: "string"
        },

        pressure_release: {
          type: "string"
        }
      },

      required: [
        "arc",
        "transition_notes",
        "pressure_release"
      ]
    },

    culture_lanes: {
      type: "array",
      minItems: 1,
      maxItems: 6,

      items: {
        type: "object",

        additionalProperties:
          false,

        properties: {
          reference_lane: {
            type: "string"
          },

          symbolic_value: {
            type: "string"
          },

          usage_rule: {
            type: "string"
          }
        },

        required: [
          "reference_lane",
          "symbolic_value",
          "usage_rule"
        ]
      }
    },

    council: {
      type: "array",
      minItems: 7,
      maxItems: 10,

      items: {
        type: "object",

        additionalProperties:
          false,

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
      maxItems: 10,

      items: {
        type: "string"
      }
    },

    starter_material: {
      type: "array",
      minItems: 0,
      maxItems: 16,

      items: {
        type: "string"
      }
    },

    recording_notes: {
      type: "array",
      minItems: 1,
      maxItems: 10,

      items: {
        type: "string"
      }
    },

    authenticity_checks: {
      type: "array",
      minItems: 1,
      maxItems: 8,

      items: {
        type: "string"
      }
    }
  },

  required: [
    "creative_center",
    "emotional_momentum",
    "culture_lanes",
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
You are the secure intelligence engine inside RNP Studio—Real Ninja Poetics.
RNP is Sae's private, truth-first cultural creative operating system.
BandLab records. RNP thinks.

MISSION

Transform supplied truth, memories, personal language, emotional movement,
and cultural context into an original full-song blueprint that preserves
Sae's voice. RNP supports his pen; it does not replace it.

TRUTH BOUNDARY

1. Never invent experiences, crimes, violence, money, dates, people,
   relationships, possessions, losses, or accomplishments.

2. Treat supplied truth, lyrics, memories, glossary, beat facts, selected
   influences, vibe layers, and emotional arc as the factual boundary.

3. Internally distinguish VERIFIED, INTERPRETATION, and NEEDS CONFIRMATION.

4. If a detail is unclear, ask. Never hide an invention inside a cinematic line.

5. A supplied glossary meaning outranks a common modern meaning.

VOICE

6. Preserve Sae's natural voice: smooth, honest, observant, confident,
   emotionally agile, metaphorical, conversational, lightly humorous when
   pressure needs release, and capable of shifting from reassurance to desire,
   pain, wisdom, aggression, or reflection without losing identity.

7. Avoid academic language, preachiness, generic motivational clichés,
   excessive polish, and obvious AI filler.

8. Keep all starter material original and incomplete enough for Sae to finish.

9. Use “ninja” instead of the N-word when that language is appropriate.

CULTURE ENGINE

Understand Black American and millennial hip-hop-era context from the 1980s
to the present: the crack epidemic and family disruption; war on drugs;
incarceration; absent parents; neighborhood economics; survival mentality;
loyalty; entrepreneurship; redemption; generational trauma; fatherhood;
martial arts; anime; street cinema; sports; boxing; cars; fashion; games;
television; technology; and hip-hop history.

Never imitate a named artist, actor, director, or performer. Named influences
may only guide broad qualities and symbolic meaning.

A reference must pass all tests:

- connected to supplied truth;
- symbolically strengthens the thought;
- sounds natural for Sae;
- does not claim a fictional character's acts as Sae's facts;
- is not inserted merely because it rhymes.

Examples of symbolic precision:

Jordan = elevation, flight, clutch competitiveness.

Kobe = obsessive repetition and preparation.

Iverson = authenticity, defiance, cultural influence.

Tyson = sudden force, intimidation, trauma, volatility, consequences.

Ali = verbal confidence, movement, principle, sacrifice.

Bruce Lee = adaptability, precision, discipline, economy, water.

Dragon Ball = training, transformation, hidden power, recovery, limits.

Street cinema = archetype and atmosphere, never fabricated autobiography.

EMOTIONAL MOMENTUM ENGINE

Do not assign one flat mood to the song. Map how emotion moves.

Sae's natural process often follows movement such as:

observation → appreciation → trust → commitment → confidence → desire →
intensity → humor/pressure release → reflection/resolution.

Other songs may move through:

pain → reflection → accountability → discipline → hope.

Use the supplied emotional arc as guidance, not a prison. Explain transitions,
where the emotional temperature rises, where it softens, and how humor,
silence, tenderness, aggression, or a punchline releases pressure.

FULL-SONG ARRANGEMENT

1. Build around supplied beat duration and BPM.

2. Never default automatically to two 16-bar verses.

3. Estimate usable four-beat bars only when duration and BPM are supplied.

4. Label all timing provisional unless technically verified.

5. For beats longer than 4:30, strongly consider 20–24 bar verses, three
   verses, extended bridges, purposeful instrumental breathing, or another
   structure justified by the story.

6. Pocket Plan must list section order, bars, approximate timestamps when
   calculable, narrative purpose, cadence, and energy movement.

7. Keep the final line/hook/outro near the beat's usable ending.

8. The story must progress; do not repeat ideas merely to fill time.

PRODUCER'S TABLE

- Story Architect: timeline, truth, progression.

- Street Archivist: slang, era, historical context.

- Culture Curator: precise metaphor lanes without imitation.

- Emotional Momentum Director: emotional sequence and transitions.

- Arrangement Director: complete song geography and ending.

- Wordplay Smith: doubles, flips, original layered phrasing.

- Philosopher: concise wisdom without sermons.

- Pocket Finder: cadence, breath, density, silence, escalation.

- Hook Architect / Rhyme Engineer: emotional center and rhyme architecture.

- Ad-Lib Director / Studio Engineer: sparse support, texture, recording space.

OUTPUT

Creative Center:
Precise emotional spine, conflict, and movement.

Emotional Momentum:
Arc plus transition and pressure-release notes.

Culture Lanes:
A small number of references with symbolic value and a usage rule.

Council:
Include Street Archivist, Emotional Momentum Director, and Arrangement Director.

Pocket Plan:
Full-song structure, not merely flow advice.

Authenticity Checks:
Only questions that materially protect truth or meaning.
`.trim();

export function GET(request) {
  return json({
    ok: true,

    route:
      "/api/rnp",

    status:
      "RNP Culture + Emotional Momentum Engine online",

    method:
      request.method,

    keyConfigured:
      Boolean(
        process.env.OPENAI_API_KEY
      ),

    engineVersion:
      "rnp-2.0-culture-momentum"
  });
}

export async function POST(request) {
  if (
    !process.env.OPENAI_API_KEY
  ) {
    return json(
      {
        ok: false,

        error:
          "OPENAI_API_KEY is missing in Vercel."
      },
      503
    );
  }

  let body;

  try {
    body =
      await request.json();
  } catch {
    return json(
      {
        ok: false,

        error:
          "RNP received an invalid request."
      },
      400
    );
  }

  const data = {
    title:
      cleanText(
        body?.title,
        180
      ),

    chapter:
      cleanText(
        body?.chapter,
        160
      ),

    vibe:
      cleanText(
        body?.vibe,
        180
      ),

    vibeLayers:
      cleanStringArray(
        body?.vibeLayers,
        4,
        100
      ),

    emotionalArc:
      cleanStringArray(
        body?.emotionalArc,
        10,
        100
      ),

    selectedInfluences:
      cleanStringArray(
        body?.selectedInfluences,
        12,
        100
      ),

    bpm:
      Number.isFinite(
        Number(body?.bpm)
      )
        ? Math.max(
            30,
            Math.min(
              300,
              Number(body.bpm)
            )
          )
        : null,

    durationSeconds:
      Number.isFinite(
        Number(
          body?.durationSeconds
        )
      )
        ? Math.max(
            1,
            Math.min(
              3600,
              Number(
                body.durationSeconds
              )
            )
          )
        : null,

    key:
      cleanText(
        body?.key,
        40
      ),

    beatName:
      cleanText(
        body?.beatName,
        180
      ),

    truth:
      cleanText(
        body?.truth,
        MAX_TRUTH_LENGTH
      ),

    lyrics:
      cleanText(
        body?.lyrics,
        MAX_LYRICS_LENGTH
      ),

    memories:
      cleanMemories(
        body?.memories
      ),

    glossary:
      cleanGlossary(
        body?.glossary
      )
  };

  if (
    !data.truth &&
    !data.lyrics
  ) {
    return json(
      {
        ok: false,

        error:
          "Tell the story before waking the Council."
      },
      400
    );
  }

  try {
    const response =
      await client.responses.create({
        model:
          process.env.OPENAI_MODEL ||
          "gpt-5-mini",

        instructions,

        input:
          JSON.stringify(
            {
              task:
                "Hold a complete RNP Culture Engine, Emotional Momentum, and Producer's Table session.",

              session: {
                title:
                  data.title,

                chapter:
                  data.chapter,

                primary_vibe:
                  data.vibe,

                vibe_layers:
                  data.vibeLayers,

                emotional_arc_requested:
                  data.emotionalArc,

                selected_influences:
                  data.selectedInfluences,

                bpm:
                  data.bpm,

                duration_seconds:
                  data.durationSeconds,

                musical_key:
                  data.key,

                beat_name:
                  data.beatName,

                timing_status:
                  data.durationSeconds &&
                  data.bpm
                    ? "User-provided timing; treat timestamps as provisional unless separately verified."
                    : "Exact arrangement timing is unavailable."
              },

              sae_language_glossary: [
                ...saeGlossary,
                ...data.glossary
              ],

              raw_truth:
                data.truth,

              current_lyrics:
                data.lyrics,

              relevant_memories:
                data.memories
            },
            null,
            2
          ),

        text: {
          format: {
            type:
              "json_schema",

            name:
              "rnp_culture_momentum_session",

            description:
              "A structured, truth-grounded RNP cultural and emotional songwriting blueprint.",

            strict:
              true,

            schema:
              councilSchema
          }
        },

        max_output_tokens:
          7500,

        store:
          false
      });

    if (
      response.status ===
      "incomplete"
    ) {
      const reason =
        response
          .incomplete_details
          ?.reason ||
        "unknown";

      console.error(
        "RNP response incomplete:",
        {
          reason,
          usage:
            response.usage
        }
      );

      return json(
        {
          ok: false,

          error:
            reason ===
              "max_output_tokens" ||
            reason ===
              "max_tokens"
              ? "The Council developed a response that was too long. Run it again or tighten the story slightly."
              : "The Council response stopped before completion."
        },
        502
      );
    }

    if (
      !response.output_text
    ) {
      return json(
        {
          ok: false,

          error:
            "The Council returned an empty response."
        },
        502
      );
    }

    let result;

    try {
      result =
        JSON.parse(
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

          error:
            "The Council returned unreadable structured output."
        },
        502
      );
    }

    return json({
      ok: true,

      model:
        response.model,

      engineVersion:
        "rnp-2.0-culture-momentum",

      result
    });
  } catch (error) {
    console.error(
      "RNP Council error:",
      {
        name:
          error?.name,

        message:
          error?.message,

        status:
          error?.status,

        code:
          error?.code,

        requestId:
          error?.request_id
      }
    );

    const status =
      Number.isInteger(
        error?.status
      ) &&
      error.status >= 400 &&
      error.status < 600
        ? error.status
        : 500;

    const code =
      String(
        error?.code ||
        error?.error?.code ||
        error?.cause?.code ||
        ""
      ).toLowerCase();

    const messageText =
      String(
        error?.message ||
        ""
      ).toLowerCase();

    let message =
      "The RNP Council could not complete this session.";

    if (status === 401) {
      message =
        "The OpenAI API key was rejected. Check the key saved in Vercel.";
    } else if (
      status === 429 &&
      (
        code ===
          "insufficient_quota" ||

        messageText.includes(
          "insufficient_quota"
        ) ||

        messageText.includes(
          "exceeded your current quota"
        ) ||

        messageText.includes(
          "billing"
        )
      )
    ) {
      message =
        "The RNP API balance is empty or the spending limit has been reached. Add API credits or increase the project budget.";
    } else if (
      status === 429
    ) {
      message =
        "The Council is temporarily rate-limited. Wait briefly, then try again once.";
    } else if (
      status === 403 &&
      (
        messageText.includes(
          "budget"
        ) ||

        messageText.includes(
          "quota"
        )
      )
    ) {
      message =
        "The RNP project budget or usage limit is blocking model requests.";
    } else if (
      messageText.includes(
        "model"
      )
    ) {
      message =
        error.message;
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