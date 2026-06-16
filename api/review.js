const { reviewWithAnthropic } = require('../lib/ai/anthropicReviewer');
const { guardRequest, MAX_BODY_BYTES } = require('../lib/security/requestGuards');

module.exports = async function handler(req, res) {
  if (guardRequest(req, res)) return;
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).some((key) => key !== 'analysis') || Buffer.byteLength(JSON.stringify(req.body), 'utf8') > MAX_BODY_BYTES) {
      return res.status(400).json({ ok: false, message: 'Invalid request.' });
    }
    const review = await reviewWithAnthropic(req.body.analysis || {});
    return res.status(200).json(review);
  } catch (error) {
    return res.status(503).json({ ok: false, message: 'Analysis temporarily unavailable.' });
  }
};
