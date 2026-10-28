const Admin = {
  supabase: null,
  selectedFiles: [], // Array to hold File objects
  currentParsedExam: null,
  currentExamPackage: null,
  currentView: 'raw', // 'raw', '101', '102', '103', '104', 'matrix'

  async init() {
    const annForm = document.getElementById('announcement-form');
    if (annForm) {
      const label = document.createElement('label');
      label.textContent = 'Khóa quản trị ';
      const key = document.createElement('input');
      key.type = 'password';
      key.id = 'announcement-admin-key';
      key.autocomplete = 'off';
      label.append(key);
      annForm.prepend(label);
    }
    this.setupEventListeners();
    this.loadAnnouncements();
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Lucide SVG icons (Zero raw emojis strictly adhered to)
    const icon = type === 'success' 
      ? `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
      : `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  switchTab(tabName) {
    const crawlerBtn = document.getElementById('tab-crawler-btn');
    const annBtn = document.getElementById('tab-announcements-btn');
    const crawlerPanel = document.getElementById('crawler-panel');
    const annPanel = document.getElementById('announcements-panel');

    if (tabName === 'crawler') {
      crawlerBtn?.classList.add('active');
      annBtn?.classList.remove('active');
      crawlerPanel?.classList.add('active');
      annPanel?.classList.remove('active');
    } else {
      crawlerBtn?.classList.remove('active');
      annBtn?.classList.add('active');
      crawlerPanel?.classList.remove('active');
      annPanel?.classList.add('active');
    }
  },

  selectCrawlerSource(sourceId) {
    const cards = document.querySelectorAll('.crawler-source-card');
    cards.forEach(card => {
      if (card.dataset.source === sourceId) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    const urlInput = document.getElementById('crawler-url');
    const subSelect = document.getElementById('crawler-subject');
    const gradeSelect = document.getElementById('crawler-grade');

    if (sourceId === 'toanmath') {
      if (urlInput) urlInput.value = 'https://toanmath.com/de-thi-thu-tot-nghiep-thpt-2025-mon-toan-so-gd-dt-binh-duong.html';
      if (subSelect) subSelect.value = 'toan';
      if (gradeSelect) gradeSelect.value = '12';
    } else if (sourceId === 'thuvienhoclieu') {
      if (urlInput) urlInput.value = 'https://thuvienhoclieu.com/de-kiem-tra-dinh-ky-vat-li-11-chuong-trinh-moi.html';
      if (subSelect) subSelect.value = 'vatli';
      if (gradeSelect) gradeSelect.value = '11';
    } else if (sourceId === 'vietjack') {
      if (urlInput) urlInput.value = 'https://vietjack.com/de-thi-thpt-quoc-gia-mon-hoa-hoc-2025-cau-truc-moi.jsp';
      if (subSelect) subSelect.value = 'hoahoc';
      if (gradeSelect) gradeSelect.value = '12';
    } else {
      if (urlInput) urlInput.value = '';
    }
  },

  async loadPresetSampleToTextarea() {
    const sub = document.getElementById('crawler-subject')?.value || 'lichsu';
    const grade = document.getElementById('crawler-grade')?.value || '12';
    const textArea = document.getElementById('crawler-raw-text');

    try {
      const res = await fetch('/api/v2/crawler/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 'toanmath', subjectId: sub, grade })
      });
      const data = await res.json();
      if (data.rawText && textArea) {
        textArea.value = data.rawText;
        this.showToast(`Đã nạp đề mẫu chuẩn Bộ GD&ĐT (${sub.toUpperCase()} ${grade})`, 'success');
      }
    } catch (e) {
      this.showToast('Không thể nạp đề mẫu: ' + e.message, 'error');
    }
  },

  async handleCrawlAndParse() {
    const crawlBtn = document.getElementById('btn-crawl-parse');
    const sub = document.getElementById('crawler-subject')?.value || 'lichsu';
    const grade = document.getElementById('crawler-grade')?.value || '12';
    const url = document.getElementById('crawler-url')?.value?.trim();
    const rawText = document.getElementById('crawler-raw-text')?.value?.trim();

    if (crawlBtn) {
      crawlBtn.disabled = true;
      crawlBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span>Đang xử lý...</span>`;
    }

    try {
      let textToParse = rawText;

      // If raw text not directly entered, crawl from URL or sample source
      if (!textToParse) {
        const selectedCard = document.querySelector('.crawler-source-card.selected');
        const sourceId = selectedCard?.dataset.source || 'custom';

        const crawlRes = await fetch('/api/v2/crawler/crawl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId, url, subjectId: sub, grade })
        });
        const crawlData = await crawlRes.json();
        if (!crawlRes.ok || !crawlData.success) {
          throw new Error(crawlData.error || 'Thu thập thất bại');
        }
        textToParse = crawlData.rawText;
        const textArea = document.getElementById('crawler-raw-text');
        if (textArea) textArea.value = textToParse;
      }

      // Parse full exam
      const parseRes = await fetch('/api/v2/crawler/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: textToParse, subjectId: sub, grade })
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok || !parseData.success) {
        throw new Error(parseData.error || 'Phân tích đề thi thất bại');
      }

      this.currentParsedExam = parseData.exam;
      this.currentExamPackage = null;
      this.currentView = 'raw';

      this.renderResultsCard(parseData.exam);
      this.showToast(`Phân tích thành công ${parseData.exam.questions.length} câu hỏi chuẩn QĐ 764!`, 'success');
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    } finally {
      if (crawlBtn) {
        crawlBtn.disabled = false;
        crawlBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span>Thu Thập & Phân Tích Đề</span>`;
      }
    }
  },

  async handleAutoMakeVariants() {
    if (!this.currentParsedExam) {
      await this.handleCrawlAndParse();
      if (!this.currentParsedExam) return;
    }

    const varBtn = document.getElementById('btn-auto-make-variants');
    if (varBtn) {
      varBtn.disabled = true;
      varBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> <span>Đang sinh 4 mã đề...</span>`;
    }

    try {
      const res = await fetch('/api/v2/crawler/auto-make-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: document.getElementById('crawler-raw-text')?.value,
          subjectId: this.currentParsedExam.metadata.subjectId,
          grade: this.currentParsedExam.metadata.grade,
          school: 'TRƯỜNG THPT NGUYỄN THỊ MINH KHAI',
          authority: 'SỞ GIÁO DỤC VÀ ĐÀO TẠO BÌNH DƯƠNG'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể tự động sinh mã đề');
      }

      this.currentExamPackage = data.examPackage;

      // Reveal variant tabs
      ['101', '102', '103', '104', 'matrix'].forEach(k => {
        const btn = document.getElementById(`vbtn-${k}`);
        if (btn) btn.style.display = 'inline-block';
      });

      this.selectVariantView('101');
      this.showToast('Đã sinh thành công 4 mã đề (101, 102, 103, 104) kèm ma trận đáp án!', 'success');
    } catch (err) {
      this.showToast('Lỗi sinh mã đề: ' + err.message, 'error');
    } finally {
      if (varBtn) {
        varBtn.disabled = false;
        varBtn.innerHTML = `<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg> <span>Tự Động Sinh 4 Mã Đề (101 - 104)</span>`;
      }
    }
  },

  selectVariantView(viewName) {
    this.currentView = viewName;
    const navButtons = document.querySelectorAll('.crawler-vtab-btn');
    navButtons.forEach(b => b.classList.remove('active'));

    const activeBtn = viewName === 'raw'
      ? document.querySelector('.crawler-vtab-btn:first-child')
      : document.getElementById(`vbtn-${viewName}`);
    activeBtn?.classList.add('active');

    const area = document.getElementById('preview-content-area');
    if (!area) return;

    if (viewName === 'raw') {
      this.renderQuestions(this.currentParsedExam?.questions || []);
    } else if (viewName === 'matrix') {
      this.renderMatrix(this.currentExamPackage?.answerMatrices);
    } else {
      const variant = this.currentExamPackage?.variants?.[viewName];
      if (variant) {
        const flattened = [
          ...variant.sections[0].questions,
          ...variant.sections[1].questions,
          ...variant.sections[2].questions
        ];
        this.renderQuestions(flattened, viewName);
      }
    }
  },

  renderResultsCard(exam) {
    const card = document.getElementById('crawler-results-card');
    if (!card) return;
    card.style.display = 'block';

    const schoolEl = document.getElementById('preview-meta-school');
    const titleEl = document.getElementById('preview-meta-title');
    const chipsEl = document.getElementById('preview-stats-chips');

    if (schoolEl) schoolEl.textContent = exam.metadata.school || 'SỞ GD&ĐT BÌNH DƯƠNG — TRƯỜNG THPT NGUYỄN THỊ MINH KHAI';
    if (titleEl) titleEl.textContent = `${exam.metadata.title} (Thời gian: ${exam.metadata.durationMinutes} phút)`;

    if (chipsEl) {
      chipsEl.innerHTML = `
        <span class="crawler-chip">Tổng: <strong>${exam.statistics.totalQuestions} câu</strong></span>
        <span class="crawler-chip">Phần I (MCQ): <strong>${exam.statistics.part1Count} câu</strong></span>
        <span class="crawler-chip">Phần II (Đúng/Sai): <strong>${exam.statistics.part2Count} câu</strong></span>
        <span class="crawler-chip">Phần III (Trả lời ngắn): <strong>${exam.statistics.part3Count} câu</strong></span>
        <span class="crawler-chip crawler-chip-highlight">Độ khớp đáp án: <strong>${exam.statistics.hasAnswersCount}/${exam.statistics.totalQuestions}</strong></span>
      `;
    }

    this.renderQuestions(exam.questions);
  },

  renderQuestions(questions, variantCode = null) {
    const area = document.getElementById('preview-content-area');
    if (!area) return;

    if (!questions || questions.length === 0) {
      area.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Chưa có câu hỏi nào để hiển thị.</p>';
      return;
    }

    const htmlParts = questions.map(q => {
      const qNum = q.questionNumber || q.id;
      let bodyHtml = '';

      // Part I: MCQ
      if (q.format === 'multiple_choice' || q.format === 'mcq') {
        const opts = q.mcqPayload?.options || [];
        const correctIdx = q.mcqPayload?.correctOptionIndex;
        bodyHtml = `
          <div class="crawler-opt-grid">
            ${opts.map((opt, oIdx) => {
              const letter = 'ABCD'[oIdx];
              const isCorrect = correctIdx === oIdx;
              return `<div class="crawler-opt-box ${isCorrect ? 'is-correct' : ''}"><strong>${letter}.</strong> ${this.escapeHtml(opt)}</div>`;
            }).join('')}
          </div>
        `;
      }
      // Part II: True / False
      else if (q.format === 'true_false_group') {
        const stmts = q.tfPayload?.statements || [];
        bodyHtml = `
          <div style="display:flex; flex-direction:column; gap:4px; margin-bottom: 8px;">
            ${stmts.map((s, sIdx) => {
              const letter = 'abcd'[sIdx];
              const isTrue = s.correct === true;
              const badgeClass = isTrue ? 'crawler-tf-true' : 'crawler-tf-false';
              const badgeText = isTrue ? 'Đúng' : (s.correct === false ? 'Sai' : 'Chưa xác định');
              return `
                <div class="crawler-tf-stmt-row">
                  <span><strong>${letter})</strong> ${this.escapeHtml(s.statement)}</span>
                  <span class="crawler-tf-badge ${badgeClass}">${badgeText}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
      // Part III: Short Answer
      else if (q.format === 'short_answer') {
        const ans = q.shortAnswerPayload?.correctAnswers?.[0] || 'Chưa có đáp án';
        bodyHtml = `
          <div style="margin-bottom: 8px;">
            <div class="crawler-sa-box">
              <span>Đáp án chính xác:</span>
              <strong style="color: #38bdf8; font-size: 1.05rem;">${this.escapeHtml(ans)}</strong>
            </div>
          </div>
        `;
      }

      const solutionHtml = q.explanation
        ? `<div class="crawler-solution-box"><strong>Hướng dẫn giải:</strong> ${this.escapeHtml(q.explanation)}</div>`
        : '';

      return `
        <div class="crawler-q-card">
          <div class="crawler-q-num">Câu ${qNum} ${variantCode ? `(Mã đề ${variantCode})` : ''} [${q.sectionId || 'PHẦN'}]</div>
          <div class="crawler-q-prompt">${this.escapeHtml(q.prompt)}</div>
          ${bodyHtml}
          ${solutionHtml}
        </div>
      `;
    });

    area.innerHTML = htmlParts.join('');

    // Trigger math rendering if window.renderMathInElement exists
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(area, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      } catch (e) {
        // ignore math rendering error
      }
    }
  },

  renderMatrix(matrices) {
    const area = document.getElementById('preview-content-area');
    if (!area || !matrices) return;

    const codes = Object.keys(matrices);
    const m101 = matrices['101'] || matrices[codes[0]];
    if (!m101) return;

    let p1Rows = '';
    m101.part1.forEach((item, idx) => {
      const qNum = item.questionNumber;
      const cells = codes.map(c => `<td><strong>${matrices[c]?.part1?.[idx]?.answer || '?'}</strong></td>`).join('');
      p1Rows += `<tr><td>Phần I - Câu ${qNum}</td>${cells}</tr>`;
    });

    let p2Rows = '';
    m101.part2.forEach((item, idx) => {
      const qNum = item.questionNumber;
      const cells = codes.map(c => {
        const map = matrices[c]?.part2?.[idx]?.answers || {};
        return `<td>${map.a || '?'}-${map.b || '?'}-${map.c || '?'}-${map.d || '?'}</td>`;
      }).join('');
      p2Rows += `<tr><td>Phần II - Câu ${qNum}</td>${cells}</tr>`;
    });

    let p3Rows = '';
    m101.part3.forEach((item, idx) => {
      const qNum = item.questionNumber;
      const cells = codes.map(c => `<td><strong>${matrices[c]?.part3?.[idx]?.answer || '?'}</strong></td>`).join('');
      p3Rows += `<tr><td>Phần III - Câu ${qNum}</td>${cells}</tr>`;
    });

    area.innerHTML = `
      <div style="background: rgba(15, 23, 42, 0.4); padding: 16px; border-radius: 12px;">
        <h4 style="color: #fff; margin-bottom: 8px;">Ma Trận Đáp Án 4 Mã Đề (QĐ 764/QĐ-BGDĐT)</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">Dùng để đối chiếu chấm bài tự động hoặc cấu hình máy quét phiếu OMR.</p>
        <table class="crawler-matrix-table">
          <thead>
            <tr>
              <th>Câu hỏi / Phần</th>
              ${codes.map(c => `<th>Mã Đề ${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${p1Rows}
            ${p2Rows}
            ${p3Rows}
          </tbody>
        </table>
      </div>
    `;
  },

  async handleSaveToBank() {
    if (!this.currentParsedExam || !this.currentParsedExam.questions.length) {
      this.showToast('Vui lòng phân tích đề trước khi lưu vào ngân hàng', 'error');
      return;
    }

    try {
      const sub = this.currentParsedExam.metadata.subjectId;
      const grade = this.currentParsedExam.metadata.grade;
      const title = this.currentParsedExam.metadata.title;

      const res = await fetch('/api/v2/crawler/save-to-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: this.currentParsedExam.questions,
          subjectId: sub,
          grade,
          lessonTitle: title
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lưu thất bại');
      }

      this.showToast(data.message || 'Đã lưu vào ngân hàng câu hỏi thành công!', 'success');
    } catch (e) {
      this.showToast('Lỗi khi lưu: ' + e.message, 'error');
    }
  },

  handleOpenPrintableStudio() {
    if (!this.currentParsedExam) {
      this.showToast('Vui lòng phân tích đề trước khi mở Studio In Đề', 'error');
      return;
    }

    // Cache to localStorage for PrintableExamStudio
    try {
      const payload = {
        metadata: this.currentParsedExam.metadata,
        package: this.currentExamPackage || null,
        questions: this.currentParsedExam.questions
      };
      localStorage.setItem('ntmk_printable_exam_payload', JSON.stringify(payload));
      this.showToast('Đang chuyển hướng sang Studio In Đề & Phiếu OMR...', 'success');
      setTimeout(() => {
        window.location.href = '/#printable-exam';
      }, 500);
    } catch (e) {
      this.showToast('Không thể lưu bộ nhớ đệm: ' + e.message, 'error');
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  setupEventListeners() {
    const form = document.getElementById('announcement-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    const imageInput = document.getElementById('image');
    const dropZone = document.getElementById('drop-zone');

    if (imageInput && dropZone) {
      dropZone.addEventListener('click', () => imageInput.click());

      imageInput.addEventListener('change', (e) => {
        this.addFiles(e.target.files);
        imageInput.value = '';
      });

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        this.addFiles(e.dataTransfer.files);
      });

      document.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        const pastedFiles = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            pastedFiles.push(items[i].getAsFile());
          }
        }
        if (pastedFiles.length > 0) this.addFiles(pastedFiles);
      });
    }
  },

  addFiles(files) {
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('image/')) {
        this.selectedFiles.push(files[i]);
      }
    }
    this.renderPreviews();
  },

  removeFile(index) {
    this.selectedFiles.splice(index, 1);
    this.renderPreviews();
  },

  renderPreviews() {
    const previewContainer = document.getElementById('image-preview');
    const dropZone = document.getElementById('drop-zone');
    if (!previewContainer || !dropZone) return;

    previewContainer.innerHTML = '';

    if (this.selectedFiles.length === 0) {
      previewContainer.style.display = 'none';
      dropZone.style.display = 'block';
      return;
    }

    previewContainer.style.display = 'grid';
    dropZone.style.display = 'none';

    this.selectedFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'admin-preview-item';
      
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'remove-image-btn';
      removeBtn.innerHTML = '×';
      removeBtn.onclick = (e) => {
        e.stopPropagation();
        this.removeFile(index);
      };

      item.appendChild(img);
      item.appendChild(removeBtn);
      previewContainer.appendChild(item);
    });
  },

  async handleSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const title = document.getElementById('title')?.value;
    const content = document.getElementById('content')?.value;
    const link = document.getElementById('link')?.value;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'Đang xử lý...';
    }

    try {
      let image_url = null;
      let uploadedUrls = [];

      if (this.selectedFiles.length > 0 && !this.supabase) throw new Error('Tải ảnh cần cấu hình backend có xác thực');
      if (this.selectedFiles.length > 0 && this.supabase) {
        if (submitBtn) submitBtn.innerText = `Đang tải lên ${this.selectedFiles.length} ảnh...`;
        
        const uploadPromises = this.selectedFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop() || 'png';
          const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
          const filePath = `uploads/${fileName}`;

          const { error: uploadError } = await this.supabase.storage
            .from('announcements')
            .upload(filePath, file);

          if (uploadError) throw new Error('Lỗi tải ảnh: ' + uploadError.message);

          const { data: { publicUrl } } = this.supabase.storage
            .from('announcements')
            .getPublicUrl(filePath);
          
          return publicUrl;
        });

        uploadedUrls = await Promise.all(uploadPromises);
        image_url = JSON.stringify(uploadedUrls);
      }

      if (submitBtn) submitBtn.innerText = 'Đang đăng...';
      const adminKey = document.getElementById('announcement-admin-key')?.value || '';
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
        body: JSON.stringify({ title, content, link, image_url })
      });

      if (!res.ok) throw new Error('Đăng bài thất bại');

      this.showToast('Đã đăng thông báo thành công!', 'success');
      e.target.reset();
      
      this.selectedFiles = [];
      this.renderPreviews();
      
      this.loadAnnouncements();
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'Đang Lên Website';
      }
    }
  },

  async loadAnnouncements() {
    const list = document.getElementById('announcements-list');
    if (!list) return;
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('Không thể tải danh sách');
      const data = await res.json();

      if (data.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Chưa có thông báo nào.</p>';
        return;
      }

      list.innerHTML = data.map(ann => {
        const date = new Date(ann.timestamp).toLocaleString('vi-VN');
        const isPinned = ann.pinned === true;
        const pinClass = isPinned ? ' pinned' : '';
        const pinIcon = isPinned
          ? `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>`
          : `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>`;
        const pinLabel = isPinned ? 'Bỏ ghim' : 'Ghim';
        return `
          <div class="admin-ann-item${pinClass}" id="ann-${ann.id}">
            <div class="admin-ann-info">
              <div class="admin-ann-header">
                <img src="assets/avatar.jpg" alt="Admin Avatar" class="admin-ann-avatar">
                <div class="admin-ann-title">${isPinned ? '<span class="pinned-tag" aria-label="Đã ghim">' + pinIcon + ' </span>' : ''}${ann.title}</div>
              </div>
              <div class="admin-ann-time">${date}</div>
            </div>
            <div class="admin-ann-actions">
              <button class="pin-btn${pinClass}" onclick="Admin.togglePin('${ann.id}', ${!isPinned})">
                ${pinIcon}
                ${pinLabel}
              </button>
              <button class="delete-btn" onclick="Admin.deleteAnnouncement('${ann.id}')">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Xóa
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = `<p style="color: var(--red, #ef4444); text-align: center;">Lỗi: ${err.message}</p>`;
    }
  },

  async deleteAnnouncement(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;

    try {
      const adminKey = document.getElementById('announcement-admin-key')?.value || '';
      const res = await fetch(`/api/delete-announcement?id=${id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': adminKey }
      });

      if (!res.ok) throw new Error('Thao tác không được phép hoặc thất bại');
      this.showToast('Đã xóa thông báo!', 'success');
      
      document.getElementById(`ann-${id}`)?.remove();
      if (document.getElementById('announcements-list')?.children.length === 0) {
        this.loadAnnouncements();
      }
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  async togglePin(id, pinned) {
    try {
      const res = await fetch(`/api/pin-announcement?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned })
      });

      if (!res.ok) throw new Error('Thao tác thất bại');

      this.showToast(pinned ? 'Đã ghim thông báo!' : 'Đã bỏ ghim thông báo.', 'success');
      this.loadAnnouncements();
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    }
  }
};

window.Admin = Admin;
document.addEventListener('DOMContentLoaded', () => Admin.init());
