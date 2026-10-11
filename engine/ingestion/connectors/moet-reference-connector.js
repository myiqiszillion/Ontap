const SourceConnector = require('../source-connector.js');
module.exports = class extends SourceConnector {
 constructor(config={},fetcher=null){ super({id:'moet_official_sample_2025',name:'moet_official_sample_2025',enabled:false,...config},fetcher); }
 async connect(){ throw new Error('BLOCKED: permission and live extraction contract not approved'); }
 async fetchData(){ throw new Error('BLOCKED: no live integration'); }
};
