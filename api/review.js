const { reviewWithAnthropic } = require('../lib/ai/anthropicReviewer');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  try {
    const review = await reviewWithAnthropic(req.body?.analysis || {});
    return res.status(200).json(review);
  } catch (error) {
    return res.status(500).json({ ok: false, message: 'Claude review failed safely.' });
  }
};
