const { normalizeAnalysisResult } = require('../safety/tradingRules');

function buildAnalysisPrompt(payload) {
  return [
    'You are an AI trading analysis assistant for education and decision support only.',
    'Do not execute trades. Do not imply guaranteed profit. Do not say 100% sure.',
    'Always allow No Trade. If evidence is incomplete or unclear, choose No Trade or Watch.',
    'BUY/SELL setup labels are allowed only when score is 8/10 or higher.',
    'Always include confirmation, invalidation, risk management, and news risk.',
    'If current market data is missing, clearly say current market data is missing.',
    'If latest news/calendar data cannot be verified, clearly say latest news/calendar data could not be verified.',
    '',
    `Asset: ${payload.assetLabel || payload.asset}`,
    `TradingView symbol: ${payload.tradingViewSymbol}`,
    `Timeframe: ${payload.timeframe}`,
    `Strategy mode: ${payload.strategyMode}`,
    `Risk profile: ${payload.riskProfile}`,
    `Analysis depth: ${payload.analysisDepth}`,
    `Market data: ${JSON.stringify(payload.marketData || {})}`,
    `Economic events: ${JSON.stringify(payload.economicEvents || {})}`,
    '',
    'Return only valid JSON with keys: decision, bias, confidence, score, entryZone, stopLoss, takeProfits, riskReward, timeframeSummary, marketStructure, economicRisk, reasons, invalidations, riskWarning, scorecard.'
  ].join('\n');
}

function fallbackNoTrade(payload, message) {
  return normalizeAnalysisResult({
    decision: 'No Trade',
    bias: 'Neutral',
    confidence: 0,
    score: 0,
    entryZone: 'Not available — current market data is missing or provider is not connected.',
    stopLoss: 'Not applicable without a valid setup.',
    takeProfits: { tp1: '', tp2: '', tp3: '' },
    riskReward: 'Not available.',
    timeframeSummary: 'Automatic analysis cannot complete without configured backend AI and market-data inputs.',
    marketStructure: 'Market structure could not be verified from configured provider data.',
    economicRisk: payload.economicEvents?.riskSummary || 'Latest news/calendar data could not be verified.',
    reasons: [message, payload.marketData?.message, payload.economicEvents?.message].filter(Boolean),
    invalidations: ['Missing configured backend data or AI service response.', 'No BUY/SELL setup without verified market context.'],
    riskWarning: 'This dashboard provides AI-assisted analysis for education and decision support only. It does not guarantee profit and does not execute trades.',
    scorecard: { higherTimeframeAlignment: 0, marketStructure: 0, entryConfirmation: 0, newsFundamentalRisk: 0, riskRewardQuality: 0 },
    model: 'fallback-no-trade'
  });
}

async function analyzeWithOpenAI(payload) {
  if (!process.env.OPENAI_API_KEY) {
    return { ok: false, message: 'OpenAI API is not configured. Add OPENAI_API_KEY in backend environment variables.', ...fallbackNoTrade(payload, 'OpenAI API is not configured.') };
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      input: buildAnalysisPrompt(payload),
      temperature: 0.2,
      text: { format: { type: 'json_object' } }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { ok: false, message: data.error?.message || 'OpenAI analysis request failed.', ...fallbackNoTrade(payload, 'OpenAI analysis request failed.') };
  }

  const text = data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('') || '{}';
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return { ok: false, message: 'OpenAI returned invalid JSON.', ...fallbackNoTrade(payload, 'OpenAI returned invalid JSON.') };
  }

  return { ok: true, ...normalizeAnalysisResult({ ...parsed, model }, { model }) };
}

module.exports = { analyzeWithOpenAI, buildAnalysisPrompt };
