/**
 * NTMK Printable Exam Studio & MOET OMR Bubble Answer Sheet
 * Bộ công cụ xuất bản đề thi chuẩn A4 in ấn và phiếu tô trắc nghiệm OMR
 * Tuân thủ chuẩn Bộ GD&ĐT (Quyết định 764/QĐ-BGDĐT) và layout THPT Nguyễn Thị Minh Khai - Bình Dương
 */

function getIcon(name, options = {}) {
  let iconProvider = null;
  if (typeof Icons !== 'undefined' && Icons.get) {
    iconProvider = Icons;
  } else if (typeof require !== 'undefined') {
    try {
      iconProvider = require('./icons.js');
    } catch (_) {
      iconProvider = null;
    }
  }
  if (iconProvider && typeof iconProvider.get === 'function') {
    return iconProvider.get(name, options);
  }
  return '';
}

const PrintableExam = {
  VARIANTS: ['101', '102', '103', '104'],
  currentExam: null,
  currentTab: 'paper', // 'paper' | 'omr' | 'key'
  currentVariant: '101',

  init() {
    // Print keyboard shortcut Ctrl+P is handled natively by the browser
  },

  /**
   * Mở phòng in đề thi
   */
  open(examData) {
    if (!examData || !examData.questions) {
      if (typeof alert !== 'undefined') alert('Không có dữ liệu đề thi để in.');
      return;
    }
    this.currentExam = examData;
    this.currentTab = 'paper';
    this.currentVariant = '101';
    this.renderModal();
  },

  /**
   * Compatibility alias for CustomExam caller
   */
  openPrintPreview(examData) {
    return this.open(examData);
  },

  renderModal() {
    if (typeof document === 'undefined') return;
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
            <span class="toolbar-title">${getIcon('printer', { size: 18 })} Studio Xuất Bản In Ấn Đề Thi</span>
            <div class="printable-tab-pills">
              <button class="pill-btn ${this.currentTab === 'paper' ? 'active' : ''}" onclick="PrintableExam.switchTab('paper')">
                ${getIcon('file-text', { size: 15 })} Tờ Đề Thi A4
              </button>
              <button class="pill-btn ${this.currentTab === 'omr' ? 'active' : ''}" onclick="PrintableExam.switchTab('omr')">
                ${getIcon('target', { size: 15 })} Phiếu Tô OMR
              </button>
              <button class="pill-btn ${this.currentTab === 'key' ? 'active' : ''}" onclick="PrintableExam.switchTab('key')">
                ${getIcon('key', { size: 15 })} Bảng Đáp Án &amp; Điểm
              </button>
            </div>
            <!-- MULTI-VARIANT SWITCHER -->
            <div class="printable-variant-pills">
              <span class="variant-label">${getIcon('shuffle', { size: 14 })} Mã đề:</span>
              ${this.VARIANTS.map(v => `
                <button class="variant-pill ${this.currentVariant === v ? 'active' : ''}" onclick="PrintableExam.switchVariant('${v}')">
                  Mã ${v}
                </button>
              `).join('')}
            </div>
          </div>
          <div class="toolbar-right">
            <button class="btn-print-action" onclick="PrintableExam.printNow()">
              ${getIcon('printer', { size: 16 })} In Ngay / Lưu PDF
            </button>
            <button class="btn-close-print" onclick="PrintableExam.close()">
              ${getIcon('x', { size: 16 })} Đóng
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
    if (typeof document !== 'undefined') {
      const view = document.getElementById('printable-document-view');
      if (view) view.innerHTML = this.renderActiveTab();

      document.querySelectorAll('.printable-tab-pills .pill-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      const activeBtn = document.querySelector(`.printable-tab-pills .pill-btn[onclick*="${tab}"]`);
      if (activeBtn) activeBtn.classList.add('active');
    }
  },

  switchVariant(variantCode) {
    this.currentVariant = String(variantCode || '101');
    if (typeof document !== 'undefined') {
      const view = document.getElementById('printable-document-view');
      if (view) view.innerHTML = this.renderActiveTab();

      document.querySelectorAll('.printable-variant-pills .variant-pill').forEach(btn => {
        btn.classList.remove('active');
      });
      const activeBtn = document.querySelector(`.printable-variant-pills .variant-pill[onclick*="${this.currentVariant}"]`);
      if (activeBtn) activeBtn.classList.add('active');
    }
  },

  renderActiveTab() {
    if (this.currentTab === 'omr') return this.renderOMRSheet(this.currentExam, this.currentVariant);
    if (this.currentTab === 'key') return this.renderAnswerKey(this.currentVariant);
    return this.renderExamPaper(this.currentVariant);
  },

  /**
   * Deterministic seeded shuffle for reproducible exam variants
   */
  seededShuffle(array, seed) {
    if (!Array.isArray(array)) return [];
    let s = (Math.abs(seed) * 9301 + 49297) % 233280;
    const rng = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * Multi-code exam variant generation (e.g. Mã đề 101, 102, 103, 104)
   * Shuffles questions deterministically per section according to variant code
   */
  generateVariant(examData, variantCode = '101') {
    if (!examData) return null;
    const vCode = String(variantCode || '101');
    const questions = Array.isArray(examData.questions) ? examData.questions : [];

    // Separate by 3 MOET QĐ 764 sections
    const mcqs = questions.filter(q => q.type === 'mcq' || q.format === 'multiple_choice' || (!q.type && !q.format && q.options));
    const tfs = questions.filter(q => q.type === 'tf-group' || q.format === 'true_false_group' || q.statements);
    const sas = questions.filter(q => q.type === 'short_answer' || q.format === 'short_answer');
    const others = questions.filter(q => !mcqs.includes(q) && !tfs.includes(q) && !sas.includes(q));

    const seedNum = parseInt(vCode, 10) || 101;
    // Variant 101 represents the master question order; variants 102, 103, 104 shuffle questions per part
    const isMaster = (vCode === '101');
    const shuffledMcqs = isMaster ? mcqs.slice() : this.seededShuffle(mcqs, seedNum * 13 + 7);
    const shuffledTfs = isMaster ? tfs.slice() : this.seededShuffle(tfs, seedNum * 17 + 11);
    const shuffledSas = isMaster ? sas.slice() : this.seededShuffle(sas, seedNum * 23 + 19);

    const assembledQuestions = [...shuffledMcqs, ...shuffledTfs, ...shuffledSas, ...others];

    return {
      ...examData,
      variantCode: vCode,
      questions: assembledQuestions
    };
  },

  /**
   * 1. TỜ ĐỀ THI A4 CHUẨN 2 CỘT — THPT NGUYỄN THỊ MINH KHAI (BÌNH DƯƠNG)
   */
  renderExamPaper(variantCode) {
    const vCode = String(variantCode || this.currentVariant || '101');
    const exam = this.generateVariant(this.currentExam, vCode);
    if (!exam) return '<div class="print-page exam-paper-page"><p>Không có dữ liệu đề thi.</p></div>';

    const mcq = exam.questions.filter(q => q.type === 'mcq' || q.format === 'multiple_choice' || (!q.type && !q.format && q.options));
    const tf = exam.questions.filter(q => q.type === 'tf-group' || q.format === 'true_false_group' || q.statements);
    const sa = exam.questions.filter(q => q.type === 'short_answer' || q.format === 'short_answer');
    const letters = ['A', 'B', 'C', 'D'];
    const duration = exam.durationMinutes || exam.duration || 50;
    const totalQuestions = mcq.length + tf.length + sa.length;

    return `
      <div class="print-page exam-paper-page">
        <!-- HEADER TRƯỜNG & KỲ THI CHUẨN SỞ GD&ĐT BÌNH DƯƠNG -->
        <div class="exam-header-grid">
          <div class="header-left-col">
            <div class="school-authority">SỞ GIÁO DỤC VÀ ĐÀO TẠO BÌNH DƯƠNG</div>
            <div class="school-name">TRƯỜNG THPT NGUYỄN THỊ MINH KHAI</div>
            <div class="exam-desc">KỲ THI KHẢO SÁT CHẤT LƯỢNG — NĂM HỌC 2025 - 2026</div>
          </div>
          <div class="header-right-col">
            <div class="exam-subject-title">ĐỀ THI MÔN: ${(exam.title || exam.subject || 'LỊCH SỬ').toUpperCase()}</div>
            <div class="exam-time-limit">Thời gian làm bài: ${duration} phút (không kể thời gian phát đề)</div>
            <div class="exam-code-box">MÃ ĐỀ: <strong>${vCode}</strong></div>
          </div>
        </div>

        <!-- KHUNG THÔNG TIN HỌC SINH -->
        <div class="student-info-strip">
          <div class="info-field">Họ và tên thí sinh: ............................................................................................</div>
          <div class="info-field">Lớp: ........................</div>
          <div class="info-field">Số báo danh: ........................</div>
          <div class="info-field">Phòng thi: ........................</div>
        </div>

        <div class="exam-rule-hint">
          (Đề thi gồm ${totalQuestions} câu. Thí sinh làm bài trên Phiếu trả lời trắc nghiệm chuẩn MOET)
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
                  <strong>Câu ${idx + 1}:</strong> ${q.passage ? 'Đọc đoạn tư liệu sau:' : this.escapeHtml(q.question || '')}
                </div>
                ${q.passage ? `<div class="print-passage-quote">${this.escapeHtml(q.passage)}</div>` : ''}
                <div class="tf-statements-print">
                  ${(q.statements || []).map((stmt, sIdx) => `
                    <div class="tf-stmt-line">
                      <span class="sub-letter"><strong>${String.fromCharCode(97 + sIdx)})</strong></span> ${this.escapeHtml(stmt.statement || stmt.question || '')}
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          ` : ''}

          ${sa.length > 0 ? `
            <div class="part-banner">
              <strong>PHẦN III. Câu trắc nghiệm trả lời ngắn.</strong><br>
              <em>Thí sinh trả lời từ câu 1 đến câu ${sa.length}. Với mỗi câu hỏi, thí sinh điền câu trả lời ngắn vào các ô vuông và tô phiếu trả lời trắc nghiệm.</em>
            </div>
            ${sa.map((q, idx) => `
              <div class="print-q-card sa-card">
                <div class="q-title">
                  <strong>Câu ${idx + 1}:</strong> ${this.escapeHtml(q.question)}
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
   * Đầy đủ 3 phần theo Quyết định 764/QĐ-BGDĐT
   */
  renderOMRSheet(examData, variantCode) {
    const exam = examData || this.currentExam;
    const vCode = String(variantCode || (exam && exam.variantCode) || this.currentVariant || '101');
    const questions = (exam && exam.questions) ? exam.questions : [];

    const mcqQuestions = questions.filter(q => q.type === 'mcq' || q.format === 'multiple_choice' || (!q.type && !q.format && q.options));
    const tfQuestions = questions.filter(q => q.type === 'tf-group' || q.format === 'true_false_group' || q.statements);
    const saQuestions = questions.filter(q => q.type === 'short_answer' || q.format === 'short_answer');

    const mcqCount = mcqQuestions.length || 24;
    const tfCount = tfQuestions.length || 4;
    const saCount = saQuestions.length || 6;
    const letters = ['A', 'B', 'C', 'D'];

    return `
      <div class="print-page omr-page">
        <!-- OPTICAL TIMING MARKS / CALIBRATION CORNERS FOR SCANNER -->
        <div class="omr-corner-mark top-left"></div>
        <div class="omr-corner-mark top-right"></div>
        <div class="omr-corner-mark bottom-left"></div>
        <div class="omr-corner-mark bottom-right"></div>
        <div class="omr-timing-mark timing-left"></div>
        <div class="omr-timing-mark timing-right"></div>

        <div class="omr-header">
          <div class="omr-authority">SỞ GIÁO DỤC VÀ ĐÀO TẠO BÌNH DƯƠNG — TRƯỜNG THPT NGUYỄN THỊ MINH KHAI</div>
          <div class="omr-main-heading">PHIẾU TRẢ LỜI TRẮC NGHIỆM</div>
          <div class="omr-sub-heading">KỲ THI TỐT NGHIỆP THPT / KIỂM TRA ĐỊNH KỲ (THEO QUYẾT ĐỊNH 764/QĐ-BGDĐT)</div>
        </div>

        <div class="omr-top-tables">
          <div class="omr-info-box">
            <div class="omr-info-line">1. Tỉnh/Thành phố: <strong>Bình Dương</strong></div>
            <div class="omr-info-line">2. Điểm thi: <strong>THPT Nguyễn Thị Minh Khai</strong></div>
            <div class="omr-info-line">3. Phòng thi: ..........................................................</div>
            <div class="omr-info-line">4. Họ và tên: .................................................</div>
            <div class="omr-info-line">5. Số báo danh: .....................................................</div>
            <div class="omr-info-line">6. Ngày sinh: ....../...... /.......... Lớp: .........................</div>
            <div class="omr-info-line">7. Chữ ký giám thị 1: ..............................................</div>
            <div class="omr-info-line">8. Chữ ký giám thị 2: ..............................................</div>
          </div>

          <div class="omr-numbers-box">
            <div class="bubble-grid-column sbd-column">
              <div class="grid-title">Số báo danh</div>
              <div class="code-boxes-row">
                <span></span><span></span><span></span><span></span><span></span><span></span>
              </div>
              <div class="digits-bubble-matrix">
                ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `
                  <div class="digit-row">
                    ${[1, 2, 3, 4, 5, 6].map(() => `<span class="bubble">${d}</span>`).join('')}
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="bubble-grid-column made-column">
              <div class="grid-title">Mã đề thi</div>
              <div class="code-boxes-row">
                <span>${vCode[0] || ''}</span><span>${vCode[1] || ''}</span><span>${vCode[2] || ''}</span>
              </div>
              <div class="digits-bubble-matrix">
                ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `
                  <div class="digit-row">
                    ${[0, 1, 2].map(colIdx => {
                      const targetChar = vCode[colIdx];
                      const isFilled = targetChar !== undefined && parseInt(targetChar, 10) === d;
                      return `<span class="bubble ${isFilled ? 'filled' : ''}">${d}</span>`;
                    }).join('')}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="omr-guide-banner">
          <strong>HƯỚNG DẪN TÔ PHIẾU:</strong> Dùng bút chì 2B tô kín ô tròn. Không gạch chéo hoặc đánh dấu lạ. Tẩy sạch nếu muốn đổi đáp án. 
          Ví dụ đúng: <span class="bubble filled">A</span>. Ví dụ sai: <span class="bubble wrong-mark">X</span> <span class="bubble wrong-mark">/</span>
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
        <div class="omr-section-title" style="margin-top: 10px;">PHẦN II (Trả lời bằng cách tô Đúng [Đ] hoặc Sai [S] cho từng ý a, b, c, d)</div>
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

        <!-- PHẦN III: TÔ TRẢ LỜI NGẮN (DIGIT MATRIX WITH 0-9, -, ,) -->
        <div class="omr-section-title" style="margin-top: 10px;">PHẦN III (Trả lời câu hỏi trắc nghiệm trả lời ngắn: viết đáp án vào ô trên, tô ô tròn tương ứng ở dưới)</div>
        <div class="omr-sa-grid">
          ${Array.from({ length: saCount }).map((_, i) => `
            <div class="omr-sa-card">
              <div class="sa-card-title">Câu ${i + 1}</div>
              <div class="sa-boxes-row">
                <span></span><span></span><span></span><span></span>
              </div>
              <div class="sa-matrix">
                <div class="sa-matrix-row sign-row">
                  <span class="bubble">-</span><span class="bubble">-</span><span class="bubble">-</span><span class="bubble">-</span>
                </div>
                <div class="sa-matrix-row comma-row">
                  <span class="bubble">,</span><span class="bubble">,</span><span class="bubble">,</span><span class="bubble">,</span>
                </div>
                ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `
                  <div class="sa-matrix-row digit-row">
                    <span class="bubble">${d}</span><span class="bubble">${d}</span><span class="bubble">${d}</span><span class="bubble">${d}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  /**
   * Compatibility alias for renderOMRSheet
   */
  renderOmrSheet(examData, variantCode) {
    return this.renderOMRSheet(examData, variantCode);
  },

  /**
   * 3. TỜ ĐÁP ÁN & HƯỚNG DẪN CHẤM (TỰ ĐỘNG KHỚP THEO MÃ ĐỀ)
   */
  renderAnswerKey(variantCode) {
    const vCode = String(variantCode || this.currentVariant || '101');
    const exam = this.generateVariant(this.currentExam, vCode);
    if (!exam) return '<div class="print-page key-page"><p>Không có dữ liệu đề thi.</p></div>';

    const mcq = exam.questions.filter(q => q.type === 'mcq' || q.format === 'multiple_choice' || (!q.type && !q.format && q.options));
    const tf = exam.questions.filter(q => q.type === 'tf-group' || q.format === 'true_false_group' || q.statements);
    const sa = exam.questions.filter(q => q.type === 'short_answer' || q.format === 'short_answer');
    const letters = ['A', 'B', 'C', 'D'];

    return `
      <div class="print-page key-page">
        <div class="key-header">
          <h2>HƯỚNG DẪN CHẤM & ĐÁP ÁN ĐỀ THI: ${(exam.title || exam.subject || '').toUpperCase()}</h2>
          <p>Mã đề: ${vCode} • Chuẩn biểu điểm Quyết định 764/QĐ-BGDĐT</p>
        </div>

        <div class="key-section-title">PHẦN I: ĐÁP ÁN TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN (0.25đ / câu)</div>
        <div class="key-matrix-table">
          <table>
            <thead>
              <tr>
                ${Array.from({ length: Math.min(10, Math.max(1, mcq.length)) }).map((_, i) => `<th>Câu</th><th>Đ/A</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${Array.from({ length: Math.max(1, Math.ceil(mcq.length / 10)) }).map((_, rIdx) => `
                <tr>
                  ${mcq.slice(rIdx * 10, rIdx * 10 + 10).map((q, i) => {
                    const qNum = rIdx * 10 + i + 1;
                    const ansVal = (q.correctAnswer !== undefined) ? q.correctAnswer : (q.correct !== undefined ? q.correct : 0);
                    const ansLetter = typeof ansVal === 'number' ? (letters[ansVal] || 'A') : String(ansVal).toUpperCase();
                    return `<td><strong>${qNum}</strong></td><td class="key-ans">${ansLetter}</td>`;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        ${tf.length > 0 ? `
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
        ` : ''}

        ${sa.length > 0 ? `
          <div class="key-section-title" style="margin-top: 20px;">PHẦN III: ĐÁP ÁN TRẮC NGHIỆM TRẢ LỜI NGẮN (0.25đ / 0.5đ mỗi câu)</div>
          <div class="sa-key-table-box">
            <table class="sa-key-table">
              <thead>
                <tr>
                  <th style="width: 80px; text-align: center;">Câu</th>
                  <th>Nội dung câu hỏi tóm tắt</th>
                  <th style="width: 140px; text-align: center;">Đáp án chuẩn</th>
                </tr>
              </thead>
              <tbody>
                ${sa.map((q, idx) => `
                  <tr>
                    <td style="text-align: center;"><strong>Câu ${idx + 1}</strong></td>
                    <td>${this.escapeHtml(q.question)}</td>
                    <td class="sa-ans-value" style="text-align: center; font-weight: bold; font-size: 1.05rem;">
                      ${this.escapeHtml(q.correctAnswer || q.answer || '')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;
  },

  printNow() {
    if (typeof window !== 'undefined' && window.print) {
      window.print();
    }
  },

  close() {
    if (typeof document !== 'undefined') {
      const modal = document.getElementById('printable-exam-modal');
      if (modal) modal.classList.remove('open');
    }
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
