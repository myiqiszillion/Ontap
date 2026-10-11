const SourceConnector = require('../source-connector.js');
module.exports = class extends SourceConnector {
 constructor(config={},fetcher=null){ super({id:'oer_openstax_science',name:'oer_openstax_science',enabled:false,...config},fetcher); }
 async connect(){ throw new Error('BLOCKED: permission and live extraction contract not approved'); }
 async fetchData(){ throw new Error('BLOCKED: no live integration'); }
};
