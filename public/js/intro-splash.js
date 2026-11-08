/**
 * NTMK Cinematic Site Intro Splash Controller
 * - 60 FPS Canvas background with academic celestial constellation
 * - Dynamic SVG logo assembly and shimmering kinetic typography
 * - Progressive neon loading indicator with status stages
 * - Native Web Audio API celestial chime integration
 * - Keyboard (Esc) and click-to-skip support with zero external dependencies
 */

const IntroSplash = {
  overlayEl: null,
  canvasEl: null,
  ctx: null,
  animId: null,
  progressAnimId: null,
  nodes: [],
  angle: 0,
  isDismissing: false,
  STORAGE_KEY: 'ntmk_intro_viewed_session',

  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // Check if intro was explicitly requested via URL parameter or not yet viewed in session
    const urlParams = new URLSearchParams(window.location.search);
    const forceIntro = urlParams.get('intro') === '1';

    let alreadyViewed = false;
    try {
      alreadyViewed = sessionStorage.getItem(this.STORAGE_KEY) === 'true';
    } catch (e) {}

    if (forceIntro || !alreadyViewed) {
      this.play();
    }
  },

  replay() {
    this.play(true);
  },

  play(isReplay = false) {
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }

    try {
      sessionStorage.setItem(this.STORAGE_KEY, 'true');
    } catch (e) {}

    this.isDismissing = false;
    this.createDOM();
    this.initCanvas();
    this.bindEvents();
    this.startProgress();

    // Subtle audio chime
    if (typeof SoundFX !== 'undefined' && SoundFX.playIntro) {
      setTimeout(() => SoundFX.playIntro(), 280);
    }
  },

  createDOM() {
    const overlay = document.createElement('div');
    overlay.id = 'site-intro-overlay';
    overlay.className = 'site-intro-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Giới thiệu nền tảng ôn tập THPT Nguyễn Thị Minh Khai');

    overlay.innerHTML = `
      <div class="intro-backdrop" aria-hidden="true">
        <canvas class="intro-bg-canvas" id="intro-canvas"></canvas>
        <div class="intro-aurora-glow"></div>
        <div class="intro-radial-vignette"></div>
      </div>

      <div class="intro-container">
        <!-- Top Skip Action -->
        <div class="intro-header-bar">
          <button class="intro-skip-btn" id="intro-skip-trigger" type="button" aria-label="Bỏ qua phần giới thiệu (Phím Esc)">
            <span>Bỏ qua</span>
            <span class="intro-key-pill" aria-hidden="true">Esc</span>
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <!-- Center Stage -->
        <div class="intro-stage">
          <!-- Institutional Logo Assembly -->
          <div class="intro-logo-container">
            <div class="intro-logo-halo" aria-hidden="true"></div>
            <div class="intro-logo-ring intro-ring-outer" aria-hidden="true"></div>
            <div class="intro-logo-ring intro-ring-inner" aria-hidden="true"></div>
            <img src="assets/logo.svg" alt="Logo NTMK" class="intro-logo-vector" width="108" height="108">
          </div>

          <!-- Typography Reveal -->
          <div class="intro-typography">
            <div class="intro-badge-pill">
              <span class="intro-beacon-dot" aria-hidden="true"></span>
              <span>TRƯỜNG THPT NGUYỄN THỊ MINH KHAI • BÌNH DƯƠNG</span>
            </div>

            <h1 class="intro-title">
              <span class="intro-title-primary">NỀN TẢNG ÔN TẬP</span>
              <span class="intro-title-accent">GDPT 2018</span>
            </h1>

            <p class="intro-motto" id="intro-motto-text">
              Ngân hàng đề khảo thí số hóa chuẩn cấu trúc Bộ GD&ĐT
            </p>
          </div>

          <!-- Neon Progress Bar & Stage Status -->
          <div class="intro-status-box">
            <div class="intro-progress-track">
              <div class="intro-progress-bar" id="intro-progress-bar" style="width: 0%;"></div>
            </div>

            <div class="intro-meta-row">
              <span class="intro-meta-status" id="intro-status-label">Khởi tạo dữ liệu...</span>
              <span class="intro-meta-pct" id="intro-pct-label">0%</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this.overlayEl = overlay;
  },

  initCanvas() {
    const canvas = document.getElementById('intro-canvas');
    if (!canvas) return;

    this.canvasEl = canvas;
    this.ctx = canvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    if (this.ctx) {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);
    }

    // Generate 3D spherical nodes
    this.nodes = [];
    const count = 36;
    const radius = Math.min(width, height) * 0.42;

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      this.nodes.push({
        origX: radius * Math.cos(theta) * Math.sin(phi),
        origY: radius * Math.sin(theta) * Math.sin(phi),
        origZ: radius * Math.cos(phi),
        x: 0,
        y: 0,
        z: 0,
        projX: 0,
        projY: 0,
        scale: 1
      });
    }

    this.startCanvasAnimation();
  },

  startCanvasAnimation() {
    if (this.animId) return;

    const render = () => {
      if (!this.canvasEl || !this.ctx || this.isDismissing) return;

      const ctx = this.ctx;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      this.angle += 0.005;
      const cosA = Math.cos(this.angle);
      const sinA = Math.sin(this.angle);

      const centerX = w * 0.5;
      const centerY = h * 0.5;
      const fov = 400;

      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        const x1 = n.origX * cosA - n.origZ * sinA;
        const z1 = n.origZ * cosA + n.origX * sinA;
        n.x = x1;
        n.y = n.origY;
        n.z = z1;

        const scale = fov / (fov + z1 + 350);
        n.projX = centerX + x1 * scale;
        n.projY = centerY + n.origY * scale;
        n.scale = scale;
      }

      // Connecting lines
      ctx.lineWidth = 1;
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n1 = this.nodes[i];
          const n2 = this.nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dz = n1.z - n2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.28;
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(n1.projX, n1.projY);
            ctx.lineTo(n2.projX, n2.projY);
            ctx.stroke();
          }
        }
      }

      // 3D Nodes
      for (let i = 0; i < this.nodes.length; i++) {
        const n = this.nodes[i];
        const r = Math.max(2, 4.5 * n.scale);
        const alpha = Math.min(0.85, 0.25 + n.scale * 0.5);

        ctx.beginPath();
        ctx.arc(n.projX, n.projY, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(96, 165, 250, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      this.animId = requestAnimationFrame(render);
    };

    this.animId = requestAnimationFrame(render);
  },

  startProgress() {
    const progressBar = document.getElementById('intro-progress-bar');
    const statusLabel = document.getElementById('intro-status-label');
    const pctLabel = document.getElementById('intro-pct-label');
    const mottoText = document.getElementById('intro-motto-text');

    const duration = 1800; // 1.8 seconds total
    const startTime = performance.now();

    const stages = [
      { at: 0.15, text: 'Đang kết nối ngân hàng câu hỏi GDPT 2018...', motto: 'Khởi đầu vững bước • Bứt phá điểm số' },
      { at: 0.50, text: 'Chuẩn bị 6 môn thi: Toán, Lí, Hóa, Anh, Sử, Sinh...', motto: 'Cấu trúc đề thi chuẩn Quyết định 764/QĐ-BGDĐT' },
      { at: 0.85, text: 'Kích hoạt không gian khảo thí 3D 60 FPS...', motto: 'Đầy đủ 3 phần thi: Nhiều lựa chọn, Đúng/Sai, Điền khuyết' },
      { at: 1.00, text: 'Sẵn sàng bước vào phòng thi!', motto: 'Chào mừng bạn đến với Nền tảng Ôn tập THPT NTMK' }
    ];

    let currentStageIndex = 0;

    const tick = (now) => {
      if (this.isDismissing) return;

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);
      const pct = Math.round(ease * 100);

      if (progressBar) progressBar.style.width = `${pct}%`;
      if (pctLabel) pctLabel.textContent = `${pct}%`;

      if (currentStageIndex < stages.length && progress >= stages[currentStageIndex].at) {
        if (statusLabel) statusLabel.textContent = stages[currentStageIndex].text;
        if (mottoText && stages[currentStageIndex].motto) {
          mottoText.textContent = stages[currentStageIndex].motto;
        }
        currentStageIndex++;
      }

      if (progress < 1) {
        this.progressAnimId = requestAnimationFrame(tick);
      } else {
        // Complete! Wait a moment then dismiss
        setTimeout(() => this.dismiss(), 240);
      }
    };

    this.progressAnimId = requestAnimationFrame(tick);
  },

  bindEvents() {
    const skipBtn = document.getElementById('intro-skip-trigger');
    if (skipBtn) {
      skipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss();
      });
    }

    // Dismiss on Escape key
    this.keyHandler = (e) => {
      if (e.key === 'Escape') {
        this.dismiss();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    // Click anywhere to dismiss early
    if (this.overlayEl) {
      this.overlayEl.addEventListener('click', () => {
        this.dismiss();
      });
    }
  },

  dismiss() {
    if (this.isDismissing || !this.overlayEl) return;
    this.isDismissing = true;

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.progressAnimId) {
      cancelAnimationFrame(this.progressAnimId);
      this.progressAnimId = null;
    }
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }

    // Add dismissing class for smooth cinematic zoom and fade out
    this.overlayEl.classList.add('intro-dismissing');

    setTimeout(() => {
      if (this.overlayEl && this.overlayEl.parentNode) {
        this.overlayEl.parentNode.removeChild(this.overlayEl);
      }
      this.overlayEl = null;
      this.canvasEl = null;
      this.ctx = null;

      // Trigger 3D and dashboard animation upon reveal
      if (typeof Tilt3D !== 'undefined') {
        Tilt3D.init();
      }
    }, 450);
  }
};

if (typeof window !== 'undefined') {
  window.IntroSplash = IntroSplash;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IntroSplash;
}
