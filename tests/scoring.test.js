/**
 * Test Suite: Scoring Engine & Assessment Reliability Matrix
 * Validates MOET Decision 764/QĐ-BGDĐT partial scoring & normalization rules
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const ScoringEngine = require('../engine/scoring.js');

describe('Scoring Engine — MOET QĐ 764 & Assessment Accuracy', () => {

  test('MCQ Scoring: awards points strictly for correct answers', () => {
    const questions = [
      { id: 'q1', format: 'multiple_choice', mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 } },
      { id: 'q2', format: 'multiple_choice', mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 2 } },
      { id: 'q3', format: 'multiple_choice', mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 3 } }
    ];

    // User answered: q1 -> 0 (correct), q2 -> 1 (wrong), q3 -> undefined (unanswered)
    const result = ScoringEngine.scoreExam(questions, { 0: 0, 1: 1, 2: undefined }, 'toan');
    
    assert.equal(result.sectionSummary.mcq.correctCount, 1);
    assert.equal(result.sectionSummary.mcq.totalCount, 3);
    assert.equal(result.sectionSummary.mcq.earned, 0.25); // 1 * 0.25
    assert.equal(result.sectionSummary.mcq.max, 0.75);    // 3 * 0.25
  });

  test('True/False MOET Partial Scoring Matrix (0, 1, 2, 3, 4 statements correct)', () => {
    const makeTfGroup = (id) => ({
      id,
      format: 'true_false_group',
      tfPayload: {
        passage: 'Sample passage',
        statements: [
          { statement: 'Stmt A', correct: true },
          { statement: 'Stmt B', correct: false },
          { statement: 'Stmt C', correct: true },
          { statement: 'Stmt D', correct: false }
        ]
      }
    });

    const questions = [
      makeTfGroup('tf_0'), // 0 correct -> 0.0 đ
      makeTfGroup('tf_1'), // 1 correct -> 0.10 đ
      makeTfGroup('tf_2'), // 2 correct -> 0.25 đ
      makeTfGroup('tf_3'), // 3 correct -> 0.50 đ
      makeTfGroup('tf_4')  // 4 correct -> 1.00 đ
    ];

    const answers = {
      0: { 0: false, 1: true, 2: false, 3: true },  // 0 matches
      1: { 0: true, 1: true, 2: false, 3: true },   // 1 match (stmt 0)
      2: { 0: true, 1: false, 2: false, 3: true },  // 2 matches (stmt 0, 1)
      3: { 0: true, 1: false, 2: true, 3: true },   // 3 matches (stmt 0, 1, 2)
      4: { 0: true, 1: false, 2: true, 3: false }   // 4 matches (all correct)
    };

    const result = ScoringEngine.scoreExam(questions, answers, 'toan');

    assert.equal(result.itemBreakdown[0].scoreAwarded, 0.0);
    assert.equal(result.itemBreakdown[1].scoreAwarded, 0.1);
    assert.equal(result.itemBreakdown[2].scoreAwarded, 0.25);
    assert.equal(result.itemBreakdown[3].scoreAwarded, 0.5);
    assert.equal(result.itemBreakdown[4].scoreAwarded, 1.0);

    const expectedTotal = 0.0 + 0.1 + 0.25 + 0.5 + 1.0; // 1.85 đ
    assert.equal(result.rawScore, 1.85);
    assert.equal(result.maxScore, 5.0);
  });

  test('Short Answer: Handles comma decimal normalization (1,5 == 1.5)', () => {
    const question = {
      id: 'sa1',
      format: 'short_answer',
      shortAnswerPayload: { correctAnswers: ['1.5'] }
    };

    // Test with Vietnamese comma decimal
    const evalComma = ScoringEngine.evaluateShortAnswer('1,5', question);
    assert.equal(evalComma.isCorrect, true);
    assert.equal(evalComma.scoreRatio, 1.0);

    // Test with standard dot decimal
    const evalDot = ScoringEngine.evaluateShortAnswer('1.5', question);
    assert.equal(evalDot.isCorrect, true);

    // Test with wrong answer
    const evalWrong = ScoringEngine.evaluateShortAnswer('2.5', question);
    assert.equal(evalWrong.isCorrect, false);
  });

  test('Short Answer: Whitespace, case-insensitivity, and unit stripping', () => {
    const question = {
      id: 'sa2',
      format: 'short_answer',
      shortAnswerPayload: { correctAnswers: ['60'], unit: 'km/h', allowUnitStripping: true }
    };

    assert.equal(ScoringEngine.evaluateShortAnswer('  60  ', question).isCorrect, true);
    assert.equal(ScoringEngine.evaluateShortAnswer('60 km/h', question).isCorrect, true);
    assert.equal(ScoringEngine.evaluateShortAnswer('60km/h', question).isCorrect, true);
  });

  test('Short Answer: Tolerance check for floating calculations', () => {
    const question = {
      id: 'sa3',
      format: 'short_answer',
      shortAnswerPayload: { correctAnswers: ['3.1416'], tolerance: 0.002 }
    };

    // 3.14 is within 0.002 of 3.1416
    assert.equal(ScoringEngine.evaluateShortAnswer('3.141', question).isCorrect, true);
    // 3.10 is outside tolerance
    assert.equal(ScoringEngine.evaluateShortAnswer('3.10', question).isCorrect, false);
  });

  test('Subject-specific 10-point scale weights (Math vs English)', () => {
    // English: 40 MCQs, each 0.25 pt
    const englishQuestions = Array.from({ length: 40 }, (_, i) => ({
      id: `en_${i}`,
      format: 'multiple_choice',
      mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }
    }));

    const engAnswers = {};
    for (let i = 0; i < 30; i++) engAnswers[i] = 0; // 30 correct out of 40

    const engResult = ScoringEngine.scoreExam(englishQuestions, engAnswers, 'tienganh');
    assert.equal(engResult.rawScore, 7.5); // 30 * 0.25 = 7.5 đ
    assert.equal(engResult.maxScore, 10.0);
    assert.equal(engResult.scaledScore, 7.5);
    assert.equal(engResult.percentage, 75);
  });
});
