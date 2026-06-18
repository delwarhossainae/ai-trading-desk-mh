const { providers, providerStatuses, reviewWithProvider, ProviderRequestError } = require('../lib/ai/providerRouter');
const { buildMarketContext } = require('../lib/market/marketContextBuilder');
const { guardRequest, MAX_BODY_BYTES, rateLimit } = require('../lib/security/requestGuards');
const { ALLOWED_ASSET_INPUTS, getAssetConfig } = require('../lib/config/assets');

const ALLOWED_ASSETS = ALLOWED_ASSET_INPUTS;
const ALLOWED_STRATEGY_MODES = ['Scalping', 'Intraday', 'Swing'];
const ALLOWED_RISK_PROFILES = ['Conservative', 'Balanced', 'Aggressive'];
const ALLOWED_ANALYSIS_DEPTHS = ['Fast', 'Standard', 'Deep'];
const ALLOWED_TIMEFRAMES = ['Monthly', 'Weekly', 'Daily', 'H4', 'H1', 'M30', 'M15', 'M5'];
const ALLOWED_PROVIDERS = Object.keys(providers);
const ALLOWED_REVIEWERS = ['none', ...ALLOWED_PROVIDERS];

function jsonError(res, status, message, extra = {}) {
  return res.status(status).json({ success: false, ok: false, message, ...extra });
}

function requestError(message, errorCode) {
  const error = new Error(message);
  error.errorCode = errorCode;
  return error;
}

function safeString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

function validateAnalyzeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Buffer.byteLength(JSON.stringify(body), 'utf8') > MAX_BODY_BYTES) {
    throw requestError('Invalid request body', 'INVALID_PAYLOAD');
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
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) throw requestError('Invalid request body', 'INVALID_PAYLOAD');

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
    marketData: null,
    economicEvents: null,
    economicRisk: body.economicRisk || null,
    manualPrompt: safeString(body.manualPrompt)
  };

  if (!payload.provider) throw requestError('Missing provider', 'INVALID_PROVIDER');
  if (!payload.asset) throw requestError('Missing asset', 'INVALID_ASSET');
  if (!ALLOWED_PROVIDERS.includes(payload.provider)) throw requestError('Invalid request body', 'INVALID_PROVIDER');
  if (!ALLOWED_REVIEWERS.includes(payload.reviewer)) throw requestError('Invalid request body', 'INVALID_PROVIDER');
  if (!getAssetConfig(payload.asset)) throw requestError('Invalid request body', 'INVALID_ASSET');
  if (!ALLOWED_TIMEFRAMES.includes(payload.timeframe)) throw requestError('Invalid request body', 'INVALID_PAYLOAD');
  if (!ALLOWED_STRATEGY_MODES.includes(payload.strategyMode)) throw requestError('Invalid request body', 'INVALID_PAYLOAD');
  if (!ALLOWED_RISK_PROFILES.includes(payload.riskProfile)) throw requestError('Invalid request body', 'INVALID_PAYLOAD');
  if (!ALLOWED_ANALYSIS_DEPTHS.includes(payload.analysisDepth)) throw requestError('Invalid request body', 'INVALID_PAYLOAD');
  if ([payload.assetLabel, payload.tradingViewSymbol, payload.assetClass, payload.manualPrompt].some((value) => /[<>`$\\]/.test(value))) throw requestError('Invalid request body', 'INVALID_PAYLOAD');
  if (payload.manualPrompt.length > 5000) throw requestError('Invalid request body', 'INVALID_PAYLOAD');

  return payload;
}

function forceNoTradeForMissingMarketData(analysis, marketData) {
  if (marketData?.ok === true && marketData?.lastPrice !== null && marketData?.lastPrice !== undefined) return analysis;
  const marketMessage = 'Market data unavailable. Configure market data provider before relying on automatic analysis.';
  const score = Math.min(Number(analysis?.score) || 0, 5);
  return {
    ...analysis,
    decision: 'No Trade',
    bias: analysis?.bias || 'Neutral',
    confidence: Math.min(Number(analysis?.confidence) || 0, 50),
    score,
    entryZone: marketMessage,
    stopLoss: 'No valid setup without verified current market data.',
    takeProfits: [],
    riskReward: 'No valid setup without verified current market data.',
    marketStructure: [analysis?.marketStructure, marketMessage].filter(Boolean).join(' '),
    economicRisk: analysis?.economicRisk || 'Latest news/calendar data could not be verified.',
    reasons: [...(Array.isArray(analysis?.reasons) ? analysis.reasons : []), marketMessage],
    invalidations: [...(Array.isArray(analysis?.invalidations) ? analysis.invalidations : []), 'Current market data is unavailable.'],
    riskWarning: analysis?.riskWarning || 'This dashboard provides AI-assisted analysis for education and decision support only. It does not guarantee profit and does not execute trades.'
  };
}

function normalizeError(error) {
  if (['Missing provider', 'Missing asset', 'Invalid request body'].includes(error.message)) {
    return { message: error.message, status: 400, errorCode: error.errorCode || 'INVALID_PAYLOAD' };
  }

  if (error.message === 'Missing API key' || error.code === 'PROVIDER_NOT_CONFIGURED') {
    return {
      message: error.message === 'Microsoft AI provider is not configured.' ? 'Microsoft AI provider is not configured. Add Azure OpenAI endpoint and API key in Vercel Environment Variables.' : (error.message || 'Selected AI provider is not configured. Add the required API key in backend environment variables.'),
      status: 503,
      errorCode: 'INVALID_PROVIDER'
    };
  }

  if (error instanceof ProviderRequestError || error.name === 'ProviderRequestError') {
    const errorCode = /valid JSON|JSON/i.test(error.message || '') ? 'AI_INVALID_JSON' : (error.code === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'AI_PROVIDER_FAILED');
    return { message: 'AI provider request failed. Check Vercel logs.', status: 503, errorCode };
  }

  return { message: 'Backend analysis error. Check Vercel logs.', status: 500, errorCode: error.errorCode || 'UNKNOWN_ANALYZE_ERROR' };
}

async function loadAnalysisContext(payload) {
  const marketContext = await buildMarketContext(payload);
  return {
    ...payload,
    asset: marketContext.canonicalAsset,
    assetLabel: marketContext.asset,
    assetClass: marketContext.assetClass,
    marketContext,
    marketData: { ok: marketContext.ok, configured: marketContext.configured, provider: marketContext.provider, lastPrice: marketContext.currentPrice, message: marketContext.dataCompleteness.warnings.join(' ') || `Server market context loaded for ${marketContext.canonicalAsset}.` },
    economicEvents: { ok: marketContext.economicRisk.verified, configured: marketContext.economicRisk.configured, events: marketContext.economicRisk.events, riskSummary: marketContext.economicRisk.summary },
    economicRisk: marketContext.economicRisk
  };
}

function enforceScoreSafety(analysis) {
  const score = Number(analysis?.score) || 0;
  if (score >= 8) return analysis;
  const decision = ['Buy Setup', 'Sell Setup'].includes(analysis?.decision) ? 'No Trade' : analysis?.decision;
  return { ...analysis, decision: decision || 'No Trade', score, dataQualityWarning: analysis?.dataQualityWarning || 'Score below 8/10 cannot be shown as a Buy Setup or Sell Setup.' };
}

function enforceMarketContextSafety(analysis, marketContext) {
  const permission = marketContext?.riskFilters?.finalPermission || 'No Trade';
  if (permission === 'Trade eligible') return analysis;
  const cap = permission === 'Watch only' ? 7 : 5;
  return {
    ...analysis,
    decision: permission === 'Watch only' ? 'Watch' : 'No Trade',
    confidence: Math.min(Number(analysis?.confidence) || 0, permission === 'Watch only' ? 65 : 50),
    score: Math.min(Number(analysis?.score) || 0, cap),
    entryZone: 'Not actionable — server-verified market context is incomplete.',
    stopLoss: 'Not applicable without complete verified market data.',
    takeProfits: [],
    riskReward: 'Not actionable while backend risk filters are No Trade or Watch only.',
    dataQualityWarning: (marketContext?.riskFilters?.warnings || []).join(' ') || 'Market context is incomplete.'
  };
}

module.exports = async function handler(req, res) {
  if (await guardRequest(req, res, { rateLimitKey: 'analyze' })) return;

  try {
    const basePayload = validateAnalyzeBody(req.body);
    if (basePayload.analysisDepth === 'Deep' && await rateLimit(req, res, 'analyzeDeep')) return;
    if (basePayload.reviewer && basePayload.reviewer !== 'none' && await rateLimit(req, res, 'analyzeReview')) return;
    let payload;
    try {
      payload = await loadAnalysisContext(basePayload);
    } catch (contextError) {
      throw requestError('AI provider or market-data service is temporarily unavailable.', 'MARKET_CONTEXT_FAILED');
    }
    const analyze = providers[payload.provider];
    if (!analyze) throw requestError('Invalid request body', 'INVALID_PROVIDER');

    let analysis = enforceScoreSafety(enforceMarketContextSafety(forceNoTradeForMissingMarketData(await analyze(payload), payload.marketData), payload.marketContext));
    let review = null;

    if (payload.reviewer && payload.reviewer !== 'none') {
      try {
        review = await reviewWithProvider(payload.reviewer, { ...analysis, ...payload });
      } catch (reviewError) {
        review = { ok: false, configured: false, message: payload.reviewer === 'microsoft' ? 'Microsoft AI provider is not configured. Add Azure OpenAI endpoint and API key in Vercel Environment Variables.' : 'Primary analysis completed. Review provider is not configured.' };
      }
    }

    return res.status(200).json({
      success: true,
      ok: true,
      provider: payload.provider,
      reviewer: payload.reviewer,
      analysis: { ...analysis, review },
      review,
      marketData: payload.marketData,
      marketContext: payload.marketContext,
      economicEvents: payload.economicEvents,
      providerStatuses: providerStatuses(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const normalized = normalizeError(error);
    return jsonError(res, normalized.status, normalized.message, { errorCode: normalized.errorCode || 'UNKNOWN_ANALYZE_ERROR', providerStatuses: providerStatuses() });
  }
};
