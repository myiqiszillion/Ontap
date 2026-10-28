# Kế Hoạch Cải Tiến Toàn Diện Toàn Bộ Nền Tảng Ôn Tập THPT NTMK

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Nâng cấp toàn diện nền tảng ôn tập THPT Nguyễn Thị Minh Khai (TP. Dĩ An, Tỉnh Bình Dương) lên chuẩn giáo dục số thế hệ mới: kích hoạt ngân hàng câu hỏi Khối 11 & 12 theo Quyết định 764/QĐ-BGDĐT, tích hợp bộ gõ công thức KaTeX Live Preview, hệ thống Lời giải sư phạm tương tác, Sổ tay câu sai Leitner Spaced Repetition, Studio xuất bản đề thi A4 kèm phiếu tô OMR chuẩn Bộ, và thanh lọc 100% emoji thô còn sót lại.

**Architecture:** Mở rộng kiến trúc client-server tĩnh/nhẹ không phụ thuộc backend nặng: dữ liệu câu hỏi chuẩn hóa Schema V2 JSON phân tầng theo khối lớp [10, 11, 12]; giao diện đáp ứng Dual-Theme (Athenaeum Parchment Light & Obsidian Glass Dark); xử lý công thức toán học và ký hiệu hóa học bằng KaTeX với cơ chế offline fallback an toàn; thuật toán ghi nhớ lặp lại ngắt quãng Leitner 4 hộp đồng bộ `localStorage` và IndexedDB.

**Tech Stack:** Node.js Express, Vanilla JavaScript ES2022 (Zero heavy client framework), KaTeX 0.16.9, Lucide SVG Engine, HTML5 Print Stylesheet, CSS Variables Design System (WCAG 2.2 AAA), Node.js Test Runner (`node --test`).

---

### Task 1: Kích hoạt Ngân hàng Câu hỏi Khối 11 & Khối 12 Chuẩn QĐ 764

**Files:**
- Create: `data/toan11.json`
- Create: `data/vatli11.json`
- Create: `data/hoahoc11.json`
- Create: `data/tienganh11.json`
- Create: `data/toan12.json`
- Create: `data/vatli12.json`
- Create: `data/hoahoc12.json`
- Create: `data/tienganh12.json`
- Modify: `data/subjects.json`
- Test: `tests/curriculum-expansion-11-12.test.js`

**Step 1: Viết test kiểm tra tính toàn vẹn của ngân hàng dữ liệu Khối 11 & 12**

