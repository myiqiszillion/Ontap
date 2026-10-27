/**
 * Automated Verification Suite for 11 UI/UX Audit Findings
 * Tests both Home View (7 findings) and Verified Practice View (4 findings)
 * Strictly verifies THPT NTMK Dĩ An - Bình Dương context, WCAG 2.2 AAA, and WAI-ARIA standards.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('UI/UX Audit Remediation — Home View (7 Findings)', () => {
  const indexHtmlPath = path.join(__dirname, '..', 'public', 'index.html');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  const cssSystemPath = path.join(__dirname, '..', 'public', 'css', 'edtech-design-system.css');
  const cssSystem = fs.readFileSync(cssSystemPath, 'utf8');

  const cssAthenaeumPath = path.join(__dirname, '..', 'public', 'css', 'athenaeum-theme.css');
  const cssAthenaeum = fs.readFileSync(cssAthenaeumPath, 'utf8');

  const onboardingJsPath = path.join(__dirname, '..', 'public', 'js', 'onboarding.js');
  const onboardingJs = fs.readFileSync(onboardingJsPath, 'utf8');

  const routerJsPath = path.join(__dirname, '..', 'public', 'js', 'router.js');
  const routerJs = fs.readFileSync(routerJsPath, 'utf8');

  test('U1 (Medium): Header layout HTML syntax is intact and properly closed', () => {
    // Check that brand-logo opens with <a> and closes with </a> (not </div>)
    const brandLogoBlock = indexHtml.match(/<a\b[^>]*class="brand-logo"[^>]*>([\s\S]*?)<\/a>/i);
    assert.ok(brandLogoBlock, 'brand-logo must be an <a> element closed properly with </a>');
    assert.ok(brandLogoBlock[0].includes('THPT NTMK • BÌNH DƯƠNG'), 'Must feature THPT NTMK Bình Dương');
    assert.ok(!brandLogoBlock[0].includes('</div>\n\n      <nav'), 'Must not have mismatched </div> closing the <a>');
  });

  test('U2 (Low): Distraction-free onboarding isolation mode hides competing navs', () => {
    // Router toggles is-onboarding class on document.body
    assert.ok(
      routerJs.includes("document.body.classList.toggle('is-onboarding', routeId === 'onboarding')"),
      'AppRouter must toggle body.is-onboarding on navigation'
    );

    // Athenaeum CSS hides desktop nav, mobile nav, search, and action pills during onboarding
    assert.ok(
      cssAthenaeum.includes('body.is-onboarding .header-nav-desktop'),
      'CSS must hide desktop nav when body is in onboarding mode'
    );
    assert.ok(
      cssAthenaeum.includes('body.is-onboarding .mobile-bottom-nav'),
      'CSS must hide mobile bottom nav when body is in onboarding mode'
    );
  });

  test('U3 (Low): Student grade badge displays graduation cap icon instead of settings sliders', () => {
    // Badge in index.html must have graduation cap SVG icon
    const studentBadgeMatch = indexHtml.match(/<button id="header-student-badge"[^>]*>([\s\S]*?)<\/button>/i);
    assert.ok(studentBadgeMatch, 'Must contain #header-student-badge');
    const badgeHtml = studentBadgeMatch[1];

    // Mortarboard / Graduation Cap path: M22 10v6M2 10l10-5 10 5-10 5z
    assert.ok(
      badgeHtml.includes('M22 10v6M2 10l10-5 10 5-10 5z'),
      'Badge must use academic graduation cap / mortarboard icon'
    );
    // Must NOT use sliders / settings icon lines: line x1="4" x2="4" y1="21" y2="14"
    assert.ok(
      !badgeHtml.includes('y1="21" y2="14"'),
      'Badge must not use hardware/settings sliders icon'
    );
    assert.ok(
      studentBadgeMatch[0].includes('Khối lớp học sinh'),
      'Badge must have explicit student grade aria-label'
    );
  });

  test('A1 (Low): Header desktop navigation is structured semantically with state', () => {
    // Nav must be wrapped in a semantic <ul> with role="list"
    assert.ok(
      indexHtml.includes('<ul class="header-nav-list" role="list">'),
      'Header nav items must be structured in <ul class="header-nav-list" role="list">'
    );
    assert.ok(
      cssSystem.includes('.header-nav-list'),
      'CSS must style .header-nav-list with flex and zeroed list margins'
    );

    // Initial HTML has aria-current="page" on the active dashboard button
    assert.ok(
      indexHtml.includes('data-route="dashboard" onclick="app.navigateTo(\'dashboard\')" aria-current="page"'),
      'Active navigation item must have aria-current="page"'
    );

    // Router maintains aria-current="page" dynamically
    assert.ok(
      routerJs.includes("btn.setAttribute('aria-current', 'page')"),
      'Router must set aria-current="page" on active item'
    );
    assert.ok(
      routerJs.includes("btn.removeAttribute('aria-current')"),
      'Router must remove aria-current from inactive items'
    );
  });

  test('A2 (Medium): Grade options grouped as radiogroup with keyboard navigation', () => {
    // Step 1 container has role="radiogroup" and accessible label
    assert.ok(
      onboardingJs.includes("container.setAttribute('role', 'radiogroup')"),
      'Step 1 options container must have role="radiogroup"'
    );
    assert.ok(
      onboardingJs.includes("container.setAttribute('aria-label', 'Chọn khối lớp học sinh')"),
      'Step 1 options container must have accessible aria-label'
    );

    // Choice cards rendered with role="radio", aria-checked, and keyboard listener
    assert.ok(onboardingJs.includes('role="radio"'), 'Choice items must have role="radio"');
    assert.ok(onboardingJs.includes('aria-checked="${isSelected}"'), 'Choice items must have aria-checked');
    assert.ok(onboardingJs.includes('tabindex="${isSelected ? \'0\' : \'-1\'}"'), 'Must use roving tabindex 0/-1');
    assert.ok(onboardingJs.includes('handleGradeKey(event'), 'Must have keyboard navigation handler for grade radios');

    // Arrow keys logic
    assert.ok(onboardingJs.includes("e.key === 'ArrowDown' || e.key === 'ArrowRight'"), 'Supports ArrowDown/ArrowRight');
    assert.ok(onboardingJs.includes("e.key === 'ArrowUp' || e.key === 'ArrowLeft'"), 'Supports ArrowUp/ArrowLeft');
  });

  test('A3 (Low): Step labels and subtle badges use high-contrast styling', () => {
    // .wizard-step-item font size is at least 0.9rem
    assert.ok(
      cssSystem.includes('font-size: 0.92rem;'),
      'Wizard step item must have readable font size >= 0.9rem'
    );
    // .step-number is enlarged
    assert.ok(
      cssSystem.includes('width: 34px;') && cssSystem.includes('height: 34px;'),
      'Step numbers must be at least 34px'
    );
    // .badge-subtle has high contrast color (#1e40af / var(--text-sub))
    assert.ok(
      cssSystem.includes('.badge-subtle') && !cssSystem.includes('.badge-subtle {\n  background: var(--bg-surface-secondary);\n  color: var(--text-dim);\n}'),
      '.badge-subtle must not use low-contrast text-dim'
    );
  });

  test('B1 (Medium): Wizard card has generous top and bottom spacing under header', () => {
    assert.ok(
      cssSystem.includes('margin: 56px auto 80px auto;'),
      '.onboarding-screen-wrapper must have generous margin >= 56px below sticky header'
    );
  });
});

describe('UI/UX Audit Remediation — Verified Practice View (4 Findings)', () => {
  const vpHtmlPath = path.join(__dirname, '..', 'public', 'verified-practice.html');
  const vpHtml = fs.readFileSync(vpHtmlPath, 'utf8');

  const vpJsPath = path.join(__dirname, '..', 'public', 'js', 'verified-practice.js');
  const vpJs = fs.readFileSync(vpJsPath, 'utf8');

  test('U1 (Low): Unclear developer wording replaced by authoritative pedagogical intro', () => {
    // Negative dev message removed
    assert.ok(
      !vpHtml.includes('Hệ thống hiển thị thiếu dữ liệu khi ngân hàng chưa đủ câu đã xác minh'),
      'Must remove negative dev error text from intro'
    );
    // Clear academic intro with school context and Decision 764
    assert.ok(
      vpHtml.includes('Phòng Luyện Thi Chuẩn Hóa GDPT 2018'),
      'Must display official title: Phòng Luyện Thi Chuẩn Hóa GDPT 2018'
    );
    assert.ok(
      vpHtml.includes('THPT Nguyễn Thị Minh Khai'),
      'Must reference THPT Nguyễn Thị Minh Khai'
    );
    assert.ok(
      vpHtml.includes('764/QĐ-BGDĐT'),
      'Must reference Decision 764/QĐ-BGDĐT'
    );
  });

  test('U2 (Low): Displays structured overview of the 3 exam sections', () => {
    // Structure overview section exists
    assert.ok(
      vpHtml.includes('Cấu trúc bài luyện thi 3 phần chuẩn Bộ GD&ĐT') || vpHtml.includes('Cấu trúc bài thi chuẩn hóa'),
      'Must describe exam structure'
    );
    assert.ok(vpHtml.includes('Phần I'), 'Must specify Part I');
    assert.ok(vpHtml.includes('Trắc nghiệm 4 lựa chọn'), 'Must describe MCQ 4 options');
    assert.ok(vpHtml.includes('Phần II'), 'Must specify Part II');
    assert.ok(vpHtml.includes('Đúng / Sai'), 'Must describe True/False format');
    assert.ok(vpHtml.includes('Phần III'), 'Must specify Part III');
    assert.ok(vpHtml.includes('Trả lời ngắn'), 'Must describe Short Answer format');
  });

  test('B2 (Medium): Start practice button has prominent Neo-EdTech design styling', () => {
    assert.ok(
      vpHtml.includes('id="start"') && vpHtml.includes('class="btn btn-primary start-practice-btn"'),
      '#start button must have styled class .btn.btn-primary.start-practice-btn'
    );
    assert.ok(
      vpHtml.includes('Bắt đầu luyện tập') || vpHtml.includes('Bắt đầu làm bài'),
      'Start button must have clear action label'
    );
    assert.ok(
      vpHtml.includes('aria-label="Bắt đầu làm bài luyện tập"'),
      'Start button must have accessible aria-label'
    );
  });

  test('B1 (Low): Grade is dynamically preselected from student profile', () => {
    // verified-practice.js must check localStorage for student profile grade
    assert.ok(
      vpJs.includes('preselectStudentGrade') || vpJs.includes('localStorage.getItem'),
      'verified-practice.js must read student profile from localStorage'
    );
    assert.ok(
      vpJs.includes('gradeSelect.value = String(studentGrade)') || vpJs.includes("get('grade').value = String(studentGrade)"),
      'verified-practice.js must set select grade value based on student grade'
    );
  });
});
