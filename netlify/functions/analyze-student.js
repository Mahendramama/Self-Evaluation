// Netlify Function (Node 18+). Requires env var: OPENAI_API_KEY

export async function handler(event) {
  // CORS (allow in Wix iframe)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return resp(405, { error: 'Method not allowed' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return resp(500, { error: 'OPENAI_API_KEY not set' });

    const { profile, extracted } = JSON.parse(event.body || '{}');
    if (!profile) return resp(400, { error: 'Missing profile' });

    const summary = renderProfileSummary(profile, extracted);

    // Build OpenAI chat payload (supports optional image for vision)
    const userContent = [{ type: 'text', text: summary }];
    if (extracted?.imageDataUrl) {
      userContent.push({ type: 'image_url', image_url: { url: extracted.imageDataUrl } });
    }

    const body = {
      model: 'gpt-4o-mini',
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
`You are an experienced UPSC/OPSC mentor.
- Output MUST have headings:
  1) Snapshot & Risks
  2) What to Focus On (subject-wise)
  3) 90-Day Roadmap
  4) Weekly Template
  5) Daily Schedule (working vs non-working)
  6) Do's (7)
  7) Don'ts (7)
  8) Answer-Writing Plan
  9) Test-Series & PYQ Strategy
  10) Revision & Note-Making
  11) Tools/Resources (free-first)
- Tailor to age, attempts, daily hours, strengths/weaknesses.
- Contrast OPSC vs UPSC where relevant.
- Keep 700–1100 words, concise and practical.`
        },
        { role: 'user', content: userContent }
      ]
    };

    const ai = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body)
    });

    if (!ai.ok) {
      const errText = await ai.text();
      return resp(502, { error: `OpenAI error: ${errText}` });
    }

    const data = await ai.json();
    const advice = data?.choices?.[0]?.message?.content || 'No response.';

    return resp(200, { ok: true, advice });
  } catch (err) {
    return resp(500, { error: err?.message || 'Server error' });
  }
}

function resp(code, obj) {
  return {
    statusCode: code,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(obj)
  };
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}
function renderProfileSummary(p, ex) {
  const safe = v => (v === undefined || v === null || v === '') ? 'n/a' : String(v);
  const parts = [
    `Exam: ${safe(p.exam)}`,
    `Age: ${safe(p.age)}  | Attempts: ${safe(p.attempts)}  | Daily hours: ${safe(p.hours)}`,
    `Education: ${safe(p.edu)}  | Work status: ${safe(p.work)}`,
  ];
  if (p.strengths) parts.push(`Strengths: ${p.strengths}`);
  if (p.weaknesses) parts.push(`Weaknesses: ${p.weaknesses}`);
  if (p.notes) parts.push(`Notes: ${p.notes}`);
  if (ex?.text) parts.push(`\nAdditional context from uploaded file:\n${ex.text.substring(0, 12000)}`);
  parts.push(`\nNow produce the full, structured guidance.`);
  return parts.join('\n');
}
