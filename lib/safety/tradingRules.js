const DECISIONS = ['No Trade', 'Watch', 'Invalid Setup', 'Buy Setup', 'Sell Setup'];
const BIASES = ['Bullish', 'Bearish', 'Neutral'];
const SCORE_KEYS = ['higherTimeframeAlignment', 'marketStructure', 'entryConfirmation', 'newsFundamentalRisk', 'riskRewardQuality'];

function clampNumber(value, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : min;
}

function normalizeScorecard(scorecard = {}) {
  return Object.fromEntries(SCORE_KEYS.map((key) => [key, clampNumber(scorecard[key], 0, 2)]));
}

function totalScore(scorecard = {}) {
  return Object.values(normalizeScorecard(scorecard)).reduce((sum, value) => sum + value, 0);
}

function safeDecision(decision, score) {
  const normalized = DECISIONS.includes(decision) ? decision : 'No Trade';
  if ((normalized === 'Buy Setup' || normalized === 'Sell Setup') && score < 8) return 'Watch';
  return normalized;
}

function cleanPrimitive(value) {
  return String(value ?? '').replace(/[\u0000-\u001F]/g, ' ').replace(/guaranteed profit|100% sure/gi, 'not guaranteed').trim();
}

function stringifyObject(value) {
  const entries = Object.entries(value || {})
    .filter(([, item]) => item !== undefined && item !== null && item !== '')
    .map(([key, item]) => `${key.replace(/([A-Z])/g, ' $1').replace(/[_-]+/g, ' ').trim()}: ${cleanPrimitive(typeof item === 'object' ? JSON.stringify(item) : item)}`);
  return entries.join('; ');
}

function sanitizeText(value, fallback = '') {
  if (value === undefined || value === null || value === '') return cleanPrimitive(fallback);
  if (Array.isArray(value)) return value.map((item) => sanitizeText(item)).filter(Boolean).join('; ') || cleanPrimitive(fallback);
  if (typeof value === 'object') return stringifyObject(value) || cleanPrimitive(fallback);
  return cleanPrimitive(value) || cleanPrimitive(fallback);
}

function normalizeTextArray(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeText(item)).filter(Boolean);
  if (value && typeof value === 'object') return Object.entries(value).map(([key, item]) => sanitizeText(`${key}: ${sanitizeText(item)}`)).filter(Boolean);
  const text = sanitizeText(value);
  return text ? [text] : [];
}

function normalizeTakeProfits(value) {
  if (Array.isArray(value)) return [sanitizeText(value[0]), sanitizeText(value[1]), sanitizeText(value[2])].filter(Boolean);
  if (value && typeof value === 'object') {
    return [
      sanitizeText(value.tp1 ?? value.tp_1 ?? value.first ?? value.target1 ?? value.target_1 ?? value[0]),
      sanitizeText(value.tp2 ?? value.tp_2 ?? value.second ?? value.target2 ?? value.target_2 ?? value[1]),
      sanitizeText(value.tp3 ?? value.tp_3 ?? value.third ?? value.target3 ?? value.target_3 ?? value[2])
    ].filter(Boolean);
  }
  const text = sanitizeText(value);
  return text ? [text] : [];
}

function normalizeAnalysisResult(raw = {}, context = {}) {
  const scorecard = normalizeScorecard(raw.scorecard);
  const score = clampNumber(raw.score ?? totalScore(scorecard), 0, 10);
  return {
    decision: safeDecision(raw.decision, score),
    bias: BIASES.includes(raw.bias) ? raw.bias : 'Neutral',
    confidence: clampNumber(raw.confidence, 0, 100),
    score,
    entryZone: sanitizeText(raw.entryZone, 'Not provided — current market data may be missing.'),
    stopLoss: sanitizeText(raw.stopLoss, 'Not provided.'),
    takeProfits: normalizeTakeProfits(raw.takeProfits),
    riskReward: sanitizeText(raw.riskReward, 'Not provided.'),
    timeframeSummary: sanitizeText(raw.timeframeSummary, 'Timeframe summary unavailable.'),
    marketStructure: sanitizeText(raw.marketStructure, 'Market structure unavailable.'),
    economicRisk: sanitizeText(raw.economicRisk, 'Latest news/calendar data could not be verified.'),
    reasons: normalizeTextArray(raw.reasons),
    invalidations: normalizeTextArray(raw.invalidations),
    riskWarning: sanitizeText(raw.riskWarning, 'This is educational decision support only. It does not guarantee profit and does not execute trades.'),
    dataQualityWarning: sanitizeText(raw.dataQualityWarning, ''),
    providerUsed: sanitizeText(raw.providerUsed || context.providerUsed || ''),
    modelUsed: sanitizeText(raw.modelUsed || context.modelUsed || context.model || ''),
    scorecard,
    model: sanitizeText(raw.model || context.model || 'unknown'),
    generatedAt: raw.generatedAt || new Date().toISOString()
  };
}

module.exports = { SCORE_KEYS, normalizeAnalysisResult, normalizeScorecard, safeDecision, totalScore };
