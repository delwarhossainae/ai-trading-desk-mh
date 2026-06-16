const { getEconomicEvents } = require('../lib/providers/economicEventsProvider');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  try {
    const data = await getEconomicEvents(req.body || {});
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ ok: false, configured: false, message: 'Economic events request failed safely.' });
  }
};
