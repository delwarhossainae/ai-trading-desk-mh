function buildReviewPrompt(analysis) {
  return [
    'Review this AI trading analysis for risk control only.',
    'Check bias contradiction, missing evidence, overconfidence, news risk, and whether No Trade is safer.',
    'Do not provide guaranteed signals. Do not execute trades. Return concise JSON: {"notes":[...],"saferDecision":"..."}.',
    JSON.stringify(analysis)
  ].join('\n');
}

async function reviewWithAnthropic(analysis) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, configured: false, message: 'AI analysis service is not configured.', notes: [] };
  }

  const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-latest';
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 700, temperature: 0.1, messages: [{ role: 'user', content: buildReviewPrompt(analysis) }] })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return { ok: false, configured: true, message: 'Analysis temporarily unavailable.', notes: [] };
  const text = data.content?.map((item) => item.text || '').join('') || '{}';
  try {
    return { ok: true, configured: true, model, ...JSON.parse(text) };
  } catch (error) {
    return { ok: true, configured: true, model, notes: [text] };
  }
}

module.exports = { reviewWithAnthropic };
