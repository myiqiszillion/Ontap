/**
 * NTMK Printable Exam Studio & OMR Bubble Answer Sheet
 * Bộ công cụ xuất bản đề thi chuẩn A4 in ấn và phiếu tô trắc nghiệm OMR
 */

const PrintableExam = {
  currentExam: null,
  currentTab: 'paper', // 'paper' | 'omr' | 'key'

  init() {
    // Add print keyboard shortcut Ctrl+P when viewing print preview
  },

  /**
   * Mở phòng in đề thi
   */
  open(examData) {
    if (!examData || !examData.questions) {
      alert('Không có dữ liệu đề thi để in.');
      return;
    }
    this.currentExam = examData;
    this.currentTab = 'paper';
    this.renderModal();
  },

  renderModal() {
    let modal = document.getElementById('printable-exam-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'printable-exam-modal';
      modal.className = 'printable-modal-overlay';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="printable-modal-content">
        <!-- TOP CONTROL BAR (Không hiển thị khi in) -->
        <div class="printable-top-toolbar no-print">
          <div class="toolbar-left">
            <span class="toolbar-title">🖨️ Studio Xuất Bản In Ấn Đề Thi</span>
            <div class="printable-tab-pills">
              <button class="pill-btn ${this.currentTab === 'paper' ? 'active' : ''}" onclick="PrintableExam.switchTab('paper')">
                📄 Tờ Đề Thi A4
              </button>
              <button class="pill-btn ${this.currentTab === 'omr' ? 'active' : ''}" onclick="PrintableExam.switchTab('omr')">
                ⭕ Phiếu Tô OMR
              </button>
              <button class="pill-btn ${this.currentTab === 'key' ? 'active' : ''}" onclick="PrintableExam.switchTab('key')">
                🔑 Bảng Đáp Án & Điểm
              </button>
            </div>
          </div>
          <div class="toolbar-right">
            <button class="btn-print-action" onclick="PrintableExam.printNow()">
              🖨️ In Ngay / Lưu PDF
            </button>
            <button class="btn-close-print" onclick="PrintableExam.close()">
              ✕ Đóng
            </button>
          </div>
        </div>

        <!-- PRINTABLE DOCUMENT WRAPPER (Hiển thị và được in) -->
        <div class="printable-document-view" id="printable-document-view">
          ${this.renderActiveTab()}
        </div>
      </div>
    `;

    modal.classList.add('open');
  },

  switchTab(tab) {
    this.currentTab = tab;
    const view = document.getElementById('printable-document-view');
    if (view) view.innerHTML = this.renderActiveTab();

    document.querySelectorAll('.printable-tab-pills .pill-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.printable-tab-pills .pill-btn[onclick*="${tab}"]`);
    if (activeBtn) activeBtn.classList.add('active');
  },

  renderActiveTab() {
    if (this.currentTab === 'omr') return this.renderOmrSheet();
    if (this.currentTab === 'key') return this.renderAnswerKey();
    return this.renderExamPaper();
  },

  /**
   * 1. TỜ ĐỀ THI A4 CHUẨN 2 CỘT
   */
  renderExamPaper() {
    const exam = this.currentExam;
    const mcq = exam.questions.filter(q => q.type === 'mcq' || (!q.type && q.options));
    const tf = exam.questions.filter(q => q.type === 'tf-group' || q.statements);
    const letters = ['A', 'B', 'C', 'D'];
    const duration = exam.duration || 50;

    return `
      <div class="print-page exam-paper-page">
        <!-- HEADER TRƯỜNG & KỲ THI CHUẨN BỘ GD&ĐT -->
        <div class="exam-header-grid">
          <div class="header-left-col">
            <div class="school-name">SỞ GIÁO DỤC VÀ ĐÀO TẠO</div>
            <div class="exam-name">TRƯỜNG THPT NGUYỄN THỊ MINH KHAI</div>
            <div class="exam-desc">KỲ THI KIỂM TRA ĐỊNH KỲ — NĂM HỌC 2026 - 2027</div>
          </div>
          <div class="header-right-col">
            <div class="exam-subject-title">ĐỀ THI MÔN: ${(exam.title || exam.subject || 'LỊCH SỬ').toUpperCase()}</div>
            <div class="exam-time-limit">Thời gian làm bài: ${duration} phút (không kể thời gian phát đề)</div>
            <div class="exam-code-box">MÃ ĐỀ: <strong>101</strong></div>
          </div>
        </div>

        <!-- KHUNG THÔNG TIN HỌC SINH -->
        <div class="student-info-strip">
          <div class="info-field">Họ và tên thí sinh: ............................................................................................</div>
          <div class="info-field">Lớp: ........................</div>
          <div class="info-field">Số báo danh: ........................</div>
        </div>

        <div class="exam-rule-hint">
          (Đề thi gồm ${mcq.length + tf.length} câu. Thí sinh làm bài trên Phiếu trả lời trắc nghiệm)
        </div>

        <hr class="exam-divider">

        <!-- NỘI DUNG ĐỀ THI 2 CỘT -->
        <div class="exam-questions-two-column">
          ${mcq.length > 0 ? `
            <div class="part-banner">
              <strong>PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.</strong><br>
              <em>Thí sinh trả lời từ câu 1 đến câu ${mcq.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</em>
            </div>
            ${mcq.map((q, idx) => `
              <div class="print-q-card">
                <div class="q-title">
                  <strong>Câu ${idx + 1}:</strong> ${this.escapeHtml(q.question)}
                </div>
                <div class="q-options-list">
                  ${(q.options || []).map((opt, optIdx) => `
                    <div class="opt-line">
                      <strong>${letters[optIdx]}.</strong> ${this.escapeHtml(opt)}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          ` : ''}

          ${tf.length > 0 ? `
            <div class="part-banner">
              <strong>PHẦN II. Câu trắc nghiệm đúng sai.</strong><br>
              <em>Thí sinh trả lời từ câu 1 đến câu ${tf.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.</em>
            </div>
            ${tf.map((q, idx) => `
              <div class="print-q-card tf-card">
                <div class="q-title">
                  <strong>Câu ${idx + 1}:</strong> Đọc đoạn tư liệu sau:
                </div>
                <div class="print-passage-quote">
                  "${this.escapeHtml(q.passage || q.prompt || '')}"
                </div>
                <div class="tf-statements-print">
                  ${(q.statements || []).map((stmt, sIdx) => `
                    <div class="tf-stmt-line">
                      <strong>${String.fromCharCode(97 + sIdx)})</strong> ${this.escapeHtml(stmt.statement || stmt.question || '')}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          ` : ''}
        </div>

        <div class="exam-footer-end">
          ——— HẾT ———<br>
          <small>Cán bộ coi thi không giải thích gì thêm.</small>
        </div>
      </div>
    `;
  },

  /**
   * 2. PHIẾU TRẢ LỜI TRẮC NGHIỆM CHUẨN OMR (BUBBLE SHEET)
   */
  renderOmrSheet() {
    const exam = this.currentExam;
    const mcqCount = exam.questions.filter(q => q.type === 'mcq' || (!q.type && q.options)).length || 24;
    const tfCount = exam.questions.filter(q => q.type === 'tf-group' || q.statements).length || 4;
    const letters = ['A', 'B', 'C', 'D'];

    return `
      <div class="print-page omr-page">
        <div class="omr-header">
          <div class="omr-title">BỘ GIÁO DỤC VÀ ĐÀO TẠO</div>
          <div class="omr-main-heading">PHIẾU TRẢ LỜI TRẮC NGHIỆM</div>
          <div class="omr-sub-heading">KỲ THI TỐT NGHIỆP TRUNG HỌC PHỔ THÔNG / KIỂM TRA ĐỊNH KỲ</div>
        </div>

        <div class="omr-top-tables">
          <div class="omr-info-box">
            <div>1. Tỉnh/Thành phố: ....................................................</div>
            <div>2. Điểm thi: ................................................................</div>
            <div>3. Phòng thi số: ..........................................................</div>
            <div>4. Họ và tên thí sinh: .................................................</div>
            <div>5. Ngày sinh: ....../...... /.......... Lớp: .........................</div>
            <div>6. Chữ ký giám thị 1: ..............................................</div>
          </div>

          <div class="omr-numbers-box">
            <div class="bubble-grid-column">
              <div class="grid-title">SỐ BÁO DANH</div>
              <div class="code-boxes-row">
                <span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
              <div class="digits-bubble-matrix">
                ${[0,1,2,3,4,5,6,7,8,9].map(d => `
                  <div class="digit-row">
                    ${[1,2,3,4,5,6].map(() => `<span class="bubble">${d}</span>`).join('')}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="bubble-grid-column">
              <div class="grid-title">MÃ ĐỀ THI</div>
              <div class="code-boxes-row">
                <span></span><span></span><span></span>
              </div>
              <div class="digits-bubble-matrix">
                ${[0,1,2,3,4,5,6,7,8,9].map(d => `
                  <div class="digit-row">
                    ${[1,2,3].map(() => `<span class="bubble">${d}</span>`).join('')}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="omr-guide-banner">
          <strong>HƯỚNG DẪN TÔ PHIẾU:</strong> Dùng bút chì 2B tô kín ô tròn. Không gạch chéo. Tẩy sạch nếu muốn đổi đáp án. 
          Ví dụ đúng: <span class="bubble filled">A</span>. Ví dụ sai: <span class="bubble wrong-mark">✕</span>
        </div>

        <!-- PHẦN I: TÔ MCQ -->
        <div class="omr-section-title">PHẦN I (Trả lời bằng cách tô tròn một phương án tương ứng với mỗi câu hỏi)</div>
        <div class="omr-mcq-grid">
          ${Array.from({ length: mcqCount }).map((_, i) => `
            <div class="omr-q-row">
              <span class="q-label">${i + 1}</span>
              ${letters.map(l => `<span class="bubble">${l}</span>`).join('')}
            </div>
          `).join('')}
        </div>

        <!-- PHẦN II: TÔ ĐÚNG SAI -->
        <div class="omr-section-title" style="margin-top: 14px;">PHẦN II (Trả lời bằng cách tô Đúng [Đ] hoặc Sai [S] cho từng ý a, b, c, d)</div>
        <div class="omr-tf-grid">
          ${Array.from({ length: tfCount }).map((_, i) => `
            <div class="omr-tf-card">
              <div class="tf-card-title">Câu ${i + 1}</div>
              ${['a', 'b', 'c', 'd'].map(letter => `
                <div class="omr-tf-row">
                  <span class="sub-letter">${letter}</span>
                  <span class="bubble">Đ</span>
                  <span class="bubble">S</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * 3. TỜ ĐÁP ÁN & HƯỚNG DẪN CHẤM
   */
  renderAnswerKey() {
    const exam = this.currentExam;
    const mcq = exam.questions.filter(q => q.type === 'mcq' || (!q.type && q.options));
    const tf = exam.questions.filter(q => q.type === 'tf-group' || q.statements);
    const letters = ['A', 'B', 'C', 'D'];

    return `
      <div class="print-page key-page">
        <div class="key-header">
          <h2>HƯỚNG DẪN CHẤM & ĐÁP ÁN ĐỀ THI: ${(exam.title || exam.subject || '').toUpperCase()}</h2>
          <p>Mã đề: 101 • Chuẩn biểu điểm Quyết định 764/QĐ-BGDĐT</p>
        </div>

        <div class="key-section-title">PHẦN I: ĐÁP ÁN TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN (0.25đ / câu)</div>
        <div class="key-matrix-table">
          <table>
            <thead>
              <tr>
                ${Array.from({ length: Math.min(10, mcq.length) }).map((_, i) => `<th>Câu</th><th>Đ/A</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              <tr>
                ${mcq.slice(0, 10).map((q, i) => `
                  <td><strong>${i + 1}</strong></td>
                  <td class="key-ans">${letters[q.correctAnswer !== undefined ? q.correctAnswer : q.correct] || 'A'}</td>
                `).join('')}
              </tr>
              ${mcq.length > 10 ? `
                <tr>
                  ${mcq.slice(10, 20).map((q, i) => `
                    <td><strong>${i + 11}</strong></td>
                    <td class="key-ans">${letters[q.correctAnswer !== undefined ? q.correctAnswer : q.correct] || 'A'}</td>
                  `).join('')}
                </tr>
              ` : ''}
              ${mcq.length > 20 ? `
                <tr>
                  ${mcq.slice(20, 30).map((q, i) => `
                    <td><strong>${i + 21}</strong></td>
                    <td class="key-ans">${letters[q.correctAnswer !== undefined ? q.correctAnswer : q.correct] || 'A'}</td>
                  `).join('')}
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <div class="key-section-title" style="margin-top: 20px;">PHẦN II: ĐÁP ÁN TRẮC NGHIỆM ĐÚNG / SAI (1 câu = 1.0 điểm)</div>
        <div class="moet-scoring-rule-box">
          * Quy chế chấm điểm Phần II: Đúng 1 ý = 0.1 điểm • Đúng 2 ý = 0.25 điểm • Đúng 3 ý = 0.5 điểm • Đúng 4 ý = 1.0 điểm.
        </div>

        <div class="tf-key-grid">
          ${tf.map((q, idx) => `
            <div class="tf-key-card">
              <h4>Câu ${idx + 1}</h4>
              <table class="sub-key-table">
                ${(q.statements || []).map((s, sIdx) => `
                  <tr>
                    <td><strong>${String.fromCharCode(97 + sIdx)})</strong></td>
                    <td>${this.escapeHtml(s.statement || s.question || '')}</td>
                    <td class="badge-cell ${s.correct ? 'dung' : 'sai'}">${s.correct ? 'ĐÚNG' : 'SAI'}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  printNow() {
    window.print();
  },

  close() {
    const modal = document.getElementById('printable-exam-modal');
    if (modal) modal.classList.remove('open');
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrintableExam;
}
