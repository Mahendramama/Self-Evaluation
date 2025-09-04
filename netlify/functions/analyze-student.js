// Netlify Function: analyzes student profile using OpenAI (Chat Completions)
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${apiKey}`
},
body: JSON.stringify(body)
});


if (!resp.ok) {
const errText = await resp.text();
return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: `OpenAI error: ${errText}` }) };
}


const data = await resp.json();
const advice = data?.choices?.[0]?.message?.content || 'No response.';


return {
statusCode: 200,
headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
body: JSON.stringify({ ok: true, advice })
};


} catch (err) {
return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err?.message || 'Server error' }) };
}
}


function corsHeaders(){
return {
'Access-Control-Allow-Origin': '*',
'Access-Control-Allow-Methods': 'POST, OPTIONS',
'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
}


function renderProfileSummary(p, ex){
const lines = [];
lines.push(`Exam: ${p.exam}`);
lines.push(`Age: ${safe(p.age)} | Attempts: ${safe(p.attempts)} | Daily hours: ${safe(p.hours)}`);
lines.push(`Education: ${safe(p.edu)} | Work status: ${safe(p.work)}`);
if (p.strengths) lines.push(`Strengths: ${p.strengths}`);
if (p.weaknesses) lines.push(`Weaknesses: ${p.weaknesses}`);
if (p.notes) lines.push(`Notes: ${p.notes}`);
if (ex?.text) lines.push(`\nAdditional context from uploaded file:\n${ex.text.substring(0, 12000)}`); // limit to ~12k chars
lines.push(`\nNow, based on the above candidate profile, produce the full guidance.`);
return lines.join('\n');
}


function safe(v){ return (v === undefined || v === null || v === '') ? 'n/a' : String(v); }
