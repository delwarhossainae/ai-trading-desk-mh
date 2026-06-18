const CALENDAR_MESSAGE = 'Economic calendar API is not configured. Add ECONOMIC_CALENDAR_PROVIDER=fmp and ECONOMIC_CALENDAR_API_KEY in backend environment variables. Supported providers: fmp, tradingeconomics.';

const ASSET_EVENT_FILTERS = {
  XAUUSD: { currencies: ['USD'], countries: ['United States'], keywords: ['fed', 'fomc', 'cpi', 'pce', 'nfp', 'non farm', 'payroll', 'unemployment', 'jobless', 'interest rate', 'gdp', 'retail sales', 'pmi', 'ism'] },
  'XAUUSD / Gold': { currencies: ['USD'], countries: ['United States'], keywords: ['fed', 'fomc', 'cpi', 'pce', 'nfp', 'non farm', 'payroll', 'unemployment', 'jobless', 'interest rate', 'gdp', 'retail sales', 'pmi', 'ism'] },
  XAGUSD: { currencies: ['USD'], countries: ['United States'], keywords: ['fed', 'fomc', 'cpi', 'pce', 'nfp', 'non farm', 'payroll', 'unemployment', 'jobless', 'interest rate', 'gdp', 'retail sales', 'pmi', 'ism'] },
  'BTC/USD': { currencies: ['USD'], countries: ['United States'], keywords: ['fed', 'fomc', 'cpi', 'pce', 'payroll', 'unemployment', 'interest rate', 'gdp', 'retail sales', 'pmi', 'ism'] },
  'US Oil': { currencies: ['USD'], countries: ['United States'], keywords: ['crude', 'oil', 'inventories', 'eia', 'api', 'opec', 'fed', 'cpi', 'gdp'] },
  'EUR/USD': { currencies: ['EUR', 'USD'], countries: ['United States', 'Euro Area', 'Germany', 'France', 'Italy'], keywords: ['ecb', 'fed', 'fomc', 'cpi', 'pmi', 'gdp', 'interest rate', 'payroll', 'unemployment'] },
  'EUR/JPY': { currencies: ['EUR', 'JPY'], countries: ['Euro Area', 'Germany', 'France', 'Japan'], keywords: ['ecb', 'boj', 'cpi', 'pmi', 'gdp', 'interest rate', 'unemployment'] },
  'USD/JPY': { currencies: ['USD', 'JPY'], countries: ['United States', 'Japan'], keywords: ['fed', 'fomc', 'boj', 'cpi', 'pce', 'payroll', 'unemployment', 'interest rate', 'gdp'] },
  'GBP/USD': { currencies: ['GBP', 'USD'], countries: ['United States', 'United Kingdom'], keywords: ['boe', 'fed', 'fomc', 'cpi', 'pce', 'payroll', 'unemployment', 'interest rate', 'gdp', 'pmi'] },
  'GBP/JPY': { currencies: ['GBP', 'JPY'], countries: ['United Kingdom', 'Japan'], keywords: ['boe', 'boj', 'cpi', 'interest rate', 'gdp', 'pmi', 'unemployment'] },
  'USD/CHF': { currencies: ['USD', 'CHF'], countries: ['United States', 'Switzerland'], keywords: ['fed', 'fomc', 'snb', 'cpi', 'pce', 'interest rate', 'gdp', 'payroll'] },
  'AUD/USD': { currencies: ['AUD', 'USD'], countries: ['Australia', 'United States'], keywords: ['rba', 'fed', 'fomc', 'cpi', 'employment', 'payroll', 'interest rate', 'gdp'] },
  'USD/CAD': { currencies: ['USD', 'CAD'], countries: ['United States', 'Canada'], keywords: ['fed', 'fomc', 'boc', 'cpi', 'employment', 'payroll', 'interest rate', 'gdp', 'oil'] },
  'NZD/USD': { currencies: ['NZD', 'USD'], countries: ['New Zealand', 'United States'], keywords: ['rbnz', 'fed', 'fomc', 'cpi', 'employment', 'payroll', 'interest rate', 'gdp'] }
};

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
  const filter = ASSET_EVENT_FILTERS[request.asset] || ASSET_EVENT_FILTERS[request.assetLabel] || ASSET_EVENT_FILTERS.XAUUSD;
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
      message: data?.message || data?.error || 'Trading Economics calendar request failed. Check API key, plan, and rate limits.',
      asset: request.asset,
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
      message: data?.message || data?.error || 'FMP economic calendar request failed. Check API key, plan, and rate limits.',
      asset: request.asset,
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
      asset: request.asset,
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
    message: `Unsupported ECONOMIC_CALENDAR_PROVIDER: ${providerName()}. Use fmp or tradingeconomics.`,
    asset: request.asset,
    events: [],
    riskSummary: 'Latest news/calendar data could not be verified.',
    asOf: new Date().toISOString()
  };
}

module.exports = { getEconomicEvents, CALENDAR_MESSAGE, ASSET_EVENT_FILTERS };
