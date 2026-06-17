const { normalizeAnalysisResult } = require('../lib/safety/tradingRules');
const { guardRequest } = require('../lib/security/requestGuards');

const ALLOWED_ASSETS = ['XAUUSD', 'EUR/USD', 'EUR/JPY', 'USD/JPY', 'GBP/USD', 'GBP/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'US Oil', 'XAGUSD', 'BTC/USD'];
const ALLOWED_STRATEGY_MODES = ['Scalping', 'Intraday', 'Swing'];
const ALLOWED_RISK_PROFILES = ['Conservative', 'Balanced', 'Aggressive'];
const ALLOWED_ANALYSIS_DEPTHS = ['Fast', 'Standard', 'Deep'];
const ALLOWED_PROVIDERS = ['openai'];
const ALLOWED_REVIEWERS = ['none', 'openai'];
const MAX_BODY_BYTES = 24 * 1024;

function jsonError(res, status, message) {
  return res.status(status).json({ success: false, ok: false, message });
}

function validateAnalyzeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    throw new Error('Invalid request body');
  }

  const allowedKeys = new Set(['provider', 'reviewer', 'asset', 'strategyMode', 'riskProfile', 'analysisDepth', 'manualPrompt']);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) throw new Error('Invalid request body');

  const payload = {
    provider: typeof body.provider === 'string' ? body.provider.trim().toLowerCase() : '',
    reviewer: typeof body.reviewer === 'string' ? body.reviewer.trim().toLowerCase() : 'none',
    asset: typeof body.asset === 'string' ? body.asset.trim() : '',
    strategyMode: typeof body.strategyMode === 'string' ? body.strategyMode.trim() : '',
    riskProfile: typeof body.riskProfile === 'string' ? body.riskProfile.trim() : '',
    analysisDepth: typeof body.analysisDepth === 'string' ? body.analysisDepth.trim() : '',
    manualPrompt: typeof body.manualPrompt === 'string' ? body.manualPrompt.trim() : ''
  };

  if (!payload.provider) throw new Error('Missing provider');
  if (!payload.asset) throw new Error('Missing asset');
  if (!ALLOWED_PROVIDERS.includes(payload.provider)) throw new Error('Invalid request body');
  if (!ALLOWED_REVIEWERS.includes(payload.reviewer)) throw new Error('Invalid request body');
  if (!ALLOWED_ASSETS.includes(payload.asset)) throw new Error('Invalid request body');
  if (!ALLOWED_STRATEGY_MODES.includes(payload.strategyMode)) throw new Error('Invalid request body');
  if (!ALLOWED_RISK_PROFILES.includes(payload.riskProfile)) throw new Error('Invalid request body');
  if (!ALLOWED_ANALYSIS_DEPTHS.includes(payload.analysisDepth)) throw new Error('Invalid request body');
  if (payload.manualPrompt && (payload.manualPrompt.length > 5000 || /[<>`$\\]/.test(payload.manualPrompt))) throw new Error('Invalid request body');

  return payload;
}

function buildAutomaticPrompt(payload) {
  if (payload.manualPrompt) return payload.manualPrompt;

  return [
    'You are a professional trading analysis assistant for education and decision support only.',
    'Do not execute trades. Do not add auto-trading instructions. Do not guarantee profit. Do not say 100% sure.',
    'Do not force a BUY or SELL setup. Always allow: No Trade Setup — wait for better price action confirmation.',
    'No BUY or SELL setup unless the score is 8/10 or higher.',
    'Always include confirmation, invalidation, risk management, and news risk.',
    'No chart upload, live price, screenshot, current market data, or verified latest calendar/news data was provided for this request.',
    'Clearly state that current market data is missing and latest news/calendar data could not be verified.',
    'Build the analysis only from these selected dashboard values:',
    `Provider: ${payload.provider}`,
    `Reviewer: ${payload.reviewer}`,
    `Asset: ${payload.asset}`,
    `Strategy mode: ${payload.strategyMode}`,
    `Risk profile: ${payload.riskProfile}`,
    `Analysis depth: ${payload.analysisDepth}`,
    '',
    'Return only valid JSON with keys: decision, bias, confidence, score, entryZone, stopLoss, takeProfits, riskReward, timeframeSummary, marketStructure, economicRisk, reasons, invalidations, riskWarning, scorecard.'
  ].join('\n');
}

function extractOutputText(data) {
  return data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('') || '{}';
}

async function requestOpenAI(payload) {
  if (!process.env.OPENAI_API_KEY) throw new Error('Missing API key');

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model, input: buildAutomaticPrompt(payload), temperature: 0.2, text: { format: { type: 'json_object' } } })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Provider request failed');

  try {
    const parsed = JSON.parse(extractOutputText(data));
    return normalizeAnalysisResult({ ...parsed, model }, { model });
  } catch (error) {
    throw new Error('Provider request failed');
  }
}

module.exports = async function handler(req, res) {
  if (guardRequest(req, res)) return;
  if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
    return jsonError(res, 400, 'Invalid request body');
  }

  try {
    const payload = validateAnalyzeBody(req.body);
    const analysis = await requestOpenAI(payload);
    return res.status(200).json({ success: true, ok: true, provider: 'openai', analysis, timestamp: new Date().toISOString() });
  } catch (error) {
    const message = ['Missing provider', 'Missing asset', 'Missing API key', 'Provider request failed', 'Invalid request body'].includes(error.message)
      ? error.message
      : 'Provider request failed';
    const status = message === 'Missing API key' ? 503 : (message === 'Provider request failed' ? 502 : 400);
    return jsonError(res, status, message);
  }
};
