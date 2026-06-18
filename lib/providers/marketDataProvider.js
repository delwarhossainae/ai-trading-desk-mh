const { getAssetConfig, assertValidAsset } = require('../config/assets');

const PROVIDER_MESSAGE = 'Market data provider is not configured.';

const DEFAULT_SYMBOL_MAP = Object.fromEntries(Object.values(require('../config/assets').ASSETS).map((asset) => [asset.canonicalAsset, asset.marketDataSymbol]));

const INTERVAL_MAP = {
  Monthly: '1month',
  Weekly: '1week',
  Daily: '1day',
  H4: '4h',
  H1: '1h',
  M30: '30min',
  M15: '15min',
  M5: '5min',
  '1M': '1month',
  '1W': '1week',
  D: '1day',
  240: '4h',
  60: '1h',
  30: '30min',
  15: '15min',
  5: '5min'
};

function providerName() {
  return String(process.env.MARKET_DATA_PROVIDER || '').trim().toLowerCase();
}

function providerConfigured() {
  return providerName() === 'twelvedata' && Boolean(process.env.MARKET_DATA_API_KEY);
}

function customSymbolMap() {
  try {
    return process.env.TWELVEDATA_SYMBOL_MAP ? JSON.parse(process.env.TWELVEDATA_SYMBOL_MAP) : {};
  } catch {
    return {};
  }
}

function resolveSymbol(request = {}) {
  const config = assertValidAsset(request.asset || request.assetLabel);
  const map = { ...DEFAULT_SYMBOL_MAP, ...customSymbolMap() };
  return map[config.canonicalAsset] || request.marketDataSymbol || config.marketDataSymbol;
}

function resolveInterval(timeframe = 'M15') {
  return INTERVAL_MAP[String(timeframe)] || INTERVAL_MAP[timeframe] || '15min';
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function ema(values, period) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length < period) return null;
  const multiplier = 2 / (period + 1);
  let current = clean.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (const value of clean.slice(period)) current = (value - current) * multiplier + current;
  return Number(current.toFixed(5));
}

function bollinger(values, period = 20, multiplier = 2) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length < period) return null;
  const slice = clean.slice(-period);
  const middle = slice.reduce((sum, value) => sum + value, 0) / period;
  const variance = slice.reduce((sum, value) => sum + Math.pow(value - middle, 2), 0) / period;
  const deviation = Math.sqrt(variance);
  return {
    upper: Number((middle + multiplier * deviation).toFixed(5)),
    middle: Number(middle.toFixed(5)),
    lower: Number((middle - multiplier * deviation).toFixed(5))
  };
}

function inferStructure(candles) {
  if (candles.length < 10) return 'Not enough candles to infer structure.';
  const recent = candles.slice(-10);
  const first = recent[0].close;
  const last = recent[recent.length - 1].close;
  const recentHigh = Math.max(...recent.map((candle) => candle.high));
  const recentLow = Math.min(...recent.map((candle) => candle.low));
  const previous = candles.slice(-20, -10);
  const previousHigh = previous.length ? Math.max(...previous.map((candle) => candle.high)) : recentHigh;
  const previousLow = previous.length ? Math.min(...previous.map((candle) => candle.low)) : recentLow;

  if (last > first && recentHigh >= previousHigh && recentLow >= previousLow) return 'Short-term structure is leaning bullish with higher recent highs/lows.';
  if (last < first && recentHigh <= previousHigh && recentLow <= previousLow) return 'Short-term structure is leaning bearish with lower recent highs/lows.';
  return 'Short-term structure is mixed/ranging; confirmation is required before any setup.';
}

