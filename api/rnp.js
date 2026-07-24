const SYSTEM = `You are the RNP Writing Engine and Authenticity Keeper for Sae.

Your job is to extend Sae's own writing without replacing his voice.

CORE RULES
- Preserve every seed line exactly and place the seed first.
- Continue the cadence, rhyme family, emotional direction, slang, imagery, and conversational texture.
- Use "ninja" rather than the N-word.
- Never invent murders, trafficking, criminal rank, wealth, affiliations, luxury, violence, or life experiences.
- Keep observational perspectives observational.
- Favor truthful details, layered wordplay, connected concept universes, natural pockets, humor, and musicality.
- Avoid lyrical-miracle clutter, generic AI phrasing, forced metaphors, over-explaining, and obvious filler.
- Do not imitate a living artist or copy lyrics.
- Use cultural and nostalgic references only when supplied by the user or project context.
- Flip references into an original angle instead of repeating famous lines or obvious internet jokes.
- Raw circumstances should lead toward evolution, strategy, accountability, boundaries, fatherhood, spirituality, survival, entrepreneurship, solitude, or legacy.
- Allow romance, sexuality, confidence, humor, and toxicity only when the requested song direction invites them.

PERSONAL SYMBOLIC LANES
Mars, Son of Mars Jordans, Saturn, SAE / Soul Above Everything, space, atmosphere, orbit, ninja movement, route life, fatherhood, solitude, storms, spirituality, entrepreneurship, survival, and legacy.

OUTPUT
Return only the preserved seed followed by 8–16 new bars.
Do not add headings, analysis, explanations, quotation marks, or critique.`;

const STRING_KEYS = new Set([
  'seed', 'seedText', 'seedLines', 'direction', 'songDirection', 'prompt',
  'lyrics', 'bars', 'hook', 'verse', 'idea', 'concept', 'description',
  'text', 'writing', 'draft'
]);

const MODE_KEYS = new Set([
  'modes', 'mode', 'tones', 'tone', 'styles', 'style', 'energy', 'mood'
]);

function parseBody(rawBody) {
  if (!rawBody) return {};
  if (typeof rawBody === 'object') return rawBody;

  if (typeof rawBody === 'string') {
    try {
      return JSON.parse(rawBody);
    } catch {
      return { seed: rawBody };
    }
  }

  return {};
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function uniqueStrings(values) {
  return [...new Set(values.map(cleanString).filter(Boolean))];
}

function collectNamedStrings(value, targetKeys, depth = 0, seen = new Set()) {
  if (depth > 6 || value == null || typeof value !== 'object' || seen.has(value)) {
    return [];
  }

  seen.add(value);
  const found = [];

  if (Array.isArray(value)) {
    for (const item of value) {
      found.push(...collectNamedStrings(item, targetKeys, depth + 1, seen));
    }
    return found;
  }

  for (const [key, item] of Object.entries(value)) {
    if (targetKeys.has(key)) {
      if (typeof item === 'string' && item.trim()) {
        found.push(item.trim());
      } else if (Array.isArray(item)) {
        for (const entry of item) {
          if (typeof entry === 'string' && entry.trim()) {
            found.push(entry.trim());
          } else {
            found.push(...collectNamedStrings(entry, targetKeys, depth + 1, seen));
          }
        }
      }
    }

    if (item && typeof item === 'object') {
      found.push(...collectNamedStrings(item, targetKeys, depth + 1, seen));
    }
  }

  return found;
}

function getSeed(body) {
  const directCandidates = [
    body.seed,
    body.seedText,
    body.seedLines,
    body.direction,
    body.songDirection,
    body.prompt,
    body.lyrics,
    body.bars,
    body.hook,
    body.verse,
    body.idea,
    body.concept,
    body.description,
    body.text,
    body.draft,

    body.session?.seed,
    body.session?.direction,
    body.session?.lyrics,
    body.session?.hook,

    body.writing?.seed,
    body.writing?.direction,
    body.writing?.lyrics,
    body.writing?.hook,
    body.writing?.text,

    body.project?.seed,
    body.project?.direction,
    body.project?.lyrics,
    body.project?.hook,

    body.payload?.seed,
    body.payload?.direction,
    body.payload?.lyrics,
    body.payload?.hook,

    body.request?.seed,
    body.request?.direction,
    body.request?.lyrics,
    body.request?.hook,

    body.data?.seed,
    body.data?.direction,
    body.data?.lyrics,
    body.data?.hook
  ];

  const direct = uniqueStrings(directCandidates);
  if (direct.length) return direct.join('\n');

  return uniqueStrings(
    collectNamedStrings(body, STRING_KEYS)
  ).join('\n');
}

function getModes(body) {
  const values = [
    body.modes,
    body.mode,
    body.tones,
    body.tone,
    body.styles,
    body.style,
    body.energy,
    body.mood,
    body.session?.modes,
    body.writing?.modes,
    body.project?.modes,
    body.payload?.modes
  ];

  const flattened = [];

  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      flattened.push(value.trim());
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.trim()) {
          flattened.push(item.trim());
        }
      }
    }
  }

  if (!flattened.length) {
    flattened.push(...collectNamedStrings(body, MODE_KEYS));
  }

  return uniqueStrings(flattened).slice(0, 20);
}

