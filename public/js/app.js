/**
 * Main Application Controller
 * Handles flow: Home → Topics Selection → Quiz
 */
const app = {
  currentSubject: null,
  subjects: [],
  selectedBais: [],    // Now selecting by bài number (merged)
  lessonData: null,
  examMode: 'exam',    // 'exam' (12TN+4ĐS), 'mcq', 'tf', 'all'
  quizDuration: 20,

  /**
   * Initialize application
   */
  async init() {
    try {
      this.subjects = await API.getSubjects();
      this.renderSubjects();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize:', error);
      alert('Không thể tải dữ liệu. Vui lòng refresh trang.');
    }
  },

  /**
   * Render subjects grid
   */
  renderSubjects() {
    const container = document.getElementById('subjects-grid');
    container.innerHTML = this.subjects.map(subject => `
      <div class="subject-card" data-id="${subject.id}"
           onclick="app.selectSubject('${subject.id}')">
        <div class="subject-checkbox">
          <svg viewBox="0 0 16 16"><polyline points="3,8 7,12 13,4"/></svg>
        </div>
        <div class="subject-icon" style="background: ${subject.color}20; color: ${subject.color}">
          ${subject.icon}
        </div>
        <div class="subject-info">
          <div class="subject-name">${subject.name}</div>
          <div class="subject-desc">${subject.description}</div>
        </div>
      </div>
    `).join('');
  },

  /**
   * Handle subject selection
   */
  async selectSubject(subjectId) {
    this.currentSubject = subjectId;
    const subject = this.subjects.find(s => s.id === subjectId);
    document.getElementById('selected-subject-name').textContent = subject.name;

    try {
      this.lessonData = await DataLoader.getLessons(subjectId);
      this.renderTopics();
      this.showScreen('topics');
    } catch (error) {
      console.error('Failed to load lessons:', error);
      alert('Không thể tải danh sách bài học.');
    }
  },

  /**
   * Render merged topics list (one entry per bài)
   */
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

  /**
   * Toggle bài selection
   */
  toggleBai(bai, fromInfo = false) {
    const checkbox = document.querySelector(`input.topic-checkbox[value="${bai}"]`);
    const topicCard = checkbox.closest('.topic-card');

    if (fromInfo) {
      checkbox.checked = !checkbox.checked;
    }

    if (checkbox.checked) {
      if (!this.selectedBais.includes(bai)) {
        this.selectedBais.push(bai);
      }
      topicCard.classList.add('selected');
    } else {
      this.selectedBais = this.selectedBais.filter(b => b !== bai);
      topicCard.classList.remove('selected');
    }

    this.updateQuizSummary();
  },

  /**
   * Select / deselect all bài
   */
  selectAll() {
    const allChecked = this.selectedBais.length === this.lessonData.lessons.length;
    document.querySelectorAll('.topic-checkbox').forEach(cb => {
      cb.checked = !allChecked;
    });
    if (allChecked) {
      this.selectedBais = [];
      document.querySelectorAll('.topic-card').forEach(c => c.classList.remove('selected'));
    } else {
      this.selectedBais = this.lessonData.lessons.map(l => l.bai);
      document.querySelectorAll('.topic-card').forEach(c => c.classList.add('selected'));
    }
    this.updateQuizSummary();
  },

  /**
   * Update quiz summary
   */
  updateQuizSummary() {
    const startBtn = document.getElementById('start-btn');

    if (this.selectedBais.length === 0) {
      startBtn.disabled = true;
      document.getElementById('summary-questions').textContent = '0';
      document.getElementById('summary-time').textContent = '0';
      return;
    }

    const selected = this.lessonData.lessons.filter(l => this.selectedBais.includes(l.bai));
    const totalMcq = selected.reduce((s, l) => s + l.mcqCount, 0);
    const totalTfGroups = selected.reduce((s, l) => s + l.tfGroupCount, 0);
    const totalTime = selected.reduce((s, l) => s + l.estimatedTime, 0);

    // Show summary based on exam mode
    let summaryText;
    const mode = this.examMode;
    if (mode === 'exam') {
      const mcqCount = Math.min(totalMcq, 12);
      const tfCount = Math.min(totalTfGroups, 4);
      summaryText = `${mcqCount} TN + ${tfCount} Đ/S`;
    } else if (mode === 'mcq') {
      summaryText = `${totalMcq} câu TN`;
    } else if (mode === 'tf') {
      summaryText = `${totalTfGroups} bài Đ/S`;
    } else {
      summaryText = `${totalMcq} TN + ${totalTfGroups} Đ/S`;
    }

    document.getElementById('summary-questions').textContent = summaryText;
    document.getElementById('summary-time').textContent = totalTime;
    startBtn.disabled = false;
  },

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Exam mode
    document.getElementById('exam-mode').addEventListener('change', (e) => {
      this.examMode = e.target.value;
      this.updateQuizSummary();
    });

    // Quiz duration
    document.getElementById('quiz-duration').addEventListener('change', (e) => {
      this.quizDuration = parseInt(e.target.value);
    });

    // Start button
    document.getElementById('start-btn').addEventListener('click', () => {
      this.startQuiz();
    });

    // Confirm exit
    window.addEventListener('beforeunload', (e) => {
      if (this.currentSubject) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  },

  /**
   * Start the quiz
   */
  async startQuiz() {
    if (!this.currentSubject || this.selectedBais.length === 0) return;

    try {
      // Set limits based on exam mode
      let mcqLimit = null, tfLimit = null;
      if (this.examMode === 'exam') {
        mcqLimit = 12;
        tfLimit = 4;
      }

      const quizData = await DataLoader.loadQuizData(
        this.currentSubject,
        this.selectedBais,
        this.examMode,
        mcqLimit,
        tfLimit
      );

      if (quizData.questions.length === 0) {
        alert('Không có câu hỏi nào phù hợp. Hãy chọn bài khác hoặc đổi dạng đề.');
        return;
      }

      const subject = this.subjects.find(s => s.id === this.currentSubject);
      this.showScreen('quiz');
      document.getElementById('quiz-subject').textContent = subject.name;

      Quiz.init(quizData);

      // Timer
      if (this.quizDuration > 0) {
        Timer.init(this.quizDuration, (display, remaining) => {
          const timerEl = document.getElementById('active-timer');
          const timerDisplay = document.getElementById('active-timer-display');
          timerDisplay.textContent = display;
          timerEl.classList.remove('warning', 'danger');
          if (remaining <= 60) {
            timerEl.classList.add('danger');
          } else if (remaining <= 300) {
            timerEl.classList.add('warning');
          }
        }, () => {
          alert('Hết giờ! Bài thi sẽ được nộp tự động.');
          Quiz.submit();
        });
      } else {
        document.getElementById('active-timer-display').textContent = '∞';
      }
    } catch (error) {
      console.error('Failed to start quiz:', error);
      alert('Không thể tải câu hỏi. Vui lòng thử lại.');
    }
  },

  /**
   * Show results screen
   */
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
      requestAnimationFrame(() => {
        ring.style.strokeDashoffset = offset;
      });
    });

    let message = '';
    if (percentage >= 90) message = 'Xuất sắc! Bạn nắm vững kiến thức!';
    else if (percentage >= 70) message = 'Tốt lắm! Tiếp tục phát huy nhé!';
    else if (percentage >= 50) message = 'Khá tốt! Ôn thêm để đạt điểm cao hơn';
    else message = 'Cần ôn tập thêm! Đừng nản nhé!';

    document.getElementById('result-message').textContent = message;
    this.showScreen('result');
  },

  /**
   * Go back to home screen
   */
  goHome() {
    Timer.clearState();
    Timer.stop();
    this.currentSubject = null;
    this.selectedBais = [];
    this.lessonData = null;

    document.querySelectorAll('.topic-card').forEach(c => {
      c.classList.remove('selected');
      const cb = c.querySelector('input');
      if (cb) cb.checked = false;
    });
    document.querySelectorAll('.subject-card').forEach(c => c.classList.remove('selected'));

    this.updateQuizSummary();
    this.showScreen('home');
  },

  goBackToHome() {
    this.goHome();
  },

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
