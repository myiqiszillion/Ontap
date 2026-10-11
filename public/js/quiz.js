/**
 * Quiz Module - Quiz rendering & scoring logic
 * Supports both MCQ (single answer) and TF-Group (passage + 4 Đúng/Sai statements)
 */
const Quiz = {
  currentQuestionIndex: 0,
  questions: [],
  answers: {},     // MCQ: { index: selectedOption }, TF-Group: { index: {0: true/false, 1: true/false, ...} }
  subject: null,

  /**
   * Initialize quiz
   */
  init(data) {
    this.subject = data.subject;
    this.answers = {};
    this.currentQuestionIndex = 0;
    this.questions = data.questions;
    this.render();
  },

  /**
   * Render current question
   */
  render() {
    const q = this.questions[this.currentQuestionIndex];
    if (!q) return;

    const isGroup = q.type === 'tf-group';
    const isShortAnswer = q.type === 'shortanswer';

    // Update type badge
    const typeBadge = document.getElementById('q-type-badge');
    if (typeBadge) {
      if (isGroup) {
        typeBadge.textContent = 'Đúng/Sai';
        typeBadge.className = 'question-type-badge tf';
      } else if (isShortAnswer) {
        typeBadge.textContent = 'Trả lời ngắn';
        typeBadge.className = 'question-type-badge sa';
      } else {
        typeBadge.textContent = 'Trắc nghiệm';
        typeBadge.className = 'question-type-badge';
      }
    }

    // Update progress
    document.getElementById('quiz-progress').textContent =
      `${this.currentQuestionIndex + 1}/${this.questions.length}`;
    document.getElementById('q-num').textContent = this.currentQuestionIndex + 1;

    const qTextEl = document.getElementById('q-text');
    const container = document.getElementById('options-container');

    if (isGroup) {
      // === TF GROUP: passage + multiple statements ===
      const imgHtml = q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : '';
      qTextEl.innerHTML = `<div class="question-passage">${this.escapeHtml(q.passage)}</div>${imgHtml}`;

      const groupAnswers = this.answers[this.currentQuestionIndex] || {};

      container.innerHTML = q.statements.map((stmt, si) => {
        const userAnswer = groupAnswers[si];
        const isDung = userAnswer === true;
        const isSai = userAnswer === false;

        return `
          <div class="tf-statement">
            <div class="tf-statement-text">${String.fromCharCode(97 + si)}) ${this.escapeHtml(stmt.question)}</div>
            <div class="tf-buttons">
              <button class="tf-btn${isDung ? ' selected' : ''}" onclick="Quiz.selectTF(${si}, true)">Đúng</button>
              <button class="tf-btn${isSai ? ' selected' : ''}" onclick="Quiz.selectTF(${si}, false)">Sai</button>
            </div>
          </div>
        `;
      }).join('');

    } else if (isShortAnswer) {
      // === SHORT ANSWER ===
      qTextEl.textContent = q.question;

      const userText = this.answers[this.currentQuestionIndex] || '';
      
      container.innerHTML = `
        <div class="sa-container">
          <input type="text" 
                 class="sa-input" 
                 placeholder="Nhập câu trả lời của bạn..." 
                 value="${this.escapeHtml(userText)}"
                 oninput="Quiz.inputShortAnswer(this.value)">
        </div>
      `;
    } else {
      // === MCQ: single question with options ===
      const mcqImgHtml = q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : '';
      qTextEl.innerHTML = `${this.escapeHtml(q.question)}${mcqImgHtml}`;

      const letters = 'ABCD';
      const selected = this.answers[this.currentQuestionIndex];

      container.innerHTML = q.options.map((opt, i) => {
        const isSelected = selected === i;
        return `
          <button class="option${isSelected ? ' selected' : ''}"
                  onclick="Quiz.selectOption(${i})">
            <span class="option-letter">${letters[i]}</span>
            <span class="option-text">${this.escapeHtml(opt)}</span>
          </button>
        `;
      }).join('');
    }

    this.renderDots();

    // Nav buttons
    document.getElementById('btn-prev').disabled = this.currentQuestionIndex === 0;
    const isLast = this.currentQuestionIndex === this.questions.length - 1;
    document.getElementById('btn-next').classList.toggle('hidden', isLast);
    document.getElementById('btn-submit').classList.toggle('hidden', !isLast);
  },

  /**
   * Render question navigation dots
   */
  renderDots() {
    const container = document.getElementById('question-dots');
    container.innerHTML = this.questions.map((q, i) => {
      const isCurrent = i === this.currentQuestionIndex;
      let isAnswered = false;

      if (q.type === 'tf-group') {
        // TF group is "answered" if all statements have answers
        const ga = this.answers[i];
        isAnswered = ga && Object.keys(ga).length === q.statements.length;
      } else if (q.type === 'shortanswer') {
        isAnswered = this.answers[i] !== undefined && this.answers[i].trim() !== '';
      } else {
        isAnswered = this.answers[i] !== undefined;
      }

      let typeClass = '';
      if (q.type === 'tf-group') typeClass = ' tf-dot';
      if (q.type === 'shortanswer') typeClass = ' sa-dot';
      return `
        <div class="q-dot ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}${typeClass}"
             onclick="Quiz.goTo(${i})">
          ${i + 1}
        </div>
      `;
    }).join('');
  },

  /**
   * Select MCQ answer
   */
  selectOption(index) {
    this.answers[this.currentQuestionIndex] = index;
    this.render();
  },

  /**
   * Select TF statement answer
   */
  selectTF(statementIndex, value) {
    if (!this.answers[this.currentQuestionIndex]) {
      this.answers[this.currentQuestionIndex] = {};
    }
    this.answers[this.currentQuestionIndex][statementIndex] = value;
    this.render();
  },

  /**
   * Input short answer text
   */
  inputShortAnswer(value) {
    this.answers[this.currentQuestionIndex] = value;
    this.renderDots(); // Only update dots, don't re-render full screen to keep focus
  },

  prev() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.render();
    }
  },

  next() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.render();
    }
  },

  goTo(index) {
    if (index >= 0 && index < this.questions.length) {
      this.currentQuestionIndex = index;
      this.render();
    }
  },

  /**
   * Submit quiz and calculate score
   */
  submit() {
    // Count unanswered
    let unanswered = 0;
    this.questions.forEach((q, i) => {
      if (q.type === 'tf-group') {
        const ga = this.answers[i] || {};
        if (Object.keys(ga).length < q.statements.length) unanswered++;
      } else if (q.type === 'shortanswer') {
        if (!this.answers[i] || this.answers[i].trim() === '') unanswered++;
      } else {
        if (this.answers[i] === undefined) unanswered++;
      }
    });

    if (unanswered > 0) {
      if (!confirm(`Còn ${unanswered} câu chưa trả lời đầy đủ. Nộp bài?`)) return;
    }

    // Calculate score
    let totalPoints = 0;
    let earnedPoints = 0;

    this.questions.forEach((q, i) => {
      if (q.type === 'tf-group') {
        // Each statement = 1 point
        const ga = this.answers[i] || {};
        q.statements.forEach((stmt, si) => {
          totalPoints++;
          if (ga[si] === stmt.correct) earnedPoints++;
        });
      } else if (q.type === 'shortanswer') {
        // Short answer = 1 point
        totalPoints++;
        const userText = (this.answers[i] || '').trim().toLowerCase();
        const correctText = String(q.correctAnswer).trim().toLowerCase();
        if (userText === correctText) earnedPoints++;
      } else {
        // MCQ = 1 point
        totalPoints++;
        if (this.answers[i] === q.correctAnswer) earnedPoints++;
      }
    });

    app.showResults(earnedPoints, totalPoints);
  },

  /**
   * Review answers
   */
  review() {
    const section = document.getElementById('review-section');
    const container = document.getElementById('review-list');

    container.innerHTML = this.questions.map((q, i) => {
      if (q.type === 'tf-group') {
        const ga = this.answers[i] || {};
        const statementsHtml = q.statements.map((stmt, si) => {
          const userVal = ga[si];
          const isCorrect = userVal === stmt.correct;
          const userText = userVal === true ? 'Đúng' : userVal === false ? 'Sai' : 'Chưa trả lời';
          const correctText = stmt.correct ? 'Đúng' : 'Sai';
          return `
            <div class="review-tf-statement ${isCorrect ? 'correct' : 'wrong'}">
              <span class="review-tf-label">${String.fromCharCode(97 + si)})</span>
              ${this.escapeHtml(stmt.question)}
              <span class="review-tf-answer">
                ${isCorrect ? '✓' : '✗'} ${userText}
                ${!isCorrect ? `→ ${correctText}` : ''}
              </span>
            </div>
          `;
        }).join('');

        return `
          <div class="review-item tf-review">
            <div class="review-question">
              <span class="review-type">Đ/S</span>
              Câu ${i + 1}: Bài đọc hiểu
            </div>
            <div class="review-passage-short">${this.escapeHtml(q.passage).substring(0, 120)}...</div>
            ${statementsHtml}
          </div>
        `;
      } else if (q.type === 'shortanswer') {
        const userText = (this.answers[i] || '').trim();
        const correctText = String(q.correctAnswer).trim();
        const isCorrect = userText.toLowerCase() === correctText.toLowerCase();

        return `
          <div class="review-item ${isCorrect ? 'correct' : 'wrong'}">
            <div class="review-question">
              <span class="review-type">TLN</span>
              Câu ${i + 1}: ${this.escapeHtml(q.question)}
            </div>
            <div class="review-answer ${isCorrect ? 'correct' : 'wrong'}">
              ${isCorrect ? '✓' : '✗'} Bạn điền: ${userText ? this.escapeHtml(userText) : '<em>Chưa trả lời</em>'}
            </div>
            ${!isCorrect ? `
              <div class="review-answer correct">
                ✓ Đáp án đúng: ${this.escapeHtml(correctText)}
              </div>
            ` : ''}
          </div>
        `;
      } else {
        const userAnswer = this.answers[i];
        const isCorrect = userAnswer === q.correctAnswer;
        const userText = userAnswer !== undefined ? q.options[userAnswer] : 'Chưa trả lời';
        const correctText = q.options[q.correctAnswer];

        return `
          <div class="review-item ${isCorrect ? 'correct' : 'wrong'}">
            <div class="review-question">
              <span class="review-type">TN</span>
              Câu ${i + 1}: ${this.escapeHtml(q.question)}
            </div>
            <div class="review-answer ${isCorrect ? 'correct' : 'wrong'}">
              ${isCorrect ? '✓' : '✗'} Bạn chọn: ${this.escapeHtml(userText)}
            </div>
            ${!isCorrect ? `
              <div class="review-answer correct">
                ✓ Đáp án đúng: ${this.escapeHtml(correctText)}
              </div>
            ` : ''}
          </div>
        `;
      }
    }).join('');

    section.classList.remove('hidden');
  },

  retry() {
    document.getElementById('review-section').classList.add('hidden');
    app.startQuiz();
  },

  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Quiz;
}
