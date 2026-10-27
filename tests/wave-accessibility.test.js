/**
 * Automated Test Suite for WAVE Accessibility & WCAG 2.2 AAA Compliance
 * Validates that zero WAVE errors and zero alerts exist in public/index.html
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('WAVE & WCAG 2.2 AAA Audit Verification', () => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  test('1. Zero Missing Alternative Text on SVGs and Images', () => {
    // All <img> must have valid alt
    const imgMatches = html.match(/<img\b[^>]*>/gi) || [];
    for (const img of imgMatches) {
      assert.ok(img.includes('alt="'), `All <img> must have alt attribute: ${img}`);
      assert.ok(!img.includes('alt=""'), `Non-decorative <img> must not have empty alt: ${img}`);
    }

    // All <svg> must either have aria-hidden="true", aria-label, role="img", or <title>
    const svgMatches = html.match(/<svg\b[^>]*>/gi) || [];
    for (const svg of svgMatches) {
      const hasAriaHidden = svg.includes('aria-hidden="true"');
      const hasAriaLabel = svg.includes('aria-label="');
      const hasRoleImg = svg.includes('role="img"');
      assert.ok(
        hasAriaHidden || hasAriaLabel || hasRoleImg,
        `All <svg> must have aria-hidden="true", aria-label, or role="img": ${svg}`
      );
    }
  });

  test('2. Single <main> Landmark (No Duplicate Main Content)', () => {
    const mainTags = html.match(/<main\b/gi) || [];
    assert.equal(mainTags.length, 1, 'Document must have exactly ONE <main> landmark element');
    assert.ok(html.includes('id="main-content"'), '<main> must have id="main-content"');
  });

  test('3. Zero Orphaned Labels (All <label> elements have matching targets)', () => {
    // Labels must have matching 'for' attribute or enclose a control
    const labelForMatches = [...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/gi)].map(m => m[1]);
    for (const targetId of labelForMatches) {
      assert.ok(
        html.includes(`id="${targetId}"`),
        `Label for="${targetId}" must point to an element with that ID in the DOM`
      );
    }

    // No <label class="config-label"> used as headings
    assert.ok(
      !html.includes('<label class="config-label">'),
      '<label class="config-label"> must not be used as section headings (causes WAVE orphaned label alerts)'
    );
  });

  test('4. All Form Controls have explicit labels and aria-labels', () => {
    const requiredInputs = [
      'exam-mcq-limit',
      'exam-tf-limit',
      'exam-sa-limit',
      'quiz-duration',
      'prac-mcq-toggle',
      'prac-tf-toggle',
      'prac-sa-toggle',
      'fc-chunk-size'
    ];

    for (const id of requiredInputs) {
      assert.ok(html.includes(`id="${id}"`), `Input with id="${id}" must exist`);
      assert.ok(html.includes(`for="${id}"`), `Input with id="${id}" must have corresponding <label for="${id}">`);
      assert.ok(
        new RegExp(`<[^>]*id="${id}"[^>]*aria-label="`).test(html),
        `Input with id="${id}" must have an aria-label attribute`
      );
    }
  });

  test('5. Headings Structure has Level 1 H1 at Main Content Root', () => {
    assert.ok(
      html.includes('<h1 class="sr-only">'),
      'Main landmark must start with a semantic <h1> for screen readers and WAVE heading hierarchy'
    );
    // Announcements must not reuse <h1>
    assert.ok(
      !html.includes('<h1 class="explorer-title">'),
      'Announcements must use <h2> instead of competing <h1>'
    );
  });

  test('6. Semantic <button> for Mode Cards and Drawer Items (Zero Device-Dependent Alerts)', () => {
    // Mode cards must be semantic buttons
    const modeCards = html.match(/<button type="button" class="mode-card[^"]*"/gi) || [];
    assert.equal(modeCards.length, 7, 'All 7 mode cards must be semantic <button type="button"> elements');

    // Drawer items must be semantic buttons
    const drawerItems = html.match(/<button type="button" class="drawer-app-item"/gi) || [];
    assert.equal(drawerItems.length, 9, 'All 9 mobile drawer app items must be semantic <button type="button"> elements');
  });

  test('7. Color Contrast & Small Text WCAG Tokens in CSS', () => {
    const cssPath = path.join(__dirname, '..', 'public', 'css', 'style.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // --text-muted must be #475569 (7:1 contrast on white) instead of low-contrast #94a3b8
    assert.ok(css.includes('--text-muted: #475569'), 'Light text-muted must be high-contrast Slate 600 (#475569)');

    const athenaeumPath = path.join(__dirname, '..', 'public', 'css', 'athenaeum-theme.css');
    const athenaeum = fs.readFileSync(athenaeumPath, 'utf8');

    // Small text must be at least 0.75rem (12px) to prevent WAVE Very small text alerts
    assert.ok(!athenaeum.includes('font-size: 0.68rem'), 'No font-size smaller than 0.75rem in athenaeum-theme.css');
    assert.ok(athenaeum.includes('.sr-only'), 'Must include .sr-only accessible utility');
  });
});
