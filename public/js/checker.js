/**
 * Checker Module - Bộ Công Cụ Dò Trắc Nghiệm & So Khớp Đáp Án Nhanh
 * Tra cứu ma trận đáp án, tự chấm điểm bài làm và xem giải thích chi tiết
 */

const Checker = {
  currentSubject: 'lichsu11',
  currentLessonIdx: 0,
  subjectData: null,
  userSelections: {}, // { qId: selectedOption or { a: bool, b: bool, ... } }
  activeTab: 'matrix', // 'matrix' | 'selfcheck' | 'explorer'

  async init(subjectId = null) {
    if (subjectId) {
      this.currentSubject = subjectId;
    } else if (!this.currentSubject) {
      this.currentSubject = 'lichsu11';
    }
    await this.loadData();
    this.render();
  },

  async loadData() {
    try {
      this.subjectData = await API.getQuestions(this.currentSubject);
    } catch (e) {
      console.error('Failed to load subject data for checker:', e);
      // Fallback
      if (this.currentSubject !== 'lichsu11') {
        this.currentSubject = 'lichsu11';
        this.subjectData = await API.getQuestions('lichsu11');
      }
    }
  },

  async selectSubject(subId) {
    this.currentSubject = subId;
    this.currentLessonIdx = 0;
    this.userSelections = {};
    if (window.SoundFX) SoundFX.playClick();
    await this.loadData();
    this.render();
  },

  selectLesson(lessonIdx) {
    this.currentLessonIdx = parseInt(lessonIdx, 10);
    this.userSelections = {};
    if (window.SoundFX) SoundFX.playClick();
    this.render();
  },

  switchTab(tab) {
    this.activeTab = tab;
    if (window.SoundFX) SoundFX.playClick();
    this.render();
  },

  getActiveQuestions() {
    if (!this.subjectData || !this.subjectData.lessons) return { mcqs: [], tfs: [] };
    const lessons = this.subjectData.lessons;
    let targetLessons = [];

    if (this.currentLessonIdx === -1) {
      targetLessons = lessons;
    } else if (lessons[this.currentLessonIdx]) {
      targetLessons = [lessons[this.currentLessonIdx]];
    } else {
      targetLessons = [lessons[0]];
    }

    let mcqs = [];
    let tfs = [];
    let qCounter = 1;
    let tfCounter = 1;

    targetLessons.forEach((l, lIdx) => {
      (l.questions || []).forEach(q => {
        mcqs.push({
          ...q,
          globalNum: qCounter++,
          lessonName: l.name,
          correctLetter: ['A', 'B', 'C', 'D'][q.correct !== undefined ? q.correct : q.correctAnswer] || 'A'
        });
      });

      (l.questionGroups || []).forEach(g => {
        tfs.push({
          ...g,
          globalNum: tfCounter++,
          lessonName: l.name
        });
      });
    });

    return { mcqs, tfs };
  },

  render() {
    const container = document.getElementById('screen-checker');
    if (!container) return;

    const subjects = (app.subjects || []).filter(s => s.ready);
    const lessons = (this.subjectData && this.subjectData.lessons) || [];
    const { mcqs, tfs } = this.getActiveQuestions();

    container.innerHTML = `
      <div class="checker-container">
        <!-- Header -->
        <header class="checker-header">
          <div class="checker-title-area">
            <button class="back-btn" onclick="app.navigateTo('dashboard')"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="19" x2="5" y1="12" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Trang chủ</button>
            <div class="checker-badge"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> CÔNG CỤ DÒ ĐÁP ÁN NHANH</div>
            <h1 class="checker-heading">Dò Trắc Nghiệm & So Khớp Đáp Án GDPT 2018</h1>
            <p class="checker-subheading">Tra cứu bảng đáp án chuẩn xác, kiểm tra đối chiếu bài làm từ giấy, xem lời giải chi tiết và luyện tập trắc nghiệm Đúng/Sai.</p>
          </div>

          <!-- Controls Bar -->
          <div class="checker-toolbar">
            <div class="checker-select-group">
              <label for="checker-subject-select">Môn học:</label>
              <select id="checker-subject-select" onchange="Checker.selectSubject(this.value)">
                ${subjects.map(s => `
                  <option value="${s.id}" ${s.id === this.currentSubject ? 'selected' : ''}>
                    ${s.icon || '📖'} ${s.name} (${s.questionCount || 0} câu)
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="checker-select-group">
              <label for="checker-lesson-select">Bài học:</label>
              <select id="checker-lesson-select" onchange="Checker.selectLesson(this.value)">
                <option value="-1" ${this.currentLessonIdx === -1 ? 'selected' : ''}>-- Tất cả các bài (${lessons.length} bài) --</option>
                ${lessons.map((l, i) => `
                  <option value="${i}" ${i === this.currentLessonIdx ? 'selected' : ''}>
                    ${l.name} (${(l.questions || []).length} TN • ${(l.questionGroups || []).length} Đ/S)
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="checker-tab-pills">
              <button class="checker-tab-btn ${this.activeTab === 'matrix' ? 'active' : ''}" onclick="Checker.switchTab('matrix')">
                <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg> Ma trận đáp án
              </button>
              <button class="checker-tab-btn ${this.activeTab === 'selfcheck' ? 'active' : ''}" onclick="Checker.switchTab('selfcheck')">
                <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Dò bài tự chấm
              </button>
              <button class="checker-tab-btn ${this.activeTab === 'explorer' ? 'active' : ''}" onclick="Checker.switchTab('explorer')">
                <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> Tra cứu lời giải
              </button>
            </div>
          </div>
        </header>

        <!-- Main Content Area based on Tab -->
        <div class="checker-main" role="region" aria-label="Bảng điều khiển dò đáp án">
          ${this.activeTab === 'matrix' ? this.renderMatrixTab(mcqs, tfs) : ''}
          ${this.activeTab === 'selfcheck' ? this.renderSelfCheckTab(mcqs, tfs) : ''}
          ${this.activeTab === 'explorer' ? this.renderExplorerTab(mcqs, tfs) : ''}
        </div>
      </div>
    `;
  },

  // ═════════════════════════════════════════════════════════════
  // TAB 1: MA TRẬN ĐÁP ÁN NHANH (QUICK ANSWER KEY MATRIX)
  // ═════════════════════════════════════════════════════════════
  renderMatrixTab(mcqs, tfs) {
    return `
      <div class="matrix-view-wrapper">
        <div class="matrix-header-actions">
          <div class="matrix-stats">
            <span class="stat-chip"><strong style="color: var(--primary);">${mcqs.length}</strong> câu Trắc nghiệm (Phần I)</span>
            <span class="stat-chip"><strong style="color: #f59e0b;">${tfs.length}</strong> bài Đúng/Sai (Phần II - ${tfs.length * 4} ý)</span>
          </div>
          <div class="matrix-buttons">
            <button class="btn btn-sm btn-outline" onclick="Checker.copyAnswerKeyText()">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg> Sao chép mã đáp án
            </button>
            <button class="btn btn-sm btn-primary" onclick="Checker.startQuickPractice()">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Ôn luyện bộ câu này ngay
            </button>
          </div>
        </div>

        <!-- Section 1: Multiple Choice Grid -->
        <div class="matrix-card">
          <div class="matrix-section-title">
            <span>PHẦN I: TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN</span>
            <span class="matrix-section-badge">Mỗi câu 0.25 điểm</span>
          </div>

          <div class="mcq-matrix-grid">
            ${mcqs.map((q, idx) => `
              <div class="mcq-matrix-item" onclick="Checker.showDetailModal('mcq', ${idx})" title="Bấm xem câu hỏi & lời giải chi tiết">
                <span class="mcq-qnum">Câu ${q.globalNum}</span>
                <span class="mcq-ans-pill key-${q.correctLetter}">${q.correctLetter}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section 2: True/False Matrix -->
        ${tfs.length > 0 ? `
          <div class="matrix-card" style="margin-top: 24px;">
            <div class="matrix-section-title">
              <span>PHẦN II: TRẮC NGHIỆM ĐÚNG / SAI (GDPT 2018)</span>
              <span class="matrix-section-badge" style="background: rgba(245,158,11,0.15); color: #f59e0b;">Thang điểm Bộ GD&ĐT: 0.1 - 0.25 - 0.5 - 1.0</span>
            </div>

            <div class="tf-matrix-grid">
              ${tfs.map((g, gIdx) => `
                <div class="tf-matrix-card" onclick="Checker.showDetailModal('tf', ${gIdx})">
                  <div class="tf-card-header">
                    <span class="tf-card-title">Câu ${g.globalNum} (Đ/S)</span>
                    <span class="tf-card-lesson">${g.lessonName || ''}</span>
                  </div>
                  <div class="tf-statements-key-row">
                    ${(g.statements || []).map((s, si) => `
                      <div class="tf-statement-key-chip ${s.correct ? 'is-true' : 'is-false'}">
                        <span class="stmt-letter">${String.fromCharCode(97 + si)})</span>
                        <span class="stmt-val">${s.correct ? 'ĐÚNG' : 'SAI'}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Detail Preview Drawer/Modal -->
        <div id="checker-detail-container" class="checker-detail-box" style="display: none;"></div>
      </div>
    `;
  },

  // ═════════════════════════════════════════════════════════════
  // TAB 2: DÒ BÀI TỰ CHẤM (SELF-CHECK COMPARATOR)
  // ═════════════════════════════════════════════════════════════
  renderSelfCheckTab(mcqs, tfs) {
    return `
      <div class="selfcheck-view-wrapper">
        <div class="selfcheck-guide-banner">
          <div class="guide-icon"><svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></div>
          <div class="guide-text">
            <strong>Hướng dẫn tự dò bài:</strong> Chọn phương án bạn đã làm trên giấy hoặc nháp dưới đây. Hệ thống sẽ ngay lập tức đối chiếu với đáp án chuẩn, chỉ ra câu đúng/sai và tính tổng điểm theo chuẩn Bộ GD&ĐT!
          </div>
          <button class="btn btn-sm btn-primary" onclick="Checker.evaluateSelfCheck()">
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Chấm điểm &amp; So khớp
          </button>
        </div>

        <div id="selfcheck-score-summary" class="selfcheck-score-banner" style="display: none;"></div>

        <!-- MCQ Inputs -->
        <div class="matrix-card">
          <div class="matrix-section-title">
            <span>PHẦN I: PHIẾU TRẢ LỜI TRẮC NGHIỆM</span>
            <span class="matrix-section-badge">Chọn A, B, C hoặc D</span>
          </div>

          <div class="selfcheck-grid">
            ${mcqs.map((q, idx) => {
              const sel = this.userSelections[`mcq_${idx}`];
              return `
                <div class="selfcheck-row" id="selfcheck-row-mcq-${idx}">
                  <span class="row-qnum">Câu ${q.globalNum}:</span>
                  <div class="row-options">
                    ${['A', 'B', 'C', 'D'].map((let, optIdx) => `
                      <button class="selfcheck-opt-btn ${sel === optIdx ? 'selected' : ''}"
                              onclick="Checker.selectSelfCheckOption(${idx}, ${optIdx})">
                        ${let}
                      </button>
                    `).join('')}
                  </div>
                  <div class="row-feedback" id="feedback-mcq-${idx}"></div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- TF Inputs -->
        ${tfs.length > 0 ? `
          <div class="matrix-card" style="margin-top: 24px;">
            <div class="matrix-section-title">
              <span>PHẦN II: PHIẾU TRẢ LỜI ĐÚNG / SAI</span>
              <span class="matrix-section-badge">Chọn Đúng (Đ) hoặc Sai (S) từng ý</span>
            </div>

            <div class="selfcheck-tf-container">
              ${tfs.map((g, gIdx) => `
                <div class="selfcheck-tf-card" id="selfcheck-card-tf-${gIdx}">
                  <div class="tf-q-title">Câu ${g.globalNum}: ${this.escapeHtml(g.passage ? g.passage.slice(0, 100) + '...' : '')}</div>
                  <div class="tf-q-statements">
                    ${(g.statements || []).map((s, si) => {
                      const userTf = (this.userSelections[`tf_${gIdx}`] || {})[si];
                      return `
                        <div class="tf-stmt-row" id="selfcheck-stmt-${gIdx}-${si}">
                          <span class="stmt-label"><strong>${String.fromCharCode(97 + si)})</strong> ${this.escapeHtml(s.question)}</span>
                          <div class="stmt-btn-pair">
                            <button class="tf-toggle-btn ${userTf === true ? 'is-true' : ''}"
                                    onclick="Checker.selectSelfCheckTF(${gIdx}, ${si}, true)">Đúng</button>
                            <button class="tf-toggle-btn ${userTf === false ? 'is-false' : ''}"
                                    onclick="Checker.selectSelfCheckTF(${gIdx}, ${si}, false)">Sai</button>
                          </div>
                          <span class="stmt-eval-tag" id="eval-tag-${gIdx}-${si}"></span>
                        </div>
                      `;
                    }).join('')}
                  </div>
                  <div class="tf-card-score-eval" id="tf-card-eval-${gIdx}"></div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div style="margin-top: 30px; text-align: center;">
          <button class="btn btn-primary btn-lg" onclick="Checker.evaluateSelfCheck()" style="padding: 14px 36px; font-size: 1.1rem;">
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> Chấm điểm toàn diện ngay
          </button>
        </div>
      </div>
    `;
  },

  selectSelfCheckOption(qIdx, optIdx) {
    this.userSelections[`mcq_${qIdx}`] = optIdx;
    if (window.SoundFX) SoundFX.playClick();
    const row = document.getElementById(`selfcheck-row-mcq-${qIdx}`);
    if (row) {
      row.querySelectorAll('.selfcheck-opt-btn').forEach((btn, i) => {
        btn.classList.toggle('selected', i === optIdx);
      });
    }
  },

  selectSelfCheckTF(gIdx, stmtIdx, val) {
    if (!this.userSelections[`tf_${gIdx}`]) {
      this.userSelections[`tf_${gIdx}`] = {};
    }
    this.userSelections[`tf_${gIdx}`][stmtIdx] = val;
    if (window.SoundFX) SoundFX.playClick();

    const row = document.getElementById(`selfcheck-stmt-${gIdx}-${stmtIdx}`);
    if (row) {
      const btns = row.querySelectorAll('.tf-toggle-btn');
      btns[0].classList.toggle('is-true', val === true);
      btns[1].classList.toggle('is-false', val === false);
    }
  },

  evaluateSelfCheck() {
    const { mcqs, tfs } = this.getActiveQuestions();
    let mcqCorrect = 0;
    let mcqTotal = mcqs.length;
    let tfPoints = 0;
    let tfTotalMax = tfs.length * 1.0;

    // Evaluate MCQ
    mcqs.forEach((q, idx) => {
      const userOpt = this.userSelections[`mcq_${idx}`];
      const correctOpt = q.correct !== undefined ? q.correct : q.correctAnswer;
      const fb = document.getElementById(`feedback-mcq-${idx}`);
      const row = document.getElementById(`selfcheck-row-mcq-${idx}`);

      if (userOpt === undefined) {
        if (fb) fb.innerHTML = `<span class="eval-blank">Chưa chọn (Đáp án: ${q.correctLetter})</span>`;
      } else if (userOpt === correctOpt) {
        mcqCorrect++;
        if (fb) fb.innerHTML = `<span class="eval-correct">✓ Đúng (+0.25đ)</span>`;
        if (row) row.classList.add('is-row-correct');
      } else {
        const letters = ['A', 'B', 'C', 'D'];
        if (fb) fb.innerHTML = `<span class="eval-wrong">✗ Sai (Đúng: ${letters[correctOpt]})</span>`;
        if (row) row.classList.add('is-row-wrong');
      }
    });

    // Evaluate TF (MOET Decision 764: 1 ý = 0.1, 2 ý = 0.25, 3 ý = 0.5, 4 ý = 1.0)
    tfs.forEach((g, gIdx) => {
      const userGroup = this.userSelections[`tf_${gIdx}`] || {};
      let groupCorrectStmts = 0;

      (g.statements || []).forEach((s, si) => {
        const userVal = userGroup[si];
        const tag = document.getElementById(`eval-tag-${gIdx}-${si}`);
        if (userVal === undefined) {
          if (tag) tag.innerHTML = `<span class="eval-blank">Chưa chọn (Chuẩn: ${s.correct ? 'Đúng' : 'Sai'})</span>`;
        } else if (userVal === s.correct) {
          groupCorrectStmts++;
          if (tag) tag.innerHTML = `<span class="eval-correct">✓ Đúng</span>`;
        } else {
          if (tag) tag.innerHTML = `<span class="eval-wrong">✗ Sai (Chuẩn: ${s.correct ? 'Đúng' : 'Sai'})</span>`;
        }
      });

      const scoreMatrix = [0, 0.1, 0.25, 0.5, 1.0];
      const awarded = scoreMatrix[groupCorrectStmts] || 0;
      tfPoints += awarded;

      const evalBox = document.getElementById(`tf-card-eval-${gIdx}`);
      if (evalBox) {
        evalBox.innerHTML = `
          <div class="tf-eval-result">
            Kết quả: Đúng <strong>${groupCorrectStmts}/4 ý</strong> ➔ Đạt: <strong>${awarded} / 1.0 điểm</strong>
          </div>
        `;
      }
    });

    const mcqPoints = mcqCorrect * 0.25;
    const totalPoints = Number((mcqPoints + tfPoints).toFixed(2));
    const maxPoints = Number((mcqTotal * 0.25 + tfTotalMax).toFixed(2));
    const percentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

    const summaryEl = document.getElementById('selfcheck-score-summary');
    if (summaryEl) {
      summaryEl.style.display = 'block';
      summaryEl.innerHTML = `
        <div class="score-banner-content">
          <div class="score-trophy">${percentage >= 80 ? '🏆' : percentage >= 50 ? '🎉' : '📚'}</div>
          <div class="score-details">
            <h3>Kết quả tự dò bài: <span class="score-highlight">${totalPoints} / ${maxPoints} điểm</span> (${percentage}%)</h3>
            <p>Trắc nghiệm Phần I: <strong>${mcqCorrect}/${mcqTotal} câu</strong> (${mcqPoints}đ) • Đúng/Sai Phần II: <strong>${tfPoints} / ${tfTotalMax}đ</strong></p>
          </div>
        </div>
      `;
      summaryEl.scrollIntoView({ behavior: 'smooth' });
    }

    if (percentage >= 80 && window.SoundFX) {
      SoundFX.playVictory();
    } else if (window.SoundFX) {
      SoundFX.playCorrect();
    }
  },

  // ═════════════════════════════════════════════════════════════
  // TAB 3: TRA CỨU LỜI GIẢI CHI TIẾT (QUESTION BANK EXPLORER)
  // ═════════════════════════════════════════════════════════════
  renderExplorerTab(mcqs, tfs) {
    return `
      <div class="explorer-view-wrapper">
        <div class="explorer-search-bar">
          <input type="text" id="checker-search-input" placeholder="Tìm kiếm câu hỏi theo từ khóa (vd: Cách mạng Pháp, Hồ Chí Minh, Liên Xô...)" oninput="Checker.filterExplorer()">
          <select id="checker-filter-type" onchange="Checker.filterExplorer()">
            <option value="all">Tất cả định dạng</option>
            <option value="mcq">Chỉ Trắc nghiệm nhiều lựa chọn</option>
            <option value="tf">Chỉ Trắc nghiệm Đúng / Sai</option>
          </select>
        </div>

        <div id="checker-explorer-list" class="explorer-cards-list">
          <!-- Render MCQs -->
          ${mcqs.map((q, idx) => `
            <div class="explorer-card" data-type="mcq" data-search="${this.escapeHtml(q.question)}">
              <div class="explorer-card-header">
                <span class="qtype-badge mcq">Trắc nghiệm</span>
                <span class="qnum-badge">Câu ${q.globalNum}</span>
                <span class="qlesson-badge">${q.lessonName}</span>
              </div>
              <div class="explorer-q-text">${this.renderMathOrText(q.question)}</div>
              ${q.image ? `<div class="question-image"><img src="${q.image}" alt="Hình minh họa"></div>` : ''}
              <div class="explorer-options">
                ${(q.options || []).map((opt, oi) => {
                  const isCorrect = oi === (q.correct !== undefined ? q.correct : q.correctAnswer);
                  const letters = ['A', 'B', 'C', 'D'];
                  return `
                    <div class="explorer-opt-row ${isCorrect ? 'is-correct-answer' : ''}">
                      <span class="opt-letter-tag">${letters[oi]}</span>
                      <span class="opt-text">${this.renderMathOrText(opt)}</span>
                      ${isCorrect ? '<span class="correct-check">✓ ĐÁP ÁN ĐÚNG</span>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
              ${q.explanation ? `
                <div class="explorer-explanation">
                  <strong><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg> Lời giải / Phân tích:</strong> ${this.escapeHtml(q.explanation)}
                </div>
              ` : ''}
            </div>
          `).join('')}

          <!-- Render TFs -->
          ${tfs.map((g, gIdx) => `
            <div class="explorer-card" data-type="tf" data-search="${this.escapeHtml(g.passage)}">
              <div class="explorer-card-header">
                <span class="qtype-badge tf">Đúng / Sai</span>
                <span class="qnum-badge">Câu ${g.globalNum} (Đoạn tư liệu)</span>
                <span class="qlesson-badge">${g.lessonName}</span>
              </div>
              <div class="explorer-passage-box">
                <span class="passage-icon"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span>
                <div class="passage-text">${this.renderMathOrText(g.passage)}</div>
              </div>
              <div class="explorer-tf-statements">
                ${(g.statements || []).map((s, si) => `
                  <div class="explorer-stmt-row ${s.correct ? 'stmt-is-true' : 'stmt-is-false'}">
                    <span class="stmt-letter-box">${String.fromCharCode(97 + si)})</span>
                    <span class="stmt-text">${this.renderMathOrText(s.question)}</span>
                    <span class="stmt-status-badge ${s.correct ? 'badge-true' : 'badge-false'}">
                      ${s.correct ? '✓ ĐÚNG' : '✗ SAI'}
                    </span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  filterExplorer() {
    const query = (document.getElementById('checker-search-input')?.value || '').toLowerCase().trim();
    const typeFilter = document.getElementById('checker-filter-type')?.value || 'all';

    const cards = document.querySelectorAll('.explorer-card');
    cards.forEach(card => {
      const cardType = card.getAttribute('data-type');
      const cardSearch = (card.getAttribute('data-search') || '').toLowerCase();

      const matchesType = typeFilter === 'all' || cardType === typeFilter;
      const matchesQuery = !query || cardSearch.includes(query);

      card.style.display = (matchesType && matchesQuery) ? 'block' : 'none';
    });
  },

  showDetailModal(type, index) {
    const { mcqs, tfs } = this.getActiveQuestions();
    const box = document.getElementById('checker-detail-container');
    if (!box) return;

    if (window.SoundFX) SoundFX.playClick();

    if (type === 'mcq') {
      const q = mcqs[index];
      if (!q) return;
      const letters = ['A', 'B', 'C', 'D'];
      const correctIdx = q.correct !== undefined ? q.correct : q.correctAnswer;

      box.style.display = 'block';
      box.innerHTML = `
        <div class="detail-box-inner">
          <div class="detail-box-header">
            <h4>Chi tiết Câu ${q.globalNum} (Trắc nghiệm) — ${q.lessonName}</h4>
            <button class="close-box-btn" onclick="document.getElementById('checker-detail-container').style.display='none'">✕</button>
          </div>
          <p class="detail-q-prompt"><strong>Câu hỏi:</strong> ${this.escapeHtml(q.question)}</p>
          <div class="detail-options-list">
            ${(q.options || []).map((opt, i) => `
              <div class="detail-opt-item ${i === correctIdx ? 'is-correct' : ''}">
                <span class="detail-opt-letter">${letters[i]}</span>
                <span>${this.escapeHtml(opt)}</span>
                ${i === correctIdx ? '<strong>(Đáp án đúng)</strong>' : ''}
              </div>
            `).join('')}
          </div>
          <div class="detail-exp-box">
            <strong><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg> Giải thích:</strong> ${this.escapeHtml(q.explanation || `Đáp án đúng là ${letters[correctIdx]}.`)}
          </div>
        </div>
      `;
      box.scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'tf') {
      const g = tfs[index];
      if (!g) return;

      box.style.display = 'block';
      box.innerHTML = `
        <div class="detail-box-inner">
          <div class="detail-box-header">
            <h4>Chi tiết Câu ${g.globalNum} (Đúng / Sai) — ${g.lessonName}</h4>
            <button class="close-box-btn" onclick="document.getElementById('checker-detail-container').style.display='none'">✕</button>
          </div>
          <div class="detail-passage">
            <strong>Tư liệu lịch sử:</strong>
            <p>${this.escapeHtml(g.passage)}</p>
          </div>
          <div class="detail-stmts-list">
            ${(g.statements || []).map((s, si) => `
              <div class="detail-stmt-item ${s.correct ? 'is-true' : 'is-false'}">
                <span><strong>${String.fromCharCode(97 + si)})</strong> ${this.escapeHtml(s.question)}</span>
                <span class="badge ${s.correct ? 'badge-success' : 'badge-danger'}">${s.correct ? 'ĐÚNG' : 'SAI'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      box.scrollIntoView({ behavior: 'smooth' });
    }
  },

  copyAnswerKeyText() {
    const { mcqs, tfs } = this.getActiveQuestions();
    let text = `=== BẢNG ĐÁP ÁN: ${this.currentSubject.toUpperCase()} ===\n\n`;
    text += `PHẦN I: TRẮC NGHIỆM NHIỀU LỰA CHỌN\n`;
    mcqs.forEach(q => {
      text += `Câu ${q.globalNum}: ${q.correctLetter}  `;
      if (q.globalNum % 5 === 0) text += '\n';
    });

    if (tfs.length > 0) {
      text += `\n\nPHẦN II: TRẮC NGHIỆM ĐÚNG / SAI\n`;
      tfs.forEach(g => {
        const stmtStr = (g.statements || []).map((s, i) => `${String.fromCharCode(97 + i)}: ${s.correct ? 'Đ' : 'S'}`).join(' | ');
        text += `Câu ${g.globalNum}: [ ${stmtStr} ]\n`;
      });
    }

    navigator.clipboard.writeText(text).then(() => {
      alert('Đã sao chép bảng mã đáp án vào clipboard!');
      if (window.SoundFX) SoundFX.playCorrect();
    }).catch(() => {
      prompt('Bảng mã đáp án:', text);
    });
  },

  startQuickPractice() {
    app.selectSubject(this.currentSubject);
  },

  renderMathOrText(text) {
    if (typeof FormulaRenderer !== 'undefined' && FormulaRenderer.render) {
      return FormulaRenderer.render(text);
    }
    return this.escapeHtml(text);
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
};

if (typeof window !== 'undefined') {
  window.Checker = Checker;
}
