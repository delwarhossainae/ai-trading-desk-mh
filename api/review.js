const { guardRequest } = require('../lib/security/requestGuards');

module.exports = async function handler(req, res) {
  if (await guardRequest(req, res, { rateLimitKey: 'review' })) return;
  return res.status(410).json({ ok: false, message: 'Standalone review endpoint is disabled. Use /api/analyze with reviewProvider.' });
};
