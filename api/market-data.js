const { getMarketData } = require('../lib/providers/marketDataProvider');
const { guardRequest, sanitizeCommonPayload } = require('../lib/security/requestGuards');

module.exports = async function handler(req, res) {
  if (await guardRequest(req, res, { rateLimitKey: 'marketData' })) return;
  try {
    const payload = sanitizeCommonPayload(req.body || {});
    const data = await getMarketData(payload);
    return res.status(200).json(data);
  } catch (error) {
    const message = error.message === 'Invalid request.' ? 'Invalid request.' : 'Market data provider request failed. Check backend configuration, provider plan, and limits.';
    return res.status(message === 'Invalid request.' ? 400 : 503).json({ ok: false, configured: false, message });
  }
};
