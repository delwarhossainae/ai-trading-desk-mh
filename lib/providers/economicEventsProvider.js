const CALENDAR_MESSAGE = 'Economic calendar API is not configured. Latest news/calendar data could not be verified.';

function providerConfigured() {
  return Boolean(process.env.ECONOMIC_CALENDAR_API_KEY);
}

async function getEconomicEvents(request = {}) {
  if (!providerConfigured()) {
    return {
      ok: false,
      configured: false,
      provider: 'not-configured',
      message: CALENDAR_MESSAGE,
      asset: request.asset,
      events: [],
      riskSummary: CALENDAR_MESSAGE,
      asOf: new Date().toISOString()
    };
  }

  return {
    ok: false,
    configured: true,
    provider: 'calendar-adapter-placeholder',
    message: 'Economic calendar provider key is configured, but no concrete provider adapter has been connected yet.',
    asset: request.asset,
    events: [],
    riskSummary: 'Calendar adapter placeholder. Verify latest news/calendar data before trading.',
    asOf: new Date().toISOString()
  };
}

module.exports = { getEconomicEvents, CALENDAR_MESSAGE };
