const https = require('https');
const dns = require('dns').promises;
const net = require('net');
class HTTPFetcher {
 constructor(o={}) { this.allowedHosts=o.allowedHosts||[];this.defaultTimeoutMs=o.timeoutMs||10000;this.maxRetries=o.maxRetries??2;this.retryBaseDelayMs=o.retryBaseDelayMs??500;this.maxResponseSizeBytes=o.maxResponseSizeBytes||2097152;this.maxRedirects=o.maxRedirects??2;this.lookup=o.lookup||dns.lookup;this.sleep=o.sleep||(ms=>new Promise(r=>setTimeout(r,ms)));this.logger=o.logger||(()=>{});this.cache=new Map();this.nextRequest=new Map(); }
 isDisallowedHost(host) { host=host.replace(/^\[|\]$/g,'').toLowerCase(); if(net.isIP(host)===6)return true; if(net.isIP(host)!==4)return host==='localhost'||!host.includes('.')||host.endsWith('.internal');const[a,b]=host.split('.').map(Number);return a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&[0,168].includes(b))||(a===198&&[18,19,51].includes(b))||(a===203&&b===0); }
 sanitizeUrlForLog(v){const u=new URL(v);u.username='';u.password='';u.search='';u.hash='';return u.toString();}
 async fetch(value,o={}) {
  let u=new URL(value);const original=u.hostname;const deadline=Date.now()+(o.timeoutMs||this.defaultTimeoutMs);
  for(let redirects=0;redirects<=this.maxRedirects;redirects++){
   if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||!this.allowedHosts.includes(u.hostname)||this.isDisallowedHost(u.hostname))throw new Error('SSRF: URL not allowed');
   if(u.hostname!==original&&o.headers?.Authorization)throw new Error('Cross-host credentials redirect blocked');
   const addresses=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('DNS timeout')),Math.max(1,deadline-Date.now()));Promise.resolve(this.lookup(u.hostname,{all:true})).then(resolve,reject).finally(()=>clearTimeout(timer));});if(!addresses.length||addresses.some(a=>this.isDisallowedHost(a.address)))throw new Error('SSRF: private DNS resolution');
   const address=addresses.find(a=>a.family===4);if(!address)throw new Error('No permitted IPv4 address');
   const cached=this.cache.get(u.href);const headers={Accept:o.accept||'application/json','User-Agent':'NTMK-Ingest/2.0',...o.headers};if(cached?.etag)headers['If-None-Match']=cached.etag;if(cached?.lastModified)headers['If-Modified-Since']=cached.lastModified;
   let result;
   for(let attempt=0;attempt<=this.maxRetries;attempt++){
    const interval=60000/Math.max(1,Math.min(o.rateLimitPerMin||6,60));const now=Date.now();const slot=Math.max(now,this.nextRequest.get(u.hostname)||0);this.nextRequest.set(u.hostname,slot+interval);if(slot>deadline)throw new Error('Rate limit exceeds request deadline');if(slot>now)await this.sleep(slot-now);
    try{
     if(Date.now()>=deadline)throw new Error('Request timeout');result=await this._makeSingleRequest(u,headers,{...o,address,timeoutMs:deadline-Date.now()});this.logger({event:'source_fetch',url:this.sanitizeUrlForLog(u.href),status:result.statusCode,attempt});
     if(![429,500,502,503,504].includes(result.statusCode))break;if(attempt===this.maxRetries)throw new Error('Source unavailable: HTTP '+result.statusCode);
     const retry=Number(result.headers['retry-after']);const delay=Number.isFinite(retry)&&retry>0?retry*1000:this.retryBaseDelayMs*2**attempt;if(Date.now()+delay>=deadline)throw new Error('Retry exceeds request deadline');await this.sleep(delay);
    }catch(e){if(attempt===this.maxRetries||/SSRF|size|content|deadline/.test(e.message))throw e;const delay=this.retryBaseDelayMs*2**attempt;if(Date.now()+delay>=deadline)throw new Error('Retry exceeds request deadline');await this.sleep(delay);}
   }
   if([301,302,303,307,308].includes(result.statusCode)){if(!result.headers.location||redirects===this.maxRedirects)throw new Error('Redirect limit');u=new URL(result.headers.location,u);continue;}
   if(result.statusCode===304){if(!cached)throw new Error('304 without cached content');return{...result,body:cached.body,url:u.href,notModified:true};}
   if(result.statusCode!==200)throw new Error('Source HTTP '+result.statusCode);const type=(result.headers['content-type']||'').split(';')[0];if(!(o.contentTypes||['application/json','text/html','application/xhtml+xml']).includes(type))throw new Error('Invalid content type');if(Buffer.byteLength(result.body)>this.maxResponseSizeBytes)throw new Error('Response size exceeded');
   if(this.cache.size>=32)this.cache.delete(this.cache.keys().next().value);this.cache.set(u.href,{body:result.body,etag:result.headers.etag,lastModified:result.headers['last-modified']});return{...result,url:u.href,notModified:false};
  }
 }
 _makeSingleRequest(u,headers,o){return new Promise((resolve,reject)=>{const req=https.request(u,{method:o.method||'GET',headers,lookup:(_host,opts,cb)=>cb(null,opts.all?[{address:o.address.address,family:4}]:o.address.address,4)},res=>{const chunks=[];let bytes=0;res.on('data',chunk=>{bytes+=chunk.length;if(bytes>this.maxResponseSizeBytes)req.destroy(new Error('Response size exceeded'));else chunks.push(chunk);});res.on('error',reject);res.on('aborted',()=>reject(new Error('Response aborted')));res.on('end',()=>resolve({statusCode:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8')}));});const timer=setTimeout(()=>req.destroy(new Error('Request timeout')),o.timeoutMs);req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();});}
}
module.exports=HTTPFetcher;
