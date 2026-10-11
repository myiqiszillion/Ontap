// External scheduler invokes a bounded sync. No cron is enabled by default.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  if (!require('../../engine/admin-auth.js').requireAdmin(req,res)) return;
  try {
    if (!req.body?.connectorId) return res.status(400).json({error:'Explicit connectorId required'});
    const result = await require('./admin.js').getSyncManager().syncConnector(req.body.connectorId, req.body);
    return res.status(200).json(result);
  } catch (e) { return res.status(503).json({error:e.message}); }
};