Tạo file `tests/curriculum-expansion-11-12.test.js`:
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Curriculum Expansion — Grades 11 & 12 Data Integrity', () => {
  const subjectsPath = path.join(__dirname, '../data/subjects.json');
  const subjectsData = JSON.parse(fs.readFileSync(subjectsPath, 'utf8'));

  test('1.1 subjects.json has active and ready status for all 4 core subjects in Grade 11 and 12', () => {
    const required = [
      'toan11', 'vatli11', 'hoahoc11', 'tienganh11',
      'toan12', 'vatli12', 'hoahoc12', 'tienganh12'
    ];
    for (const subId of required) {
      const sub = subjectsData.subjects.find(s => s.id === subId);
      assert.ok(sub, `Subject ${subId} must exist in subjects.json`);
      assert.equal(sub.ready, true, `${subId} must have ready=true`);
      assert.equal(sub.status, 'active', `${subId} must have status=active`);
      assert.ok(sub.dataFile, `${subId} must have a defined dataFile`);
    }
  });

  test('1.2 Question bank files for Grades 11 & 12 exist, valid JSON, and follow Decision 764 schema', () => {
    const files = [
      'toan11.json', 'vatli11.json', 'hoahoc11.json', 'tienganh11.json',
      'toan12.json', 'vatli12.json', 'hoahoc12.json', 'tienganh12.json'
    ];
    for (const file of files) {
      const filePath = path.join(__dirname, '../data', file);
      assert.ok(fs.existsSync(filePath), `File ${file} must exist in data/`);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      assert.ok(content.lessons && Array.isArray(content.lessons), `${file} must have lessons array`);
      assert.ok(content.lessons.length > 0, `${file} must have at least one lesson`);

      let totalQuestions = 0;
      for (const lesson of content.lessons) {
        totalQuestions += (lesson.questions || []).length;
        if (lesson.questionGroups) {
          totalQuestions += lesson.questionGroups.length;
        }
      }
      assert.ok(totalQuestions >= 5, `${file} must contain at least 5 verified questions`);
    }
  });
});
```

**Step 2: Chạy test để xác nhận test thất bại (RED)**
Run: `node --test tests/curriculum-expansion-11-12.test.js`
Expected: FAIL (files missing and ready=false in subjects.json).

**Step 3: Triển khai nội dung câu hỏi Khối 11 & 12 và cập nhật `subjects.json` (GREEN)**
- Tạo các file `data/toan11.json`, `data/vatli11.json`, `data/hoahoc11.json`, `data/tienganh11.json` chuẩn chương trình GDPT 2018.
- Tạo các file `data/toan12.json`, `data/vatli12.json`, `data/hoahoc12.json`, `data/tienganh12.json` chuẩn cấu trúc thi tốt nghiệp THPT theo Quyết định 764/QĐ-BGDĐT.
- Cập nhật `data/subjects.json` đặt `status: "active"` và `ready: true` cho cả 8 môn học.

**Step 4: Chạy lại test để xác nhận PASS**
Run: `node --test tests/curriculum-expansion-11-12.test.js`
Expected: PASS (2 tests pass).

**Step 5: Commit**
```bash
git add data/ tests/curriculum-expansion-11-12.test.js
git commit -m "feat(curriculum): activate Grade 11 and 12 question banks for core GDPT 2018 subjects"
```

---

### Task 2: KaTeX Live Formula Preview & Nâng Cấp Bàn Phím Toán Học (Part III)

**Files:**
- Modify: `public/js/quiz.js`
- Modify: `public/css/athenaeum-theme.css`
- Test: `tests/math-preview-and-keypad.test.js`

**Step 1: Viết test kiểm tra bộ gõ và Live Preview KaTeX**

Tạo file `tests/math-preview-and-keypad.test.js`:
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Quick Math Keypad & Real-time Live Formula Preview', () => {
  const quizJs = fs.readFileSync(path.join(__dirname, '../public/js/quiz.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/css/athenaeum-theme.css'), 'utf8');

  test('2.1 Quiz contains live math preview generator and debounced KaTeX renderer', () => {
    assert.ok(quizJs.includes('sa-math-live-preview'), 'quiz.js must render .sa-math-live-preview container');
    assert.ok(quizJs.includes('updateMathPreview'), 'quiz.js must include updateMathPreview method');
    assert.ok(quizJs.includes('insertMathSymbol'), 'quiz.js must include insertMathSymbol method');
  });

  test('2.2 athenaeum-theme.css contains dual-theme rules for sa-math-live-preview', () => {
    assert.ok(css.includes('.sa-math-live-preview'), 'CSS must style .sa-math-live-preview');
    assert.ok(css.includes(':root:not([data-theme="dark"]) .sa-math-live-preview') || 
              css.includes('body:not([data-theme="dark"]) .sa-math-live-preview'), 'Must have light mode style');
    assert.ok(css.includes('[data-theme="dark"] .sa-math-live-preview'), 'Must have dark mode style');
  });
});
```

**Step 2: Chạy test xác nhận FAIL**
Run: `node --test tests/math-preview-and-keypad.test.js`
Expected: FAIL.

**Step 3: Triển khai Live Preview trong `public/js/quiz.js` và CSS**
- Thêm `updateMathPreview(rawVal)` vào `Quiz`: tự động chuyển đổi các mẫu số học thông dụng (`1/2` $\rightarrow$ `\frac{1}{2}`, `sqrt(x)` $\rightarrow$ `\sqrt{x}`, `x^2` $\rightarrow$ `x^2`) và render KaTeX trực tiếp dưới ô nhập liệu.
- Bổ sung phím phân số `[a/b]`, lũy thừa `[x²]` vào `.sa-math-keypad`.
- Thêm CSS cho `.sa-math-live-preview` với hiệu ứng viền thẻ kính mờ, typography hiển thị rõ nét KaTeX.

