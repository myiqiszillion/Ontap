/**
 * Student Diagnostic Assessment & Skill Analytics UI Module
 * NTMK Rebuild Phase 03A — Task 6
 *
 * Coordinates:
 * 1. Diagnostic Welcome & Target Configuration
 * 2. Focused Diagnostic Workspace with KaTeX, Timer & Auto-Save
 * 3. Authoritative Result & Performance Report
 * 4. Interactive Skill Mastery Dashboard
 * 5. Diagnostic History & Learning Trajectory
 */

const DiagnosticView = {
  activeSubView: 'welcome',
  currentSession: null,
  answers: {},
  currentQuestionIndex: 0,
  timeRemaining: 0,
  timerInterval: null,
  autoSaveTimeout: null,
  latestReport: null,
  selectedSubject: 'toan',
  selectedGrade: 10,
  selectedType: 'grade_diagnostic',

  init(subView = 'welcome') {
    this.selectedSubject = localStorage.getItem('ntmk_diag_subject') || 'toan';
    this.selectedGrade = Number(localStorage.getItem('ntmk_diag_grade') || 10);
    this.render(subView);
  },

  render(subView = 'welcome', param = null) {
    const container = document.getElementById('screen-diagnostic');
    if (!container) return;

    if (subView) this.activeSubView = subView;

    if (this.activeSubView === 'workspace' && this.currentSession) {
      this.renderWorkspace(container);
    } else if (this.activeSubView === 'result' && this.latestReport) {
      this.renderResult(container);
    } else if (this.activeSubView === 'mastery') {
      this.renderMasteryDashboard(container);
    } else {
      this.renderWelcome(container);
    }

    if (window.renderMathInElement) {
      window.renderMathInElement(container, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ]
      });
    }
  },

  // ═════════════════════════════════════════════════════════════
  // 1. WELCOME SCREEN
  // ═════════════════════════════════════════════════════════════
  renderWelcome(container) {
    container.innerHTML = `
      <div class="diag-container">
        <div class="diag-welcome-card">
          <span class="diag-badge-pill primary" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); color:#fbbf24;"><span class="live-dot-pulse"></span> THPT NGUYỄN THỊ MINH KHAI • ĐÁNH GIÁ NĂNG LỰC ĐẦU VÀO</span>
          <h1 class="diag-welcome-title">Chẩn Đoán Năng Lực & Bản Đồ Kỹ Năng</h1>
          <p class="diag-welcome-desc">
            Xác định chính xác những kiến thức bạn đã nắm vững, các kỹ năng còn yếu và phát hiện kịp thời
            lỗ hổng kiến thức tiên quyết theo chuẩn Chương trình GDPT 2018.
          </p>

          <div class="diag-form-grid">
            <div class="diag-form-group">
              <label for="diag-subject-select">Môn học:</label>
              <select id="diag-subject-select" class="diag-select" onchange="DiagnosticView.onSubjectChange(this.value)">
                <option value="toan" ${this.selectedSubject === 'toan' ? 'selected' : ''}>Toán học</option>
                <option value="vatli" ${this.selectedSubject === 'vatli' ? 'selected' : ''}>Vật lí</option>
                <option value="hoahoc" ${this.selectedSubject === 'hoahoc' ? 'selected' : ''}>Hóa học</option>
                <option value="tienganh" ${this.selectedSubject === 'tienganh' ? 'selected' : ''}>Tiếng Anh</option>
              </select>
            </div>

            <div class="diag-form-group">
              <label for="diag-grade-select">Khối lớp:</label>
              <select id="diag-grade-select" class="diag-select" onchange="DiagnosticView.onGradeChange(this.value)">
                <option value="10" ${this.selectedGrade === 10 ? 'selected' : ''}>Lớp 10</option>
                <option value="11" ${this.selectedGrade === 11 ? 'selected' : ''}>Lớp 11</option>
                <option value="12" ${this.selectedGrade === 12 ? 'selected' : ''}>Lớp 12</option>
              </select>
            </div>

            <div class="diag-form-group">
              <label for="diag-type-select">Loại hình đánh giá:</label>
              <select id="diag-type-select" class="diag-select" onchange="DiagnosticView.onTypeChange(this.value)">
                <option value="grade_diagnostic" ${this.selectedType === 'grade_diagnostic' ? 'selected' : ''}>Chẩn đoán trọng tâm khối lớp</option>
                <option value="graduation_readiness" ${this.selectedType === 'graduation_readiness' ? 'selected' : ''}>Độ sẵn sàng tốt nghiệp THPT</option>
              </select>
            </div>
          </div>

          <div class="diag-blueprint-specs">
            <div class="diag-spec-item">
              <span class="spec-label">Số câu hỏi</span>
              <span class="spec-val" id="diag-spec-count">20 câu</span>
            </div>
            <div class="diag-spec-item">
              <span class="spec-label">Thời gian dự kiến</span>
              <span class="spec-val" id="diag-spec-time">45 phút</span>
            </div>
            <div class="diag-spec-item">
              <span class="spec-label">Phạm vi</span>
              <span class="spec-val" id="diag-spec-scope">Chuẩn GDPT 2018</span>
            </div>
            <div class="diag-spec-item">
              <span class="spec-label">Độ sẵn sàng ngân hàng</span>
              <span class="spec-val" id="diag-spec-status" style="font-size:0.95rem; color:var(--color-warning);">Đang kiểm tra...</span>
            </div>
          </div>

          <div class="diag-disclaimer-box">
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg> <strong>Lưu ý khảo thí:</strong> Bài đánh giá chẩn đoán gồm 15–25 câu hỏi được lấy mẫu trọng tâm.
            Kết quả nhằm xác định điểm mạnh và lỗ hổng kiến thức để tối ưu lộ trình học, không thay thế kỳ thi tốt nghiệp THPT hay xếp loại chính thức.
          </div>

          <div style="display:flex; gap:1rem; flex-wrap:wrap; align-items:center;">
            <button id="diag-start-btn" class="diag-btn-primary" onclick="DiagnosticView.startAssessment()">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg> Bắt đầu bài chẩn đoán
            </button>
            <button class="diag-btn-secondary" onclick="DiagnosticView.render('mastery')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Xem bản đồ kỹ năng hiện tại
            </button>
          </div>
        </div>
      </div>
    `;

    this.checkBankReadiness();
  },

  onSubjectChange(val) {
    this.selectedSubject = val;
    localStorage.setItem('ntmk_diag_subject', val);
    this.checkBankReadiness();
  },

  onGradeChange(val) {
    this.selectedGrade = Number(val);
    localStorage.setItem('ntmk_diag_grade', val);
    this.checkBankReadiness();
  },

  onTypeChange(val) {
    this.selectedType = val;
    this.checkBankReadiness();
  },

  async checkBankReadiness() {
    const statusEl = document.getElementById('diag-spec-status');
    const startBtn = document.getElementById('diag-start-btn');
    if (!statusEl) return;

    try {
      const url = `/api/v2/diagnostic/readiness?subjectId=${this.selectedSubject}&grade=${this.selectedGrade}&assessmentType=${this.selectedType}&allowFixtures=true`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ready) {
        statusEl.innerHTML = '✅ Đã sẵn sàng';
        statusEl.style.color = 'var(--color-success)';
        if (startBtn) startBtn.disabled = false;
      } else {
        statusEl.innerHTML = `⚠️ Thiếu ${data.shortages ? data.shortages.length : 0} câu`;
        statusEl.style.color = 'var(--color-warning)';
      }
    } catch (e) {
      statusEl.innerHTML = 'ℹ️ Chế độ Kiểm thử Sẵn sàng';
      statusEl.style.color = 'var(--brand-teal)';
    }
  },

  // ═════════════════════════════════════════════════════════════
  // 2. START & WORKSPACE SCREEN
  // ═════════════════════════════════════════════════════════════
  async startAssessment() {
    const startBtn = document.getElementById('diag-start-btn');
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.innerHTML = '⏳ Đang khởi tạo...';
    }

    try {
      const studentId = localStorage.getItem('ntmk_student_id') || 'student_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('ntmk_student_id', studentId);

      const res = await fetch('/api/v2/diagnostic/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId: this.selectedSubject,
          grade: this.selectedGrade,
          assessmentType: this.selectedType,
          studentId,
          allowFixtures: true
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Khởi tạo bài đánh giá thất bại');
      }

      this.currentSession = await res.json();
      this.answers = {};
      this.currentQuestionIndex = 0;
      this.timeRemaining = (this.currentSession.durationMinutes || 45) * 60;

      this.startTimer();
      this.render('workspace');
    } catch (err) {
      alert(`Không thể bắt đầu bài chẩn đoán: ${err.message}`);
      if (startBtn) {
        startBtn.disabled = false;
        startBtn.innerHTML = '🚀 Bắt đầu bài chẩn đoán';
      }
    }
  },

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timeRemaining--;
      const timerEl = document.getElementById('diag-timer-display');
      if (timerEl) {
        const mins = Math.floor(this.timeRemaining / 60);
        const secs = this.timeRemaining % 60;
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        if (this.timeRemaining <= 300) {
          timerEl.parentElement.classList.add('urgent');
        }
      }
      if (this.timeRemaining <= 0) {
        clearInterval(this.timerInterval);
        alert('Hết giờ làm bài! Hệ thống đang tự động nộp bài chẩn đoán của bạn.');
        this.submitAssessment(true);
      }
    }, 1000);
  },

  renderWorkspace(container) {
    if (!this.currentSession || !this.currentSession.questions) return;
    const questions = this.currentSession.questions;
    const q = questions[this.currentQuestionIndex];
    if (!q) return;

    const progressPct = Math.round(((this.currentQuestionIndex + 1) / questions.length) * 100);
    const answeredCount = Object.keys(this.answers).length;

    container.innerHTML = `
      <div class="diag-container">
        <div class="diag-workspace-layout">
          <div class="diag-main-card">
            <div class="diag-topbar">
              <div style="display:flex; align-items:center; gap:0.75rem;">
                <span class="diag-badge-pill primary">Câu ${this.currentQuestionIndex + 1} / ${questions.length}</span>
                <span class="diag-autosave-pill" id="diag-autosave-status">🟢 Đã lưu tự động</span>
              </div>
              <div class="diag-timer-badge">
                ⏱️ <span id="diag-timer-display">--:--</span>
              </div>
            </div>

            <div class="diag-progress-bar-wrap">
              <div class="diag-progress-bar-fill" style="width: ${progressPct}%;"></div>
            </div>

            <div class="diag-question-header">
              <span class="diag-question-number">Kỹ năng: ${q.assessedSkillTitle || q.topic || 'Kiến thức cốt lõi'}</span>
              <span class="diag-question-meta">Mức độ: ${q.cognitiveLevel || 'Thông hiểu'}</span>
            </div>

            <div class="diag-question-prompt">
              ${q.prompt}
            </div>

            <div id="diag-input-container">
              ${this.renderQuestionInputs(q)}
            </div>

            <div class="diag-nav-actions">
              <button class="diag-btn-secondary" onclick="DiagnosticView.goToPrevQuestion()" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
                ⬅️ Câu trước
              </button>

              <button class="diag-btn-secondary" onclick="DiagnosticView.confirmSubmitModal()">
                📝 Nộp bài chẩn đoán
              </button>

              <button class="diag-btn-primary" onclick="DiagnosticView.goToNextQuestion()" ${this.currentQuestionIndex === questions.length - 1 ? 'disabled' : ''}>
                Câu tiếp ➡️
              </button>
            </div>
          </div>

          <div class="diag-palette-card">
            <div class="diag-palette-title">Bảng điều hướng câu hỏi (${answeredCount}/${questions.length})</div>
            <div class="diag-palette-grid">
              ${questions.map((item, idx) => {
                const isAnswered = this.answers[item.id] !== undefined;
                const isCurrent = idx === this.currentQuestionIndex;
                const cls = `diag-palette-btn ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`;
                return `<button class="${cls}" onclick="DiagnosticView.jumpToQuestion(${idx})">${idx + 1}</button>`;
              }).join('')}
            </div>
            <p style="font-size:0.75rem; color:var(--text-dim); line-height:1.4;">
              Màu xanh: đã trả lời. Hệ thống tự động lưu sau mỗi lựa chọn.
            </p>
          </div>
        </div>
      </div>
    `;
  },

  renderQuestionInputs(q) {
    if (q.format === 'multiple_choice' && q.mcqPayload && Array.isArray(q.mcqPayload.options)) {
      const selectedIndex = this.answers[q.id];
      return `
        <div class="diag-mcq-list">
          ${q.mcqPayload.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const isSelected = selectedIndex === idx;
            return `
              <div class="diag-mcq-option ${isSelected ? 'selected' : ''}" onclick="DiagnosticView.selectMCQOption('${q.id}', ${idx})">
                <div class="diag-option-letter">${letter}</div>
                <div class="diag-option-text">${opt}</div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (q.format === 'true_false_group' && q.tfPayload && Array.isArray(q.tfPayload.statements)) {
      const currentAns = this.answers[q.id] || {};
      return `
        <table class="diag-tf-table">
          ${q.tfPayload.statements.map((stmt, idx) => {
            const letter = String.fromCharCode(97 + idx); // a, b, c, d
            const choice = currentAns[stmt.id];
            return `
              <tr class="diag-tf-row">
                <td style="width: 70%; line-height: 1.5;"><strong>${letter})</strong> ${stmt.text}</td>
                <td style="text-align: right;">
                  <div class="diag-tf-btn-group">
                    <button class="diag-tf-choice-btn ${choice === true ? 'selected true' : ''}" onclick="DiagnosticView.selectTFChoice('${q.id}', '${stmt.id}', true)">Đúng</button>
                    <button class="diag-tf-choice-btn ${choice === false ? 'selected false' : ''}" onclick="DiagnosticView.selectTFChoice('${q.id}', '${stmt.id}', false)">Sai</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </table>
      `;
    }

    if (q.format === 'short_answer') {
      const val = this.answers[q.id] || '';
      return `
        <div class="diag-sa-wrap">
          <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.5rem;">Nhập đáp số (Số thập phân dùng dấu phẩy hoặc chấm):</label>
          <input type="text" class="diag-sa-input" value="${val}" placeholder="VD: 5 hoặc 1,5" oninput="DiagnosticView.onShortAnswerInput('${q.id}', this.value)">
        </div>
      `;
    }

    return '<p>Định dạng câu hỏi đang được tải...</p>';
  },

  selectMCQOption(qId, index) {
    this.answers[qId] = index;
    this.triggerAutoSave();
    this.render('workspace');
  },

  selectTFChoice(qId, stmtId, val) {
    if (!this.answers[qId] || typeof this.answers[qId] !== 'object') {
      this.answers[qId] = {};
    }
    this.answers[qId][stmtId] = val;
    this.triggerAutoSave();
    this.render('workspace');
  },

  onShortAnswerInput(qId, val) {
    this.answers[qId] = val.trim();
    this.triggerAutoSave();
  },

  goToNextQuestion() {
    if (this.currentSession && this.currentQuestionIndex < this.currentSession.questions.length - 1) {
      this.currentQuestionIndex++;
      this.render('workspace');
    }
  },

  goToPrevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.render('workspace');
    }
  },

  jumpToQuestion(idx) {
    this.currentQuestionIndex = idx;
    this.render('workspace');
  },

  triggerAutoSave() {
    const statusEl = document.getElementById('diag-autosave-status');
    if (statusEl) statusEl.innerHTML = '🟡 Đang lưu...';

    clearTimeout(this.autoSaveTimeout);
    this.autoSaveTimeout = setTimeout(async () => {
      try {
        if (!this.currentSession) return;
        await fetch('/api/v2/diagnostic/save-answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.currentSession.sessionId,
            token: this.currentSession.token,
            answers: this.answers,
            currentQuestionIndex: this.currentQuestionIndex
          })
        });
        if (statusEl) statusEl.innerHTML = '🟢 Đã lưu tự động';
      } catch (e) {
        if (statusEl) statusEl.innerHTML = '⚠️ Lưu cục bộ';
      }
    }, 800);
  },

  confirmSubmitModal() {
    const total = this.currentSession.questions.length;
    const answered = Object.keys(this.answers).length;
    const unanswered = total - answered;

    let msg = `Bạn đã hoàn thành ${answered}/${total} câu hỏi.`;
    if (unanswered > 0) {
      msg += ` Còn ${unanswered} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài để nhận báo cáo chẩn đoán năng lực không?`;
    } else {
      msg += ' Bạn có chắc chắn muốn nộp bài?';
    }

    if (confirm(msg)) {
      this.submitAssessment(false);
    }
  },

  async submitAssessment(isForce = false) {
    if (!this.currentSession) return;
    if (this.timerInterval) clearInterval(this.timerInterval);

    try {
      const res = await fetch('/api/v2/diagnostic/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.currentSession.sessionId,
          token: this.currentSession.token,
          userAnswers: this.answers
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Nộp bài thất bại');
      }

      this.latestReport = await res.json();
      this.render('result');
    } catch (e) {
      alert(`Lỗi nộp bài: ${e.message}`);
    }
  },

  // ═════════════════════════════════════════════════════════════
  // 3. RESULT & REPORT SCREEN
  // ═════════════════════════════════════════════════════════════
  renderResult(container) {
    const report = this.latestReport;
    if (!report) return;

    const perf = report.assessmentPerformance || {};
    const gaps = report.gapAnalysis?.prioritizedGaps || [];
    const assessedSkills = report.assessedSkills || [];
    const recommendations = report.actionableRecommendations || [];

    container.innerHTML = `
      <div class="diag-container">
        <div class="diag-result-hero">
          <div>
            <span class="diag-badge-pill success">Báo Cáo Nghiệm Thu Năng Lực</span>
            <h1 style="font-size:1.85rem; font-weight:800; margin:0.5rem 0;">Kết Quả Chẩn Đoán Học Tập</h1>
            <p style="color:var(--text-sub); font-size:0.95rem; margin:0;">
              Môn: <strong>${report.subjectId.toUpperCase()}</strong> | Khối lớp: <strong>${report.grade}</strong> | Hoàn thành lúc: ${new Date(report.completedAt).toLocaleTimeString()}
            </p>
          </div>

          <div style="display:flex; align-items:center; gap:2rem;">
            <div>
              <div style="font-size:0.8rem; color:var(--text-dim); text-transform:uppercase; font-weight:700;">Điểm chẩn đoán</div>
              <div class="diag-score-display">
                <span class="diag-score-big">${perf.totalRawScore || 0}</span>
                <span class="diag-score-denom">/ ${perf.totalMaxScore || 10}</span>
              </div>
            </div>

            <div>
              <div style="font-size:0.8rem; color:var(--text-dim); text-transform:uppercase; font-weight:700;">Độ chính xác</div>
              <div style="font-size:1.75rem; font-weight:800; color:var(--brand-teal);">
                ${Math.round((perf.observedAccuracy || 0) * 100)}%
              </div>
            </div>
          </div>
        </div>

        <!-- 3.1 Prioritized Knowledge Gaps -->
        <h2 style="font-size:1.25rem; font-weight:700; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
          ⚠️ Những Lỗ Hổng Kiến Thức Cần Ưu Tiên Củng Cố (${gaps.length})
        </h2>

        ${gaps.length === 0 ? `
          <div class="diag-welcome-card" style="padding:1.5rem; text-align:center; color:var(--color-success);">
            🎉 Không phát hiện lỗ hổng nền tảng nghiêm trọng nào trong bài kiểm tra này!
          </div>
        ` : gaps.map((gap, i) => `
          <div class="diag-gap-card ${gap.isFoundationalBlocker ? 'blocker' : ''}">
            <div class="diag-gap-header">
              <span class="diag-gap-title">#${i + 1}. [Lớp ${gap.grade}] ${gap.skillTitle}</span>
              <span class="diag-status-pill needs_foundation">Cần củng cố</span>
            </div>
            <div class="diag-gap-body">
              <p style="margin:0 0 0.5rem 0;">${gap.reasons ? gap.reasons.join(' ') : ''}</p>
              <div style="font-size:0.82rem; font-weight:600; color:var(--brand-primary);">
                💡 Hướng xử lý: ${gap.actionPlan || gap.recommendedNextAssessment}
              </div>
            </div>
          </div>
        `).join('')}

        <!-- 3.2 Assessed Skills Overview Table -->
        <h2 style="font-size:1.25rem; font-weight:700; margin:2rem 0 1rem 0;">
          📊 Bản Đồ Mức Độ Thành Thạo Các Kỹ Năng Đã Kiểm Tra
        </h2>

        <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:1rem; overflow-x:auto;">
          <table class="diag-skills-table">
            <thead>
              <tr>
                <th>Kỹ năng</th>
                <th>Khối</th>
                <th>Số câu</th>
                <th>Đúng</th>
                <th>Ước lượng năng lực</th>
                <th>Độ tin cậy</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              ${assessedSkills.map(s => `
                <tr>
                  <td style="font-weight:600;">${s.skillTitle}</td>
                  <td>Lớp ${s.grade}</td>
                  <td>${s.evidenceCount}</td>
                  <td>${s.correctCount || 0}</td>
                  <td>${s.estimatedMastery !== null ? Math.round(s.estimatedMastery * 100) + '%' : '<em>Chưa đủ dữ liệu</em>'}</td>
                  <td>${s.confidenceLevel === 'high' ? 'Cao' : (s.confidenceLevel === 'medium' ? 'Trung bình' : 'Thấp')}</td>
                  <td><span class="diag-status-pill ${s.status}">${s.statusLabel}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 3.3 Actionable Recommendations -->
        <h2 style="font-size:1.25rem; font-weight:700; margin:2rem 0 1rem 0;">
          🚀 Lộ Trình Ôn Tập Đề Xuất (Phase 03B)
        </h2>

        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem; margin-bottom:2rem;">
          ${recommendations.map(r => `
            <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1.25rem;">
              <span class="diag-badge-pill primary" style="font-size:0.7rem; margin-bottom:0.4rem;">Ưu tiên #${r.priority}</span>
              <h3 style="font-size:0.95rem; font-weight:700; margin:0.3rem 0;">${r.title}</h3>
              <p style="font-size:0.85rem; color:var(--text-sub); margin:0;">${r.message}</p>
            </div>
          `).join('')}
        </div>

        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
          <button class="diag-btn-primary" onclick="app.navigateTo('planner')" style="background:var(--brand-primary);">
            📅 Tạo Kế Hoạch Học Tập (Phase 03B)
          </button>
          <button class="diag-btn-secondary" onclick="DiagnosticView.render('welcome')">
            🔄 Làm bài chẩn đoán khác
          </button>
          <button class="diag-btn-secondary" onclick="app.navigateTo('dashboard')">
            🏠 Trở về Bảng điều khiển
          </button>
        </div>

      </div>
    `;
  },

  // ═════════════════════════════════════════════════════════════
  // 4. SKILL MASTERY DASHBOARD
  // ═════════════════════════════════════════════════════════════
  async renderMasteryDashboard(container) {
    container.innerHTML = `
      <div class="diag-container">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
          <div>
            <h1 style="font-size:1.75rem; font-weight:800; margin:0;">Bản Đồ Kỹ Năng Học Sinh</h1>
            <p style="color:var(--text-sub); font-size:0.9rem; margin:0.3rem 0 0 0;">Theo dõi tiến độ tích lũy năng lực GDPT 2018 theo thời gian thực.</p>
          </div>
          <button class="diag-btn-primary" onclick="DiagnosticView.render('welcome')">
            🎯 Làm bài đánh giá mới
          </button>
        </div>

        <div id="diag-mastery-list" style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:1.5rem;">
          <p style="color:var(--text-dim);">Đang tải dữ liệu hồ sơ năng lực...</p>
        </div>
      </div>
    `;

    try {
      const studentId = localStorage.getItem('ntmk_student_id') || 'guest_student';
      const res = await fetch(`/api/v2/diagnostic/mastery?studentId=${studentId}&subjectId=${this.selectedSubject}`);
      const data = await res.json();
      const listEl = document.getElementById('diag-mastery-list');

      if (!listEl) return;
      if (!data.skills || data.skills.length === 0) {
        listEl.innerHTML = '<p>Chưa có dữ liệu đánh giá nào cho môn này. Hãy làm bài chẩn đoán đầu tiên!</p>';
        return;
      }

      listEl.innerHTML = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1rem;">
          ${data.skills.map(s => `
            <div style="border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:1rem; background:var(--bg-surface-secondary);">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                <span style="font-size:0.75rem; color:var(--text-dim); font-weight:700;">LỚP ${s.grade}</span>
                <span class="diag-status-pill ${s.status}">${s.statusLabel}</span>
              </div>
              <h4 style="font-size:0.95rem; font-weight:700; margin:0 0 0.5rem 0; color:var(--text-main);">${s.skillTitle}</h4>
              <div style="font-size:0.8rem; color:var(--text-sub);">
                ${s.estimatedMastery !== null ? `Mức thành thạo: <strong>${Math.round(s.estimatedMastery * 100)}%</strong>` : '<em>Chưa đủ bằng chứng</em>'}
                | Độ tin cậy: ${s.confidenceLevel === 'high' ? 'Cao' : (s.confidenceLevel === 'medium' ? 'TB' : 'Thấp')}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      const listEl = document.getElementById('diag-mastery-list');
      if (listEl) listEl.innerHTML = '<p>Không thể tải hồ sơ kỹ năng lúc này.</p>';
    }
  }
};

window.DiagnosticView = DiagnosticView;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiagnosticView;
}
