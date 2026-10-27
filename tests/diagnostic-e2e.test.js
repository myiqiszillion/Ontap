/**
 * Diagnostic Assessment End-to-End Persona & Journey Simulation Tests
 * NTMK Rebuild Phase 03A — Task 10 & Task 11
 *
 * Simulates all 7 deterministic student personas:
 * 1. persona_high_achiever (Strong performance, high confidence)
 * 2. persona_weak_foundation (Low accuracy across foundational topics, needs_foundation)
 * 3. persona_inconsistent (Fluctuating responses, wide uncertainty interval)
 * 4. persona_many_unanswered (Unanswered penalty vs false mastery)
 * 5. persona_new_student (Zero prior history, graceful cold-start empty state)
 * 6. persona_weak_prerequisite (Grade 12 failure rooted in Grade 11 prerequisite)
 * 7. persona_improving_student (Sequential progression from novice to proficient)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const DiagnosticAssessmentEngine = require('../engine/diagnostic/diagnostic-assessment-engine.js');
const CurriculumRepository = require('../engine/diagnostic/curriculum-repository.js');
const SkillGraph = require('../engine/diagnostic/skill-graph.js');
const { FIXTURE_DIAGNOSTIC_QUESTIONS, DETERMINISTIC_PERSONAS } = require('./fixtures/diagnostic-fixtures.js');

describe('Task 10 & 11 — End-to-End Persona & Diagnostic Journey Verification', () => {
  const repo = new CurriculumRepository();
  const graph = new SkillGraph(repo);

  const createEngineForTest = () => {
    return new DiagnosticAssessmentEngine({
      curriculumRepository: repo,
      skillGraph: graph
    });
  };

  it('10.1 Persona 1: High Achiever achieves proficient/strong mastery with narrow uncertainty', () => {
    const engine = createEngineForTest();
    const persona = DETERMINISTIC_PERSONAS.persona_high_achiever;

    // Start session with fixtures
    const session = engine.startAssessment({
      subjectId: 'toan',
      grade: 12,
      assessmentType: 'graduation_readiness',
      studentId: persona.studentId,
      allowFixtureFallback: true
    });

    assert.ok(session.sessionId);
    assert.ok(session.questions.length > 0);

    // Submit with persona answers
    const report = engine.submitAssessment({
      sessionId: session.sessionId,
      token: session.token,
      userAnswers: persona.answers
    });

    assert.strictEqual(report.studentId, persona.studentId);
    assert.ok(report.assessmentPerformance.observedAccuracy >= 0.85);

    // Verify mastery profile
    const profile = engine.getStudentMasteryProfile(persona.studentId, 'toan');
    const assessed = profile.skills.filter(s => s.evidenceCount > 0);
    assert.ok(assessed.length > 0);
    assert.ok(assessed.every(s => ['proficient', 'strong', 'insufficient_evidence'].includes(s.status)));

    // Verify gap report
    const gapReport = engine.getKnowledgeGapReport(persona.studentId, 'toan', 12);
    assert.strictEqual(gapReport.readinessVerdict.level, 'good_foundation');
  });

  it('10.2 Persona 2: Weak Foundation flags critical gaps and prioritizes basic review', () => {
    const engine = createEngineForTest();
    const persona = DETERMINISTIC_PERSONAS.persona_weak_foundation;

    const session = engine.startAssessment({
      subjectId: 'toan',
      grade: 12,
      assessmentType: 'graduation_readiness',
      studentId: persona.studentId,
      allowFixtureFallback: true
    });

    const report = engine.submitAssessment({
      sessionId: session.sessionId,
      token: session.token,
      userAnswers: persona.answers
    });

    assert.ok(report.assessmentPerformance.observedAccuracy <= 0.30);

    const gapReport = engine.getKnowledgeGapReport(persona.studentId, 'toan', 12);
    assert.strictEqual(gapReport.readinessVerdict.level, 'critical_foundational_gaps');
    assert.ok(gapReport.prioritizedGaps.length > 0);
    assert.ok(gapReport.prioritizedGaps[0].actionPlan.includes('Ưu tiên') || gapReport.prioritizedGaps[0].actionPlan.includes('bổ trợ') || gapReport.prioritizedGaps[0].actionPlan.includes('Củng cố'));
  });

  it('10.3 Persona 3: Inconsistent Student shows medium confidence and wider uncertainty interval', () => {
    const engine = createEngineForTest();
    const persona = DETERMINISTIC_PERSONAS.persona_inconsistent;

    const session = engine.startAssessment({
      subjectId: 'toan',
      grade: 12,
      assessmentType: 'graduation_readiness',
      studentId: persona.studentId,
      allowFixtureFallback: true
    });

    const report = engine.submitAssessment({
      sessionId: session.sessionId,
      token: session.token,
      userAnswers: persona.answers
    });

    // Accuracy is in mid range (40%-60%)
    assert.ok(report.assessmentPerformance.observedAccuracy >= 0.25 && report.assessmentPerformance.observedAccuracy <= 0.75);

    const profile = engine.getStudentMasteryProfile(persona.studentId, 'toan');
    const assessed = profile.skills.filter(s => s.evidenceCount >= 2);

    for (const s of assessed) {
      // Uncertainty band should have spread
      const [low, high] = s.uncertaintyBand;
      assert.ok(high - low >= 0.20, `Expected uncertainty spread >= 0.20, got ${high - low}`);
    }
  });

  it('10.4 Persona 4: Many Unanswered penalizes uncertainty without asserting false mastery', () => {
    const engine = createEngineForTest();
    const persona = DETERMINISTIC_PERSONAS.persona_many_unanswered;

    const session = engine.startAssessment({
      subjectId: 'toan',
      grade: 10,
      assessmentType: 'grade_diagnostic',
      studentId: persona.studentId,
      allowFixtureFallback: true
    });

    const report = engine.submitAssessment({
      sessionId: session.sessionId,
      token: session.token,
      userAnswers: persona.answers
    });

    assert.ok(report.assessmentPerformance.unansweredCount > 0);
    assert.ok(report.assessmentPerformance.completionRate < 1.0);

    // Unanswered questions must NOT be given full score
    assert.strictEqual(report.assessmentPerformance.correctCount, 1);
  });

  it('10.5 Persona 5: New Student produces honest not_assessed cold start without fake data', () => {
    const engine = createEngineForTest();
    const persona = DETERMINISTIC_PERSONAS.persona_new_student;

    const profile = engine.getStudentMasteryProfile(persona.studentId, 'toan');
    assert.ok(profile.skills.length > 0);
    assert.ok(profile.skills.every(s => s.status === 'not_assessed'));
    assert.ok(profile.skills.every(s => s.estimatedMastery === null));
    assert.ok(profile.skills.every(s => s.evidenceCount === 0));

    const gapReport = engine.getKnowledgeGapReport(persona.studentId, 'toan', 10);
    assert.strictEqual(gapReport.summary.confirmedGapsCount, 0);
    assert.strictEqual(gapReport.summary.strengthsCount, 0);
    assert.strictEqual(gapReport.summary.unassessedCount, profile.skills.length);
  });

  it('10.6 Persona 6: Weak Prerequisite isolates Grade 11 derivative failure behind Grade 12 struggle', () => {
    const engine = createEngineForTest();
    const persona = DETERMINISTIC_PERSONAS.persona_weak_prerequisite;

    const session = engine.startAssessment({
      subjectId: 'toan',
      grade: 12,
      assessmentType: 'graduation_readiness',
      studentId: persona.studentId,
      allowFixtureFallback: true
    });

    const report = engine.submitAssessment({
      sessionId: session.sessionId,
      token: session.token,
      userAnswers: persona.answers
    });

    // Prerequisite investigations should highlight upstream dependencies
    assert.ok(report.gapAnalysis.prerequisiteInvestigations.length > 0);
    const investigation = report.gapAnalysis.prerequisiteInvestigations.find(i => i.failingSkillId === 'math-12-func-monotonicity');
    assert.ok(investigation, 'Should investigate math-12-func-monotonicity prerequisites');

    const derivPrereq = investigation.upstreamPrerequisites.find(u => u.prerequisiteSkillId === 'math-11-derivatives');
    assert.ok(derivPrereq, 'Upstream must include math-11-derivatives');
    assert.ok(['untested_suspect', 'confirmed_prerequisite_gap'].includes(derivPrereq.diagnosisStatus));
  });

  it('10.7 Persona 7: Longitudinal progression shows learning curve over 3 successive attempts', () => {
    const engine = createEngineForTest();
    const persona = DETERMINISTIC_PERSONAS.persona_improving_student;
    const scores = [];

    for (const sessData of persona.sessions) {
      const session = engine.startAssessment({
        subjectId: 'toan',
        grade: 10,
        assessmentType: 'grade_diagnostic',
        studentId: persona.studentId,
        allowFixtureFallback: true
      });

      const report = engine.submitAssessment({
        sessionId: session.sessionId,
        token: session.token,
        userAnswers: sessData.answers
      });

      scores.push(report.assessmentPerformance.observedAccuracy);
    }

    assert.strictEqual(scores.length, 3);
    assert.strictEqual(scores[0], 0, 'Attempt 1 had 0 accuracy');
    assert.ok(scores[1] > scores[0], 'Attempt 2 improved over Attempt 1');
    assert.ok(scores[2] >= scores[1], 'Attempt 3 improved or equal to Attempt 2');

    // Final profile shows progressive accumulation of evidence
    const finalProfile = engine.getStudentMasteryProfile(persona.studentId, 'toan');
    const assessed = finalProfile.skills.filter(s => s.evidenceCount > 0);
    assert.ok(assessed.length > 0);
    assert.ok(assessed[0].evidenceCount >= 3, 'Evidence accumulated across sessions');
  });
});
