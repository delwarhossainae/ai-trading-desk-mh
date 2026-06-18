const { normalizeAnalysisResult } = require('../safety/tradingRules');

const PROVIDER_LABELS = {
  openai: 'ChatGPT / OpenAI',
  anthropic: 'Claude / Anthropic',
  xai: 'Grok / xAI',
  gemini: 'Google Gemini',
  microsoft: 'Microsoft Copilot / Microsoft AI'
};

const PROVIDER_CONFIG = {
  openai: { key: 'OPENAI_API_KEY', model: 'OPENAI_MODEL', fallbackModel: 'gpt-4.1-mini' },
  anthropic: { key: 'ANTHROPIC_API_KEY', model: 'ANTHROPIC_MODEL', fallbackModel: 'claude-sonnet-4-5' },
  xai: { key: 'XAI_API_KEY', model: 'XAI_MODEL', fallbackModel: 'grok-4' },
  gemini: { key: 'GEMINI_API_KEY', model: 'GEMINI_MODEL', fallbackModel: 'gemini-2.5-pro' },
  microsoft: { key: 'MICROSOFT_AI_API_KEY', model: 'MICROSOFT_AI_MODEL', fallbackModel: 'your_microsoft_model_here' }
};

const REVIEW_KEYS = ['bias', 'contradiction', 'risk', 'whether No Trade Setup is better', 'news/fundamental risk', 'risk-reward quality'];

class ProviderRequestError extends Error {
  constructor(provider, status, message, code = 'PROVIDER_REQUEST_FAILED') {
    super(`${PROVIDER_LABELS[provider] || provider} request failed${status ? ` (${status})` : ''}: ${message || 'Unknown provider error'}`);
    this.name = 'ProviderRequestError';
    this.provider = provider;
    this.status = status;
    this.code = code;
  }
}

function providerStatuses() {
  return Object.fromEntries(Object.entries(PROVIDER_CONFIG).map(([id, config]) => {
    const configured = id === 'microsoft'
      ? Boolean((process.env.MICROSOFT_AI_API_KEY || process.env.AZURE_OPENAI_API_KEY) && process.env.MICROSOFT_AI_ENDPOINT)
      : Boolean(process.env[config.key]);
    return [id, { label: PROVIDER_LABELS[id], configured, message: configured ? 'Configured' : (id === 'microsoft' ? 'Not configured' : 'Missing key') }];
  }));
}

function assertConfigured(provider) {
  const statuses = providerStatuses();
  if (!statuses[provider]?.configured) {
    const error = new Error(provider === 'microsoft' ? 'Microsoft AI provider is not configured.' : 'Selected AI provider is not configured. Add the required API key in backend environment variables.');
    error.code = 'PROVIDER_NOT_CONFIGURED';
    throw error;
  }
}

function buildAnalysisPrompt(payload) {
  if (payload.reviewRequest) return buildReviewPrompt(payload.reviewRequest);
  return [
    'This is educational and decision-support analysis only.',
    'Do not guarantee profit. Do not execute trades. Do not force buy/sell.',
    'Always allow No Trade Setup. If evidence is incomplete or unclear, use No Trade Setup — wait for better price action confirmation.',
    'No BUY or SELL setup unless score is 8/10 or higher.',
    'Always include confirmation, invalidation, risk management, and news risk.',
    'If live price, screenshots, or current market data are missing, clearly say that data is missing.',
    'If latest news/calendar data cannot be verified, clearly say that latest news/calendar data could not be verified.',
    'Return structured JSON only. Do not wrap the JSON in markdown.',
    '',
    `Asset: ${payload.assetLabel || payload.asset}`,
    `TradingView symbol: ${payload.tradingViewSymbol || 'Not provided'}`,
    `Timeframe: ${payload.timeframe || 'M15'}`,
    `Strategy mode: ${payload.strategyMode}`,
    `Risk profile: ${payload.riskProfile}`,
    `Analysis depth: ${payload.analysisDepth}`,
    `Server marketContext (compact, verified by backend): ${JSON.stringify(payload.marketContext || {})}`,
    `Risk filters: ${JSON.stringify(payload.marketContext?.riskFilters || {})}`,
    `Signal summary: ${JSON.stringify(payload.marketContext?.signalSummary || {})}`,
    `Economic risk/events: ${JSON.stringify(payload.marketContext?.economicRisk || payload.economicRisk || {})}`,
    '',
    'If marketContext.riskFilters.finalPermission is No Trade or Watch only, do not return Buy Setup or Sell Setup; cap score and confidence accordingly.',
    'Return only valid JSON with keys: decision, bias, confidence, score, entryZone, stopLoss, takeProfits, riskReward, timeframeSummary, marketStructure, economicRisk, reasons, invalidations, riskWarning, dataQualityWarning, providerUsed, modelUsed, scorecard.',
    'Allowed decision values: No Trade, Watch, Invalid Setup, Buy Setup, Sell Setup.',
    'Allowed bias values: Bullish, Bearish, Neutral.',
    'score must be 0 to 10. scorecard must include higherTimeframeAlignment, marketStructure, entryConfirmation, newsFundamentalRisk, riskRewardQuality, each 0 to 2.'
  ].join('\n');
}

