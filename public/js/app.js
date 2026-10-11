/**
 * Main Application Controller (NTMK Rebuild Phase 01)
 * Coordinates App Shell, Onboarding, Dashboard, Subject Explorer, and Quiz Engines
 */

const app = {
  currentSubject: null,
  currentGrade: 10,
  subjectsData: null,
  subjects: [],
  grades: [10, 11, 12],
  selectedBais: [],
  lessonData: null,
  examMode: 'exam',
  quizDuration: 20,
  learningMode: 'exam',

  async init() {
    try {
      this.initTheme();
      AppRouter.init();

      // Load subjects catalog
      this.subjectsData = await API.getSubjects();
      this.subjects = this.subjectsData.subjects || [];
      this.grades = this.subjectsData.grades || [10, 11, 12];

      SubjectExplorer.init();
      this.setupEventListeners();

      // Check onboarding status
      if (!ProfileStore.hasCompletedOnboarding()) {
        this.startOnboarding(false);
      } else {
        const profile = ProfileStore.getProfile();
        this.updateHeaderProfileBadge(profile);
        SubjectExplorer.setGrade(profile.grade);

        // Respect initial hash or route to dashboard
        const currentHash = window.location.hash.replace(/^#/, '').split('/')[0];
        if (currentHash && AppRouter.ROUTES.includes(currentHash)) {
          this.navigateTo(currentHash);
        } else {
          this.navigateTo('dashboard');
        }
      }
    } catch (error) {
      console.error('Failed to initialize NTMK application:', error);
      alert('Không thể kết nối đến máy chủ. Vui lòng thử lại sau giây lát.');
    }
  },

  // ═══════════ THEME MANAGEMENT ═══════════

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const toggleBtn = document.getElementById('theme-toggle');

    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.setAttribute('data-theme', 'dark');
      if (toggleBtn) toggleBtn.innerHTML = '🌙';
    } else {
      document.body.removeAttribute('data-theme');
      if (toggleBtn) toggleBtn.innerHTML = '☀️';
    }
  },

  toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const toggleBtn = document.getElementById('theme-toggle');

    if (isDark) {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
      if (toggleBtn) toggleBtn.innerHTML = '☀️';
    } else {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      if (toggleBtn) toggleBtn.innerHTML = '🌙';
    }
  },

  // ═══════════ ONBOARDING & PROFILE ═══════════

  startOnboarding(isEdit = false) {
    this.navigateTo('onboarding');
    Onboarding.init();
  },

  onOnboardingComplete(profile) {
    this.updateHeaderProfileBadge(profile);
    SubjectExplorer.setGrade(profile.grade);
    this.navigateTo('dashboard');
  },

  updateHeaderProfileBadge(profile) {
    const badgeEl = document.getElementById('header-grade-text');
    if (badgeEl && profile) {
      badgeEl.textContent = `Lớp ${profile.grade}`;
    }
  },

  // ═══════════ ROUTING & NAVIGATION ═══════════

  navigateTo(routeId, param = null) {
    AppRouter.navigate(routeId, param);

    if (routeId === 'announcements') {
      this.loadAnnouncements();
    }
  },

  showScreen(screenId) {
    this.navigateTo(screenId);
  },

  // ═══════════ SUBJECT SELECTION ═══════════

  async selectSubject(subjectId) {
    const subject = this.subjects.find(s => s.id === subjectId);
    if (!subject) {
      alert('Không tìm thấy thông tin môn học.');
      return;
    }

    // Check readiness: if in development, show honest modal info without attaching fake questions
    if (!subject.ready) {
      SubjectExplorer.showPendingSubjectInfo(subjectId);
      return;
    }

    this.currentSubject = subjectId;
    const nameBadge = document.getElementById('selected-subject-name');
    if (nameBadge) nameBadge.textContent = subject.name;

    try {
      this.lessonData = await DataLoader.getLessons(subjectId);
      this.renderTopics();
      this.updateWrongCount();
      this.selectMode('exam');
      this.navigateTo('topics');
    } catch (error) {
      console.error('Failed to load lessons for', subjectId, error);
      alert('Không thể tải danh sách bài học của môn này.');
    }
  },

  // ═══════════ MODE SELECTION ═══════════

  selectMode(mode) {
    this.learningMode = mode;
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    const targetCard = document.querySelector(`.mode-card[data-mode="${mode}"]`);
    if (targetCard) targetCard.classList.add('selected');

    // Show/hide exam vs practice config
    const examConfig = document.getElementById('quiz-config-exam');
    const pracConfig = document.getElementById('quiz-config-practice');
    const fcConfig = document.getElementById('quiz-config-flashcard');

    if (examConfig) examConfig.style.display = mode === 'exam' ? 'block' : 'none';
    if (pracConfig) pracConfig.style.display = ['study', 'flashcard', 'practice'].includes(mode) ? 'block' : 'none';
    if (fcConfig) fcConfig.style.display = ['study', 'flashcard'].includes(mode) ? 'block' : 'none';

    // Show/hide topic list for wrong mode
    const topicsList = document.getElementById('topics-list');
    const topicsHeader = document.querySelector('.topics-header');
    if (mode === 'wrong') {
      if (topicsList) topicsList.style.display = 'none';
      if (topicsHeader) topicsHeader.style.display = 'none';
    } else {
      if (topicsList) topicsList.style.display = '';
      if (topicsHeader) topicsHeader.style.display = '';
    }

    // Update start button text
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      const labels = {
        exam: '📝 Bắt đầu thi thử',
        study: '📖 Bắt đầu học & đọc',
        flashcard: '🃏 Bắt đầu flashcard',
        practice: '💪 Bắt đầu luyện tập',
        wrong: '❌ Luyện câu sai'
      };
      startBtn.textContent = labels[mode] || '🚀 Bắt đầu';
    }

    if (mode === 'wrong') {
      const wrongCount = typeof WrongTracker !== 'undefined' ? WrongTracker.getWrongCount(this.currentSubject) : 0;
      if (startBtn) startBtn.disabled = wrongCount === 0;
    } else {
      this.updateQuizSummary();
    }

    // Toggle Resume button visibility
    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      if (mode === 'practice' && this.currentSubject) {
        const saved = localStorage.getItem(`ontap_practice_${this.currentSubject}`);
        resumeBtn.style.display = saved ? 'block' : 'none';
      } else {
        resumeBtn.style.display = 'none';
      }
    }
  },

  updateWrongCount() {
    if (this.currentSubject && typeof WrongTracker !== 'undefined') {
      const count = WrongTracker.getWrongCount(this.currentSubject);
      const badge = document.getElementById('wrong-count-badge');
      if (badge) badge.textContent = count;
    }
  },

  // ═══════════ TOPIC RENDERING ═══════════

  renderTopics() {
    const container = document.getElementById('topics-list');
    if (!container || !this.lessonData) return;

    container.innerHTML = this.lessonData.lessons.map(lesson => `
      <div class="topic-card" data-bai="${lesson.bai}">
        <label class="topic-checkbox-wrapper">
          <input type="checkbox"
                 class="topic-checkbox"
                 value="${lesson.bai}"
                 onchange="app.toggleBai(${lesson.bai})">
          <span class="topic-checkmark"></span>
        </label>
        <div class="topic-info" onclick="app.toggleBai(${lesson.bai}, true)">
          <div class="topic-title">${lesson.title}</div>
          <div class="topic-meta">
            <span class="topic-questions">${lesson.mcqCount} TN</span>
            <span class="topic-tf">${lesson.tfGroupCount} bài Đ/S</span>
            <span class="topic-time">~${lesson.estimatedTime} phút</span>
          </div>
        </div>
      </div>
    `).join('');

    this.selectedBais = [];
    this.updateQuizSummary();
  },

  toggleBai(bai, fromInfo = false) {
    const checkbox = document.querySelector(`input.topic-checkbox[value="${bai}"]`);
    if (!checkbox) return;
    const topicCard = checkbox.closest('.topic-card');

    if (fromInfo) checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
      if (!this.selectedBais.includes(bai)) this.selectedBais.push(bai);
      if (topicCard) topicCard.classList.add('selected');
    } else {
      this.selectedBais = this.selectedBais.filter(b => b !== bai);
      if (topicCard) topicCard.classList.remove('selected');
    }

    this.updateQuizSummary();
  },

  selectAll() {
    if (!this.lessonData) return;
    const allChecked = this.selectedBais.length === this.lessonData.lessons.length;
    document.querySelectorAll('.topic-checkbox').forEach(cb => cb.checked = !allChecked);

    if (allChecked) {
      this.selectedBais = [];
      document.querySelectorAll('.topic-card').forEach(c => c.classList.remove('selected'));
    } else {
      this.selectedBais = this.lessonData.lessons.map(l => l.bai);
      document.querySelectorAll('.topic-card').forEach(c => c.classList.add('selected'));
    }
    this.updateQuizSummary();
  },

  updateQuizSummary() {
    const startBtn = document.getElementById('start-btn');
    if (!startBtn || !this.lessonData) return;

    if (this.learningMode === 'wrong') return;

    const pool = this.selectedBais.length > 0
      ? this.lessonData.lessons.filter(l => this.selectedBais.includes(l.bai))
      : this.lessonData.lessons;

    const maxMcq = pool.reduce((s, l) => s + l.mcqCount, 0);
    const maxTfGroups = pool.reduce((s, l) => s + l.tfGroupCount, 0);
    const maxSa = pool.reduce((s, l) => s + (l.saCount || 0), 0);

    const mcqContainer = document.getElementById('config-item-mcq');
    const tfContainer = document.getElementById('config-item-tf');
    const saContainer = document.getElementById('config-item-sa');

    if (mcqContainer) mcqContainer.style.display = maxMcq > 0 ? 'flex' : 'none';
    if (tfContainer) tfContainer.style.display = maxTfGroups > 0 ? 'flex' : 'none';
    if (saContainer) saContainer.style.display = maxSa > 0 ? 'flex' : 'none';

    const pracMcqToggle = document.getElementById('prac-mcq-toggle');
    const pracTfToggle = document.getElementById('prac-tf-toggle');
    const pracSaToggle = document.getElementById('prac-sa-toggle');

    if (pracMcqToggle) pracMcqToggle.parentElement.style.display = maxMcq > 0 ? 'flex' : 'none';
    if (pracTfToggle) pracTfToggle.parentElement.style.display = maxTfGroups > 0 ? 'flex' : 'none';
    if (pracSaToggle) pracSaToggle.parentElement.style.display = maxSa > 0 ? 'flex' : 'none';

    const activeTogglesCount = (maxMcq > 0 ? 1 : 0) + (maxTfGroups > 0 ? 1 : 0) + (maxSa > 0 ? 1 : 0);
    const pracConfigParent = document.getElementById('quiz-config-practice');
    if (pracConfigParent) {
      if (['study', 'flashcard', 'practice'].includes(this.learningMode)) {
        pracConfigParent.style.display = activeTogglesCount > 1 ? 'block' : 'none';
      } else {
        pracConfigParent.style.display = 'none';
      }
    }

    if (this.selectedBais.length === 0) {
      startBtn.disabled = true;
      document.getElementById('summary-questions').textContent = '0';
      document.getElementById('summary-time').textContent = '0';
      const pracSummaryEl = document.getElementById('summary-questions-practice');
      if (pracSummaryEl) pracSummaryEl.textContent = '0 câu';
      return;
    }

    const totalTime = pool.reduce((s, l) => s + l.estimatedTime, 0);

    const mcqInput = document.getElementById('exam-mcq-limit');
    const tfInput = document.getElementById('exam-tf-limit');
    const saInput = document.getElementById('exam-sa-limit');

    if (mcqInput) {
      mcqInput.setAttribute('max', maxMcq);
      const currentVal = parseInt(mcqInput.value) || 0;
      if (currentVal > maxMcq) mcqInput.value = maxMcq;
    }
    if (tfInput) {
      tfInput.setAttribute('max', maxTfGroups);
      const currentVal = parseInt(tfInput.value) || 0;
      if (currentVal > maxTfGroups) tfInput.value = maxTfGroups;
    }
    if (saInput) {
      saInput.setAttribute('max', maxSa);
      const currentVal = parseInt(saInput.value) || 0;
      if (currentVal > maxSa) saInput.value = maxSa;
    }

    const showMcq = mcqInput && maxMcq > 0 ? (parseInt(mcqInput.value) || 0) : 0;
    const showTf = tfInput && maxTfGroups > 0 ? (parseInt(tfInput.value) || 0) : 0;
    const showSa = saInput && maxSa > 0 ? (parseInt(saInput.value) || 0) : 0;

    let summaryParts = [];
    if (showMcq > 0) summaryParts.push(`${showMcq} TN`);
    if (showTf > 0) summaryParts.push(`${showTf} Đ/S`);
    if (showSa > 0) summaryParts.push(`${showSa} TLN`);

    const summaryText = summaryParts.length > 0 ? summaryParts.join(' + ') : '0 câu';

    const pracSummaryText = [
      (pracMcqToggle && pracMcqToggle.checked && maxMcq > 0) ? `${maxMcq} TN` : null,
      (pracTfToggle && pracTfToggle.checked && maxTfGroups > 0) ? `${maxTfGroups} Đ/S` : null,
      (pracSaToggle && pracSaToggle.checked && maxSa > 0) ? `${maxSa} TLN` : null
    ].filter(Boolean).join(' + ') || '0 câu';

    document.getElementById('summary-questions').textContent = summaryText;
    document.getElementById('summary-time').textContent = totalTime;

    const pracSummaryEl = document.getElementById('summary-questions-practice');
    if (pracSummaryEl) pracSummaryEl.textContent = pracSummaryText;

    if (this.learningMode === 'exam') {
      startBtn.disabled = (showMcq === 0 && showTf === 0 && showSa === 0);
    } else {
      startBtn.disabled = pracSummaryText === '0 câu';
    }
  },

  // ═══════════ EVENT LISTENERS ═══════════

  setupEventListeners() {
    ['exam-mcq-limit', 'exam-tf-limit', 'exam-sa-limit', 'prac-mcq-toggle', 'prac-tf-toggle', 'prac-sa-toggle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.updateQuizSummary());
        el.addEventListener('input', () => this.updateQuizSummary());
      }
    });

    const durationEl = document.getElementById('quiz-duration');
    if (durationEl) {
      durationEl.addEventListener('change', (e) => {
        this.quizDuration = parseInt(e.target.value);
      });
    }

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startLearning();
      });
    }

    const resumeBtn = document.getElementById('resume-btn');
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => {
        this.resumePractice();
      });
    }
  },

  // ═══════════ START LEARNING / EXAM ═══════════

  async resumePractice() {
    if (!this.currentSubject) return;
    const saved = localStorage.getItem(`ontap_practice_${this.currentSubject}`);
    if (!saved) return;

    try {
      const state = JSON.parse(saved);
      const latestData = await API.getQuestions(this.currentSubject);
      let allLatestQs = [];
      latestData.lessons.forEach(l => {
        if (l.questionGroups) allLatestQs.push(...l.questionGroups);
        if (l.questions) allLatestQs.push(...l.questions);
      });

      state.questions = state.questions.map(q => {
        if (q.type === 'tf-group' || q.passage) {
          const updated = allLatestQs.find(newQ => newQ.passage === q.passage);
          if (updated) q.statements = updated.statements;
        } else {
          const updated = allLatestQs.find(newQ => newQ.question === q.question);
          if (updated) {
            if (updated.options) q.options = updated.options;
            q.correctAnswer = updated.correctAnswer !== undefined ? updated.correctAnswer : updated.correct;
          }
        }
        return q;
      });

      localStorage.setItem(`ontap_practice_${this.currentSubject}`, JSON.stringify(state));
    } catch (e) {
      console.error("Resume update error:", e);
    }

    this.navigateTo('practice');
    Study.init({ subject: this.currentSubject, questions: [] }, 'practice', { resume: true });
  },

  async startLearning() {
    if (!this.currentSubject) return;

    if (this.learningMode === 'wrong') {
      const wrongQs = typeof WrongTracker !== 'undefined' ? WrongTracker.getWrong(this.currentSubject) : [];
      if (wrongQs.length === 0) {
        alert('Bạn chưa có câu sai nào trong môn này!');
        return;
      }
      const data = { subject: this.currentSubject, questions: wrongQs };
      this.navigateTo('practice');
      Study.init(data, 'practice');
      return;
    }

    if (this.selectedBais.length === 0) return;

    try {
      let mcqLimit = null, tfLimit = null, saLimit = null;

      if (this.learningMode === 'exam') {
        const mcqInput = document.getElementById('exam-mcq-limit');
        const tfInput = document.getElementById('exam-tf-limit');
        const saInput = document.getElementById('exam-sa-limit');

        mcqLimit = mcqInput ? (parseInt(mcqInput.value) || 0) : null;
        tfLimit = tfInput ? (parseInt(tfInput.value) || 0) : null;
        saLimit = saInput ? (parseInt(saInput.value) || 0) : null;
      } else {
        const mcqCheck = document.getElementById('prac-mcq-toggle');
        const tfCheck = document.getElementById('prac-tf-toggle');
        const saCheck = document.getElementById('prac-sa-toggle');

        mcqLimit = (mcqCheck && mcqCheck.checked) ? null : 0;
        tfLimit = (tfCheck && tfCheck.checked) ? null : 0;
        saLimit = (saCheck && saCheck.checked) ? null : 0;
      }

      const quizData = await DataLoader.loadQuizData(
        this.currentSubject,
        this.selectedBais,
        this.learningMode,
        mcqLimit,
        tfLimit,
        saLimit
      );

      if (quizData.questions.length === 0) {
        alert('Không có câu hỏi nào phù hợp với tùy chọn.');
        return;
      }

      const subject = this.subjects.find(s => s.id === this.currentSubject);

      if (this.learningMode === 'exam') {
        this.navigateTo('quiz');
        const quizSubEl = document.getElementById('quiz-subject');
        if (quizSubEl && subject) quizSubEl.textContent = subject.name;
        Quiz.init(quizData);

        if (this.quizDuration > 0) {
          Timer.init(this.quizDuration, (display, remaining) => {
            const timerEl = document.getElementById('active-timer');
            const timerDisplay = document.getElementById('active-timer-display');
            if (timerDisplay) timerDisplay.textContent = display;
            if (timerEl) {
              timerEl.classList.remove('warning', 'danger');
              if (remaining <= 60) timerEl.classList.add('danger');
              else if (remaining <= 300) timerEl.classList.add('warning');
            }
          }, () => {
            alert('Hết thời gian làm bài! Hệ thống tự động nộp bài thi.');
            Quiz.submit();
          });
        } else {
          const timerDisplay = document.getElementById('active-timer-display');
          if (timerDisplay) timerDisplay.textContent = '∞';
        }
      } else if (this.learningMode === 'study') {
        const chunkSizeCheck = document.getElementById('fc-chunk-size');
        const chunkSize = chunkSizeCheck && chunkSizeCheck.value > 0 ? parseInt(chunkSizeCheck.value) : 0;
        this.navigateTo('study');
        Study.init(quizData, 'study', { chunkSize });
      } else if (this.learningMode === 'flashcard') {
        const chunkSizeCheck = document.getElementById('fc-chunk-size');
        const chunkSize = chunkSizeCheck && chunkSizeCheck.value > 0 ? parseInt(chunkSizeCheck.value) : 0;
        this.navigateTo('flashcard');
        Study.init(quizData, 'flashcard', { chunkSize });
      } else if (this.learningMode === 'practice') {
        this.navigateTo('practice');
        Study.init(quizData, 'practice');
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Không thể tải dữ liệu câu hỏi. Vui lòng thử lại.');
    }
  },

  // ═══════════ RESULTS & RECORDING ═══════════

  showResults(correct, total) {
    Timer.stop();

    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Record real learning attempt into ProfileStore
    const subject = this.subjects.find(s => s.id === this.currentSubject);
    ProfileStore.recordSession({
      subjectId: this.currentSubject,
      subjectName: subject ? subject.name : (this.currentSubject || 'Bài thi'),
      score: correct,
      total: total,
      mode: this.learningMode,
      timeSpentSeconds: Timer.getTimeUsed()
    });

    const scoreValEl = document.getElementById('score-value');
    const scoreTotEl = document.getElementById('score-total');
    const corCntEl = document.getElementById('correct-count');
    const wrgCntEl = document.getElementById('wrong-count');
    const timeUsedEl = document.getElementById('time-used');

    if (scoreValEl) scoreValEl.textContent = correct;
    if (scoreTotEl) scoreTotEl.textContent = total;
    if (corCntEl) corCntEl.textContent = correct;
    if (wrgCntEl) wrgCntEl.textContent = total - correct;
    if (timeUsedEl) timeUsedEl.textContent = Timer.formatTime(Timer.getTimeUsed());

    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    const ring = document.getElementById('score-ring');
    if (ring) {
      ring.style.strokeDashoffset = circumference;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => { ring.style.strokeDashoffset = offset; });
      });
    }

    let message = '';
    if (percentage >= 90) message = 'Xuất sắc! Bạn nắm rất vững kiến thức!';
    else if (percentage >= 70) message = 'Tốt lắm! Tiếp tục phát huy nhé!';
    else if (percentage >= 50) message = 'Khá tốt! Ôn thêm để tự tin đạt điểm cao hơn.';
    else message = 'Cần ôn luyện thêm! Xem lại đáp án chi tiết bên dưới nhé.';

    const resultMsgEl = document.getElementById('result-message');
    if (resultMsgEl) resultMsgEl.textContent = message;

    this.navigateTo('result');
  },

  // ═══════════ NAVIGATION & EXIT HANDLERS ═══════════

  exitStudy() {
    if (confirm('Thoát khỏi chế độ học? Tiến trình hiện tại sẽ được lưu lại.')) {
      this.goHome();
    }
  },

  goHome() {
    Timer.clearState();
    Timer.stop();
    this.currentSubject = null;
    this.selectedBais = [];
    this.lessonData = null;
    this.learningMode = 'exam';

    document.querySelectorAll('.topic-card').forEach(c => {
      c.classList.remove('selected');
      const cb = c.querySelector('input');
      if (cb) cb.checked = false;
    });

    this.navigateTo('dashboard');
  },

  goBackToHome() {
    this.goHome();
  },

  quitQuiz() {
    if (confirm('Bạn có chắc muốn thoát phòng thi? Kết quả chưa nộp sẽ không được lưu.')) {
      Timer.clearState();
      Timer.stop();
      this.goHome();
    }
  },

  // ═══════════ ANNOUNCEMENTS ═══════════

  async loadAnnouncements() {
    const container = document.getElementById('announcements-container');
    if (!container) return;

    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();

      if (!data || data.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 40px;">Chưa có thông báo nào.</div>';
        return;
      }

      container.innerHTML = data.map(ann => {
        const dateStr = new Date(ann.timestamp).toLocaleString('vi-VN', {
          hour: '2-digit', minute: '2-digit',
          day: '2-digit', month: '2-digit', year: 'numeric'
        });

        return `
          <div class="announcement-card social-style" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 20px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
              <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--brand-primary-soft); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
                📢
              </div>
              <div>
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">Ban Quản Trị NTMK</div>
                <div style="font-size: 0.8rem; color: var(--text-dim);">${dateStr}</div>
              </div>
            </div>
            <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; color: var(--text-main);">${this.escapeHTML(ann.title || '')}</h3>
            <p style="margin: 0; color: var(--text-sub); line-height: 1.5; font-size: 0.92rem;">${this.escapeHTML(ann.content || '')}</p>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.warn('Load announcements error:', e);
      container.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 40px;">Không thể tải danh sách thông báo.</div>';
    }
  },

  escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g,
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag])
    );
  }
};

// Start application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
}
