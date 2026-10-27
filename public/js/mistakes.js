/**
 * NTMK Mistake Notebook (Sổ Tay Phục Hồi Câu Sai)
 * Quản lý, phân tích và tổ chức ôn luyện lặp lại các câu hỏi học sinh làm sai
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
        // Migrate legacy wrong questions if available
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
   */
  recordMistake({ subjectId, lessonName, question, userAnswer }) {
    if (!question) return null;
    const list = this._load();
    const key = question.id || this.generateKey(question);

    const existingIdx = list.findIndex(item => item.id === key || (item.question === (question.question || question.passage)));

    let entry;
    if (existingIdx >= 0) {
      entry = list[existingIdx];
      entry.mistakeCount = (entry.mistakeCount || 1) + 1;
      entry.userAnswer = userAnswer;
      entry.consecutiveCorrect = 0;
      entry.mastered = false; // Phục hồi thành active nếu làm sai lại
      entry.updatedAt = new Date().toISOString();
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
        mastered: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      list.unshift(entry);
    }

    this._save(list);
    return entry;
  },

  /**
   * Ghi nhận khi học sinh trả lời đúng câu sai trong lúc ôn luyện
   */
  recordSuccess(keyOrId) {
    const list = this._load();
    const idx = list.findIndex(item => item.id === keyOrId || item.question === keyOrId);
    if (idx < 0) return null;

    const item = list[idx];
    item.consecutiveCorrect = (item.consecutiveCorrect || 0) + 1;
    item.mastered = true; // Đánh dấu đã thành thạo
    item.updatedAt = new Date().toISOString();
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

  getTotalCount() {
    return this._load().length;
  },

  getStats() {
    const list = this._load();
    const total = list.length;
    const active = list.filter(i => !i.mastered).length;
    const mastered = total - active;
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 100;

    const bySubject = {};
    list.forEach(item => {
      bySubject[item.subjectId] = bySubject[item.subjectId] || { total: 0, active: 0, mastered: 0 };
      bySubject[item.subjectId].total++;
      if (item.mastered) bySubject[item.subjectId].mastered++;
      else bySubject[item.subjectId].active++;
    });

    return { total, active, mastered, rate, bySubject };
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
 */
const MistakeView = {
  currentSubjectFilter: 'all',
  currentStatusFilter: 'active',
  currentSearch: '',

  SUBJECT_NAMES: {
    lichsu11: 'Lịch sử 11',
    lichsu10: 'Lịch sử 10',
    toan10: 'Toán 10',
    vatli10: 'Vật lí 10',
    hoahoc10: 'Hóa học 10',
    tienganh10: 'Tiếng Anh 10',
    sinh: 'Sinh học',
    tin: 'Tin học'
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

  render() {
    const container = document.getElementById('screen-mistakes');
    if (!container) return;

    const stats = MistakeStore.getStats();
    const mistakes = MistakeStore.getMistakes({
      subjectId: this.currentSubjectFilter,
      status: this.currentStatusFilter,
      search: this.currentSearch
    });

    // Danh sách các môn có câu sai
    const subjectKeys = Object.keys(stats.bySubject);

    container.innerHTML = `
      <div class="mistake-notebook-wrapper">
        <!-- HEADER TRANG TRỌNG THEO PHONG CÁCH NEO-SCHOLAR -->
        <div class="mistake-header-banner">
          <div class="mistake-banner-left">
            <span class="mistake-banner-badge">SỔ TAY PHỤC HỒI KIẾN THỨC</span>
            <h1 class="mistake-title">📕 Sổ Tay Câu Sai</h1>
            <p class="mistake-subtitle">
              Ghi nhớ và khắc phục triệt để các câu trả lời chưa chính xác. Biến sai sót thành điểm số thực tế!
            </p>
          </div>
          <div class="mistake-stats-cards">
            <div class="mistake-stat-card active-card">
              <span class="stat-num">${stats.active}</span>
              <span class="stat-label">Cần phục hồi</span>
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

        <!-- THANH ĐIỀU KHIỂN & BỘ LỌC -->
        <div class="mistake-controls-bar">
          <div class="mistake-filter-group">
            <label class="filter-label">Môn học:</label>
            <select class="mistake-select" onchange="MistakeView.filterSubject(this.value)">
              <option value="all" ${this.currentSubjectFilter === 'all' ? 'selected' : ''}>Tất cả môn (${stats.total})</option>
              ${subjectKeys.map(k => `
                <option value="${k}" ${this.currentSubjectFilter === k ? 'selected' : ''}>
                  ${this.SUBJECT_NAMES[k] || k} (${stats.bySubject[k].total} câu - ${stats.bySubject[k].active} chưa xong)
                </option>
              `).join('')}
            </select>
          </div>

          <div class="mistake-tabs">
            <button class="mistake-tab-btn ${this.currentStatusFilter === 'active' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('active')">
              ⚡ Cần ôn lại (${stats.active})
            </button>
            <button class="mistake-tab-btn ${this.currentStatusFilter === 'mastered' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('mastered')">
              ✓ Đã thành thạo (${stats.mastered})
            </button>
            <button class="mistake-tab-btn ${this.currentStatusFilter === 'all' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('all')">
              Toàn bộ (${stats.total})
            </button>
          </div>

          <div class="mistake-search-wrapper">
            <input type="text" 
                   class="mistake-search-input" 
                   placeholder="🔍 Tìm kiếm câu hỏi hoặc bài học..." 
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
                🚀 Luyện lại các câu này ngay (${mistakes.length})
              </button>
            ` : ''}
            <button class="action-btn-clear" onclick="MistakeView.confirmClear()">
              🗑️ Xóa bộ lọc
            </button>
          </div>
        </div>

        <!-- DANH SÁCH CÁC CÂU SAI -->
        <div class="mistake-cards-list">
          ${mistakes.length === 0 ? `
            <div class="mistake-empty-state">
              <div class="empty-icon">${this.currentStatusFilter === 'active' ? '🎉' : '📂'}</div>
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
          </div>
          <div class="card-status-badge">
            ${isMastered ? '<span class="status-badge-ok">✓ Đã khắc phục</span>' : '<span class="status-badge-need">⚠️ Cần ôn</span>'}
          </div>
        </div>

        <div class="mistake-question-content">
          <span class="q-index-badge">#${index + 1}</span>
          <div class="q-main-text">${this.escapeHtml(item.question)}</div>
        </div>

        ${item.type === 'mcq' && item.options && item.options.length > 0 ? `
          <div class="mistake-options-compare">
            <div class="compare-heading">Đối chiếu phương án:</div>
            <div class="compare-options-list">
              ${item.options.map((opt, optIdx) => {
                const isCorrect = optIdx === Number(item.correctAnswer);
                const isUserWrong = item.userAnswer !== null && Number(item.userAnswer) === optIdx && !isCorrect;
                let optClass = 'opt-normal';
                if (isCorrect) optClass = 'opt-correct';
                if (isUserWrong) optClass = 'opt-user-wrong';

                return `
                  <div class="compare-option-row ${optClass}">
                    <span class="opt-letter">${letters[optIdx]}</span>
                    <span class="opt-text">${this.escapeHtml(opt)}</span>
                    ${isCorrect ? '<span class="opt-tag tag-correct">✓ Đáp án chuẩn</span>' : ''}
                    ${isUserWrong ? '<span class="opt-tag tag-wrong">✗ Lựa chọn của bạn</span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        ${item.type === 'tf-group' && item.statements && item.statements.length > 0 ? `
          <div class="mistake-tf-compare">
            <div class="compare-heading">Mệnh đề Đúng / Sai:</div>
            <div class="tf-compare-list">
              ${item.statements.map((stmt, sIdx) => {
                const stmtText = stmt.statement || stmt.question || '';
                const truth = Boolean(stmt.correct);
                return `
                  <div class="tf-compare-row">
                    <span class="stmt-letter">${String.fromCharCode(97 + sIdx)})</span>
                    <span class="stmt-text">${this.escapeHtml(stmtText)}</span>
                    <span class="stmt-badge ${truth ? 'badge-dung' : 'badge-sai'}">${truth ? '✓ ĐÚNG' : '✗ SAI'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        ${item.explanation ? `
          <div class="mistake-explanation-box">
            <span class="exp-icon">💡</span>
            <div class="exp-text"><strong>Lời giải & Phân tích:</strong> ${this.escapeHtml(item.explanation)}</div>
          </div>
        ` : ''}

        <div class="mistake-card-footer">
          <div class="card-footer-left">
            <span class="record-date">Ghi nhận: ${new Date(item.updatedAt || item.createdAt).toLocaleDateString('vi-VN')}</span>
          </div>
          <div class="card-footer-right">
            ${!isMastered ? `
              <button class="btn-quick-retry" onclick="MistakeView.quickRetry('${item.id}')">
                🎯 Thử sức lại ngay
              </button>
              <button class="btn-mark-resolved" onclick="MistakeView.markMastered('${item.id}')" title="Đánh dấu đã hiểu để lưu trữ">
                ✓ Đã hiểu
              </button>
            ` : `
              <button class="btn-reopen" onclick="MistakeView.reopen('${item.id}')">
                ↩️ Đưa lại vào ôn luyện
              </button>
            `}
            <button class="btn-delete-card" onclick="MistakeView.deleteCard('${item.id}')" title="Xóa khỏi sổ tay">
              ✕
            </button>
          </div>
        </div>

        <!-- KHUNG TRẢ LỜI TỨC THÌ (KHI BẤM THỬ SỨC LẠI NGAY) -->
        <div class="interactive-retry-container hidden" id="retry-box-${item.id}"></div>
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

  reopen(id) {
    const list = MistakeStore._load();
    const item = list.find(i => i.id === id);
    if (item) {
      item.mastered = false;
      item.consecutiveCorrect = 0;
      MistakeStore._save(list);
      this.render();
    }
  },

  deleteCard(id) {
    if (confirm('Bạn có chắc muốn xóa câu này khỏi Sổ tay câu sai?')) {
      MistakeStore.removeMistake(id);
      this.render();
    }
  },

  confirmClear() {
    if (this.currentSubjectFilter !== 'all') {
      if (confirm(`Bạn có chắc muốn xóa toàn bộ câu sai của môn ${this.SUBJECT_NAMES[this.currentSubjectFilter] || this.currentSubjectFilter}?`)) {
        MistakeStore.clearAll(this.currentSubjectFilter);
        this.render();
      }
    } else {
      this.currentSubjectFilter = 'all';
      this.currentStatusFilter = 'active';
      this.currentSearch = '';
      this.render();
    }
  },

  /**
   * Thử sức lại ngay trên thẻ câu hỏi
   */
  quickRetry(id) {
    const box = document.getElementById(`retry-box-${id}`);
    if (!box) return;

    const list = MistakeStore._load();
    const item = list.find(i => i.id === id);
    if (!item) return;

    if (!box.classList.contains('hidden')) {
      box.classList.add('hidden');
      return;
    }

    const letters = ['A', 'B', 'C', 'D'];
    box.classList.remove('hidden');

    if (item.type === 'mcq' && item.options) {
      box.innerHTML = `
        <div class="inline-retry-wrapper">
          <div class="retry-title">Hãy chọn lại đáp án đúng:</div>
          <div class="retry-options-grid">
            ${item.options.map((opt, i) => `
              <button class="retry-opt-btn" onclick="MistakeView.submitQuickRetry('${id}', ${i})">
                <strong>${letters[i]}.</strong> ${this.escapeHtml(opt)}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    } else {
      box.innerHTML = `
        <div class="inline-retry-wrapper">
          <div class="retry-title">Bạn đã sẵn sàng khắc phục câu hỏi này?</div>
          <button class="btn-confirm-solve" onclick="MistakeView.markMastered('${id}')">
            ✓ Tôi đã hiểu bản chất và khắc phục câu này
          </button>
        </div>
      `;
    }
  },

  submitQuickRetry(id, userChoice) {
    const list = MistakeStore._load();
    const item = list.find(i => i.id === id);
    if (!item) return;

    const isCorrect = Number(userChoice) === Number(item.correctAnswer);
    const box = document.getElementById(`retry-box-${id}`);

    if (isCorrect) {
      if (window.SoundFX) SoundFX.playCorrect();
      box.innerHTML = `
        <div class="retry-result-success">
          🎉 <strong>Chính xác xuất sắc!</strong> Bạn đã khắc phục thành công câu hỏi này.
        </div>
      `;
      setTimeout(() => {
        MistakeStore.recordSuccess(id);
        this.render();
      }, 1200);
    } else {
      if (window.SoundFX) SoundFX.playWrong();
      box.innerHTML = `
        <div class="retry-result-wrong">
          ❌ <strong>Chưa chính xác!</strong> Hãy xem lại lời giải chi tiết và thử lại nhé.
        </div>
      `;
    }
  },

  /**
   * Khởi tạo phòng thi/luyện tập từ các câu sai hiện tại
   */
  startPracticeCurrent() {
    const mistakes = MistakeStore.getMistakes({
      subjectId: this.currentSubjectFilter,
      status: this.currentStatusFilter,
      search: this.currentSearch
    });

    if (mistakes.length === 0) {
      alert('Không có câu hỏi nào để luyện tập.');
      return;
    }

    // Biến đổi các mục trong sổ tay thành bộ quizData chuẩn
    const questions = mistakes.map(item => {
      if (item.rawQuestion) return item.rawQuestion;
      return {
        id: item.id,
        type: item.type,
        question: item.question,
        options: item.options,
        statements: item.statements,
        correctAnswer: item.correctAnswer,
        explanation: item.explanation
      };
    });

    const quizData = {
      subject: this.currentSubjectFilter !== 'all' ? this.currentSubjectFilter : 'mistakes_review',
      questions: questions,
      duration: 0,
      mode: 'practice'
    };

    if (typeof app !== 'undefined' && app.navigateTo) {
      app.currentSubject = quizData.subject;
      app.navigateTo('practice');
      if (typeof Study !== 'undefined') {
        Study.init(quizData, 'practice');
      }
    }
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MistakeStore, MistakeView };
}
