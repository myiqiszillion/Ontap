/**
 * Question Bank API V2 (Serverless Handler & Express Integration)
 * NTMK Rebuild Phase 02
 */

const QuestionValidator = require('../../engine/validator.js');
const BlueprintGenerator = require('../../engine/blueprint-generator.js');
const SourceRegistry = require('../../engine/ingestion/source-registry.js');
const QuestionSchemaV2 = require('../../engine/schema.js');

module.exports = (req, res) => {
 try {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query || {};
  const getManager = () => require('./admin.js').getSyncManager();
  const ExamService = require('../../engine/exam-service.js');
  if (req.method === 'POST' && query.action === 'start') {
    try {
      const examService = new ExamService(getManager().bankStorage);
      return res.status(201).json(examService.start(req.body?.subjectId, Number(req.body?.grade)));
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
  if (req.method === 'POST' && query.action === 'submit') {
    const examService = new ExamService(getManager().bankStorage);
    return Promise.resolve(examService.submitAsync ? examService.submitAsync(req.body || {}) : examService.submit(req.body || {}))
      .then(result => res.status(200).json(result))
      .catch(err => res.status(400).json({ error: err.message }));
  }
  const urlPath = req.url ? req.url.split('?')[0] : '';

  // 1. Blueprint endpoint
  if (urlPath.includes('/blueprint') || query.action === 'blueprint') {
    const subject = query.subject || 'toan';
    const bp = BlueprintGenerator.getBlueprint(subject);
    if (!bp) {
      return res.status(404).json({ error: `Blueprint for subject ${subject} not found` });
    }
    return res.status(200).json(bp);
  }

  // 2. Sources registry endpoint
  if (urlPath.includes('/sources') || query.action === 'sources') {
    const sources = SourceRegistry.getAllSources().map(s=>({id:s.id,name:s.name,license:s.license,status:s.status,allowedGrades:s.allowedGrades,complianceCheck:SourceRegistry.isCompliant(s.id)}));
    return res.status(200).json({ total: sources.length, sources });
  }

  // 3. Question Validation endpoint (POST)
  if (req.method === 'POST' && (urlPath.includes('/validate') || query.action === 'validate')) {
    const candidate = req.body;
    const result = QuestionValidator.validate(candidate);
    return res.status(result.valid ? 200 : 422).json(result);
  }

  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed'});
  const sm = getManager();

  // 5. Single Question by ID
  if (query.id) {
    const found = sm.bankStorage.getById(query.id);
    if (found && found.status === 'published' && found.source?.verificationStatus === 'verified' && found.source.permissionApproved && found.source.licenseEvidence && found.source.verificationEvidence) return res.status(200).json(QuestionSchemaV2.sanitizeForStudent(found));
    return res.status(404).json({ error: `Question ${query.id} not found` });
  }

  // 6. Query Questions Catalog
  const targetSubject = query.subject || 'toan10';
  let allQuestions = sm.bankStorage.query({subjectId: targetSubject.replace(/\d+$/, ''), grade: Number(targetSubject.match(/\d+$/)?.[0] || query.grade || 10), status:'published', verificationStatus:'verified', limit:100000}).questions.filter(q=>q.source.permissionApproved && q.source.licenseEvidence && q.source.verificationEvidence);

  // If query format is specified
  if (query.format) {
    allQuestions = allQuestions.filter(q => q.format === query.format);
  }

  // If cognitive level is specified
  if (query.cognitiveLevel) {
    allQuestions = allQuestions.filter(q => q.cognitiveLevel === query.cognitiveLevel);
  }

  // Search text filter
  if (query.search) {
    const sTerm = query.search.toLowerCase();
    allQuestions = allQuestions.filter(q => q.prompt.toLowerCase().includes(sTerm));
  }

  const total = allQuestions.length;
  const limit = Math.max(1, Math.min(parseInt(query.limit) || 20, 100));
  const offset = Math.max(0, parseInt(query.offset) || 0);
  let paginated = allQuestions.slice(offset, offset + limit);

  // Sanitize answer keys for exam mode or student taking
  const shouldSanitizeCatalog = true;
  if (shouldSanitizeCatalog) {
    paginated = paginated.map(q => QuestionSchemaV2.sanitizeForStudent(q));
  }

  return res.status(200).json({
    total,
    offset,
    limit,
    subject: targetSubject,
    sanitized: shouldSanitizeCatalog,
    questions: paginated
  });
 } catch (err) { return res.status(process.env.VERCEL ? 503 : 400).json({error: err.message}); }
};
