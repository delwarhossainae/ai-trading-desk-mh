const { getAssetConfig } = require('../config/assets');
const ALLOWED_ASSET_INPUTS = require('../config/assets').ALLOWED_ASSET_INPUTS;
const ALLOWED_STRATEGY_MODES = ['Scalping', 'Intraday', 'Swing'];
const ALLOWED_RISK_PROFILES = ['Conservative', 'Balanced', 'Aggressive'];
const ALLOWED_ANALYSIS_DEPTHS = ['Fast', 'Standard', 'Deep'];
const ALLOWED_TIMEFRAMES = ['Monthly', 'Weekly', 'Daily', 'H4', 'H1', 'M30', 'M15', 'M5'];
const ALLOWED_AI_PROVIDERS = ['openai', 'anthropic', 'xai', 'gemini', 'microsoft'];
const ALLOWED_REVIEW_PROVIDERS = ['none', ...ALLOWED_AI_PROVIDERS];
const MAX_BODY_BYTES = 24 * 1024;
const RATE_BUCKETS = new Map();
const RATE_LIMIT_MESSAGE = 'Too many analysis requests. Please wait before trying again.';
const SENSITIVE_ORIGIN_MESSAGE = 'API origin protection is not configured.';

const ROUTE_LIMITS = {
  analyze: { limit: 12, windowMs: 60 * 1000 },
  analyzeDeep: { limit: 4, windowMs: 60 * 1000 },
  analyzeReview: { limit: 3, windowMs: 60 * 1000 },
  review: { limit: 2, windowMs: 60 * 1000 },
  marketData: { limit: 30, windowMs: 60 * 1000 },
  economicEvents: { limit: 30, windowMs: 60 * 1000 },
  default: { limit: 12, windowMs: 60 * 1000 }
};

function normalizeOrigin(origin = '') { return String(origin).trim().replace(/\/+$/, '').toLowerCase(); }
function configuredOrigins() { return String(process.env.ALLOWED_ORIGIN || '').split(',').map(normalizeOrigin).filter(Boolean); }
function isProduction() { return process.env.NODE_ENV === 'production'; }
function originIsAllowed(requestOrigin) {
  const allowedOrigins = configuredOrigins();
  if (!allowedOrigins.length) return !isProduction();
  return allowedOrigins.includes(normalizeOrigin(requestOrigin));
}
function hasJsonContentType(req) { return String(req.headers['content-type'] || '').toLowerCase().split(';')[0].trim() === 'application/json'; }
function requireJsonContentType(req, res) {
  if (req.method === 'POST' && !hasJsonContentType(req)) {
    res.status(415).json({ ok: false, success: false, message: 'Content-Type must be application/json.', errorCode: 'INVALID_PAYLOAD' });
    return true;
  }
  return false;
}

