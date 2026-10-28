/**
 * Personalized Learning Planner & Adaptive Practice UI Module
 * NTMK Rebuild Phase 03B — Task 8
 *
 * Coordinates:
 * 1. Today's Learning Dashboard (4 core questions answered clearly)
 * 2. My Study Plan (7/14/30 days calendar & timeline)
 * 3. Focus Mode (distraction-free practice environment)
 * 4. Skill Progress & Spaced Repetition Tracker
 * 5. Learning Plan Settings & Adaptive Replanning
 */

const PlannerView = {
  currentTab: 'today',
  activePlan: null,
  profile: null,
  progress: null,
  reviews: [],
  currentPracticeSession: null,
  currentTask: null,
  practiceAnswers: {},
  currentQuestionIndex: 0,
  timerSeconds: 0,
  timerInterval: null,

  async init() {
    await this.loadData();
    this.render();
  },

  async loadData() {
    try {
      const studentId = localStorage.getItem('ntmk_student_id') || 'student_default';

      // 1. Load Profile
      const profRes = await fetch(`/api/v2/learning/profile?userId=${studentId}`);
      if (profRes.ok) {
        const profData = await profRes.json();
        this.profile = profData.profile;
      }

      // 2. Load Active Plan
      const planRes = await fetch(`/api/v2/learning/plan?userId=${studentId}`);
      if (planRes.ok) {
        const planData = await planRes.json();
        this.activePlan = planData.plan;
      }

      // 3. Load Progress
      const progRes = await fetch(`/api/v2/learning/progress?userId=${studentId}`);
      if (progRes.ok) {
        const progData = await progRes.json();
        this.progress = progData.progress;
      }

      // 4. Load Reviews
      const revRes = await fetch(`/api/v2/learning/reviews?userId=${studentId}`);
      if (revRes.ok) {
        const revData = await revRes.json();
        this.reviews = revData.reviews || [];
      }
    } catch (err) {
      console.error('Error loading planner data:', err);
    }
  },

  render(tab = null) {
    const container = document.getElementById('screen-planner');
    if (!container) return;

    if (tab) this.currentTab = tab;

    container.innerHTML = `
      <div class="planner-container">
        <!-- Header -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
          <div>
            <h1 style="font-size:1.75rem; font-weight:800; margin:0; display:flex; align-items:center; gap:0.5rem;">
              <span style="display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:10px; background:rgba(124,58,237,0.25); border:1px solid rgba(124,58,237,0.5); color:#c084fc;">
                <svg class="ui-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              </span>
              Kế Hoạch Học Tập Cá Nhân Hóa
              <span class="task-type-badge adaptive_practice" style="font-size:0.75rem; background:rgba(124,58,237,0.2); color:#c084fc; border:1px solid rgba(124,58,237,0.4);">Chuẩn GDPT 2018</span>
            </h1>
            <p style="color:var(--text-sub); font-size:0.9rem; margin:0.35rem 0 0 0;">
              Lộ trình thích ứng tự động tối ưu hóa dựa trên điểm mạnh và lỗ hổng kiến thức của bạn.
            </p>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="diag-btn-primary" onclick="PlannerView.generateOrReplan()" style="padding:0.6rem 1.25rem; font-size:0.88rem;">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z"/></svg> ${this.activePlan ? 'Tối ưu lại kế hoạch' : 'Tạo kế hoạch mới'}
            </button>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="planner-nav-tabs">
          <button class="planner-tab-btn ${this.currentTab === 'today' ? 'active' : ''}" onclick="PlannerView.switchTab('today')">
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> Hôm nay cần học gì?
          </button>
          <button class="planner-tab-btn ${this.currentTab === 'plan' ? 'active' : ''}" onclick="PlannerView.switchTab('plan')">
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> Lộ trình & Lịch học
          </button>
          <button class="planner-tab-btn ${this.currentTab === 'progress' ? 'active' : ''}" onclick="PlannerView.switchTab('progress')">
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Tiến trình & Kỹ năng
          </button>
          <button class="planner-tab-btn ${this.currentTab === 'settings' ? 'active' : ''}" onclick="PlannerView.switchTab('settings')">
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Cài đặt mục tiêu
          </button>
        </div>

        <!-- Tab Content -->
        <div id="planner-tab-content">
          ${this.renderTabContent()}
        </div>
      </div>
    `;

    if (window.renderMathInElement) {
      window.renderMathInElement(container, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  },

  switchTab(tab) {
    this.currentTab = tab;
    this.render();
  },

  renderTabContent() {
    if (!this.activePlan) {
      return this.renderEmptyPlanState();
    }

    switch (this.currentTab) {
      case 'today':
        return this.renderTodayDashboard();
      case 'plan':
        return this.renderStudyPlanView();
      case 'progress':
        return this.renderProgressView();
      case 'settings':
        return this.renderSettingsView();
      default:
        return this.renderTodayDashboard();
    }
  },

  renderEmptyPlanState() {
    return `
      <div class="planner-hero-card" style="text-align:center; flex-direction:column; padding:3rem 1.5rem;">
        <div style="margin-bottom:1rem; color:#818cf8;"><svg class="ui-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div>
        <h2 style="font-size:1.4rem; font-weight:700; margin-bottom:0.5rem;">Bạn chưa có Kế hoạch Học tập nào</h2>
        <p style="color:var(--text-sub); max-width:540px; margin-bottom:1.5rem; line-height:1.5;">
          Hệ thống sẽ dựa trên kết quả bài Đánh giá Chẩn đoán Năng lực để tự động lập lịch ôn tập phù hợp với thời gian bạn có mỗi ngày.
        </p>
        <div style="display:flex; gap:1rem; flex-wrap:wrap; justify-content:center;">
          <button class="diag-btn-primary" onclick="PlannerView.generateOrReplan()">
            <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg> Tạo Kế Hoạch 14 Ngày Ngay
          </button>
          <button class="diag-btn-secondary" onclick="app.navigateTo('diagnostic')">
            <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> Làm bài chẩn đoán trước
          </button>
        </div>
      </div>
    `;
  },

  // ═════════════════════════════════════════════════════════════
  // 1. TODAY'S LEARNING DASHBOARD
  // ═════════════════════════════════════════════════════════════
  renderTodayDashboard() {
    const todayStr = new Date().toISOString().split('T')[0];
    const allTasks = this.activePlan.tasks || [];
    
    // Find tasks for today or first available
    let todayTasks = allTasks.filter(t => t.scheduledDate === todayStr);
    if (todayTasks.length === 0) {
      // Show first pending or available tasks
      todayTasks = allTasks.filter(t => t.status === 'available' || t.status === 'in_progress');
      if (todayTasks.length === 0) {
        todayTasks = allTasks.slice(0, 3);
      }
    }

    const completedToday = todayTasks.filter(t => t.status === 'completed').length;
    const totalMinutes = todayTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 20), 0);
    const completedMinutes = todayTasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.estimatedMinutes || 20), 0);
    const percent = todayTasks.length > 0 ? Math.round((completedToday / todayTasks.length) * 100) : 0;

    return `
      <!-- Hero Summary -->
      <div class="planner-hero-card">
        <div>
          <span class="task-type-badge remediation" style="margin-bottom:0.5rem; display:inline-block;">Mục tiêu hôm nay</span>
          <h2 style="font-size:1.35rem; font-weight:700; margin:0.25rem 0;">
            ${completedToday >= todayTasks.length && todayTasks.length > 0 ? '🎉 Bạn đã hoàn thành toàn bộ bài hôm nay!' : `Hôm nay: ${todayTasks.length - completedToday} nhiệm vụ cần hoàn thành`}
          </h2>
          <p style="color:var(--text-sub); font-size:0.85rem; margin:0;">
            Ngân sách thời gian: ${this.activePlan.dailyStudyMinutes} phút/ngày • Dự kiến hôm nay: ${totalMinutes} phút
          </p>
          <div class="planner-progress-bar-wrap">
            <div class="planner-progress-bar-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
        <div class="planner-hero-stats">
          <div class="planner-stat-item">
            <span class="planner-stat-num">${completedToday}/${todayTasks.length}</span>
            <span class="planner-stat-label">Nhiệm vụ xong</span>
          </div>
          <div class="planner-stat-item">
            <span class="planner-stat-num">${completedMinutes}/${totalMinutes}m</span>
            <span class="planner-stat-label">Thời gian học</span>
          </div>
          <div class="planner-stat-item">
            <span class="planner-stat-num">${percent}%</span>
            <span class="planner-stat-label">Tiến độ ngày</span>
          </div>
        </div>
      </div>

      <!-- Change Reason Notice if Replan Occurred -->
      ${this.activePlan.changeReason ? `
        <div style="background:rgba(37,99,235,0.06); border:1px solid rgba(37,99,235,0.2); border-radius:var(--radius-md); padding:1rem 1.25rem; margin-bottom:1.5rem; display:flex; align-items:flex-start; gap:0.75rem;">
          <span style="font-size:1.25rem;">💡</span>
          <div>
            <strong style="font-size:0.9rem; color:var(--brand-primary); display:block; margin-bottom:0.2rem;">Kế hoạch phiên bản v${this.activePlan.planVersion || 1} vừa được cập nhật thích ứng:</strong>
            <span style="font-size:0.85rem; color:var(--text-sub);">${this.activePlan.changeReason}</span>
          </div>
        </div>
      ` : ''}

      <!-- Today Tasks List -->
      <h3 style="font-size:1.15rem; font-weight:700; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem;">
        📝 Danh sách nhiệm vụ học tập thực tế (${todayTasks.length})
      </h3>

      <div class="planner-task-list">
        ${todayTasks.map((task, idx) => `
          <div class="planner-task-card ${idx === 0 && task.status !== 'completed' ? 'priority-highlight' : ''} ${task.status}">
            <div class="planner-task-info">
              <div class="planner-task-badges">
                <span class="task-type-badge ${task.taskType}">${this.formatTaskType(task.taskType)}</span>
                <span class="task-status-pill ${task.status}">${this.formatTaskStatus(task.status)}</span>
                <span style="font-size:0.75rem; color:var(--text-dim); font-weight:500;">⏱️ ${task.estimatedMinutes} phút</span>
                <span style="font-size:0.75rem; color:var(--text-dim); font-weight:500;">📚 [${task.subjectId.toUpperCase()}]</span>
              </div>
              <h4 class="planner-task-title">${task.title}</h4>
              <p class="planner-task-reason"><strong>Lý do:</strong> ${task.reason}</p>
              ${task.contentNotice ? `<p style="font-size:0.8rem; color:var(--color-warning); margin:0;">⚠️ ${task.contentNotice}</p>` : ''}
              ${task.completionEvidence ? `
                <div style="font-size:0.8rem; color:var(--color-success); font-weight:600; margin-top:0.25rem;">
                  ✅ Hoàn thành: ${Math.round(task.completionEvidence.accuracy * 100)}% chính xác (${task.completionEvidence.correctCount}/${task.completionEvidence.totalQuestions} câu)
                </div>
              ` : ''}
            </div>
            <div class="planner-task-actions">
              ${task.status === 'completed' ? `
                <button class="diag-btn-secondary" style="font-size:0.8rem; padding:0.4rem 0.8rem;" disabled>Đã hoàn thành</button>
              ` : task.status === 'blocked' ? `
                <button class="diag-btn-secondary" style="font-size:0.8rem; padding:0.4rem 0.8rem;" disabled title="Chờ câu hỏi được thẩm định bản quyền">Tạm khóa</button>
              ` : `
                <button class="diag-btn-primary" onclick="PlannerView.startPractice('${task.taskId}')" style="font-size:0.85rem; padding:0.5rem 1rem;">
                  ${task.status === 'in_progress' ? '▶️ Tiếp tục bài' : '🚀 Bắt đầu học'}
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  // ═════════════════════════════════════════════════════════════
  // 2. MY STUDY PLAN (CALENDAR & TIMELINE)
  // ═════════════════════════════════════════════════════════════
  renderStudyPlanView() {
    const calendar = this.activePlan.calendarSchedule || [];

    return `
      <div style="margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
        <div>
          <h3 style="font-size:1.15rem; font-weight:700; margin:0;">Lộ trình ${this.activePlan.planDays || 14} Ngày</h3>
          <p style="color:var(--text-sub); font-size:0.85rem; margin:0.25rem 0 0 0;">
            Bắt đầu: ${this.activePlan.startDate} • Ngân sách: ${this.activePlan.dailyStudyMinutes} phút/ngày
          </p>
        </div>
      </div>

      <div class="planner-timeline-grid">
        ${calendar.map(day => `
          <div class="planner-day-card ${day.isStudyDay ? '' : 'rest-day'}">
            <div class="planner-day-header">
              <span class="planner-day-date">${this.formatDayTitle(day.dayOfWeek)}, ${day.dateKey}</span>
              <span class="planner-day-minutes">${day.isStudyDay ? `${day.scheduledMinutes}/${this.activePlan.dailyStudyMinutes}m` : 'Nghỉ'}</span>
            </div>
            ${day.tasks.length === 0 ? `
              <p style="font-size:0.8rem; color:var(--text-dim); margin:auto 0; text-align:center;">
                ${day.isStudyDay ? 'Không có nhiệm vụ' : '☕ Ngày nghỉ ngơi'}
              </p>
            ` : day.tasks.map(t => `
              <div style="background:var(--bg-main); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); padding:0.6rem; font-size:0.82rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.2rem;">
                  <span class="task-type-badge ${t.taskType}" style="font-size:0.65rem;">${this.formatTaskType(t.taskType)}</span>
                  <span class="task-status-pill ${t.status}" style="font-size:0.65rem;">${this.formatTaskStatus(t.status)}</span>
                </div>
                <div style="font-weight:600; line-height:1.3;">${t.title}</div>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
    `;
  },

  // ═════════════════════════════════════════════════════════════
  // 3. FOCUS MODE (PRACTICE WORKSPACE)
  // ═════════════════════════════════════════════════════════════
  async startPractice(taskId) {
    try {
      const studentId = localStorage.getItem('ntmk_student_id') || 'student_default';
      const allowFixtures = true; // In test server environment

      const res = await fetch('/api/v2/learning/tasks/start?allowFixtures=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Student-Id': studentId },
        body: JSON.stringify({ taskId, allowFixtures })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Không thể bắt đầu bài luyện');
        return;
      }

      this.currentTask = data.task;
      this.currentPracticeSession = data.practiceSession;
      this.practiceAnswers = {};
      this.currentQuestionIndex = 0;
      this.timerSeconds = 0;

      this.openFocusMode();
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối khi bắt đầu phiên luyện tập');
    }
  },

  openFocusMode() {
    let overlay = document.getElementById('planner-focus-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'planner-focus-overlay';
      overlay.className = 'focus-mode-overlay';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';

    this.startTimer();
    this.renderFocusQuestion();
  },

  closeFocusMode() {
    clearInterval(this.timerInterval);
    const overlay = document.getElementById('planner-focus-overlay');
    if (overlay) overlay.style.display = 'none';
  },

  startTimer() {
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timerSeconds++;
      const timerEl = document.getElementById('focus-timer-text');
      if (timerEl) {
        const mins = String(Math.floor(this.timerSeconds / 60)).padStart(2, '0');
        const secs = String(this.timerSeconds % 60).padStart(2, '0');
        timerEl.textContent = `${mins}:${secs}`;
      }
    }, 1000);
  },

  renderFocusQuestion() {
    const overlay = document.getElementById('planner-focus-overlay');
    if (!overlay || !this.currentPracticeSession) return;

    const session = this.currentPracticeSession;
    const questions = session.questions || [];
    const q = questions[this.currentQuestionIndex];

    overlay.innerHTML = `
      <div class="focus-mode-header">
        <div>
          <span class="task-type-badge adaptive_practice" style="font-size:0.7rem;">Focus Mode</span>
          <h3 style="font-size:1.05rem; font-weight:700; margin:0.2rem 0 0 0;">${this.currentTask?.title || 'Luyện tập thích ứng'}</h3>
        </div>
        <div style="display:flex; align-items:center; gap:1.25rem;">
          <div style="font-weight:700; font-size:1.1rem; color:var(--brand-primary); display:flex; align-items:center; gap:0.4rem;">
            ⏱️ <span id="focus-timer-text">00:00</span>
          </div>
          <button class="diag-btn-secondary" onclick="PlannerView.closeFocusMode()" style="padding:0.4rem 0.8rem; font-size:0.85rem;">
            ✕ Tạm dừng
          </button>
        </div>
      </div>

      <div class="focus-mode-body">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; font-size:0.88rem; color:var(--text-sub);">
          <span>Câu hỏi <strong>${this.currentQuestionIndex + 1}</strong> / ${questions.length}</span>
          <span>Độ khó mục tiêu: <strong>${session.targetDifficulty || 'Trung bình'}</strong></span>
        </div>

        <div class="focus-question-card">
          <div class="focus-question-prompt">
            ${q ? q.prompt : 'Đang tải câu hỏi...'}
          </div>

          ${this.renderFocusQuestionInput(q)}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem;">
          <button class="diag-btn-secondary" onclick="PlannerView.prevFocusQuestion()" ${this.currentQuestionIndex === 0 ? 'disabled' : ''}>
            ← Câu trước
          </button>
          
          ${this.currentQuestionIndex < questions.length - 1 ? `
            <button class="diag-btn-primary" onclick="PlannerView.nextFocusQuestion()">
              Câu tiếp theo →
            </button>
          ` : `
            <button class="diag-btn-primary" onclick="PlannerView.submitPractice()" style="background:var(--color-success);">
              ✅ Nộp bài luyện tập
            </button>
          `}
        </div>
      </div>
    `;

    if (window.renderMathInElement) {
      window.renderMathInElement(overlay, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  },

  renderFocusQuestionInput(q) {
    if (!q) return '';
    const currentAns = this.practiceAnswers[q.id];

    if (q.format === 'multiple_choice' && q.mcqPayload?.options) {
      return `
        <div class="focus-options-grid">
          ${q.mcqPayload.options.map((opt, idx) => `
            <button class="focus-option-btn ${currentAns === idx ? 'selected' : ''}" onclick="PlannerView.selectFocusMCQ('${q.id}', ${idx})">
              <span style="font-weight:700; width:24px;">${String.fromCharCode(65 + idx)}.</span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>
      `;
    }

    if (q.format === 'true_false_group' && q.tfPayload?.statements) {
      const saved = (typeof currentAns === 'object' && currentAns !== null) ? currentAns : {};
      return `
        <table style="width:100%; border-collapse:collapse;">
          ${q.tfPayload.statements.map((stmt, sIdx) => `
            <tr style="border-bottom:1px solid var(--border-subtle);">
              <td style="padding:0.75rem 0.5rem; line-height:1.5;"><strong>${String.fromCharCode(97 + sIdx)})</strong> ${stmt.text}</td>
              <td style="padding:0.75rem 0.5rem; text-align:right;">
                <button class="diag-tf-choice-btn ${saved[stmt.id] === true ? 'selected true' : ''}" onclick="PlannerView.selectFocusTF('${q.id}', '${stmt.id}', true)">Đúng</button>
                <button class="diag-tf-choice-btn ${saved[stmt.id] === false ? 'selected false' : ''}" onclick="PlannerView.selectFocusTF('${q.id}', '${stmt.id}', false)">Sai</button>
              </td>
            </tr>
          `).join('')}
        </table>
      `;
    }

    if (q.format === 'short_answer') {
      return `
        <div style="margin-top:1rem;">
          <input type="text" class="planner-form-control" style="font-size:1.1rem; padding:0.8rem 1rem;" placeholder="Nhập đáp số..." value="${currentAns || ''}" oninput="PlannerView.inputFocusShortAnswer('${q.id}', this.value)">
        </div>
      `;
    }

    return '<p>Đang tải nội dung câu hỏi...</p>';
  },

  selectFocusMCQ(qId, optIdx) {
    this.practiceAnswers[qId] = optIdx;
    this.renderFocusQuestion();
  },

  selectFocusTF(qId, stmtId, val) {
    if (!this.practiceAnswers[qId] || typeof this.practiceAnswers[qId] !== 'object') {
      this.practiceAnswers[qId] = {};
    }
    this.practiceAnswers[qId][stmtId] = val;
    this.renderFocusQuestion();
  },

  inputFocusShortAnswer(qId, val) {
    this.practiceAnswers[qId] = val.trim();
  },

  nextFocusQuestion() {
    if (this.currentPracticeSession && this.currentQuestionIndex < this.currentPracticeSession.questions.length - 1) {
      this.currentQuestionIndex++;
      this.renderFocusQuestion();
    }
  },

  prevFocusQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.renderFocusQuestion();
    }
  },

  async submitPractice() {
    clearInterval(this.timerInterval);

    try {
      const studentId = localStorage.getItem('ntmk_student_id') || 'student_default';
      const session = this.currentPracticeSession;
      const taskId = this.currentTask?.taskId;

      const res = await fetch('/api/v2/learning/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Student-Id': studentId },
        body: JSON.stringify({
          taskId,
          sessionId: session.sessionId,
          token: session.token,
          answers: this.practiceAnswers,
          timeSpentSeconds: this.timerSeconds
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.message || 'Lỗi khi nộp bài');
        return;
      }

      this.renderFocusResult(data);
      // Reload planner data in background
      this.loadData();
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối khi nộp bài');
    }
  },

  renderFocusResult(resultData) {
    const overlay = document.getElementById('planner-focus-overlay');
    if (!overlay) return;

    const ev = resultData.completionEvidence;
    const sub = resultData.submissionResult;
    const accuracyPct = Math.round(ev.accuracy * 100);

    overlay.innerHTML = `
      <div class="focus-mode-header">
        <h3 style="font-size:1.1rem; font-weight:700; margin:0;">Kết quả phiên luyện tập</h3>
        <button class="diag-btn-primary" onclick="PlannerView.closeFocusMode(); PlannerView.init();" style="padding:0.4rem 0.9rem; font-size:0.85rem;">
          ✕ Đóng & Quay về
        </button>
      </div>

      <div class="focus-mode-body">
        <div class="focus-result-summary">
          <div style="font-size:3rem; margin-bottom:0.5rem;">${accuracyPct >= 80 ? '🎯' : (accuracyPct >= 50 ? '📈' : '💡')}</div>
          <h2 style="font-size:1.5rem; font-weight:800; margin:0.25rem 0;">
            ${accuracyPct >= 80 ? 'Xuất sắc! Nắm vững kỹ năng' : (accuracyPct >= 50 ? 'Khá tốt! Đang tiến bộ' : 'Cần củng cố thêm nền tảng')}
          </h2>
          <p style="color:var(--text-sub); margin-bottom:1.5rem;">
            Độ chính xác: <strong>${accuracyPct}%</strong> (${ev.correctCount}/${ev.totalQuestions} câu đúng) • Thời gian: ${Math.round(ev.timeSpentSeconds / 60)} phút
          </p>
          <div style="display:inline-block; background:rgba(37,99,235,0.08); border-radius:var(--radius-md); padding:0.6rem 1rem; font-size:0.85rem; color:var(--brand-primary); font-weight:600;">
            🚀 Khuyến nghị thích ứng: ${ev.difficultyProgression === 'increase' ? 'Tăng độ khó cho phiên tiếp theo' : (ev.difficultyProgression === 'decrease' ? 'Ôn lại kiến thức nền tảng tiên quyết' : 'Duy trì luyện tập')}
          </div>
        </div>

        <h3 style="font-size:1.15rem; font-weight:700; margin:2rem 0 1rem 0;">Chi tiết từng câu hỏi & Lời giải</h3>
        ${(sub.questionEvaluations || []).map((evalItem, idx) => `
          <div class="focus-eval-item ${evalItem.isCorrect ? 'correct' : 'incorrect'}">
            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
              <span style="font-weight:700;">Câu ${idx + 1} (${evalItem.cognitiveLevel})</span>
              <span style="font-weight:700; color:${evalItem.isCorrect ? 'var(--color-success)' : 'var(--color-danger)'};">
                ${evalItem.isCorrect ? '✓ Đúng' : '✗ Chưa đúng'} (+${evalItem.awardedPoints}đ)
              </span>
            </div>
            <div style="line-height:1.5; margin-bottom:0.75rem;">${evalItem.prompt}</div>
            <div style="font-size:0.85rem; background:var(--bg-main); padding:0.75rem; border-radius:var(--radius-sm); color:var(--text-sub);">
              <strong>Lời giải:</strong> ${evalItem.authoritativeExplanation || evalItem.explanation || 'Đã ghi nhận câu trả lời.'}
            </div>
          </div>
        `).join('')}

        <div style="text-align:center; margin-top:2rem;">
          <button class="diag-btn-primary" onclick="PlannerView.closeFocusMode(); PlannerView.init();" style="padding:0.75rem 2rem;">
            Quay lại Kế hoạch Học tập
          </button>
        </div>
      </div>
    `;

    if (window.renderMathInElement) {
      window.renderMathInElement(overlay, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false }
        ],
        throwOnError: false
      });
    }
  },

  // ═════════════════════════════════════════════════════════════
  // 4. PROGRESS & RETENTION VIEW
  // ═════════════════════════════════════════════════════════════
  renderProgressView() {
    return `
      <div class="planner-hero-card">
        <div>
          <h2 style="font-size:1.35rem; font-weight:700; margin:0;">Tiến Trình & Trí Nhớ Dài Hạn</h2>
          <p style="color:var(--text-sub); font-size:0.85rem; margin:0.3rem 0 0 0;">
            Theo dõi sự tiến bộ và chu trình ôn tập ngắt quãng (Spaced Repetition).
          </p>
        </div>
        <div class="planner-hero-stats">
          <div class="planner-stat-item">
            <span class="planner-stat-num">${this.progress?.completedTasksCount || 0}</span>
            <span class="planner-stat-label">Bài luyện hoàn thành</span>
          </div>
          <div class="planner-stat-item">
            <span class="planner-stat-num">${this.progress?.totalPracticeMinutes || 0}m</span>
            <span class="planner-stat-label">Thời gian luyện tập</span>
          </div>
          <div class="planner-stat-item">
            <span class="planner-stat-num">${this.reviews.length}</span>
            <span class="planner-stat-label">Kỹ năng đang theo dõi</span>
          </div>
        </div>
      </div>

      <h3 style="font-size:1.15rem; font-weight:700; margin-bottom:1rem;">Chu Trình Ôn Tập Ngắt Quãng (${this.reviews.length})</h3>
      ${this.reviews.length === 0 ? `
        <div class="diag-welcome-card" style="padding:2rem; text-align:center; color:var(--text-sub);">
          Chưa có kỹ năng nào được theo dõi ôn tập ngắt quãng. Hãy hoàn thành các bài luyện đầu tiên để kích hoạt!
        </div>
      ` : `
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:1rem;">
          ${this.reviews.map(r => `
            <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); padding:1.25rem;">
              <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                <span class="task-type-badge ${r.retentionEvidence === 'strong' ? 'spaced_review' : 'wrong_review'}">${r.retentionEvidence}</span>
                <span style="font-size:0.75rem; color:var(--text-dim);">${r.consecutiveSuccesses} lần liên tiếp</span>
              </div>
              <h4 style="font-size:1rem; font-weight:700; margin:0.25rem 0;">${r.skillId}</h4>
              <p style="font-size:0.8rem; color:var(--text-sub); margin:0.25rem 0 0.5rem 0;">${r.explanation || ''}</p>
              <div style="font-size:0.78rem; color:var(--brand-primary); font-weight:600;">
                📅 Lần ôn tiếp theo: ${r.nextReviewDate} ${r.isDue ? '🔥 (Đến hạn hôm nay)' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  },

  // ═════════════════════════════════════════════════════════════
  // 5. SETTINGS VIEW & REPLAN
  // ═════════════════════════════════════════════════════════════
  renderSettingsView() {
    const prof = this.profile || { dailyStudyMinutes: 30, studyDaysPerWeek: [1, 2, 3, 4, 5, 6], prioritySubjects: ['toan'] };

    return `
      <div class="planner-settings-card">
        <h2 style="font-size:1.35rem; font-weight:800; margin-bottom:1.5rem;">Cài Đặt Hồ Sơ & Lập Lịch Học</h2>
        
        <div class="planner-form-group">
          <label class="planner-form-label">Thời gian có thể học mỗi ngày (phút):</label>
          <input type="number" id="setting-daily-minutes" class="planner-form-control" min="15" max="180" value="${prof.dailyStudyMinutes}">
          <small style="color:var(--text-dim); font-size:0.75rem;">Quy định: từ 15 đến 180 phút/ngày.</small>
        </div>

        <div class="planner-form-group">
          <label class="planner-form-label">Các ngày trong tuần có thể học:</label>
          <div class="planner-days-selector">
            ${[
              { d: 1, label: 'T2' },
              { d: 2, label: 'T3' },
              { d: 3, label: 'T4' },
              { d: 4, label: 'T5' },
              { d: 5, label: 'T6' },
              { d: 6, label: 'T7' },
              { d: 7, label: 'CN' }
            ].map(item => `
              <button type="button" class="planner-day-toggle ${prof.studyDaysPerWeek.includes(item.d) ? 'selected' : ''}" data-day="${item.d}" onclick="this.classList.toggle('selected')">
                ${item.label}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="planner-form-group">
          <label class="planner-form-label">Ngày dự kiến kiểm tra hoặc thi tốt nghiệp (Tùy chọn):</label>
          <input type="date" id="setting-exam-date" class="planner-form-control" value="${prof.targetExamDate || ''}">
        </div>

        <div style="display:flex; gap:1rem; margin-top:2rem;">
          <button class="diag-btn-primary" onclick="PlannerView.saveSettingsAndReplan()">
            💾 Lưu & Cập nhật kế hoạch
          </button>
        </div>
      </div>
    `;
  },

  async saveSettingsAndReplan() {
    const mins = Number(document.getElementById('setting-daily-minutes')?.value || 30);
    const examDate = document.getElementById('setting-exam-date')?.value || null;
    const selectedDays = [];
    document.querySelectorAll('.planner-day-toggle.selected').forEach(btn => {
      selectedDays.push(Number(btn.getAttribute('data-day')));
    });

    try {
      const studentId = localStorage.getItem('ntmk_student_id') || 'student_default';
      const res = await fetch('/api/v2/learning/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Student-Id': studentId },
        body: JSON.stringify({
          userId: studentId,
          dailyStudyMinutes: mins,
          studyDaysPerWeek: selectedDays.length > 0 ? selectedDays : [1, 2, 3, 4, 5, 6],
          targetExamDate: examDate
        })
      });

      if (res.ok) {
        alert('Đã cập nhật cài đặt học tập!');
        await this.generateOrReplan();
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi lưu cài đặt');
    }
  },

  async generateOrReplan() {
    try {
      const studentId = localStorage.getItem('ntmk_student_id') || 'student_default';
      const allowFixtures = true;

      const res = await fetch('/api/v2/learning/plan/generate?allowFixtures=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Student-Id': studentId },
        body: JSON.stringify({
          userId: studentId,
          requestedDays: 14,
          allowFixtures
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        this.activePlan = data.plan;
        this.switchTab('today');
      } else {
        alert(data.message || 'Lỗi khi tạo kế hoạch');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối khi tạo kế hoạch');
    }
  },

  formatTaskType(type) {
    switch (type) {
      case 'remediation': return 'Củng cố nền';
      case 'adaptive_practice': return 'Luyện kỹ năng';
      case 'wrong_review': return 'Luyện câu sai';
      case 'spaced_review': return 'Ôn ngắt quãng';
      case 'followup_assessment': return 'Kiểm tra bổ sung';
      default: return 'Luyện tập';
    }
  },

  formatTaskStatus(status) {
    switch (status) {
      case 'available': return 'Sẵn sàng';
      case 'in_progress': return 'Đang làm';
      case 'completed': return 'Đã xong';
      case 'pending': return 'Chờ đến lượt';
      case 'blocked': return 'Tạm khóa';
      case 'postponed': return 'Đã hoãn';
      default: return status;
    }
  },

  formatDayTitle(dayNum) {
    const map = { 1: 'Thứ Hai', 2: 'Thứ Ba', 3: 'Thứ Tư', 4: 'Thứ Năm', 5: 'Thứ Sáu', 6: 'Thứ Bảy', 7: 'Chủ Nhật' };
    return map[dayNum] || `Ngày ${dayNum}`;
  }
};

window.PlannerView = PlannerView;
