/**
 * Automated Test Suite for Interactive Pedagogical Solution Accordion
 * Verifies step-by-step breakdown, core method, common pitfalls, and dual-theme styling
 * in Quiz review and Study modes.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const Quiz = require('../public/js/quiz.js');
const { Study } = require('../public/js/study.js');

describe('Pedagogical Solution Accordion Suite', () => {

  test('1. Quiz and Study modules export renderStructuredSolution method', () => {
    assert.equal(typeof Quiz.renderStructuredSolution, 'function', 'Quiz must include renderStructuredSolution method');
    assert.equal(typeof Study.renderStructuredSolution, 'function', 'Study must include renderStructuredSolution method');
  });

  test('2. renderStructuredSolution outputs structured HTML with method, steps, and pitfall', () => {
    const sampleQuestion = {
      question: 'Tính đạo hàm của hàm số y = x^3 - 3x + 1',
      method: 'Quy tắc tính đạo hàm hàm đa thức và công thức đạo hàm cơ bản.',
      steps: [
        'Bước 1: Xác định tập xác định D = R.',
        'Bước 2: Áp dụng công thức (x^n)\' = n*x^(n-1), ta có y\' = 3x^2 - 3.',
        'Bước 3: Rút gọn biểu thức và kết luận.'
      ],
      pitfall: 'Tránh quên lấy đạo hàm của hằng số bằng 0 (đạo hàm của 1 là 0).'
    };

    const html = Quiz.renderStructuredSolution(sampleQuestion);

    // Verify container
    assert.ok(
      html.includes('solution-accordion') || html.includes('pedagogical-solution'),
      'Output must contain .solution-accordion or .pedagogical-solution container'
    );

    // Verify method section
    assert.ok(html.includes('solution-method'), 'Output must contain .solution-method element');
    assert.ok(
      html.includes('Phương pháp giải') || html.includes('Kiến thức trọng tâm'),
      'Method section must contain pedagogical header'
    );
    assert.ok(html.includes('Quy tắc tính đạo hàm'), 'Method section must contain core method text');

    // Verify steps section
    assert.ok(html.includes('solution-steps'), 'Output must contain .solution-steps container');
    assert.ok(html.includes('solution-step-item'), 'Output must contain .solution-step-item elements');
    assert.ok(html.includes('Bước 1: Xác định tập xác định'), 'Step 1 content must be present');
    assert.ok(html.includes('Bước 2: Áp dụng công thức'), 'Step 2 content must be present');

    // Verify pitfall section
    assert.ok(
      html.includes('solution-pitfall') || html.includes('pitfall-alert'),
      'Output must contain .solution-pitfall or .pitfall-alert container'
    );
    assert.ok(
      html.includes('Lưu ý bẫy đề thi') || html.includes('Bẫy đề thi') || html.includes('Lưu ý'),
      'Pitfall section must contain warning title'
    );
    assert.ok(html.includes('Tránh quên lấy đạo hàm của hằng số'), 'Pitfall text must be present');

    // Verify accessible collapsible element
    assert.ok(html.includes('<details') && html.includes('<summary'), 'Accordion must use accessible <details> and <summary> elements');

    // Verify Lucide SVGs used (no raw emojis)
    assert.ok(html.includes('<svg'), 'Icons must be SVGs');
    assert.ok(!html.includes('💡') && !html.includes('⚠️') && !html.includes('📌') && !html.includes('🎯'), 'No raw emojis in solution accordion');
  });

  test('3. renderStructuredSolution parses structured markdown / text explanations correctly', () => {
    const questionWithMarkdown = {
      question: 'Este X có công thức phân tử C2H4O2...',
      explanation: `Phương pháp giải: Vận dụng định nghĩa và công thức phân tử este no đơn chức.
Bước 1: Xác định độ bất bão hòa k = 1.
Bước 2: Viết các đồng phân este thỏa mãn là HCOOCH3.
Lưu ý bẫy đề thi: Chú ý đề bài hỏi este chứ không hỏi acid carboxylic.`
    };

    const html = Study.renderStructuredSolution(questionWithMarkdown);

    assert.ok(html.includes('solution-method'), 'Must parse method section from text');
    assert.ok(html.includes('Vận dụng định nghĩa'), 'Method text must match');
    assert.ok(html.includes('solution-step-item'), 'Must parse step items');
    assert.ok(html.includes('Xác định độ bất bão hòa'), 'Step 1 text must match');
    assert.ok(html.includes('Viết các đồng phân'), 'Step 2 text must match');
    assert.ok(html.includes('solution-pitfall') || html.includes('pitfall-alert'), 'Must parse pitfall section');
    assert.ok(html.includes('Chú ý đề bài hỏi este'), 'Pitfall text must match');
  });

  test('4. renderStructuredSolution gracefully formats unstructured explanation strings', () => {
    const plainQuestion = {
      question: 'Công thức este no, đơn chức, mạch hở:',
      explanation: 'Este no đơn chức mạch hở có công thức chung là CnH2nO2 với n >= 2.'
    };

    const html = Quiz.renderStructuredSolution(plainQuestion);
    assert.ok(html.includes('solution-accordion') || html.includes('pedagogical-solution'));
    assert.ok(html.includes('solution-method'));
    assert.ok(html.includes('solution-step-item'));
    assert.ok(html.includes('solution-pitfall') || html.includes('pitfall-alert'));
  });

  test('5. public/js/quiz.js integrates renderStructuredSolution into review detail views', () => {
    const quizCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'quiz.js'), 'utf8');
    assert.ok(
      quizCode.includes('renderStructuredSolution'),
      'quiz.js must call renderStructuredSolution in review/detail rendering'
    );
  });

  test('6. public/js/study.js integrates renderStructuredSolution into study mode view', () => {
    const studyCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'study.js'), 'utf8');
    assert.ok(
      studyCode.includes('renderStructuredSolution'),
      'study.js must call renderStructuredSolution in study mode'
    );
  });

  test('7. athenaeum-theme.css contains dual-theme styling for accordion, steps, and pitfalls', () => {
    const cssPath = path.join(__dirname, '..', 'public', 'css', 'athenaeum-theme.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Accordion container styling
    assert.ok(css.includes('.solution-accordion'), 'CSS must define styles for .solution-accordion');
    assert.ok(css.includes('.solution-step-item'), 'CSS must define styles for .solution-step-item');
    assert.ok(
      css.includes('.solution-pitfall') || css.includes('.pitfall-alert'),
      'CSS must define styles for .solution-pitfall or .pitfall-alert'
    );

    // Dark mode dual-theme coverage
    assert.ok(
      css.includes('[data-theme="dark"]') && css.includes('.solution-accordion'),
      'CSS must have dark mode rules for .solution-accordion'
    );
    assert.ok(
      css.includes('[data-theme="dark"]') && css.includes('.solution-step-item'),
      'CSS must have dark mode rules for .solution-step-item'
    );
    assert.ok(
      css.includes('[data-theme="dark"]') && (css.includes('.solution-pitfall') || css.includes('.pitfall-alert')),
      'CSS must have dark mode rules for .solution-pitfall / .pitfall-alert'
    );
  });

});
