/**
 * NTMK Theme & Focus Mode Manager
 * Quản lý đa phong cách giao diện và Chế độ tập trung (Focus Mode + Pomodoro Timer)
 */

const ThemeManager = {
  STORAGE_KEY: 'ntmk_theme_style_v2',
  THEMES: ['heritage', 'midnight', 'academic'],
  THEME_LABELS: {
    heritage: { id: 'heritage', name: 'Di Sản Học Giả', icon: '🏛️' },
    midnight: { id: 'midnight', name: 'Đêm Huyền Bí', icon: '🌙' },
    academic: { id: 'academic', name: 'Trang Giấy Thanh Nhã', icon: '📖' }
  },

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY) || 'heritage';
    this.applyTheme(saved);
  },

  getCurrentTheme() {
    return localStorage.getItem(this.STORAGE_KEY) || 'heritage';
  },

  applyTheme(themeName) {
    if (!this.THEMES.includes(themeName)) themeName = 'heritage';
    
    document.body.classList.remove('theme-heritage', 'theme-midnight', 'theme-academic');
    document.body.classList.add(`theme-${themeName}`);

    // Giữ tương thích data-theme="dark" cho legacy styles nếu là midnight
    if (themeName === 'midnight') {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
    }

    localStorage.setItem(this.STORAGE_KEY, themeName);
    this.updateToggleIcon(themeName);
  },

  cycleNext() {
    const current = this.getCurrentTheme();
    const idx = this.THEMES.indexOf(current);
    const nextIdx = (idx + 1) % this.THEMES.length;
    const nextTheme = this.THEMES[nextIdx];
    this.applyTheme(nextTheme);
    if (window.SoundFX) SoundFX.playClick();
  },

  updateToggleIcon(themeName) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
      const meta = this.THEME_LABELS[themeName] || this.THEME_LABELS.heritage;
      btn.innerHTML = `<span class="theme-icon">${meta.icon}</span>`;
      btn.title = `Giao diện: ${meta.name} (Bấm để đổi)`;
    }
  }
};

const FocusMode = {
  isActive: false,
  durationSeconds: 25 * 60, // 25 phút Pomodoro
  remainingSeconds: 25 * 60,
  isPaused: false,
  timerInterval: null,

  init() {
    // Lắng nghe phím Escape để thoát focus mode
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.exit();
      }
    });
  },

  toggle() {
    if (this.isActive) this.exit();
    else this.enter();
  },

  enter() {
    this.isActive = true;
    document.body.classList.add('focus-mode-active');
    this.startPomodoro();
    this.renderBar();
    if (window.SoundFX) SoundFX.playClick();
  },

  exit() {
    this.isActive = false;
    document.body.classList.remove('focus-mode-active');
    this.stopPomodoro();
    const bar = document.getElementById('focus-floating-bar');
    if (bar) bar.remove();
    if (window.SoundFX) SoundFX.playClick();
  },

  startPomodoro() {
    clearInterval(this.timerInterval);
    this.remainingSeconds = this.durationSeconds;
    this.isPaused = false;

    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.remainingSeconds--;
        this.updateBarTime();
        if (this.remainingSeconds <= 0) {
          this.onPomodoroComplete();
        }
      }
    }, 1000);
  },

  pauseResume() {
    this.isPaused = !this.isPaused;
    const btn = document.getElementById('focus-pause-btn');
    if (btn) btn.textContent = this.isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng';
    if (window.SoundFX) SoundFX.playClick();
  },

  stopPomodoro() {
    clearInterval(this.timerInterval);
    this.timerInterval = null;
  },

  onPomodoroComplete() {
    this.stopPomodoro();
    if (window.SoundFX) SoundFX.playVictory();
    alert('🎉 Tuyệt vời! Bạn đã hoàn thành trọn vẹn 25 phút tập trung cao độ.');
    this.exit();
  },

  renderBar() {
    let bar = document.getElementById('focus-floating-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'focus-floating-bar';
      bar.className = 'focus-floating-bar';
      document.body.appendChild(bar);
    }

    bar.innerHTML = `
      <div class="focus-bar-content">
        <span class="focus-indicator-dot"></span>
        <span class="focus-label">Chế độ tập trung</span>
        <span class="focus-timer-text" id="focus-time-display">25:00</span>
        <div class="focus-controls">
          <button id="focus-pause-btn" class="focus-btn" onclick="FocusMode.pauseResume()">⏸️ Tạm dừng</button>
          <button class="focus-btn exit" onclick="FocusMode.exit()">✕ Thoát [Esc]</button>
        </div>
      </div>
    `;
  },

  updateBarTime() {
    const el = document.getElementById('focus-time-display');
    if (el) {
      const m = Math.floor(this.remainingSeconds / 60);
      const s = this.remainingSeconds % 60;
      el.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  }
};

if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager;
  window.FocusMode = FocusMode;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThemeManager, FocusMode };
}
