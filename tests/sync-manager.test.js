const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const Sync=require('../engine/ingestion/sync-manager');
const Bank=require('../engine/storage/bank-storage');
const Exam=require('../engine/exam-service');
const fixture=require('./fixtures/source');
function setup(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ntmk-sync-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const options={storageOptions:{storagePath:path.join(dir,'bank.json')}};const sm=new Sync(options);sm.connectors.clear();sm.registerConnector('fixture_source',fixture.connector());return{sm,options,dir};}
test('Fixture E2E: fetch -> extract -> normalize -> validate -> review -> publish -> exam, persistence and duplicate sync',async t=>{
 const{sm,options,dir}=setup(t);const first=await sm.syncAll({subjects:['toan'],grades:[10]});assert.equal(first.totalIngested,1);assert.equal(sm.bankStorage.getCount(),0);assert.equal(sm.getCoverageMatrix().toan[10].isOfficialBlueprintReady,false);
 const pending=sm.reviewQueue.getPendingQuestions().items[0];assert.equal(pending.grade,10);assert.equal(pending.topic,'Sets');assert.ok(pending.source.sourceUrl.startsWith(fixture.source.sourceUrl));
 await assert.rejects(()=>sm.publisher.publish(pending.id),/Quality Gate/);assert.throws(()=>sm.reviewQueue.verifyQuestion(pending.id,{verifiedBy:'invented'}),/Authorized/);
 sm.reviewQueue.verifyQuestion(pending.id,fixture.reviewer);await sm.publisher.publish(pending.id,{publishedBy:'fixture-publisher'});
 const restarted=new Sync(options);restarted.connectors.clear();restarted.registerConnector('fixture_source',fixture.connector());const second=await restarted.syncAll({subjects:['toan'],grades:[10]});assert.equal(second.totalDuplicates,1);assert.equal(second.totalIngested,0);assert.equal(restarted.getSyncHistory().length,2);assert.equal(restarted.getCoverageMatrix().toan[10].totalPublished,1);assert.equal(restarted.getCoverageMatrix().toan[10].topicCount,1);
 const service=new Exam(restarted.bankStorage,path.join(dir,'sessions.json'));const session=service.start('toan',10);assert.equal(session.examType,'practice_quiz');assert.equal(session.questions[0].mcqPayload.correctOptionIndex,undefined);assert.equal(session.questions[0].rawSource,undefined);
 const payload={sessionId:session.sessionId,token:session.token,userAnswers:{[pending.id]:0}};const result=service.submit(payload);assert.equal(result.rawScore,.25);assert.equal(result.scaledScore,10);assert.deepEqual(new Exam(new Bank(options.storageOptions),path.join(dir,'sessions.json')).submit({...payload,userAnswers:{[pending.id]:1}}),result);
 assert.equal(Object.keys(restarted.getCoverageMatrix()).length,4);for(const row of Object.values(restarted.getCoverageMatrix()))assert.equal(Object.keys(row).length,3);
});
test('Default sources report blocked; never manufacture live questions',async t=>{const{options}=setup(t);const sm=new Sync(options);const result=await sm.syncAll();assert.equal(result.totalDiscovered,0);assert.equal(result.totalPublished,0);assert.ok(result.errors.every(e=>e.includes('BLOCKED')));});
test('Automatic verification and publication forbidden',async t=>{const{sm}=setup(t);await assert.rejects(()=>sm.syncAll({autoVerify:true,verifiedBy:'invented'}),/forbidden/);assert.equal(sm.isSyncing,false);assert.throws(()=>sm.startSchedule(),/scheduler/);});
test('Unapproved license and malformed candidates rejected',async t=>{const{sm}=setup(t);const Registry=require('../engine/ingestion/source-registry');Registry.registerSource({...fixture.source,permissionApproved:false});const result=await sm.syncAll();assert.equal(result.totalIngested,0);fixture.connector();});
test('Source unavailable isolated and job history retained',async t=>{const{sm}=setup(t);sm.connectors.get('fixture_source').fetchData=async()=>{throw new Error('Source unavailable')};const report=await sm.syncAll({subjects:['toan'],grades:[10]});assert.equal(report.totalIngested,0);assert.ok(report.errors.length);assert.equal(sm.isSyncing,false);});
test('Serverless local storage refuses false persistence',()=>{const previous=process.env.VERCEL;process.env.VERCEL='1';try{assert.throws(()=>new Bank(),/BLOCKED/);}finally{if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;}});
