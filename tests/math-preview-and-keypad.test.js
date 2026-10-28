/**
 * Test Suite: KaTeX Live Formula Preview & Enhanced Quick Math Keypad
 * Tests for Quiz Short Answer (Part III) real-time KaTeX preview, math keypad expansion, and dual-theme styles.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Quiz = require('../public/js/quiz.js');

describe('Task 2 — Real-time KaTeX Formula Preview & Quick Math Keypad', () => {

  const cssPath = path.join(__dirname, '..', 'public', 'css', 'athenaeum-theme.css');
  const quizPath = path.join(__dirname, '..', 'public', 'js', 'quiz.js');

  beforeEach(() => {
    if (typeof global.sessionStorage === 'undefined') {
      const store = {};
      global.sessionStorage = {
        getItem: (k) => store[k] || null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: (k) => { delete store[k]; }
      };
    }
    if (typeof global.localStorage === 'undefined') {
      global.localStorage = { ...global.sessionStorage };
    }
  });

  describe('1. Quiz.updateMathPreview Method & Shorthand Conversions', () => {
    test('Quiz contains updateMathPreview method', () => {
      assert.equal(typeof Quiz.updateMathPreview, 'function', 'Quiz must have updateMathPreview method');
    });

    test('updateMathPreview converts shorthand math symbols to LaTeX', () => {
      // Mock preview container in global document
      const mockPreview = { innerHTML: '' };
      global.document = {
        querySelector: (sel) => (sel === '.sa-math-live-preview' ? mockPreview : null),
        getElementById: (id) => (id === 'sa-math-preview' ? mockPreview : null)
      };

      // Test fractions
      const resFrac = Quiz.updateMathPreview('3/4');
      assert.ok(mockPreview.innerHTML.includes('3 / 4') || mockPreview.innerHTML.includes('frac') || resFrac.includes('3 / 4') || resFrac.includes('frac'), 'Converts a/b fraction');

      // Test square root
      const resSqrt = Quiz.updateMathPreview('sqrt(2)');
      assert.ok(mockPreview.innerHTML.includes('2') && (mockPreview.innerHTML.includes('√') || mockPreview.innerHTML.includes('sqrt')), 'Converts sqrt(...)');

      // Test multiplication
      const resMult = Quiz.updateMathPreview('2*3');
      assert.ok(mockPreview.innerHTML.includes('×') || mockPreview.innerHTML.includes('times'), 'Converts * to times');

      // Test pi symbol
      const resPi = Quiz.updateMathPreview('2*pi');
      assert.ok(mockPreview.innerHTML.includes('π') || mockPreview.innerHTML.includes('pi'), 'Converts pi to \\pi');
    });

    test('updateMathPreview delegates to window.renderKatex or katex.renderToString when present', () => {
      let renderKatexCalled = false;
      global.window = {
        renderKatex: (latex) => {
          renderKatexCalled = true;
          return `<span class="katex-rendered">${latex}</span>`;
        }
      };
      const mockPreview = { innerHTML: '' };
      global.document = {
        querySelector: () => mockPreview,
        getElementById: () => mockPreview
      };

      Quiz.updateMathPreview('1/2');
      assert.ok(renderKatexCalled, 'window.renderKatex should be invoked if defined');
      assert.ok(mockPreview.innerHTML.includes('katex-rendered'), 'Preview container should receive renderKatex output');

      // Cleanup
      delete global.window;
    });
  });

  describe('2. Keypad Actions & insertMathSymbol Enhancements', () => {
    test('insertMathSymbol handles fractions (FRACTION) inserting \\frac{}{}', () => {
      let inputVal = '';
      let updateCalled = false;
      global.document = {
        getElementById: (id) => {
          if (id === 'sa-input-field') {
            return {
              get value() { return inputVal; },
              set value(v) { inputVal = v; },
              focus() {}
            };
          }
          return null;
        },
        querySelector: () => ({ innerHTML: '' })
      };

      const origUpdate = Quiz.updateMathPreview;
      Quiz.updateMathPreview = () => { updateCalled = true; };

      try {
        Quiz.insertMathSymbol('FRACTION');
        assert.ok(inputVal.includes('\\frac{}{}'), 'FRACTION must insert \\frac{}{}');
        assert.ok(updateCalled, 'insertMathSymbol must trigger updateMathPreview');
      } finally {
        Quiz.updateMathPreview = origUpdate;
      }
    });

    test('insertMathSymbol handles powers (POW2) inserting ^2', () => {
      let inputVal = 'x';
      let updateCalled = false;
      global.document = {
        getElementById: (id) => {
          if (id === 'sa-input-field') {
            return {
              get value() { return inputVal; },
              set value(v) { inputVal = v; },
              focus() {}
            };
          }
          return null;
        },
        querySelector: () => ({ innerHTML: '' })
      };

      const origUpdate = Quiz.updateMathPreview;
      Quiz.updateMathPreview = () => { updateCalled = true; };

      try {
        Quiz.insertMathSymbol('POW2');
        assert.equal(inputVal, 'x^2', 'POW2 must append ^2');
        assert.ok(updateCalled, 'insertMathSymbol must trigger updateMathPreview');
      } finally {
        Quiz.updateMathPreview = origUpdate;
      }
    });

    test('insertMathSymbol handles square root inserting \\sqrt{}', () => {
      let inputVal = '';
      global.document = {
        getElementById: (id) => {
          if (id === 'sa-input-field') {
            return {
              get value() { return inputVal; },
              set value(v) { inputVal = v; },
              focus() {}
            };
          }
          return null;
        },
        querySelector: () => ({ innerHTML: '' })
      };

      Quiz.insertMathSymbol('√');
      assert.ok(inputVal.includes('\\sqrt{}') || inputVal.includes('√'), 'Square root symbol must be inserted');
    });
  });

  describe('3. Short Answer DOM Template & Wiring in quiz.js', () => {
    const quizCode = fs.readFileSync(quizPath, 'utf8');

    test('Short answer rendering template contains .sa-math-live-preview container', () => {
      assert.ok(quizCode.includes('sa-math-live-preview'), 'quiz.js must render .sa-math-live-preview container');
    });

    test('Short answer input field has oninput handler wired to both inputShortAnswer and updateMathPreview', () => {
      assert.ok(quizCode.includes('Quiz.updateMathPreview(this.value)'), 'oninput must call Quiz.updateMathPreview(this.value)');
      assert.ok(quizCode.includes('Quiz.inputShortAnswer(this.value)'), 'oninput must call Quiz.inputShortAnswer(this.value)');
    });

    test('Math keypad includes [a/b], [x²], and [√] buttons', () => {
      assert.ok(quizCode.includes("insertMathSymbol('FRACTION')") || quizCode.includes('insertMathSymbol("FRACTION")'), 'Keypad must include FRACTION button');
      assert.ok(quizCode.includes("insertMathSymbol('POW2')") || quizCode.includes('insertMathSymbol("POW2")'), 'Keypad must include POW2 button');
      assert.ok(quizCode.includes("insertMathSymbol('√')") || quizCode.includes('insertMathSymbol("√")') || quizCode.includes("insertMathSymbol('SQRT')"), 'Keypad must include square root button');
    });

    test('renderQuestion restores updateMathPreview when saved answer exists', () => {
      assert.ok(
        quizCode.includes('this.updateMathPreview(userText)') || quizCode.includes('updateMathPreview(userText)') || quizCode.includes('updateMathPreview(this.answers'),
        'renderQuestion must restore math preview for saved user answers'
      );
    });
  });

  describe('4. Athenaeum Theme Dual-Theme CSS Rules', () => {
    const cssCode = fs.readFileSync(cssPath, 'utf8');

    test('CSS defines base styling for .sa-math-live-preview', () => {
      assert.ok(cssCode.includes('.sa-math-live-preview'), 'Must define .sa-math-live-preview class');
      assert.ok(cssCode.includes('min-height'), 'Must specify min-height');
      assert.ok(cssCode.includes('border-radius'), 'Must specify border-radius');
      assert.ok(cssCode.includes('padding'), 'Must specify padding');
      assert.ok(cssCode.includes('font-size'), 'Must specify font-size');
      assert.ok(cssCode.includes('transition'), 'Must specify transition');
    });

    test('CSS defines light mode rule :root:not([data-theme="dark"]) .sa-math-live-preview', () => {
      assert.ok(
        cssCode.includes(':root:not([data-theme="dark"]) .sa-math-live-preview') ||
        cssCode.includes(':root:not([data-theme=\'dark\']) .sa-math-live-preview'),
        'Must have light mode selector for .sa-math-live-preview'
      );
      assert.ok(cssCode.includes('#e2e8f0'), 'Light mode must use #e2e8f0 slate border');
      assert.ok(cssCode.includes('#0f172a'), 'Light mode must use #0f172a dark slate text');
    });

    test('CSS defines dark mode rule [data-theme="dark"] .sa-math-live-preview', () => {
      assert.ok(
        cssCode.includes('[data-theme="dark"] .sa-math-live-preview') ||
        cssCode.includes('[data-theme=\'dark\'] .sa-math-live-preview'),
        'Must have dark mode selector for .sa-math-live-preview'
      );
      assert.ok(cssCode.includes('rgba(255, 255, 255, 0.04)'), 'Dark mode must use obsidian glass background (rgba(255, 255, 255, 0.04))');
      assert.ok(cssCode.includes('rgba(255, 255, 255, 0.1)'), 'Dark mode must use glass border (rgba(255, 255, 255, 0.1))');
      assert.ok(cssCode.includes('#f8fafc'), 'Dark mode must use #f8fafc text');
    });
  });
});
