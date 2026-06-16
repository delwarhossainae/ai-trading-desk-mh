const { analyzeWithOpenAI } = require('../lib/ai/openaiAnalyzer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  try {
    const analysis = await analyzeWithOpenAI(req.body || {});
    return res.status(200).json(analysis);
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'AI analysis failed safely. Check backend environment variables and provider configuration.' });
  }
};
