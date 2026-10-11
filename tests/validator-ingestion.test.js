/**
 * Test Suite: Question Validator, Pipeline Ingestion & Review Queue
 * Validates Schema V2 enforcement, quality checks, provenance, and deduplication
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const QuestionSchemaV2 = require('../engine/schema.js');
const QuestionValidator = require('../engine/validator.js');
const SourceRegistry = require('../engine/ingestion/source-registry.js');
const ReviewQueue = require('../engine/ingestion/review-queue.js');
const fixture = require('./fixtures/source.js');
fixture.connector();
const IngestionPipeline = require('../engine/ingestion/pipeline.js');

describe('Question Validator & Schema V2 Integrity', () => {

  test('Valid MCQ passes validation', () => {
    const q = QuestionSchemaV2.createQuestion({
      id: 'TOAN10_Q001',
      format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
      subjectId: 'toan',
      grade: 10,
      prompt: 'Tập hợp nào sau đây là tập hợp rỗng?',
      mcqPayload: {
        options: ['{x ∈ ℝ | x² + 1 = 0}', '{x ∈ ℝ | x² - 1 = 0}', '{0}', '∅ không phải tập rỗng'],
        correctOptionIndex: 0
      }
    });

    const res = QuestionValidator.validate(q);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
  });

  test('Invalid questions are rejected with clear diagnostics', () => {
    // 1. Missing prompt
    const noPrompt = { id: 'q_bad1', format: 'multiple_choice', subjectId: 'toan', grade: 10 };
    assert.equal(QuestionValidator.validate(noPrompt).valid, false);

    // 2. Invalid correct option index
    const badIndex = QuestionSchemaV2.createQuestion({
      id: 'q_bad2',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Hỏi câu này có hợp lệ không?',
      mcqPayload: { options: ['A', 'B'], correctOptionIndex: 5 } // out of range
    });
    assert.equal(QuestionValidator.validate(badIndex).valid, false);

    // 3. Unbalanced $$ display math delimiter
    const badMath = QuestionSchemaV2.createQuestion({
      id: 'q_bad3',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Giải phương trình $$ x^2 + 1 = 0 (thiếu đóng ngoặc display math)',
      mcqPayload: { options: ['A', 'B'], correctOptionIndex: 0 }
    });
    const mathRes = QuestionValidator.validate(badMath);
    assert.equal(mathRes.valid, false);
    assert.ok(mathRes.errors.some(e => e.includes('Unbalanced display math')));

    // 4. XSS Injection attempt
    const xssQ = QuestionSchemaV2.createQuestion({
      id: 'q_bad4',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Tính giới hạn <script>alert("hack")</script>',
      mcqPayload: { options: ['A', 'B'], correctOptionIndex: 0 }
    });
    const xssRes = QuestionValidator.validate(xssQ);
    assert.equal(xssRes.valid, false);
    assert.ok(xssRes.errors.some(e => e.includes('Disallowed script markup')));
  });
});

describe('Ingestion Pipeline & Review Queue Workflow', () => {

  test('Source Registry: verifies educational licenses & compliance', () => {
    const moetSrc = SourceRegistry.getSource('moet_official_sample_2025');
    assert.ok(moetSrc);
    assert.equal(moetSrc.license, 'official_educational_reference');
    assert.equal(SourceRegistry.isCompliant('moet_official_sample_2025'), false);

    // Unregistered source is not compliant
    assert.equal(SourceRegistry.isCompliant('illegal_unlicensed_site'), false);
  });

  test('Markdown Block Parser: extracts MCQ, TF, and Short Answer correctly', () => {
    const rawText = `
Câu 1: Cho mệnh đề P. Khẳng định nào đúng?
A. Phương án 1
B. Phương án 2
C. Phương án 3
D. Phương án 4
Đáp án: A

Câu 2: Cho đoạn thông tin sau:
a) Khẳng định 1 - Đúng
b) Khẳng định 2 - Sai
c) Khẳng định 3 - Đúng
d) Khẳng định 4 - Sai

Câu 3: Tính chu vi hình chữ nhật có kích thước 3 và 5:
Đáp án: 16
    `.trim();

    const queue = new ReviewQueue();
    const pipeline = new IngestionPipeline(queue);
    const parsed = pipeline.parseMarkdownBlock(rawText, { subjectId: 'toan', grade: 10 });

    assert.equal(parsed.length, 3);
    assert.equal(parsed[0].format, 'multiple_choice');
    assert.equal(parsed[1].format, 'true_false_group');
    assert.equal(parsed[2].format, 'short_answer');
  });

  test('Deduplication: duplicate questions are filtered out during ingestion', () => {
    const queue = new ReviewQueue();
    const pipeline = new IngestionPipeline(queue);

    const q1 = QuestionSchemaV2.createQuestion({
      id: 'item_1',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Câu hỏi kiểm tra trùng lặp nội dung 1',
      mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }
    });

    const qDuplicate = QuestionSchemaV2.createQuestion({
      id: 'item_2',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: '  Câu hỏi kiểm tra trùng lặp nội dung 1  ', // identical normalized text
      mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }
    });

    const results = pipeline.ingest([q1, qDuplicate], { ...fixture.source, sourceId: 'fixture_source' });
    assert.equal(results.ingested, 1);
    assert.equal(results.duplicates, 1);
    assert.equal(queue.getStats().total, 1);
  });

  test('Review Queue Gate: questions require pedagogical verification signature', () => {
    const queue = new ReviewQueue();
    const q = QuestionSchemaV2.createQuestion({
      id: 'item_for_review',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Câu hỏi cần kiểm định sư phạm',
      topic: 'Sets',
      mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }
    });

    queue.enqueue(q, {...fixture.source,sourceId:'fixture_source'});

    const pending = queue.getPendingQuestions();
    assert.equal(pending.total, 1);
    assert.equal(pending.items[0].source.verificationStatus, 'unverified');

    // Reject verification if verifiedBy is missing
    assert.throws(() => {
      queue.verifyQuestion('item_for_review', {});
    }, /verifiedBy/);

    // Verify with pedagogical auditor signature
    const verified = queue.verifyQuestion('item_for_review', {
      ...fixture.reviewer,
      notes: 'Đã đối soát đáp án theo SGK Kết nối tri thức'
    });

    assert.equal(verified.source.verificationStatus, 'verified');
    assert.equal(verified.status, 'verified');
    assert.equal(queue.getStats().verified, 1);

    // Publish after verification (two-step lifecycle)
    const published = queue.markPublished('item_for_review', 'Admin NTMK');
    assert.equal(published.status, 'published');
    assert.equal(queue.getStats().published, 1);
  });
});
