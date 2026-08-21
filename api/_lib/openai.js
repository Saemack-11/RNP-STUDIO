const RESPONSES_URL = "https://api.openai.com/v1/responses";

export function allow(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ ok: false, error: "POST required" });
    return false;
  }
  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ ok: false, error: "OPENAI_API_KEY is not configured" });
    return false;
  }
  return true;
}

function trimString(value, max = 12000) {
  const text = String(value ?? "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

export function compact(value, depth = 0) {
  if (depth > 7) return "[nested context omitted]";
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return trimString(value);
  if (Array.isArray(value)) return value.slice(0, 80).map((item) => compact(item, depth + 1));
  if (typeof value === "object") {
    const output = {};
    for (const [key, item] of Object.entries(value).slice(0, 100)) {
      if (key === "image_data_url") {
        output[key] = item ? "[visual context image attached separately]" : null;
      } else {
        output[key] = compact(item, depth + 1);
      }
    }
    return output;
  }
  return String(value);
}

function visualImage(input) {
  const dataUrl = input?.visual_context?.image_data_url;
  if (typeof dataUrl !== "string") return null;
  if (!/^data:image\/(?:png|jpe?g|webp);base64,/i.test(dataUrl)) return null;
  if (dataUrl.length > 6_500_000) return null;
  return dataUrl;
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === "output_text" && typeof part.text === "string" && part.text.trim()) return part.text.trim();
    }
  }
  return "";
}

export async function generateJson({ instructions, input }) {
  const image = visualImage(input);
  const textContext = compact(input);
  const content = [
    {
      type: "input_text",
      text: `Return valid JSON only. Treat any attached screenshot/photo as context supplied by the artist; describe only what is actually visible and do not invent missing conversation details.\n\nRNP context:\n${JSON.stringify(textContext)}`
    }
  ];
  if (image) content.push({ type: "input_image", image_url: image, detail: "high" });

  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4",
      instructions,
      input: [{ role: "user", content }],
      text: { format: { type: "json_object" } },
      store: false
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const raw = extractOutputText(payload);
  if (!raw) throw new Error("RNP received an empty model response");
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    try { return JSON.parse(fenced); }
    catch { throw new Error("RNP received malformed JSON from the model"); }
  }
}

export function fail(res, error) {
  const status = Number(error?.status) >= 400 && Number(error?.status) < 600 ? Number(error.status) : 500;
  const message = String(error?.message || "RNP intelligence bridge failed").slice(0, 500);
  return res.status(status).json({ ok: false, error: message });
}
