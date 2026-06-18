const { ASSETS, getAssetConfig } = require('../config/assets');

const CALENDAR_MESSAGE = 'Economic calendar backend API is not configured.';
const CALENDAR_PROVIDER_ERROR = 'Economic calendar provider request failed. Check backend configuration, provider plan, and limits.';
const CALENDAR_RATE_LIMIT_MESSAGE = 'Economic calendar provider rate limit reached. Try again later.';
const CALENDAR_TIMEOUT_MESSAGE = 'Economic calendar backend API timed out. Calendar risk is unverified.';
const NO_RELEVANT_EVENTS_MESSAGE = 'No relevant high-impact economic events found in the selected window.';
const VERIFIED_EVENTS_MESSAGE = 'Backend economic risk verified.';
const UNVERIFIED_SUMMARY = 'Latest news/calendar data could not be verified.';
const ECONOMIC_EVENTS_TIMEOUT_MS = 10000;

const ASSET_EVENT_FILTERS = Object.fromEntries(Object.values(ASSETS).map((asset) => [asset.canonicalAsset, { currencies: asset.eventCurrencies, countries: asset.eventCountries, keywords: asset.eventKeywords }]));
const XAUUSD_KEYWORDS = ['cpi', 'core cpi', 'ppi', 'core pce', 'nfp', 'nonfarm payrolls', 'non-farm payrolls', 'unemployment', 'initial jobless claims', 'fomc', 'fed', 'powell', 'interest rate decision', 'interest rate', 'gdp', 'pmi', 'ism', 'retail sales', 'consumer confidence', 'jolts'];

const COUNTRY_ALIASES = { us: 'united states', usa: 'united states', 'u.s.': 'united states', 'u.s.a.': 'united states', uk: 'united kingdom', britain: 'united kingdom', england: 'united kingdom', eu: 'euro area', eurozone: 'euro area', 'euro zone': 'euro area' };
const COUNTRY_CURRENCY = { 'united states': 'USD', 'euro area': 'EUR', germany: 'EUR', france: 'EUR', italy: 'EUR', japan: 'JPY', 'united kingdom': 'GBP', switzerland: 'CHF', australia: 'AUD', canada: 'CAD', 'new zealand': 'NZD' };

