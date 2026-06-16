const DECISIONS = ['No Trade', 'Watch', 'Buy Setup', 'Sell Setup'];
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

function sanitizeText(value, fallback = '') {
  return String(value || fallback).replace(/[\u0000-\u001F]/g, ' ').replace(/guaranteed profit|100% sure/gi, 'not guaranteed').trim();
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
    takeProfits: {
      tp1: sanitizeText(raw.takeProfits?.tp1),
      tp2: sanitizeText(raw.takeProfits?.tp2),
      tp3: sanitizeText(raw.takeProfits?.tp3)
    },
    riskReward: sanitizeText(raw.riskReward, 'Not provided.'),
    timeframeSummary: sanitizeText(raw.timeframeSummary, 'Timeframe summary unavailable.'),
    marketStructure: sanitizeText(raw.marketStructure, 'Market structure unavailable.'),
    economicRisk: sanitizeText(raw.economicRisk, 'Latest news/calendar data could not be verified.'),
    reasons: Array.isArray(raw.reasons) ? raw.reasons.map((item) => sanitizeText(item)).filter(Boolean) : [],
    invalidations: Array.isArray(raw.invalidations) ? raw.invalidations.map((item) => sanitizeText(item)).filter(Boolean) : [],
    riskWarning: sanitizeText(raw.riskWarning, 'This is educational decision support only. It does not guarantee profit and does not execute trades.'),
    scorecard,
    model: sanitizeText(raw.model || context.model || 'unknown'),
    generatedAt: raw.generatedAt || new Date().toISOString()
  };
}

module.exports = { SCORE_KEYS, normalizeAnalysisResult, normalizeScorecard, safeDecision, totalScore };
