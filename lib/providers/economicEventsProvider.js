const CALENDAR_MESSAGE = 'Economic calendar API is not configured. Add ECONOMIC_CALENDAR_PROVIDER=tradingeconomics and ECONOMIC_CALENDAR_API_KEY in backend environment variables.';

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

function providerName() {
  return String(process.env.ECONOMIC_CALENDAR_PROVIDER || '').trim().toLowerCase();
}

function providerConfigured() {
  return providerName() === 'tradingeconomics' && Boolean(process.env.ECONOMIC_CALENDAR_API_KEY);
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

function eventText(event = {}) {
  return [event.Event, event.Category, event.Country, event.Currency, event.Source].filter(Boolean).join(' ').toLowerCase();
}

function importanceNumber(event = {}) {
  const raw = Number(event.Importance ?? event.importance ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

function filterEvents(events = [], request = {}) {
  const filter = ASSET_EVENT_FILTERS[request.asset] || ASSET_EVENT_FILTERS[request.assetLabel] || ASSET_EVENT_FILTERS.XAUUSD;
  return events
    .filter((event) => {
      const text = eventText(event);
      const currency = String(event.Currency || '').toUpperCase();
      const country = String(event.Country || '');
      const byCurrency = filter.currencies.some((item) => currency.includes(item));
      const byCountry = filter.countries.some((item) => country.toLowerCase() === item.toLowerCase());
      const byKeyword = filter.keywords.some((keyword) => text.includes(keyword));
      return importanceNumber(event) >= 2 || byCurrency || byCountry || byKeyword;
    })
    .sort((a, b) => new Date(a.Date || a.date || 0) - new Date(b.Date || b.date || 0))
    .slice(0, 25);
}

function normalizeEvent(event = {}) {
  return {
    date: event.Date || event.date || '',
    country: event.Country || '',
    currency: event.Currency || '',
    event: event.Event || event.Category || '',
    category: event.Category || '',
    importance: importanceNumber(event),
    actual: event.Actual ?? '',
    previous: event.Previous ?? '',
    forecast: event.Forecast ?? '',
    source: event.Source || '',
    url: event.URL || ''
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
  const key = process.env.ECONOMIC_CALENDAR_API_KEY;
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

  if (providerName() === 'tradingeconomics') return fetchTradingEconomics(request);

  return {
    ok: false,
    configured: false,
    provider: providerName(),
    message: `Unsupported ECONOMIC_CALENDAR_PROVIDER: ${providerName()}. Use tradingeconomics.`,
    asset: request.asset,
    events: [],
    riskSummary: 'Latest news/calendar data could not be verified.',
    asOf: new Date().toISOString()
  };
}

module.exports = { getEconomicEvents, CALENDAR_MESSAGE, ASSET_EVENT_FILTERS };