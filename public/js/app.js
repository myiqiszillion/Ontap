/**
 * Main Application Controller
 * Handles flow: Home → Topics Selection → Study/Quiz/Flashcard/Practice
 */
const app = {
  currentSubject: null,
  currentGrade: 10,
  subjectsData: null,
  subjects: [],
  grades: [],
  selectedBais: [],
  lessonData: null,
  examMode: 'exam',
  quizDuration: 20,
  learningMode: 'exam',

  async init() {
    try {
      this.initTheme();
      this.subjectsData = await API.getSubjects();
      this.subjects = this.subjectsData.subjects || [];
      this.grades = this.subjectsData.grades || [10];
      
      this.currentGrade = this.grades[0]; // Default to first grade
      
      this.renderGradeTabs();
      this.renderSubjects();
      this.updateDashboardStats();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize:', error);
      alert('Không thể tải dữ liệu. Vui lòng refresh trang.');
    }
  },

  // ═══════════ THEME MANAGEMENT ═══════════

  initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.body.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.setAttribute('data-theme', 'dark');
    }
  },

  toggleTheme() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  },

  // ═══════════ DASHBOARD & GRADES ═══════════

  updateDashboardStats() {
    const statSubjects = document.getElementById('total-subjects-stat');
    const statQuestions = document.getElementById('total-questions-stat');
    
    if (statSubjects) statSubjects.textContent = this.subjects.length;
    // Estimate total questions (mock calculation for demo, normally would aggregate from actual data)
    if (statQuestions) statQuestions.textContent = this.subjects.length * 150;
  },

  renderGradeTabs() {
    const container = document.getElementById('grade-tabs');
    if (!container) return;
    
    container.innerHTML = this.grades.map(grade => `
      <button class="grade-tab ${grade === this.currentGrade ? 'active' : ''}" 
              onclick="app.selectGrade(${grade})">
        Lớp ${grade}
      </button>
    `).join('');
  },

  selectGrade(grade) {
    this.currentGrade = grade;
    this.renderGradeTabs();
    this.renderSubjects();
  },

  renderSubjects() {
    const container = document.getElementById('subjects-grid');
    if (!container) return;

    // Filter by selected grade
    const filteredSubjects = this.subjects.filter(s => s.grade === this.currentGrade);

    if (filteredSubjects.length === 0) {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Đang cập nhật môn học cho Lớp ${this.currentGrade}...</div>`;
      return;
    }

    const gradients = ['var(--grad-purple)', 'var(--grad-green)', 'var(--grad-blue)', 'var(--grad-orange)', 'var(--grad-red)'];

    container.innerHTML = filteredSubjects.map((subject, index) => {
      const gradient = gradients[index % gradients.length];
      const progress = this.getSubjectProgress(subject.id);
      
      return `
      <div class="subject-card" data-id="${subject.id}"
           onclick="app.selectSubject('${subject.id}')"
           style="--card-color: ${subject.color}">
        
        <div class="subject-card-header">
          <div class="subject-icon" style="background: ${gradient}; color: ${subject.color}">
            ${subject.icon}
          </div>
          <div class="subject-info">
            <div class="subject-name">${subject.name}</div>
            <div class="subject-desc">${subject.description}</div>
          </div>
        </div>

        <div class="subject-card-footer">
          <span class="subject-badge">Mới</span>
          <div class="subject-progress-container">
            <div class="subject-progress-bar-bg">
              <div class="subject-progress-fill" style="width: ${progress}%"></div>
            </div>
            <span>${progress}%</span>
          </div>
        </div>
      </div>
    `}).join('');
  },

  getSubjectProgress(subjectId) {
    // Basic mock progress calculation based on localStorage or default to 0
    const progress = localStorage.getItem(`progress_${subjectId}`);
    return progress ? parseInt(progress) : 0;
  },

  async selectSubject(subjectId) {
    this.currentSubject = subjectId;
    const subject = this.subjects.find(s => s.id === subjectId);
    document.getElementById('selected-subject-name').textContent = subject.name;

    try {
      this.lessonData = await DataLoader.getLessons(subjectId);
      this.renderTopics();
      this.updateWrongCount();
      this.showScreen('topics');
    } catch (error) {
      console.error('Failed to load lessons:', error);
      alert('Không thể tải danh sách bài học.');
    }
  },

  // ═══════════ MODE SELECTION ═══════════

  selectMode(mode) {
    this.learningMode = mode;
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
    document.querySelector(`.mode-card[data-mode="${mode}"]`).classList.add('selected');

    // Show/hide exam/practice config
    const examConfig = document.getElementById('quiz-config-exam');
    const pracConfig = document.getElementById('quiz-config-practice');
    
    if (examConfig) examConfig.style.display = mode === 'exam' ? 'block' : 'none';
    if (pracConfig) pracConfig.style.display = ['study', 'flashcard', 'practice'].includes(mode) ? 'block' : 'none';

    // Show/hide topic list for wrong mode
    const topicsList = document.getElementById('topics-list');
    const topicsHeader = document.querySelector('.topics-header');
    if (mode === 'wrong') {
      topicsList.style.display = 'none';
      topicsHeader.style.display = 'none';
    } else {
      topicsList.style.display = '';
      topicsHeader.style.display = '';
    }

    // Update start button text
    const startBtn = document.getElementById('start-btn');
    const labels = {
      exam: '📝 Bắt đầu thi',
      study: '📖 Bắt đầu học',
      flashcard: '🃏 Bắt đầu flashcard',
      practice: '💪 Bắt đầu luyện',
      wrong: '❌ Luyện câu sai'
    };
    startBtn.textContent = labels[mode] || '🚀 Bắt đầu';

    // Wrong mode doesn't need topic selection
    if (mode === 'wrong') {
      const wrongCount = WrongTracker.getWrongCount(this.currentSubject);
      startBtn.disabled = wrongCount === 0;
    } else {
      this.updateQuizSummary();
    }
  },

  updateWrongCount() {
    if (this.currentSubject) {
      const count = WrongTracker.getWrongCount(this.currentSubject);
      const badge = document.getElementById('wrong-count-badge');
      if (badge) badge.textContent = count;
    }
  },

  // ═══════════ TOPIC RENDERING ═══════════

  renderTopics() {
    const container = document.getElementById('topics-list');

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
    const topicCard = checkbox.closest('.topic-card');

    if (fromInfo) checkbox.checked = !checkbox.checked;

    if (checkbox.checked) {
      if (!this.selectedBais.includes(bai)) this.selectedBais.push(bai);
      topicCard.classList.add('selected');
    } else {
      this.selectedBais = this.selectedBais.filter(b => b !== bai);
      topicCard.classList.remove('selected');
    }

    this.updateQuizSummary();
  },

  selectAll() {
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

    if (this.learningMode === 'wrong') return;

    // Determine which pool to check for visibility. If lessons selected, check those. 
    // If none selected, check the entire subject so we don't show irrelevant inputs globally.
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

    if (this.selectedBais.length === 0) {
      startBtn.disabled = true;
      document.getElementById('summary-questions').textContent = '0';
      document.getElementById('summary-time').textContent = '0';
      return;
    }

    const totalTime = pool.reduce((s, l) => s + l.estimatedTime, 0);

    // Update max values for inputs
    const mcqInput = document.getElementById('exam-mcq-limit');
    const tfInput = document.getElementById('exam-tf-limit');
    const saInput = document.getElementById('exam-sa-limit');

    const pracMcqToggle = document.getElementById('prac-mcq-toggle');
    const pracTfToggle = document.getElementById('prac-tf-toggle');
    const pracSaToggle = document.getElementById('prac-sa-toggle');

    if (pracMcqToggle) pracMcqToggle.parentElement.style.display = maxMcq > 0 ? 'flex' : 'none';
    if (pracTfToggle) pracTfToggle.parentElement.style.display = maxTfGroups > 0 ? 'flex' : 'none';
    if (pracSaToggle) pracSaToggle.parentElement.style.display = maxSa > 0 ? 'flex' : 'none';

    // Hide entire block if there is <= 1 active toggle
    const activeTogglesCount = (maxMcq > 0 ? 1 : 0) + (maxTfGroups > 0 ? 1 : 0) + (maxSa > 0 ? 1 : 0);
    const pracConfigParent = document.getElementById('quiz-config-practice');
    if (pracConfigParent && ['study', 'flashcard', 'practice'].includes(this.learningMode)) {
      pracConfigParent.style.display = activeTogglesCount > 1 ? 'block' : 'none';
    }

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

    // Determine values to display
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
    
    // Enable start button if at least 1 question is selected
    if (this.learningMode === 'exam') {
        startBtn.disabled = (showMcq === 0 && showTf === 0 && showSa === 0);
    } else {
        startBtn.disabled = pracSummaryText === '0 câu';
    }
  },

  // ═══════════ EVENT LISTENERS ═══════════

  setupEventListeners() {
    // Attach events to dynamic inputs to recompute summary on change
    ['exam-mcq-limit', 'exam-tf-limit', 'exam-sa-limit', 'prac-mcq-toggle', 'prac-tf-toggle', 'prac-sa-toggle'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => this.updateQuizSummary());
        el.addEventListener('input', () => this.updateQuizSummary());
      }
    });

    document.getElementById('quiz-duration').addEventListener('change', (e) => {
      this.quizDuration = parseInt(e.target.value);
    });

    document.getElementById('start-btn').addEventListener('click', () => {
      this.startLearning();
    });
  },

  // ═══════════ START LEARNING ═══════════

  async startLearning() {
    if (!this.currentSubject) return;

    // Wrong mode — load from localStorage
    if (this.learningMode === 'wrong') {
      const wrongQs = WrongTracker.getWrong(this.currentSubject);
      if (wrongQs.length === 0) {
        alert('Chưa có câu sai nào!');
        return;
      }
      const data = { subject: this.currentSubject, questions: wrongQs };
      this.showScreen('practice');
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
        'exam', // always exam flow now
        mcqLimit,
        tfLimit,
        saLimit
      );

      if (quizData.questions.length === 0) {
        alert('Không có câu hỏi nào phù hợp.');
        return;
      }

      const subject = this.subjects.find(s => s.id === this.currentSubject);

      if (this.learningMode === 'exam') {
        this.showScreen('quiz');
        document.getElementById('quiz-subject').textContent = subject.name;
        Quiz.init(quizData);

        if (this.quizDuration > 0) {
          Timer.init(this.quizDuration, (display, remaining) => {
            const timerEl = document.getElementById('active-timer');
            const timerDisplay = document.getElementById('active-timer-display');
            timerDisplay.textContent = display;
            timerEl.classList.remove('warning', 'danger');
            if (remaining <= 60) timerEl.classList.add('danger');
            else if (remaining <= 300) timerEl.classList.add('warning');
          }, () => {
            alert('Hết giờ! Bài thi sẽ được nộp tự động.');
            Quiz.submit();
          });
        } else {
          document.getElementById('active-timer-display').textContent = '∞';
        }
      } else if (this.learningMode === 'study') {
        this.showScreen('study');
        Study.init(quizData, 'study');
      } else if (this.learningMode === 'flashcard') {
        this.showScreen('flashcard');
        Study.init(quizData, 'flashcard');
      } else if (this.learningMode === 'practice') {
        this.showScreen('practice');
        Study.init(quizData, 'practice');
      }
    } catch (error) {
      console.error('Failed to start:', error);
      alert('Không thể tải câu hỏi. Vui lòng thử lại.');
    }
  },

  // Previous startQuiz for backward compatibility
  startQuiz() { this.learningMode = 'exam'; this.startLearning(); },

  // ═══════════ RESULTS ═══════════

  showResults(correct, total) {
    Timer.stop();

    const percentage = Math.round((correct / total) * 100);

    document.getElementById('score-value').textContent = correct;
    document.getElementById('score-total').textContent = total;
    document.getElementById('correct-count').textContent = correct;
    document.getElementById('wrong-count').textContent = total - correct;
    document.getElementById('time-used').textContent = Timer.formatTime(Timer.getTimeUsed());

    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (percentage / 100) * circumference;
    const ring = document.getElementById('score-ring');
    ring.style.strokeDashoffset = circumference;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { ring.style.strokeDashoffset = offset; });
    });

    let message = '';
    if (percentage >= 90) message = 'Xuất sắc! Bạn nắm vững kiến thức!';
    else if (percentage >= 70) message = 'Tốt lắm! Tiếp tục phát huy nhé!';
    else if (percentage >= 50) message = 'Khá tốt! Ôn thêm để đạt điểm cao hơn';
    else message = 'Cần ôn tập thêm! Đừng nản nhé!';

    document.getElementById('result-message').textContent = message;
    this.showScreen('result');
  },

  // ═══════════ NAVIGATION ═══════════

  exitStudy() {
    if (confirm('Thoát chế độ học?')) {
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
    document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('selected'));

    this.showScreen('home');
  },

  goBackToHome() { this.goHome(); },

  quitQuiz() {
    if (confirm('Thoát khỏi bài thi? Tiến trình sẽ bị mất.')) {
      Timer.clearState();
      Timer.stop();
      this.goHome();
    }
  },

  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
    document.getElementById(`screen-${screenId}`).classList.add('on');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Start app
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = app;
}
