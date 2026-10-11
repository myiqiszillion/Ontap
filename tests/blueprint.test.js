/**
 * Test Suite: Exam Blueprint Generator (QĐ 764/QĐ-BGDĐT)
 * Validates exam structures, sections, and bank shortage reports
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const BlueprintGenerator = require('../engine/blueprint-generator.js');

describe('Exam Blueprint Generator (MOET Decision 764/QĐ-BGDĐT)', () => {

  test('Registered Blueprints conform to Decision 764 specifications', () => {
    // Math: 90 mins, 12 MCQ + 4 TF + 6 SA = 22 questions (34 commands), 10 pts
    const mathBp = BlueprintGenerator.getBlueprint('toan');
    assert.ok(mathBp);
    assert.equal(mathBp.durationMinutes, 90);
    assert.equal(mathBp.totalQuestions, 22);
    assert.equal(mathBp.totalCommands, 34);
    assert.equal(mathBp.sections.length, 3);

    // Physics: 50 mins, 18 MCQ + 4 TF + 6 SA = 28 questions (40 commands), 10 pts
    const physBp = BlueprintGenerator.getBlueprint('vatli');
    assert.ok(physBp);
    assert.equal(physBp.durationMinutes, 50);
    assert.equal(physBp.totalQuestions, 28);
    assert.equal(physBp.totalCommands, 40);

    // Chemistry: 50 mins, 18 MCQ + 4 TF + 6 SA = 28 questions (40 commands), 10 pts
    const chemBp = BlueprintGenerator.getBlueprint('hoahoc');
    assert.ok(chemBp);
    assert.equal(chemBp.durationMinutes, 50);
    assert.equal(chemBp.totalQuestions, 28);
    assert.equal(chemBp.totalCommands, 40);

    // English: 50 mins, 40 MCQ = 40 questions, 10 pts
    const engBp = BlueprintGenerator.getBlueprint('tienganh');
    assert.ok(engBp);
    assert.equal(engBp.durationMinutes, 50);
    assert.equal(engBp.totalQuestions, 40);
    assert.equal(engBp.sections.length, 1);
  });

  test('Exam Assembly: sections are strictly ordered Part I -> Part II -> Part III', () => {
    const pool = [
      { id: 'sa_1', format: 'short_answer' },
      { id: 'mcq_1', format: 'multiple_choice' },
      { id: 'tf_1', format: 'true_false_group' },
      { id: 'mcq_2', format: 'multiple_choice' }
    ];

    const exam = BlueprintGenerator.assembleExam(pool, 'toan');
    assert.equal(exam.sections.length, 3);
    assert.equal(exam.sections[0].format, 'multiple_choice');
    assert.equal(exam.sections[1].format, 'true_false_group');
    assert.equal(exam.sections[2].format, 'short_answer');

    // Questions list is in structured order
    assert.equal(exam.questions[0].format, 'multiple_choice');
    assert.equal(exam.questions[1].format, 'multiple_choice');
    assert.equal(exam.questions[2].format, 'true_false_group');
    assert.equal(exam.questions[3].format, 'short_answer');
  });

  test('Shortage Reporting: flags bank deficiency honestly when pool < target', () => {
    // Only 2 MCQs provided for Math (target is 12)
    const smallPool = [
      { id: 'mcq_1', format: 'multiple_choice' },
      { id: 'mcq_2', format: 'multiple_choice' }
    ];

    const exam = BlueprintGenerator.assembleExam(smallPool, 'toan');
    assert.equal(exam.isFullySaturated, false);
    assert.equal(exam.hasShortage, true);
    assert.ok(exam.shortages.length > 0);

    const mcqShortage = exam.shortages.find(s => s.format === 'multiple_choice');
    assert.equal(mcqShortage.targetCount, 12);
    assert.equal(mcqShortage.availableCount, 2);
    assert.equal(mcqShortage.shortage, 10);
  });
});
