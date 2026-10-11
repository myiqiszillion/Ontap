// Fetch metadata/robots for source research only. Never imports questions or bypasses access controls.
const fs = require('fs');
const path = require('path');
const HTTPFetcher = require('../engine/ingestion/http-fetcher');
const targets = [
 'https://openstax.org/robots.txt',
 'https://help.openstax.org/s/article/Licensing-information-of-OpenStax-textbooks',
 'https://vqa.moet.gov.vn/robots.txt',
 'https://vqa.moet.gov.vn/vi/news/tin-tuc-su-kien/de-thi-tham-khao-ky-thi-tot-nghiep-thpt-tu-nam-2025-159.html',
 'https://www.khanacademy.org/robots.txt',
 'https://www.ck12.org/robots.txt',
 'https://vietjack.com/robots.txt',
 'https://loigiaihay.com/robots.txt'
];
(async()=>{
 const fetcher = new HTTPFetcher({allowedHosts:[...new Set(targets.map(u=>new URL(u).hostname))],maxRetries:0,timeoutMs:12000});
 const evidence = [];
 for (const url of targets) {
  const entry = {url,checkedAt:new Date().toISOString(),purpose:'metadata research; not ingestion',receivedItems:0,extractedQuestions:0,publishedQuestions:0};
  try {
   const response = await fetcher.fetch(url,{accept:'text/plain,text/html',contentTypes:['text/plain','text/html'],rateLimitPerMin:6});
   Object.assign(entry,{httpStatus:response.statusCode,contentType:response.headers['content-type'],bytes:Buffer.byteLength(response.body)});
   if (url.endsWith('/robots.txt') && response.headers['content-type']?.startsWith('text/plain')) entry.robots = response.body.slice(0,16000);
   else if (url.endsWith('/robots.txt')) entry.accessStatus='BLOCKED: unexpected HTML at robots URL; no bypass';
  }catch(error){entry.error=error.message;const status=error.message.match(/HTTP (\d+)/);if(status)entry.httpStatus=Number(status[1]);}
  evidence.push(entry);
 }
 const file=path.join(__dirname,'../docs/rebuild/evidence/source-access.json');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence.map(({robots,...entry})=>entry),null,2));
})();