function applyCors(req, res) {
  const requestOrigin = req.headers.origin;
  const allowedOrigins = configuredOrigins();
  if (isProduction() && !allowedOrigins.length) {
    if (req.method === 'OPTIONS') res.status(403).json({ ok: false, success: false, message: SENSITIVE_ORIGIN_MESSAGE, errorCode: 'ORIGIN_NOT_ALLOWED' });
    else res.status(403).json({ ok: false, success: false, message: SENSITIVE_ORIGIN_MESSAGE, errorCode: 'ORIGIN_NOT_ALLOWED' });
    return true;
  }
  if (requestOrigin && originIsAllowed(requestOrigin)) res.setHeader('Access-Control-Allow-Origin', requestOrigin.replace(/\/+$/, ''));
  else if (!allowedOrigins.length && !isProduction() && requestOrigin) res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return true; }
  if (requestOrigin && !originIsAllowed(requestOrigin)) { res.status(403).json({ ok: false, success: false, message: 'Invalid request origin.', errorCode: 'ORIGIN_NOT_ALLOWED' }); return true; }
  return false;
}
function rejectOversized(req, res) { const length = Number(req.headers['content-length'] || 0); if (length > MAX_BODY_BYTES) { res.status(413).json({ ok: false, success: false, message: 'Invalid request body', errorCode: 'INVALID_PAYLOAD' }); return true; } return false; }
function clientKey(req, routeKey) { const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim(); return `${routeKey}:${forwarded || req.socket?.remoteAddress || 'anonymous'}`; }
async function upstashHit(key, limit, windowMs) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redisUrl = String(url).replace(/\/$/, '');
  const encoded = encodeURIComponent(key);
  const ttlSeconds = Math.ceil(windowMs / 1000);
  const incr = await fetch(`${redisUrl}/incr/${encoded}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
  const count = Number(incr.result || 0);
  if (count === 1) await fetch(`${redisUrl}/expire/${encoded}/${ttlSeconds}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  return count > limit;
}
function memoryHit(key, limit, windowMs) { const now = Date.now(); const bucket = RATE_BUCKETS.get(key) || { count: 0, resetAt: now + windowMs }; if (bucket.resetAt <= now) { bucket.count = 0; bucket.resetAt = now + windowMs; } bucket.count += 1; RATE_BUCKETS.set(key, bucket); return bucket.count > limit; }
async function rateLimit(req, res, routeKey = 'default') {
  const cfg = ROUTE_LIMITS[routeKey] || ROUTE_LIMITS.default;
  const key = clientKey(req, routeKey);
  let limited = null;
  try { limited = await upstashHit(key, cfg.limit, cfg.windowMs); } catch { limited = null; }
  if (limited === null) limited = memoryHit(key, cfg.limit, cfg.windowMs);
  if (limited) { res.status(429).json({ ok: false, success: false, message: RATE_LIMIT_MESSAGE, errorCode: 'RATE_LIMITED' }); return true; }
  return false;
}
function byteLength(value) { return Buffer.byteLength(JSON.stringify(value || {}), 'utf8'); }
function assertSafeText(value, maxLength = 500) { return typeof value === 'string' && value.length <= maxLength && !/[<>`$\\]/.test(value); }
function sanitizeCommonPayload(body = {}, options = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || byteLength(body) > MAX_BODY_BYTES) throw new Error('Invalid request.');
  const allowedKeys = new Set(['asset', 'assetLabel', 'tradingViewSymbol', 'assetClass', 'timeframe', 'strategyMode', 'riskProfile', 'analysisDepth', 'primaryProvider', 'reviewProvider', ...(options.extraKeys || [])]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) throw new Error('Invalid request.');
  if (!getAssetConfig(body.asset)) throw new Error('Invalid request.');
  if (!ALLOWED_STRATEGY_MODES.includes(body.strategyMode)) throw new Error('Invalid request.');
  if (!ALLOWED_RISK_PROFILES.includes(body.riskProfile)) throw new Error('Invalid request.');
  if (!ALLOWED_ANALYSIS_DEPTHS.includes(body.analysisDepth)) throw new Error('Invalid request.');
  if (!ALLOWED_TIMEFRAMES.includes(body.timeframe)) throw new Error('Invalid request.');
  if (body.primaryProvider !== undefined && !ALLOWED_AI_PROVIDERS.includes(body.primaryProvider)) throw new Error('Invalid request.');
  if (body.reviewProvider !== undefined && !ALLOWED_REVIEW_PROVIDERS.includes(body.reviewProvider)) throw new Error('Invalid request.');
  ['assetLabel', 'tradingViewSymbol', 'assetClass'].forEach((key) => { if (body[key] !== undefined && !assertSafeText(body[key], 120)) throw new Error('Invalid request.'); });
  return body;
}
async function guardRequest(req, res, options = {}) {
  if (applyCors(req, res)) return true;
  if (req.method !== 'POST') { res.status(405).json({ ok: false, success: false, message: 'Invalid request method.', errorCode: 'INVALID_PAYLOAD' }); return true; }
  if (rejectOversized(req, res)) return true;
  if (options.requireJson !== false && requireJsonContentType(req, res)) return true;
  if (await rateLimit(req, res, options.rateLimitKey || 'default')) return true;
  return false;
}
module.exports = { guardRequest, sanitizeCommonPayload, MAX_BODY_BYTES, normalizeOrigin, originIsAllowed, applyCors, requireJsonContentType, rateLimit, RATE_LIMIT_MESSAGE };
