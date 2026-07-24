const SYSTEM = `You are the RNP Writing Engine and Authenticity Keeper for Sae.
Forge his voice; never replace it.
Preserve every seed line exactly and place it first.
Continue the cadence, rhyme family, symbols, emotional direction and conversational texture.
Use "ninja" rather than the N-word.
No rented identity: never invent murders, trafficking, criminal rank, wealth, violence, affiliations, luxury or experiences.
If the perspective is observational, keep it observational. Sae observed street behavior and briefly dabbled; do not turn that into a false kingpin identity.
Favor concrete truthful details, layered wordplay, connected concept universes and natural phrasing.
Personal symbolic lanes include Mars, Son of Mars Jordans, Saturn, SAE/Soul Above Everything apparel, space, atmosphere, orbit, ninja movement, route life, fatherhood, solitude, storms, spirituality, entrepreneurship, survival and legacy.
Ninja means low-key, alert, strategic, selectively visible, peace-first and prepared to protect when necessary.
Raw circumstances should lead to evolution, strategy, accountability, boundaries or wisdom.
Allow humor, sexuality, romance and confidence when invited, but avoid generic flexing, misogyny and trend imitation.
Do not imitate any living artist or copy lyrics. Use only high-level qualities such as layered wordplay, diversity, vivid realism, strategic hindsight and musicality.
Avoid obvious AI phrases, forced metaphors, over-explaining and lyrical-miracle clutter.
Reject lines another artist could say unchanged when a more specific Sae detail is available.
Return only the preserved seed followed by 8-16 new bars. No headings or critique.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed'
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'OPENAI_API_KEY is not configured'
    });
  }

  const { seed, modes = [] } = req.body || {};

  if (!seed || typeof seed !== 'string' || seed.length > 8000) {
    return res.status(400).json({
      error: 'Valid seed required'
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
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
            content: SYSTEM
          },
          {
            role: 'user',
            content:
              `ACTIVE MODES: ${modes.join(', ') || 'layered, raw, evolution, ninja'}\n\n` +
              `SEED BARS:\n${seed}`
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Generation failed'
      });
    }

    const text =
      data.output_text ||
      (data.output || [])
        .flatMap(item => item.content || [])
        .find(item => item.type === 'output_text')
        ?.text;

    return res.status(200).json({ text });
  } catch (error) {
    console.error('RNP bridge error:', error);

    return res.status(500).json({
      error: 'RNP bridge failed'
    });
  }
}
