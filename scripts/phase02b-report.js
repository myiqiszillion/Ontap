const fs = require('fs');
const path = require('path');
const Bank = require('../engine/storage/bank-storage');
const Loader = require('../engine/bank-loader');
const bank = new Bank();
const coverage = bank.getCoverageMatrix();
const rows = [];
for (const [subject, grades] of Object.entries(coverage)) for (const [grade, row] of Object.entries(grades)) {
 const bundled = Loader.loadNormalizedQuestions(subject+grade);
 rows.push({...row,bundledUnverifiedCount:bundled.length,bundledMCQ:bundled.filter(q=>q.format==='multiple_choice').length,bundledTF:bundled.filter(q=>q.format==='true_false_group').length,bundledSA:bundled.filter(q=>q.format==='short_answer').length});
}
const out = path.join(__dirname,'../docs/rebuild/evidence');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'coverage.json'),JSON.stringify({generatedAt:new Date().toISOString(),fixtureDataExcluded:true,rows},null,2));
console.log(rows.map(r=>`${r.comboKey}: bundled=${r.bundledUnverifiedCount}, verified=${r.totalVerified}, published=${r.totalPublished}, examReady=${r.isOfficialBlueprintReady}`).join('\n'));
