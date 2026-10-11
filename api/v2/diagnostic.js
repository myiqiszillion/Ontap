/**
 * Diagnostic Assessment API Router (V2)
 * NTMK Rebuild Phase 03A — Task 9
 *
 * Endpoints:
 * - GET  /api/v2/diagnostic/skills          (Curriculum skills list & hierarchy)
 * - GET  /api/v2/diagnostic/readiness       (Check bank question coverage & readiness)
 * - POST /api/v2/diagnostic/start           (Start diagnostic session)
 * - POST /api/v2/diagnostic/save-answers    (Auto-save answers in progress)
 * - POST /api/v2/diagnostic/resume          (Resume session with remaining time)
 * - POST /api/v2/diagnostic/submit          (Submit & server-side scoring)
 * - GET  /api/v2/diagnostic/mastery         (Get student skill mastery profile)
 * - GET  /api/v2/diagnostic/gaps            (Get knowledge gap analysis report)
 *
 * Security & Integrity:
 * - Answer keys and explanations stripped in start / resume.
 * - Idempotent submission: re-submitting returns authoritative result.
 * - Session ownership: token validation protects session data from other students.
 * - Safe error handling: no stack traces or secrets leaked.
 */

const DiagnosticAssessmentEngine = require('../../engine/diagnostic/diagnostic-assessment-engine.js');
const BankStorage = require('../../engine/storage/bank-storage.js');
const CloudStorageAdapter = require('../../engine/storage/cloud-storage-adapter.js');

let engineInstance = null;

function getDiagnosticEngine() {
  if (!engineInstance) {
    let adapter = null;
    try {
      adapter = new CloudStorageAdapter();
    } catch (e) {
      // Offline / Local development fallback
    }
    const bank = new BankStorage({ storageAdapter: adapter });
    engineInstance = new DiagnosticAssessmentEngine({ bankStorage: bank, storageAdapter: adapter });
  }
  return engineInstance;
}

module.exports = async function diagnosticHandler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Diagnostic-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const engine = getDiagnosticEngine();
  const urlPath = req.url ? req.url.split('?')[0] : '';
  const query = req.query || {};
  const action = query.action || (urlPath.split('/').pop());

  try {
    // 1. GET Skills Catalog & Graph
    if (req.method === 'GET' && (action === 'skills' || urlPath.includes('/skills'))) {
      const skills = engine.curriculumRepo.querySkills({
        subjectId: query.subjectId || query.subject,
        grade: query.grade ? Number(query.grade) : undefined
      });
      return res.status(200).json({
        total: skills.length,
        subjectId: query.subjectId || 'all',
        skills
      });
    }

    // 2. GET Readiness Check
    if (req.method === 'GET' && (action === 'readiness' || urlPath.includes('/readiness'))) {
      const readiness = engine.checkReadiness({
        subjectId: query.subjectId || query.subject || 'toan',
        grade: Number(query.grade) || 10,
        assessmentType: query.assessmentType || 'grade_diagnostic',
        targetQuestionCount: query.count ? Number(query.count) : 20,
        allowFixtureFallback: Boolean(query.allowFixtures || process.env.NODE_ENV === 'test')
      });
      return res.status(200).json(readiness);
    }

    // 3. POST Start Diagnostic Session
    if (req.method === 'POST' && (action === 'start' || urlPath.includes('/start'))) {
      const body = req.body || {};
      const session = engine.startAssessment({
        subjectId: body.subjectId || 'toan',
        grade: Number(body.grade) || 10,
        assessmentType: body.assessmentType || 'grade_diagnostic',
        target: body.target || 'full_year',
        studentId: body.studentId || req.headers['x-student-id'] || 'guest_student',
        initialRating: body.initialRating || null,
        targetQuestionCount: body.count ? Number(body.count) : 20,
        allowFixtureFallback: Boolean(body.allowFixtures || process.env.NODE_ENV === 'test')
      });
      return res.status(201).json(session);
    }

    // 4. POST Save Answers (Auto-save)
    if (req.method === 'POST' && (action === 'save-answers' || urlPath.includes('/save-answers'))) {
      const body = req.body || {};
      const token = body.token || req.headers['x-diagnostic-token'];
      const saveRes = engine.saveAnswers({
        sessionId: body.sessionId,
        token,
        answers: body.answers || {},
        currentQuestionIndex: body.currentQuestionIndex
      });
      return res.status(200).json(saveRes);
    }

    // 5. POST / GET Resume Session
    if ((req.method === 'POST' || req.method === 'GET') && (action === 'resume' || urlPath.includes('/resume'))) {
      const sessionId = req.body?.sessionId || query.sessionId;
      const token = req.body?.token || query.token || req.headers['x-diagnostic-token'];
      if (!sessionId || !token) {
        return res.status(400).json({ error: 'sessionId and token required' });
      }
      const resumed = engine.resumeAssessment({ sessionId, token });
      return res.status(200).json(resumed);
    }

    // 6. POST Submit Diagnostic Session
    if (req.method === 'POST' && (action === 'submit' || urlPath.includes('/submit'))) {
      const body = req.body || {};
      const token = body.token || req.headers['x-diagnostic-token'];
      if (!body.sessionId || !token) {
        return res.status(400).json({ error: 'sessionId and token required' });
      }
      const report = engine.submitAssessment({
        sessionId: body.sessionId,
        token,
        userAnswers: body.userAnswers || body.answers || {}
      });
      return res.status(200).json(report);
    }

    // 7. GET Student Mastery Profile
    if (req.method === 'GET' && (action === 'mastery' || urlPath.includes('/mastery'))) {
      const studentId = query.studentId || req.headers['x-student-id'] || 'guest_student';
      const profile = engine.getStudentMasteryProfile(studentId, query.subjectId);
      return res.status(200).json(profile);
    }

    // 8. GET Knowledge Gap Report
    if (req.method === 'GET' && (action === 'gaps' || urlPath.includes('/gaps'))) {
      const studentId = query.studentId || req.headers['x-student-id'] || 'guest_student';
      const gapReport = engine.getKnowledgeGapReport(studentId, query.subjectId || 'toan', Number(query.grade) || 12);
      return res.status(200).json(gapReport);
    }

    return res.status(404).json({ error: `Unknown diagnostic action: ${action}` });
  } catch (err) {
    const status = err.code === 'INSUFFICIENT_VERIFIED_QUESTIONS' ? 422 : 400;
    return res.status(status).json({
      error: err.message,
      code: err.code || 'DIAGNOSTIC_ERROR',
      shortages: err.shortages || null
    });
  }
};

module.exports.getDiagnosticEngine = getDiagnosticEngine;
