/**
 * NTMK Command Palette & Quick Search Controller (Ctrl+K / ⌘K)
 * Lightning-fast universal navigation, subject search, and quick system actions
 */

const CommandPalette = {
  isOpen: false,
  query: '',
  selectedIndex: 0,
  currentFiltered: [],

  ITEMS: [
    // ═══════════════════════════════════════════════════════════
    // 1. CÔNG CỤ & TÍNH NĂNG CHÍNH
    // ═══════════════════════════════════════════════════════════
    {
      id: 'cmd_custom_exam',
      category: 'Công cụ ôn luyện',
      title: 'Tự tạo đề thi theo yêu cầu',
      icon: 'target',
      desc: 'Tùy biến câu hỏi MCQ & Đúng/Sai, ma trận 15p, 45p, 50p',
      keywords: ['tu tao de', 'custom exam', 'tao de', 'kiem tra', 'sinh de', 'de thi'],
      action: () => app.navigateTo('custom-exam')
    },
    {
      id: 'cmd_checker',
      category: 'Công cụ ôn luyện',
      title: 'Dò trắc nghiệm & So khớp đáp án',
      icon: 'search',
      desc: 'Bảng đáp án trực quan, tra cứu lời giải nhanh theo mã đề',
      keywords: ['do dap an', 'checker', 'so dap an', 'tra dap an', 'giai'],
      action: () => app.navigateTo('checker')
    },
    {
      id: 'cmd_mistakes',
      category: 'Công cụ ôn luyện',
      title: 'Sổ tay câu sai & Phục hồi kiến thức',
      icon: 'book',
      desc: 'Xem lại các câu làm sai, giải thích chi tiết và luyện tập lại',
      keywords: ['so tay cau sai', 'cau sai', 'mistakes', 'sai', 'on lai'],
      action: () => app.navigateTo('mistakes')
    },
    {
      id: 'cmd_importer',
      category: 'Công cụ ôn luyện',
      title: 'Nhập đề thi thông minh (Smart Importer)',
      icon: 'inbox',
      desc: 'Dán Word/Text hoặc kéo thả file, tự nhận diện câu hỏi & sửa trực tiếp',
      keywords: ['nhap de', 'importer', 'smart importer', 'word', 'file', 'giao vien'],
      action: () => app.navigateTo('importer')
    },
    {
      id: 'cmd_planner',
      category: 'Học tập & Kế hoạch',
      title: 'Kế hoạch học tập cá nhân hóa',
      icon: 'calendar',
      desc: 'Lịch ôn tập thông minh, nhiệm vụ hàng ngày và mục tiêu điểm',
      keywords: ['ke hoach', 'planner', 'lich hoc', 'muc tieu', 'spaced repetition'],
      action: () => app.navigateTo('planner')
    },
    {
      id: 'cmd_diagnostic',
      category: 'Học tập & Kế hoạch',
      title: 'Chẩn đoán năng lực học tập',
      icon: 'activity',
      desc: 'Kiểm tra điểm mạnh, điểm yếu và mức độ thông hiểu các chương',
      keywords: ['chan doan', 'diagnostic', 'nang luc', 'danh gia'],
      action: () => app.navigateTo('diagnostic')
    },
    {
      id: 'cmd_announcements',
      category: 'Học tập & Kế hoạch',
      title: 'Bảng tin & Thông báo cộng đồng',
      icon: 'bell',
      desc: 'Cập nhật lịch thi, đề cương ôn tập và tin tức từ nhà trường',
      keywords: ['bang tin', 'thong bao', 'tin tuc', 'announcements'],
      action: () => app.navigateTo('announcements')
    },

    // ═══════════════════════════════════════════════════════════
    // 2. MÔN HỌC & NGÂN HÀNG CÂU HỎI
    // ═══════════════════════════════════════════════════════════
    {
      id: 'sub_lichsu12',
      category: 'Môn học (GDPT 2018)',
      title: 'Lịch sử 12 (Luyện thi Tốt nghiệp)',
      icon: 'scroll',
      desc: 'Trọn bộ 9 chuyên đề: Trật tự 2 cực Ianta, ASEAN, CMT8, Kháng chiến, Đổi mới',
      keywords: ['lich su 12', 'su 12', 'tot nghiep', 'ianta', 'asean', 'dien bien phu'],
      action: () => app.selectSubject('lichsu12')
    },
    {
      id: 'sub_lichsu11',
      category: 'Môn học (GDPT 2018)',
      title: 'Lịch sử 11',
      icon: 'scroll',
      desc: 'Cách mạng tư sản, Chủ nghĩa tư bản, Liên bang Xô Viết và ASEAN',
      keywords: ['lich su 11', 'su 11', 'cach mang tu san'],
      action: () => app.selectSubject('lichsu11')
    },
    {
      id: 'sub_lichsu10',
      category: 'Môn học (GDPT 2018)',
      title: 'Lịch sử 10',
      icon: 'scroll',
      desc: 'Văn minh Văn Lang - Âu Lạc, Chăm-pa, Phù Nam, Đại Việt',
      keywords: ['lich su 10', 'su 10', 'van lang', 'dai viet'],
      action: () => app.selectSubject('lichsu10')
    },
    {
      id: 'sub_lichsu11',
      title: 'Lịch sử 11',
      subtitle: 'Khối 11 • Ôn tập Lịch sử GDPT 2018',
      icon: 'book-open',
      section: 'Môn học',
      keywords: ['lich su 11', 'su 11', 'cach mang tu san', 'chu nghia xa hoi', 'lichsu11'],
      action: () => app.selectSubject('lichsu11')
    },
    {
      id: 'sub_vatli10',
      category: 'Môn học (GDPT 2018)',
      title: 'Vật lí 10',
      icon: 'zap',
      desc: 'Đo lường, Chuyển động thẳng đều, Vận tốc, Gia tốc và Động lực học',
      keywords: ['vat li 10', 'vat ly 10', 'chuyen dong', 'van toc'],
      action: () => app.selectSubject('vatli10')
    },
    {
      id: 'sub_hoahoc10',
      category: 'Môn học (GDPT 2018)',
      title: 'Hóa học 10',
      icon: 'flask-conical',
      desc: 'Cấu tạo nguyên tử, Vỏ electron, Cấu hình e và Bảng tuần hoàn',
      keywords: ['hoa hoc 10', 'hoa 10', 'nguyen tu', 'electron'],
      action: () => app.selectSubject('hoahoc10')
    },
    {
      id: 'sub_tienganh10',
      category: 'Môn học (GDPT 2018)',
      title: 'Tiếng Anh 10',
      icon: 'globe',
      desc: 'Family Life, Humans & Environment, Ngữ pháp và Từ vựng theo chủ điểm',
      keywords: ['tieng anh 10', 'anh 10', 'english', 'grammar'],
      action: () => app.selectSubject('tienganh10')
    },

    // ═══════════════════════════════════════════════════════════
    // 3. HÀNH ĐỘNG HỆ THỐNG & CÀI ĐẶT
    // ═══════════════════════════════════════════════════════════
    {
      id: 'act_theme',
      category: 'Hành động nhanh',
      title: 'Đổi giao diện Sáng / Tối (Toggle Theme)',
      icon: 'moon',
      desc: 'Chuyển đổi giữa chế độ Neo-Scholar, Midnight Dark và Academic Clean',
      keywords: ['doi theme', 'dark mode', 'sang toi', 'theme', 'mau sac'],
      action: () => app.toggleTheme()
    },
    {
      id: 'act_focus',
      category: 'Hành động nhanh',
      title: 'Bật / Tắt chế độ Tập trung (Focus Mode)',
      icon: 'clock',
      desc: 'Đồng hồ Pomodoro 25 phút, ẩn toàn bộ yếu tố gây xao nhãng',
      keywords: ['focus mode', 'pomodoro', 'tap trung', 'dong ho'],
      action: () => {
        if (window.ThemeFocus) ThemeFocus.toggleFocus();
      }
    },
    {
      id: 'act_sound',
      category: 'Hành động nhanh',
      title: 'Bật / Tắt âm thanh tương tác (Sound FX)',
      icon: 'volume-2',
      desc: 'Âm thanh phản hồi khi bấm nút, cắm cờ và nộp bài',
      keywords: ['am thanh', 'sound', 'bat tat am thanh', 'loa'],
      action: () => {
        if (window.SoundFX) SoundFX.toggle();
      }
    },
    {
      id: 'act_login',
      category: 'Hành động nhanh',
      title: 'Đăng nhập / Hồ sơ học sinh',
      icon: 'user',
      desc: 'Đăng nhập tài khoản, lưu tiến trình và đồng bộ dữ liệu đám mây',
      keywords: ['dang nhap', 'tai khoan', 'ho so', 'login', 'auth'],
      action: () => {
        if (window.AuthView) AuthView.showModal();
      }
    }
  ],

  init() {
    this.createDom();
    this.bindEvents();
  },

  createDom() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('cmd-palette-backdrop')) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'cmd-palette-backdrop';
    backdrop.className = 'cmd-palette-backdrop';
    backdrop.innerHTML = `
      <div class="cmd-palette-modal" onclick="event.stopPropagation()">
        <div class="cmd-search-row">
          <span class="cmd-search-icon">${(typeof Icons !== 'undefined' && Icons.get) ? Icons.get('search', { size: 18 }) : ''}</span>
          <input type="text" 
                 id="cmd-palette-input" 
                 class="cmd-search-input" 
                 placeholder="Tìm kiếm môn học, bài tập, công cụ hoặc hành động nhanh..." 
                 autocomplete="off" 
                 spellcheck="false">
          <span class="cmd-esc-badge">ESC</span>
        </div>

        <div class="cmd-results-list" id="cmd-results-list"></div>

        <div class="cmd-palette-footer">
          <div class="cmd-footer-keys">
            <span class="cmd-key-tip"><kbd>↑</kbd><kbd>↓</kbd> Di chuyển</span>
            <span class="cmd-key-tip"><kbd>Enter</kbd> Chọn</span>
            <span class="cmd-key-tip"><kbd>Esc</kbd> Đóng</span>
          </div>
          <span class="cmd-brand-tag">NTMK Quick Launcher</span>
        </div>
      </div>
    `;

    backdrop.onclick = () => this.close();
    document.body.appendChild(backdrop);
  },

  bindEvents() {
    if (typeof window === 'undefined') return;

    // Phím tắt toàn cục Ctrl+K hoặc Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        this.toggle();
      }
      if (this.isOpen && e.key === 'Escape') {
        e.preventDefault();
        this.close();
      }
    });

    // Xử lý ô input
    const input = document.getElementById('cmd-palette-input');
    if (input) {
      input.addEventListener('input', (e) => {
        this.query = e.target.value;
        this.selectedIndex = 0;
        this.filterAndRender();
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSelected();
        }
      });
    }
  },

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  },

  open() {
    this.createDom();
    const backdrop = document.getElementById('cmd-palette-backdrop');
    const input = document.getElementById('cmd-palette-input');
    if (!backdrop) return;

    this.isOpen = true;
    backdrop.classList.add('open');
    this.query = '';
    this.selectedIndex = 0;
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 50);
    }
    this.filterAndRender();
  },

  close() {
    const backdrop = document.getElementById('cmd-palette-backdrop');
    if (!backdrop) return;
    this.isOpen = false;
    backdrop.classList.remove('open');
  },

  normalize(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd');
  },

  filterAndRender() {
    const normQ = this.normalize(this.query).trim();

    if (!normQ) {
      // Mặc định hiện tất cả mục
      this.currentFiltered = [...this.ITEMS];
    } else {
      this.currentFiltered = this.ITEMS.filter(item => {
        const normTitle = this.normalize(item.title);
        const normDesc = this.normalize(item.desc);
        const matchTitle = normTitle.includes(normQ);
        const matchDesc = normDesc.includes(normQ);
        const matchKey = (item.keywords || []).some(k => this.normalize(k).includes(normQ));
        return matchTitle || matchDesc || matchKey;
      });
    }

    this.renderList();
  },

  renderList() {
    if (typeof document === 'undefined') return;
    const listEl = document.getElementById('cmd-results-list');
    if (!listEl) return;

    if (this.currentFiltered.length === 0) {
      listEl.innerHTML = `
        <div class="cmd-empty-state">
          Không tìm thấy bài học hoặc chức năng phù hợp với "<strong>${this.escapeHtml(this.query)}</strong>".
        </div>
      `;
      return;
    }

    // Nhóm theo category
    const categories = {};
    this.currentFiltered.forEach((item, index) => {
      const cat = item.category || 'Khác';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({ ...item, globalIndex: index });
    });

    let html = '';
    for (const [catName, catItems] of Object.entries(categories)) {
      html += `<div class="cmd-section-title">${catName}</div>`;
      catItems.forEach(item => {
        const isSelected = item.globalIndex === this.selectedIndex;
        html += `
          <div class="cmd-result-item ${isSelected ? 'selected' : ''}" 
               data-idx="${item.globalIndex}" 
               onclick="CommandPalette.selectAndExecute(${item.globalIndex})">
            <div class="cmd-item-left">
              <span class="cmd-item-icon">${this.extractIcon(item)}</span>
              <div class="cmd-item-info">
                <span class="cmd-item-title">${this.escapeHtml(item.title)}</span>
                <span class="cmd-item-desc">${this.escapeHtml(item.desc)}</span>
              </div>
            </div>
            <span class="cmd-item-badge">Mở</span>
          </div>
        `;
      });
    }

    listEl.innerHTML = html;
    this.scrollSelectedIntoView();
  },

  extractIcon(item) {
    if (typeof Icons !== 'undefined' && Icons.get) {
      const iconName = (item && item.icon) ? item.icon : 'zap';
      if (Icons.has(iconName)) return Icons.get(iconName, { size: 18 });
      return Icons.get('zap', { size: 18 });
    }
    return '';
  },

  moveSelection(delta) {
    if (this.currentFiltered.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.currentFiltered.length) % this.currentFiltered.length;
    this.renderList();
  },

  scrollSelectedIntoView() {
    const selectedEl = document.querySelector('.cmd-result-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  },

  executeSelected() {
    if (this.currentFiltered.length === 0) return;
    const item = this.currentFiltered[this.selectedIndex];
    if (item && item.action) {
      this.close();
      item.action();
    }
  },

  selectAndExecute(idx) {
    this.selectedIndex = idx;
    this.executeSelected();
  },

  escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandPalette;
}
