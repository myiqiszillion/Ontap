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
    // Reset to defaults then apply new options to prevent state leakage (e.g. resume flag)
    this.options = {
      chunkSize: 0,
      useHighlight: false,
      resume: false,
      ...options
    };
    
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
      if (this.options.resume) {
        const saved = localStorage.getItem(`ontap_practice_${this.subject}`);
        if (saved) {
          try {
            const state = JSON.parse(saved);
            this.questions = state.questions;
            this.practiceQueue = state.practiceQueue;
            this.practiceScore = state.practiceScore;
            this.practiceMastered = state.practiceMastered;
            this.totalOriginalQuestions = state.totalOriginalQuestions;
          } catch (e) {
            console.error("Failed to parse saved practice state");
            this._initNewPractice();
          }
        } else {
          this._initNewPractice();
        }
      } else {
        this._initNewPractice();
      }
    }

    this.render();
  },

  _initNewPractice() {
    this.totalOriginalQuestions = this.questions.length;
    this.practiceQueue = [...Array(this.questions.length).keys()];
    this.practiceScore = { correct: 0, wrong: 0 };
    this.practiceMastered = 0;
    this.clearPracticeProgress();
    this.savePracticeProgress();
  },

  savePracticeProgress() {
    if (this.mode !== 'practice' || !this.subject) return;
    
    if (this.practiceQueue.length === 0) {
        this.clearPracticeProgress();
        return;
    }

    const state = {
      questions: this.questions,
      practiceQueue: this.practiceQueue,
      practiceScore: this.practiceScore,
      practiceMastered: this.practiceMastered,
      totalOriginalQuestions: this.totalOriginalQuestions
    };
    localStorage.setItem(`ontap_practice_${this.subject}`, JSON.stringify(state));
  },

  clearPracticeProgress() {
    if (this.subject) {
      localStorage.removeItem(`ontap_practice_${this.subject}`);
    }
  },

  /**
   * TTS Method
   */
  playTTS(text, btnId) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('playing');
    
    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      // Tìm voice tiếng Việt
      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(v => v.lang === 'vi-VN' || v.lang.startsWith('vi'));
      if (viVoice) utterance.voice = viVoice;
      utterance.rate = 0.95;
      utterance.onend = () => { if (btn) btn.classList.remove('playing'); };
      utterance.onerror = () => { if (btn) btn.classList.remove('playing'); };
      window.speechSynthesis.speak(utterance);
    };

    // Voices có thể chưa load xong, chờ nếu cần
    if (window.speechSynthesis.getVoices().length > 0) {
      speak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { speak(); };
    }
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
          <button class="tts-btn" id="study-tts-btn" onclick="Study.playTTS('${this.escapeHtml(q.passage.replace(/'/g, "\\'"))}', 'study-tts-btn')" title="Đọc văn bản"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
          <div class="study-passage">${this.escapeHtml(q.passage)}</div>
          ${q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : ''}
          <div class="study-answers">
            ${q.statements.map((s, i) => `
              <div class="study-tf-item ${s.correct ? 'correct' : 'wrong'}">
                <span class="study-tf-letter">${String.fromCharCode(97 + i)})</span>
                <span class="study-tf-text">${this.escapeHtml(s.question)}</span>
                <span class="study-tf-label ${s.correct ? 'correct' : 'wrong'}">${s.correct ? '<span class="status-icon-check"></span>Đúng' : '<span class="status-icon-cross"></span>Sai'}</span>
              </div>
            `).join('')}
          </div>
          ${this.renderStructuredSolution(q)}
        </div>
      `;
    } else if (q.type === 'shortanswer') {
      container.innerHTML = `
        <div class="study-card">
          <div class="study-badge sa">Trả lời ngắn</div>
          <button class="tts-btn" id="study-tts-btn" onclick="Study.playTTS('${this.escapeHtml(readText.replace(/'/g, "\\'"))}', 'study-tts-btn')" title="Đọc"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
          <div class="study-question">${this.escapeHtml(q.question)}</div>
          ${q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : ''}
          <div class="study-answers">
            <div class="study-option correct">
               <span class="study-option-text">Đáp án: <strong>${this.escapeHtml(q.correctAnswer)}</strong></span>
               <span class="study-correct-icon"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>
            </div>
          </div>
          ${this.renderStructuredSolution(q)}
        </div>
      `;
    } else {
      const letters = 'ABCD';
      container.innerHTML = `
        <div class="study-card">
          <div class="study-badge mcq">Trắc nghiệm</div>
          <button class="tts-btn" id="study-tts-btn" onclick="Study.playTTS('${this.escapeHtml(readText.replace(/'/g, "\\'"))}', 'study-tts-btn')" title="Đọc"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
          <div class="study-question">${this.escapeHtml(q.question)}</div>
          ${q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : ''}
          <div class="study-answers">
            ${q.options.map((opt, i) => `
              <div class="study-option ${i === q.correctAnswer ? 'correct' : ''}">
                <span class="study-option-letter">${letters[i]}</span>
                <span class="study-option-text">${this.escapeHtml(opt)}</span>
                ${i === q.correctAnswer ? '<span class="study-correct-icon"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>' : ''}
              </div>
            `).join('')}
          </div>
          ${this.renderStructuredSolution(q)}
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
    document.getElementById('fc-known').textContent = `Đã thuộc: ${known}`;
    document.getElementById('fc-progress-fill').style.width = `${(known / total) * 100}%`;

    if (remaining === 0) {
      if (this.nextChunk()) {
          document.getElementById('flashcard-content').innerHTML = `
            <div class="fc-done">
              <div class="fc-done-icon"><svg class="ui-icon ui-icon-xl" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
              <h2>Hoàn thành phần ${this.currentChunk} !</h2>
              <p>Bạn đã ghi nhớ ${total} câu. Sẵn sàng học phần tiếp theo chứ?</p>
              <button class="fc-btn known" onclick="Study.renderFlashcard()"><svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg> Học phần tiếp theo ngay</button>
            </div>
          `;
      } else {
          document.getElementById('flashcard-content').innerHTML = `
            <div class="fc-done">
              <div class="fc-done-icon"><svg class="ui-icon ui-icon-xl" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
              <h2>Đã thuộc hết!</h2>
              <p>Bạn đã ghi nhớ mượt mà toàn bộ câu hỏi.</p>
              <button class="fc-btn reset" onclick="Study.resetFlashcards()"><svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Học lại từ đầu</button>
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
            <button class="tts-btn" id="fc-tts-btn" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.passage.replace(/'/g, "\\'"))}', 'fc-tts-btn')" title="Đọc"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
            <div class="fc-question">${this.escapeHtml(q.passage)}</div>
            ${q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : ''}
            <div class="fc-statements">
              ${q.statements.map((s, i) => `
                <div class="fc-stmt">${String.fromCharCode(97 + i)}) ${this.escapeHtml(s.question)}</div>
              `).join('')}
            </div>
            <div class="fc-hint"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8"/><path d="M9 19.8V15m0 0H4.2m4.8 0L3 21"/><path d="M15 4.2V9m0 0h4.8M15 9l6-6"/><path d="M9 4.2V9m0 0H4.2M9 9 3 3"/></svg> Nhấn để lật thẻ</div>
          </div>
          <div class="fc-back">
            <div class="fc-type tf">Đáp án</div>
            ${q.statements.map((s, i) => `
              <div class="fc-answer-item ${s.correct ? 'correct' : 'wrong'}">
                ${String.fromCharCode(97 + i)}) ${s.correct ? '<span class="status-icon-check"></span>Đúng' : '<span class="status-icon-cross"></span>Sai'}
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
            <button class="tts-btn" id="fc-tts-btn" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.question.replace(/'/g, "\\'"))}', 'fc-tts-btn')" title="Đọc"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
            <div class="fc-question">${this.escapeHtml(q.question)}</div>
            <div class="fc-hint"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6z"/></svg> Nhấn để xem đáp án</div>
          </div>
          <div class="fc-back">
            <div class="fc-type sa">Đáp án</div>
            <button class="tts-btn" id="fc-tts-btn2" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.correctAnswer.replace(/'/g, "\\'"))}', 'fc-tts-btn2')" title="Đọc"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
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
            <button class="tts-btn" id="fc-tts-btn" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.question.replace(/'/g, "\\'"))}', 'fc-tts-btn')" title="Đọc"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
            <div class="fc-question">${this.escapeHtml(q.question)}</div>
            ${q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : ''}
            <div class="fc-options-preview">
              ${q.options.map((opt, i) => `
                <div class="fc-opt-preview">${letters[i]}. ${this.escapeHtml(opt)}</div>
              `).join('')}
            </div>
            <div class="fc-hint"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 15 6 6m-6-6v4.8m0-4.8h4.8"/><path d="M9 19.8V15m0 0H4.2m4.8 0L3 21"/><path d="M15 4.2V9m0 0h4.8M15 9l6-6"/><path d="M9 4.2V9m0 0H4.2M9 9 3 3"/></svg> Nhấn để lật thẻ</div>
          </div>
          <div class="fc-back">
            <div class="fc-type mcq">Đáp án</div>
            <button class="tts-btn" id="fc-tts-btn2" onclick="event.stopPropagation(); Study.playTTS('${this.escapeHtml(q.options[q.correctAnswer].replace(/'/g, "\\'"))}', 'fc-tts-btn2')" title="Đọc"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>
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
          ${q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : ''}
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
      const opts = q.options || [];
      if (opts.length === 0) {
        // Skip corrupted question - remove from queue and move on
        this.practiceQueue.shift();
        this.savePracticeProgress();
        this.renderPractice();
        return;
      }
      container.innerHTML = `
        <div class="practice-card">
          <div class="study-badge mcq">Trắc nghiệm</div>
          <div class="study-question">${this.escapeHtml(q.question)}</div>
          ${q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : ''}
          <div class="practice-options" id="practice-options">
            ${opts.map((opt, i) => `
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
      if (window.SoundFX) SoundFX.playCorrect();
      this.practiceScore.correct++;
      this.practiceMastered++;
      // Remove from queue
      this.practiceQueue.shift();
      if (window.MistakeStore && this.currentPracticeQuestion) {
        MistakeStore.recordSuccess(this.currentPracticeQuestion.id || this.currentPracticeQuestion.question);
      }
    } else {
      if (window.SoundFX) SoundFX.playWrong();
      this.practiceScore.wrong++;
      // Move to end of queue to repeat later
      const qIndex = this.practiceQueue.shift();
      this.practiceQueue.push(qIndex);
      WrongTracker.addWrong(this.subject, this.currentPracticeQuestion);
      if (window.MistakeStore && this.currentPracticeQuestion) {
        MistakeStore.recordMistake({
          subjectId: this.subject,
          lessonName: this.currentPracticeQuestion.lessonTitle || 'Luyện tập chuyên đề',
          question: this.currentPracticeQuestion,
          userAnswer: null
        });
      }
    }
    this.savePracticeProgress();
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
        opt.innerHTML += '<span class="study-correct-icon"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></span>';
      } else if (i === optIndex && !isCorrect) {
        opt.classList.add('wrong');
        opt.innerHTML += '<span class="practice-wrong-icon"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>';
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
      <span class="practice-result ${isCorrect ? 'correct' : 'wrong'}">${value ? 'Đúng' : 'Sai'}</span>
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
        ${isCorrect ? '<span class="practice-result correct"><span class="status-icon-check"></span>Đúng</span>' : `
          <span class="practice-result wrong"><span class="status-icon-cross"></span>Sai</span>
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
    if (window.SoundFX) SoundFX.playVictory();
    const container = document.getElementById('practice-content');
    container.innerHTML = `
      <div class="practice-card completion-card" style="text-align: center; padding: 40px 20px;">
        <h2 style="color: var(--primary-color); font-size: 2rem; margin-bottom: 10px;">Chúc mừng bạn hoàn thành xuất sắc!</h2>
        <p style="font-size: 1.1rem; color: var(--text-color); margin-bottom: 30px;">
          Bạn đã ôn tập vô hạn thành công và thông thạo toàn bộ ${this.totalOriginalQuestions} câu hỏi xuất sắc!
        </p>
        <div style="margin-bottom: 20px;"><svg class="ui-icon" viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
        <p><strong>Lỗi sai trong quá trình:</strong> ${this.practiceScore.wrong}</p>
        <button class="nav-btn submit" style="margin-top: 30px;" onclick="app.goHome()">Quay về Trang chủ</button>
      </div>
    `;

    // Hide progress and nav
    document.querySelector('.practice-header').style.display = 'none';
  },

  // Utility
  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    if (typeof document !== 'undefined' && document.createElement) {
      const div = document.createElement('div');
      div.textContent = String(text);
      return div.innerHTML;
    }
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  renderContent(text) {
    if (typeof FormulaRenderer !== 'undefined' && FormulaRenderer.render) {
      return FormulaRenderer.render(text);
    }
    return this.escapeHtml(text);
  },

  /**
   * Render Interactive Pedagogical Solution Accordion
   * Step-by-step breakdown, core method, and common pitfalls
   */
  renderStructuredSolution(q) {
    if (!q) return '';

    let method = '';
    let steps = [];
    let pitfall = '';

    // 1. Direct structured fields
    const obj = (typeof q.solution === 'object' && q.solution !== null) ? q.solution :
                (typeof q.pedagogicalSolution === 'object' && q.pedagogicalSolution !== null) ? q.pedagogicalSolution : q;

    if (obj.method || obj.solutionMethod || obj.coreMethod) {
      method = String(obj.method || obj.solutionMethod || obj.coreMethod).trim();
    }
    if (obj.steps || obj.solutionSteps) {
      const rawSteps = obj.steps || obj.solutionSteps;
      if (Array.isArray(rawSteps)) {
        steps = rawSteps.map(s => typeof s === 'string' ? s.trim() : (s.text || s.content || s.title || '')).filter(Boolean);
      } else if (typeof rawSteps === 'string') {
        steps = rawSteps.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      }
    }
    if (obj.pitfall || obj.pitfalls || obj.solutionPitfall || obj.commonPitfalls || obj.warning) {
      const rawPitfall = obj.pitfall || obj.pitfalls || obj.solutionPitfall || obj.commonPitfalls || obj.warning;
      if (Array.isArray(rawPitfall)) {
        pitfall = rawPitfall.join('; ');
      } else {
        pitfall = String(rawPitfall).trim();
      }
    }

    // 2. Text / markdown parsing from explanation or solution string
    const rawText = typeof q.explanation === 'string' ? q.explanation :
                    (typeof q.solution === 'string' ? q.solution :
                    (typeof q.loi_giai === 'string' ? q.loi_giai : ''));

    if (rawText && (!method || steps.length === 0 || !pitfall)) {
      const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let currentSec = null;
      const parsedMethod = [];
      const parsedSteps = [];
      const parsedPitfall = [];

      const isMethodHeader = (line) => /^(?:[-*#>\s]*)(?:phương pháp(?: giải)?|kiến thức trọng tâm|lý thuyết cốt lõi|core method|trọng tâm)[\s:*_–-]*(.*)$/i.exec(line);
      const isPitfallHeader = (line) => /^(?:[-*#>\s]*)(?:lưu ý(?: bẫy(?: đề thi)?)?|bẫy đề thi|sai lầm thường gặp|chú ý|cạm bẫy|pitfalls?|warning)[\s:*_–-]*(.*)$/i.exec(line);
      const isStepsHeader = (line) => /^(?:[-*#>\s]*)(?:các bước(?: giải| thực hiện)?|hướng dẫn giải|trình tự giải)[\s:*_–-]*(.*)$/i.exec(line);
      const isStepItem = (line) => /^(?:[-*#>\s]*)(?:bước\s*\d+|step\s*\d+|\d+\.)[\s:*_–-]*(.*)$/i.exec(line);

      let hasExplicitHeaders = false;

      for (const line of lines) {
        const mMatch = isMethodHeader(line);
        const pMatch = isPitfallHeader(line);
        const sHeader = isStepsHeader(line);
        const sItem = isStepItem(line);

        if (mMatch) {
          hasExplicitHeaders = true;
          currentSec = 'method';
          if (mMatch[1] && mMatch[1].trim()) parsedMethod.push(mMatch[1].trim());
        } else if (pMatch) {
          hasExplicitHeaders = true;
          currentSec = 'pitfall';
          if (pMatch[1] && pMatch[1].trim()) parsedPitfall.push(pMatch[1].trim());
        } else if (sHeader) {
          hasExplicitHeaders = true;
          currentSec = 'steps';
          if (sHeader[1] && sHeader[1].trim()) parsedSteps.push(sHeader[1].trim());
        } else if (sItem) {
          hasExplicitHeaders = true;
          currentSec = 'steps';
          parsedSteps.push(line.replace(/^[-*#>\s]+/, ''));
        } else {
          if (currentSec === 'method') {
            parsedMethod.push(line);
          } else if (currentSec === 'steps') {
            parsedSteps.push(line);
          } else if (currentSec === 'pitfall') {
            parsedPitfall.push(line);
          }
        }
      }

      if (hasExplicitHeaders) {
        if (!method && parsedMethod.length > 0) method = parsedMethod.join(' ');
        if (steps.length === 0 && parsedSteps.length > 0) steps = parsedSteps;
        if (!pitfall && parsedPitfall.length > 0) pitfall = parsedPitfall.join(' ');
      }

      // 3. Fallback for unstructured text
      if (!method && steps.length === 0 && !pitfall && rawText.trim()) {
        const sentences = rawText.split(/(?<=[.?!;])\s+/).map(s => s.trim()).filter(Boolean);
        if (sentences.length >= 3) {
          method = sentences[0];
          steps = sentences.slice(1, -1);
          pitfall = sentences[sentences.length - 1];
        } else if (sentences.length === 2) {
          method = sentences[0];
          steps = [sentences[1]];
          pitfall = 'Đọc kỹ câu hỏi, đối chiếu điều kiện bài toán và kiểm tra kỹ đơn vị trước khi chọn/điền đáp án.';
        } else {
          method = rawText.trim();
          steps = [
            'Bước 1: Phân tích kỹ dữ kiện câu hỏi và áp dụng trực tiếp kiến thức trọng tâm.',
            'Bước 2: Đối chiếu với các phương án để chọn hoặc điền kết quả chính xác.'
          ];
          pitfall = 'Lưu ý bẫy đề thi: Tránh đọc lướt câu hỏi dẫn tới nhầm lẫn các khái niệm tương đồng hoặc bỏ sót điều kiện biên.';
        }
      }
    }

    // Default fallbacks if partially missing
    if (!method && (steps.length > 0 || pitfall)) {
      method = 'Vận dụng định lý và quy tắc trọng tâm của bài học để giải quyết yêu cầu.';
    }
    if (steps.length === 0 && (method || pitfall)) {
      steps = [
        'Bước 1: Xác định rõ giả thiết và công thức / kiến thức liên quan.',
        'Bước 2: Tiến hành biến đổi logic hoặc tính toán để xác định đáp án chính xác.'
      ];
    }
    if (!pitfall && (method || steps.length > 0)) {
      pitfall = 'Lưu ý bẫy đề thi: Cần kiểm tra kỹ các phương án nhiễu, đơn vị đo lường và điều kiện bài toán trước khi hoàn thành.';
    }

    if (!method && steps.length === 0 && !pitfall) {
      if (q.question || q.passage || q.prompt) {
        method = 'Vận dụng kiến thức trọng tâm và định nghĩa cốt lõi của chủ đề.';
        steps = [
          'Bước 1: Phân tích kỹ yêu cầu của đề bài và các giả thiết cho trước.',
          'Bước 2: Áp dụng phương pháp giải đặc trưng để tìm ra kết quả chính xác.'
        ];
        pitfall = 'Lưu ý bẫy đề thi: Tránh nhầm lẫn giữa các câu hỏi phủ định (không đúng/sai) và kiểm tra lại đơn vị.';
      } else {
        return '';
      }
    }

    const renderText = (str) => {
      if (typeof this.renderContent === 'function') {
        return this.renderContent(str);
      }
      if (typeof this.escapeHtml === 'function') {
        return this.escapeHtml(str);
      }
      return String(str || '');
    };

    const stepsHtml = steps.map((s, idx) => `
      <li class="solution-step-item">
        <span class="solution-step-badge">${idx + 1}</span>
        <div class="solution-step-body">${renderText(s)}</div>
      </li>
    `).join('');

    return `
      <details class="solution-accordion pedagogical-solution" open>
        <summary class="solution-summary">
          <div class="solution-summary-title">
            <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <span>Phương pháp giải & Hướng dẫn sư phạm chi tiết</span>
          </div>
          <div class="solution-toggle-indicator">
            <span class="solution-toggle-text">Thu gọn / Mở rộng</span>
            <svg class="ui-icon ui-icon-xs chevron-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </summary>
        <div class="solution-details-content">
          <div class="solution-method">
            <div class="solution-section-header">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              <span class="solution-section-title">Phương pháp giải / Kiến thức trọng tâm</span>
            </div>
            <div class="solution-method-text">${renderText(method)}</div>
          </div>
          <div class="solution-steps">
            <div class="solution-section-header">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2 12.5"/><path d="m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2 17.5"/></svg>
              <span class="solution-section-title">Trình tự các bước thực hiện</span>
            </div>
            <ol class="solution-steps-list">
              ${stepsHtml}
            </ol>
          </div>
          <div class="solution-pitfall pitfall-alert">
            <div class="solution-section-header">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>
              <span class="solution-section-title">Lưu ý bẫy đề thi & Sai lầm thường gặp</span>
            </div>
            <div class="solution-pitfall-text">${renderText(pitfall)}</div>
          </div>
        </div>
      </details>
    `;
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

if (typeof window !== 'undefined') {
  window.Study = Study;
  window.WrongTracker = WrongTracker;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Study, WrongTracker };
}
