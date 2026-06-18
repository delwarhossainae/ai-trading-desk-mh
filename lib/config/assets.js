const SUPPORTED_TIMEFRAMES = ['Monthly', 'Weekly', 'Daily', 'H4', 'H1', 'M30', 'M15', 'M5'];

const ASSETS = {
  XAUUSD: { canonicalAsset: 'XAUUSD', label: 'XAUUSD / Gold', assetClass: 'Metals', marketDataSymbol: 'XAU/USD', eventCurrencies: ['USD'], eventCountries: ['United States'], eventKeywords: ['fed','fomc','cpi','pce','nfp','non farm','payroll','unemployment','jobless','interest rate','gdp','retail sales','pmi','ism'] },
  XAGUSD: { canonicalAsset: 'XAGUSD', label: 'XAGUSD / Silver', assetClass: 'Metals', marketDataSymbol: 'XAG/USD', eventCurrencies: ['USD'], eventCountries: ['United States'], eventKeywords: ['fed','fomc','cpi','pce','nfp','payroll','interest rate','gdp','pmi','ism'] },
  USOIL: { canonicalAsset: 'USOIL', label: 'US Oil', assetClass: 'Commodities', marketDataSymbol: 'WTI/USD', eventCurrencies: ['USD'], eventCountries: ['United States'], eventKeywords: ['crude','oil','inventories','eia','api','opec','fed','cpi','gdp'] },
  BTCUSD: { canonicalAsset: 'BTCUSD', label: 'BTC/USD', assetClass: 'Crypto', marketDataSymbol: 'BTC/USD', eventCurrencies: ['USD'], eventCountries: ['United States'], eventKeywords: ['fed','fomc','cpi','pce','payroll','unemployment','interest rate','gdp','retail sales','pmi','ism'] },
  EURUSD: { canonicalAsset: 'EURUSD', label: 'EUR/USD', assetClass: 'Forex', marketDataSymbol: 'EUR/USD', eventCurrencies: ['EUR','USD'], eventCountries: ['United States','Euro Area','Germany','France','Italy'], eventKeywords: ['ecb','fed','fomc','cpi','pmi','gdp','interest rate','payroll','unemployment'] },
  EURJPY: { canonicalAsset: 'EURJPY', label: 'EUR/JPY', assetClass: 'Forex', marketDataSymbol: 'EUR/JPY', eventCurrencies: ['EUR','JPY'], eventCountries: ['Euro Area','Germany','France','Japan'], eventKeywords: ['ecb','boj','cpi','pmi','gdp','interest rate','unemployment'] },
  EURGBP: { canonicalAsset: 'EURGBP', label: 'EUR/GBP', assetClass: 'Forex', marketDataSymbol: 'EUR/GBP', eventCurrencies: ['EUR','GBP'], eventCountries: ['Euro Area','Germany','France','United Kingdom'], eventKeywords: ['ecb','boe','cpi','pmi','gdp','interest rate','unemployment'] },
  USDJPY: { canonicalAsset: 'USDJPY', label: 'USD/JPY', assetClass: 'Forex', marketDataSymbol: 'USD/JPY', eventCurrencies: ['USD','JPY'], eventCountries: ['United States','Japan'], eventKeywords: ['fed','fomc','boj','cpi','pce','payroll','unemployment','interest rate','gdp'] },
  GBPUSD: { canonicalAsset: 'GBPUSD', label: 'GBP/USD', assetClass: 'Forex', marketDataSymbol: 'GBP/USD', eventCurrencies: ['GBP','USD'], eventCountries: ['United States','United Kingdom'], eventKeywords: ['boe','fed','fomc','cpi','pce','payroll','unemployment','interest rate','gdp','pmi'] },
  GBPJPY: { canonicalAsset: 'GBPJPY', label: 'GBP/JPY', assetClass: 'Forex', marketDataSymbol: 'GBP/JPY', eventCurrencies: ['GBP','JPY'], eventCountries: ['United Kingdom','Japan'], eventKeywords: ['boe','boj','cpi','interest rate','gdp','pmi','unemployment'] },
  USDCHF: { canonicalAsset: 'USDCHF', label: 'USD/CHF', assetClass: 'Forex', marketDataSymbol: 'USD/CHF', eventCurrencies: ['USD','CHF'], eventCountries: ['United States','Switzerland'], eventKeywords: ['fed','fomc','snb','cpi','pce','interest rate','gdp','payroll'] },
  AUDUSD: { canonicalAsset: 'AUDUSD', label: 'AUD/USD', assetClass: 'Forex', marketDataSymbol: 'AUD/USD', eventCurrencies: ['AUD','USD'], eventCountries: ['Australia','United States'], eventKeywords: ['rba','fed','fomc','cpi','employment','payroll','interest rate','gdp'] },
  USDCAD: { canonicalAsset: 'USDCAD', label: 'USD/CAD', assetClass: 'Forex', marketDataSymbol: 'USD/CAD', eventCurrencies: ['USD','CAD'], eventCountries: ['United States','Canada'], eventKeywords: ['fed','fomc','boc','cpi','employment','payroll','interest rate','gdp','oil'] },
  NZDUSD: { canonicalAsset: 'NZDUSD', label: 'NZD/USD', assetClass: 'Forex', marketDataSymbol: 'NZD/USD', eventCurrencies: ['NZD','USD'], eventCountries: ['New Zealand','United States'], eventKeywords: ['rbnz','fed','fomc','cpi','employment','payroll','interest rate','gdp'] }
};

const ALIASES = Object.fromEntries(Object.values(ASSETS).flatMap((a) => [[a.canonicalAsset, a.canonicalAsset], [a.label, a.canonicalAsset], [a.marketDataSymbol, a.canonicalAsset], [a.marketDataSymbol.replace('/', ''), a.canonicalAsset]]));
Object.assign(ALIASES, { 'BTC/USD': 'BTCUSD', 'US Oil': 'USOIL', 'XAUUSD / Gold': 'XAUUSD', Gold: 'XAUUSD' });

function normalizeAsset(value) { return ALIASES[String(value || '').trim()] || null; }
function getAssetConfig(value) { const key = normalizeAsset(value); return key ? ASSETS[key] : null; }
function assertValidAsset(value) { const config = getAssetConfig(value); if (!config) { const e = new Error('Invalid asset'); e.status = 400; throw e; } return config; }
const ALLOWED_ASSET_INPUTS = [...new Set([...Object.keys(ASSETS), ...Object.keys(ALIASES)])];

module.exports = { ASSETS, ALIASES, ALLOWED_ASSET_INPUTS, SUPPORTED_TIMEFRAMES, normalizeAsset, getAssetConfig, assertValidAsset };
