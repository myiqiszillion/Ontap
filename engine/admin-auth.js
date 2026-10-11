const crypto = require('crypto');
function requireAdmin(req, res) {
  const expected = process.env.ADMIN_API_KEY;
  const supplied = req.headers && req.headers['x-admin-key'];
  if (!expected || !supplied || typeof supplied !== 'string' || Buffer.byteLength(expected) !== Buffer.byteLength(supplied) || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  req.adminActor = process.env.ADMIN_REVIEWER_ID || null;
  return true;
}
module.exports = { requireAdmin };
