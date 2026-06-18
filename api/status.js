const { providerStatuses } = require('../lib/ai/providerRouter');
const { applyCors } = require('../lib/security/requestGuards');
const { getMarketDataStatus } = require('../lib/providers/marketDataProvider');
const { getEconomicCalendarStatus } = require('../lib/providers/economicEventsProvider');

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ success: false, ok: false, message: 'Invalid request method.' });
  const statuses = providerStatuses();
  return res.status(200).json({
    openai: statuses.openai?.configured === true,
    anthropic: statuses.anthropic?.configured === true,
    xai: statuses.xai?.configured === true,
    gemini: statuses.gemini?.configured === true,
    microsoft: statuses.microsoft?.configured === true,
    marketData: getMarketDataStatus().configured === true,
    economicCalendar: getEconomicCalendarStatus().configured === true
  });
};
