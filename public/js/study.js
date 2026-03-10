/**
 * Study Module — Handles Study, Flashcard, and Practice modes
 */
const Study = {
  mode: null,        // 'study' | 'flashcard' | 'practice'
  questions: [],
  currentIndex: 0,
  subject: null,

  // Flashcard-specific
  flashcardKnown: new Set(),
  flashcardQueue: [],
  isFlipped: false,

  // Practice-specific
  practiceAnswered: {},  // { index: { answered: true, correct: bool } }
  practiceScore: { correct: 0, wrong: 0 },

  /**
   * Initialize a learning mode
   */
  init(data, mode) {
    this.mode = mode;
    this.subject = data.subject;
    this.questions = data.questions;
    this.currentIndex = 0;

    if (mode === 'flashcard') {
      this.flashcardKnown = new Set();
      this.flashcardQueue = [...Array(this.questions.length).keys()];
      this.isFlipped = false;
    }

    if (mode === 'practice') {
      this.practiceAnswered = {};
      this.practiceScore = { correct: 0, wrong: 0 };
    }

    this.render();
  },

  /**
   * Render based on current mode
   */
  render() {
    if (this.mode === 'study') this.renderStudy();
    else if (this.mode === 'flashcard') this.renderFlashcard();
    else if (this.mode === 'practice') this.renderPractice();
  },

  // ═══════════════════════════════════════════════
  //  STUDY MODE — Show question + answer together
  // ═══════════════════════════════════════════════
  renderStudy() {
    const q = this.questions[this.currentIndex];
    if (!q) return;

    const container = document.getElementById('study-content');
    const progress = document.getElementById('study-progress');
    const progressBar = document.getElementById('study-progress-fill');

    progress.textContent = `${this.currentIndex + 1} / ${this.questions.length}`;
    progressBar.style.width = `${((this.currentIndex + 1) / this.questions.length) * 100}%`;

    if (q.type === 'tf-group') {
      container.innerHTML = `
        <div class="study-card">
          <div class="study-badge tf">Đúng/Sai</div>
          <div class="study-passage">${this.escapeHtml(q.passage)}</div>
          <div class="study-answers">
            ${q.statements.map((s, i) => `
              <div class="study-tf-item ${s.correct ? 'correct' : 'wrong'}">
                <span class="study-tf-letter">${String.fromCharCode(97 + i)})</span>
                <span class="study-tf-text">${this.escapeHtml(s.question)}</span>
                <span class="study-tf-label ${s.correct ? 'correct' : 'wrong'}">${s.correct ? '✓ Đúng' : '✗ Sai'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      const letters = 'ABCD';
      container.innerHTML = `
        <div class="study-card">
          <div class="study-badge mcq">Trắc nghiệm</div>
          <div class="study-question">${this.escapeHtml(q.question)}</div>
          <div class="study-answers">
            ${q.options.map((opt, i) => `
              <div class="study-option ${i === q.correctAnswer ? 'correct' : ''}">
                <span class="study-option-letter">${letters[i]}</span>
                <span class="study-option-text">${this.escapeHtml(opt)}</span>
                ${i === q.correctAnswer ? '<span class="study-correct-icon">✓</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Nav
    document.getElementById('study-prev').disabled = this.currentIndex === 0;
    document.getElementById('study-next').disabled = this.currentIndex === this.questions.length - 1;
  },

  studyPrev() {
    if (this.currentIndex > 0) { this.currentIndex--; this.renderStudy(); }
  },
  studyNext() {
    if (this.currentIndex < this.questions.length - 1) { this.currentIndex++; this.renderStudy(); }
  },

  // ═══════════════════════════════════════════════
  //  FLASHCARD MODE — Flip to reveal answer
  // ═══════════════════════════════════════════════
  renderFlashcard() {
    const remaining = this.flashcardQueue.length - this.flashcardKnown.size;
    const total = this.questions.length;
    const known = this.flashcardKnown.size;

    document.getElementById('fc-counter').textContent = `Còn ${remaining} / ${total} câu`;
    document.getElementById('fc-known').textContent = `✓ Đã thuộc: ${known}`;
    document.getElementById('fc-progress-fill').style.width = `${(known / total) * 100}%`;

    if (remaining === 0) {
      document.getElementById('flashcard-content').innerHTML = `
        <div class="fc-done">
          <div class="fc-done-icon">🎉</div>
          <h2>Đã thuộc hết!</h2>
          <p>Bạn đã ghi nhớ tất cả ${total} câu.</p>
          <button class="fc-btn reset" onclick="Study.resetFlashcards()">🔄 Học lại từ đầu</button>
        </div>
      `;
      document.getElementById('fc-actions').classList.add('hidden');
      return;
    }

    document.getElementById('fc-actions').classList.remove('hidden');

    // Find next un-known question
    const qIdx = this.flashcardQueue.find(i => !this.flashcardKnown.has(i));
    this.currentIndex = qIdx;
    const q = this.questions[qIdx];

    const card = document.getElementById('flashcard-content');
    this.isFlipped = false;

    if (q.type === 'tf-group') {
      card.innerHTML = `
        <div class="fc-card" id="fc-card" onclick="Study.flipCard()">
          <div class="fc-front">
            <div class="fc-type tf">Đúng/Sai</div>
            <div class="fc-question">${this.escapeHtml(q.passage)}</div>
            <div class="fc-statements">
              ${q.statements.map((s, i) => `
                <div class="fc-stmt">${String.fromCharCode(97 + i)}) ${this.escapeHtml(s.question)}</div>
              `).join('')}
            </div>
            <div class="fc-hint">👆 Nhấn để lật thẻ</div>
          </div>
          <div class="fc-back">
            <div class="fc-type tf">Đáp án</div>
            ${q.statements.map((s, i) => `
              <div class="fc-answer-item ${s.correct ? 'correct' : 'wrong'}">
                ${String.fromCharCode(97 + i)}) ${s.correct ? '✓ Đúng' : '✗ Sai'}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      const letters = 'ABCD';
      card.innerHTML = `
        <div class="fc-card" id="fc-card" onclick="Study.flipCard()">
          <div class="fc-front">
            <div class="fc-type mcq">Trắc nghiệm</div>
            <div class="fc-question">${this.escapeHtml(q.question)}</div>
            <div class="fc-options-preview">
              ${q.options.map((opt, i) => `
                <div class="fc-opt-preview">${letters[i]}. ${this.escapeHtml(opt)}</div>
              `).join('')}
            </div>
            <div class="fc-hint">👆 Nhấn để lật thẻ</div>
          </div>
          <div class="fc-back">
            <div class="fc-type mcq">Đáp án</div>
            <div class="fc-correct-answer">${letters[q.correctAnswer]}. ${this.escapeHtml(q.options[q.correctAnswer])}</div>
          </div>
        </div>
      `;
    }
  },

  flipCard() {
    const card = document.getElementById('fc-card');
    if (card) {
      this.isFlipped = !this.isFlipped;
      card.classList.toggle('flipped', this.isFlipped);
    }
  },

  markKnown() {
    this.flashcardKnown.add(this.currentIndex);
    // Move to end of queue
    this.flashcardQueue = this.flashcardQueue.filter(i => i !== this.currentIndex);
    this.flashcardQueue.push(this.currentIndex);
    this.renderFlashcard();
  },

  markUnknown() {
    // Move to end of queue for review
    this.flashcardQueue = this.flashcardQueue.filter(i => i !== this.currentIndex);
    this.flashcardQueue.push(this.currentIndex);
    this.renderFlashcard();
  },

  resetFlashcards() {
    this.flashcardKnown = new Set();
    this.flashcardQueue = [...Array(this.questions.length).keys()];
    this.isFlipped = false;
    this.renderFlashcard();
  },

  // ═══════════════════════════════════════════════
  //  PRACTICE MODE — Answer with instant feedback
  // ═══════════════════════════════════════════════
  renderPractice() {
    const q = this.questions[this.currentIndex];
    if (!q) return;

    const container = document.getElementById('practice-content');
    const progress = document.getElementById('practice-progress');
    const bar = document.getElementById('practice-progress-fill');
    const scoreEl = document.getElementById('practice-score');

    const answered = Object.keys(this.practiceAnswered).length;
    progress.textContent = `${this.currentIndex + 1} / ${this.questions.length}`;
    bar.style.width = `${((answered) / this.questions.length) * 100}%`;
    scoreEl.textContent = `✓ ${this.practiceScore.correct}  ✗ ${this.practiceScore.wrong}`;

    const state = this.practiceAnswered[this.currentIndex];

    if (q.type === 'tf-group') {
      const tfState = state || {};
      container.innerHTML = `
        <div class="practice-card">
          <div class="study-badge tf">Đúng/Sai</div>
          <div class="study-passage">${this.escapeHtml(q.passage)}</div>
          <div class="practice-statements">
            ${q.statements.map((s, i) => {
              const answered = tfState[i] !== undefined;
              const userVal = tfState[i];
              const isCorrect = answered ? userVal === s.correct : null;
              return `
                <div class="practice-tf-stmt ${answered ? (isCorrect ? 'correct' : 'wrong') : ''}">
                  <span class="study-tf-letter">${String.fromCharCode(97 + i)})</span>
                  <span class="study-tf-text">${this.escapeHtml(s.question)}</span>
                  <div class="practice-tf-btns">
                    ${answered ? `
                      <span class="practice-result ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? '✓' : '✗'} ${userVal ? 'Đúng' : 'Sai'}</span>
                      ${!isCorrect ? `<span class="practice-correct-label">→ ${s.correct ? 'Đúng' : 'Sai'}</span>` : ''}
                    ` : `
                      <button class="tf-btn" onclick="Study.practiceSelectTF(${i}, true)">Đúng</button>
                      <button class="tf-btn" onclick="Study.practiceSelectTF(${i}, false)">Sai</button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    } else {
      const letters = 'ABCD';
      container.innerHTML = `
        <div class="practice-card">
          <div class="study-badge mcq">Trắc nghiệm</div>
          <div class="study-question">${this.escapeHtml(q.question)}</div>
          <div class="practice-options">
            ${q.options.map((opt, i) => {
              if (state && state.answered) {
                const isCorrect = i === q.correctAnswer;
                const isSelected = i === state.selected;
                let cls = '';
                if (isCorrect) cls = 'correct';
                else if (isSelected && !isCorrect) cls = 'wrong';
                return `
                  <div class="practice-option ${cls} disabled">
                    <span class="study-option-letter">${letters[i]}</span>
                    <span class="study-option-text">${this.escapeHtml(opt)}</span>
                    ${isCorrect ? '<span class="study-correct-icon">✓</span>' : ''}
                    ${isSelected && !isCorrect ? '<span class="practice-wrong-icon">✗</span>' : ''}
                  </div>
                `;
              }
              return `
                <div class="practice-option clickable" onclick="Study.practiceSelectMCQ(${i})">
                  <span class="study-option-letter">${letters[i]}</span>
                  <span class="study-option-text">${this.escapeHtml(opt)}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Nav
    document.getElementById('practice-prev').disabled = this.currentIndex === 0;
    const isLast = this.currentIndex === this.questions.length - 1;
    document.getElementById('practice-next').classList.toggle('hidden', isLast);
    document.getElementById('practice-finish').classList.toggle('hidden', !isLast);
  },

  practiceSelectMCQ(optIndex) {
    const q = this.questions[this.currentIndex];
    if (this.practiceAnswered[this.currentIndex]) return;

    const isCorrect = optIndex === q.correctAnswer;
    this.practiceAnswered[this.currentIndex] = { answered: true, selected: optIndex, correct: isCorrect };

    if (isCorrect) this.practiceScore.correct++;
    else this.practiceScore.wrong++;

    // Save wrong questions
    if (!isCorrect) {
      WrongTracker.addWrong(this.subject, q);
    }

    this.renderPractice();
  },

  practiceSelectTF(stmtIdx, value) {
    const q = this.questions[this.currentIndex];
    if (!this.practiceAnswered[this.currentIndex]) {
      this.practiceAnswered[this.currentIndex] = {};
    }
    if (this.practiceAnswered[this.currentIndex][stmtIdx] !== undefined) return;

    const isCorrect = value === q.statements[stmtIdx].correct;
    this.practiceAnswered[this.currentIndex][stmtIdx] = value;

    if (isCorrect) this.practiceScore.correct++;
    else {
      this.practiceScore.wrong++;
      WrongTracker.addWrong(this.subject, q);
    }

    this.renderPractice();
  },

  practicePrev() {
    if (this.currentIndex > 0) { this.currentIndex--; this.renderPractice(); }
  },
  practiceNext() {
    if (this.currentIndex < this.questions.length - 1) { this.currentIndex++; this.renderPractice(); }
  },

  practiceFinish() {
    const total = this.practiceScore.correct + this.practiceScore.wrong;
    app.showResults(this.practiceScore.correct, total);
  },

  // Utility
  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

/**
 * Wrong Question Tracker — localStorage persistence
 */
const WrongTracker = {
  STORAGE_KEY: 'ontap_wrong_questions',

  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY)) || {};
    } catch { return {}; }
  },

  _save(data) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  },

  addWrong(subjectId, question) {
    const data = this._load();
    if (!data[subjectId]) data[subjectId] = [];

    // Unique key based on question text
    const key = question.question || question.passage || '';
    const exists = data[subjectId].some(q => (q.question || q.passage || '') === key);
    if (!exists) {
      data[subjectId].push(question);
    }
    this._save(data);
  },

  removeWrong(subjectId, question) {
    const data = this._load();
    if (!data[subjectId]) return;
    const key = question.question || question.passage || '';
    data[subjectId] = data[subjectId].filter(q => (q.question || q.passage || '') !== key);
    this._save(data);
  },

  getWrong(subjectId) {
    const data = this._load();
    return data[subjectId] || [];
  },

  getWrongCount(subjectId) {
    return this.getWrong(subjectId).length;
  },

  clearWrong(subjectId) {
    const data = this._load();
    delete data[subjectId];
    this._save(data);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Study, WrongTracker };
}
