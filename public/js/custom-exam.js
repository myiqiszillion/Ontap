/**
 * NTMK Custom Exam Generator (Bộ Sinh Đề Thi Tùy Biến)
 * Cho phép học sinh và giáo viên tạo đề thi kiểm tra 15p, 45p, 50p theo ma trận tùy chỉnh
 * Bám sát cấu trúc khảo thí Quyết định 764/QĐ-BGDĐT & GDPT 2018
 */

const CustomExam = {
  currentSubject: 'toan10',
  currentGradeFilter: 10,
  lessons: [],
  selectedBais: [],
  settings: {
    mcqCount: 20,
    tfCount: 4,
    saCount: 0,
    durationMinutes: 50,
    shuffleQuestions: true,
    shuffleOptions: true
  },

  SUBJECT_OPTIONS: [
    { id: 'toan10', name: 'Toán học 10', grade: 10, defaultMcq: 12, defaultTf: 4, defaultDuration: 90, color: '#3b82f6' },
    { id: 'vatli10', name: 'Vật lí 10', grade: 10, defaultMcq: 18, defaultTf: 4, defaultDuration: 50, color: '#6366f1' },
    { id: 'hoahoc10', name: 'Hóa học 10', grade: 10, defaultMcq: 18, defaultTf: 4, defaultDuration: 50, color: '#06b6d4' },
    { id: 'tienganh10', name: 'Tiếng Anh 10', grade: 10, defaultMcq: 40, defaultTf: 0, defaultDuration: 50, color: '#0d9488' },
    { id: 'lichsu10', name: 'Lịch sử 10', grade: 10, defaultMcq: 20, defaultTf: 4, defaultDuration: 50, color: '#e11d48' },
    { id: 'lichsu11', name: 'Lịch sử 11', grade: 11, defaultMcq: 20, defaultTf: 4, defaultDuration: 50, color: '#e11d48' },
    { id: 'lichsu12', name: 'Lịch sử 12', grade: 12, defaultMcq: 24, defaultTf: 4, defaultDuration: 50, color: '#e11d48' }
  ],

  async init(subjectId = null) {
    if (subjectId) {
      this.currentSubject = subjectId;
      const sub = this.SUBJECT_OPTIONS.find(s => s.id === subjectId);
      if (sub) this.currentGradeFilter = sub.grade;
    } else if (typeof ProfileStore !== 'undefined' && ProfileStore.getProfile) {
      const p = ProfileStore.getProfile();
      const grade = p?.grade || 10;
      this.currentGradeFilter = grade;
      const match = this.SUBJECT_OPTIONS.find(s => s.grade === grade);
      this.currentSubject = match ? match.id : 'toan10';
    } else {
      this.currentSubject = 'toan10';
    }

    await this.loadSubjectData(this.currentSubject);
    this.render();
  },

  async loadSubjectData(subjectId) {
    this.currentSubject = subjectId;
    try {
      if (typeof DataLoader !== 'undefined' && DataLoader.getLessons) {
        const data = await DataLoader.getLessons(subjectId);
        this.lessons = data ? data.lessons : [];
        this.selectedBais = this.lessons.map(l => l.bai);
      }
    } catch (e) {
      console.warn('Could not load lessons for', subjectId, e);
      this.lessons = [];
      this.selectedBais = [];
    }
  },

  render() {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('screen-custom-exam');
    if (!container) return;

    const currentSub = this.SUBJECT_OPTIONS.find(s => s.id === this.currentSubject) || this.SUBJECT_OPTIONS[0];
    const available = this.calculateAvailableQuestions();

    const filteredSubjects = this.SUBJECT_OPTIONS.filter(s => s.grade === this.currentGradeFilter);

    container.innerHTML = `
      <div class="custom-exam-container">
        <!-- HEADER TRANG TRỌNG TYPEUI -->
        <div class="custom-exam-header-banner">
          <div class="header-tag">
            <span class="live-dot-pulse"></span>
            THPT NGUYỄN THỊ MINH KHAI • CÔNG CỤ SINH ĐỀ GDPT 2018
          </div>
          <h1 class="header-title">
            <span class="title-icon-box">
              <svg class="ui-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </span>
            Tự Tạo Đề Thi Theo Yêu Cầu
          </h1>
          <p class="header-desc">
            Tùy biến số lượng câu hỏi, thời gian làm bài và ma trận phân phối bám sát Quyết định 764/QĐ-BGDĐT. Thuật toán Fisher-Yates xáo trộn chuẩn hóa chống trùng lặp.
          </p>
        </div>

        <div class="custom-exam-grid">
          <!-- CỘT TRÁI: THIẾT LẬP CẤU HÌNH -->
          <div class="custom-exam-settings-col">
            <!-- 1. CHỌN MÔN HỌC & KHỐI LỚP -->
            <div class="config-card">
              <div class="card-header-flex">
                <h3 class="config-title">1. Chọn khối lớp &amp; môn thi</h3>
                <div class="grade-filter-pills" role="tablist">
                  ${[10, 11, 12].map(g => `
                    <button role="tab" class="grade-pill-btn ${this.currentGradeFilter === g ? 'active' : ''}" 
                            onclick="CustomExam.filterGrade(${g})">
                      Khối ${g}
                    </button>
                  `).join('')}
                </div>
              </div>
              <div class="subject-pills-row">
                ${filteredSubjects.map(s => `
                  <button class="sub-pill ${this.currentSubject === s.id ? 'active' : ''}" 
                          onclick="CustomExam.changeSubject('${s.id}')">
                    <span class="sub-dot" style="background: ${s.color};"></span>
                    ${s.name}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- 2. CHỌN PHẠM VI BÀI HỌC -->
            <div class="config-card">
              <div class="card-header-flex">
                <h3 class="config-title">2. Chọn phạm vi bài học</h3>
                <div class="select-all-group">
                  <button class="link-btn" onclick="CustomExam.toggleSelectAll(true)">Chọn tất cả</button>
                  <span class="sep">•</span>
                  <button class="link-btn" onclick="CustomExam.toggleSelectAll(false)">Bỏ chọn</button>
                </div>
              </div>

              <div class="lessons-checklist">
                ${this.lessons.length === 0 ? `
                  <div class="no-lessons-hint">Đang tải dữ liệu bài học môn ${currentSub.name}...</div>
                ` : this.lessons.map(l => `
                  <label class="lesson-check-row">
                    <input type="checkbox" 
                           value="${l.bai}" 
                           ${this.selectedBais.includes(l.bai) ? 'checked' : ''}
                           onchange="CustomExam.toggleBai(${l.bai})">
                    <span class="lesson-name">${l.title}</span>
                    <span class="lesson-count-badge">${l.mcqCount} TN • ${l.tfGroupCount} Đ/S</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- 3. CẤU HÌNH MA TRẬN ĐỀ THI -->
            <div class="config-card">
              <h3 class="config-title">3. Ma trận số lượng câu hỏi</h3>

              <div class="matrix-inputs-grid">
                <!-- MCQ -->
                <div class="matrix-input-item">
                  <div class="input-label-row">
                    <label for="custom-mcq-count">Trắc nghiệm 4 lựa chọn (Phần I)</label>
                    <span class="available-hint">Khả dụng: ${available.mcq} câu</span>
                  </div>
                  <div class="stepper-input">
                    <input type="number" 
                           id="custom-mcq-count" 
                           min="0" 
                           max="${Math.max(1, available.mcq)}" 
                           value="${Math.min(this.settings.mcqCount, available.mcq)}"
                           oninput="CustomExam.updateSetting('mcqCount', parseInt(this.value) || 0)">
                    <span class="unit-text">câu</span>
                  </div>
                </div>

                <!-- TF Group -->
                <div class="matrix-input-item">
                  <div class="input-label-row">
                    <label for="custom-tf-count">Trắc nghiệm Đúng / Sai (Phần II)</label>
                    <span class="available-hint">Khả dụng: ${available.tf} bài</span>
                  </div>
                  <div class="stepper-input">
                    <input type="number" 
                           id="custom-tf-count" 
                           min="0" 
                           max="${Math.max(1, available.tf)}" 
                           value="${Math.min(this.settings.tfCount, available.tf)}"
                           oninput="CustomExam.updateSetting('tfCount', parseInt(this.value) || 0)">
                    <span class="unit-text">bài (mỗi bài 4 ý)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. THỜI GIAN & ĐẢO ĐỀ -->
            <div class="config-card">
              <h3 class="config-title">4. Thời gian &amp; Tùy chọn đảo đề</h3>

              <div class="duration-presets-row">
                <span class="duration-label">Thời gian:</span>
                ${[
                  { m: 15, label: '15 phút' },
                  { m: 45, label: '45 phút (1 tiết)' },
                  { m: 50, label: '50 phút (Chuẩn Bộ)' },
                  { m: 90, label: '90 phút' },
                  { m: 0, label: 'Không giới hạn' }
                ].map(d => `
                  <button class="duration-pill ${this.settings.durationMinutes === d.m ? 'active' : ''}"
                          onclick="CustomExam.updateSetting('durationMinutes', ${d.m})">
                    ${d.label}
                  </button>
                `).join('')}
              </div>

              <div class="exam-shuffle-toggles">
                <label class="toggle-row">
                  <input type="checkbox" 
                         ${this.settings.shuffleQuestions ? 'checked' : ''}
                         onchange="CustomExam.updateSetting('shuffleQuestions', this.checked)">
                  <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="16 3 21 3 21 8"/><line x1="4" x2="21" y1="20" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" x2="21" y1="15" y2="21"/><line x1="4" x2="9" y1="4" y2="9"/></svg>
                  <span>Đảo ngẫu nhiên thứ tự các câu hỏi</span>
                </label>

                <label class="toggle-row">
                  <input type="checkbox" 
                         ${this.settings.shuffleOptions ? 'checked' : ''}
                         onchange="CustomExam.updateSetting('shuffleOptions', this.checked)">
                  <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="16 3 21 3 21 8"/><line x1="4" x2="21" y1="20" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" x2="21" y1="15" y2="21"/><line x1="4" x2="9" y1="4" y2="9"/></svg>
                  <span>Đảo ngẫu nhiên thứ tự phương án A, B, C, D</span>
                </label>
              </div>
            </div>
          </div>

          <!-- CỘT PHẢI: BẢNG TỔNG HỢP VÀ BẮT ĐẦU -->
          <div class="custom-exam-summary-col">
            <div class="summary-sticky-card">
              <h3 class="summary-card-title">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
                Thông Tin Đề Thi Tạo Mới
              </h3>

              <div class="summary-meta-list">
                <div class="summary-meta-row">
                  <span class="meta-label">Môn thi:</span>
                  <span class="meta-val"><strong>${currentSub.name}</strong></span>
                </div>
                <div class="summary-meta-row">
                  <span class="meta-label">Phạm vi:</span>
                  <span class="meta-val">${this.selectedBais.length} / ${this.lessons.length} bài học</span>
                </div>
                <div class="summary-meta-row">
                  <span class="meta-label">Cấu trúc:</span>
                  <span class="meta-val">
                    ${this.settings.mcqCount} câu TN + ${this.settings.tfCount} câu Đ/S
                  </span>
                </div>
                <div class="summary-meta-row">
                  <span class="meta-label">Tổng số câu:</span>
                  <span class="meta-val highlight-val">${this.settings.mcqCount + this.settings.tfCount} câu</span>
                </div>
                <div class="summary-meta-row">
                  <span class="meta-label">Thời gian làm bài:</span>
                  <span class="meta-val">${this.settings.durationMinutes > 0 ? `${this.settings.durationMinutes} phút` : 'Tự do (∞)'}</span>
                </div>
                <div class="summary-meta-row">
                  <span class="meta-label">Thang điểm:</span>
                  <span class="meta-val">10.0 điểm (Chuẩn QĐ 764)</span>
                </div>
              </div>

              <div class="exam-presets-quick">
                <div class="quick-title">Gợi ý cấu hình nhanh:</div>
                <button class="quick-preset-btn" onclick="CustomExam.applyPreset('quick15')">
                  <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  Đề kiểm tra 15 phút (10 câu TN + 1 Đ/S)
                </button>
                <button class="quick-preset-btn" onclick="CustomExam.applyPreset('mid45')">
                  <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  Đề kiểm tra 1 tiết 45 phút (16 câu TN + 3 Đ/S)
                </button>
                <button class="quick-preset-btn" onclick="CustomExam.applyPreset('standard50')">
                  <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                  Đề thi học kỳ / chuẩn 50 phút (24 câu TN + 4 Đ/S)
                </button>
              </div>

              <div class="custom-exam-actions-row">
                <button class="start-custom-exam-btn" 
                        id="start-custom-exam-btn"
                        ${(this.settings.mcqCount + this.settings.tfCount === 0 || this.selectedBais.length === 0) ? 'disabled' : ''}
                        onclick="CustomExam.generateAndStart()">
                  <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3"/></svg>
                  Bắt đầu làm bài thi ngay
                </button>
                <button class="print-custom-exam-btn" 
                        id="print-custom-exam-btn"
                        ${(this.settings.mcqCount + this.settings.tfCount === 0 || this.selectedBais.length === 0) ? 'disabled' : ''}
                        onclick="CustomExam.generateAndPrint()">
                  <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                  Xuất bản in A4 &amp; Phiếu OMR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  filterGrade(grade) {
    this.currentGradeFilter = grade;
    const match = this.SUBJECT_OPTIONS.find(s => s.grade === grade);
    if (match) {
      this.changeSubject(match.id);
    } else {
      this.render();
    }
  },

  calculateAvailableQuestions() {
    let mcq = 0;
    let tf = 0;
    this.lessons.forEach(l => {
      if (this.selectedBais.includes(l.bai)) {
        mcq += (l.mcqCount || 0);
        tf += (l.tfGroupCount || 0);
      }
    });
    return { mcq, tf };
  },

  async changeSubject(subId) {
    await this.loadSubjectData(subId);
    const sub = this.SUBJECT_OPTIONS.find(s => s.id === subId);
    if (sub) {
      this.currentGradeFilter = sub.grade;
      this.settings.mcqCount = sub.defaultMcq || 20;
      this.settings.tfCount = sub.defaultTf !== undefined ? sub.defaultTf : 4;
      this.settings.durationMinutes = sub.defaultDuration || 50;
    }
    this.render();
  },

  toggleBai(bai) {
    if (this.selectedBais.includes(bai)) {
      this.selectedBais = this.selectedBais.filter(b => b !== bai);
    } else {
      this.selectedBais.push(bai);
    }
    this.render();
  },

  toggleSelectAll(selectAll) {
    if (selectAll) {
      this.selectedBais = this.lessons.map(l => l.bai);
    } else {
      this.selectedBais = [];
    }
    this.render();
  },

  updateSetting(key, val) {
    this.settings[key] = val;
    this.render();
  },

  applyPreset(presetName) {
    if (presetName === 'quick15') {
      this.settings.mcqCount = 10;
      this.settings.tfCount = 1;
      this.settings.durationMinutes = 15;
    } else if (presetName === 'mid45') {
      this.settings.mcqCount = 16;
      this.settings.tfCount = 3;
      this.settings.durationMinutes = 45;
    } else if (presetName === 'standard50') {
      this.settings.mcqCount = 24;
      this.settings.tfCount = 4;
      this.settings.durationMinutes = 50;
    }
    this.render();
  },

  /**
   * Thuật toán xáo trộn Fisher-Yates
   */
  shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  /**
   * Tạo payload đề thi theo cấu hình
   */
  async buildExamPayload() {
    if (this.selectedBais.length === 0) {
      alert('Vui lòng chọn ít nhất một bài học.');
      return null;
    }

    if (this.settings.mcqCount + this.settings.tfCount === 0) {
      alert('Vui lòng chọn số lượng câu hỏi trắc nghiệm hoặc đúng/sai lớn hơn 0.');
      return null;
    }

    try {
      const quizData = await DataLoader.loadQuizData(
        this.currentSubject,
        this.selectedBais,
        'exam'
      );

      let poolMcq = [...(quizData.mcqQuestions || [])];
      let poolTf = [...(quizData.tfGroups || [])];

      if (this.settings.shuffleQuestions) {
        poolMcq = this.shuffleArray(poolMcq);
        poolTf = this.shuffleArray(poolTf);
      }

      const selectedMcq = poolMcq.slice(0, this.settings.mcqCount);
      const selectedTf = poolTf.slice(0, this.settings.tfCount);

      if (this.settings.shuffleOptions) {
        selectedMcq.forEach(q => {
          if (q.options && q.options.length > 1) {
            const originalCorrectText = q.options[q.correct !== undefined ? q.correct : q.correctAnswer];
            const shuffled = this.shuffleArray(q.options);
            q.options = shuffled;
            q.correct = shuffled.indexOf(originalCorrectText);
            q.correctAnswer = q.correct;
          }
        });
      }

      const finalQuestions = [...selectedMcq, ...selectedTf];
      return {
        subjectId: this.currentSubject,
        durationMinutes: this.settings.durationMinutes,
        questions: finalQuestions,
        mcqCount: selectedMcq.length,
        tfCount: selectedTf.length
      };
    } catch (e) {
      console.error('Lỗi khi tạo payload đề thi:', e);
      alert('Không thể tải câu hỏi cho môn này. Vui lòng thử lại!');
      return null;
    }
  },

  async generateAndStart() {
    const payload = await this.buildExamPayload();
    if (!payload) return;

    app.currentSubject = payload.subjectId;
    app.currentQuestions = payload.questions;
    app.examMode = 'custom';
    app.customExamDuration = payload.durationMinutes * 60;

    app.navigateTo('quiz');
  },

  async generateAndPrint() {
    const payload = await this.buildExamPayload();
    if (!payload) return;

    if (typeof PrintableExam !== 'undefined' && PrintableExam.openPrintPreview) {
      PrintableExam.openPrintPreview({
        subjectId: payload.subjectId,
        subjectName: (this.SUBJECT_OPTIONS.find(s => s.id === payload.subjectId) || {}).name || payload.subjectId,
        durationMinutes: payload.durationMinutes,
        questions: payload.questions
      });
    } else {
      alert('Tính năng in đề thi đang được tải...');
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomExam;
}
