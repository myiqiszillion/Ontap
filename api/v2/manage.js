module.exports = async (req,res) => {
  const {adminHandlers} = require('./admin.js');
  const actions = {status:['GET','status'],history:['GET','syncHistory'],review:['GET','reviewList'],coverage:['GET','coverage'],bank:['GET','bankQuery'],verify:['POST','verifyQuestion'],reject:['POST','rejectQuestion'],publish:['POST','publishQuestion']};
  const action = actions[req.query?.action];
  if (!action || req.method !== action[0]) return res.status(405).json({error:'Method not allowed'});
  req.params = {id: req.query.id};
  try { return await adminHandlers[action[1]](req,res); }
  catch(e) { return res.status(503).json({error:e.message}); }
};
