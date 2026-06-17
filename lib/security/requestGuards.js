const ALLOWED_ASSETS = ['XAUUSD', 'EUR/USD', 'EUR/JPY', 'USD/JPY', 'GBP/USD', 'GBP/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'US Oil', 'XAGUSD', 'BTC/USD'];
const ALLOWED_STRATEGY_MODES = ['Scalping', 'Intraday', 'Swing'];
const ALLOWED_RISK_PROFILES = ['Conservative', 'Balanced', 'Aggressive'];
const ALLOWED_ANALYSIS_DEPTHS = ['Fast', 'Standard', 'Deep'];
const ALLOWED_TIMEFRAMES = ['Monthly', 'Weekly', 'Daily', 'H4', 'H1', 'M30', 'M15', 'M5'];
const ALLOWED_AI_PROVIDERS = ['openai', 'anthropic', 'xai', 'gemini', 'microsoft'];
const ALLOWED_REVIEW_PROVIDERS = ['none', ...ALLOWED_AI_PROVIDERS];
const MAX_BODY_BYTES = 24 * 1024;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 12;
const RATE_BUCKETS = new Map();

function normalizeOrigin(origin = '') {
  return String(origin).trim().replace(/\/+$/, '').toLowerCase();
}

function configuredOrigins() {
  return String(process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

function originIsAllowed(requestOrigin) {
  const allowedOrigins = configuredOrigins();
  if (!allowedOrigins.length) return true;
  return allowedOrigins.includes(normalizeOrigin(requestOrigin));
}

function applyCors(req, res) {
  const requestOrigin = req.headers.origin;
  const allowedOrigins = configuredOrigins();

  if (requestOrigin && originIsAllowed(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin.replace(/\/+$/, ''));
  } else if (!allowedOrigins.length && process.env.NODE_ENV !== 'production' && requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  if (requestOrigin && !originIsAllowed(requestOrigin)) {
    res.status(403).json({ ok: false, message: 'Invalid request origin. Check ALLOWED_ORIGIN in Vercel environment variables.' });
    return true;
  }

  return false;
}

function rejectOversized(req, res) {
  const length = Number(req.headers['content-length'] || 0);
  if (length > MAX_BODY_BYTES) {
    res.status(413).json({ ok: false, message: 'Invalid request body' });
    return true;
  }
  return false;
}

function rateLimit(req, res) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const key = forwarded || req.socket?.remoteAddress || 'anonymous';
  const now = Date.now();
  const bucket = RATE_BUCKETS.get(key) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_WINDOW_MS;
  }
  bucket.count += 1;
  RATE_BUCKETS.set(key, bucket);
  if (bucket.count > RATE_LIMIT) {
    res.status(429).json({ ok: false, message: 'Analysis temporarily unavailable.' });
    return true;
  }
  return false;
}

function byteLength(value) {
  return Buffer.byteLength(JSON.stringify(value || {}), 'utf8');
}

function assertSafeText(value, maxLength = 500) {
  return typeof value === 'string' && value.length <= maxLength && !/[<>`$\\]/.test(value);
}

function sanitizeCommonPayload(body = {}, options = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || byteLength(body) > MAX_BODY_BYTES) throw new Error('Invalid request.');
  const allowedKeys = new Set(['asset', 'assetLabel', 'tradingViewSymbol', 'assetClass', 'timeframe', 'strategyMode', 'riskProfile', 'analysisDepth', ...(options.extraKeys || [])]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) throw new Error('Invalid request.');
  if (!ALLOWED_ASSETS.includes(body.asset)) throw new Error('Invalid request.');
  if (!ALLOWED_STRATEGY_MODES.includes(body.strategyMode)) throw new Error('Invalid request.');
  if (!ALLOWED_RISK_PROFILES.includes(body.riskProfile)) throw new Error('Invalid request.');
  if (!ALLOWED_ANALYSIS_DEPTHS.includes(body.analysisDepth)) throw new Error('Invalid request.');
  if (!ALLOWED_TIMEFRAMES.includes(body.timeframe)) throw new Error('Invalid request.');
  if (body.primaryProvider !== undefined && !ALLOWED_AI_PROVIDERS.includes(body.primaryProvider)) throw new Error('Invalid request.');
  if (body.reviewProvider !== undefined && !ALLOWED_REVIEW_PROVIDERS.includes(body.reviewProvider)) throw new Error('Invalid request.');
  ['assetLabel', 'tradingViewSymbol', 'assetClass'].forEach((key) => {
    if (body[key] !== undefined && !assertSafeText(body[key], 120)) throw new Error('Invalid request.');
  });
  return body;
}

function guardRequest(req, res) {
  if (applyCors(req, res)) return true;
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, message: 'Invalid request method.' });
    return true;
  }
  if (rejectOversized(req, res)) return true;
  if (rateLimit(req, res)) return true;
  return false;
}

module.exports = { guardRequest, sanitizeCommonPayload, MAX_BODY_BYTES, normalizeOrigin, originIsAllowed, applyCors };