/**
 * Test Suite for Phase 06:
 * - Smart Question Importer & Parser (MCQ & True/False groups)
 * - Printable Exam Studio & OMR Bubble Answer Sheet
 * - Lịch Sử 12 Curriculum Question Bank Data Integrity
 * - PWA Manifest & Service Worker Registration
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Import modules under test
const SmartImporter = require('../public/js/smart-importer.js');
const PrintableExam = require('../public/js/printable-exam.js');

describe('Phase 06 — 1. Smart Importer Parser Engine', () => {
  test('Parses standard MCQ format with inline asterisks for correct answers', () => {
    const rawText = `
PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.
Câu 1: Chiến dịch nào làm phá sản kế hoạch Nava của thực dân Pháp?
*A. Chiến dịch Điện Biên Phủ 1954.
B. Chiến dịch Việt Bắc 1947.
C. Chiến dịch Biên giới 1950.
D. Cuộc tiến công chiến lược Đông - Xuân 1953 - 1954.

Câu 2: Cơ quan quyền lực cao nhất của Liên Hợp Quốc là
A. Ban Thư ký.
B. Hội đồng Kinh tế và Xã hội.
*C. Đại hội đồng.
D. Tòa án Công lý Quốc tế.
    `;

    const result = SmartImporter.parseText(rawText);
    assert.equal(result.mcq.length, 2, 'Should parse 2 MCQ questions');
    assert.equal(result.mcq[0].options.length, 4, 'Question 1 should have 4 options');
    assert.equal(result.mcq[0].correctAnswer, 0, 'Question 1 correct answer should be 0 (A)');
    assert.ok(result.mcq[0].options[0].includes('Điện Biên Phủ'));

    assert.equal(result.mcq[1].correctAnswer, 2, 'Question 2 correct answer should be 2 (C)');
    assert.ok(result.mcq[1].options[2].includes('Đại hội đồng'));
  });

  test('Parses True/False section (PHẦN II) with 4 statements and (Đúng)/(Sai) labels', () => {
    const rawText = `
PHẦN II. Câu trắc nghiệm đúng sai.
Câu 1: Đọc đoạn thông tin sau:
"Hiệp hội các quốc gia Đông Nam Á (ASEAN) được thành lập ngày 8-8-1967 tại Băng Cốc."
a) ASEAN được thành lập với 5 thành viên sáng lập ban đầu. (Đúng)
b) Mục tiêu của ASEAN là liên minh quân sự chống lại các nước phương Tây. (Sai)
c) Việt Nam gia nhập ASEAN vào năm 1995. (Đúng)
d) Nguyên tắc đồng thuận là nguyên tắc cơ bản trong hoạt động của ASEAN. (Đúng)
    `;

    const result = SmartImporter.parseText(rawText);
    assert.equal(result.tf.length, 1, 'Should parse 1 True/False group');
    const group = result.tf[0];
    assert.ok(group.passage.includes('ASEAN'));
    assert.equal(group.statements.length, 4, 'Group should have 4 statements');
    assert.equal(group.statements[0].correct, true);
    assert.equal(group.statements[1].correct, false);
    assert.equal(group.statements[2].correct, true);
    assert.equal(group.statements[3].correct, true);
  });

  test('Extracts correct answers from summary key table at bottom if no asterisks', () => {
    const rawText = `
Câu 1: Thủ đô của Việt Nam là gì?
A. TP Hồ Chí Minh
B. Hà Nội
C. Đà Nẵng
D. Cần Thơ

Câu 2: Quốc gia nào có diện tích lớn nhất thế giới?
A. Canada
B. Mỹ
C. Nga
D. Trung Quốc

ĐÁP ÁN: 1.B  2.C
    `;

    const result = SmartImporter.parseText(rawText);
    assert.equal(result.mcq.length, 2);
    assert.equal(result.mcq[0].correctAnswer, 1, 'Question 1 should map to B (1) via summary key');
    assert.equal(result.mcq[1].correctAnswer, 2, 'Question 2 should map to C (2) via summary key');
  });

  test('Gracefully handles empty or corrupted text input', () => {
    const resEmpty = SmartImporter.parseText('');
    assert.deepEqual(resEmpty.mcq, []);
    assert.deepEqual(resEmpty.tf, []);

    const resWhitespace = SmartImporter.parseText('   \n\n   ');
    assert.deepEqual(resWhitespace.mcq, []);
  });
});

describe('Phase 06 — 2. Printable Exam Studio Engine', () => {
  const sampleExam = {
    title: 'Đề Khảo Sát Lịch Sử 12 Chuẩn MOET',
    duration: 50,
    questions: [
      {
        type: 'mcq',
        question: 'Hiệp ước nào đánh dấu sự thành lập Cộng đồng châu Âu (EC)?',
        options: ['Hiệp ước Rô-ma.', 'Hiệp ước Ma-xtrích.', 'Hiệp ước Pa-ri.', 'Hiệp ước Vác-sa-va.'],
        correctAnswer: 1,
        explanation: 'Hiệp ước Ma-xtrích năm 1991 thành lập Liên minh châu Âu (EU).'
      },
      {
        type: 'tf-group',
        passage: 'Đoạn tư liệu về công cuộc Đổi mới năm 1986 tại Việt Nam...',
        statements: [
          { statement: 'Đổi mới kinh tế là trọng tâm.', correct: true, explanation: 'Chính xác' },
          { statement: 'Xóa bỏ bao cấp chuyển sang kinh tế thị trường định hướng XHCN.', correct: true, explanation: 'Chính xác' },
          { statement: 'Từ bỏ sự lãnh đạo của Đảng Cộng sản.', correct: false, explanation: 'Sai' },
          { statement: 'Chủ động hội nhập kinh tế quốc tế.', correct: true, explanation: 'Chính xác' }
        ]
      }
    ]
  };

  test('Renders A4 two-column exam paper with school & candidate header', () => {
    PrintableExam.currentExam = sampleExam;
    const paperHtml = PrintableExam.renderExamPaper();
    assert.ok(paperHtml.includes('exam-header-grid'), 'Must contain standard exam header grid');
    assert.ok(paperHtml.includes('Họ và tên thí sinh:'), 'Must include candidate field');
    assert.ok(paperHtml.includes('PHẦN I'), 'Must include Section I header');
    assert.ok(paperHtml.includes('PHẦN II'), 'Must include Section II header');
    assert.ok(paperHtml.includes('Hiệp ước Rô-ma'), 'Must contain question option text');
  });

  test('Renders standard MOET OMR bubble sheet with MCQ and TF bubble grids', () => {
    PrintableExam.currentExam = sampleExam;
    const omrHtml = PrintableExam.renderOmrSheet();
    assert.ok(omrHtml.includes('PHIẾU TRẢ LỜI TRẮC NGHIỆM'), 'Must contain OMR title');
    assert.ok(omrHtml.includes('class="bubble"'), 'Must render circular bubbles');
    assert.ok(omrHtml.includes('omr-tf-grid'), 'Must render True/False 4-statement grid');
  });

  test('Renders answer key & MOET Decision 764 scoring matrix table', () => {
    PrintableExam.currentExam = sampleExam;
    const keyHtml = PrintableExam.renderAnswerKey();
    assert.ok(keyHtml.includes('HƯỚNG DẪN CHẤM & ĐÁP ÁN ĐỀ THI'), 'Must contain answer key title');
    assert.ok(keyHtml.includes('Quyết định 764/QĐ-BGDĐT'), 'Must cite Decision 764');
    assert.ok(keyHtml.includes('0.1 điểm'), 'Must show 1 statement = 0.1 pt');
    assert.ok(keyHtml.includes('1.0 điểm'), 'Must show 4 statements = 1.0 pt');
  });
});

describe('Phase 06 — 3. Lịch Sử 12 Curriculum Question Bank Integrity', () => {
  const filePath = path.join(__dirname, '..', 'data', 'lichsu12.json');

  test('data/lichsu12.json exists and is valid JSON', () => {
    assert.ok(fs.existsSync(filePath), 'lichsu12.json must exist');
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    assert.equal(data.subject, 'Lịch sử 12');
    assert.ok(Array.isArray(data.lessons), 'Must have lessons array');
    assert.equal(data.lessons.length, 9, 'Must contain 9 core lessons for Grade 12');
  });

  test('All 9 lessons contain exactly 10 MCQs and 2 True/False groups (MOET standard)', () => {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    let totalMcq = 0;
    let totalTf = 0;
    let totalStatements = 0;

    data.lessons.forEach((l, index) => {
      assert.equal(l.bai, index + 1, `Lesson index must match bai number ${index + 1}`);
      assert.ok(l.title && l.title.length > 5, `Lesson ${l.bai} must have a descriptive title`);
      assert.ok(Array.isArray(l.questions), `Lesson ${l.bai} must have questions array`);
      assert.equal(l.questions.length, 10, `Lesson ${l.bai} must have exactly 10 MCQs`);
      totalMcq += l.questions.length;

      // Validate each MCQ
      l.questions.forEach((q, qIdx) => {
        assert.equal(q.type, 'mcq');
        assert.ok(q.question && q.question.length > 5, `Question ${q.id} must have question text`);
        assert.equal(q.options.length, 4, `Question ${q.id} must have 4 options`);
        assert.ok([0, 1, 2, 3].includes(q.correctAnswer), `Question ${q.id} correctAnswer must be 0-3`);
        assert.ok(q.explanation && q.explanation.length > 5, `Question ${q.id} must have pedagogical explanation`);
      });

      // Validate each TF Group
      assert.ok(Array.isArray(l.questionGroups), `Lesson ${l.bai} must have questionGroups array`);
      assert.equal(l.questionGroups.length, 2, `Lesson ${l.bai} must have 2 True/False groups`);
      totalTf += l.questionGroups.length;

      l.questionGroups.forEach((g) => {
        assert.equal(g.type, 'tf-group');
        assert.ok(g.passage && g.passage.length > 10, `TF Group ${g.id} must have passage context`);
        assert.equal(g.statements.length, 4, `TF Group ${g.id} must have 4 statements`);
        totalStatements += g.statements.length;

        g.statements.forEach((stmt) => {
          assert.equal(typeof stmt.correct, 'boolean', `Statement in ${g.id} must have boolean correct`);
          assert.ok(stmt.statement && stmt.statement.length > 3, 'Statement must have text');
          assert.ok(stmt.explanation && stmt.explanation.length > 3, 'Statement must have explanation');
        });
      });
    });

    assert.equal(totalMcq, 90, 'Total Grade 12 MCQ pool must be 90 questions');
    assert.equal(totalTf, 18, 'Total Grade 12 TF groups must be 18');
    assert.equal(totalStatements, 72, 'Total Grade 12 TF statements must be 72 (18 * 4)');
  });

  test('subjects.json includes lichsu12 as an active, ready subject for Grade 12', () => {
    const subjectsPath = path.join(__dirname, '..', 'data', 'subjects.json');
    const subjectsData = JSON.parse(fs.readFileSync(subjectsPath, 'utf8'));

    const ls12 = subjectsData.subjects.find(s => s.id === 'lichsu12');
    assert.ok(ls12, 'lichsu12 must exist in subjects catalog');
    assert.equal(ls12.grade, 12, 'Grade must be 12');
    assert.equal(ls12.ready, true, 'Ready must be true');
    assert.equal(ls12.status, 'active', 'Status must be active');
    assert.equal(ls12.dataFile, 'lichsu12.json', 'dataFile must point to lichsu12.json');
  });
});

describe('Phase 06 — 4. PWA Manifest & App Shell Integration', () => {
  test('public/manifest.json is valid and configured for standalone PWA', () => {
    const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.ok(manifest.name.includes('NTMK'), 'PWA name must include NTMK');
    assert.equal(manifest.display, 'standalone', 'PWA display mode must be standalone');
    assert.ok(manifest.theme_color, 'Must define theme_color');
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'Must define app icons');
  });

  test('public/sw.js exists and implements caching rules', () => {
    const swPath = path.join(__dirname, '..', 'public', 'sw.js');
    assert.ok(fs.existsSync(swPath), 'sw.js must exist');
    const swContent = fs.readFileSync(swPath, 'utf8');
    assert.ok(swContent.includes('STATIC_SHELL'), 'sw.js must define pre-cached static shell');
    assert.ok(swContent.includes('smart-importer.js'), 'sw.js must cache smart-importer.js');
    assert.ok(swContent.includes('printable-exam.js'), 'sw.js must cache printable-exam.js');
    assert.ok(swContent.includes('cache.match') || swContent.includes('caches.match'), 'sw.js must handle offline cache matching');
  });
});