function calculateLevels(candles, lastPrice) {
  const recent = candles.slice(-80);
  if (!recent.length || !Number.isFinite(lastPrice)) return { support: null, resistance: null, recentHigh: null, recentLow: null };
  const highs = recent.map((candle) => candle.high).filter(Number.isFinite);
  const lows = recent.map((candle) => candle.low).filter(Number.isFinite);
  const recentHigh = Math.max(...highs);
  const recentLow = Math.min(...lows);
  const supportCandidates = lows.filter((value) => value <= lastPrice).sort((a, b) => b - a);
  const resistanceCandidates = highs.filter((value) => value >= lastPrice).sort((a, b) => a - b);
  return {
    support: supportCandidates[0] ?? recentLow,
    resistance: resistanceCandidates[0] ?? recentHigh,
    recentHigh,
    recentLow
  };
}

function normalizeCandles(values = []) {
  return values
    .map((item) => ({
      time: item.datetime || item.date,
      open: toNumber(item.open),
      high: toNumber(item.high),
      low: toNumber(item.low),
      close: toNumber(item.close),
      volume: toNumber(item.volume) || 0
    }))
    .filter((item) => item.time && [item.open, item.high, item.low, item.close].every(Number.isFinite))
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

async function fetchTwelveData(request = {}) {
  const symbol = resolveSymbol(request);
  const interval = resolveInterval(request.timeframe);
  const outputsize = Number(process.env.MARKET_DATA_OUTPUT_SIZE || 120);
  const url = new URL('https://api.twelvedata.com/time_series');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('interval', interval);
  url.searchParams.set('outputsize', String(Math.min(Math.max(outputsize, 30), 500)));
  url.searchParams.set('apikey', process.env.MARKET_DATA_API_KEY);
  url.searchParams.set('format', 'JSON');
  url.searchParams.set('timezone', process.env.MARKET_DATA_TIMEZONE || 'UTC');

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === 'error' || data.code) {
    return {
      ok: false,
      configured: true,
      provider: 'twelvedata',
      symbol,
      interval,
      message: data.message || data.detail || 'Twelve Data request failed. Check API key, symbol access, provider plan, and rate limits.',
      candles: [],
      lastPrice: null,
      asOf: new Date().toISOString()
    };
  }

  const candles = normalizeCandles(data.values || []);
  const last = candles[candles.length - 1] || null;
  const closes = candles.map((candle) => candle.close);
  const levels = calculateLevels(candles, last?.close);
  const indicators = {
    ema50: ema(closes, 50),
    ema100: ema(closes, 100),
    bollinger20: bollinger(closes, 20, 2)
  };

  return {
    ok: candles.length > 0,
    configured: true,
    provider: 'twelvedata',
    symbol,
    interval,
    asset: getAssetConfig(request.asset)?.canonicalAsset || request.asset,
    assetClass: getAssetConfig(request.asset)?.assetClass || request.assetClass,
    timeframe: request.timeframe || 'M15',
    candles,
    lastPrice: last?.close ?? null,
    currentCandle: last,
    recentHigh: levels.recentHigh,
    recentLow: levels.recentLow,
    support: levels.support,
    resistance: levels.resistance,
    indicators,
    structureSummary: inferStructure(candles),
    message: candles.length ? `Loaded ${candles.length} ${interval} candles for ${symbol}.` : `No candles returned for ${symbol}.`,
    asOf: new Date().toISOString()
  };
}

async function getMarketData(request = {}) {
  if (!providerConfigured()) {
    return {
      ok: false,
      configured: false,
      provider: providerName() || 'not-configured',
      message: PROVIDER_MESSAGE,
      asset: request.asset,
      assetClass: request.assetClass,
      timeframe: request.timeframe,
      candles: [],
      lastPrice: null,
      asOf: new Date().toISOString()
    };
  }

  if (providerName() === 'twelvedata') return fetchTwelveData(request);

  return {
    ok: false,
    configured: false,
    provider: providerName(),
    message: `Unsupported MARKET_DATA_PROVIDER: ${providerName()}. Use twelvedata.`,
    asset: request.asset,
    candles: [],
    lastPrice: null,
    asOf: new Date().toISOString()
  };
}

module.exports = { getMarketData, PROVIDER_MESSAGE, DEFAULT_SYMBOL_MAP, INTERVAL_MAP, resolveSymbol, resolveInterval };