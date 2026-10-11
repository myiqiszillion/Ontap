// Synthetic test data only. No provider attribution or real reviewer identity.
const Registry = require('../../engine/ingestion/source-registry.js');
const APIAdapter = require('../../engine/ingestion/api-adapter.js');
const question = {id:'fixture-math10-1',subjectId:'toan',grade:10,topic:'Sets',chapter:'Sets',format:'multiple_choice',prompt:'Which set contains exactly two elements?',mcqPayload:{options:['{1,2}','{1}','{}','{1,2,3}'],correctOptionIndex:0},explanation:'The first set has two distinct elements.'};
const source = {id:'fixture_source',name:'Synthetic fixture',status:'active',enabled:true,license:'internal',permissionApproved:true,licenseEvidence:'TEST ONLY: synthetic fixture created for deterministic tests',complianceCheck:true,sourceUrl:'https://fixture.example/questions',endpointUrl:'https://fixture.example/questions',subjectId:'toan',grade:10};
function connector(items = [question]) {
 Registry.registerSource(source);
 const fetcher = {fetch:async url=>({statusCode:200,headers:{'content-type':'application/json'},body:JSON.stringify(items),url})};
 return new APIAdapter(source,fetcher);
}
const reviewer = {verifiedBy:'fixture-reviewer',authorized:true,evidence:'TEST ONLY: two distinct elements, grade/topic mapping checked',notes:'Synthetic acceptance test'};
module.exports = {question,source,connector,reviewer};
