const { describe, it, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const PrintableExam = require('../public/js/printable-exam.js');

const sampleExam = {
  id: 'exam-thpt-2026',
  title: 'Khảo sát chất lượng Lịch sử & GDPT 2018',
  subject: 'Lịch sử',
  duration: 50,
  durationMinutes: 50,
  questions: [
    // Part I: MCQ (12 questions)
    { id: 'q1', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 1: Sự kiện nào đánh dấu...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 0 },
    { id: 'q2', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 2: Tổ chức nào được thành lập...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 1 },
    { id: 'q3', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 3: Chiến dịch lịch sử...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 2 },
    { id: 'q4', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 4: Hiệp định Geneve được ký...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 3 },
    { id: 'q5', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 5: Đại hội toàn quốc lần thứ VI...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 0 },
    { id: 'q6', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 6: Năm 1995 Việt Nam gia nhập...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 1 },
    { id: 'q7', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 7: Khởi nghĩa Yên Thế kéo dài...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 2 },
    { id: 'q8', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 8: Phong trào Cần Vương do...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 3 },
    { id: 'q9', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 9: Nguyễn Ái Quốc đọc Sơ thảo...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 0 },
    { id: 'q10', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 10: Hội nghị BCH TW Đảng...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 1 },
    { id: 'q11', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 11: Cách mạng tháng Tám năm 1945...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 2 },
    { id: 'q12', type: 'mcq', format: 'multiple_choice', question: 'Câu hỏi 12: Thắng lợi của chiến dịch...', options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'], correctAnswer: 3 },

    // Part II: True/False Groups (4 questions)
    {
      id: 'tf1',
      type: 'tf-group',
      format: 'true_false_group',
      passage: 'Đoạn tư liệu về công cuộc Đổi mới năm 1986 tại Việt Nam...',
      statements: [
        { statement: 'Đổi mới kinh tế là trọng tâm.', correct: true },
        { statement: 'Xóa bỏ bao cấp chuyển sang kinh tế thị trường.', correct: true },
        { statement: 'Từ bỏ sự lãnh đạo của Đảng.', correct: false },
        { statement: 'Chủ động hội nhập kinh tế quốc tế.', correct: true }
      ]
    },
    {
      id: 'tf2',
      type: 'tf-group',
      format: 'true_false_group',
      passage: 'Đoạn tư liệu về phong trào giải phóng dân tộc...',
      statements: [
        { statement: 'Năm 1960 là Năm châu Phi.', correct: true },
        { statement: 'Chủ nghĩa thực dân sụp đổ hoàn toàn.', correct: true },
        { statement: 'Hệ thống thuộc địa tan rã từng mảng.', correct: true },
        { statement: 'Các nước giành độc lập đều theo TBCN.', correct: false }
      ]
    },
    {
      id: 'tf3',
      type: 'tf-group',
      format: 'true_false_group',
      passage: 'Tư liệu về xu thế toàn cầu hóa...',
      statements: [
        { statement: 'Toàn cầu hóa là xu thế khách quan.', correct: true },
        { statement: 'Tạo cơ hội phát triển cho các nước đang phát triển.', correct: true },
        { statement: 'Không đem lại thách thức nào về an ninh kinh tế.', correct: false },
        { statement: 'Thúc đẩy giao lưu văn hóa quốc tế.', correct: true }
      ]
    },
    {
      id: 'tf4',
      type: 'tf-group',
      format: 'true_false_group',
      passage: 'Tư liệu về cuộc cách mạng công nghiệp lần thứ tư...',
      statements: [
        { statement: 'Dựa trên nền tảng công nghệ số và AI.', correct: true },
        { statement: 'Làm biến đổi nhanh chóng cơ cấu lao động.', correct: true },
        { statement: 'Chỉ tác động đến các nước phát triển.', correct: false },
        { statement: 'Yêu cầu chuyển đổi số toàn diện giáo dục.', correct: true }
      ]
    },

    // Part III: Short Answer (6 questions)
    { id: 'sa1', type: 'short_answer', format: 'short_answer', question: 'Năm diễn ra Cách mạng tháng Tám là năm nào?', correctAnswer: '1945' },
    { id: 'sa2', type: 'short_answer', format: 'short_answer', question: 'Số nước sáng lập ASEAN ban đầu là bao nhiêu?', correctAnswer: '5' },
    { id: 'sa3', type: 'short_answer', format: 'short_answer', question: 'Tỉ lệ tăng trưởng kinh tế trung bình (%) trong kỳ?', correctAnswer: '7,5' },
    { id: 'sa4', type: 'short_answer', format: 'short_answer', question: 'Mức chênh lệch nhiệt độ đo được (°C)?', correctAnswer: '-2,5' },
    { id: 'sa5', type: 'short_answer', format: 'short_answer', question: 'Tính hệ số co giãn k:', correctAnswer: '0,85' },
    { id: 'sa6', type: 'short_answer', format: 'short_answer', question: 'Số đại biểu tham dự hội nghị:', correctAnswer: '120' }
  ]
};

describe('Printable Exam Studio & MOET 2025/2026 Layout Specifications', () => {

  test('1. Verify public/js/printable-exam.js has ZERO raw emojis (checked via Unicode regex)', () => {
    const filePath = path.join(__dirname, '..', 'public', 'js', 'printable-exam.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Unicode regex for emojis (emoticons, symbols, pictographs, transport, misc symbols)
    const emojiRegex = /(?:[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{2B50}-\u{2B55}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}])/u;

    const matches = [...content.matchAll(new RegExp(emojiRegex, 'gu'))].map(m => m[0]);
    assert.deepEqual(
      matches,
      [],
      `printable-exam.js must have ZERO raw emojis. Found raw emojis: ${JSON.stringify(matches)}`
    );
  });

  test('2. Verify print header contains "SỞ GIÁO DỤC VÀ ĐÀO TẠO BÌNH DƯƠNG" and "TRƯỜNG THPT NGUYỄN THỊ MINH KHAI"', () => {
    PrintableExam.currentExam = sampleExam;
    const paperHtml = PrintableExam.renderExamPaper('101');

    assert.ok(
      paperHtml.includes('SỞ GIÁO DỤC VÀ ĐÀO TẠO BÌNH DƯƠNG'),
      'Must contain exact school authority header: "SỞ GIÁO DỤC VÀ ĐÀO TẠO BÌNH DƯƠNG"'
    );
    assert.ok(
      paperHtml.includes('TRƯỜNG THPT NGUYỄN THỊ MINH KHAI'),
      'Must contain exact school header: "TRƯỜNG THPT NGUYỄN THỊ MINH KHAI"'
    );
    assert.ok(
      paperHtml.includes('MÃ ĐỀ'),
      'Must include exam code indicator'
    );
  });

  test('3. Verify renderOMRSheet generates all 3 parts of MOET QĐ 764 bubble sheet with student info block', () => {
    PrintableExam.currentExam = sampleExam;
    const omrHtml = PrintableExam.renderOMRSheet(sampleExam, '101');

    // Student Info Block verification
    assert.ok(omrHtml.includes('Số báo danh'), 'Must contain student field: Số báo danh');
    assert.ok(omrHtml.includes('Họ và tên'), 'Must contain student field: Họ và tên');
    assert.ok(omrHtml.includes('Phòng thi'), 'Must contain student field: Phòng thi');

    // Part I: MCQ with A, B, C, D bubbles
    assert.ok(omrHtml.includes('PHẦN I'), 'Must contain PHẦN I header');
    assert.ok(omrHtml.includes('omr-mcq-grid'), 'Must render MCQ bubble grid');
    assert.ok(omrHtml.includes('>A<') && omrHtml.includes('>B<') && omrHtml.includes('>C<') && omrHtml.includes('>D<'), 'Part I must have A/B/C/D bubbles');

    // Part II: True/False with a,b,c,d statements and Đ/S bubbles
    assert.ok(omrHtml.includes('PHẦN II'), 'Must contain PHẦN II header');
    assert.ok(omrHtml.includes('omr-tf-grid'), 'Must render True/False grid');
    assert.ok(omrHtml.includes('>Đ<') && omrHtml.includes('>S<'), 'Part II must have Đúng/Sai bubbles');
    assert.ok(omrHtml.includes('sub-letter">a<') || omrHtml.includes('sub-letter">a</span>'), 'Part II must have statement letter a');
    assert.ok(omrHtml.includes('sub-letter">d<') || omrHtml.includes('sub-letter">d</span>'), 'Part II must have statement letter d');

    // Part III: Short answer grid with digits 0-9 and -, ,
    assert.ok(omrHtml.includes('PHẦN III'), 'Must contain PHẦN III header for short answer questions');
    assert.ok(omrHtml.includes('omr-sa-grid'), 'Must render Short Answer bubble grid');
    assert.ok(omrHtml.includes('>-<'), 'Part III must include negative sign bubble "-"');
    assert.ok(omrHtml.includes('>,<'), 'Part III must include comma bubble ","');
    for (let d = 0; d <= 9; d++) {
      assert.ok(omrHtml.includes(`>${d}<`), `Part III must include digit bubble "${d}"`);
    }
  });

  test('4. Verify multi-code exam variant generation (Mã đề 101, 102, 103, 104) with randomized/seeded question shuffling', () => {
    assert.equal(typeof PrintableExam.generateVariant, 'function', 'generateVariant must be a function');

    const v101 = PrintableExam.generateVariant(sampleExam, '101');
    const v102 = PrintableExam.generateVariant(sampleExam, '102');
    const v103 = PrintableExam.generateVariant(sampleExam, '103');
    const v104 = PrintableExam.generateVariant(sampleExam, '104');

    assert.equal(v101.variantCode, '101');
    assert.equal(v102.variantCode, '102');
    assert.equal(v103.variantCode, '103');
    assert.equal(v104.variantCode, '104');

    // Total question count preserved
    assert.equal(v101.questions.length, sampleExam.questions.length);
    assert.equal(v102.questions.length, sampleExam.questions.length);
    assert.equal(v103.questions.length, sampleExam.questions.length);
    assert.equal(v104.questions.length, sampleExam.questions.length);

    // Seeded shuffle: same variant returns identical question ordering (deterministic)
    const v102Again = PrintableExam.generateVariant(sampleExam, '102');
    assert.deepEqual(
      v102.questions.map(q => q.id),
      v102Again.questions.map(q => q.id),
      'Same variant code must produce deterministic ordering'
    );

    // Different variants have shuffled question orders
    const mcq101 = v101.questions.filter(q => q.type === 'mcq').map(q => q.id);
    const mcq102 = v102.questions.filter(q => q.type === 'mcq').map(q => q.id);
    assert.notDeepEqual(
      mcq101,
      mcq102,
      'Variant 101 and Variant 102 must have shuffled question order'
    );

    // Multi-variant switcher UI exists and generates distinct answer keys
    PrintableExam.currentExam = sampleExam;
    const key101 = PrintableExam.renderAnswerKey('101');
    const key102 = PrintableExam.renderAnswerKey('102');
    assert.ok(key101.includes('101'), 'Key 101 must indicate variant code 101');
    assert.ok(key102.includes('102'), 'Key 102 must indicate variant code 102');

    // Part III answers appear in answer key
    assert.ok(key101.includes('PHẦN III'), 'Answer key must contain Part III section');
    assert.ok(key101.includes('1945'), 'Answer key must contain short answer key "1945"');
  });

  test('5. Verify public/css/printable-exam.css contains @media print rules, A4 two-column layout, page-break-inside avoid, and optical timing marks', () => {
    const cssPath = path.join(__dirname, '..', 'public', 'css', 'printable-exam.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // @media print rules
    assert.ok(css.includes('@media print'), 'CSS must define @media print block');
    assert.ok(
      css.includes('size: A4 portrait') && css.includes('margin: 12mm 15mm'),
      'Must configure @page { size: A4 portrait; margin: 12mm 15mm; }'
    );

    // True A4 two-column layout
    assert.ok(
      css.includes('columns: 2') || css.includes('column-count: 2'),
      'Must support two-column exam layout'
    );

    // Page break rules to prevent orphaned questions
    assert.ok(
      css.includes('page-break-inside: avoid') || css.includes('break-inside: avoid'),
      'Must include page-break-inside: avoid or break-inside: avoid'
    );

    // Optical timing marks / corner calibration marks for OMR scanner
    assert.ok(
      css.includes('omr-corner-mark') || css.includes('omr-timing-mark'),
      'Must style optical timing marks or corner calibration marks for OMR sheet'
    );
  });
});
