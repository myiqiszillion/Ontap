/**
 * Test Suite for UI/UX Pro Max Design Intelligence Verification
 * - Lucide SVG Icon Engine integrity & SVG path correctness
 * - Elimination of raw emoji icons from primary navigation
 * - Accessibility: Skip Link (WCAG AAA), focus-visible, and aria-labels
 * - Contrast tokens & touch target rules
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Icons = require('../public/js/icons.js');

describe('UI/UX Pro Max — 1. Lucide SVG Icon Engine', () => {
  test('Icons object provides get, has, and list methods', () => {
    assert.ok(Icons, 'Icons engine must be defined');
    assert.equal(typeof Icons.get, 'function', 'Icons.get must be a function');
    assert.equal(typeof Icons.has, 'function', 'Icons.has must be a function');
    assert.equal(typeof Icons.list, 'function', 'Icons.list must be a function');
  });

  test('Icons dictionary contains all core system icons', () => {
    const requiredIcons = [
      'home', 'book-open', 'wrench', 'calendar', 'target', 'bell',
      'search', 'bookmark', 'book-marked', 'file-text', 'upload', 'download',
      'user', 'settings', 'sun', 'moon', 'volume-2', 'volume-x',
      'flag', 'flag-fill', 'maximize-2', 'minimize-2', 'menu', 'clock', 'check', 'sliders',
      'play', 'rotate-ccw', 'scale', 'camera'
    ];

    for (const icon of requiredIcons) {
      assert.ok(Icons.has(icon), `Icons must contain path for "${icon}"`);
    }
  });

  test('Icons.get generates accessible SVG markup with viewBox 0 0 24 24', () => {
    const homeSvg = Icons.get('home', { size: 18, className: 'test-icon' });
    assert.ok(homeSvg.startsWith('<svg'), 'Must produce <svg> element');
    assert.ok(homeSvg.includes('viewBox="0 0 24 24"'), 'Must specify standard 24x24 viewBox');
    assert.ok(homeSvg.includes('width="18"'), 'Must respect custom size');
    assert.ok(homeSvg.includes('height="18"'), 'Must respect custom size');
    assert.ok(homeSvg.includes('class="ui-icon test-icon"'), 'Must combine icon classes');
    assert.ok(homeSvg.includes('stroke="currentColor"'), 'Must inherit theme currentColor');
    assert.ok(homeSvg.includes('aria-hidden="true"'), 'Must hide decorative icons by default');
  });

  test('Icons.get supports custom aria-label for accessible icons', () => {
    const flagSvg = Icons.get('flag', { ariaLabel: 'Cắm cờ câu hỏi' });
    assert.ok(flagSvg.includes('aria-label="Cắm cờ câu hỏi"'), 'Must apply aria-label when provided');
    assert.ok(!flagSvg.includes('aria-hidden="true"'), 'Must not hide element when label is provided');
  });
});

describe('UI/UX Pro Max — 2. Accessibility & Navigation DOM Integrity', () => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  test('index.html contains Skip to Main Content link (WCAG AAA)', () => {
    assert.ok(html.includes('class="skip-link"'), 'Must have skip-link class');
    assert.ok(html.includes('href="#main-content"'), 'Skip link must target #main-content');
    assert.ok(html.includes('Chuyển đến nội dung chính'), 'Skip link text in Vietnamese');
  });

  test('index.html links icons.css and loads icons.js', () => {
    assert.ok(html.includes('href="css/icons.css"'), 'Must link css/icons.css');
    assert.ok(html.includes('src="js/icons.js"'), 'Must import js/icons.js');
  });

  test('Desktop Navigation buttons use SVG icons instead of raw emojis', () => {
    assert.ok(html.includes('data-route="dashboard"'), 'Must contain dashboard route');
    assert.ok(html.includes('data-route="subjects"'), 'Must contain subjects route');
    // Ensure raw emojis are replaced in desktop nav items
    assert.ok(!html.includes('🏠 Trang chủ'), 'Desktop nav must not have raw emoji 🏠');
    assert.ok(!html.includes('📚 Môn học'), 'Desktop nav must not have raw emoji 📚');
    assert.ok(!html.includes('🧰 Bộ công cụ'), 'Desktop nav must not have raw emoji 🧰');
    assert.ok(!html.includes('📅 Kế hoạch'), 'Desktop nav must not have raw emoji 📅');
    assert.ok(!html.includes('🎯 Chẩn đoán'), 'Desktop nav must not have raw emoji 🎯');
    assert.ok(!html.includes('📢 Bảng tin'), 'Desktop nav must not have raw emoji 📢');
  });

  test('Mobile Bottom Navigation uses SVG icons and accessible labels', () => {
    assert.ok(html.includes('id="mob-menu-btn"'), 'Must have mobile menu trigger');
    assert.ok(html.includes('aria-label="Mở menu công cụ mở rộng"'), 'mob-menu-btn must have aria-label');
    assert.ok(html.includes('aria-label="Điều hướng di động"'), 'Mobile nav must have aria-label');
  });

  test('Exam Room timer uses Clock SVG icon', () => {
    assert.ok(html.includes('id="active-timer"'), 'Must have active-timer');
    assert.ok(!html.includes('⏱️</span>\n          <span id="active-timer-display"'), 'Exam timer must not use raw emoji ⏱️');
  });
});

describe('UI/UX Pro Max — 3. Design System & WCAG Tokens', () => {
  const cssPath = path.join(__dirname, '..', 'public', 'css', 'edtech-design-system.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  test('Design system defines Slate high-contrast tokens for WCAG AAA', () => {
    assert.ok(css.includes('--text-main: #0f172a'), 'Light text-main must be high contrast Slate 900');
    assert.ok(css.includes('--text-main: #f1f5f9'), 'Dark text-main must be high contrast Slate 100');
    assert.ok(css.includes('--brand-primary: #3b82f6'), 'Brand primary must be defined');
    assert.ok(css.includes('--brand-teal: #0d9488'), 'Brand teal must be defined');
  });

  test('Design system enforces focus-visible and prefers-reduced-motion', () => {
    assert.ok(css.includes(':focus-visible'), 'Must define visible focus rings');
    assert.ok(css.includes('prefers-reduced-motion: reduce'), 'Must respect user motion preferences');
  });
});

describe('UI/UX Pro Max — 4. Mode Cards & Micro-Interaction Integrity', () => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  test('Mode selector cards use SVG icons instead of raw emojis', () => {
    assert.ok(html.includes('data-mode="exam"'), 'Must have exam mode card');
    assert.ok(html.includes('data-mode="study"'), 'Must have study mode card');
    assert.ok(html.includes('data-mode="flashcard"'), 'Must have flashcard mode card');
    assert.ok(html.includes('data-mode="practice"'), 'Must have practice mode card');
    assert.ok(html.includes('data-mode="tf"'), 'Must have tf mode card');
    assert.ok(html.includes('data-mode="checker"'), 'Must have checker mode card');
    assert.ok(html.includes('data-mode="wrong"'), 'Must have wrong mode card');

    // Check that none of the mode cards use raw emojis
    assert.ok(!html.includes('<div class="mode-icon">📝</div>'), 'Exam mode card must use SVG icon');
    assert.ok(!html.includes('<div class="mode-icon">📖</div>'), 'Study mode card must use SVG icon');
    assert.ok(!html.includes('<div class="mode-icon">🃏</div>'), 'Flashcard mode card must use SVG icon');
    assert.ok(!html.includes('<div class="mode-icon">💪</div>'), 'Practice mode card must use SVG icon');
    assert.ok(!html.includes('<div class="mode-icon">⚖️</div>'), 'TF mode card must use SVG icon');
    assert.ok(!html.includes('<div class="mode-icon">🔍</div>'), 'Checker mode card must use SVG icon');
    assert.ok(!html.includes('<div class="mode-icon">❌</div>'), 'Wrong mode card must use SVG icon');
  });

  test('Result action buttons and start buttons use SVG icons', () => {
    assert.ok(html.includes('btn-share-card'), 'Must contain share card button');
    assert.ok(html.includes('btn-result-action primary'), 'Must contain dashboard return button');
    assert.ok(!html.includes('📸 Xuất Thẻ Ảnh'), 'Share button must not use raw camera emoji');
    assert.ok(!html.includes('🏠 Về Dashboard'), 'Dashboard action button must not use raw house emoji');
    assert.ok(!html.includes('📝 Xem chi tiết đáp án'), 'Review action button must not use raw note emoji');
    assert.ok(!html.includes('📕 Sổ tay câu sai'), 'Mistakes action button must not use raw book emoji');
    assert.ok(!html.includes('🔄 Làm lại đề này'), 'Retry action button must not use raw repeat emoji');
  });

  test('Tactile mechanical switch audio feedback in audio.js', () => {
    const audioPath = path.join(__dirname, '..', 'public', 'js', 'audio.js');
    const audioCode = fs.readFileSync(audioPath, 'utf8');
    assert.ok(audioCode.includes("Icons.get('volume-2'"), 'audio.js must integrate Lucide volume icon');
    assert.ok(audioCode.includes("Icons.get('volume-x'"), 'audio.js must integrate Lucide volume mute icon');
    assert.ok(audioCode.includes("osc.type = 'triangle'"), 'playClick must use velvety triangle wave');
  });

  test('Quiz progress badge tap-to-scroll implementation in quiz.js', () => {
    const quizPath = path.join(__dirname, '..', 'public', 'js', 'quiz.js');
    const quizCode = fs.readFileSync(quizPath, 'utf8');
    assert.ok(quizCode.includes("progressEl.dataset.scrollBound"), 'quiz.js must guard event attachment with scrollBound');
    assert.ok(quizCode.includes("highlight-pulse"), 'quiz.js must trigger highlight-pulse animation');
    assert.ok(quizCode.includes("scrollIntoView"), 'quiz.js must smoothly scroll to palette');
  });
});
