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

  // Memorization Enhancement Settings
  options: {
    chunkSize: 0,
    useHighlight: false
  },
  currentChunk: 0,

  /**
   * Initialize a learning mode
   */
  init(data, mode, options = {}) {
    this.mode = mode;
    this.subject = data.subject;
    this.options = { ...this.options, ...options };
    
    // Chunking logic
    if (['study', 'flashcard'].includes(mode) && this.options.chunkSize > 0) {
      this.fullQuestionsList = data.questions;
      this.currentChunk = 0;
      this.loadChunk();
    } else {
      this.fullQuestionsList = null;
      this.questions = data.questions;
      this.setupMode(mode);
    }
  },

  loadChunk() {
    const start = this.currentChunk * this.options.chunkSize;
    const end = start + this.options.chunkSize;
    this.questions = this.fullQuestionsList.slice(start, end);
    this.setupMode(this.mode);
  },

  nextChunk() {
    if (this.fullQuestionsList && (this.currentChunk + 1) * this.options.chunkSize < this.fullQuestionsList.length) {
      this.currentChunk++;
      this.loadChunk();
      return true;
    }
    return false;
  },

  setupMode(mode) {
    this.currentIndex = 0;

    if (mode === 'flashcard') {
      this.flashcardKnown = new Set();
      this.flashcardQueue = [...Array(this.questions.length).keys()];
      this.isFlipped = false;
    }

    if (mode === 'practice') {
      this.totalOriginalQuestions = this.questions.length;
      this.practiceQueue = [...Array(this.questions.length).keys()];
      this.practiceScore = { correct: 0, wrong: 0 };
      this.practiceMastered = 0;
    }

    this.render();
  },

  /**
   * TTS Method
   */
  playTTS(text, btnId) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // Stop playing current audio
    
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('playing');
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN'; // Vietnamese
    utterance.onend = () => { if (btn) btn.classList.remove('playing'); };
    utterance.onerror = () => { if (btn) btn.classList.remove('playing'); };
    
    window.speechSynthesis.speak(utterance);
  },

  stopTTS() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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

    const readText = `Câu hỏi: ${q.question}. ${q.type === 'shortanswer' ? `Đáp án: ${q.correctAnswer}` : q.type === 'mcq' ? `Đáp án: ${q.options[q.correctAnswer]}` : ''}`;

    if (q.type === 'tf-group') {
      container.innerHTML = `
        <div class="study-card">
          <div class="study-badge tf">Đúng/Sai</div>
          <button class="tts-btn" id="study-tts-btn" onclick="Study.playTTS('${this.escapeHtml(q.passage.replace(/'/g, "\\'"))}', 'study-tts-btn')" title="Đọc văn bản">🔊</button>
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
        </div>
      `;
    } else if (q.type === 'shortanswer') {
      container.innerHTML = `
        <div class="study-card">
          <div class="study-badge sa">Trả lời ngắn</div>
          <button class="tts-btn" id="study-tts-btn" onclick="Study.playTTS('${this.escapeHtml(readText.replace(/'/g, "\\'"))}', 'study-tts-btn')" title="Đọc">🔊</button>
          <div class="study-question">${this.escapeHtml(q.question)}</div>
          <div class="study-answers">
            <div class="study-option correct">
               <span class="study-option-text">Đáp án: <strong>${this.escapeHtml(q.correctAnswer)}</strong></span>
               <span class="study-correct-icon">✓</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const letters = 'ABCD';
      container.innerHTML = `
        <div class="study-card">
          <div class="study-badge mcq">Trắc nghiệm</div>
          <button class="tts-btn" id="study-tts-btn" onclick="Study.playTTS('${this.escapeHtml(readText.replace(/'/g, "\\'"))}', 'study-tts-btn')" title="Đọc">🔊</button>
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
    this.stopTTS();
    if (this.currentIndex > 0) { this.currentIndex--; this.renderStudy(); }
  },
  studyNext() {
    this.stopTTS();
    if (this.currentIndex < this.questions.length - 1) { 
        this.currentIndex++; 
        this.renderStudy(); 
    } else if (this.nextChunk()) {
        alert(`Chuyển sang ${this.options.chunkSize} câu tiếp theo!`);
    } else if (this.fullQuestionsList) {
        alert('Đã học xong toàn bộ bài học!');
    }
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
      if (this.nextChunk()) {
          document.getElementById('flashcard-content').innerHTML = `
            <div class="fc-done">
              <div class="fc-done-icon">🎉</div>
              <h2>Hoàn thành phần ${this.currentChunk} !</h2>
              <p>Bạn đã ghi nhớ ${total} câu. Sẵn sàng học phần tiếp theo chứ?</p>
              <button class="fc-btn known" onclick="Study.renderFlashcard()">🚀 Học phần tiếp theo ngay</button>
            </div>
          `;
      } else {
          document.getElementById('flashcard-content').innerHTML = `
            <div class="fc-done">
              <div class="fc-done-icon">🎉</div>
              <h2>Đã thuộc hết!</h2>
              <p>Bạn đã ghi nhớ mượt mà toàn bộ câu hỏi.</p>
              <button class="fc-btn reset" onclick="Study.resetFlashcards()">🔄 Học lại từ đầu</button>
            </div>
          `;
      }
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

    const readText = `Câu hỏi: ${q.question}. ${q.type === 'shortanswer' ? `Đáp án: ${q.correctAnswer}` : q.type === 'mcq' ? `Đáp án: ${q.options[q.correctAnswer]}` : ''}`;

    if (q.type === 'tf-group') {
      card.innerHTML = `
        <div class="fc-card" id="fc-card" onclick="Study.flipCard()">
          <div class="fc-front">
            <div class="fc-type tf">Đúng/Sai</div>
            <button class="tts-btn" id="fc-tts-btn" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.passage.replace(/'/g, "\\'"))}', 'fc-tts-btn')" title="Đọc">🔊</button>
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
        </div>
      `;
    } else if (q.type === 'shortanswer') {
      card.innerHTML = `
        <div class="fc-card" id="fc-card" onclick="Study.flipCard()">
          <div class="fc-front">
            <div class="fc-type sa">Trả lời ngắn</div>
            <button class="tts-btn" id="fc-tts-btn" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.question.replace(/'/g, "\\'"))}', 'fc-tts-btn')" title="Đọc">🔊</button>
            <div class="fc-question">${this.escapeHtml(q.question)}</div>
            <div class="fc-hint">👆 Nhấn để xem đáp án</div>
          </div>
          <div class="fc-back">
            <div class="fc-type sa">Đáp án</div>
            <button class="tts-btn" id="fc-tts-btn2" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.correctAnswer.replace(/'/g, "\\'"))}', 'fc-tts-btn2')" title="Đọc">🔊</button>
            <div class="fc-correct-answer">${this.escapeHtml(q.correctAnswer)}</div>
          </div>
        </div>
      `;
    } else {
      const letters = 'ABCD';
      card.innerHTML = `
        <div class="fc-card" id="fc-card" onclick="Study.flipCard()">
          <div class="fc-front">
            <div class="fc-type mcq">Trắc nghiệm</div>
            <button class="tts-btn" id="fc-tts-btn" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.question.replace(/'/g, "\\'"))}', 'fc-tts-btn')" title="Đọc">🔊</button>
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
            <button class="tts-btn" id="fc-tts-btn2" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.options[q.correctAnswer].replace(/'/g, "\\'"))}', 'fc-tts-btn2')" title="Đọc">🔊</button>
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
  //  PRACTICE MODE — Infinite Queue until Mastery
  // ═══════════════════════════════════════════════
  renderPractice() {
    if (this.practiceQueue.length === 0) {
      this.renderPracticeFinish();
      return;
    }

    const qIndex = this.practiceQueue[0];
    const q = this.questions[qIndex];
    if (!q) return;

    this.currentPracticeQuestion = q;
    this.currentPracticeIndex = qIndex;

    const container = document.getElementById('practice-content');
    const progress = document.getElementById('practice-progress');
    const bar = document.getElementById('practice-progress-fill');
    const scoreEl = document.getElementById('practice-score');

    progress.textContent = `Thuộc: ${this.practiceMastered} / ${this.totalOriginalQuestions}`;
    bar.style.width = `${(this.practiceMastered / this.totalOriginalQuestions) * 100}%`;
    scoreEl.textContent = `Lỗi sai: ${this.practiceScore.wrong}`;

    if (q.type === 'tf-group') {
      container.innerHTML = `
        <div class="practice-card">
          <div class="study-badge tf">Đúng/Sai</div>
          <div class="study-passage">${this.escapeHtml(q.passage)}</div>
          <div class="practice-statements">
            ${q.statements.map((s, i) => {
              return `
                <div class="practice-tf-stmt" id="practice-tf-stmt-${i}">
                  <span class="study-tf-letter">${String.fromCharCode(97 + i)})</span>
                  <span class="study-tf-text">${this.escapeHtml(s.question)}</span>
                  <div class="practice-tf-btns" id="practice-tf-btns-${i}">
                      <button class="tf-btn" onclick="Study.practiceSelectTF(${i}, true)">Đúng</button>
                      <button class="tf-btn" onclick="Study.practiceSelectTF(${i}, false)">Sai</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <button id="practice-next-btn" class="nav-btn next hidden" onclick="Study.practiceNext()">Tiếp tục →</button>
        </div>
      `;
      this.currentTfState = { correct: 0, answered: 0, wrong: false };
    } else if (q.type === 'shortanswer') {
      container.innerHTML = `
        <div class="practice-card">
          <div class="study-badge sa">Trả lời ngắn</div>
          <div class="study-question">${this.escapeHtml(q.question)}</div>
          <div class="practice-sa-container" id="practice-sa-container">
              <div class="sa-input-wrapper">
                <input type="text" id="practice-sa-input" class="sa-input" placeholder="Nhập câu trả lời..." onkeypress="if(event.key==='Enter') Study.practiceSubmitSA()">
                <button class="practice-sa-btn" onclick="Study.practiceSubmitSA()">Kiểm tra</button>
              </div>
          </div>
          <button id="practice-next-btn" class="nav-btn next hidden" style="margin-top: 20px" onclick="Study.practiceNext()">Tiếp tục →</button>
        </div>
      `;
    } else {
      const letters = 'ABCD';
      container.innerHTML = `
        <div class="practice-card">
          <div class="study-badge mcq">Trắc nghiệm</div>
          <div class="study-question">${this.escapeHtml(q.question)}</div>
          <div class="practice-options" id="practice-options">
            ${q.options.map((opt, i) => `
                <div class="practice-option clickable" id="practice-opt-${i}" onclick="Study.practiceSelectMCQ(${i})">
                  <span class="study-option-letter">${letters[i]}</span>
                  <span class="study-option-text">${this.escapeHtml(opt)}</span>
                </div>
              `).join('')}
          </div>
          <button id="practice-next-btn" class="nav-btn next hidden" style="margin-top: 20px" onclick="Study.practiceNext()">Tiếp tục →</button>
        </div>
      `;
    }

    // Disable Prev nav, practice is forward sequence until empty queue
    document.getElementById('practice-prev').classList.add('hidden');
    document.getElementById('practice-next').classList.add('hidden'); // controlled within questions now
    document.getElementById('practice-finish').classList.add('hidden');
  },

  handleAnswerFeedback(isCorrect) {
    if (isCorrect) {
      this.practiceScore.correct++;
      this.practiceMastered++;
      // Remove from queue
      this.practiceQueue.shift();
    } else {
      this.practiceScore.wrong++;
      // Move to end of queue to repeat later
      const qIndex = this.practiceQueue.shift();
      this.practiceQueue.push(qIndex);
      WrongTracker.addWrong(this.subject, this.currentPracticeQuestion);
    }
    
    // Show next button
    document.getElementById('practice-next-btn').classList.remove('hidden');
  },

  practiceSelectMCQ(optIndex) {
    // Prevent double clicking
    if (document.getElementById('practice-next-btn').classList.contains('hidden') === false) return;

    const q = this.currentPracticeQuestion;
    const isCorrect = optIndex === q.correctAnswer;
    
    // UI Update
    const options = document.querySelectorAll('.practice-option');
    options.forEach((opt, i) => {
      opt.classList.remove('clickable');
      opt.onclick = null;
      if (i === q.correctAnswer) {
        opt.classList.add('correct');
        opt.innerHTML += '<span class="study-correct-icon">✓</span>';
      } else if (i === optIndex && !isCorrect) {
        opt.classList.add('wrong');
        opt.innerHTML += '<span class="practice-wrong-icon">✗</span>';
      } else {
        opt.classList.add('disabled');
      }
    });

    this.handleAnswerFeedback(isCorrect);
  },

  practiceSelectTF(stmtIdx, value) {
    if (this.currentTfState.answered >= this.currentPracticeQuestion.statements.length) return;
    
    const stmtRow = document.getElementById(`practice-tf-stmt-${stmtIdx}`);
    if (stmtRow.classList.contains('correct') || stmtRow.classList.contains('wrong')) return;

    const s = this.currentPracticeQuestion.statements[stmtIdx];
    const isCorrect = value === s.correct;
    
    this.currentTfState.answered++;
    if (!isCorrect) this.currentTfState.wrong = true;

    // UI Feedback for this row
    stmtRow.classList.add(isCorrect ? 'correct' : 'wrong');
    const btnsContainer = document.getElementById(`practice-tf-btns-${stmtIdx}`);
    
    btnsContainer.innerHTML = `
      <span class="practice-result ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? '✓' : '✗'} ${value ? 'Đúng' : 'Sai'}</span>
      ${!isCorrect ? `<span class="practice-correct-label">→ ${s.correct ? 'Đúng' : 'Sai'}</span>` : ''}
    `;

    // If all statements answered
    if (this.currentTfState.answered === this.currentPracticeQuestion.statements.length) {
      this.handleAnswerFeedback(!this.currentTfState.wrong);
    }
  },

  practiceSubmitSA() {
    if (document.getElementById('practice-next-btn').classList.contains('hidden') === false) return;

    const q = this.currentPracticeQuestion;
    const inputEl = document.getElementById('practice-sa-input');
    if (!inputEl) return;
    
    const userText = inputEl.value.trim();
    if (!userText) return;

    const correctText = String(q.correctAnswer).trim().toLowerCase();
    const isCorrect = userText.toLowerCase() === correctText;

    const container = document.getElementById('practice-sa-container');
    container.innerHTML = `
      <div class="practice-sa-result ${isCorrect ? 'correct' : 'wrong'}">
        <div class="practice-sa-input-readonly">${this.escapeHtml(userText)}</div>
        ${isCorrect ? '<span class="practice-result correct">✓ Đúng</span>' : `
          <span class="practice-result wrong">✗ Sai</span>
          <div class="practice-sa-correct-ans">Đáp án đúng: <strong>${this.escapeHtml(q.correctAnswer)}</strong></div>
        `}
      </div>
    `;

    this.handleAnswerFeedback(isCorrect);
  },

  practiceNext() {
    this.renderPractice();
  },

  renderPracticeFinish() {
    const container = document.getElementById('practice-content');
    container.innerHTML = `
      <div class="practice-card completion-card" style="text-align: center; padding: 40px 20px;">
        <h2 style="color: var(--primary-color); font-size: 2rem; margin-bottom: 10px;">🎉 Chúc mừng bạn! 🎉</h2>
        <p style="font-size: 1.1rem; color: var(--text-color); margin-bottom: 30px;">
          Bạn đã ôn tập vô hạn thành công và thông thạo toàn bộ ${this.totalOriginalQuestions} câu hỏi xuất sắc!
        </p>
        <div style="font-size: 4rem; margin-bottom: 20px;">🏆</div>
        <p><strong>Lỗi sai trong quá trình:</strong> ${this.practiceScore.wrong}</p>
        <button class="nav-btn submit" style="margin-top: 30px;" onclick="app.goHome()">Quay về Trang chủ</button>
      </div>
    `;

    // Hide progress and nav
    document.querySelector('.practice-header').style.display = 'none';
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
