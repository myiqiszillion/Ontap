/**
 * Onboarding Wizard Module
 * Guides student through Grade -> Target Subjects -> Study Goal
 */

const Onboarding = {
  currentStep: 1,
  data: {
    grade: 10,
    targetSubjects: ['toan'],
    goal: 'score_8_plus'
  },

  CORE_SUBJECTS: [
    { key: 'toan', name: 'Toán học', icon: '📐', desc: 'Đại số, Hình học & Thống kê' },
    { key: 'vatli', name: 'Vật lí', icon: '⚡', desc: 'Động học, Dao động & Nhiệt học' },
    { key: 'hoahoc', name: 'Hóa học', icon: '🧪', desc: 'Liên kết, Hữu cơ & Vô cơ' },
    { key: 'tienganh', name: 'Tiếng Anh', icon: '🌐', desc: 'Ngữ pháp, Từ vựng & Đọc hiểu' },
    { key: 'lichsu', name: 'Lịch sử', icon: '📜', desc: 'Lịch sử Việt Nam & Thế giới (GDPT 2018)' }
  ],

  init() {
    const existing = ProfileStore.getProfile();
    if (existing) {
      this.data.grade = existing.grade || 10;
      this.data.targetSubjects = Array.isArray(existing.targetSubjects) && existing.targetSubjects.length > 0
        ? existing.targetSubjects
        : ['toan'];
      this.data.goal = existing.goal || 'score_8_plus';
    }
    this.currentStep = 1;
    this.render();
  },

  render() {
    const container = document.getElementById('onboarding-wizard');
    if (!container) return;

    // Update progress steps
    const stepIndicators = document.querySelectorAll('.wizard-step-item');
    stepIndicators.forEach((el, index) => {
      const stepNum = index + 1;
      el.classList.toggle('active', stepNum === this.currentStep);
      el.classList.toggle('completed', stepNum < this.currentStep);
    });

    const stepViews = document.querySelectorAll('.wizard-step-view');
    stepViews.forEach((el, index) => {
      el.classList.toggle('active', index + 1 === this.currentStep);
    });

    // Update button states
    const btnBack = document.getElementById('wizard-btn-back');
    const btnNext = document.getElementById('wizard-btn-next');
    const btnFinish = document.getElementById('wizard-btn-finish');

    if (btnBack) btnBack.style.display = this.currentStep === 1 ? 'none' : 'inline-flex';
    if (btnNext) btnNext.style.display = this.currentStep === 3 ? 'none' : 'inline-flex';
    if (btnFinish) btnFinish.style.display = this.currentStep === 3 ? 'inline-flex' : 'none';

    if (this.currentStep === 1) this.renderStep1();
    if (this.currentStep === 2) this.renderStep2();
    if (this.currentStep === 3) this.renderStep3();
  },

  renderStep1() {
    const container = document.getElementById('step-1-options');
    if (!container) return;

    // Finding A2: Grade options grouped as radiogroup for accessibility
    container.setAttribute('role', 'radiogroup');
    container.setAttribute('aria-label', 'Chọn khối lớp học sinh');

    const grades = [
      { grade: 10, title: 'Lớp 10', badge: 'Khởi đầu THPT', desc: 'Làm quen chương trình GDPT 2018 mới, định hướng tổ hợp môn' },
      { grade: 11, title: 'Lớp 11', badge: 'Tăng tốc', desc: 'Khối lượng kiến thức trọng tâm, chuẩn bị nền tảng lớp 12' },
      { grade: 12, title: 'Lớp 12', badge: 'Về đích', desc: 'Trọng tâm thi Tốt nghiệp THPT và Xét tuyển Đại học' }
    ];

    container.innerHTML = grades.map(g => {
      const isSelected = this.data.grade === g.grade;
      return `
      <div class="choice-card ${isSelected ? 'selected' : ''}"
           id="grade-opt-${g.grade}"
           role="radio"
           tabindex="${isSelected ? '0' : '-1'}"
           aria-checked="${isSelected}"
           onclick="Onboarding.selectGrade(${g.grade})"
           onkeydown="Onboarding.handleGradeKey(event, ${g.grade})">
        <div class="choice-header">
          <span class="choice-title">${g.title}</span>
          <span class="badge ${isSelected ? 'badge-primary' : 'badge-subtle'}">${g.badge}</span>
        </div>
        <p class="choice-desc">${g.desc}</p>
      </div>
    `;
    }).join('');
  },

  handleGradeKey(e, grade) {
    const grades = [10, 11, 12];
    const currentIndex = grades.indexOf(grade);
    let nextGrade = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextGrade = grades[(currentIndex + 1) % grades.length];
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextGrade = grades[(currentIndex - 1 + grades.length) % grades.length];
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.selectGrade(grade);
      return;
    }
    if (nextGrade !== null) {
      this.selectGrade(nextGrade);
      const el = document.getElementById(`grade-opt-${nextGrade}`);
      if (el) el.focus();
    }
  },

  renderStep2() {
    const container = document.getElementById('step-2-options');
    if (!container) return;

    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', 'Chọn môn học trọng tâm');

    container.innerHTML = this.CORE_SUBJECTS.map(s => {
      const isSelected = this.data.targetSubjects.includes(s.key);
      return `
        <div class="choice-card subject-choice ${isSelected ? 'selected' : ''}"
             id="subject-opt-${s.key}"
             role="checkbox"
             tabindex="0"
             aria-checked="${isSelected}"
             onclick="Onboarding.toggleSubject('${s.key}')"
             onkeydown="Onboarding.handleSubjectKey(event, '${s.key}')">
          <div class="choice-icon">${s.icon}</div>
          <div class="choice-info">
            <div class="choice-title">${s.name}</div>
            <div class="choice-desc">${s.desc}</div>
          </div>
          <div class="choice-check">
            <span class="checkmark-icon">${isSelected ? '✓' : '+'}</span>
          </div>
        </div>
      `;
    }).join('');
  },

  handleSubjectKey(e, subjectKey) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggleSubject(subjectKey);
    }
  },

  renderStep3() {
    const container = document.getElementById('step-3-options');
    if (!container) return;

    container.setAttribute('role', 'radiogroup');
    container.setAttribute('aria-label', 'Chọn mục tiêu điểm số');

    const goals = Object.values(ProfileStore.GOAL_META);

    container.innerHTML = goals.map(g => {
      const isSelected = this.data.goal === g.id;
      return `
      <div class="choice-card ${isSelected ? 'selected' : ''}"
           id="goal-opt-${g.id}"
           role="radio"
           tabindex="${isSelected ? '0' : '-1'}"
           aria-checked="${isSelected}"
           onclick="Onboarding.selectGoal('${g.id}')"
           onkeydown="Onboarding.handleGoalKey(event, '${g.id}')">
        <div class="choice-header">
          <span class="choice-icon-sm">${g.icon}</span>
          <span class="choice-title">${g.title}</span>
        </div>
        <p class="choice-desc">${g.desc}</p>
      </div>
    `;
    }).join('');
  },

  handleGoalKey(e, goalId) {
    const goals = Object.keys(ProfileStore.GOAL_META);
    const currentIndex = goals.indexOf(goalId);
    let nextGoal = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      nextGoal = goals[(currentIndex + 1) % goals.length];
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      nextGoal = goals[(currentIndex - 1 + goals.length) % goals.length];
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.selectGoal(goalId);
      return;
    }
    if (nextGoal !== null) {
      this.selectGoal(nextGoal);
      const el = document.getElementById(`goal-opt-${nextGoal}`);
      if (el) el.focus();
    }
  },

  selectGrade(grade) {
    this.data.grade = grade;
    this.renderStep1();
  },

  toggleSubject(subjectKey) {
    if (this.data.targetSubjects.includes(subjectKey)) {
      if (this.data.targetSubjects.length > 1) {
        this.data.targetSubjects = this.data.targetSubjects.filter(k => k !== subjectKey);
      }
    } else {
      this.data.targetSubjects.push(subjectKey);
    }
    this.renderStep2();
  },

  selectGoal(goalId) {
    this.data.goal = goalId;
    this.renderStep3();
  },

  nextStep() {
    if (this.currentStep === 1) {
      if (!this.data.grade) return;
      this.currentStep = 2;
    } else if (this.currentStep === 2) {
      if (this.data.targetSubjects.length === 0) return;
      this.currentStep = 3;
    }
    this.render();
  },

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.render();
    }
  },

  finish() {
    const saved = ProfileStore.saveProfile(this.data);
    if (typeof app !== 'undefined' && app.onOnboardingComplete) {
      app.onOnboardingComplete(saved);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Onboarding;
}
