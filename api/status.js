const { providerStatuses } = require('../lib/ai/providerRouter');
const { applyCors } = require('../lib/security/requestGuards');

module.exports = async function handler(req, res) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, ok: false, message: 'Invalid request method.' });
  }

  return res.status(200).json({
    success: true,
    ok: true,
    statuses: providerStatuses(),
    timestamp: new Date().toISOString()
  });
};