const { assertValidAsset, SUPPORTED_TIMEFRAMES } = require('../config/assets');
const { getMarketData, resolveSymbol } = require('../providers/marketDataProvider');
const { getEconomicEvents } = require('../providers/economicEventsProvider');
const { summarizeTimeframe } = require('./technicalIndicators');

function timeframePlan(selected, depth) {
  const i = SUPPORTED_TIMEFRAMES.indexOf(selected);
  if (depth === 'Deep') return SUPPORTED_TIMEFRAMES;
  if (depth === 'Fast') return [...new Set([selected, SUPPORTED_TIMEFRAMES[Math.max(0, i - 1)] || 'Daily'])];
  return [...new Set([selected, 'Daily', 'H4', 'H1'])];
}
function compactCandles(candles = []) { return candles.slice(-10).map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume })); }
function sessionStatus(assetClass) { const h = new Date().getUTCHours(); if (assetClass === 'Crypto') return 'crypto 24/7'; if (h >= 7 && h < 17) return 'London/New York active'; if (h >= 0 && h < 7) return 'Asia session'; return 'after-hours / rollover caution'; }
function signalSummary(summaries, selected) { const s = summaries[selected] || Object.values(summaries)[0] || {}; return { selectedTrend: s.trend || 'neutral', selectedEmaAlignment: s.emaAlignment || 'unavailable', selectedRsi: s.rsi ?? null, selectedAtr: s.atr ?? null, nearestSupport: s.support ?? null, nearestResistance: s.resistance ?? null }; }
function buildRiskFilters({ marketConfigured, currentPrice, summaries, selected, economicEvents, warnings, assetClass }) { const selectedSummary = summaries[selected]; const hasEnoughCandles = Boolean(selectedSummary && selectedSummary.candleCount >= 50); const coreOk = Boolean(selectedSummary && selectedSummary.ema50 !== null && selectedSummary.rsi !== null && selectedSummary.atr !== null); const atrStatus = !selectedSummary?.atr ? 'unavailable' : selectedSummary.atr / Math.max(Math.abs(selectedSummary.lastClose || 1), 1) > 0.04 ? 'extreme' : 'normal'; let finalPermission = 'Trade eligible'; if (!marketConfigured || !selectedSummary || !selectedSummary.candleCount) finalPermission = 'No Trade'; else if (!hasEnoughCandles || !coreOk) finalPermission = 'Watch only'; const outWarnings = [...warnings]; if (!economicEvents.configured) outWarnings.push('Economic calendar backend API is not configured.'); if (atrStatus !== 'normal') outWarnings.push(`ATR volatility is ${atrStatus}.`); return { marketDataAvailable: Boolean(marketConfigured && selectedSummary?.candleCount), hasCurrentPrice: currentPrice !== null && currentPrice !== undefined, hasEnoughCandles, economicRiskAvailable: Boolean(economicEvents.ok), spreadAcceptable: 'unknown', atrVolatilityStatus: atrStatus, sessionStatus: sessionStatus(assetClass), finalPermission, warnings: outWarnings }; }
async function buildMarketContext(request = {}) {
  const asset = assertValidAsset(request.asset || request.assetLabel);
  const selectedTimeframe = request.timeframe || 'M15';
  const warnings = [];
  const plan = timeframePlan(selectedTimeframe, request.analysisDepth || 'Standard');
  const results = await Promise.allSettled(plan.map(tf => getMarketData({ ...request, asset: asset.canonicalAsset, assetClass: asset.assetClass, timeframe: tf })));
  const summaries = {}, recentCandles = {};
  let provider = 'not-configured', configured = false, currentPrice = null, asOf = new Date().toISOString();
  results.forEach((r, idx) => { const tf = plan[idx]; if (r.status !== 'fulfilled' || !r.value.ok) { warnings.push(`${tf} market data missing${r.value?.message ? `: ${r.value.message}` : '.'}`); summaries[tf] = summarizeTimeframe(tf, []); return; } const d = r.value; provider = d.provider || provider; configured = d.configured; asOf = d.asOf || asOf; if (tf === selectedTimeframe) currentPrice = d.lastPrice; summaries[tf] = summarizeTimeframe(tf, d.candles || []); recentCandles[tf] = compactCandles(d.candles || []); });
  const economicEvents = await getEconomicEvents({ ...request, asset: asset.canonicalAsset, assetClass: asset.assetClass }).catch(() => ({ ok: false, configured: false, verified: false, events: [], riskSummary: 'Latest news/calendar data could not be verified.', message: 'Economic calendar data could not be loaded.' }));
  const economicRisk = { configured: Boolean(economicEvents.configured), verified: economicEvents.verified === true, ok: economicEvents.ok === true, message: economicEvents.message, summary: economicEvents.message || economicEvents.riskSummary || 'Latest news/calendar data could not be verified.', events: (economicEvents.events || []).slice(0, 10) };
  const riskFilters = buildRiskFilters({ marketConfigured: configured, currentPrice, summaries, selected: selectedTimeframe, economicEvents, warnings, assetClass: asset.assetClass });
  return { ok: riskFilters.marketDataAvailable, configured, provider, asset: request.asset, canonicalAsset: asset.canonicalAsset, assetClass: asset.assetClass, symbol: resolveSymbol({ asset: asset.canonicalAsset }), selectedTimeframe, strategyMode: request.strategyMode, riskProfile: request.riskProfile, analysisDepth: request.analysisDepth, asOf, currentPrice, spreadStatus: 'unknown', session: sessionStatus(asset.assetClass), selectedTimeframeSummary: summaries[selectedTimeframe] || summarizeTimeframe(selectedTimeframe, []), dataCompleteness: { requestedTimeframes: plan, availableTimeframes: Object.entries(summaries).filter(([,s]) => s.candleCount > 0).map(([tf])=>tf), warnings }, timeframes: summaries, economicRisk, macroContext: { summary: economicRisk.summary }, signalSummary: signalSummary(summaries, selectedTimeframe), riskFilters, recentCandles };
}
module.exports = { buildMarketContext, timeframePlan };
