import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }
  });
}
function clean(value, max = 1000) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          what_happened: { type: "string" },
          why_people_get_it: { type: "string" },
          fresh_angle: { type: "string" },
          cliche_to_avoid: { type: "string" },
          shelf_life: { type: "string", enum: ["lasting", "current", "short-term", "overused"] }
        },
        required: ["title", "what_happened", "why_people_get_it", "fresh_angle", "cliche_to_avoid", "shelf_life"]
      }
    }
  },
  required: ["items"]
};

export function GET(request) {
  return json({
    ok: true,
    route: "/api/cultural-pulse",
    method: request.method,
    keyConfigured: Boolean(process.env.OPENAI_API_KEY),
    webSearch: true,
    engineVersion: "rnp-cultural-pulse-1.0"
  });
}

export async function POST(request) {
  if (!process.env.OPENAI_API_KEY) return json({ ok: false, error: "OPENAI_API_KEY is missing in Vercel." }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "RNP received an invalid Cultural Pulse request." }, 400); }

  const days = Math.max(1, Math.min(365, Number(body?.days) || 30));
  const lane = clean(body?.lane, 40) || "all";
  const tone = clean(body?.tone, 40) || "clever";
  const direction = clean(body?.direction, 1200);
  const seed = clean(body?.seed, 1800);
  const truth = clean(body?.truth, 1800);

  const instructions = `
You are RNP Cultural Pulse, a current-reference research assistant for a songwriter.

Search the public web for widely recognized cultural moments from approximately the requested time window. Focus on verifiable, broadly reported moments in music, entertainment, sports, gaming, internet culture, and memes according to the requested lane.

Return usable reference context, not finished lyrics.
- Explain the public fact briefly and neutrally.
- Explain why listeners would recognize it.
- Suggest an original thematic or wordplay angle without writing a full bar.
- Identify the obvious cliché or overused angle to avoid.
- Classify shelf life as lasting, current, short-term, or overused.
- Exclude rumors, private-life speculation, graphic tragedy, ongoing criminal accusations, or anything likely to defame or exploit a person.
- Do not quote copyrighted lyrics, movie dialogue, or viral posts.
- Do not imitate a living artist.
- Favor moments that can support humor, understanding, confidence, adversity, relationships, or layered wordplay.
`.trim();

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5-mini",
      tools: [{ type: "web_search", search_context_size: "medium" }],
      instructions,
      input: JSON.stringify({
        task: "Find current cultural references suitable for original songwriting inspiration.",
        freshness_days: days,
        lane,
        desired_tone: tone,
        user_direction: direction,
        current_seed_context: seed,
        truth_context: truth
      }, null, 2),
      text: {
        format: {
          type: "json_schema",
          name: "rnp_cultural_pulse",
          strict: true,
          schema
        }
      },
      max_output_tokens: 3500,
      store: false
    });

    if (!response.output_text) return json({ ok: false, error: "Cultural Pulse returned no usable references." }, 502);
    const parsed = JSON.parse(response.output_text);
    return json({ ok: true, engineVersion: "rnp-cultural-pulse-1.0", items: parsed.items || [] });
  } catch (error) {
    console.error("RNP Cultural Pulse error", { message: error?.message, status: error?.status, code: error?.code });
    const status = Number.isInteger(error?.status) ? error.status : 500;
    return json({ ok: false, error: status === 429 ? "Cultural Pulse is temporarily rate-limited." : "Cultural Pulse could not complete the scan." }, status);
  }
}
