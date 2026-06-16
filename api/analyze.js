const { analyzeWithOpenAI } = require('../lib/ai/openaiAnalyzer');
const { guardRequest, sanitizeCommonPayload } = require('../lib/security/requestGuards');

module.exports = async function handler(req, res) {
  if (guardRequest(req, res)) return;
  try {
    const payload = sanitizeCommonPayload(req.body || {}, { extraKeys: ['marketData', 'economicEvents'] });
    const analysis = await analyzeWithOpenAI(payload);
    return res.status(200).json(analysis);
  } catch (error) {
    const message = error.message === 'Invalid request.' ? 'Invalid request.' : 'Analysis temporarily unavailable.';
    return res.status(message === 'Invalid request.' ? 400 : 503).json({ ok: false, message });
  }
};
