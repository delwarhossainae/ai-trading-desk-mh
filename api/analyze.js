const { providers, providerStatuses, reviewWithProvider, ProviderRequestError } = require('../lib/ai/providerRouter');
const { guardRequest, MAX_BODY_BYTES } = require('../lib/security/requestGuards');

const ALLOWED_ASSETS = ['XAUUSD', 'EUR/USD', 'EUR/JPY', 'USD/JPY', 'GBP/USD', 'GBP/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'US Oil', 'XAGUSD', 'BTC/USD'];
const ALLOWED_STRATEGY_MODES = ['Scalping', 'Intraday', 'Swing'];
const ALLOWED_RISK_PROFILES = ['Conservative', 'Balanced', 'Aggressive'];
const ALLOWED_ANALYSIS_DEPTHS = ['Fast', 'Standard', 'Deep'];
const ALLOWED_TIMEFRAMES = ['Monthly', 'Weekly', 'Daily', 'H4', 'H1', 'M30', 'M15', 'M5'];
const ALLOWED_PROVIDERS = Object.keys(providers);
const ALLOWED_REVIEWERS = ['none', ...ALLOWED_PROVIDERS];

function jsonError(res, status, message, extra = {}) {
  return res.status(status).json({ success: false, ok: false, message, ...extra });
}

function safeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function validateAnalyzeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    throw new Error('Invalid request body');
  }

  const allowedKeys = new Set([
    'provider',
    'reviewer',
    'asset',
    'assetLabel',
    'tradingViewSymbol',
    'assetClass',
    'timeframe',
    'strategyMode',
    'riskProfile',
    'analysisDepth',
    'marketData',
    'economicEvents',
    'economicRisk',
    'manualPrompt'
  ]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) throw new Error('Invalid request body');

  const payload = {
    provider: safeString(body.provider).toLowerCase(),
    reviewer: safeString(body.reviewer, 'none').toLowerCase(),
    asset: safeString(body.asset),
    assetLabel: safeString(body.assetLabel || body.asset),
    tradingViewSymbol: safeString(body.tradingViewSymbol),
    assetClass: safeString(body.assetClass),
    timeframe: safeString(body.timeframe, 'M15'),
    strategyMode: safeString(body.strategyMode),
    riskProfile: safeString(body.riskProfile),
    analysisDepth: safeString(body.analysisDepth),
    marketData: body.marketData && typeof body.marketData === 'object' && !Array.isArray(body.marketData) ? body.marketData : { configured: false, message: 'Current market data was not requested for this analysis run.' },
    economicEvents: body.economicEvents && typeof body.economicEvents === 'object' && !Array.isArray(body.economicEvents) ? body.economicEvents : { configured: false, message: 'Latest news/calendar data could not be verified for this analysis run.' },
    economicRisk: body.economicRisk || body.economicEvents || { configured: false, message: 'Latest news/calendar data could not be verified for this analysis run.' },
    manualPrompt: safeString(body.manualPrompt)
  };

  if (!payload.provider) throw new Error('Missing provider');
  if (!payload.asset) throw new Error('Missing asset');
  if (!ALLOWED_PROVIDERS.includes(payload.provider)) throw new Error('Invalid request body');
  if (!ALLOWED_REVIEWERS.includes(payload.reviewer)) throw new Error('Invalid request body');
  if (!ALLOWED_ASSETS.includes(payload.asset)) throw new Error('Invalid request body');
  if (!ALLOWED_TIMEFRAMES.includes(payload.timeframe)) throw new Error('Invalid request body');
  if (!ALLOWED_STRATEGY_MODES.includes(payload.strategyMode)) throw new Error('Invalid request body');
  if (!ALLOWED_RISK_PROFILES.includes(payload.riskProfile)) throw new Error('Invalid request body');
  if (!ALLOWED_ANALYSIS_DEPTHS.includes(payload.analysisDepth)) throw new Error('Invalid request body');
  if ([payload.assetLabel, payload.tradingViewSymbol, payload.assetClass, payload.manualPrompt].some((value) => /[<>`$\\]/.test(value))) throw new Error('Invalid request body');
  if (payload.manualPrompt.length > 5000) throw new Error('Invalid request body');

  return payload;
}

function normalizeError(error) {
  if (['Missing provider', 'Missing asset', 'Invalid request body'].includes(error.message)) {
    return { message: error.message, status: 400 };
  }

  if (error.message === 'Missing API key' || error.code === 'PROVIDER_NOT_CONFIGURED') {
    return {
      message: error.message || 'Selected AI provider is not configured. Add the required API key in backend environment variables.',
      status: 503
    };
  }

  if (error instanceof ProviderRequestError || error.name === 'ProviderRequestError') {
    return { message: error.message, status: error.status && Number(error.status) >= 400 ? 502 : 502 };
  }

  return { message: 'Provider request failed. Check the selected API key, billing, model name, and provider limits.', status: 502 };
}

module.exports = async function handler(req, res) {
  if (guardRequest(req, res)) return;
  if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
    return jsonError(res, 400, 'Invalid request body');
  }

  try {
    const payload = validateAnalyzeBody(req.body);
    const analyze = providers[payload.provider];
    if (!analyze) throw new Error('Invalid request body');

    const analysis = await analyze(payload);
    let review = null;

    if (payload.reviewer && payload.reviewer !== 'none') {
      review = await reviewWithProvider(payload.reviewer, { ...analysis, ...payload });
    }

    return res.status(200).json({
      success: true,
      ok: true,
      provider: payload.provider,
      reviewer: payload.reviewer,
      analysis: { ...analysis, review },
      review,
      providerStatuses: providerStatuses(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const normalized = normalizeError(error);
    return jsonError(res, normalized.status, normalized.message, { providerStatuses: providerStatuses() });
  }
};