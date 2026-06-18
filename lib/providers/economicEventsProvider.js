const { ASSETS, getAssetConfig } = require('../config/assets');

const CALENDAR_MESSAGE = 'Economic calendar backend API is not configured. Calendar may be visual only.';
const CALENDAR_PROVIDER_ERROR = 'Economic calendar provider request failed. Check backend configuration, provider plan, and limits.';

const ASSET_EVENT_FILTERS = Object.fromEntries(Object.values(ASSETS).map((asset) => [asset.canonicalAsset, { currencies: asset.eventCurrencies, countries: asset.eventCountries, keywords: asset.eventKeywords }]));

const COUNTRY_ALIASES = {
  us: 'united states',
  usa: 'united states',
  'u.s.': 'united states',
  'u.s.a.': 'united states',
  uk: 'united kingdom',
  britain: 'united kingdom',
  england: 'united kingdom',
  eu: 'euro area',
  eurozone: 'euro area',
  'euro zone': 'euro area'
};

const COUNTRY_CURRENCY = {
  'united states': 'USD',
  'euro area': 'EUR',
  germany: 'EUR',
  france: 'EUR',
  italy: 'EUR',
  japan: 'JPY',
  'united kingdom': 'GBP',
  switzerland: 'CHF',
  australia: 'AUD',
  canada: 'CAD',
  'new zealand': 'NZD'
};

function providerName() {
  const raw = String(process.env.ECONOMIC_CALENDAR_PROVIDER || '').trim().toLowerCase();
  if (['financialmodelingprep', 'financial-modeling-prep', 'fmp'].includes(raw)) return 'fmp';
  return raw;
}

function calendarApiKey() {
  return process.env.ECONOMIC_CALENDAR_API_KEY || process.env.FMP_API_KEY || '';
}

function providerConfigured() {
  const provider = providerName();
  return ['fmp', 'tradingeconomics'].includes(provider) && Boolean(calendarApiKey());
}

