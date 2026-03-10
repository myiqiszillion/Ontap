/**
 * Main Application Controller
 * Handles flow: Home → Topics Selection → Study/Quiz/Flashcard/Practice
 */
const app = {
  currentSubject: null,
  subjects: [],
  selectedBais: [],
  lessonData: null,
  examMode: 'exam',
  quizDuration: 20,
  learningMode: 'exam',  // 'exam' | 'study' | 'flashcard' | 'practice' | 'wrong'

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

    // Show/hide exam config
    const examConfig = document.getElementById('quiz-config-exam');
    examConfig.style.display = mode === 'exam' ? 'block' : 'none';

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

    let summaryText;
    const mode = this.examMode;
    if (mode === 'exam') {
      summaryText = `${Math.min(totalMcq, 12)} TN + ${Math.min(totalTfGroups, 4)} Đ/S`;
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

  // ═══════════ EVENT LISTENERS ═══════════

  setupEventListeners() {
    document.getElementById('exam-mode').addEventListener('change', (e) => {
      this.examMode = e.target.value;
      this.updateQuizSummary();
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
      let mcqLimit = null, tfLimit = null;
      let examMode = 'all';

      if (this.learningMode === 'exam') {
        examMode = this.examMode;
        if (this.examMode === 'exam') { mcqLimit = 12; tfLimit = 4; }
      }

      const quizData = await DataLoader.loadQuizData(
        this.currentSubject,
        this.selectedBais,
        examMode,
        mcqLimit,
        tfLimit
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