function buildReviewPrompt(analysis) {
  return [
    'This is educational and decision-support analysis only.',
    'Do not guarantee profit. Do not execute trades. Do not force buy/sell. Always allow No Trade Setup.',
    `Review the primary analysis for: ${REVIEW_KEYS.join(', ')}.`,
    'Return structured JSON only with keys: providerUsed, modelUsed, notes, saferDecision, riskWarnings, contradictions.',
    JSON.stringify(analysis)
  ].join('\n');
}

function extractJson(text) {
  try { return JSON.parse(text); } catch (error) {
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw error;
  }
}

function normalizeProviderResult(parsed, provider, model) {
  return { ok: true, ...normalizeAnalysisResult(parsed, { model }), providerUsed: PROVIDER_LABELS[provider], modelUsed: model };
}

function providerErrorMessage(data) {
  const message = data?.error?.message || data?.message || data?.detail || data?.error_description;
  if (message) return String(message).replace(/sk-[A-Za-z0-9_-]+/g, '[redacted-key]').slice(0, 500);
  return JSON.stringify(data || {}).replace(/sk-[A-Za-z0-9_-]+/g, '[redacted-key]').slice(0, 500) || 'Unknown provider error';
}

async function readProviderResponse(provider, response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ProviderRequestError(provider, response.status, providerErrorMessage(data));
  }
  return data;
}

function looksLikeModelProblem(error) {
  return error instanceof ProviderRequestError && [400, 404].includes(Number(error.status)) && /model|not found|does not exist|unsupported|invalid/i.test(error.message);
}

async function callOpenAIResponses(model, payload) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      input: buildAnalysisPrompt(payload),
      text: { format: { type: 'json_object' } }
    })
  });
  const data = await readProviderResponse('openai', response);
  return data.output_text || data.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('') || '{}';
}

async function callOpenAIChatCompletions(model, payload) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return only valid JSON. Do not wrap JSON in markdown.' },
        { role: 'user', content: buildAnalysisPrompt(payload) }
      ]
    })
  });
  const data = await readProviderResponse('openai', response);
  return data.choices?.[0]?.message?.content || '{}';
}

async function analyzeOpenAIModel(model, payload) {
  try {
    return await callOpenAIResponses(model, payload);
  } catch (error) {
    if (!(error instanceof ProviderRequestError) || ![400, 404].includes(Number(error.status))) throw error;
    return callOpenAIChatCompletions(model, payload);
  }
}

async function analyzeWithOpenAI(payload) {
  assertConfigured('openai');
  const requestedModel = process.env.OPENAI_MODEL || PROVIDER_CONFIG.openai.fallbackModel;
  const fallbackModel = PROVIDER_CONFIG.openai.fallbackModel;

  try {
    const text = await analyzeOpenAIModel(requestedModel, payload);
    return normalizeProviderResult(extractJson(text), 'openai', requestedModel);
  } catch (error) {
    if (requestedModel !== fallbackModel && looksLikeModelProblem(error)) {
      const text = await analyzeOpenAIModel(fallbackModel, payload);
      return normalizeProviderResult(extractJson(text), 'openai', fallbackModel);
    }
    if (error instanceof SyntaxError) {
      throw new ProviderRequestError('openai', 502, 'OpenAI returned text that was not valid JSON. Try again or use a different model.');
    }
    throw error;
  }
}