**Step 4: Chạy test xác nhận PASS**
Run: `node --test tests/math-preview-and-keypad.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add public/js/quiz.js public/css/athenaeum-theme.css tests/math-preview-and-keypad.test.js
git commit -m "feat(quiz): add real-time KaTeX formula live preview and expanded math keypad"
```

---

### Task 3: Hệ Thống Lời Giải Sư Phạm Chi Tiết (Solution Accordion & Pitfalls)

**Files:**
- Modify: `public/js/quiz.js`
- Modify: `public/js/study.js`
- Modify: `public/css/athenaeum-theme.css`
- Test: `tests/pedagogical-solution-accordion.test.js`

**Step 1: Viết test cho Solution Accordion**

Tạo file `tests/pedagogical-solution-accordion.test.js`:
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Pedagogical Solution Accordion & Step-by-Step Breakdown', () => {
  const quizJs = fs.readFileSync(path.join(__dirname, '../public/js/quiz.js'), 'utf8');
  const studyJs = fs.readFileSync(path.join(__dirname, '../public/js/study.js'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../public/css/athenaeum-theme.css'), 'utf8');

  test('3.1 quiz.js and study.js render structured pedagogical solution blocks', () => {
    assert.ok(quizJs.includes('solution-accordion') || quizJs.includes('renderStructuredSolution'), 
              'quiz.js must support structured solutions');
    assert.ok(studyJs.includes('solution-accordion') || studyJs.includes('renderStructuredSolution'), 
              'study.js must support structured solutions');
  });

  test('3.2 Solution styles support step-by-step numbers and common pitfalls callout', () => {
    assert.ok(css.includes('.solution-step-item') || css.includes('.solution-steps'), 
              'CSS must style solution steps');
    assert.ok(css.includes('.pitfall-callout') || css.includes('.solution-pitfall'), 
              'CSS must style common pitfall alerts');
  });
});
```

**Step 2: Chạy test xác nhận FAIL**
Run: `node --test tests/pedagogical-solution-accordion.test.js`
Expected: FAIL.

**Step 3: Triển khai component Lời giải sư phạm tương tác**
- Viết hàm `renderStructuredSolution(q)` định dạng lời giải thành 3 khối:
  1. **Phương pháp giải & Công thức áp dụng:** Nổi bật công thức chính.
  2. **Các bước giải chi tiết:** Có số thứ tự Bước 1, Bước 2, Bước 3.
  3. **Lưu ý bẫy đề thi:** Cảnh báo những nhầm lẫn học sinh hay mắc phải.
- Style Accordion đóng/mở mượt mà trên cả Light Mode và Dark Mode.

**Step 4: Chạy test xác nhận PASS**
Run: `node --test tests/pedagogical-solution-accordion.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add public/js/quiz.js public/js/study.js public/css/athenaeum-theme.css tests/pedagogical-solution-accordion.test.js
git commit -m "feat(pedagogy): add interactive structured solution accordions with step breakdown"
```

---

### Task 4: Sổ Tay Câu Sai (Mistakes Notebook) Leitner Spaced Repetition Supercharger

**Files:**
- Modify: `public/js/mistakes.js`
- Modify: `public/css/mistakes.css`
- Modify: `public/css/athenaeum-theme.css`
- Test: `tests/mistakes-leitner-spaced-repetition.test.js`

**Step 1: Viết test cho thuật toán Leitner Spaced Repetition**

Tạo file `tests/mistakes-leitner-spaced-repetition.test.js`:
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Mistakes Notebook — Leitner Spaced Repetition Engine', () => {
  const mistakesJs = fs.readFileSync(path.join(__dirname, '../public/js/mistakes.js'), 'utf8');

  test('4.1 Mistakes Notebook defines 4 Leitner spaced repetition boxes', () => {
    assert.ok(mistakesJs.includes('leitnerBox') || mistakesJs.includes('LEITNER_BOXES'), 
              'mistakes.js must track Leitner boxes');
    assert.ok(mistakesJs.includes('promoteMistake') || mistakesJs.includes('demoteMistake') || mistakesJs.includes('recordReview'), 
              'mistakes.js must provide promotion/demotion progression');
  });

  test('4.2 Supports mistake tagging and 1-click custom exam generator', () => {
    assert.ok(mistakesJs.includes('errorReason') || mistakesJs.includes('ERROR_REASONS'), 
              'mistakes.js must support categorizing mistake reasons');
    assert.ok(mistakesJs.includes('createMistakeExam') || mistakesJs.includes('generatePracticeSession'), 
              'mistakes.js must generate practice exam directly from mistakes');
  });
});
```

