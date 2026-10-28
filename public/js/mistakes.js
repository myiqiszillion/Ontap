/**
 * NTMK Mistake Notebook (Sổ Tay Phục Hồi Câu Sai)
 * Quản lý, phân tích và tổ chức ôn luyện lặp lại các câu hỏi học sinh làm sai
 * Tích hợp thuật toán lặp lại ngắt quãng SuperMemo-2 (SM-2) chuẩn GDPT 2018
 */

const MistakeStore = {
  STORAGE_KEY: 'ntmk_mistakes_v2',
  LEGACY_KEY: 'ontap_wrong_questions',
  listeners: [],

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  },

  notify(event, data) {
    this.listeners.forEach(fn => {
      try { fn(event, data); } catch (e) { console.error('MistakeStore listener error:', e); }
    });
  },

  _load() {
    try {
      let raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        const legacy = localStorage.getItem(this.LEGACY_KEY);
        if (legacy) {
          const legacyData = JSON.parse(legacy);
          const migrated = [];
          Object.keys(legacyData).forEach(subjectId => {
            const list = legacyData[subjectId] || [];
            list.forEach(q => {
              migrated.push({
                id: 'm_' + Math.random().toString(36).substring(2, 9),
                subjectId,
                lessonName: q.lessonTitle || 'Bài học đã lưu',
                question: q.question || q.passage || '',
                rawQuestion: q,
                type: q.type || (q.statements ? 'tf-group' : 'mcq'),
                options: q.options || [],
                statements: q.statements || [],
                correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.correct,
                userAnswer: null,
                explanation: q.explanation || null,
                mistakeCount: 1,
                consecutiveCorrect: 0,
                repetition: 0,
                intervalDays: 1,
                easeFactor: 2.5,
                nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
                mastered: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            });
          });
          this._save(migrated);
          return migrated;
        }
        return [];
      }
      return JSON.parse(raw) || [];
    } catch (e) {
      console.warn('Failed to load mistakes:', e);
      return [];
    }
  },

  _save(list) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      this.notify('mistakes_updated', list);
    } catch (e) {
      console.error('Failed to save mistakes:', e);
    }
  },

  /**
   * Tạo ID duy nhất dựa trên nội dung câu hỏi
   */
  generateKey(question) {
    const text = question.question || question.passage || question.prompt || '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return 'q_' + Math.abs(hash);
  },

  /**
   * Ghi nhận một câu hỏi bị làm sai
   * Tự động khởi tạo lịch ôn tập lặp lại ngắt quãng SM-2
   */
  recordMistake({ subjectId, lessonName, question, userAnswer }) {
    if (!question) return null;
    const list = this._load();
    const key = question.id || this.generateKey(question);

    const existingIdx = list.findIndex(item => item.id === key || (item.question === (question.question || question.passage)));

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000).toISOString();
    let entry;

    if (existingIdx >= 0) {
      entry = list[existingIdx];
      entry.mistakeCount = (entry.mistakeCount || 1) + 1;
      entry.userAnswer = userAnswer;
      entry.consecutiveCorrect = 0;
      entry.repetition = 0;
      entry.intervalDays = 1;
      entry.mastered = false; // Phục hồi thành active nếu làm sai lại
      entry.easeFactor = Math.max(1.3, (entry.easeFactor || 2.5) - 0.2);
      entry.nextReviewDate = tomorrow;
      entry.updatedAt = now.toISOString();
      list[existingIdx] = entry;
    } else {
      entry = {
        id: key,
        subjectId: subjectId || 'general',
        lessonName: lessonName || question.lessonTitle || 'Ôn tập tổng hợp',
        question: question.question || question.passage || '',
        rawQuestion: question,
        type: question.type || (question.statements ? 'tf-group' : (question.options ? 'mcq' : 'shortanswer')),
        options: question.options || [],
        statements: question.statements || [],
        correctAnswer: question.mcqPayload ? question.mcqPayload.correctOptionIndex : (question.correctAnswer !== undefined ? question.correctAnswer : question.correct),
        userAnswer: userAnswer,
        explanation: question.explanation || null,
        mistakeCount: 1,
        consecutiveCorrect: 0,
        repetition: 0,
        intervalDays: 1,
        easeFactor: 2.5,
        nextReviewDate: tomorrow,
        mastered: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      list.unshift(entry);
    }

    this._save(list);
    return entry;
  },

  /**
   * Ghi nhận khi học sinh trả lời đúng câu sai trong lúc ôn luyện
   * Áp dụng giải thuật SuperMemo-2 (SM-2) tính toán chu kỳ ôn tiếp theo
   */
  recordSuccess(keyOrId, quality = 4) {
    const list = this._load();
    const idx = list.findIndex(item => item.id === keyOrId || item.question === keyOrId);
    if (idx < 0) return null;

    const item = list[idx];
    const now = new Date();
    const q = Math.max(0, Math.min(5, quality));

    item.consecutiveCorrect = (item.consecutiveCorrect || 0) + 1;
    item.repetition = (item.repetition || 0) + 1;

    let ef = item.easeFactor || 2.5;
    let interval = item.intervalDays || 1;

    if (q < 3) {
      item.repetition = 0;
      item.intervalDays = 1;
    } else {
      if (item.repetition === 1) {
        item.intervalDays = 1;
      } else if (item.repetition === 2) {
        item.intervalDays = 3;
      } else {
        item.intervalDays = Math.round(interval * ef);
      }
      ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
      item.easeFactor = Math.round(ef * 100) / 100;
    }

    item.nextReviewDate = new Date(now.getTime() + (item.intervalDays * 86400000)).toISOString();
    item.lastReviewedAt = now.toISOString();
    item.mastered = true; // Đánh dấu đã thành thạo theo contract
    item.updatedAt = now.toISOString();
    list[idx] = item;

    this._save(list);
    return item;
  },

  /**
   * Lấy danh sách câu sai có kèm bộ lọc
   */
  getMistakes(filter = {}) {
    let list = this._load();

    if (filter.subjectId && filter.subjectId !== 'all') {
      list = list.filter(item => item.subjectId === filter.subjectId);
    }

    if (filter.status === 'active') {
      list = list.filter(item => !item.mastered);
    } else if (filter.status === 'due') {
      const now = new Date().toISOString();
      list = list.filter(item => !item.mastered && (!item.nextReviewDate || item.nextReviewDate <= now));
    } else if (filter.status === 'mastered') {
      list = list.filter(item => item.mastered);
    }

    if (filter.type && filter.type !== 'all') {
      list = list.filter(item => item.type === filter.type);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(item => 
        (item.question && item.question.toLowerCase().includes(q)) ||
        (item.lessonName && item.lessonName.toLowerCase().includes(q))
      );
    }

    return list;
  },

  getActiveCount(subjectId = null) {
    const list = this._load();
    return list.filter(item => !item.mastered && (!subjectId || subjectId === 'all' || item.subjectId === subjectId)).length;
  },

  getDueCount(subjectId = null) {
    const list = this._load();
    const now = new Date().toISOString();
    return list.filter(item => !item.mastered && (!item.nextReviewDate || item.nextReviewDate <= now) && (!subjectId || subjectId === 'all' || item.subjectId === subjectId)).length;
  },

  getTotalCount() {
    return this._load().length;
  },

  getStats() {
    const list = this._load();
    const total = list.length;
    const mastered = list.filter(item => item.mastered).length;
    const active = total - mastered;
    const due = this.getDueCount();
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 100;

    const bySubject = {};
    list.forEach(item => {
      bySubject[item.subjectId] = bySubject[item.subjectId] || { total: 0, active: 0, mastered: 0 };
      bySubject[item.subjectId].total++;
      if (item.mastered) bySubject[item.subjectId].mastered++;
      else bySubject[item.subjectId].active++;
    });

    return { total, active, mastered, due, rate, bySubject };
  },

  removeMistake(id) {
    let list = this._load();
    list = list.filter(item => item.id !== id);
    this._save(list);
  },

  clearAll(subjectId = null) {
    if (subjectId && subjectId !== 'all') {
      let list = this._load();
      list = list.filter(item => item.subjectId !== subjectId);
      this._save(list);
    } else {
      this._save([]);
    }
  }
};

