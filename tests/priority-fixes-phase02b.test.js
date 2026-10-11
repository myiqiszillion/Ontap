/**
 * Test Suite: Phase 02B Priority Fixes Verification (Task 1)
 * Tests:
 * 1. Short Answer answer policy per question (strict tolerance & unit stripping rules)
 * 2. Idempotent exam submission & result persistence
 * 3. Answer key protection / sanitization for exam sessions
 * 4. Official Blueprint vs Practice Quiz distinction
 * 5. Edge cases: reload, timeout, invalid data, duplicate submits
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const ScoringEngine = require('../engine/scoring.js');
const ExamSessionManager = require('../engine/session-manager.js');
const QuestionSchemaV2 = require('../engine/schema.js');

describe('Phase 02B Priority Fixes — Task 1 Verification', () => {

  describe('1. Short Answer Question-Specific Answer Policy', () => {
    test('Strict Policy: Does NOT apply tolerance when not configured on question', () => {
      // Question without explicit tolerance policy -> default tolerance is 0
      const qStrict = QuestionSchemaV2.createQuestion({
        id: 'q_strict_1',
        format: 'short_answer',
        shortAnswerPayload: { correctAnswers: ['3.1416'] }
      });

      // User submits 3.141 (difference 0.0006)
      const res = ScoringEngine.evaluateShortAnswer('3.141', qStrict);
      assert.equal(res.isCorrect, false, 'Should fail because tolerance was not explicitly configured');

      // User submits exact answer
      const resExact = ScoringEngine.evaluateShortAnswer('3.1416', qStrict);
      assert.equal(resExact.isCorrect, true);
    });

    test('Configured Tolerance: Applies tolerance when explicitly specified in answerPolicy', () => {
      const qWithTolerance = QuestionSchemaV2.createQuestion({
        id: 'q_tol_1',
        format: 'short_answer',
        shortAnswerPayload: { correctAnswers: ['3.1416'], tolerance: 0.001 }
      });

      // 3.141 is within 0.001 of 3.1416
      const res = ScoringEngine.evaluateShortAnswer('3.141', qWithTolerance);
      assert.equal(res.isCorrect, true, 'Should pass when within configured tolerance');

      // 3.140 is outside 0.001 tolerance
      const resOutside = ScoringEngine.evaluateShortAnswer('3.140', qWithTolerance);
      assert.equal(resOutside.isCorrect, false);
    });

    test('Strict Policy: Does NOT strip units when question does not authorize unit stripping', () => {
      const qNoUnit = QuestionSchemaV2.createQuestion({
        id: 'q_nounit_1',
        format: 'short_answer',
        shortAnswerPayload: { correctAnswers: ['50'] },
        answerPolicy: { allowUnitStripping: false }
      });

      // User submits "50 kg"
      const res = ScoringEngine.evaluateShortAnswer('50 kg', qNoUnit);
      assert.equal(res.isCorrect, false, 'Should NOT strip unit when not authorized');

      // User submits plain "50"
      const resPlain = ScoringEngine.evaluateShortAnswer('50', qNoUnit);
      assert.equal(resPlain.isCorrect, true);
    });

    test('Configured Unit Policy: Strips unit when explicitly specified and authorized', () => {
      const qWithUnit = QuestionSchemaV2.createQuestion({
        id: 'q_unit_1',
        format: 'short_answer',
        shortAnswerPayload: { correctAnswers: ['50'], unit: 'm/s', allowUnitStripping: true }
      });

      const resWithUnit = ScoringEngine.evaluateShortAnswer('50 m/s', qWithUnit);
      assert.equal(resWithUnit.isCorrect, true, 'Should strip unit when authorized');
    });
  });

  describe('2. Idempotent Submission & Anti-Duplicate Protection', () => {
    const mockStorage = {};
    beforeEach(() => {
      Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
      global.localStorage = {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: (k) => { delete mockStorage[k]; }
      };
      ExamSessionManager.isSubmitting = false;
    });

    test('Idempotency: Re-submitting with same sessionId returns identical stored result', () => {
      const session = ExamSessionManager.startSession({
        subjectId: 'toan10',
        questions: [
          { id: 'q1', format: 'multiple_choice', mcqPayload: { options: ['A', 'B'], correctOptionIndex: 0 } }
        ]
      });
      ExamSessionManager.recordAnswer(0, 0);

      // First submit
      const firstResult = ExamSessionManager.submitSession();
      assert.ok(firstResult);
      assert.equal(firstResult.isDuplicate, false);
      assert.equal(firstResult.scoreResult.rawScore, 0.25);

      // Immediate second submit using the same sessionId
      const secondResult = ExamSessionManager.submitSession({ sessionId: session.id });
      assert.ok(secondResult, 'Should return stored result idempotently');
      assert.equal(secondResult.isDuplicate, true);
      assert.equal(secondResult.idempotent, true);
      assert.equal(secondResult.scoreResult.rawScore, firstResult.scoreResult.rawScore);
      assert.equal(secondResult.session.id, session.id);
    });

    test('Idempotency Key: Client-provided idempotencyKey returns exact cached result', () => {
      const session = ExamSessionManager.startSession({
        subjectId: 'toan10',
        questions: [
          { id: 'q1', format: 'multiple_choice', mcqPayload: { options: ['A', 'B'], correctOptionIndex: 1 } }
        ]
      });
      ExamSessionManager.recordAnswer(0, 1);

      const clientKey = 'idem_req_abc123';
      const firstResult = ExamSessionManager.submitSession({ idempotencyKey: clientKey });
      assert.ok(firstResult);
      assert.equal(firstResult.isDuplicate, false);

      // Retry with same idempotency key
      const retryResult = ExamSessionManager.submitSession({ idempotencyKey: clientKey });
      assert.ok(retryResult);
      assert.equal(retryResult.isDuplicate, true);
      assert.equal(retryResult.scoreResult.rawScore, firstResult.scoreResult.rawScore);
    });
  });

  describe('3. Public API Answer Key Protection & Sanitization', () => {
    test('sanitizeForStudent removes all answer keys and explanations in exam mode', () => {
      const fullMCQ = QuestionSchemaV2.createQuestion({
        id: 'q_mcq_secret',
        format: 'multiple_choice',
        prompt: '2 + 2 = ?',
        explanation: 'Lời giải chi tiết bí mật',
        mcqPayload: {
          options: ['1', '2', '4', '5'],
          correctOptionIndex: 2
        }
      });

      const sanitizedMCQ = QuestionSchemaV2.sanitizeForStudent(fullMCQ, { isExamMode: true });
      assert.equal(sanitizedMCQ.mcqPayload.correctOptionIndex, undefined, 'Must not leak correctOptionIndex');
      assert.equal(sanitizedMCQ.explanation, '', 'Must not leak explanation in exam mode');
      assert.equal(sanitizedMCQ.prompt, '2 + 2 = ?');
      assert.equal(sanitizedMCQ.mcqPayload.options.length, 4);

      const fullTF = QuestionSchemaV2.createQuestion({
        id: 'q_tf_secret',
        format: 'true_false_group',
        prompt: 'Đoạn ngữ cảnh',
        tfPayload: {
          statements: [
            { id: 'stmt_a', statement: 'Ý A', correct: true },
            { id: 'stmt_b', statement: 'Ý B', correct: false }
          ]
        }
      });

      const sanitizedTF = QuestionSchemaV2.sanitizeForStudent(fullTF, { isExamMode: true });
      assert.equal(sanitizedTF.tfPayload.statements[0].correct, undefined, 'Must not leak statement.correct');
      assert.equal(sanitizedTF.tfPayload.statements[1].correct, undefined);

      const fullSA = QuestionSchemaV2.createQuestion({
        id: 'q_sa_secret',
        format: 'short_answer',
        prompt: 'Tìm x',
        shortAnswerPayload: { correctAnswers: ['42'] }
      });

      const sanitizedSA = QuestionSchemaV2.sanitizeForStudent(fullSA, { isExamMode: true });
      assert.equal(sanitizedSA.shortAnswerPayload.correctAnswers, undefined, 'Must not leak shortAnswerPayload.correctAnswers');
    });
  });

  describe('4. Official Blueprint vs Practice Quiz Distinction', () => {
    test('Full Official Blueprint achieves isOfficialBlueprint: true', () => {
      // 12 MCQ + 4 TF + 6 SA for Math = 22 questions, 10.0 points
      const mathQuestions = [
        ...Array.from({ length: 12 }, (_, i) => ({ id: `mcq_${i}`, format: 'multiple_choice', mcqPayload: { options: ['A', 'B'], correctOptionIndex: 0 } })),
        ...Array.from({ length: 4 }, (_, i) => ({ id: `tf_${i}`, format: 'true_false_group', tfPayload: { statements: [{ statement: 'S1', correct: true }] } })),
        ...Array.from({ length: 6 }, (_, i) => ({ id: `sa_${i}`, format: 'short_answer', shortAnswerPayload: { correctAnswers: ['1'] } }))
      ];

      const answers = {};
      mathQuestions.forEach((q, i) => {
        if (q.format === 'multiple_choice') answers[i] = 0;
        else if (q.format === 'true_false_group') answers[i] = { 0: true };
        else answers[i] = '1';
      });

      const scoreResult = ScoringEngine.scoreExam(mathQuestions, answers, 'toan');
      assert.equal(scoreResult.isOfficialBlueprint, true);
      assert.equal(scoreResult.examType, 'official_blueprint');
      assert.ok(scoreResult.scaleDescription.includes('QĐ 764'));
    });

    test('Reduced Practice Quiz is marked as practice_quiz with relative scaledScore', () => {
      // Only 3 questions
      const miniQuestions = [
        { id: 'q1', format: 'multiple_choice', mcqPayload: { options: ['A', 'B'], correctOptionIndex: 0 } },
        { id: 'q2', format: 'multiple_choice', mcqPayload: { options: ['A', 'B'], correctOptionIndex: 0 } }
      ];

      const scoreResult = ScoringEngine.scoreExam(miniQuestions, { 0: 0, 1: 0 }, 'toan');
      assert.equal(scoreResult.isOfficialBlueprint, false);
      assert.equal(scoreResult.examType, 'practice_quiz');
      assert.ok(scoreResult.scaleDescription.includes('Đề luyện tập rút gọn'));
      assert.ok(scoreResult.blueprintNotice.includes('Bài luyện tập rút gọn'));
    });
  });
});