**Step 2: Chạy test xác nhận FAIL**
Run: `node --test tests/mistakes-leitner-spaced-repetition.test.js`
Expected: FAIL.

**Step 3: Triển khai thuật toán Leitner trong `public/js/mistakes.js`**
- Thiết lập 4 Hộp Leitner:
  - Hộp 1: Ôn luyện hàng ngày (vừa làm sai)
  - Hộp 2: Ôn luyện sau 3 ngày
  - Hộp 3: Ôn luyện sau 7 ngày
  - Hộp 4: Đã khắc phục hoàn toàn (Mastered)
- Gắn thẻ nguyên nhân sai: `"Đọc nhầm đề"`, `"Tính toán sai"`, `"Quên công thức"`, `"Chưa nắm lý thuyết"`.
- Nút bấm `Tạo bài thi từ câu sai` chuyển ngay sang chế độ thi với danh sách câu sai được chọn.

**Step 4: Chạy test xác nhận PASS**
Run: `node --test tests/mistakes-leitner-spaced-repetition.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add public/js/mistakes.js public/css/mistakes.css public/css/athenaeum-theme.css tests/mistakes-leitner-spaced-repetition.test.js
git commit -m "feat(mistakes): upgrade mistakes notebook with 4-box Leitner spaced repetition engine"
```

---

### Task 5: Studio In Ấn Đề Thi A4 & Phiếu Tô Trắc Nghiệm OMR Chuẩn Bộ GD&ĐT

**Files:**
- Modify: `public/js/printable-exam.js`
- Modify: `public/css/printable-exam.css`
- Test: `tests/printable-exam-studio.test.js`

**Step 1: Viết test cho Printable Exam Studio**

