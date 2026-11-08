/**
 * NTMK 3D Micro-Physics & Interaction Engine (30-60 FPS)
 * - Decoupled requestAnimationFrame 60 FPS physics loop with damping (Lerp)
 * - True 3D card parallax tilt with dynamic specular glare reflection
 * - Multi-layer depth parallax (Z-axis translation for icons and badges)
 * - Ambient 3D geometric projection canvas for Hero background
 * - Zero external dependencies, pure native trigonometry and Canvas 2D
 */

const Tilt3D = {
  rafId: null,
  activeCards: new WeakMap(),
  heroCanvas: null,
  heroCtx: null,
  heroAnimId: null,
  heroNodes: [],
  heroMouse: { x: -9999, y: -9999, active: false },
  angleX: 0,
  angleY: 0,

  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.bindCards();
    this.initHeroCanvas();

    // Handle window resize
    window.addEventListener('resize', () => {
      this.resizeHeroCanvas();
    }, { passive: true });

    // Handle tab visibility to save power
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopHeroAnimation();
      } else {
        this.startHeroAnimation();
      }
    });

    // Observe SPA DOM updates
    const observer = new MutationObserver(() => {
      this.bindCards();
      this.initHeroCanvas();
    });

    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      observer.observe(mainEl, { childList: true, subtree: true });
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 1. TRUE 3D PARALLAX CARD TILT & SPECULAR GLARE (60 FPS)
  // ═══════════════════════════════════════════════════════════
  bindCards() {
    const selector = '.dash-subject-card, .subject-card-item, .smart-tool-card, .mode-card';
    const cards = document.querySelectorAll(selector);

    cards.forEach(card => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = 'true';

      // Setup 3D transform container styles
      card.style.transformStyle = 'preserve-3d';
      card.style.willChange = 'transform, box-shadow';

      // Inject dynamic specular glare element if not present
      let glare = card.querySelector('.card-3d-glare');
      if (!glare) {
        glare = document.createElement('div');
        glare.className = 'card-3d-glare';
        glare.setAttribute('aria-hidden', 'true');
        card.appendChild(glare);
      }

      const state = {
        card,
        glare,
        targetX: 0,
        targetY: 0,
        currentX: 0,
        currentY: 0,
        glareX: 50,
        glareY: 50,
        glareOpacity: 0,
        currentOpacity: 0,
        isHovered: false,
        rafActive: false
      };

      this.activeCards.set(card, state);

      card.addEventListener('mouseenter', () => {
        state.isHovered = true;
        state.glareOpacity = 1;
        card.setAttribute('data-tilt-active', 'true');
        if (!state.rafActive) {
          state.rafActive = true;
          this.animateCard(state);
        }
      }, { passive: true });

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const cardW = rect.width || 240;
        const cardH = rect.height || 180;

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Normalized offsets from center (-1 to 1)
        const xOffset = (mouseX - cardW / 2) / (cardW / 2);
        const yOffset = (mouseY - cardH / 2) / (cardH / 2);

        // Maximum 3D tilt angle in degrees for distinct depth
        const maxTilt = 15;
        state.targetY = xOffset * maxTilt;
        state.targetX = -yOffset * maxTilt;

        // Glare specular position
        state.glareX = (mouseX / cardW) * 100;
        state.glareY = (mouseY / cardH) * 100;
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        state.isHovered = false;
        state.targetX = 0;
        state.targetY = 0;
        state.glareOpacity = 0;
      }, { passive: true });
    });
  },

  animateCard(state) {
    // Linear interpolation (Lerp) for velvet-smooth 60 FPS spring inertia
    const damping = 0.12;
    state.currentX += (state.targetX - state.currentX) * damping;
    state.currentY += (state.targetY - state.currentY) * damping;
    state.currentOpacity += (state.glareOpacity - state.currentOpacity) * 0.16;

    const { card, glare, currentX, currentY, glareX, glareY, currentOpacity } = state;

    // Apply high-performance 3D matrix transform with highest specificity
    const zOffset = state.isHovered ? 12 : 0;
    card.style.setProperty(
      'transform',
      `perspective(1000px) rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg) translateZ(${zOffset}px)`,
      'important'
    );

    // Dynamic 3D lighting shadow that shifts opposite to the cursor position
    if (state.isHovered) {
      const shadowX = (-currentY * 1.5).toFixed(1);
      const shadowY = (Math.abs(currentX) * 1.2 + 14).toFixed(1);
      card.style.setProperty(
        'box-shadow',
        `${shadowX}px ${shadowY}px 32px -4px rgba(37, 99, 235, 0.22), 0 0 0 1.5px rgba(37, 99, 235, 0.25)`,
        'important'
      );
    }

    // Apply specular light reflection sheen
    if (glare) {
      glare.style.setProperty('opacity', (currentOpacity * 0.7).toFixed(2), 'important');
      glare.style.setProperty(
        'background',
        `radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255, 255, 255, 0.65) 0%, rgba(255, 255, 255, 0.15) 45%, transparent 75%)`,
        'important'
      );
    }

    // Floating 3D Z-axis translation for icon elements inside card
    const icon = card.querySelector('.dash-sub-icon, .sub-icon-box, .tool-icon-wrapper, .mode-icon');
    if (icon) {
      icon.style.setProperty(
        'transform',
        state.isHovered ? 'translateZ(30px) scale(1.06)' : 'translateZ(0px) scale(1)',
        'important'
      );
    }

    // Stop animation loop when card reaches rest position
    const diff = Math.abs(state.targetX - currentX) + Math.abs(state.targetY - currentY) + Math.abs(state.glareOpacity - currentOpacity);
    if (!state.isHovered && diff < 0.05) {
      card.style.removeProperty('transform');
      card.style.removeProperty('box-shadow');
      card.removeAttribute('data-tilt-active');
      if (glare) glare.style.removeProperty('opacity');
      if (icon) icon.style.removeProperty('transform');
      state.rafActive = false;
      return;
    }

    requestAnimationFrame(() => this.animateCard(state));
  },

  // ═══════════════════════════════════════════════════════════
  // 2. AMBIENT 3D GEOMETRIC PROJECTION CANVAS (60 FPS)
  // ═══════════════════════════════════════════════════════════
  initHeroCanvas() {
    const heroCard = document.querySelector('.dashboard-hero-card');
    if (!heroCard) return;

    let canvas = heroCard.querySelector('.hero-3d-bg-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'hero-3d-bg-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      heroCard.prepend(canvas);
    }

    this.heroCanvas = canvas;
    this.heroCtx = canvas.getContext('2d');

    this.resizeHeroCanvas();
    if (this.heroNodes.length === 0) {
      this.generate3DNodes();
    }

    // Mouse proximity repulsion physics
    if (!heroCard.dataset.heroMouseBound) {
      heroCard.dataset.heroMouseBound = 'true';

      heroCard.addEventListener('mousemove', (e) => {
        const rect = heroCard.getBoundingClientRect();
        this.heroMouse.x = e.clientX - rect.left;
        this.heroMouse.y = e.clientY - rect.top;
        this.heroMouse.active = true;
      }, { passive: true });

      heroCard.addEventListener('mouseleave', () => {
        this.heroMouse.active = false;
        this.heroMouse.x = -9999;
        this.heroMouse.y = -9999;
      }, { passive: true });
    }

    this.startHeroAnimation();
  },

  resizeHeroCanvas() {
    if (!this.heroCanvas) return;
    const heroCard = this.heroCanvas.closest('.dashboard-hero-card') || document.querySelector('.dashboard-hero-card');
    if (!heroCard) return;

    const rect = heroCard.getBoundingClientRect();
    const width = Math.max(rect.width, heroCard.offsetWidth || 0, 860);
    const height = Math.max(rect.height, heroCard.offsetHeight || 0, 240);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.heroCanvas.width = width * dpr;
    this.heroCanvas.height = height * dpr;
    this.heroCanvas.style.width = `${width}px`;
    this.heroCanvas.style.height = `${height}px`;

    if (this.heroCtx) {
      this.heroCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.heroCtx.scale(dpr, dpr);
    }
  },

  generate3DNodes() {
    this.heroNodes = [];
    const count = 30;
    const radius = 230;

    for (let i = 0; i < count; i++) {
      // Golden spiral distribution on 3D sphere
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      this.heroNodes.push({
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
  },

  startHeroAnimation() {
    if (this.heroAnimId) return;

    const loop = () => {
      this.render3DHero();
      this.heroAnimId = requestAnimationFrame(loop);
    };

    this.heroAnimId = requestAnimationFrame(loop);
  },

  stopHeroAnimation() {
    if (this.heroAnimId) {
      cancelAnimationFrame(this.heroAnimId);
      this.heroAnimId = null;
    }
  },

  render3DHero() {
    if (!this.heroCanvas || !this.heroCtx) return;

    const w = parseFloat(this.heroCanvas.style.width) || this.heroCanvas.width || 860;
    const h = parseFloat(this.heroCanvas.style.height) || this.heroCanvas.height || 240;

    if (this.heroCanvas.width === 0 || this.heroCanvas.height === 0 || w < 200) {
      this.resizeHeroCanvas();
    }

    const ctx = this.heroCtx;
    ctx.clearRect(0, 0, w, h);

    // Continuous 3D rotation angles (smooth academic constellation orbit)
    this.angleX += 0.0035;
    this.angleY += 0.0055;

    const cosX = Math.cos(this.angleX);
    const sinX = Math.sin(this.angleX);
    const cosY = Math.cos(this.angleY);
    const sinY = Math.sin(this.angleY);

    // Place constellation on the right side of hero banner
    const centerX = Math.max(w * 0.78, w - 220);
    const centerY = h * 0.5;
    const fov = 350;

    // Project 3D nodes to 2D screen coordinates
    for (let i = 0; i < this.heroNodes.length; i++) {
      const node = this.heroNodes[i];

      // Rotate around Y axis
      const x1 = node.origX * cosY - node.origZ * sinY;
      const z1 = node.origZ * cosY + node.origX * sinY;

      // Rotate around X axis
      const y2 = node.origY * cosX - z1 * sinX;
      const z2 = z1 * cosX + node.origY * sinX;

      node.x = x1;
      node.y = y2;
      node.z = z2;

      // 3D Perspective projection
      const scale = fov / (fov + z2 + 250);
      let targetProjX = centerX + x1 * scale;
      let targetProjY = centerY + y2 * scale;

      // Mouse repulsion physics
      if (this.heroMouse.active) {
        const dx = targetProjX - this.heroMouse.x;
        const dy = targetProjY - this.heroMouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 140;

        if (dist < maxDist && dist > 0) {
          const force = (1 - dist / maxDist) * 26;
          targetProjX += (dx / dist) * force;
          targetProjY += (dy / dist) * force;
        }
      }

      node.projX += (targetProjX - node.projX) * 0.22;
      node.projY += (targetProjY - node.projY) * 0.22;
      node.scale = scale;
    }

    // Draw connecting 3D constellation lines
    ctx.lineWidth = 1.2;
    for (let i = 0; i < this.heroNodes.length; i++) {
      for (let j = i + 1; j < this.heroNodes.length; j++) {
        const n1 = this.heroNodes[i];
        const n2 = this.heroNodes[j];

        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const dz = n1.z - n2.z;
        const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist3d < 130) {
          const alpha = (1 - dist3d / 130) * 0.38;
          ctx.strokeStyle = `rgba(37, 99, 235, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n1.projX, n1.projY);
          ctx.lineTo(n2.projX, n2.projY);
          ctx.stroke();
        }
      }
    }

    // Draw 3D nodes with glowing dual-layer depth
    for (let i = 0; i < this.heroNodes.length; i++) {
      const node = this.heroNodes[i];
      const r = Math.max(2.6, 5.2 * node.scale);
      const alpha = Math.min(0.85, 0.35 + node.scale * 0.45);

      // Outer soft glowing aura
      ctx.beginPath();
      ctx.arc(node.projX, node.projY, r + 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(37, 99, 235, ${(alpha * 0.22).toFixed(3)})`;
      ctx.fill();

      // Core node
      ctx.beginPath();
      ctx.arc(node.projX, node.projY, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(37, 99, 235, ${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }
};

if (typeof window !== 'undefined') {
  window.Tilt3D = Tilt3D;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Tilt3D.init());
  } else {
    Tilt3D.init();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Tilt3D;
}
