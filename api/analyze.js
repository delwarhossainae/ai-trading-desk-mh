const { providers, providerStatuses, reviewWithProvider } = require('../lib/ai/providerRouter');
const { guardRequest, sanitizeCommonPayload } = require('../lib/security/requestGuards');

module.exports = async function handler(req, res) {
  if (guardRequest(req, res)) return;
  try {
    const payload = sanitizeCommonPayload(req.body || {}, { extraKeys: ['marketData', 'economicEvents', 'economicRisk', 'primaryProvider', 'reviewProvider'] });
    const primaryProvider = payload.primaryProvider || 'openai';
    const reviewProvider = payload.reviewProvider || 'none';
    if (!providers[primaryProvider] || (reviewProvider !== 'none' && !providers[reviewProvider])) throw new Error('Invalid request.');

    const analysis = await providers[primaryProvider](payload);
    let review = null;
    if (reviewProvider !== 'none') {
      try {
        review = await reviewWithProvider(reviewProvider, { ...analysis, ...payload });
      } catch (error) {
        if (error.code === 'PROVIDER_NOT_CONFIGURED') {
          review = { ok: false, configured: false, providerUsed: reviewProvider, message: 'Primary analysis completed. Review provider is not configured.' };
        } else {
          review = { ok: false, configured: true, providerUsed: reviewProvider, message: 'Primary analysis completed. Review temporarily unavailable.' };
        }
      }
    }
    return res.status(200).json({ ok: true, analysis, review, providerStatuses: providerStatuses() });
  } catch (error) {
    const statuses = providerStatuses();
    const message = error.message === 'Invalid request.' ? 'Invalid request.' : (error.code === 'PROVIDER_NOT_CONFIGURED' ? error.message : 'Analysis temporarily unavailable.');
    return res.status(message === 'Invalid request.' ? 400 : 503).json({ ok: false, message, providerStatuses: statuses });
  }
};
