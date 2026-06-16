const PROVIDER_MESSAGE = 'Market data API is not configured. Add provider key in backend environment variables.';

function providerConfigured() {
  return Boolean(process.env.MARKET_DATA_API_KEY);
}

async function getMarketData(request = {}) {
  if (!providerConfigured()) {
    return {
      ok: false,
      configured: false,
      provider: 'not-configured',
      message: PROVIDER_MESSAGE,
      asset: request.asset,
      assetClass: request.assetClass,
      timeframe: request.timeframe,
      candles: [],
      lastPrice: null,
      asOf: new Date().toISOString()
    };
  }

  return {
    ok: false,
    configured: true,
    provider: 'provider-adapter-placeholder',
    message: 'Market data provider key is configured, but no concrete provider adapter has been connected yet.',
    asset: request.asset,
    assetClass: request.assetClass,
    timeframe: request.timeframe,
    candles: [],
    lastPrice: null,
    asOf: new Date().toISOString()
  };
}

module.exports = { getMarketData, PROVIDER_MESSAGE };
