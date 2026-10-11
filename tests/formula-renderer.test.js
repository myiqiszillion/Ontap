/**
 * Test Suite: Formula Renderer & KaTeX Offline Fallback
 * Validates math and chemical formula rendering, symbol replacements, and XSS safety
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const FormulaRenderer = require('../public/js/formula-renderer.js');

describe('KaTeX / Formula Renderer & Offline Fallback', () => {

  test('Inline Math ($...$) renders with fallback markup when KaTeX is offline', () => {
    const raw = 'Tìm nghiệm của phương trình $x^2 - 4 = 0$ trên tập số thực.';
    const rendered = FormulaRenderer.render(raw);

    assert.ok(rendered.includes('formula-inline'));
    assert.ok(rendered.includes('<sup>2</sup>'));
  });

  test('Display Math ($$...$$) renders in block display mode', () => {
    const raw = 'Phương trình trạng thái khí lý tưởng: $$\\frac{p_1 V_1}{T_1} = \\frac{p_2 V_2}{T_2}$$';
    const rendered = FormulaRenderer.render(raw);

    assert.ok(rendered.includes('formula-display'));
    assert.ok(rendered.includes('p<sub>1</sub>'));
  });

  test('Chemistry & Math Symbol Substitutions', () => {
    const chemRaw = 'Phân tử nước $H_2O$ và phản ứng trao đổi $\\Delta H < 0$.';
    const rendered = FormulaRenderer.render(chemRaw);

    assert.ok(rendered.includes('H<sub>2</sub>O'));
    assert.ok(rendered.includes('Δ'));
  });

  test('Anti-XSS Protection: escapes malicious scripts in non-math text', () => {
    const malicious = '<script>alert("hack")</script> $x = 1$';
    const rendered = FormulaRenderer.render(malicious);

    assert.equal(rendered.includes('<script>'), false);
    assert.ok(rendered.includes('&lt;script&gt;'));
  });
});