/**
 * Giao diện hiển thị và tương tác Sổ Tay Câu Sai
 * Thiết kế TypeUI Creative & Athenaeum Codex (Obsidian Glass, Zero Raw Emoji)
 */
const MistakeView = {
  currentSubjectFilter: 'all',
  currentStatusFilter: 'active',
  currentSearch: '',

  SUBJECT_NAMES: {
    toan10: 'Toán học 10',
    vatli10: 'Vật lí 10',
    hoahoc10: 'Hóa học 10',
    tienganh10: 'Tiếng Anh 10',
    toan11: 'Toán học 11',
    vatli11: 'Vật lí 11',
    hoahoc11: 'Hóa học 11',
    tienganh11: 'Tiếng Anh 11',
    toan12: 'Toán học 12',
    vatli12: 'Vật lí 12',
    hoahoc12: 'Hóa học 12',
    tienganh12: 'Tiếng Anh 12',
    lichsu10: 'Lịch sử 10',
    lichsu11: 'Lịch sử 11',
    lichsu12: 'Lịch sử 12'
  },

  init() {
    MistakeStore.subscribe(() => {
      this.render();
      this.updateHeaderBadge();
    });
    this.updateHeaderBadge();
  },

  updateHeaderBadge() {
    const activeCount = MistakeStore.getActiveCount();
    const badge = document.getElementById('header-mistakes-badge');
    if (badge) {
      badge.textContent = activeCount;
      if (activeCount > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  },

  formatFormula(text) {
    if (!text) return '';
    if (typeof FormulaRenderer !== 'undefined' && FormulaRenderer.render) {
      try {
        return FormulaRenderer.render(text);
      } catch (e) {
        return this.escapeHtml(text);
      }
    }
    return this.escapeHtml(text);
  },

  render() {
    const container = document.getElementById('screen-mistakes');
    if (!container) return;

    const stats = MistakeStore.getStats();
    const mistakes = MistakeStore.getMistakes({
      subjectId: this.currentSubjectFilter,
      status: this.currentStatusFilter,
      search: this.currentSearch
    });

    const subjectKeys = Object.keys(stats.bySubject);

    container.innerHTML = `
      <div class="mistake-notebook-wrapper">
        <!-- HEADER TRANG TRỌNG THEO PHONG CÁCH TYPEUI ATHENAEUM -->
        <div class="mistake-header-banner">
          <div class="mistake-banner-left">
            <div class="mistake-banner-badge">
              <span class="live-dot-pulse"></span>
              THPT NGUYỄN THỊ MINH KHAI • TRÍ TUỆ ÔN TẬP GDPT 2018
            </div>
            <h1 class="mistake-title">
              <span class="title-icon-box">
                <svg class="ui-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
              </span>
              Sổ Tay Phục Hồi Câu Sai
            </h1>
            <p class="mistake-subtitle">
              Thuật toán lặp lại ngắt quãng SuperMemo-2 (SM-2) tự động tính toán chu kỳ tối ưu cho từng câu hỏi, giúp biến sai sót thành điểm số thực tế.
            </p>
          </div>
          <div class="mistake-stats-cards">
            <div class="mistake-stat-card active-card">
              <span class="stat-num">${stats.active}</span>
              <span class="stat-label">Cần phục hồi</span>
            </div>
            <div class="mistake-stat-card due-card">
              <span class="stat-num">${stats.due}</span>
              <span class="stat-label">Lịch ôn hôm nay</span>
            </div>
            <div class="mistake-stat-card mastered-card">
              <span class="stat-num">${stats.mastered}</span>
              <span class="stat-label">Đã thành thạo</span>
            </div>
            <div class="mistake-stat-card rate-card">
              <span class="stat-num">${stats.rate}%</span>
              <span class="stat-label">Tỷ lệ sạch lỗi</span>
            </div>
          </div>
        </div>

        <!-- THANH ĐIỀU KHIỂN & BỘ LỌC CHUẨN TYPEUI -->
        <div class="mistake-controls-bar">
          <div class="mistake-filter-group">
            <label for="mistake-subject-select" class="filter-label">Môn học:</label>
            <select id="mistake-subject-select" class="mistake-select" onchange="MistakeView.filterSubject(this.value)">
              <option value="all" ${this.currentSubjectFilter === 'all' ? 'selected' : ''}>Tất cả môn (${stats.total})</option>
              ${subjectKeys.map(k => `
                <option value="${k}" ${this.currentSubjectFilter === k ? 'selected' : ''}>
                  ${this.SUBJECT_NAMES[k] || k} (${stats.bySubject[k].total} câu - ${stats.bySubject[k].active} chưa xong)
                </option>
              `).join('')}
            </select>
          </div>

          <div class="mistake-tabs" role="tablist">
            <button role="tab" class="mistake-tab-btn ${this.currentStatusFilter === 'active' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('active')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Cần ôn lại (${stats.active})
            </button>
            <button role="tab" class="mistake-tab-btn ${this.currentStatusFilter === 'due' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('due')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Hôm nay đến hạn (${stats.due})
            </button>
            <button role="tab" class="mistake-tab-btn ${this.currentStatusFilter === 'mastered' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('mastered')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              Đã thành thạo (${stats.mastered})
            </button>
            <button role="tab" class="mistake-tab-btn ${this.currentStatusFilter === 'all' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('all')">
              Toàn bộ (${stats.total})
            </button>
          </div>

          <div class="mistake-search-wrapper">
            <svg class="search-icon-inside ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" 
                   class="mistake-search-input" 
                   placeholder="Tìm câu hỏi hoặc bài học..." 
                   aria-label="Tìm kiếm câu hỏi hoặc bài học"
                   value="${this.escapeHtml(this.currentSearch)}"
                   oninput="MistakeView.search(this.value)">
          </div>
        </div>

        <!-- THANH HÀNH ĐỘNG HỌC TẬP TỨC THÌ -->
        <div class="mistake-actions-strip">
          <div class="actions-left">
            <span class="showing-count">Đang hiển thị <strong>${mistakes.length}</strong> câu hỏi</span>
          </div>
          <div class="actions-right">
            ${stats.active > 0 ? `
              <button class="action-btn-practice" onclick="MistakeView.startPracticeCurrent()">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Luyện lại các câu này ngay (${mistakes.length})
              </button>
            ` : ''}
            <button class="action-btn-clear" onclick="MistakeView.confirmClear()">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              Xóa bộ lọc
            </button>
          </div>
        </div>

        <!-- DANH SÁCH CÁC CÂU SAI -->
        <div class="mistake-cards-list">
          ${mistakes.length === 0 ? `
            <div class="mistake-empty-state">
              <div class="empty-icon">
                <svg class="ui-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h3>${this.currentStatusFilter === 'active' ? 'Tuyệt vời! Không còn câu sai nào cần phục hồi.' : 'Chưa có câu hỏi nào trong danh sách này.'}</h3>
              <p>${this.currentStatusFilter === 'active' ? 'Bạn đã làm chủ toàn bộ các câu hỏi đã gặp. Hãy tiếp tục thử sức với các bài thi mới!' : 'Làm thêm các đề thi để hệ thống tự động phát hiện lỗ hổng cho bạn.'}</p>
              <button class="empty-btn" onclick="app.navigateTo('subjects')">Khám phá đề thi mới</button>
            </div>
          ` : mistakes.map((item, index) => this.renderMistakeCard(item, index)).join('')}
        </div>
      </div>
    `;
  },

  renderMistakeCard(item, index) {
    const isMastered = item.mastered;
    const letters = ['A', 'B', 'C', 'D'];

    return `
      <div class="mistake-item-card ${isMastered ? 'card-mastered' : ''}" id="m-card-${item.id}">
        <div class="mistake-card-top">
          <div class="mistake-badges">
            <span class="subject-pill">${this.SUBJECT_NAMES[item.subjectId] || item.subjectId}</span>
            <span class="lesson-pill">${this.escapeHtml(item.lessonName)}</span>
            <span class="format-pill ${item.type}">${item.type === 'tf-group' ? 'Đúng/Sai' : 'Trắc nghiệm'}</span>
            ${item.mistakeCount > 1 ? `<span class="repeat-pill">Sai ${item.mistakeCount} lần</span>` : ''}
            ${item.intervalDays ? `<span class="interval-pill">Chu kỳ SM-2: ${item.intervalDays} ngày</span>` : ''}
          </div>
          <div class="card-status-badge">
            ${isMastered ? 
              '<span class="status-badge-ok"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Đã khắc phục</span>' : 
              '<span class="status-badge-need"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Cần ôn</span>'}
          </div>
        </div>

        <div class="mistake-question-content">
          <span class="q-index-badge">#${index + 1}</span>
          <div class="q-main-text">${this.formatFormula(item.question)}</div>
        </div>

        <!-- SO SÁNH ĐỐI CHIẾU ĐÁP ÁN -->
        <div class="mistake-compare-box">
          <div class="compare-title">ĐỐI CHIẾU PHƯƠNG ÁN:</div>
          
          ${item.type === 'tf-group' ? `
            <div class="tf-compare-list">
              ${(item.statements || []).map((stmt, sIdx) => {
                const sLetter = ['a', 'b', 'c', 'd'][sIdx];
                return `
                  <div class="tf-compare-row">
                    <span class="tf-stmt-letter">${sLetter})</span>
                    <span class="tf-stmt-text">${this.formatFormula(stmt.text || stmt)}</span>
                    <span class="tf-stmt-correct ${stmt.correct ? 'is-true' : 'is-false'}">
                      Chuẩn: <strong>${stmt.correct ? 'ĐÚNG' : 'SAI'}</strong>
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="mcq-compare-options">
              ${(item.options || []).map((opt, oIdx) => {
                const isCorrect = oIdx === item.correctAnswer;
                const isUserPick = oIdx === item.userAnswer;
                let optClass = '';
                if (isCorrect) optClass = 'opt-is-correct';
                if (isUserPick && !isCorrect) optClass = 'opt-user-wrong';

                return `
                  <div class="compare-opt-row ${optClass}">
                    <span class="opt-letter">${letters[oIdx]}</span>
                    <span class="opt-text">${this.formatFormula(opt)}</span>
                    ${isCorrect ? '<span class="opt-tag tag-correct"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Đáp án chuẩn</span>' : ''}
                    ${isUserPick && !isCorrect ? '<span class="opt-tag tag-wrong"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg> Lựa chọn của bạn</span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        ${item.explanation ? `
          <div class="mistake-explanation-box">
            <div class="exp-title">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              Lời giải & Phân tích phương pháp:
            </div>
            <div class="exp-content">${this.formatFormula(item.explanation)}</div>
          </div>
        ` : ''}

        <div class="mistake-card-footer">
          <div class="footer-left">
            <span class="created-time">Ghi nhận: ${new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
          <div class="footer-actions">
            <button class="retry-single-btn" onclick="MistakeView.retrySingle('${item.id}')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Thử sức lại ngay
            </button>
            ${!isMastered ? `
              <button class="mark-mastered-btn" onclick="MistakeView.markMastered('${item.id}')">
                <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                Đã hiểu
              </button>
            ` : ''}
            <button class="remove-btn" title="Xóa câu này khỏi sổ tay" onclick="MistakeView.deleteMistake('${item.id}')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  filterSubject(subjectId) {
    this.currentSubjectFilter = subjectId;
    this.render();
  },

  filterStatus(status) {
    this.currentStatusFilter = status;
    this.render();
  },

  search(val) {
    this.currentSearch = val;
    this.render();
  },

  markMastered(id) {
    MistakeStore.recordSuccess(id);
    if (window.SoundFX) SoundFX.playCorrect();
    this.render();
  },

  deleteMistake(id) {
    if (confirm('Bạn có chắc muốn xóa câu hỏi này khỏi sổ tay không?')) {
      MistakeStore.removeMistake(id);
      this.render();
    }
  },

  confirmClear() {
    if (confirm('Bạn có chắc muốn làm sạch danh sách câu sai này không?')) {
      MistakeStore.clearAll(this.currentSubjectFilter);
      this.render();
    }
  },

  retrySingle(id) {
    const list = MistakeStore._load();
    const item = list.find(q => q.id === id);
    if (!item) return;

    const quizQuestion = item.rawQuestion || {
      id: item.id,
      question: item.question,
      options: item.options,
      correct: item.correctAnswer,
      explanation: item.explanation,
      lessonTitle: item.lessonName
    };

    app.currentSubject = item.subjectId;
    app.currentQuestions = [quizQuestion];
    app.examMode = 'practice';
    app.navigateTo('quiz');
  },

  startPracticeCurrent() {
    const mistakes = MistakeStore.getMistakes({
      subjectId: this.currentSubjectFilter,
      status: this.currentStatusFilter,
      search: this.currentSearch
    });

    if (mistakes.length === 0) return;

    const questions = mistakes.map(m => m.rawQuestion || {
      id: m.id,
      question: m.question,
      options: m.options,
      correct: m.correctAnswer,
      explanation: m.explanation,
      lessonTitle: m.lessonName
    });

    app.currentSubject = this.currentSubjectFilter === 'all' ? (mistakes[0].subjectId || 'toan10') : this.currentSubjectFilter;
    app.currentQuestions = questions;
    app.examMode = 'practice';
    app.navigateTo('quiz');
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MistakeStore, MistakeView };
}
