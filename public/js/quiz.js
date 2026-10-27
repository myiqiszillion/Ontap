/**
 * Quiz Module - Quiz rendering, assessment & scoring engine (NTMK Rebuild Phase 02)
 * Supports MCQ, MOET True/False Group (Decision 764/QĐ-BGDĐT partial scoring),
 * Short Answer normalization, Formula KaTeX rendering, session persistence & reload recovery.
 */

const Quiz = {
  currentQuestionIndex: 0,
  questions: [],
  answers: {},     // MCQ: { index: selectedOption }, TF-Group: { index: {0: bool, 1: bool, ...} }, SA: { index: text }
  subject: null,
  isSubmitting: false,
  isSubmitted: false,
  STORAGE_KEY: 'ntmk_active_exam_session_v2',

  /**
   * Initialize quiz
   */
  init(data) {
    this.sessionId = crypto.randomUUID();
    this.subject = data.subject;
    this.answers = {};
    this.currentQuestionIndex = 0;
    this.questions = data.questions || [];
    this.isSubmitting = false;
    this.isSubmitted = false;

    this.saveSession();
    this.render();
  },

  /**
   * Restore quiz from existing session (F5 Reload Recovery)
   */
  restoreSession(session) {
    if (!session || !session.questions || session.questions.length === 0) return false;
    this.untimed = Boolean(session.untimed);
    this.sessionId = session.id || crypto.randomUUID();
    this.subject = session.subjectId || session.subject;
    this.questions = session.questions;
    this.answers = session.answers || {};
    this.currentQuestionIndex = session.currentQuestionIndex || 0;
    this.isSubmitting = false;
    this.isSubmitted = false;

    this.render();
    return true;
  },

  /**
   * Persist session state to storage for reload recovery
   */
  saveSession() {
    try {
      if (this.isSubmitted) return;
      const session = {
        id: this.sessionId,
        untimed: Boolean(this.untimed),
        subjectId: this.subject,
        questions: this.questions,
        answers: this.answers,
        currentQuestionIndex: this.currentQuestionIndex,
        status: 'in_progress',
        updatedAt: Date.now()
      };
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Failed to save quiz session:', e);
    }
  },

  /**
   * Clear active session upon submission
   */
  clearSession() {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {}
  },

  /**
   * Helper: Render math/formula or escape HTML safely
   */
  renderContent(text) {
    if (typeof FormulaRenderer !== 'undefined' && FormulaRenderer.render) {
      return FormulaRenderer.render(text);
    }
    return this.escapeHtml(text);
  },

  /**
   * Render current question
   */
  render() {
    const q = this.questions[this.currentQuestionIndex];
    if (!q) return;

    const isGroup = q.type === 'tf-group' || q.format === 'true_false_group';
    const isShortAnswer = q.type === 'shortanswer' || q.format === 'short_answer';

    // Update type badge
    const typeBadge = document.getElementById('q-type-badge');
    if (typeBadge) {
      if (isGroup) {
        typeBadge.textContent = 'Đúng/Sai (Phần II)';
        typeBadge.className = 'question-type-badge tf';
      } else if (isShortAnswer) {
        typeBadge.textContent = 'Trả lời ngắn (Phần III)';
        typeBadge.className = 'question-type-badge sa';
      } else {
        typeBadge.textContent = 'Trắc nghiệm (Phần I)';
        typeBadge.className = 'question-type-badge';
      }
    }

    // Update progress
    const progressEl = document.getElementById('quiz-progress');
    if (progressEl) {
      progressEl.textContent = `${this.currentQuestionIndex + 1}/${this.questions.length}`;
    }

    const qNumEl = document.getElementById('q-num');
    if (qNumEl) {
      qNumEl.textContent = this.currentQuestionIndex + 1;
    }

    const qTextEl = document.getElementById('q-text');
    const container = document.getElementById('options-container');

    if (isGroup) {
      // === TF GROUP: passage + multiple statements ===
      const imgHtml = q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : '';
      const passageHtml = this.renderContent(q.passage || q.prompt || '');
      qTextEl.innerHTML = `<div class="question-passage">${passageHtml}</div>${imgHtml}`;

      const groupAnswers = this.answers[this.currentQuestionIndex] || {};
      const statements = (q.tfPayload && q.tfPayload.statements) || q.statements || [];

      container.innerHTML = statements.map((stmt, si) => {
        const userAnswer = groupAnswers[si];
        const isDung = userAnswer === true;
        const isSai = userAnswer === false;
        const stmtText = stmt.statement || stmt.question || '';

        return `
          <div class="tf-statement">
            <div class="tf-statement-text">
              <strong>${String.fromCharCode(97 + si)})</strong> ${this.renderContent(stmtText)}
            </div>
            <div class="tf-buttons">
              <button class="tf-btn${isDung ? ' selected' : ''}" onclick="Quiz.selectTF(${si}, true)" aria-label="Chọn Đúng">Đúng</button>
              <button class="tf-btn${isSai ? ' selected' : ''}" onclick="Quiz.selectTF(${si}, false)" aria-label="Chọn Sai">Sai</button>
            </div>
          </div>
        `;
      }).join('');

    } else if (isShortAnswer) {
      // === SHORT ANSWER ===
      const promptText = q.question || q.prompt || '';
      qTextEl.innerHTML = this.renderContent(promptText);

      const userText = this.answers[this.currentQuestionIndex] || '';

      container.innerHTML = `
        <div class="sa-container">
          <label for="sa-input-field" class="sr-only">Nhập câu trả lời</label>
          <input type="text"
                 id="sa-input-field"
                 class="sa-input"
                 placeholder="Nhập kết quả hoặc số cần điền..."
                 value="${this.escapeHtml(userText)}"
                 oninput="Quiz.inputShortAnswer(this.value)">
          <div style="font-size: 0.85rem; color: var(--text-dim); margin-top: 8px;">
            💡 Hỗ trợ cả số thập phân dấu phẩy (vd: 1,5) và dấu chấm (vd: 1.5).
          </div>
        </div>
      `;
    } else {
      // === MCQ: single question with options ===
      const mcqImgHtml = q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : '';
      const promptText = q.question || q.prompt || '';
      qTextEl.innerHTML = `${this.renderContent(promptText)}${mcqImgHtml}`;

      const letters = 'ABCD';
      const selected = this.answers[this.currentQuestionIndex];
      const options = (q.mcqPayload && q.mcqPayload.options) || q.options || [];

      container.innerHTML = options.map((opt, i) => {
        const isSelected = selected === i;
        return `
          <button class="option${isSelected ? ' selected' : ''}"
                  onclick="Quiz.selectOption(${i})">
            <span class="option-letter">${letters[i] || (i + 1)}</span>
            <span class="option-text">${this.renderContent(opt)}</span>
          </button>
        `;
      }).join('');
    }

    this.renderDots();

    // Nav buttons
    const btnPrev = document.getElementById('btn-prev');
    if (btnPrev) btnPrev.disabled = this.currentQuestionIndex === 0;

    const isLast = this.currentQuestionIndex === this.questions.length - 1;
    const btnNext = document.getElementById('btn-next');
    const btnSubmit = document.getElementById('btn-submit');
    if (btnNext) btnNext.classList.toggle('hidden', isLast);
    if (btnSubmit) btnSubmit.classList.toggle('hidden', !isLast);
  },

  /**
   * Render question navigation dots
   */
  renderDots() {
    const container = document.getElementById('question-dots');
    if (!container) return;

    container.innerHTML = this.questions.map((q, i) => {
      const isCurrent = i === this.currentQuestionIndex;
      let isAnswered = false;

      const isGroup = q.type === 'tf-group' || q.format === 'true_false_group';
      const isShortAnswer = q.type === 'shortanswer' || q.format === 'short_answer';
      const statements = (q.tfPayload && q.tfPayload.statements) || q.statements || [];

      if (isGroup) {
        const ga = this.answers[i];
        isAnswered = ga && Object.keys(ga).length === statements.length;
      } else if (isShortAnswer) {
        isAnswered = this.answers[i] !== undefined && String(this.answers[i]).trim() !== '';
      } else {
        isAnswered = this.answers[i] !== undefined;
      }

      let typeClass = '';
      if (isGroup) typeClass = ' tf-dot';
      if (isShortAnswer) typeClass = ' sa-dot';
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
    if (window.SoundFX) SoundFX.playClick();
    this.answers[this.currentQuestionIndex] = index;
    this.saveSession();
    this.render();
  },

  /**
   * Select TF statement answer
   */
  selectTF(statementIndex, value) {
    if (window.SoundFX) SoundFX.playClick();
    if (!this.answers[this.currentQuestionIndex]) {
      this.answers[this.currentQuestionIndex] = {};
    }
    this.answers[this.currentQuestionIndex][statementIndex] = value;
    this.saveSession();
    this.render();
  },

  /**
   * Input short answer text
   */
  inputShortAnswer(value) {
    this.answers[this.currentQuestionIndex] = value;
    this.saveSession();
    this.renderDots();
  },

  prev() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.saveSession();
      this.render();
    }
  },

  next() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.saveSession();
      this.render();
    }
  },

  goTo(index) {
    if (index >= 0 && index < this.questions.length) {
      this.currentQuestionIndex = index;
      this.saveSession();
      this.render();
    }
  },

  /**
   * Submit quiz with MOET Partial Scoring and Duplicate Submission Prevention
   */
  submit(force = false) {
    if (this.isSubmitting || this.isSubmitted) {
      console.warn('Submission already in progress or completed.');
      return;
    }

    // Count unanswered questions
    let unanswered = 0;
    this.questions.forEach((q, i) => {
      const isGroup = q.type === 'tf-group' || q.format === 'true_false_group';
      const isShortAnswer = q.type === 'shortanswer' || q.format === 'short_answer';
      const statements = (q.tfPayload && q.tfPayload.statements) || q.statements || [];

      if (isGroup) {
        const ga = this.answers[i] || {};
        if (Object.keys(ga).length < statements.length) unanswered++;
      } else if (isShortAnswer) {
        if (!this.answers[i] || String(this.answers[i]).trim() === '') unanswered++;
      } else {
        if (this.answers[i] === undefined) unanswered++;
      }
    });

    if (unanswered > 0 && !force) {
      if (!confirm(`Còn ${unanswered} câu chưa hoàn thành đầy đủ. Bạn có chắc chắn muốn nộp bài?`)) {
        return;
      }
    }

    // Set lock
    this.isSubmitting = true;

    // Use Subject Scoring Engine if available, or robust built-in MOET scoring
    let earnedPoints = 0;
    let totalPoints = 0;

    const TF_MOET_MAP = { 0: 0.0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 };

    this.questions.forEach((q, i) => {
      const isGroup = q.type === 'tf-group' || q.format === 'true_false_group';
      const isShortAnswer = q.type === 'shortanswer' || q.format === 'short_answer';

      if (isGroup) {
        // True/False group: Max 1.0 point under MOET QĐ 764
        totalPoints += 1.0;
        const ga = this.answers[i] || {};
        const statements = (q.tfPayload && q.tfPayload.statements) || q.statements || [];
        let correctCount = 0;

        statements.forEach((stmt, si) => {
          if (ga[si] !== undefined && ga[si] === stmt.correct) {
            correctCount++;
          }
        });

        const partial = TF_MOET_MAP[correctCount] || 0.0;
        earnedPoints += partial;

      } else if (isShortAnswer) {
        // Short Answer: 1.0 point (or subject weighted)
        totalPoints += 1.0;
        const isCorrect = typeof ScoringEngine !== 'undefined' && ScoringEngine.evaluateShortAnswer(this.answers[i], q).isCorrect;

        if (isCorrect) earnedPoints += 1.0;

      } else {
        // MCQ: 1.0 point (or subject weighted)
        totalPoints += 1.0;
        const correctOpt = q.mcqPayload !== undefined
          ? q.mcqPayload.correctOptionIndex
          : (q.correctAnswer !== undefined ? q.correctAnswer : q.correct);

        if (this.answers[i] !== undefined && Number(this.answers[i]) === Number(correctOpt)) {
          earnedPoints += 1.0;
        }
      }
    });

    // Round cleanly
    earnedPoints = Math.round(earnedPoints * 100) / 100;
    totalPoints = Math.round(totalPoints * 100) / 100;

    this.isSubmitted = true;
    this.clearSession();

    if (window.SoundFX) SoundFX.playVictory();
    if (typeof app !== 'undefined' && app.showResults) {
      app.showResults(earnedPoints, totalPoints, this.sessionId);
    }
  },

  /**
   * Detailed answer review screen
   */
  review() {
    const section = document.getElementById('review-section');
    const container = document.getElementById('review-list');
    if (!section || !container) return;

    const TF_MOET_MAP = { 0: 0.0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 };

    container.innerHTML = this.questions.map((q, i) => {
      const isGroup = q.type === 'tf-group' || q.format === 'true_false_group';
      const isShortAnswer = q.type === 'shortanswer' || q.format === 'short_answer';

      if (isGroup) {
        const ga = this.answers[i] || {};
        const statements = (q.tfPayload && q.tfPayload.statements) || q.statements || [];
        let correctCount = 0;

        const statementsHtml = statements.map((stmt, si) => {
          const userVal = ga[si];
          const isCorrect = userVal !== undefined && userVal === stmt.correct;
          if (isCorrect) correctCount++;

          const userText = userVal === true ? 'Đúng' : userVal === false ? 'Sai' : 'Chưa trả lời';
          const correctText = stmt.correct ? 'Đúng' : 'Sai';
          const stmtText = stmt.statement || stmt.question || '';

          return `
            <div class="review-tf-statement ${isCorrect ? 'correct' : 'wrong'}">
              <span class="review-tf-label">${String.fromCharCode(97 + si)})</span>
              ${this.renderContent(stmtText)}
              <span class="review-tf-answer">
                ${isCorrect ? '✓' : '✗'} Bạn chọn: ${userText}
                ${!isCorrect ? `→ Đáp án: ${correctText}` : ''}
              </span>
            </div>
          `;
        }).join('');

        const scoreEarned = TF_MOET_MAP[correctCount] || 0.0;

        return `
          <div class="review-item tf-review">
            <div class="review-question" style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <span class="review-type">Đ/S (Phần II)</span>
                Câu ${i + 1}: Bài tập Đúng/Sai (${correctCount}/${statements.length} ý đúng)
              </div>
              <div style="font-weight:600; color: ${scoreEarned > 0 ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)'}">
                Điểm: +${scoreEarned} / 1.0 đ
              </div>
            </div>
            <div class="review-passage-short">${this.renderContent(q.passage || q.prompt || '')}</div>
            ${statementsHtml}
          </div>
        `;
      } else if (isShortAnswer) {
        const userText = String(this.answers[i] || '').trim();
        const normUser = userText.replace(/,/g, '.').toLowerCase();

        let accepted = [];
        if (q.shortAnswerPayload && Array.isArray(q.shortAnswerPayload.correctAnswers)) {
          accepted = q.shortAnswerPayload.correctAnswers.map(a => String(a).trim());
        } else {
          const ans = q.correct !== undefined ? q.correct : (q.correctAnswer !== undefined ? q.correctAnswer : '');
          accepted = [String(ans).trim()];
        }

        const isCorrect = accepted.some(a => a.replace(/,/g, '.').toLowerCase() === normUser);
        const promptText = q.question || q.prompt || '';

        return `
          <div class="review-item ${isCorrect ? 'correct' : 'wrong'}">
            <div class="review-question">
              <span class="review-type">TLN (Phần III)</span>
              Câu ${i + 1}: ${this.renderContent(promptText)}
            </div>
            <div class="review-answer ${isCorrect ? 'correct' : 'wrong'}">
              ${isCorrect ? '✓' : '✗'} Bạn điền: ${userText ? this.escapeHtml(userText) : '<em>Chưa trả lời</em>'}
            </div>
            ${!isCorrect ? `
              <div class="review-answer correct">
                ✓ Đáp án đúng: ${accepted.map(a => this.escapeHtml(a)).join(' hoặc ')}
              </div>
            ` : ''}
          </div>
        `;
      } else {
        const userAnswer = this.answers[i];
        const correctOpt = q.mcqPayload !== undefined
          ? q.mcqPayload.correctOptionIndex
          : (q.correctAnswer !== undefined ? q.correctAnswer : q.correct);

        const options = (q.mcqPayload && q.mcqPayload.options) || q.options || [];
        const isCorrect = userAnswer !== undefined && Number(userAnswer) === Number(correctOpt);
        const userText = userAnswer !== undefined && options[userAnswer] ? options[userAnswer] : 'Chưa trả lời';
        const correctText = options[correctOpt] || '';
        const promptText = q.question || q.prompt || '';

        return `
          <div class="review-item ${isCorrect ? 'correct' : 'wrong'}">
            <div class="review-question">
              <span class="review-type">TN (Phần I)</span>
              Câu ${i + 1}: ${this.renderContent(promptText)}
            </div>
            <div class="review-answer ${isCorrect ? 'correct' : 'wrong'}">
              ${isCorrect ? '✓' : '✗'} Bạn chọn: ${this.renderContent(userText)}
            </div>
            ${!isCorrect ? `
              <div class="review-answer correct">
                ✓ Đáp án đúng: ${this.renderContent(correctText)}
              </div>
            ` : ''}
          </div>
        `;
      }
    }).join('');

    section.classList.remove('hidden');
  },

  retry() {
    const revEl = document.getElementById('review-section');
    if (revEl) revEl.classList.add('hidden');
    this.clearSession();
    if (typeof app !== 'undefined' && app.startLearning) {
      app.startLearning();
    }
  },

  escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Quiz;
}
