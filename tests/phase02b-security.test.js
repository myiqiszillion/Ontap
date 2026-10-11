const {test} = require('node:test');
const assert = require('node:assert/strict');
const Fetcher = require('../engine/ingestion/http-fetcher');
const Extractor = require('../engine/ingestion/question-extractor');
const Normalizer = require('../engine/ingestion/question-normalizer');
const Validator = require('../engine/ingestion/content-validator');
const Registry = require('../engine/ingestion/source-registry');
const fixture = require('./fixtures/source');
const Scoring = require('../engine/scoring');
function fetcher(response, options = {}) {
 const f = new Fetcher({timeoutMs:60000,allowedHosts:['fixture.example'],lookup:async()=>[{address:'8.8.8.8',family:4}],sleep:async()=>{},...options});
 f._makeSingleRequest=async()=> typeof response==='function'?response():response;return f;
}
test('SSRF: denied schemes, hosts, credentials, private DNS, IPv6 and redirect',async()=>{
 const f=fetcher({statusCode:200,headers:{'content-type':'application/json'},body:'[]'});
 for(const url of ['http://fixture.example','https://127.0.0.1','https://[::1]','https://user:secret@fixture.example','https://unknown.example','https://fixture.example:444']) await assert.rejects(()=>f.fetch(url),/SSRF/);
 const privateDns=fetcher({}, {lookup:async()=>[{address:'10.0.0.2',family:4}]});await assert.rejects(()=>privateDns.fetch('https://fixture.example'),/SSRF/);
 const redirect=fetcher({statusCode:302,headers:{location:'https://localhost/metadata'},body:''});await assert.rejects(()=>redirect.fetch('https://fixture.example'),/SSRF/);
 for(const address of ['::ffff:127.0.0.1','100.64.0.1','169.254.169.254','198.18.0.1'])assert.equal(f.isDisallowedHost(address),true);
});
test('HTTP content type, response size, ETag cache and secret-free logging',async()=>{
 await assert.rejects(()=>fetcher({statusCode:200,headers:{'content-type':'application/pdf'},body:'x'}).fetch('https://fixture.example'),/content type/);
 await assert.rejects(()=>fetcher({statusCode:200,headers:{'content-type':'application/json'},body:'12345'},{maxResponseSizeBytes:4}).fetch('https://fixture.example'),/size/);
 let n=0;const logs=[];const f=fetcher(()=>++n===1?{statusCode:200,headers:{'content-type':'application/json',etag:'one'},body:'[]'}:{statusCode:304,headers:{},body:''},{logger:v=>logs.push(v)});
 await f.fetch('https://fixture.example?token=secret');const cached=await f.fetch('https://fixture.example?token=secret');assert.equal(cached.body,'[]');assert.equal(cached.notModified,true);assert.equal(JSON.stringify(logs).includes('secret'),false);
});
test('HTTP 429 and 503 retry, timeout, terminal failure and DNS deadline',async()=>{
 let calls=0;const f=fetcher(()=>++calls<3?{statusCode:calls===1?429:503,headers:{},body:''}:{statusCode:200,headers:{'content-type':'application/json'},body:'[]'});
 assert.equal((await f.fetch('https://fixture.example')).statusCode,200);assert.equal(calls,3);
 await assert.rejects(()=>fetcher({statusCode:503,headers:{},body:''}).fetch('https://fixture.example'),/unavailable/);
 const timeout=fetcher({}, {maxRetries:0});timeout._makeSingleRequest=async()=>{throw new Error('Request timeout')};await assert.rejects(()=>timeout.fetch('https://fixture.example'),/timeout/);
 await assert.rejects(()=>fetcher({}, {timeoutMs:10,lookup:()=>new Promise(()=>{})}).fetch('https://fixture.example'),/DNS timeout/);
});
test('Extraction never manufactures missing answers or grade classification',()=>{
 const missing=Extractor.extract({...fixture.question,mcqPayload:{options:['A','B','C','D']}},fixture.source);assert.equal(missing.mcqPayload.correctOptionIndex,null);assert.equal(missing.needsReview,true);assert.equal(Validator.validate(Normalizer.normalize(missing,fixture.source)).valid,false);
 const tf=Extractor.extract({...fixture.question,format:'true_false_group',tfPayload:{statements:[{statement:'Claim'}]}},fixture.source);assert.equal(tf.tfPayload.statements[0].correct,null);
 assert.throws(()=>Normalizer.normalize({prompt:'Unclassified question'}),/grade/);
 assert.equal(Validator.validate({...fixture.question,subjectId:'unsupported'}).valid,false);
});
test('Corrupt LaTeX, unsupported images and malicious HTML rejected',()=>{
 for(const q of [{...fixture.question,prompt:'Broken $\\frac{1}{2 $'}, {...fixture.question,imageUri:'https://example.com/image.svg'}, {...fixture.question,mcqPayload:{options:['<img src=x onerror=alert(1)>','B','C','D'],correctOptionIndex:0}}, {...fixture.question,tfPayload:{passage:'<script>evil</script>'}}]) assert.equal(Validator.validate(q).valid,false);
});
test('Source compliance needs explicit permission evidence',()=>{
 Registry.registerSource({id:'no_evidence',license:'cc_by',status:'active',complianceCheck:true});assert.equal(Registry.isCompliant('no_evidence'),false);
});
test('Case-sensitive answer policy and unit metadata alone never loosen grading',()=>{
 const q={shortAnswerPayload:{correctAnswers:['ABC']},answerPolicy:{caseSensitive:true,normalizeSpaces:false}};assert.equal(Scoring.evaluateShortAnswer('abc',q).isCorrect,false);assert.equal(Scoring.evaluateShortAnswer(' ABC ',q).isCorrect,false);
 assert.equal(Scoring.evaluateShortAnswer('60 kg',{shortAnswerPayload:{correctAnswers:['60'],unit:'kg'}}).isCorrect,false);
 assert.equal(Scoring.scoreExam([fixture.question],{0:0},'toan',{isOfficialBlueprint:true}).isOfficialBlueprint,false);
});

test('API pagination and schema-change failure; HTML explicit contract and invalid HTML',async()=>{
 const API=require('../engine/ingestion/api-adapter');const HTML=require('../engine/ingestion/html-adapter');let requests=0;
 const api=new API({...fixture.source,pagination:{maxPages:2}}, {fetch:async url=>({statusCode:200,url,body:JSON.stringify({questions:[{...fixture.question,id:'page-'+(++requests)}],hasMore:requests<2})})});
 const data=await api.fetchData();assert.equal(data.rawData.length,2);assert.equal(data.metadata.pages,2);
 await assert.rejects(()=>api.extractQuestions({newSchema:[]}),/schema changed/);
 const html=new HTML(fixture.source,{});assert.equal((await html.extractQuestions('<script type="application/json" id="ntmk-questions">'+JSON.stringify([fixture.question])+'</script>')).length,1);
 await assert.rejects(()=>html.extractQuestions('<div>unstructured</div>'),/needs_review/);await assert.rejects(()=>html.extractQuestions('<script type="application/json" id="ntmk-questions">bad</script>'),/Invalid HTML/);
});
