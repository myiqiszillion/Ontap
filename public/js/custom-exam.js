/**
 * NTMK Custom Exam Generator (Bộ Sinh Đề Thi Tùy Biến)
 * Cho phép học sinh và giáo viên tạo đề thi kiểm tra 15p, 45p, 50p theo ma trận tùy chỉnh
 */

const CustomExam = {
  currentSubject: 'lichsu11',
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
    { id: 'lichsu12', name: 'Lịch sử 12', grade: 12, defaultMcq: 24, defaultTf: 4, defaultDuration: 50 },
    { id: 'lichsu11', name: 'Lịch sử 11', grade: 11, defaultMcq: 20, defaultTf: 4, defaultDuration: 50 },
    { id: 'lichsu10', name: 'Lịch sử 10', grade: 10, defaultMcq: 20, defaultTf: 4, defaultDuration: 50 },
    { id: 'toan10', name: 'Toán 10', grade: 10, defaultMcq: 12, defaultTf: 4, defaultDuration: 90 },
    { id: 'vatli10', name: 'Vật lí 10', grade: 10, defaultMcq: 18, defaultTf: 4, defaultDuration: 50 },
    { id: 'hoahoc10', name: 'Hóa học 10', grade: 10, defaultMcq: 18, defaultTf: 4, defaultDuration: 50 },
    { id: 'tienganh10', name: 'Tiếng Anh 10', grade: 10, defaultMcq: 40, defaultTf: 0, defaultDuration: 50 }
  ],

  async init(subjectId = 'lichsu11') {
    this.currentSubject = subjectId;
    await this.loadSubjectData(this.currentSubject);
    this.render();
  },

  async loadSubjectData(subjectId) {
    this.currentSubject = subjectId;
    try {
      const data = await DataLoader.getLessons(subjectId);
      this.lessons = data ? data.lessons : [];
      // Mặc định chọn tất cả bài học
      this.selectedBais = this.lessons.map(l => l.bai);
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

    // Tính tổng số câu hỏi có sẵn từ các bài đã chọn
    const available = this.calculateAvailableQuestions();

    container.innerHTML = `
      <div class="custom-exam-container">
        <!-- HEADER -->
        <div class="custom-exam-header">
          <div class="header-tag">CÔNG CỤ SINH ĐỀ GDPT 2018</div>
          <h1 class="header-title">🎯 Tự Tạo Đề Thi Theo Yêu Cầu</h1>
          <p class="header-desc">
            Tùy biến số lượng câu hỏi, thời gian làm bài và phạm vi chuyên đề. Đề thi được xáo trộn tự động theo thuật toán ma trận đề thi chuẩn Bộ GD&ĐT.
          </p>
        </div>

        <div class="custom-exam-grid">
          <!-- CỘT TRÁI: THIẾT LẬP CẤU HÌNH -->
          <div class="custom-exam-settings-col">
            <!-- 1. CHỌN MÔN HỌC -->
            <div class="config-card">
              <h3 class="config-title">1. Chọn môn thi</h3>
              <div class="subject-pills-row">
                ${this.SUBJECT_OPTIONS.map(s => `
                  <button class="sub-pill ${this.currentSubject === s.id ? 'active' : ''}" 
                          onclick="CustomExam.changeSubject('${s.id}')">
                    ${s.name}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- 2. CHỌN PHẠM VI BÀI HỌC -->
            <div class="config-card">
              <div class="card-header-flex">
                <h3 class="config-title">2. Chọn bài học</h3>
                <div class="select-all-group">
                  <button class="link-btn" onclick="CustomExam.toggleSelectAll(true)">Chọn tất cả</button>
                  <span class="sep">•</span>
                  <button class="link-btn" onclick="CustomExam.toggleSelectAll(false)">Bỏ chọn</button>
                </div>
              </div>

              <div class="lessons-checklist">
                ${this.lessons.map(l => `
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
                    <label>Trắc nghiệm nhiều lựa chọn (Phần I)</label>
                    <span class="available-hint">Tối đa: ${available.mcq} câu</span>
                  </div>
                  <div class="stepper-input">
                    <input type="number" 
                           id="custom-mcq-count" 
                           min="0" 
                           max="${available.mcq}" 
                           value="${Math.min(this.settings.mcqCount, available.mcq)}"
                           oninput="CustomExam.updateSetting('mcqCount', parseInt(this.value) || 0)">
                    <span class="unit-text">câu</span>
                  </div>
                </div>

                <!-- TF Group -->
                <div class="matrix-input-item">
                  <div class="input-label-row">
                    <label>Trắc nghiệm Đúng / Sai (Phần II)</label>
                    <span class="available-hint">Tối đa: ${available.tf} bài</span>
                  </div>
                  <div class="stepper-input">
                    <input type="number" 
                           id="custom-tf-count" 
                           min="0" 
                           max="${available.tf}" 
                           value="${Math.min(this.settings.tfCount, available.tf)}"
                           oninput="CustomExam.updateSetting('tfCount', parseInt(this.value) || 0)">
                    <span class="unit-text">bài (mỗi bài 4 ý)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. THỜI GIAN & ĐẢO ĐỀ -->
            <div class="config-card">
              <h3 class="config-title">4. Thời gian & Tùy chọn đảo đề</h3>

              <div class="duration-presets-row">
                <span class="duration-label">Thời gian:</span>
                ${[
                  { m: 15, label: '15 phút (Kiểm tra nhanh)' },
                  { m: 45, label: '45 phút (1 tiết)' },
                  { m: 50, label: '50 phút (Chuẩn thi)' },
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
                  <span>🔀 Đảo ngẫu nhiên thứ tự các câu hỏi</span>
                </label>

                <label class="toggle-row">
                  <input type="checkbox" 
                         ${this.settings.shuffleOptions ? 'checked' : ''}
                         onchange="CustomExam.updateSetting('shuffleOptions', this.checked)">
                  <span>🔀 Đảo ngẫu nhiên thứ tự phương án A, B, C, D</span>
                </label>
              </div>
            </div>
          </div>

          <!-- CỘT PHẢI: BẢNG TỔNG HỢP VÀ BẮT ĐẦU -->
          <div class="custom-exam-summary-col">
            <div class="summary-sticky-card">
              <h3 class="summary-card-title">📋 Thông Tin Đề Thi Tạo Mới</h3>

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
                  ⚡ Đề kiểm tra 15 phút (10 câu TN + 1 Đ/S)
                </button>
                <button class="quick-preset-btn" onclick="CustomExam.applyPreset('mid45')">
                  📝 Đề kiểm tra 1 tiết 45 phút (16 câu TN + 3 Đ/S)
                </button>
                <button class="quick-preset-btn" onclick="CustomExam.applyPreset('standard50')">
                  🎓 Đề thi học kỳ / tốt nghiệp 50 phút (24 câu TN + 4 Đ/S)
                </button>
              </div>

              <div class="custom-exam-actions-row">
                <button class="start-custom-exam-btn" 
                        id="start-custom-exam-btn"
                        ${(this.settings.mcqCount + this.settings.tfCount === 0 || this.selectedBais.length === 0) ? 'disabled' : ''}
                        onclick="CustomExam.generateAndStart()">
                  🚀 Bắt đầu làm bài thi ngay
                </button>
                <button class="print-custom-exam-btn" 
                        id="print-custom-exam-btn"
                        ${(this.settings.mcqCount + this.settings.tfCount === 0 || this.selectedBais.length === 0) ? 'disabled' : ''}
                        onclick="CustomExam.generateAndPrint()">
                  🖨️ Xuất bản in A4 & Phiếu OMR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
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
      // 1. Tải toàn bộ câu hỏi từ các bài học đã chọn
      const quizData = await DataLoader.loadQuizData(
        this.currentSubject,
        this.selectedBais,
        'exam',
        null, // lấy hết để tự trích xuất
        null,
        null
      );

      const allMcq = quizData.questions.filter(q => q.type === 'mcq' || (!q.type && q.options));
      const allTf = quizData.questions.filter(q => q.type === 'tf-group' || q.statements);

      // 2. Xáo trộn câu hỏi
      let chosenMcq = this.settings.shuffleQuestions ? this.shuffleArray(allMcq) : [...allMcq];
      let chosenTf = this.settings.shuffleQuestions ? this.shuffleArray(allTf) : [...allTf];

      // 3. Cắt theo số lượng đã cài đặt
      chosenMcq = chosenMcq.slice(0, this.settings.mcqCount);
      chosenTf = chosenTf.slice(0, this.settings.tfCount);

      // 4. Đảo phương án A, B, C, D nếu được kích hoạt
      if (this.settings.shuffleOptions) {
        chosenMcq = chosenMcq.map(q => {
          if (!q.options || q.options.length === 0) return q;
          const originalCorrect = q.correctAnswer !== undefined ? q.correctAnswer : q.correct;
          const correctText = q.options[originalCorrect];

          // Trộn các phương án
          const shuffledOpts = this.shuffleArray(q.options);
          const newCorrect = shuffledOpts.indexOf(correctText);

          return {
            ...q,
            options: shuffledOpts,
            correctAnswer: newCorrect,
            correct: newCorrect
          };
        });
      }

      const finalQuestions = [...chosenMcq, ...chosenTf];

      if (finalQuestions.length === 0) {
        alert('Không tìm thấy đủ câu hỏi phù hợp với cấu hình của bạn.');
        return null;
      }

      return {
        subject: this.currentSubject,
        questions: finalQuestions,
        duration: this.settings.durationMinutes,
        title: `Đề thi tùy biến — ${this.SUBJECT_OPTIONS.find(s=>s.id === this.currentSubject)?.name || ''}`
      };
    } catch (e) {
      console.error('Lỗi khi sinh đề thi:', e);
      alert('Đã xảy ra lỗi khi tạo đề thi. Vui lòng thử lại.');
      return null;
    }
  },

  /**
   * Tạo đề thi ngẫu nhiên và kích hoạt phòng thi trực tuyến
   */
  async generateAndStart() {
    const generatedExam = await this.buildExamPayload();
    if (!generatedExam) return;

    try {
      if (typeof app !== 'undefined' && app.navigateTo) {
        app.currentSubject = this.currentSubject;
        app.quizDuration = this.settings.durationMinutes;
        app.navigateTo('quiz');

        const quizSubEl = document.getElementById('quiz-subject');
        if (quizSubEl) quizSubEl.textContent = generatedExam.title;

        if (typeof Timer !== 'undefined') {
          Timer.stop();
          Timer.clearState();
        }

        if (typeof Quiz !== 'undefined') {
          Quiz.untimed = this.settings.durationMinutes <= 0;
          Quiz.init(generatedExam);
        }

        if (this.settings.durationMinutes > 0 && typeof Timer !== 'undefined') {
          Timer.init(this.settings.durationMinutes, (display, remaining) => {
            const timerEl = document.getElementById('active-timer');
            const timerDisplay = document.getElementById('active-timer-display');
            if (timerDisplay) timerDisplay.textContent = display;
            if (timerEl) {
              timerEl.classList.remove('warning', 'danger');
              if (remaining <= 60) timerEl.classList.add('danger');
              else if (remaining <= 300) timerEl.classList.add('warning');
            }
          }, () => {
            alert('Hết thời gian làm bài! Hệ thống tự động nộp bài thi.');
            if (typeof Quiz !== 'undefined') Quiz.submit(true);
          });
        }
      }
    } catch (e) {
      console.error('Lỗi khi kích hoạt phòng thi:', e);
    }
  },

  /**
   * Tạo đề thi ngẫu nhiên và mở giao diện in ấn A4 & OMR
   */
  async generateAndPrint() {
    const generatedExam = await this.buildExamPayload();
    if (!generatedExam) return;

    if (typeof PrintableExam !== 'undefined') {
      PrintableExam.open(generatedExam);
    } else {
      alert('Mô-đun in ấn PrintableExam chưa sẵn sàng.');
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomExam;
}