Tạo file `tests/printable-exam-studio.test.js`:
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Printable Exam Studio & MOET 2025/2026 OMR Bubble Sheet', () => {
  const printJs = fs.readFileSync(path.join(__dirname, '../public/js/printable-exam.js'), 'utf8');
  const printCss = fs.readFileSync(path.join(__dirname, '../public/css/printable-exam.css'), 'utf8');

  test('5.1 printable-exam.js contains zero raw emojis in toolbar and preview buttons', () => {
    const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    assert.equal(emojiRegex.test(printJs), false, 'printable-exam.js must have zero raw emojis');
  });

  test('5.2 printable-exam.js includes official THPT Nguyễn Thị Minh Khai header template', () => {
    assert.ok(printJs.includes('THPT NGUYỄN THỊ MINH KHAI') || printJs.includes('BÌNH DƯƠNG'), 
              'Print template must feature THPT Nguyen Thi Minh Khai Binh Duong');
    assert.ok(printJs.includes('renderOMRSheet'), 'Must generate MOET standard OMR bubble sheet');
  });

  test('5.3 CSS contains @media print rules for true A4 multi-column layout', () => {
    assert.ok(printCss.includes('@media print'), 'Must have print media stylesheet');
    assert.ok(printCss.includes('column-count') || printCss.includes('columns'), 'Must support multi-column A4 exam paper');
  });
});
```

**Step 2: Chạy test xác nhận FAIL**
Run: `node --test tests/printable-exam-studio.test.js`
Expected: FAIL.

**Step 3: Triển khai hoàn thiện Studio In ấn**
- Thay toàn bộ emoji (`🖨️`, `📄`, `⭕`, `🔑`) bằng Lucide SVGs trong `public/js/printable-exam.js`.
- Tạo tiêu đề đề thi chính thức:
  ```
  SỞ GIÁO DỤC VÀ ĐÀO TẠO BÌNH DƯƠNG        ĐỀ KHẢO SÁT CHẤT LƯỢNG GDPT 2018
  TRƯỜNG THPT NGUYỄN THỊ MINH KHAI          NĂM HỌC 2025 - 2026
  (Đề thi gồm 04 trang)                     MÃ ĐỀ THI: 101
  ```
- Hoàn thiện lưới phiếu tô OMR chuẩn 3 phần (Phần I: A/B/C/D, Phần II: Đ/S cho 4 ý a/b/c/d, Phần III: Tô số thập phân 4 ô).

**Step 4: Chạy test xác nhận PASS**
Run: `node --test tests/printable-exam-studio.test.js`
Expected: PASS.

**Step 5: Commit**
```bash
git add public/js/printable-exam.js public/css/printable-exam.css tests/printable-exam-studio.test.js
git commit -m "feat(print): enhance printable exam studio with official THPT NTMK header and MOET OMR sheet"
```

---

### Task 6: Thanh Lọc 100% Emoji Thô & Kiểm Định Toàn Diện WAVE AAA

**Files:**
- Modify: `public/js/command-palette.js`
- Modify: `public/js/diagnostic-view.js`
- Modify: `public/js/planner-view.js`
- Modify: `public/js/auth-view.js`
- Modify: `public/js/checker.js`
- Modify: `public/js/onboarding.js`
- Modify: `public/js/admin.js`
- Modify: `public/js/icons.js`
- Test: `tests/zero-emojis-strict-audit.test.js`

**Step 1: Viết test kiểm định 100% không còn emoji trong toàn bộ mã nguồn JS**

Tạo file `tests/zero-emojis-strict-audit.test.js`:
```javascript
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Strict Quality Assurance — Zero Raw Emojis in Public Scripts', () => {
  const publicJsDir = path.join(__dirname, '../public/js');
  const jsFiles = fs.readdirSync(publicJsDir).filter(f => f.endsWith('.js'));
  const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

  for (const file of jsFiles) {
    test(`File ${file} must contain zero raw emojis`, () => {
      const content = fs.readFileSync(path.join(publicJsDir, file), 'utf8');
      const hasEmoji = emojiRegex.test(content);
      assert.equal(hasEmoji, false, `File ${file} contains raw emojis that must be replaced by Lucide SVGs`);
    });
  }
});
```

**Step 2: Chạy test xác nhận FAIL**
Run: `node --test tests/zero-emojis-strict-audit.test.js`
Expected: FAIL (files with emojis listed).

**Step 3: Thay thế toàn bộ emoji bằng `Icons.get(...)`**
- Bổ sung các icon còn thiếu vào `public/js/icons.js`: `printer`, `file-text`, `key`, `circle-dot`, `target`, `zap`, `flame`, `compass`, `alert-triangle`, `brain`, `calendar-check`, `file-question`.
- Quét và thay thế triệt để các chuỗi emoji trong `command-palette.js`, `diagnostic-view.js`, `planner-view.js`, `auth-view.js`, `checker.js`, `onboarding.js`, `admin.js`.

**Step 4: Chạy test xác nhận PASS**
Run: `node --test tests/zero-emojis-strict-audit.test.js`
Expected: PASS (tất cả các file đều sạch emoji).

**Step 5: Chạy lại toàn bộ test suite (`npm test`) & Playwright visual audit**
Run: `npm test`
Expected: PASS (Tất cả bài test cũ và mới đều vượt qua).
Run: `node scratch/capture_full_dual_theme_audit.js`
Expected: 16/16 màn hình hoàn mỹ.

**Step 6: Commit & Push**
```bash
git add .
git commit -m "fix(quality): eliminate 100% of raw emojis and enforce full dual-theme consistency across all modules"
git push origin main
```
