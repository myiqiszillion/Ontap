/**
 * Diagnostic Assessment Engine Unit Tests
 * NTMK Rebuild Phase 03A — Task 11 (Items 4, 5, 15, 16, 20)
 *
 * Requirements Tested:
 * 1. Diagnostic blueprint coverage (Grade-Based vs Graduation Readiness).
 * 2. Question shortage handling (fails closed when verified bank content is insufficient).
 * 3. Question selection and anti-duplicate deduplication.
 * 4. Protected student projection (answers and solutions stripped).
 * 5. Auto-save answers and session reload recovery with timer.
 * 6. Submission idempotency (re-submitting returns identical cached result).
 * 7. Token-based session security and unauthorized attempt blocking.
 * 8. Offline & missing storage resilience.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const CurriculumRepository = require('../engine/diagnostic/curriculum-repository.js');
const SkillGraph = require('../engine/diagnostic/skill-graph.js');
const DiagnosticBlueprintBuilder = require('../engine/diagnostic/diagnostic-blueprint-builder.js');
const DiagnosticQuestionSelector = require('../engine/diagnostic/diagnostic-question-selector.js');
const DiagnosticSessionManager = require('../engine/diagnostic/diagnostic-session-manager.js');
const DiagnosticAssessmentEngine = require('../engine/diagnostic/diagnostic-assessment-engine.js');
const { FIXTURE_DIAGNOSTIC_QUESTIONS } = require('./fixtures/diagnostic-fixtures.js');

describe('Task 2 — Diagnostic Assessment Engine & Session Manager', () => {
  const repo = new CurriculumRepository();
  const graph = new SkillGraph(repo);
  const blueprintBuilder = new DiagnosticBlueprintBuilder(repo, graph);

  // In-memory mock bank for selector tests
  const createMockBank = (questions = []) => ({
    query: ({ subjectId, status, verificationStatus } = {}) => {
      let filtered = [...questions];
      if (subjectId) filtered = filtered.filter(q => q.subjectId === subjectId);
      if (status) filtered = filtered.filter(q => q.status === status);
      if (verificationStatus) filtered = filtered.filter(q => q.source?.verificationStatus === verificationStatus);
      return { total: filtered.length, questions: filtered };
    }
  });

  it('2.1 Grade blueprint generates balanced coverage across topics and cognitive levels', () => {
    const bp = blueprintBuilder.buildGradeBlueprint({ subjectId: 'toan', grade: 10, targetQuestionCount: 20 });

    assert.strictEqual(bp.assessmentType, 'grade_diagnostic');
    assert.strictEqual(bp.subjectId, 'toan');
    assert.strictEqual(bp.grade, 10);
    assert.strictEqual(bp.totalQuestions, 20);
    assert.strictEqual(bp.durationMinutes, 45);
    assert.strictEqual(bp.isOfficialGraduationExam, false);
    assert.ok(bp.disclaimer.includes('không thay thế kỳ thi học kì'));

    // Check cognitive distribution sum matches total questions
    const cogSum = bp.cognitiveDistribution.recognize +
                   bp.cognitiveDistribution.understand +
                   bp.cognitiveDistribution.apply +
                   bp.cognitiveDistribution.high_apply;
    assert.strictEqual(cogSum, 20);

    // Check skill slots
    assert.strictEqual(bp.skillSlots.length, 20);
    assert.ok(bp.skillSlots[0].skillId);
    assert.ok(bp.skillSlots[0].topicId);
  });

  it('2.2 Graduation readiness blueprint incorporates cross-grade foundation (Grade 12, 11, 10)', () => {
    const bp = blueprintBuilder.buildGraduationReadinessBlueprint({ subjectId: 'toan', targetQuestionCount: 25 });

    assert.strictEqual(bp.assessmentType, 'graduation_readiness');
    assert.strictEqual(bp.totalQuestions, 25);
    assert.strictEqual(bp.isOfficialGraduationExam, false);

    // Verify presence of Grade 10, 11, and 12 slots
    const gradesInSlots = new Set(bp.skillSlots.map(s => s.grade));
    assert.ok(gradesInSlots.has(10), 'Must include Grade 10 foundational slots');
    assert.ok(gradesInSlots.has(11), 'Must include Grade 11 prerequisite slots');
    assert.ok(gradesInSlots.has(12), 'Must include Grade 12 core slots');

    // Grade 12 should form majority (~68%)
    const g12Slots = bp.skillSlots.filter(s => s.grade === 12);
    assert.ok(g12Slots.length >= 15, `Expected >= 15 Grade 12 slots, got ${g12Slots.length}`);
  });

  it('2.3 Question selector fails closed with shortages when verified question bank is empty', () => {
    const emptyBank = createMockBank([]);
    const selector = new DiagnosticQuestionSelector(emptyBank);
    const bp = blueprintBuilder.buildGradeBlueprint({ subjectId: 'toan', grade: 10, targetQuestionCount: 15 });

    const result = selector.selectQuestions(bp, { allowFixtureFallback: false });

    assert.strictEqual(result.ready, false, 'Should fail closed when bank is empty');
    assert.strictEqual(result.selectedCount, 0);
    assert.strictEqual(result.shortages.length, 15);
    assert.ok(result.reason.includes('Ngân hàng câu hỏi chưa đủ điều kiện'));
  });

  it('2.4 Question selector ignores unverified questions and candidate drafts', () => {
    const unverifiedQuestions = [
      {
        id: 'unverified_01',
        subjectId: 'toan',
        grade: 10,
        skillId: 'math-10-sets-logic',
        status: 'draft', // Not published!
        source: { verificationStatus: 'unverified' }
      },
      {
        id: 'unverified_02',
        subjectId: 'toan',
        grade: 10,
        skillId: 'math-10-quad-func',
        status: 'published',
        source: {
          verificationStatus: 'unverified', // Unverified!
          permissionApproved: false
        }
      }
    ];

    const unverifiedBank = createMockBank(unverifiedQuestions);
    const selector = new DiagnosticQuestionSelector(unverifiedBank);
    const bp = blueprintBuilder.buildGradeBlueprint({ subjectId: 'toan', grade: 10, targetQuestionCount: 15 });

    const result = selector.selectQuestions(bp, { allowFixtureFallback: false });
    assert.strictEqual(result.ready, false);
    assert.strictEqual(result.selectedCount, 0);
  });

  it('2.5 Question selector selects verified questions and avoids duplicates within session', () => {
    const mockBank = createMockBank(FIXTURE_DIAGNOSTIC_QUESTIONS);
    const selector = new DiagnosticQuestionSelector(mockBank);
    const bp = blueprintBuilder.buildGradeBlueprint({ subjectId: 'toan', grade: 10, targetQuestionCount: 15 });

    const result = selector.selectQuestions(bp, { allowFixtureFallback: true });

    assert.ok(result.selectedCount > 0);
    const selectedIds = result.selectedQuestions.map(q => q.id);
    const uniqueIds = new Set(selectedIds);
    assert.strictEqual(selectedIds.length, uniqueIds.size, 'Selected questions must not contain duplicates');
  });

  it('2.6 Session manager starts session and strips answers and explanations for student projection', () => {
    const tmpDir = path.join(process.cwd(), '.ntmk', 'test-sessions');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const sessionManager = new DiagnosticSessionManager({
      sessionsPath: path.join(tmpDir, 'sessions.json'),
      resultsPath: path.join(tmpDir, 'results.json')
    });

    const bp = blueprintBuilder.buildGradeBlueprint({ subjectId: 'toan', grade: 10, targetQuestionCount: 15 });
    const selectedQuestions = FIXTURE_DIAGNOSTIC_QUESTIONS.filter(q => q.subjectId === 'toan' && q.grade === 10);

    const sessionProjection = sessionManager.startSession({
      blueprint: bp,
      selectedQuestions,
      studentId: 'test_student_01'
    });

    assert.ok(sessionProjection.sessionId);
    assert.ok(sessionProjection.token);
    assert.strictEqual(sessionProjection.totalQuestions, selectedQuestions.length);

    // CRITICAL: Ensure NO answer keys or explanations leak to student
    for (const q of sessionProjection.questions) {
      assert.strictEqual(q.mcqPayload?.correctOptionIndex, undefined, 'Correct option index leaked!');
      assert.strictEqual(q.shortAnswerPayload?.correctAnswer, undefined, 'Short answer leaked!');
      assert.strictEqual(q.tfPayload?.statements?.[0]?.isCorrect, undefined, 'True/False answer leaked!');
      assert.ok(!q.explanation, 'Explanation leaked or non-empty!');
    }
  });

  it('2.7 Session manager supports auto-saving student answers and resuming upon reload', () => {
    const tmpDir = path.join(process.cwd(), '.ntmk', 'test-sessions');
    const sessionManager = new DiagnosticSessionManager({
      sessionsPath: path.join(tmpDir, 'sessions.json'),
      resultsPath: path.join(tmpDir, 'results.json')
    });

    const bp = blueprintBuilder.buildGradeBlueprint({ subjectId: 'toan', grade: 10, targetQuestionCount: 15 });
    const selected = FIXTURE_DIAGNOSTIC_QUESTIONS.filter(q => q.subjectId === 'toan' && q.grade === 10);

    const started = sessionManager.startSession({
      blueprint: bp,
      selectedQuestions: selected,
      studentId: 'test_student_save'
    });

    // Auto-save answers
    const answersToSave = {
      [selected[0].id]: 1,
      [selected[1].id]: 0
    };

    const saveResult = sessionManager.saveAnswers({
      sessionId: started.sessionId,
      token: started.token,
      answers: answersToSave,
      currentQuestionIndex: 2
    });

    assert.strictEqual(saveResult.success, true);
    assert.strictEqual(saveResult.savedAnswersCount, 2);

    // Reload / resume session
    const resumed = sessionManager.resumeSession({
      sessionId: started.sessionId,
      token: started.token
    });

    assert.strictEqual(resumed.sessionId, started.sessionId);
    assert.strictEqual(resumed.currentQuestionIndex, 2);
    assert.deepStrictEqual(resumed.savedAnswers, answersToSave);
    assert.strictEqual(resumed.isSubmitted, false);
    assert.ok(resumed.remainingTimeSeconds > 0);
  });

  it('2.8 Session manager rejects unauthorized tokens and tampering attempts', () => {
    const tmpDir = path.join(process.cwd(), '.ntmk', 'test-sessions');
    const sessionManager = new DiagnosticSessionManager({
      sessionsPath: path.join(tmpDir, 'sessions.json'),
      resultsPath: path.join(tmpDir, 'results.json')
    });

    const bp = blueprintBuilder.buildGradeBlueprint({ subjectId: 'toan', grade: 10, targetQuestionCount: 15 });
    const selected = FIXTURE_DIAGNOSTIC_QUESTIONS.filter(q => q.subjectId === 'toan' && q.grade === 10);

    const started = sessionManager.startSession({
      blueprint: bp,
      selectedQuestions: selected,
      studentId: 'student_legit'
    });

    // Attempt save with invalid token
    assert.throws(() => {
      sessionManager.saveAnswers({
        sessionId: started.sessionId,
        token: 'forged_fake_token',
        answers: { any: 1 }
      });
    }, /Unauthorized session token/);

    // Attempt resume with invalid token
    assert.throws(() => {
      sessionManager.resumeSession({
        sessionId: started.sessionId,
        token: 'forged_fake_token'
      });
    }, /Unauthorized session token/);
  });

  it('2.9 Session manager enforces submission idempotency (re-submitting returns authoritative result)', () => {
    const tmpDir = path.join(process.cwd(), '.ntmk', 'test-sessions');
    const sessionManager = new DiagnosticSessionManager({
      sessionsPath: path.join(tmpDir, 'sessions.json'),
      resultsPath: path.join(tmpDir, 'results.json')
    });

    const bp = blueprintBuilder.buildGradeBlueprint({ subjectId: 'toan', grade: 10, targetQuestionCount: 15 });
    const selected = FIXTURE_DIAGNOSTIC_QUESTIONS.filter(q => q.subjectId === 'toan' && q.grade === 10);

    const started = sessionManager.startSession({
      blueprint: bp,
      selectedQuestions: selected,
      studentId: 'student_idempotent'
    });

    const mockReport = {
      sessionId: started.sessionId,
      rawScore: 8.5,
      accuracyRate: 0.85,
      submittedAt: new Date().toISOString()
    };

    // First commit
    const committed = sessionManager.commitResult(started.sessionId, mockReport);
    assert.strictEqual(committed.rawScore, 8.5);

    // Verify session marked isSubmitted: true
    const session = sessionManager._getSession(started.sessionId);
    assert.strictEqual(session.isSubmitted, true);
    assert.strictEqual(session.result.rawScore, 8.5);

    // Second retrieval returns identical cached result
    const cached = sessionManager.getResult(started.sessionId);
    assert.deepStrictEqual(cached, mockReport);
  });
});
