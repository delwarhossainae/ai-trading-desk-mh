const { getEconomicEvents } = require('../lib/providers/economicEventsProvider');
const { guardRequest, sanitizeCommonPayload } = require('../lib/security/requestGuards');

module.exports = async function handler(req, res) {
  if (guardRequest(req, res)) return;
  try {
    const payload = sanitizeCommonPayload(req.body || {});
    const data = await getEconomicEvents(payload);
    return res.status(200).json(data);
  } catch (error) {
    const message = error.message === 'Invalid request.' ? 'Invalid request.' : 'Analysis temporarily unavailable.';
    return res.status(message === 'Invalid request.' ? 400 : 503).json({ ok: false, configured: false, message });
  }
};
