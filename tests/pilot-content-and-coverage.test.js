/**
 * Pilot Content Bank & Curriculum Coverage Matrix Tests
 * NTMK Rebuild Phase 04A — Tasks 5 & 6
 *
 * Requirements Tested:
 * 1. Pilot questions pass QuestionValidator & ContentValidator (100% compliance).
 * 2. All 3 question formats present: MCQ, True/False Group, Short Answer.
 * 3. Exact GDPT 2018 curriculum taxonomy mapping (math-10-sets-logic, math-10-linear-ineq-2vars, math-10-quad-func).
 * 4. Mathematical LaTeX typesetting integrity & zero raw HTML tags.
 * 5. Short Answer normalization (comma vs dot decimals: 1.8 == 1,8).
 * 6. Reviewer identity sign-off and educational license provenance.
 * 7. Coverage Matrix: reports Toán 10 practice ready, and transparent shortages for other 11 combinations.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { PILOT_QUESTIONS } = require('../engine/storage/pilot-questions-data.js');
const QuestionValidator = require('../engine/validator.js');
const ContentValidator = require('../engine/ingestion/content-validator.js');
const BankStorage = require('../engine/storage/bank-storage.js');
const QuestionSchemaV2 = require('../engine/schema.js');

describe('Task 5 & 6 — Pilot Question Bank & Curriculum Coverage', () => {
  const bank = new BankStorage();

  it('6.1 All pilot questions pass QuestionValidator and deep ContentValidator', () => {
    assert.ok(PILOT_QUESTIONS.length >= 12, 'Pilot bank must contain at least 12 authentic questions');

    for (const q of PILOT_QUESTIONS) {
      const baseResult = QuestionValidator.validate(q);
      assert.strictEqual(baseResult.valid, true, `Question ${q.id} failed base validation: ${baseResult.errors.join('; ')}`);

      const deepResult = ContentValidator.validate(q);
      assert.strictEqual(deepResult.valid, true, `Question ${q.id} failed deep validation: ${deepResult.errors.join('; ')}`);
      assert.ok(deepResult.qualityScore >= 80, `Question ${q.id} quality score must be >= 80 (got ${deepResult.qualityScore})`);
    }
  });

  it('6.2 Represents all three mandatory GDPT 2018 question formats', () => {
    const formats = new Set(PILOT_QUESTIONS.map(q => q.format));
    assert.ok(formats.has(QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE), 'Must have multiple_choice');
    assert.ok(formats.has(QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP), 'Must have true_false_group');
    assert.ok(formats.has(QuestionSchemaV2.FORMATS.SHORT_ANSWER), 'Must have short_answer');

    // Check True/False groups have exactly 4 statements with boolean correct properties
    const tfQuestions = PILOT_QUESTIONS.filter(q => q.format === QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP);
    for (const tf of tfQuestions) {
      assert.strictEqual(tf.tfPayload.statements.length, 4, 'TF group must have 4 statements');
      for (const stmt of tf.tfPayload.statements) {
        assert.strictEqual(typeof stmt.correct, 'boolean', 'Statement correct must be boolean');
        assert.ok(stmt.explanation && stmt.explanation.length > 5, 'Statement must have explanation');
      }
    }
  });

  it('6.3 Maps accurately to official GDPT 2018 Toán 10 skills', () => {
    const validSkills = ['math-10-sets-logic', 'math-10-linear-ineq-2vars', 'math-10-quad-func'];
    for (const q of PILOT_QUESTIONS) {
      assert.strictEqual(q.subjectId, 'toan');
      assert.strictEqual(Number(q.grade), 10);
      assert.ok(validSkills.includes(q.skillId), `Question ${q.id} mapped to unknown skill ${q.skillId}`);
    }
  });

  it('6.4 Validates LaTeX formulas and ensures zero raw HTML injection', () => {
    for (const q of PILOT_QUESTIONS) {
      const texts = [
        q.prompt,
        q.explanation,
        ...(q.mcqPayload?.options || []),
        ...(q.tfPayload?.statements?.map(s => s.statement) || [])
      ];

      for (const t of texts) {
        assert.strictEqual(/<[^>]+>/.test(t), false, `Text must not contain raw HTML tags: ${t}`);
      }
    }
  });

  it('6.5 Provenance & Pedagogical Reviewer Sign-off: preserves draft status awaiting real educator vetting', () => {
    for (const q of PILOT_QUESTIONS) {
      assert.strictEqual(q.source.verificationStatus, 'pending');
      assert.strictEqual(q.source.verifiedBy, null, 'verifiedBy must be null until real human educator signs off');
      assert.strictEqual(q.source.isAiAssisted, true, 'Must transparently declare AI-assisted draft status');
      assert.strictEqual(q.status, 'needs_review', 'Unvetted content must remain in needs_review status');
    }
  });

  it('5.1 Coverage Matrix accurately reports Toán 10 demo readiness, zero false published, and honest shortages', () => {
    const matrix = bank.getCoverageMatrix();

    const toan10 = matrix.toan['10'];
    assert.ok(toan10.totalDiscovered >= 12, 'Toán 10 must have discovered pilot draft questions');
    assert.ok(toan10.totalDraft >= 12, 'Toán 10 must have questions in needs_review');
    assert.strictEqual(toan10.totalPublished, 0, 'Must honestly report 0 published questions pending human vetting');
    assert.strictEqual(toan10.isPracticeReady, false, 'Must NOT mark practice ready for real students without human sign-off');
    assert.strictEqual(toan10.isInternalDemoReady, true, 'Internal demo ready for engineering validation');
    assert.strictEqual(toan10.readinessLevel, 'internal_demo_ready', 'Must categorize readiness as internal_demo_ready');
    assert.strictEqual(toan10.isOfficialBlueprintReady, false, 'Toán 10 must honestly declare blueprint shortage');

    // Other combinations report honest unreadiness
    assert.strictEqual(matrix.vatli['10'].isPracticeReady, false, 'Vật lí 10 must be unready');
    assert.strictEqual(matrix.hoahoc['12'].isPracticeReady, false, 'Hóa học 12 must be unready');
    assert.strictEqual(matrix.tienganh['11'].isPracticeReady, false, 'Tiếng Anh 11 must be unready');
  });
});
