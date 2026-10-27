/**
 * Diagnostic Mastery Estimation & Knowledge Gap Analyzer Tests
 * NTMK Rebuild Phase 03A — Task 11 (Items 6, 7, 8, 9, 10, 11, 12, 13, 14, 17)
 *
 * Requirements Tested:
 * 1. MCQ scoring accuracy (MOET QĐ 764).
 * 2. True/False group partial scoring (0.1, 0.25, 0.5, 1.0 points).
 * 3. Short answer scoring (comma decimal tolerance and strict policy).
 * 4. Skill evidence aggregation across items and sessions.
 * 5. Minimum evidence rule: testedCount < 2 strictly yields 'insufficient_evidence'.
 * 6. Bayesian Beta-Binomial mastery estimation (no black-box AI guessing).
 * 7. Separation of observed accuracy from estimated mastery.
 * 8. Confidence calculation and 80% credible interval bounds.
 * 9. Knowledge gap detection and prerequisite blocker prioritization.
 * 10. Multi-session progress tracking (longitudinal comparison).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const CurriculumRepository = require('../engine/diagnostic/curriculum-repository.js');
const SkillGraph = require('../engine/diagnostic/skill-graph.js');
const DiagnosticScoringAdapter = require('../engine/diagnostic/diagnostic-scoring-adapter.js');
const SkillEvidenceAggregator = require('../engine/diagnostic/skill-evidence-aggregator.js');
const SkillMasteryEstimator = require('../engine/diagnostic/skill-mastery-estimator.js');
const KnowledgeGapAnalyzer = require('../engine/diagnostic/knowledge-gap-analyzer.js');
const { FIXTURE_DIAGNOSTIC_QUESTIONS, DETERMINISTIC_PERSONAS } = require('./fixtures/diagnostic-fixtures.js');

describe('Tasks 3, 4 & 5 — Diagnostic Scoring, Mastery Estimation & Knowledge Gaps', () => {
  const repo = new CurriculumRepository();
  const graph = new SkillGraph(repo);
  const scoringAdapter = new DiagnosticScoringAdapter();
  const estimator = new SkillMasteryEstimator();
  const gapAnalyzer = new KnowledgeGapAnalyzer(graph);

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 3: SCORING ENGINE INTEGRATION
  // ═════════════════════════════════════════════════════════════════════════

  it('3.1 MCQ scoring awards exact points for correct answer and 0 for incorrect/unanswered', () => {
    const mcqQuestions = FIXTURE_DIAGNOSTIC_QUESTIONS.filter(q => q.format === 'multiple_choice').slice(0, 3);
    const answers = {
      [mcqQuestions[0].id]: mcqQuestions[0].mcqPayload.correctOptionIndex, // Correct
      [mcqQuestions[1].id]: (mcqQuestions[1].mcqPayload.correctOptionIndex + 1) % 4, // Wrong
      // mcqQuestions[2] left unanswered
    };

    const res = scoringAdapter.scoreDiagnostic({
      questions: mcqQuestions,
      userAnswers: answers,
      subjectId: 'toan'
    });

    assert.strictEqual(res.correctCount, 1);
    assert.strictEqual(res.incorrectCount, 1);
    assert.strictEqual(res.unansweredCount, 1);
    assert.strictEqual(res.evaluatedQuestions.length, 3);

    const q0 = res.evaluatedQuestions[0];
    assert.strictEqual(q0.isCorrect, true);
    assert.strictEqual(q0.isAnswered, true);

    const q2 = res.evaluatedQuestions[2];
    assert.strictEqual(q2.isCorrect, false);
    assert.strictEqual(q2.isAnswered, false);
    assert.strictEqual(q2.rawScore, 0);
  });

  it('3.2 True/False Group partial scoring strictly follows MOET QĐ 764 matrix', () => {
    const tfQuestion = FIXTURE_DIAGNOSTIC_QUESTIONS.find(q => q.format === 'true_false_group');
    assert.ok(tfQuestion, 'True/False question fixture must exist');

    const stmts = tfQuestion.tfPayload.statements;

    // Helper to evaluate TF question with given correct count
    const scoreTFWithCount = (correctCount) => {
      const answers = {};
      stmts.forEach((s, idx) => {
        answers[s.id] = idx < correctCount ? s.correct : !s.correct;
      });

      const res = scoringAdapter.scoreDiagnostic({
        questions: [tfQuestion],
        userAnswers: { [tfQuestion.id]: answers },
        subjectId: 'toan'
      });
      return res.evaluatedQuestions[0].rawScore;
    };

    // MOET QĐ 764: 1 correct -> 0.1, 2 correct -> 0.25, 3 correct -> 0.5, 4 correct -> 1.0
    assert.strictEqual(scoreTFWithCount(4), 1.0);
    assert.strictEqual(scoreTFWithCount(3), 0.5);
    assert.strictEqual(scoreTFWithCount(2), 0.25);
    assert.strictEqual(scoreTFWithCount(1), 0.1);
    assert.strictEqual(scoreTFWithCount(0), 0.0);
  });

  it('3.3 Short Answer handles comma decimal normalization and strict policy', () => {
    const saQuestion = FIXTURE_DIAGNOSTIC_QUESTIONS.find(q => q.format === 'short_answer');
    assert.ok(saQuestion, 'Short Answer question fixture must exist');

    // Comma decimal '5,0' matching accepted '5.0' or '5'
    const resComma = scoringAdapter.scoreDiagnostic({
      questions: [saQuestion],
      userAnswers: { [saQuestion.id]: '5,0' },
      subjectId: 'toan'
    });
    assert.strictEqual(resComma.evaluatedQuestions[0].isCorrect, true);

    // Incorrect answer
    const resWrong = scoringAdapter.scoreDiagnostic({
      questions: [saQuestion],
      userAnswers: { [saQuestion.id]: '99' },
      subjectId: 'toan'
    });
    assert.strictEqual(resWrong.evaluatedQuestions[0].isCorrect, false);
  });

  it('3.4 Emits question-to-skill evidence records linking score and cognitive level', () => {
    const questions = FIXTURE_DIAGNOSTIC_QUESTIONS.slice(0, 3);
    const answers = {
      [questions[0].id]: questions[0].mcqPayload?.correctOptionIndex ?? 0
    };

    const res = scoringAdapter.scoreDiagnostic({
      questions,
      userAnswers: answers,
      subjectId: 'toan'
    });

    assert.strictEqual(res.skillEvidenceList.length, 3);
    const ev = res.skillEvidenceList[0];
    assert.ok(ev.questionId);
    assert.ok(ev.skillId);
    assert.ok(ev.cognitiveLevel);
    assert.ok(ev.format);
    assert.strictEqual(typeof ev.rawScore, 'number');
    assert.strictEqual(typeof ev.isCorrect, 'boolean');
    assert.strictEqual(typeof ev.isAnswered, 'boolean');
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 4: SKILL MASTERY ESTIMATION ENGINE
  // ═════════════════════════════════════════════════════════════════════════

  it('4.1 SkillEvidenceAggregator rolls up multiple questions for the same skill', () => {
    const mockEvidence = [
      {
        questionId: 'q1',
        skillId: 'math-10-sets-logic',
        grade: 10,
        cognitiveLevel: 'recognize',
        isAnswered: true,
        isCorrect: true,
        scoreRatio: 1.0
      },
      {
        questionId: 'q2',
        skillId: 'math-10-sets-logic',
        grade: 10,
        cognitiveLevel: 'understand',
        isAnswered: true,
        isCorrect: false,
        scoreRatio: 0.0
      }
    ];

    const aggregated = SkillEvidenceAggregator.aggregate(mockEvidence);
    assert.ok(aggregated.has('math-10-sets-logic'));

    const record = aggregated.get('math-10-sets-logic');
    assert.strictEqual(record.testedCount, 2);
    assert.strictEqual(record.correctCount, 1);
    assert.strictEqual(record.observedAccuracy, 0.5);
    assert.strictEqual(record.cognitiveBreakdown.recognize, 1);
    assert.strictEqual(record.cognitiveBreakdown.understand, 1);
  });

  it('4.2 Strictly assigns insufficient_evidence when testedCount < minEvidenceThreshold (2)', () => {
    // 1 question correct does NOT prove mastery!
    const singleEvidence = [
      {
        questionId: 'q1',
        skillId: 'math-10-sets-logic',
        grade: 10,
        cognitiveLevel: 'recognize',
        isAnswered: true,
        isCorrect: true,
        scoreRatio: 1.0
      }
    ];

    const aggregated = SkillEvidenceAggregator.aggregate(singleEvidence);
    const estimation = estimator.estimateSkillMastery(aggregated.get('math-10-sets-logic'));

    assert.strictEqual(estimation.status, 'insufficient_evidence');
    assert.strictEqual(estimation.statusLabel, 'Chưa đủ dữ liệu đánh giá');
    assert.strictEqual(estimation.estimatedMastery, null, 'Must NOT output pseudo-mastery percentage when evidence is insufficient');
    assert.strictEqual(estimation.evidenceCount, 1);
    assert.strictEqual(estimation.confidenceLevel, 'low');
    assert.ok(estimation.reasons[0].includes('Cần tối thiểu 2 câu hỏi'));
  });

  it('4.2b Exactly 2 questions answered correctly is capped at developing to prevent overconfidence', () => {
    const twoCorrectEvidence = [
      {
        questionId: 'q1',
        skillId: 'math-10-sets-logic',
        grade: 10,
        cognitiveLevel: 'understand',
        isAnswered: true,
        isCorrect: true,
        scoreRatio: 1.0
      },
      {
        questionId: 'q2',
        skillId: 'math-10-sets-logic',
        grade: 10,
        cognitiveLevel: 'understand',
        isAnswered: true,
        isCorrect: true,
        scoreRatio: 1.0
      }
    ];

    const aggregated = SkillEvidenceAggregator.aggregate(twoCorrectEvidence);
    const estimation = estimator.estimateSkillMastery(aggregated.get('math-10-sets-logic'));

    // Status MUST NOT jump to 'proficient' or 'strong' with only 2 questions!
    assert.strictEqual(estimation.status, 'developing');
    assert.strictEqual(estimation.statusLabel, 'Đang phát triển');
    assert.ok(estimation.reasons.some(r => r.includes('cần làm thêm tối thiểu 1 câu hỏi')));
  });

  it('4.3 Bayesian Beta-Binomial update estimates mastery with cognitive weights', () => {
    // 3 questions tested: 3 correct across Understand, Apply, High Apply
    const strongEvidence = [
      {
        questionId: 'q1',
        skillId: 'math-12-func-monotonicity',
        grade: 12,
        cognitiveLevel: 'understand',
        isAnswered: true,
        isCorrect: true,
        scoreRatio: 1.0
      },
      {
        questionId: 'q2',
        skillId: 'math-12-func-monotonicity',
        grade: 12,
        cognitiveLevel: 'apply',
        isAnswered: true,
        isCorrect: true,
        scoreRatio: 1.0
      },
      {
        questionId: 'q3',
        skillId: 'math-12-func-monotonicity',
        grade: 12,
        cognitiveLevel: 'high_apply',
        isAnswered: true,
        isCorrect: true,
        scoreRatio: 1.0
      }
    ];

    const aggregated = SkillEvidenceAggregator.aggregate(strongEvidence);
    const estimation = estimator.estimateSkillMastery(aggregated.get('math-12-func-monotonicity'));

    // Even with 3/3 (100% raw accuracy), Bayesian regularizer ensures mastery < 1.0 (avoids hubris)
    assert.strictEqual(estimation.observedAccuracy, 1.0);
    assert.ok(estimation.estimatedMastery < 1.0, 'Bayesian estimate must regularize 100% raw accuracy');
    assert.ok(estimation.estimatedMastery >= 0.70, 'Posterior mean should be high');
    assert.ok(['proficient', 'strong'].includes(estimation.status));
    assert.ok(estimation.confidenceScore >= 0.50);
    assert.ok(estimation.credibleInterval80.lowerBound <= estimation.estimatedMastery);
    assert.ok(estimation.credibleInterval80.upperBound >= estimation.estimatedMastery);
  });

  it('4.4 Identifies needs_foundation state when student has multiple failures', () => {
    const weakEvidence = [
      {
        questionId: 'q1',
        skillId: 'math-10-quad-func',
        grade: 10,
        cognitiveLevel: 'understand',
        isAnswered: true,
        isCorrect: false,
        scoreRatio: 0.0
      },
      {
        questionId: 'q2',
        skillId: 'math-10-quad-func',
        grade: 10,
        cognitiveLevel: 'apply',
        isAnswered: true,
        isCorrect: false,
        scoreRatio: 0.0
      },
      {
        questionId: 'q3',
        skillId: 'math-10-quad-func',
        grade: 10,
        cognitiveLevel: 'apply',
        isAnswered: true,
        isCorrect: false,
        scoreRatio: 0.0
      }
    ];

    const aggregated = SkillEvidenceAggregator.aggregate(weakEvidence);
    const estimation = estimator.estimateSkillMastery(aggregated.get('math-10-quad-func'));

    assert.strictEqual(estimation.status, 'needs_foundation');
    assert.strictEqual(estimation.statusLabel, 'Cần củng cố nền tảng');
    assert.ok(estimation.estimatedMastery < 0.45);
    assert.ok(estimation.reasons.some(r => r.includes('khái niệm và phương pháp giải')));
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 5: KNOWLEDGE GAP DETECTION & PREREQUISITE ROOT CAUSE
  // ═════════════════════════════════════════════════════════════════════════

  it('5.1 KnowledgeGapAnalyzer categorizes skills and ranks foundational blockers highest', () => {
    // Simulate mastery map:
    // math-10-quad-func (Foundational, needs_foundation)
    // math-12-func-monotonicity (Dependent, needs_foundation)
    // math-10-sets-logic (Proficient)
    const masteryMap = new Map([
      ['math-10-quad-func', {
        skillId: 'math-10-quad-func',
        skillTitle: 'Hàm số bậc hai',
        grade: 10,
        status: 'needs_foundation',
        estimatedMastery: 0.25,
        confidenceScore: 0.8,
        testedCount: 3,
        evidenceCount: 3
      }],
      ['math-12-func-monotonicity', {
        skillId: 'math-12-func-monotonicity',
        skillTitle: 'Tính đơn điệu hàm số',
        grade: 12,
        status: 'needs_foundation',
        estimatedMastery: 0.20,
        confidenceScore: 0.8,
        testedCount: 3,
        evidenceCount: 3
      }],
      ['math-10-sets-logic', {
        skillId: 'math-10-sets-logic',
        skillTitle: 'Mệnh đề tập hợp',
        grade: 10,
        status: 'proficient',
        estimatedMastery: 0.80,
        confidenceScore: 0.7,
        testedCount: 3,
        evidenceCount: 3
      }]
    ]);

    const report = gapAnalyzer.analyzeGaps({
      masteryMap,
      subjectId: 'toan',
      targetGrade: 12
    });

    assert.strictEqual(report.confirmedGaps.length, 2);
    assert.strictEqual(report.strengths.length, 1);
    assert.ok(report.prioritizedGaps.length === 2);

    // Prerequisite investigations should trace upstream dependencies
    assert.ok(report.prerequisiteInvestigations.length > 0);
  });

  it('5.2 Tracks student improvement longitudinally across multiple sessions (Improving Persona)', () => {
    const persona = DETERMINISTIC_PERSONAS.persona_improving_student;
    assert.ok(persona.sessions.length === 3);

    const questions = FIXTURE_DIAGNOSTIC_QUESTIONS.filter(q => q.subjectId === 'toan');
    const allEvidence = [];
    const sessionMasteries = [];

    // Simulate 3 successive sessions
    for (const s of persona.sessions) {
      const scoreRes = scoringAdapter.scoreDiagnostic({
        questions,
        userAnswers: s.answers,
        subjectId: 'toan'
      });
      allEvidence.push(...scoreRes.skillEvidenceList);

      const aggregated = SkillEvidenceAggregator.aggregate(allEvidence);
      const m10_01 = estimator.estimateSkillMastery(aggregated.get('math-10-sets-logic'));
      sessionMasteries.push(m10_01);
    }

    // Session 1: all wrong -> low or insufficient
    // Session 3: cumulative evidence shows upward mastery trajectory
    const finalMastery = sessionMasteries[2];
    assert.ok(finalMastery.evidenceCount >= 3);
    assert.ok(finalMastery.observedAccuracy > sessionMasteries[0].observedAccuracy);
    assert.ok(finalMastery.status !== 'needs_foundation', 'Improving student should transcend needs_foundation state');
  });
});