function providerName() { const raw = String(process.env.ECONOMIC_CALENDAR_PROVIDER || '').trim().toLowerCase(); if (['financialmodelingprep', 'financial-modeling-prep', 'fmp'].includes(raw)) return 'fmp'; return raw; }
function calendarApiKey() { return process.env.ECONOMIC_CALENDAR_API_KEY || process.env.FMP_API_KEY || ''; }
function providerConfigured() { const provider = providerName(); return ['fmp', 'tradingeconomics'].includes(provider) && Boolean(calendarApiKey()); }
function getDateRange() { const today = new Date(); const start = new Date(today.getTime() - 24 * 60 * 60 * 1000); const end = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000); return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }; }
function normalizeCountry(value = '') { const normalized = String(value || '').trim().toLowerCase(); return COUNTRY_ALIASES[normalized] || normalized; }
function countryCurrency(country = '') { return COUNTRY_CURRENCY[normalizeCountry(country)] || ''; }
function cleanString(value) { if (value === undefined || value === null) return ''; const text = String(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim(); if (!text || text === 'NaN' || text === '[object Object]') return ''; return text.slice(0, 300); }
function firstValue(event, keys) { for (const key of keys) { if (event[key] !== undefined && event[key] !== null && typeof event[key] !== 'object') return event[key]; } return ''; }
function eventText(event = {}) { return [firstValue(event, ['event', 'Event', 'title', 'name', 'indicator', 'Category', 'category']), firstValue(event, ['country', 'Country']), firstValue(event, ['currency', 'Currency'])].map(cleanString).filter(Boolean).join(' ').toLowerCase(); }
function importanceNumber(event = {}) { const raw = firstValue(event, ['impact', 'Impact', 'importance', 'Importance', 'priority']); const number = Number(raw); if (Number.isFinite(number)) return number; const text = String(raw || '').trim().toLowerCase(); if (/high|important|critical|3/.test(text)) return 3; if (/medium|moderate|2/.test(text)) return 2; if (/low|minor|1/.test(text)) return 1; return 0; }
function eventCountry(event = {}) { return cleanString(firstValue(event, ['country', 'Country', 'countryCode', 'country_code'])); }
function eventCurrency(event = {}) { const country = eventCountry(event); return cleanString(firstValue(event, ['currency', 'Currency', 'currencyCode', 'currency_code']) || countryCurrency(country)).toUpperCase(); }
function countryMatches(eventCountryName, filterCountryName) { const country = normalizeCountry(eventCountryName); const filter = normalizeCountry(filterCountryName); return Boolean(country && filter && (country === filter || country.includes(filter) || filter.includes(country))); }
function keywordMatches(text, keywords) { return keywords.some((keyword) => text.includes(String(keyword).toLowerCase())); }
function currencyOrCountryMatches(event, filter) { const currency = eventCurrency(event); const country = eventCountry(event); return filter.currencies.some((item) => currency === item || currency.includes(item)) || filter.countries.some((item) => countryMatches(country, item)); }
function eventTimestamp(event = {}) { const date = firstValue(event, ['date', 'Date', 'datetime', 'time', 'publishedDate']); return new Date(date).getTime() || 0; }

function filterEvents(events = [], request = {}) {
  const config = getAssetConfig(request.asset || request.assetLabel) || ASSETS.XAUUSD;
  const filter = ASSET_EVENT_FILTERS[config.canonicalAsset] || ASSET_EVENT_FILTERS.XAUUSD;
  return events.filter((event) => {
    const text = eventText(event);
    const currencyCountryMatch = currencyOrCountryMatches(event, filter);
    const keywords = config.canonicalAsset === 'XAUUSD' ? XAUUSD_KEYWORDS : filter.keywords;
    const keywordMatch = keywordMatches(text, keywords);
    const highImpact = importanceNumber(event) >= 3;
    if (config.canonicalAsset === 'XAUUSD') return currencyCountryMatch && keywordMatch;
    return currencyCountryMatch && (highImpact || keywordMatch);
  }).sort((a, b) => eventTimestamp(a) - eventTimestamp(b)).slice(0, 25);
}

function splitDateTime(value) { const raw = cleanString(value); if (!raw) return { date: '', time: '' }; const parsed = new Date(raw); if (Number.isFinite(parsed.getTime())) return { date: parsed.toISOString().slice(0, 10), time: parsed.toISOString().slice(11, 16) }; const [date, time = ''] = raw.split(/[ T]/); return { date: cleanString(date), time: cleanString(time).slice(0, 5) }; }
function normalizeEvent(event = {}) { const rawDate = firstValue(event, ['date', 'Date', 'datetime', 'time', 'publishedDate']); const { date, time } = splitDateTime(rawDate); const impactNumber = importanceNumber(event); const impactText = cleanString(firstValue(event, ['impact', 'Impact', 'importance', 'Importance'])) || (impactNumber >= 3 ? 'High' : impactNumber === 2 ? 'Medium' : impactNumber === 1 ? 'Low' : ''); return { date, time, country: eventCountry(event), currency: eventCurrency(event), event: cleanString(firstValue(event, ['event', 'Event', 'title', 'name', 'indicator', 'Category', 'category'])), impact: impactText, actual: cleanString(firstValue(event, ['actual', 'Actual'])), forecast: cleanString(firstValue(event, ['forecast', 'Forecast', 'estimate', 'consensus'])), previous: cleanString(firstValue(event, ['previous', 'Previous'])), source: cleanString(firstValue(event, ['source', 'Source'])) || 'Financial Modeling Prep' }; }
function buildRiskSummary(events = []) { return events.length ? VERIFIED_EVENTS_MESSAGE : NO_RELEVANT_EVENTS_MESSAGE; }
function safeFailure(provider, message, asset, extra = {}) { return { ok: false, configured: true, verified: false, provider, message, asset, events: [], riskSummary: UNVERIFIED_SUMMARY, asOf: new Date().toISOString(), ...extra }; }
function safeSuccess(provider, request, window, events) { return { ok: true, configured: true, verified: true, provider, asset: getAssetConfig(request.asset)?.canonicalAsset || request.asset, window, events, riskSummary: buildRiskSummary(events), message: events.length ? VERIFIED_EVENTS_MESSAGE : NO_RELEVANT_EVENTS_MESSAGE, asOf: new Date().toISOString() }; }
function requestId(request = {}) { return cleanString(request.requestId) || `econ_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function sanitizedProviderMessage(data) { const msg = cleanString(data?.message || data?.error || data?.['Error Message'] || data?.Information || ''); return msg.replace(/apikey=[^&\s]+/gi, 'apikey=[redacted]').slice(0, 180); }
function logProviderAttempt({ provider, endpointVersion, statusCode, requestId: id, providerMessage }) { console.warn('economic-calendar-provider', { provider, endpointVersion, statusCode, requestId: id, providerMessage: providerMessage || '' }); }
async function fetchJsonWithTimeout(url, endpointVersion, id, timeoutMs = ECONOMIC_EVENTS_TIMEOUT_MS) { const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), timeoutMs); let response; try { response = await fetch(url, { signal: controller.signal }); const data = await response.json().catch(() => null); logProviderAttempt({ provider: 'fmp', endpointVersion, statusCode: response.status, requestId: id, providerMessage: sanitizedProviderMessage(data) }); return { response, data }; } finally { clearTimeout(timeoutId); } }
function fmpUrl(endpointVersion, start, end, key) { const url = new URL(endpointVersion === 'stable' ? 'https://financialmodelingprep.com/stable/economic-calendar' : 'https://financialmodelingprep.com/api/v3/economic_calendar'); url.searchParams.set('from', start); url.searchParams.set('to', end); url.searchParams.set('apikey', key); return url; }
function rawEventsFromFmp(data) { if (Array.isArray(data)) return data; if (Array.isArray(data?.data)) return data.data; if (Array.isArray(data?.economicCalendar)) return data.economicCalendar; return null; }
function isRateLimited(status, data) { return status === 429 || /rate|limit|quota|too many/i.test(sanitizedProviderMessage(data)); }

async function fetchFmpCalendar(request = {}) {
  const key = calendarApiKey(); const { start, end } = getDateRange(); const id = requestId(request); const asset = getAssetConfig(request.asset)?.canonicalAsset || request.asset;
  for (const endpointVersion of ['stable', 'legacy']) {
    try {
      const { response, data } = await fetchJsonWithTimeout(fmpUrl(endpointVersion, start, end, key), endpointVersion, id);
      const rawEvents = rawEventsFromFmp(data);
      if (response.ok && Array.isArray(rawEvents)) { const events = filterEvents(rawEvents, request).map(normalizeEvent); return safeSuccess('fmp', request, { start, end }, events); }
      if (isRateLimited(response.status, data)) return safeFailure('fmp', CALENDAR_RATE_LIMIT_MESSAGE, asset);
    } catch (error) {
      if (error.name === 'AbortError') return safeFailure('fmp', CALENDAR_TIMEOUT_MESSAGE, asset, { errorCode: 'ECONOMIC_EVENTS_TIMEOUT', riskSummary: UNVERIFIED_SUMMARY });
      logProviderAttempt({ provider: 'fmp', endpointVersion, statusCode: 'fetch-error', requestId: id, providerMessage: cleanString(error.message).slice(0, 120) });
    }
  }
  return safeFailure('fmp', CALENDAR_PROVIDER_ERROR, asset);
}

async function fetchTradingEconomics(request = {}) {
  const key = calendarApiKey();
  const { start, end } = getDateRange();
  const asset = getAssetConfig(request.asset)?.canonicalAsset || request.asset;
  const url = new URL(`https://api.tradingeconomics.com/calendar/${start}/${end}`);
  url.searchParams.set('c', key);
  url.searchParams.set('f', 'json');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ECONOMIC_EVENTS_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (response.status === 429) return safeFailure('tradingeconomics', CALENDAR_RATE_LIMIT_MESSAGE, asset);
    if (!response.ok || !Array.isArray(data)) return safeFailure('tradingeconomics', CALENDAR_PROVIDER_ERROR, asset);
    const events = filterEvents(data, request).map((event) => ({ ...normalizeEvent(event), source: 'Trading Economics' }));
    return safeSuccess('tradingeconomics', request, { start, end }, events);
  } catch (error) {
    if (error.name === 'AbortError') return safeFailure('tradingeconomics', CALENDAR_TIMEOUT_MESSAGE, asset, { errorCode: 'ECONOMIC_EVENTS_TIMEOUT' });
    return safeFailure('tradingeconomics', CALENDAR_PROVIDER_ERROR, asset);
  } finally {
    clearTimeout(timeoutId);
  }
}
async function getEconomicEvents(request = {}) { const asset = getAssetConfig(request.asset)?.canonicalAsset || request.asset; if (!providerConfigured()) return { ok: false, configured: false, verified: false, provider: providerName() || 'not-configured', message: CALENDAR_MESSAGE, asset, events: [], riskSummary: UNVERIFIED_SUMMARY, asOf: new Date().toISOString() }; if (providerName() === 'fmp') return fetchFmpCalendar(request); if (providerName() === 'tradingeconomics') return fetchTradingEconomics(request); return { ok: false, configured: false, verified: false, provider: providerName(), message: CALENDAR_MESSAGE, asset, events: [], riskSummary: UNVERIFIED_SUMMARY, asOf: new Date().toISOString() }; }
function getEconomicCalendarStatus() { return { configured: providerConfigured(), provider: providerName() || 'not-configured' }; }

module.exports = { getEconomicEvents, getEconomicCalendarStatus, CALENDAR_MESSAGE, CALENDAR_PROVIDER_ERROR, CALENDAR_RATE_LIMIT_MESSAGE, CALENDAR_TIMEOUT_MESSAGE, NO_RELEVANT_EVENTS_MESSAGE, VERIFIED_EVENTS_MESSAGE, ASSET_EVENT_FILTERS };
