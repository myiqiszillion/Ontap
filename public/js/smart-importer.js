/**
 * NTMK Smart Question Importer & Live WYSIWYG Editor
 * Bộ công cụ bóc tách đề thi thông minh từ văn bản/Word dành cho Giáo viên
 */

const SmartImporter = {
  SAMPLE_TEXT: `PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.
Thí sinh trả lời từ câu 1 đến câu 4. Mỗi câu hỏi thí sinh chỉ chọn một phương án.

Câu 1: Mục tiêu chung của các cuộc cách mạng tư sản thời cận đại là
*A. lật đổ chế độ phong kiến, mở đường cho chủ nghĩa tư bản phát triển.
B. bảo vệ nguyên vẹn chế độ quân chủ chuyên chế thời kỳ phong kiến.
C. xây dựng nhà nước chuyên chính vô sản của giai cấp công nhân.
D. thiết lập ách cai trị của chủ nghĩa thực dân lên toàn thế giới.

Câu 2: Động lực quan trọng quyết định thắng lợi của cách mạng tư sản là
A. quý tộc phong kiến bảo thủ.
*B. quần chúng nhân dân (nông dân, bình dân thành thị).
C. vua chúa và tăng lữ giáo hội.
D. chính quyền phong kiến chuyên chế.

PHẦN II. Câu trắc nghiệm đúng sai.
Thí sinh trả lời câu 1. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.

Câu 1: Đọc đoạn tư liệu sau đây:
"Tất cả mọi người sinh ra đều có quyền bình đẳng. Tạo hóa đã ban cho họ những quyền bất khả xâm phạm; trong đó có quyền được sống, quyền tự do và quyền mưu cầu hạnh phúc."
(Trích Tuyên ngôn Độc lập Mỹ năm 1776)

a) Đoạn trích trên khẳng định quyền con người và quyền tự do cơ bản. (Đúng)
b) Tuyên ngôn Độc lập Mỹ năm 1776 chịu ảnh hưởng sâu sắc của triết học phong kiến. (Sai)
c) Văn kiện này là cơ sở pháp lý tuyên bố độc lập cho 13 thuộc địa Anh ở Bắc Mỹ. (Đúng)
d) Tuyên ngôn Độc lập Mỹ xóa bỏ hoàn toàn quyền sở hữu tư nhân về tư liệu sản xuất. (Sai)
`,

  /**
   * Bộ Parser thông minh bóc tách đề thi từ văn bản
   */
  parseText(rawText) {
    if (!rawText || !rawText.trim()) return { mcq: [], tf: [], shortAnswer: [] };

    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const mcq = [];
    const tf = [];
    const shortAnswer = [];

    // Tách các phần nếu có (PHẦN I, PHẦN II, PHẦN III)
    let currentPart = 'mcq'; // mặc định mcq
    let i = 0;

    // Kiểm tra xem có bảng đáp án tổng hợp ở cuối đề không (vd: ĐÁP ÁN: 1.A 2.B 3.C...)
    const summaryKeys = this.extractSummaryAnswerKeys(rawText);

    while (i < lines.length) {
      const line = lines[i];
      const upper = line.toUpperCase();

      if (upper.includes('PHẦN II') || upper.includes('PHAN II') || upper.includes('TRẮC NGHIỆM ĐÚNG SAI')) {
        currentPart = 'tf';
        i++;
        continue;
      }
      if (upper.includes('PHẦN III') || upper.includes('PHAN III') || upper.includes('TRẢ LỜI NGẮN')) {
        currentPart = 'sa';
        i++;
        continue;
      }
      if (upper.includes('PHẦN I') || upper.includes('PHAN I') || upper.includes('NHIỀU LỰA CHỌN')) {
        currentPart = 'mcq';
        i++;
        continue;
      }

      // Nhận diện bắt đầu câu hỏi
      const qMatch = line.match(/^(?:Câu|Bài|CÂU|BÀI)\s*(\d+)[\s\.\:\-](.*)/i);
      if (qMatch) {
        const qNum = parseInt(qMatch[1]);
        const qPromptFirstLine = qMatch[2].trim();

        if (currentPart === 'mcq') {
          const parsed = this.parseSingleMcq(lines, i, qNum, qPromptFirstLine, summaryKeys);
          if (parsed.question) {
            mcq.push(parsed.question);
            i = parsed.nextIndex;
            continue;
          }
        } else if (currentPart === 'tf') {
          const parsed = this.parseSingleTf(lines, i, qNum, qPromptFirstLine);
          if (parsed.question) {
            tf.push(parsed.question);
            i = parsed.nextIndex;
            continue;
          }
        }
      }

      i++;
    }

    return { mcq, tf, shortAnswer, total: mcq.length + tf.length + shortAnswer.length };
  },

  /**
   * Bóc tách câu hỏi trắc nghiệm nhiều lựa chọn
   */
  parseSingleMcq(lines, startIndex, qNum, firstPrompt, summaryKeys) {
    let qPromptParts = [firstPrompt];
    let j = startIndex + 1;
    let foundOpts = [];
    let correctIndex = 0;

    // Đọc phần thân câu hỏi đến khi gặp phương án A
    while (j < lines.length) {
      const line = lines[j];
      if (/^(?:Câu|Bài|CÂU|BÀI|PHẦN|BẢNG ĐÁP ÁN|ĐÁP ÁN)/i.test(line)) break;
      if (/^[\*]?[A-D][\.\)]/i.test(line)) break;
      qPromptParts.push(line);
      j++;
    }

    // Ghép các dòng tiếp theo để bóc tách 4 phương án A, B, C, D
    let optBuffer = [];
    while (j < lines.length) {
      const line = lines[j];
      if (/^(?:Câu|Bài|CÂU|BÀI)\s*\d+[\s\.\:\-]/i.test(line)) break;
      if (/^PHẦN/i.test(line)) break;
      if (/^(?:ĐÁP ÁN|BẢNG ĐÁP ÁN)/i.test(line)) break;
      optBuffer.push(line);
      j++;
    }

    // Cách 1: kiểm tra nếu các dòng bắt đầu bằng phương án A, B, C, D
    optBuffer.forEach(line => {
      const lineMatch = line.match(/^(\*?)([A-D])[\.\)]\s*(.*)/i);
      if (lineMatch) {
        const isAst = lineMatch[1] === '*';
        const letter = lineMatch[2].toUpperCase();
        const text = lineMatch[3].trim();
        const idx = letter.charCodeAt(0) - 65;
        foundOpts[idx] = text;
        if (isAst) correctIndex = idx;
      }
    });

    // Cách 2: Nếu chưa tìm thấy ít nhất 2 phương án (ví dụ các phương án nằm cùng một dòng)
    if (foundOpts.filter(Boolean).length < 2) {
      const optText = optBuffer.join(' ');
      const optRegex = /(?:^|\s)(\*?)([A-D])[\.\)]\s*(.*?)(?=(?:\s+\*?[A-D][\.\)]|$))/gi;
      let match;
      while ((match = optRegex.exec(optText)) !== null) {
        const isAsterisk = match[1] === '*';
        const letter = match[2].toUpperCase();
        const text = match[3].trim();
        const idx = letter.charCodeAt(0) - 65;
        foundOpts[idx] = text;
        if (isAsterisk) correctIndex = idx;
      }
    }

    // Nếu không có dấu sao (*), kiểm tra trong bảng đáp án tổng hợp (summaryKeys)
    if (summaryKeys && summaryKeys[qNum] !== undefined) {
      correctIndex = summaryKeys[qNum];
    }

    // Nếu bóc tách được ít nhất 2 phương án
    if (foundOpts.filter(Boolean).length >= 2) {
      const cleanOpts = [
        foundOpts[0] || 'Phương án A',
        foundOpts[1] || 'Phương án B',
        foundOpts[2] || 'Phương án C',
        foundOpts[3] || 'Phương án D'
      ];

      return {
        question: {
          id: `imp_mcq_${qNum}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: 'mcq',
          question: qPromptParts.join(' ').trim(),
          options: cleanOpts,
          correctAnswer: correctIndex,
          correct: correctIndex
        },
        nextIndex: j
      };
    }

    return { question: null, nextIndex: startIndex + 1 };
  },

  /**
   * Bóc tách câu hỏi Đúng/Sai (Phần II)
   */
  parseSingleTf(lines, startIndex, qNum, firstPrompt) {
    let passageParts = [firstPrompt];
    let j = startIndex + 1;
    let statements = [];

    // Đọc phần đoạn tư liệu cho đến khi gặp ý a)
    while (j < lines.length) {
      const line = lines[j];
      if (/^(?:Câu|Bài|PHẦN)/i.test(line)) break;
      if (/^[a-d][\.\)]/i.test(line)) break;
      passageParts.push(line);
      j++;
    }

    // Đọc các ý a), b), c), d)
    while (j < lines.length && statements.length < 4) {
      const line = lines[j];
      if (/^(?:Câu|Bài|CÂU|BÀI)\s*\d+[\s\.\:\-]/i.test(line)) break;
      if (/^PHẦN/i.test(line)) break;

      const stmtMatch = line.match(/^([a-d])[\.\)]\s*(.+)/i);
      if (stmtMatch) {
        const stmtTextRaw = stmtMatch[2].trim();
        // Kiểm tra xem có nhãn (Đúng) hoặc (Sai) ở cuối dòng không
        let isCorrect = true;
        let cleanText = stmtTextRaw;

        if (/\((?:Đúng|Đ|dung|true|T)\)$/i.test(stmtTextRaw)) {
          isCorrect = true;
          cleanText = stmtTextRaw.replace(/\((?:Đúng|Đ|dung|true|T)\)$/i, '').trim();
        } else if (/\((?:Sai|S|sai|false|F)\)$/i.test(stmtTextRaw)) {
          isCorrect = false;
          cleanText = stmtTextRaw.replace(/\((?:Sai|S|sai|false|F)\)$/i, '').trim();
        }

        statements.push({
          statement: cleanText,
          question: cleanText,
          correct: isCorrect
        });
      }
      j++;
    }

    if (statements.length > 0) {
      return {
        question: {
          id: `imp_tf_${qNum}_${Date.now()}`,
          type: 'tf-group',
          passage: passageParts.join(' ').trim(),
          prompt: passageParts.join(' ').trim(),
          statements: statements
        },
        nextIndex: j
      };
    }

    return { question: null, nextIndex: startIndex + 1 };
  },

  /**
   * Bóc tách bảng đáp án ở cuối văn bản (ví dụ: 1.A, 2.B, 3.C hoặc 1-A 2-B)
   */
  extractSummaryAnswerKeys(text) {
    const map = {};
    const keySectionMatch = text.match(/(?:ĐÁP ÁN|BẢNG ĐÁP ÁN|HƯỚNG DẪN CHẤM)[\s\S]*/i);
    const textToSearch = keySectionMatch ? keySectionMatch[0] : text;
    const regex = /(?:^|\s|\b)(\d+)[\s\.\:\-]+([A-D])\b/gi;
    let m;
    while ((m = regex.exec(textToSearch)) !== null) {
      const q = parseInt(m[1]);
      const ans = m[2].toUpperCase().charCodeAt(0) - 65;
      map[q] = ans;
    }
    return map;
  }
};

/**
 * Giao diện tương tác Smart Importer
 */
const SmartImporterView = {
  currentParsed: { mcq: [], tf: [], shortAnswer: [] },
  targetSubject: 'lichsu11',
  topicTitle: 'Đề thi tự nạp của Giáo viên',

  init() {
    this.render();
  },

  render() {
    const container = document.getElementById('screen-importer');
    if (!container) return;

    container.innerHTML = `
      <div class="importer-container">
        <!-- HEADER -->
        <div class="importer-header">
          <div class="header-badge">CÔNG CỤ GIÁO VIÊN & BIÊN TẬP VIÊN</div>
          <h1 class="header-title">
    <span class="title-icon-box">
      <svg class="ui-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
    </span>
    Nhập Đề Thi Thông Minh (Smart Importer)
  </h1>
          <p class="header-desc">
            Dán nội dung đề thi từ Word/Text hoặc kéo thả file. Hệ thống tự động nhận diện câu hỏi trắc nghiệm nhiều phương án và câu Đúng/Sai chuẩn GDPT 2018.
          </p>
        </div>

        <div class="importer-layout-grid">
          <!-- CỘT TRÁI: KHUNG DÁN VĂN BẢN VÀ THIẾT LẬP -->
          <div class="importer-input-col">
            <div class="importer-card">
              <div class="card-title-row">
                <h3 class="card-title">1. Nội dung đề thi văn bản</h3>
                <button class="btn-sample-paste" onclick="SmartImporterView.pasteSample()">
                  <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg> Dán đề mẫu
                </button>
              </div>

              <textarea id="importer-textarea" 
                        class="importer-textarea" 
                        placeholder="Dán toàn bộ nội dung đề thi vào đây...&#10;Hỗ trợ nhận diện câu hỏi (Câu 1: ... A. ... B. ... C. ... D. ...)&#10;Đánh dấu đáp án đúng bằng dấu sao *A. hoặc ghi ở cuối đề."
                        oninput="SmartImporterView.onTextChange()"></textarea>

              <div class="importer-drop-zone" id="importer-drop-zone">
                <span><svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg> Kéo thả file <strong>.txt</strong> hoặc <strong>.docx</strong> vào đây</span>
                <input type="file" id="importer-file-input" accept=".txt,.docx" onchange="SmartImporterView.handleFile(this.files[0])">
              </div>

              <div class="import-meta-config">
                <div class="config-field">
                  <label>Gán vào môn học:</label>
                  <select id="import-target-subject" class="import-select" onchange="SmartImporterView.targetSubject = this.value">
                    <option value="lichsu11" selected>Lịch sử 11</option>
                    <option value="vatli10">Vật lí 10</option>
                    <option value="hoahoc10">Hóa học 10</option>
                    <option value="tienganh10">Tiếng Anh 10</option>
                    <option value="lichsu10">Lịch sử 10</option>
                    <option value="lichsu11">Lịch sử 11</option>
                    <option value="lichsu12">Lịch sử 12</option>
                  </select>
                </div>

                <div class="config-field">
                  <label>Tên bài / chuyên đề:</label>
                  <input type="text" id="import-topic-title" class="import-input" value="Đề ôn tập tự biên soạn" oninput="SmartImporterView.topicTitle = this.value">
                </div>
              </div>

              <button class="btn-parse-trigger" onclick="SmartImporterView.triggerParse()">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Phân tích & Bóc tách câu hỏi
              </button>
            </div>
          </div>

          <!-- CỘT PHẢI: XEM TRƯỚC VÀ CHỈNH SỬA TRỰC TIẾP (LIVE WYSIWYG) -->
          <div class="importer-preview-col">
            <div class="preview-sticky-card">
              <div class="preview-header-row">
                <h3 class="card-title">2. Xem trước & Chỉnh sửa trực tiếp</h3>
                <span class="parsed-stat-badge" id="parsed-stat-badge">
                  Đã nhận diện: ${this.currentParsed.mcq.length} TN • ${this.currentParsed.tf.length} Đ/S
                </span>
              </div>

              <div class="parsed-list-container" id="parsed-list-container">
                ${this.renderParsedQuestions()}
              </div>

              <!-- ACTION BAR -->
              <div class="importer-actions-bar">
                <button class="btn-save-system" 
                        id="btn-save-system"
                        ${(this.currentParsed.mcq.length + this.currentParsed.tf.length === 0) ? 'disabled' : ''}
                        onclick="SmartImporterView.saveToSystem()">
                  <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Lưu vào Ngân Hàng & Luyện Ngay
                </button>
                <button class="btn-export-json" 
                        id="btn-export-json"
                        ${(this.currentParsed.mcq.length + this.currentParsed.tf.length === 0) ? 'disabled' : ''}
                        onclick="SmartImporterView.exportJson()">
                  <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> Xuất File JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  renderParsedQuestions() {
    const { mcq, tf } = this.currentParsed;
    if (mcq.length === 0 && tf.length === 0) {
      return `
        <div class="preview-empty-state">
          <div class="empty-icon"><svg class="ui-icon" viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg></div>
          <h4>Chưa có câu hỏi nào được bóc tách</h4>
          <p>Hãy dán đề thi vào ô bên trái hoặc bấm "Dán đề mẫu" để xem trước sức mạnh của bộ bóc tách thông minh.</p>
        </div>
      `;
    }

    const letters = ['A', 'B', 'C', 'D'];

    let html = '';

    if (mcq.length > 0) {
      html += `<div class="parsed-section-title">PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN (${mcq.length} câu)</div>`;
      html += mcq.map((q, idx) => `
        <div class="parsed-q-card" id="parsed-mcq-${idx}">
          <div class="q-header">
            <span class="q-num">Câu ${idx + 1}</span>
            <button class="btn-del-q" onclick="SmartImporterView.deleteMcq(${idx})" title="Xóa câu này">${(typeof Icons !== 'undefined' && Icons.get) ? Icons.get('x', { size: 14 }) : 'Xóa'}</button>
          </div>
          <div class="q-text-editable" contenteditable="true" onblur="SmartImporterView.updateMcqPrompt(${idx}, this.innerText)">
            ${this.escapeHtml(q.question)}
          </div>
          <div class="parsed-options-grid">
            ${q.options.map((opt, optIdx) => `
              <div class="parsed-opt-pill ${optIdx === Number(q.correctAnswer) ? 'opt-is-correct' : ''}" 
                   onclick="SmartImporterView.setMcqCorrect(${idx}, ${optIdx})"
                   title="Bấm để chọn đây là đáp án đúng">
                <span class="opt-key">${letters[optIdx]}.</span>
                <span class="opt-val">${this.escapeHtml(opt)}</span>
                ${optIdx === Number(q.correctAnswer) ? '<span class="correct-tick">' + ((typeof Icons !== 'undefined' && Icons.get) ? Icons.get('check', { size: 14 }) + ' ' : '') + 'Đúng</span>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    }

    if (tf.length > 0) {
      html += `<div class="parsed-section-title">PHẦN II. TRẮC NGHIỆM ĐÚNG / SAI (${tf.length} câu)</div>`;
      html += tf.map((q, idx) => `
        <div class="parsed-q-card" id="parsed-tf-${idx}">
          <div class="q-header">
            <span class="q-num">Bài Đúng/Sai ${idx + 1}</span>
            <button class="btn-del-q" onclick="SmartImporterView.deleteTf(${idx})" title="Xóa câu này">${(typeof Icons !== 'undefined' && Icons.get) ? Icons.get('x', { size: 14 }) : 'Xóa'}</button>
          </div>
          <div class="q-passage-box" contenteditable="true" onblur="SmartImporterView.updateTfPassage(${idx}, this.innerText)">
            ${this.escapeHtml(q.passage)}
          </div>
          <div class="tf-statements-edit-list">
            ${q.statements.map((stmt, sIdx) => `
              <div class="tf-stmt-edit-row">
                <span class="stmt-key">${String.fromCharCode(97 + sIdx)})</span>
                <span class="stmt-val">${this.escapeHtml(stmt.statement)}</span>
                <div class="tf-toggle-btns">
                  <button class="btn-tf-pick ${stmt.correct ? 'active-dung' : ''}" 
                          onclick="SmartImporterView.setTfStatementCorrect(${idx}, ${sIdx}, true)">
                    Đúng
                  </button>
                  <button class="btn-tf-pick ${!stmt.correct ? 'active-sai' : ''}" 
                          onclick="SmartImporterView.setTfStatementCorrect(${idx}, ${sIdx}, false)">
                    Sai
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    }

    return html;
  },

  pasteSample() {
    const area = document.getElementById('importer-textarea');
    if (area) {
      area.value = SmartImporter.SAMPLE_TEXT;
      this.triggerParse();
    }
  },

  onTextChange() {
    // Có thể tự động parse sau 800ms debounce nếu muốn
  },

  triggerParse() {
    const area = document.getElementById('importer-textarea');
    if (!area) return;
    const text = area.value;
    this.currentParsed = SmartImporter.parseText(text);
    this.updatePreview();
    if (window.SoundFX) SoundFX.playClick();
  },

  updatePreview() {
    const listEl = document.getElementById('parsed-list-container');
    if (listEl) listEl.innerHTML = this.renderParsedQuestions();

    const badge = document.getElementById('parsed-stat-badge');
    if (badge) {
      badge.textContent = `Đã nhận diện: ${this.currentParsed.mcq.length} TN • ${this.currentParsed.tf.length} Đ/S`;
    }

    const saveBtn = document.getElementById('btn-save-system');
    const expBtn = document.getElementById('btn-export-json');
    const hasItems = (this.currentParsed.mcq.length + this.currentParsed.tf.length) > 0;
    if (saveBtn) saveBtn.disabled = !hasItems;
    if (expBtn) expBtn.disabled = !hasItems;
  },

  setMcqCorrect(qIdx, optIdx) {
    if (this.currentParsed.mcq[qIdx]) {
      this.currentParsed.mcq[qIdx].correctAnswer = optIdx;
      this.currentParsed.mcq[qIdx].correct = optIdx;
      this.updatePreview();
      if (window.SoundFX) SoundFX.playClick();
    }
  },

  setTfStatementCorrect(qIdx, sIdx, val) {
    if (this.currentParsed.tf[qIdx] && this.currentParsed.tf[qIdx].statements[sIdx]) {
      this.currentParsed.tf[qIdx].statements[sIdx].correct = val;
      this.updatePreview();
      if (window.SoundFX) SoundFX.playClick();
    }
  },

  updateMcqPrompt(idx, text) {
    if (this.currentParsed.mcq[idx]) this.currentParsed.mcq[idx].question = text.trim();
  },

  updateTfPassage(idx, text) {
    if (this.currentParsed.tf[idx]) {
      this.currentParsed.tf[idx].passage = text.trim();
      this.currentParsed.tf[idx].prompt = text.trim();
    }
  },

  deleteMcq(idx) {
    this.currentParsed.mcq.splice(idx, 1);
    this.updatePreview();
  },

  deleteTf(idx) {
    this.currentParsed.tf.splice(idx, 1);
    this.updatePreview();
  },

  handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const area = document.getElementById('importer-textarea');
      if (area) {
        area.value = text;
        this.triggerParse();
      }
    };
    reader.readAsText(file);
  },

  saveToSystem() {
    const questions = [...this.currentParsed.mcq, ...this.currentParsed.tf];
    if (questions.length === 0) {
      alert('Chưa có câu hỏi nào để lưu.');
      return;
    }

    const payload = {
      id: `custom_quiz_${Date.now()}`,
      subject: this.targetSubject,
      title: this.topicTitle || 'Đề thi tự nạp',
      questions: questions,
      duration: 50,
      createdAt: new Date().toISOString()
    };

    // Lưu vào kho đề thi tự tạo của học sinh/giáo viên
    try {
      const existing = JSON.parse(localStorage.getItem('ntmk_custom_quizzes_v1')) || [];
      existing.unshift(payload);
      localStorage.setItem('ntmk_custom_quizzes_v1', JSON.stringify(existing));

      if (window.SoundFX) SoundFX.playVictory();
      alert(`Đã lưu thành công ${questions.length} câu hỏi vào hệ thống! Bạn có thể luyện tập đề này ngay.`);

      // Chuyển hướng sang phòng thi ngay nếu muốn
      if (typeof app !== 'undefined' && app.navigateTo) {
        app.currentSubject = this.targetSubject;
        app.navigateTo('quiz');
        if (typeof Quiz !== 'undefined') {
          Quiz.init(payload);
        }
      }
    } catch (e) {
      console.error('Lỗi khi lưu đề:', e);
      alert('Không thể lưu vào localStorage (có thể vượt quá dung lượng).');
    }
  },

  exportJson() {
    const questions = [...this.currentParsed.mcq, ...this.currentParsed.tf];
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      title: this.topicTitle,
      subject: this.targetSubject,
      totalQuestions: questions.length,
      questions: questions
    }, null, 2));

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ntmk_exam_${this.targetSubject}_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
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
  SmartImporter.SmartImporter = SmartImporter;
  SmartImporter.SmartImporterView = SmartImporterView;
  module.exports = SmartImporter;
}
