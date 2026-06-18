const { getEconomicEvents } = require('../lib/providers/economicEventsProvider');
const { guardRequest, sanitizeCommonPayload } = require('../lib/security/requestGuards');

module.exports = async function handler(req, res) {
  if (await guardRequest(req, res, { rateLimitKey: 'economicEvents' })) return;
  try {
    const payload = sanitizeCommonPayload(req.body || {});
    const requestId = String(req.headers['x-vercel-id'] || req.headers['x-request-id'] || `econ_${Date.now().toString(36)}`).slice(0, 80);
    const data = await getEconomicEvents({ ...payload, requestId });
    return res.status(200).json(data);
  } catch (error) {
    const message = error.message === 'Invalid request.' ? 'Invalid request.' : 'Economic calendar provider request failed. Check backend configuration, provider plan, and limits.';
    return res.status(message === 'Invalid request.' ? 400 : 503).json({ ok: false, configured: false, verified: false, message });
  }
};