function getReferenceContext(body) {
  const sections = [];

  const nostalgiaEnabled =
    body.nostalgiaEnabled === true ||
    body.nostalgia?.enabled === true ||
    body.nostalgiaWall?.enabled === true;

  const nostalgiaItems = uniqueStrings([
    ...(Array.isArray(body.nostalgia) ? body.nostalgia : []),
    ...(Array.isArray(body.nostalgia?.selected) ? body.nostalgia.selected : []),
    ...(Array.isArray(body.nostalgiaWall?.selected) ? body.nostalgiaWall.selected : []),
    ...(Array.isArray(body.nostalgiaReferences) ? body.nostalgiaReferences : [])
  ]);

  if (nostalgiaEnabled && nostalgiaItems.length) {
    sections.push(`NOSTALGIA WALL:\n${nostalgiaItems.join(', ')}`);
  }

  const culturalItems = uniqueStrings([
    ...(Array.isArray(body.culturalPulse) ? body.culturalPulse : []),
    ...(Array.isArray(body.culturalPulse?.selected) ? body.culturalPulse.selected : []),
    ...(Array.isArray(body.culturalReferences) ? body.culturalReferences : []),
    ...(Array.isArray(body.culture?.selected) ? body.culture.selected : [])
  ]);

  if (culturalItems.length) {
    sections.push(`CULTURAL PULSE:\n${culturalItems.join(', ')}`);
  }

  const referenceDirection = uniqueStrings([
    body.referenceDirection,
    body.referenceMeaning,
    body.nostalgia?.direction,
    body.nostalgiaWall?.direction,
    body.culture?.direction
  ]);

  if (referenceDirection.length) {
    sections.push(`REFERENCE DIRECTION:\n${referenceDirection.join('\n')}`);
  }

  return sections.join('\n\n');
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (
        content?.type === 'output_text' &&
        typeof content?.text === 'string' &&
        content.text.trim()
      ) {
        return content.text.trim();
      }
    }
  }

  return '';
}

function summarizeBody(body) {
  const summary = {};

  for (const [key, value] of Object.entries(body || {})) {
    if (typeof value === 'string') {
      summary[key] = `[string:${value.length}]`;
    } else if (Array.isArray(value)) {
      summary[key] = `[array:${value.length}]`;
    } else if (value && typeof value === 'object') {
      summary[key] = `[object:${Object.keys(value).join(',')}]`;
    } else {
      summary[key] = typeof value;
    }
  }

  return summary;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
      expected: 'POST'
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      ok: false,
      error: 'OPENAI_API_KEY is not configured in Vercel.'
    });
  }

  let body;

  try {
    body = parseBody(req.body);
  } catch (error) {
    console.error('RNP body parse error:', error);

    return res.status(400).json({
      ok: false,
      error: 'The request body could not be read.'
    });
  }

  const seed = getSeed(body);
  const modes = getModes(body);
  const referenceContext = getReferenceContext(body);

  console.log('RNP request summary:', summarizeBody(body));
  console.log('RNP extracted seed length:', seed.length);

  if (!seed) {
    return res.status(400).json({
      ok: false,
      error: 'Add song direction, lyrics, a hook, or seed bars before generating.',
      receivedFields: Object.keys(body || {})
    });
  }

  if (seed.length > 12000) {
    return res.status(400).json({
      ok: false,
      error: 'The writing seed is too long. Keep it under 12,000 characters.'
    });
  }

  const userPrompt = [
    `ACTIVE MODES: ${modes.join(', ') || 'layered, raw, evolution, ninja'}`,
    referenceContext,
    `SEED BARS / SONG DIRECTION:\n${seed}`
  ].filter(Boolean).join('\n\n');

  let response;

  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-5',
        input: [
          {
            role: 'developer',
            content: [
              {
                type: 'input_text',
                text: SYSTEM
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: userPrompt
              }
            ]
          }
        ]
      })
    });
  } catch (error) {
    console.error('RNP network error:', error);

    return res.status(502).json({
      ok: false,
      error: 'RNP could not reach the writing engine. Try again in a moment.'
    });
  }

  let data = {};

  try {
    data = await response.json();
  } catch (error) {
    console.error('RNP response parse error:', error);

    return res.status(502).json({
      ok: false,
      error: 'The writing engine returned an unreadable response.'
    });
  }

  if (!response.ok) {
    const upstreamMessage =
      data?.error?.message ||
      data?.message ||
      'The writing engine rejected the request.';

    console.error('RNP upstream error:', {
      status: response.status,
      type: data?.error?.type,
      code: data?.error?.code,
      message: upstreamMessage
    });

    return res.status(response.status === 429 ? 429 : 502).json({
      ok: false,
      error:
        response.status === 429
          ? 'OpenAI quota or rate limit reached. Check API billing and try again.'
          : upstreamMessage,
      upstreamStatus: response.status
    });
  }

  const text = extractOutputText(data);

  if (!text) {
    console.error('RNP empty output:', {
      responseId: data?.id,
      status: data?.status
    });

    return res.status(502).json({
      ok: false,
      error: 'The writing engine completed without returning bars.'
    });
  }

  return res.status(200).json({
    ok: true,
    text,
    output: text
  });
}