async function analyzeWithAnthropic(payload) {
  assertConfigured('anthropic');
  const model = process.env.ANTHROPIC_MODEL || PROVIDER_CONFIG.anthropic.fallbackModel;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 1200, temperature: 0.2, messages: [{ role: 'user', content: buildAnalysisPrompt(payload) }] })
  });
  const data = await readProviderResponse('anthropic', response);
  try {
    return normalizeProviderResult(extractJson(data.content?.map((item) => item.text || '').join('') || '{}'), 'anthropic', model);
  } catch (error) {
    throw new ProviderRequestError('anthropic', 502, 'Anthropic returned text that was not valid JSON. Try again or use a different model.');
  }
}

async function analyzeWithXAI(payload) {
  assertConfigured('xai');
  const model = process.env.XAI_MODEL || PROVIDER_CONFIG.xai.fallbackModel;
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.XAI_API_KEY}` },
    body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: buildAnalysisPrompt(payload) }] })
  });
  const data = await readProviderResponse('xai', response);
  try {
    return normalizeProviderResult(extractJson(data.choices?.[0]?.message?.content || '{}'), 'xai', model);
  } catch (error) {
    throw new ProviderRequestError('xai', 502, 'Grok returned text that was not valid JSON. Try again or use a different model.');
  }
}

async function analyzeWithGemini(payload) {
  assertConfigured('gemini');
  const model = process.env.GEMINI_MODEL || PROVIDER_CONFIG.gemini.fallbackModel;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }, contents: [{ role: 'user', parts: [{ text: buildAnalysisPrompt(payload) }] }] })
  });
  const data = await readProviderResponse('gemini', response);
  try {
    return normalizeProviderResult(extractJson(data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '{}'), 'gemini', model);
  } catch (error) {
    throw new ProviderRequestError('gemini', 502, 'Gemini returned text that was not valid JSON. Try again or use a different model.');
  }
}

async function analyzeWithMicrosoft(payload) {
  if (!(process.env.MICROSOFT_AI_API_KEY || process.env.AZURE_OPENAI_API_KEY) || !process.env.MICROSOFT_AI_ENDPOINT) {
    const error = new Error('Microsoft AI provider is not configured.');
    error.code = 'PROVIDER_NOT_CONFIGURED';
    throw error;
  }
  const model = process.env.MICROSOFT_AI_MODEL || PROVIDER_CONFIG.microsoft.fallbackModel;
  const endpoint = process.env.MICROSOFT_AI_ENDPOINT.replace(/\/$/, '');
  const apiKey = process.env.MICROSOFT_AI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: buildAnalysisPrompt(payload) }] })
  });
  const data = await readProviderResponse('microsoft', response);
  try {
    return normalizeProviderResult(extractJson(data.choices?.[0]?.message?.content || '{}'), 'microsoft', model);
  } catch (error) {
    throw new ProviderRequestError('microsoft', 502, 'Microsoft/Azure AI returned text that was not valid JSON. Try again or use a different deployment.');
  }
}

const providers = { openai: analyzeWithOpenAI, anthropic: analyzeWithAnthropic, xai: analyzeWithXAI, gemini: analyzeWithGemini, microsoft: analyzeWithMicrosoft };

async function reviewWithProvider(provider, analysis) {
  if (!provider || provider === 'none') return null;
  if (!providers[provider]) throw new Error('Invalid request.');
  assertConfigured(provider);
  const result = await providers[provider]({ asset: analysis.asset || 'XAUUSD', assetLabel: analysis.assetLabel || analysis.asset || 'XAUUSD', tradingViewSymbol: analysis.tradingViewSymbol || '', timeframe: analysis.timeframe || 'Daily', strategyMode: analysis.strategyMode || 'Intraday', riskProfile: analysis.riskProfile || 'Balanced', analysisDepth: analysis.analysisDepth || 'Standard', reviewRequest: analysis, marketData: { primaryAnalysis: analysis }, economicRisk: analysis.economicRisk || '' });
  return { providerUsed: result.providerUsed, modelUsed: result.modelUsed, notes: result.reasons?.length ? result.reasons : [result.marketStructure, result.riskWarning].filter(Boolean), saferDecision: result.decision, riskWarnings: [result.economicRisk, result.riskReward].filter(Boolean), contradictions: result.invalidations || [] };
}

module.exports = { providers, providerStatuses, reviewWithProvider, buildAnalysisPrompt, ProviderRequestError };