/**
 * Test Suite for Phase 07: UI/UX Master Elevation
 * - Command Palette (Ctrl+K) search index, normalization, and filtering
 * - Exam Room 2.0 (Flag for Review, font scaling, session persistence)
 * - Result & Achievement Studio (Canvas card generation, Confetti engine)
 * - Navigation & Bottom Sheet Drawer DOM integrity
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Import modules
const CommandPalette = require('../public/js/command-palette.js');
const Quiz = require('../public/js/quiz.js');
const ResultCard = require('../public/js/result-card.js');
const Confetti = require('../public/js/confetti.js');

describe('Phase 07 — 1. Command Palette Engine (Ctrl+K)', () => {
  test('CommandPalette index contains essential tools, subjects, and quick actions', () => {
    assert.ok(Array.isArray(CommandPalette.ITEMS), 'ITEMS must be an array');
    assert.ok(CommandPalette.ITEMS.length >= 10, 'ITEMS must contain at least 10 searchable actions');

    const categories = new Set(CommandPalette.ITEMS.map(i => i.category));
    assert.ok(categories.has('Công cụ ôn luyện'), 'Must have tools category');
    assert.ok(categories.has('Môn học (GDPT 2018)'), 'Must have subjects category');
    assert.ok(categories.has('Hành động nhanh'), 'Must have quick actions category');
  });

  test('Diacritics normalization correctly converts accented Vietnamese to search keys', () => {
    assert.equal(CommandPalette.normalize('Toán học 10'), 'toan hoc 10');
    assert.equal(CommandPalette.normalize('Lịch sử 12'), 'lich su 12');
    assert.equal(CommandPalette.normalize('Đúng / Sai'), 'dung / sai');
    assert.equal(CommandPalette.normalize('Đổi mới'), 'doi moi');
  });

  test('Filter matches items by title, description, or keyword', () => {
    CommandPalette.query = 'su 12';
    CommandPalette.filterAndRender();
    const foundLs12 = CommandPalette.currentFiltered.some(item => item.id === 'sub_lichsu12');
    assert.ok(foundLs12, 'Query "su 12" must match Lịch sử 12');

    CommandPalette.query = 'so tay';
    CommandPalette.filterAndRender();
    const foundMistakes = CommandPalette.currentFiltered.some(item => item.id === 'cmd_mistakes');
    assert.ok(foundMistakes, 'Query "so tay" must match Sổ tay câu sai');

    CommandPalette.query = 'dark';
    CommandPalette.filterAndRender();
    const foundTheme = CommandPalette.currentFiltered.some(item => item.id === 'act_theme');
    assert.ok(foundTheme, 'Query "dark" must match Toggle Theme');
  });
});

describe('Phase 07 — 2. Exam Room 2.0 (Flag for Review & Toolbar)', () => {
  const sampleQuiz = {
    subject: 'lichsu12',
    questions: [
      { id: 'q1', type: 'mcq', question: 'Câu hỏi 1', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
      { id: 'q2', type: 'mcq', question: 'Câu hỏi 2', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 },
      {
        id: 'q3',
        type: 'tf-group',
        passage: 'Đoạn tư liệu lịch sử...',
        statements: [
          { statement: 'Ý 1', correct: true },
          { statement: 'Ý 2', correct: false }
        ]
      }
    ]
  };

  test('Quiz.toggleFlag toggles question index in flaggedQuestions Set', () => {
    // Mock storage for node
    const mockStorage = {};
    global.sessionStorage = {
      setItem: (k, v) => { mockStorage[k] = v; },
      getItem: (k) => mockStorage[k] || null,
      removeItem: (k) => { delete mockStorage[k]; }
    };
    global.localStorage = { ...global.sessionStorage };

    Quiz.init(sampleQuiz);
    assert.equal(Quiz.flaggedQuestions.size, 0, 'Initially 0 flags');

    Quiz.toggleFlag(0);
    assert.ok(Quiz.flaggedQuestions.has(0), 'Question 0 should be flagged');
    assert.equal(Quiz.flaggedQuestions.size, 1);

    Quiz.toggleFlag(0);
    assert.ok(!Quiz.flaggedQuestions.has(0), 'Question 0 flag should be removed on second toggle');
    assert.equal(Quiz.flaggedQuestions.size, 0);
  });

  test('Quiz saveSession and restoreSession persist flags across F5 reloads', () => {
    Quiz.init(sampleQuiz);
    Quiz.toggleFlag(1);
    Quiz.toggleFlag(2);

    const raw = sessionStorage.getItem(Quiz.STORAGE_KEY);
    assert.ok(raw, 'Session must be persisted');
    const parsed = JSON.parse(raw);
    assert.deepEqual(parsed.flags, [1, 2], 'Flags must be saved into session array');

    // Restore into a fresh Quiz state
    const newQuiz = Object.create(Quiz);
    newQuiz.restoreSession(parsed);
    assert.ok(newQuiz.flaggedQuestions.has(1), 'Restored quiz must have flag on Q1');
    assert.ok(newQuiz.flaggedQuestions.has(2), 'Restored quiz must have flag on Q2');
  });

  test('changeFontSize bounds font level between -2 and 3', () => {
    Quiz.fontSizeLevel = 0;
    Quiz.changeFontSize(1);
    assert.equal(Quiz.fontSizeLevel, 1);
    Quiz.changeFontSize(5);
    assert.equal(Quiz.fontSizeLevel, 3, 'Must cap at 3');
    Quiz.changeFontSize(-10);
    assert.equal(Quiz.fontSizeLevel, -2, 'Must floor at -2');
  });
});

describe('Phase 07 — 3. Result Card & Confetti Module Integrity', () => {
  test('Confetti engine is defined and has fire method', () => {
    assert.ok(Confetti, 'Confetti must be defined');
    assert.equal(typeof Confetti.fire, 'function', 'Confetti.fire must be a function');
  });

  test('ResultCard has generate and utility layout calculation methods', () => {
    assert.ok(ResultCard, 'ResultCard must be defined');
    assert.equal(typeof ResultCard.generate, 'function');
    assert.equal(typeof ResultCard.roundRect, 'function');
    assert.equal(typeof ResultCard.drawCorner, 'function');
  });
});

describe('Phase 07 — 4. HTML Navigation & Layout Restructure', () => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  test('index.html contains Command Palette search button with Ctrl K badge', () => {
    assert.ok(html.includes('id="header-search-btn"'), 'Must have header search button');
    assert.ok(html.includes('Ctrl K'), 'Must display Ctrl K keyboard hint');
    assert.ok(html.includes('CommandPalette.open()'), 'Must call CommandPalette.open() on click');
  });

  test('index.html contains Tools dropdown in desktop navigation', () => {
    assert.ok(html.includes('id="nav-tools-dropdown"'), 'Must have tools dropdown wrapper');
    assert.ok(html.includes('Tự tạo đề thi'), 'Dropdown must include Custom Exam');
    assert.ok(html.includes('Dò trắc nghiệm'), 'Dropdown must include Checker');
    assert.ok(html.includes('Sổ tay câu sai'), 'Dropdown must include Mistakes Notebook');
    assert.ok(html.includes('Nhập đề thông minh'), 'Dropdown must include Smart Importer');
  });

  test('index.html contains Mobile Bottom Sheet Drawer for streamlined 5-tab bar', () => {
    assert.ok(html.includes('id="mobile-drawer-overlay"'), 'Must have mobile drawer overlay');
    assert.ok(html.includes('class="mobile-drawer-content"'), 'Must have drawer content container');
    assert.ok(html.includes('id="mob-menu-btn"'), 'Must have mobile menu trigger button');
  });

  test('index.html Exam Room contains Flag button and Font scaler toolbar', () => {
    assert.ok(html.includes('id="q-flag-btn"'), 'Exam room must have question flag button');
    assert.ok(html.includes('class="exam-tools-row"'), 'Exam room must have tools row');
    assert.ok(html.includes('Quiz.changeFontSize'), 'Must have font size handlers');
    assert.ok(html.includes('Quiz.toggleZenMode'), 'Must have Zen mode trigger');
  });

  test('index.html Result Screen contains share achievement card button', () => {
    assert.ok(html.includes('class="btn-share-card"'), 'Result screen must have share button');
    assert.ok(html.includes('app.downloadResultCard()'), 'Must call app.downloadResultCard()');
  });
});
