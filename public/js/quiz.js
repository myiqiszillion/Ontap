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
  flaggedQuestions: new Set(),
  sidebarFilter: 'all',
  fontSizeLevel: 0,
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
    this.flaggedQuestions = new Set();

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
    this.flaggedQuestions = new Set(session.flags || []);

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
        flags: Array.from(this.flaggedQuestions),
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

  setSidebarFilter(filter) {
    this.sidebarFilter = filter;
    ['all', 'unanswered', 'flagged'].forEach(f => {
      const btn = document.getElementById(`tab-filter-${f}`);
      if (btn) btn.classList.toggle('active', f === filter);
    });
    this.renderDots();
  },

  insertMathSymbol(sym) {
    const el = document.getElementById('sa-input-field');
    if (!el) return;
    if (sym === 'BACKSPACE') {
      el.value = el.value.slice(0, -1);
    } else {
      el.value += sym;
    }
    el.focus();
    this.inputShortAnswer(el.value);
  },

  toggleFlag(idx = this.currentQuestionIndex) {
    if (!this.flaggedQuestions) this.flaggedQuestions = new Set();
    if (this.flaggedQuestions.has(idx)) {
      this.flaggedQuestions.delete(idx);
    } else {
      this.flaggedQuestions.add(idx);
      if (typeof SoundFX !== 'undefined' && SoundFX.playClick) SoundFX.playClick();
    }
    this.saveSession();
    this.render();
  },

  changeFontSize(delta) {
    this.fontSizeLevel = Math.max(-2, Math.min(3, this.fontSizeLevel + delta));
    if (typeof document === 'undefined') return;
    const mainEl = document.querySelector('.quiz-main');
    if (mainEl) {
      const ptSizes = ['0.85rem', '0.92rem', '1.05rem', '1.18rem', '1.3rem', '1.45rem'];
      const targetSize = ptSizes[this.fontSizeLevel + 2];
      mainEl.style.fontSize = targetSize;
      const qText = document.getElementById('q-text');
      if (qText) qText.style.fontSize = targetSize;
    }
  },

  toggleZenMode() {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('zen-mode');
    }
  },

  render() {
    if (typeof document === 'undefined') return;
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
      if (!progressEl.dataset.scrollBound) {
        progressEl.dataset.scrollBound = 'true';
        progressEl.style.cursor = 'pointer';
        progressEl.setAttribute('role', 'button');
        progressEl.setAttribute('tabindex', '0');
        progressEl.setAttribute('title', 'Bấm để cuộn nhanh tới bảng danh sách câu hỏi');
        const jumpToPalette = () => {
          const target = document.getElementById('question-dots') || document.querySelector('.quiz-sidebar');
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            target.classList.add('highlight-pulse');
            setTimeout(() => target.classList.remove('highlight-pulse'), 1200);
          }
        };
        progressEl.addEventListener('click', jumpToPalette);
        progressEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            jumpToPalette();
          }
        });
      }
    }

    const qNumEl = document.getElementById('q-num');
    if (qNumEl) {
      qNumEl.textContent = this.currentQuestionIndex + 1;
    }

    const flagBtn = document.getElementById('q-flag-btn');
    if (flagBtn) {
      const isFlagged = this.flaggedQuestions && this.flaggedQuestions.has(this.currentQuestionIndex);
      flagBtn.className = `btn-flag-toggle ${isFlagged ? 'active' : ''}`;
      const flagSvg = isFlagged
        ? '<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>'
        : '<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>';
      flagBtn.innerHTML = `${flagSvg} <span>${isFlagged ? 'Đã cắm cờ' : 'Cắm cờ'}</span>`;
    }

    const qTextEl = document.getElementById('q-text');
    const container = document.getElementById('options-container');

    if (isGroup) {
      // === TF GROUP: Split-Pane (passage on left, statements on right) ===
      const imgHtml = q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa" loading="lazy"></div>` : '';
      const passageHtml = this.renderContent(q.passage || q.prompt || '');
      const groupAnswers = this.answers[this.currentQuestionIndex] || {};
      const statements = (q.tfPayload && q.tfPayload.statements) || q.statements || [];

      qTextEl.innerHTML = '';
      container.innerHTML = `
        <div class="tf-split-layout">
          <div class="tf-split-passage-pane">
            <span class="passage-badge"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> NGỮ LIỆU / ĐOẠN TƯ LIỆU ĐỌC HIỂU</span>
            <div class="question-passage">${passageHtml}</div>
            ${imgHtml}
          </div>
          <div class="tf-split-statements-pane">
            <div class="statements-header-hint">
              Thí sinh chọn Đúng [Đ] hoặc Sai [S] cho từng mệnh đề sau:
            </div>
            ${statements.map((stmt, si) => {
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
            }).join('')}
          </div>
        </div>
      `;

    } else if (isShortAnswer) {
      // === SHORT ANSWER ===
      const promptText = q.question || q.prompt || '';
      qTextEl.innerHTML = this.renderContent(promptText);

      const userText = this.answers[this.currentQuestionIndex] || '';

      container.innerHTML = `
        <div class="sa-container">
          <label for="sa-input-field" class="sr-only">Nhập câu trả lời</label>
          <div class="sa-math-keypad" role="toolbar" aria-label="Bàn phím ký hiệu toán học nhanh">
            <button type="button" class="math-key-btn" onclick="Quiz.insertMathSymbol('-')">-</button>
            <button type="button" class="math-key-btn" onclick="Quiz.insertMathSymbol('/')">/</button>
            <button type="button" class="math-key-btn" onclick="Quiz.insertMathSymbol(',')">,</button>
            <button type="button" class="math-key-btn" onclick="Quiz.insertMathSymbol('.')">.</button>
            <button type="button" class="math-key-btn" onclick="Quiz.insertMathSymbol('√')">√</button>
            <button type="button" class="math-key-btn" onclick="Quiz.insertMathSymbol('π')">π</button>
            <button type="button" class="math-key-btn clear" onclick="Quiz.insertMathSymbol('BACKSPACE')" title="Xóa ký tự cuối">⌫ Xóa</button>
          </div>
          <input type="text"
                 id="sa-input-field"
                 class="sa-input"
                 placeholder="Nhập kết quả hoặc số cần điền..."
                 value="${this.escapeHtml(userText)}"
                 oninput="Quiz.inputShortAnswer(this.value)">
          <div style="font-size: 0.85rem; color: var(--text-dim); margin-top: 8px; display: flex; align-items: center; gap: 6px;">
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            <span>Hỗ trợ cả số thập phân dấu phẩy (vd: 1,5) và dấu chấm (vd: 1.5).</span>
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
            <span class="option-shortcut-hint">[${letters[i]}]</span>
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
    if (typeof document === 'undefined') return;
    const container = document.getElementById('question-dots');
    if (!container) return;

    ['all', 'unanswered', 'flagged'].forEach(f => {
      const btn = document.getElementById(`tab-filter-${f}`);
      if (btn) btn.classList.toggle('active', f === (this.sidebarFilter || 'all'));
    });

    container.innerHTML = this.questions.map((q, i) => {
      const isCurrent = i === this.currentQuestionIndex;
      const isFlagged = Boolean(this.flaggedQuestions && this.flaggedQuestions.has(i));
      let isAnswered = false;

      const isGroup = q.type === 'tf-group' || q.format === 'true_false_group';
      const isShortAnswer = q.type === 'shortanswer' || q.format === 'short_answer';
      const statements = (q.tfPayload && q.tfPayload.statements) || q.statements || [];

      if (isGroup) {
        const ga = this.answers[i];
        isAnswered = Boolean(ga && Object.keys(ga).length === statements.length);
      } else if (isShortAnswer) {
        isAnswered = this.answers[i] !== undefined && String(this.answers[i]).trim() !== '';
      } else {
        isAnswered = this.answers[i] !== undefined;
      }

      let matchesFilter = true;
      if (this.sidebarFilter === 'unanswered') matchesFilter = !isAnswered;
      else if (this.sidebarFilter === 'flagged') matchesFilter = isFlagged;

      let typeClass = '';
      if (isGroup) typeClass = ' tf-dot';
      if (isShortAnswer) typeClass = ' sa-dot';
      const filterStyle = matchesFilter ? '' : 'opacity: 0.22; transform: scale(0.88);';

      return `
        <div class="q-dot ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''} ${isFlagged ? 'flagged' : ''}${typeClass}"
             style="${filterStyle}"
             title="Câu ${i + 1}${isFlagged ? ' (Đã cắm cờ)' : ''}${isAnswered ? ' (Đã làm)' : ' (Chưa làm)'}"
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

    const breakdown = {
      p1: { earned: 0, total: 0, count: 0, correct: 0 },
      p2: { earned: 0, total: 0, count: 0, correctFull: 0 },
      p3: { earned: 0, total: 0, count: 0, correct: 0 }
    };

    const TF_MOET_MAP = { 0: 0.0, 1: 0.1, 2: 0.25, 3: 0.5, 4: 1.0 };

    this.questions.forEach((q, i) => {
      const isGroup = q.type === 'tf-group' || q.format === 'true_false_group';
      const isShortAnswer = q.type === 'shortanswer' || q.format === 'short_answer';

      if (isGroup) {
        // True/False group: Max 1.0 point under MOET QĐ 764
        breakdown.p2.count++;
        breakdown.p2.total += 1.0;
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
        breakdown.p2.earned += partial;
        if (correctCount === statements.length) breakdown.p2.correctFull++;

        if (correctCount < statements.length && window.MistakeStore) {
          MistakeStore.recordMistake({
            subjectId: this.subject,
            lessonName: q.lessonTitle || 'Bài thi trắc nghiệm',
            question: q,
            userAnswer: ga
          });
        }

      } else if (isShortAnswer) {
        // Short Answer: 1.0 point (or subject weighted)
        breakdown.p3.count++;
        breakdown.p3.total += 1.0;
        totalPoints += 1.0;

        const isCorrect = typeof ScoringEngine !== 'undefined' && ScoringEngine.evaluateShortAnswer(this.answers[i], q).isCorrect;

        if (isCorrect) {
          earnedPoints += 1.0;
          breakdown.p3.earned += 1.0;
          breakdown.p3.correct++;
        } else if (window.MistakeStore) {
          MistakeStore.recordMistake({
            subjectId: this.subject,
            lessonName: q.lessonTitle || 'Bài thi trắc nghiệm',
            question: q,
            userAnswer: this.answers[i]
          });
        }

      } else {
        // MCQ: 1.0 point (or subject weighted)
        breakdown.p1.count++;
        breakdown.p1.total += 1.0;
        totalPoints += 1.0;

        const correctOpt = q.mcqPayload !== undefined
          ? q.mcqPayload.correctOptionIndex
          : (q.correctAnswer !== undefined ? q.correctAnswer : q.correct);

        const isMcqCorrect = (this.answers[i] !== undefined && Number(this.answers[i]) === Number(correctOpt));
        if (isMcqCorrect) {
          earnedPoints += 1.0;
          breakdown.p1.earned += 1.0;
          breakdown.p1.correct++;
        } else if (window.MistakeStore) {
          MistakeStore.recordMistake({
            subjectId: this.subject,
            lessonName: q.lessonTitle || 'Bài thi trắc nghiệm',
            question: q,
            userAnswer: this.answers[i]
          });
        }
      }
    });

    // Round cleanly
    breakdown.p1.earned = Math.round(breakdown.p1.earned * 100) / 100;
    breakdown.p2.earned = Math.round(breakdown.p2.earned * 100) / 100;
    breakdown.p3.earned = Math.round(breakdown.p3.earned * 100) / 100;

    earnedPoints = Math.round(earnedPoints * 100) / 100;
    totalPoints = Math.round(totalPoints * 100) / 100;

    this.isSubmitted = true;
    this.clearSession();

    if (window.SoundFX) SoundFX.playVictory();
    if (typeof app !== 'undefined' && app.showResults) {
      app.showResults(earnedPoints, totalPoints, this.sessionId, breakdown);
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
                <span class="review-status-tag ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? 'Đúng' : 'Sai'}</span>
                Bạn chọn: ${userText} ${!isCorrect ? `→ Đáp án: ${correctText}` : ''}
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
              <span class="review-status-tag ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? 'Đúng' : 'Sai'}</span>
              Bạn điền: ${userText ? this.escapeHtml(userText) : '<em>Chưa trả lời</em>'}
            </div>
            ${!isCorrect ? `
              <div class="review-answer correct">
                <span class="review-status-tag correct">Đáp án</span>
                ${accepted.map(a => this.escapeHtml(a)).join(' hoặc ')}
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
              <span class="review-status-tag ${isCorrect ? 'correct' : 'wrong'}">${isCorrect ? 'Đúng' : 'Sai'}</span>
              Bạn chọn: ${this.renderContent(userText)}
            </div>
            ${!isCorrect ? `
              <div class="review-answer correct">
                <span class="review-status-tag correct">Đáp án đúng</span>
                ${this.renderContent(correctText)}
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

if (typeof window !== 'undefined') {
  window.Quiz = Quiz;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Quiz;
}