function getDateRange() {
  const today = new Date();
  const start = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const end = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

function normalizeCountry(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return COUNTRY_ALIASES[normalized] || normalized;
}

function countryCurrency(country = '') {
  return COUNTRY_CURRENCY[normalizeCountry(country)] || '';
}

function eventText(event = {}) {
  return [
    event.Event,
    event.event,
    event.title,
    event.name,
    event.indicator,
    event.Category,
    event.category,
    event.Country,
    event.country,
    event.Currency,
    event.currency,
    event.Source,
    event.source
  ].filter(Boolean).join(' ').toLowerCase();
}

function importanceNumber(event = {}) {
  const raw = event.Importance ?? event.importance ?? event.Impact ?? event.impact ?? event.priority ?? 0;
  const number = Number(raw);
  if (Number.isFinite(number)) return number;

  const text = String(raw || '').trim().toLowerCase();
  if (/high|important|critical|3/.test(text)) return 3;
  if (/medium|moderate|2/.test(text)) return 2;
  if (/low|minor|1/.test(text)) return 1;
  return 0;
}

function eventCountry(event = {}) {
  return String(event.Country || event.country || event.countryCode || event.country_code || '').trim();
}

function eventCurrency(event = {}) {
  const country = eventCountry(event);
  return String(event.Currency || event.currency || event.currencyCode || event.currency_code || countryCurrency(country) || '').toUpperCase();
}

function countryMatches(eventCountryName, filterCountryName) {
  const country = normalizeCountry(eventCountryName);
  const filter = normalizeCountry(filterCountryName);
  if (!country || !filter) return false;
  return country === filter || country.includes(filter) || filter.includes(country);
}

function filterEvents(events = [], request = {}) {
  const config = getAssetConfig(request.asset || request.assetLabel) || ASSETS.XAUUSD;
  const filter = ASSET_EVENT_FILTERS[config.canonicalAsset] || ASSET_EVENT_FILTERS.XAUUSD;
  return events
    .filter((event) => {
      const text = eventText(event);
      const currency = eventCurrency(event);
      const country = eventCountry(event);
      const byCurrency = filter.currencies.some((item) => currency.includes(item));
      const byCountry = filter.countries.some((item) => countryMatches(country, item));
      const byKeyword = filter.keywords.some((keyword) => text.includes(keyword));
      return importanceNumber(event) >= 2 || byCurrency || byCountry || byKeyword;
    })
    .sort((a, b) => new Date(a.Date || a.date || a.datetime || a.time || 0) - new Date(b.Date || b.date || b.datetime || b.time || 0))
    .slice(0, 25);
}

function normalizeEvent(event = {}) {
  const country = eventCountry(event);
  return {
    date: event.Date || event.date || event.datetime || event.time || '',
    country,
    currency: eventCurrency(event),
    event: event.Event || event.event || event.title || event.name || event.indicator || event.Category || event.category || '',
    category: event.Category || event.category || event.type || '',
    importance: importanceNumber(event),
    actual: event.Actual ?? event.actual ?? '',
    previous: event.Previous ?? event.previous ?? '',
    forecast: event.Forecast ?? event.forecast ?? event.estimate ?? event.consensus ?? '',
    source: event.Source || event.source || 'Financial Modeling Prep',
    url: event.URL || event.url || ''
  };
}

function buildRiskSummary(events = []) {
  if (!events.length) return 'No relevant high-impact economic events returned by the calendar provider. Still verify news manually before trading.';
  const now = Date.now();
  const next24h = events.filter((event) => {
    const time = new Date(event.date).getTime();
    return Number.isFinite(time) && time >= now && time <= now + 24 * 60 * 60 * 1000;
  });
  const highImpact = events.filter((event) => event.importance >= 3);
  if (next24h.some((event) => event.importance >= 2)) {
    return `Caution: ${next24h.length} relevant economic event(s) are scheduled within the next 24 hours. Prefer No Trade or reduced risk around releases.`;
  }
  if (highImpact.length) {
    return `Watchlist: ${highImpact.length} high-impact event(s) are visible in the current calendar window. Avoid trading into major news without confirmation.`;
  }
  return 'No immediate high-impact event detected in the returned calendar window. Continue to verify latest news manually.';
}

async function fetchTradingEconomics(request = {}) {
  const key = calendarApiKey();
  const { start, end } = getDateRange();
  const url = new URL(`https://api.tradingeconomics.com/calendar/${start}/${end}`);
  url.searchParams.set('c', key);
  url.searchParams.set('f', 'json');

  const response = await fetch(url);
  const data = await response.json().catch(() => []);
  if (!response.ok || !Array.isArray(data)) {
    return {
      ok: false,
      configured: true,
      provider: 'tradingeconomics',
      message: CALENDAR_PROVIDER_ERROR,
      asset: getAssetConfig(request.asset)?.canonicalAsset || request.asset,
      events: [],
      riskSummary: 'Latest news/calendar data could not be verified.',
      asOf: new Date().toISOString()
    };
  }

  const events = filterEvents(data, request).map(normalizeEvent);
  return {
    ok: true,
    configured: true,
    provider: 'tradingeconomics',
    asset: request.asset,
    window: { start, end },
    events,
    riskSummary: buildRiskSummary(events),
    message: `Loaded ${events.length} relevant economic event(s) from Trading Economics.`,
    asOf: new Date().toISOString()
  };
}

async function fetchFmpCalendar(request = {}) {
  const key = calendarApiKey();
  const { start, end } = getDateRange();
  const url = new URL('https://financialmodelingprep.com/stable/economic-calendar');
  url.searchParams.set('from', start);
  url.searchParams.set('to', end);
  url.searchParams.set('apikey', key);

  const response = await fetch(url);
  const data = await response.json().catch(() => []);
  const rawEvents = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];

  if (!response.ok || !Array.isArray(rawEvents)) {
    return {
      ok: false,
      configured: true,
      provider: 'fmp',
      message: CALENDAR_PROVIDER_ERROR,
      asset: getAssetConfig(request.asset)?.canonicalAsset || request.asset,
      events: [],
      riskSummary: 'Latest news/calendar data could not be verified.',
      asOf: new Date().toISOString()
    };
  }

  const events = filterEvents(rawEvents, request).map(normalizeEvent);
  return {
    ok: true,
    configured: true,
    provider: 'fmp',
    asset: request.asset,
    window: { start, end },
    events,
    riskSummary: buildRiskSummary(events),
    message: `Loaded ${events.length} relevant economic event(s) from FMP.`,
    asOf: new Date().toISOString()
  };
}

async function getEconomicEvents(request = {}) {
  if (!providerConfigured()) {
    return {
      ok: false,
      configured: false,
      provider: providerName() || 'not-configured',
      message: CALENDAR_MESSAGE,
      asset: getAssetConfig(request.asset)?.canonicalAsset || request.asset,
      events: [],
      riskSummary: CALENDAR_MESSAGE,
      asOf: new Date().toISOString()
    };
  }

  if (providerName() === 'fmp') return fetchFmpCalendar(request);
  if (providerName() === 'tradingeconomics') return fetchTradingEconomics(request);

  return {
    ok: false,
    configured: false,
    provider: providerName(),
    message: CALENDAR_MESSAGE,
    asset: request.asset,
    events: [],
    riskSummary: 'Latest news/calendar data could not be verified.',
    asOf: new Date().toISOString()
  };
}

function getEconomicCalendarStatus() { return { configured: providerConfigured(), provider: providerName() || 'not-configured' }; }

module.exports = { getEconomicEvents, getEconomicCalendarStatus, CALENDAR_MESSAGE, CALENDAR_PROVIDER_ERROR, ASSET_EVENT_FILTERS };
