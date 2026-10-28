const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// Mock localStorage for node environment
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

const { MistakeStore, MistakeView } = require('../public/js/mistakes.js');

describe('Task 4 — Mistakes Notebook: Leitner Spaced Repetition Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('1. Leitner Box Structure & Definitions', () => {
    it('defines 4 Leitner boxes with correct intervals and labels', () => {
      assert.ok(MistakeStore.LEITNER_BOXES, 'LEITNER_BOXES should be defined');
      const boxes = Array.isArray(MistakeStore.LEITNER_BOXES)
        ? MistakeStore.LEITNER_BOXES
        : Object.values(MistakeStore.LEITNER_BOXES);

      assert.strictEqual(boxes.length, 4, 'Should define exactly 4 Leitner boxes');
      
      const box1 = boxes.find(b => b.id === 1 || b.box === 1);
      const box2 = boxes.find(b => b.id === 2 || b.box === 2);
      const box3 = boxes.find(b => b.id === 3 || b.box === 3);
      const box4 = boxes.find(b => b.id === 4 || b.box === 4);

      assert.ok(box1, 'Box 1 exists (Daily review)');
      assert.ok(box2, 'Box 2 exists (3 days review)');
      assert.ok(box3, 'Box 3 exists (7 days review)');
      assert.ok(box4, 'Box 4 exists (Mastered)');

      assert.strictEqual(box1.intervalDays, 1);
      assert.strictEqual(box2.intervalDays, 3);
      assert.strictEqual(box3.intervalDays, 7);
    });

    it('initializes new mistakes into Leitner Box 1 with defaults', () => {
      const q = {
        id: 'q_leitner_init_1',
        question: 'Tính đạo hàm của f(x) = sin(2x)',
        options: ['2cos(2x)', 'cos(2x)', '-2cos(2x)', '-cos(2x)'],
        correctAnswer: 0
      };

      const entry = MistakeStore.recordMistake({
        subjectId: 'toan11',
        lessonName: 'Bài 3: Đạo hàm hàm lượng giác',
        question: q,
        userAnswer: 1
      });

      assert.strictEqual(entry.leitnerBox, 1, 'Default Leitner box should be 1');
      assert.ok(entry.nextReviewDate, 'nextReviewDate must be set');
      assert.strictEqual(entry.mastered, false, 'Initial state is unmastered');
      assert.deepStrictEqual(entry.reviewHistory, [], 'reviewHistory starts empty');
      assert.strictEqual(entry.errorReason, null, 'Default errorReason is null');
    });

    it('computes Leitner box distribution counts accurately', () => {
      MistakeStore.recordMistake({ subjectId: 'toan10', question: { id: 'q_c1', question: 'C1', correctAnswer: 0 } });
      MistakeStore.recordMistake({ subjectId: 'toan10', question: { id: 'q_c2', question: 'C2', correctAnswer: 0 } });
      MistakeStore.promoteMistake('q_c2'); // Moves to box 2

      const counts = MistakeStore.getLeitnerBoxCounts('toan10');
      assert.strictEqual(counts[1], 1);
      assert.strictEqual(counts[2], 1);
      assert.strictEqual(counts[3], 0);
      assert.strictEqual(counts[4], 0);
    });
  });

  describe('2. Promotion and Demotion Engine', () => {
    it('promoteMistake moves item up from Box 1 -> 2 -> 3 -> 4 and marks mastered at Box 4', () => {
      const q = { id: 'q_promo_1', question: 'Công thức tính chu vi hình tròn?', correctAnswer: 0 };
      MistakeStore.recordMistake({ subjectId: 'toan10', question: q });

      // Promote 1 -> 2
      const step1 = MistakeStore.promoteMistake('q_promo_1');
      assert.strictEqual(step1.leitnerBox, 2);
      assert.strictEqual(step1.mastered, false);
      assert.ok(step1.lastReviewedDate);

      // Promote 2 -> 3
      const step2 = MistakeStore.promoteMistake('q_promo_1');
      assert.strictEqual(step2.leitnerBox, 3);
      assert.strictEqual(step2.mastered, false);

      // Promote 3 -> 4 (Mastered)
      const step3 = MistakeStore.promoteMistake('q_promo_1');
      assert.strictEqual(step3.leitnerBox, 4);
      assert.strictEqual(step3.mastered, true);

      // Promote beyond 4 caps at 4
      const step4 = MistakeStore.promoteMistake('q_promo_1');
      assert.strictEqual(step4.leitnerBox, 4);
      assert.strictEqual(step4.mastered, true);
    });

    it('demoteMistake resets item from any higher box back to Box 1 and marks unmastered', () => {
      const q = { id: 'q_demo_1', question: 'Vận tốc là đạo hàm của quãng đường theo thời gian?', correctAnswer: 0 };
      MistakeStore.recordMistake({ subjectId: 'vatli10', question: q });

      MistakeStore.promoteMistake('q_demo_1'); // to 2
      MistakeStore.promoteMistake('q_demo_1'); // to 3
      assert.strictEqual(MistakeStore.getMistakes({ subjectId: 'vatli10' })[0].leitnerBox, 3);

      const demoted = MistakeStore.demoteMistake('q_demo_1');
      assert.strictEqual(demoted.leitnerBox, 1, 'Demoted item drops back to Box 1');
      assert.strictEqual(demoted.mastered, false, 'Demoted item is not mastered');
      assert.ok(demoted.lastReviewedDate);
    });

    it('recordReview records history and routes to promote or demote correctly', () => {
      const q = { id: 'q_rev_1', question: 'Nguyên tử khối của Fe là?', correctAnswer: 0 };
      MistakeStore.recordMistake({ subjectId: 'hoahoc10', question: q });

      // Correct review: Box 1 -> 2
      const res1 = MistakeStore.recordReview('q_rev_1', true);
      assert.strictEqual(res1.leitnerBox, 2);
      assert.strictEqual(res1.reviewHistory.length, 1);
      assert.strictEqual(res1.reviewHistory[0].isCorrect, true);
      assert.strictEqual(res1.reviewHistory[0].fromBox, 1);
      assert.strictEqual(res1.reviewHistory[0].toBox, 2);

      // Incorrect review: Box 2 -> 1
      const res2 = MistakeStore.recordReview('q_rev_1', false);
      assert.strictEqual(res2.leitnerBox, 1);
      assert.strictEqual(res2.reviewHistory.length, 2);
      assert.strictEqual(res2.reviewHistory[1].isCorrect, false);
      assert.strictEqual(res2.reviewHistory[1].fromBox, 2);
      assert.strictEqual(res2.reviewHistory[1].toBox, 1);
    });
  });

  describe('3. Error Categorization Tags', () => {
    it('defines standardized error categories (reading_trap, calc_error, forgot_formula, knowledge_gap)', () => {
      assert.ok(MistakeStore.ERROR_REASONS, 'ERROR_REASONS must be defined');
      const requiredKeys = ['reading_trap', 'calc_error', 'forgot_formula', 'knowledge_gap'];
      requiredKeys.forEach(k => {
        assert.ok(MistakeStore.ERROR_REASONS[k], `Missing error category: ${k}`);
        assert.ok(MistakeStore.ERROR_REASONS[k].label, `Category ${k} must have a descriptive label`);
      });
    });

    it('setMistakeReason updates error reason tag and persists', () => {
      const q = { id: 'q_reason_1', question: 'Tìm x để biểu thức xác định', correctAnswer: 0 };
      MistakeStore.recordMistake({ subjectId: 'toan10', question: q });

      const updated = MistakeStore.setMistakeReason('q_reason_1', 'reading_trap');
      assert.strictEqual(updated.errorReason, 'reading_trap');

      // Verify persistence via getMistakes filter
      const filtered = MistakeStore.getMistakes({ errorReason: 'reading_trap' });
      assert.strictEqual(filtered.length, 1);
      assert.strictEqual(filtered[0].id, 'q_reason_1');
    });

    it('filters mistakes by Leitner box and error reason simultaneously', () => {
      MistakeStore.recordMistake({
        subjectId: 'toan10',
        question: { id: 'q_multi_1', question: 'Q1', correctAnswer: 0 },
        errorReason: 'calc_error'
      });
      MistakeStore.recordMistake({
        subjectId: 'toan10',
        question: { id: 'q_multi_2', question: 'Q2', correctAnswer: 0 },
        errorReason: 'calc_error'
      });
      MistakeStore.promoteMistake('q_multi_2'); // Box 2

      const box1Calc = MistakeStore.getMistakes({ box: 1, errorReason: 'calc_error' });
      assert.strictEqual(box1Calc.length, 1);
      assert.strictEqual(box1Calc[0].id, 'q_multi_1');

      const box2Calc = MistakeStore.getMistakes({ box: 2, errorReason: 'calc_error' });
      assert.strictEqual(box2Calc.length, 1);
      assert.strictEqual(box2Calc[0].id, 'q_multi_2');
    });
  });

  describe('4. Custom Exam and Practice Session Generation from Mistakes', () => {
    it('createMistakeExam compiles questions and integrates with App/app', () => {
      MistakeStore.recordMistake({
        subjectId: 'toan10',
        question: { id: 'q_box1_a', question: 'Toán 10 Box 1 câu A', options: ['A','B'], correctAnswer: 0 }
      });
      MistakeStore.recordMistake({
        subjectId: 'toan10',
        question: { id: 'q_box2_b', question: 'Toán 10 Box 2 câu B', options: ['A','B'], correctAnswer: 1 }
      });
      MistakeStore.promoteMistake('q_box2_b'); // box 2

      // Mock App with startCustomExam and startLearning
      let examStartedWith = null;
      global.App = {
        startCustomExam(config) {
          examStartedWith = config;
        },
        startLearning() {}
      };

      // Filter by box 1
      const examBox1 = MistakeStore.createMistakeExam({ box: 1 });
      assert.ok(examBox1);
      assert.strictEqual(examBox1.questions.length, 1);
      assert.strictEqual(examBox1.questions[0].id, 'q_box1_a');
      assert.ok(examStartedWith, 'App.startCustomExam should be invoked');
      assert.strictEqual(examStartedWith.questions.length, 1);

      // Clean up mock
      delete global.App;
    });

    it('generatePracticeSession launches practice mode with target mistakes', () => {
      MistakeStore.recordMistake({
        subjectId: 'tienganh10',
        question: { id: 'q_en_1', question: 'Choose the best word', options: ['A','B'], correctAnswer: 0 }
      });

      let practiceStarted = null;
      global.App = {
        startLearning(config) {
          practiceStarted = config;
        }
      };

      const session = MistakeStore.generatePracticeSession({ subjectId: 'tienganh10' });
      assert.ok(session);
      assert.strictEqual(session.questions.length, 1);
      assert.strictEqual(session.questions[0].id, 'q_en_1');

      delete global.App;
    });
  });

  describe('5. Dual-Theme CSS Integrity for Leitner & Reason Elements', () => {
    it('public/css/mistakes.css defines required Leitner and error reason selectors', () => {
      const cssPath = path.resolve(__dirname, '../public/css/mistakes.css');
      assert.ok(fs.existsSync(cssPath), 'mistakes.css must exist');
      const css = fs.readFileSync(cssPath, 'utf8');

      const requiredSelectors = [
        '.leitner-boxes-grid',
        '.leitner-box-card',
        '.leitner-count',
        '.leitner-label',
        '.reason-pill',
        '.reason-select'
      ];

      requiredSelectors.forEach(sel => {
        assert.ok(css.includes(sel), `CSS must include selector: ${sel}`);
      });

      // Verify dark and light mode support
      assert.ok(css.includes('[data-theme="dark"]'), 'CSS must include dark mode token overrides');
      assert.ok(css.includes(':root:not([data-theme="dark"])'), 'CSS must include light mode token overrides');
    });
  });

  describe('6. Leitner Overview and Card UI Rendering', () => {
    it('MistakeView renders Leitner box overview and cards with Lucide SVGs (no emojis)', () => {
      const counts = { 1: 3, 2: 2, 3: 1, 4: 5 };
      const html = MistakeView.renderLeitnerOverview(counts);
      assert.ok(html.includes('leitner-boxes-grid'), 'Must render grid container');
      assert.ok(html.includes('leitner-box-card'), 'Must render box cards');
      assert.ok(html.includes('Hộp 1'), 'Renders Box 1');
      assert.ok(html.includes('Hộp 2'), 'Renders Box 2');
      assert.ok(html.includes('Hộp 3'), 'Renders Box 3');
      assert.ok(html.includes('Hộp 4'), 'Renders Box 4');
      
      // Check zero raw emojis
      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      assert.strictEqual(emojiRegex.test(html), false, 'Must not contain raw emojis');
    });

    it('MistakeView renders question card with Leitner badge, reason selector, and review action buttons', () => {
      const item = {
        id: 'q_render_card_1',
        subjectId: 'toan10',
        lessonName: 'Bài 1: Mệnh đề',
        question: 'Mệnh đề phủ định của P là gì?',
        type: 'mcq',
        options: ['Không P', 'P', 'Đúng', 'Sai'],
        correctAnswer: 0,
        userAnswer: 1,
        leitnerBox: 2,
        errorReason: 'reading_trap',
        mistakeCount: 2,
        createdAt: new Date().toISOString(),
        lastReviewedDate: new Date().toISOString()
      };

      const cardHtml = MistakeView.renderCard(item, 0);

      assert.ok(cardHtml.includes('leitner-pill'), 'Must render Leitner pill');
      assert.ok(cardHtml.includes('reason-select'), 'Must render reason select dropdown');
      assert.ok(cardHtml.includes('reason-pill'), 'Must render active reason badge');
      assert.ok(cardHtml.includes('review-promote-btn'), 'Must render promote button');
      assert.ok(cardHtml.includes('review-demote-btn'), 'Must render demote button');

      const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      assert.strictEqual(emojiRegex.test(cardHtml), false, 'Card must not contain raw emojis');
    });
  });
});
