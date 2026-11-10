/**
 * NTMK 3D Micro-Physics & Holographic Interaction Engine (60 FPS)
 * - Decoupled requestAnimationFrame 60 FPS physics loop with spring damping (Lerp)
 * - True multi-layer 3D card parallax tilt with holographic prism glare
 * - Multi-layer depth translation (Z-axis elevation for icons, badges, titles, CTAs)
 * - Hero 3D Gyroscope Constellation with orbiting 3D mathematical glyphs
 * - Global 3D low-poly geometric space & depth parallax field
 * - Zero external dependencies, pure native 3D trigonometry and Canvas 2D
 */

const Tilt3D = {
  rafId: null,
  activeCards: new WeakMap(),
  heroCanvas: null,
  heroCtx: null,
  heroAnimId: null,
  heroNodes: [],
  heroGlyphs: [],
  heroMouse: { x: -9999, y: -9999, active: false, normX: 0, normY: 0 },
  angleX: 0,
  angleY: 0,
  angleZ: 0,

  // Global 3D Space Background
  spaceCanvas: null,
  spaceCtx: null,
  spaceAnimId: null,
  spaceShapes: [],
  spaceDust: [],
  globalMouse: { x: 0, y: 0, targetX: 0, targetY: 0 },

  init() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    this.bindCards();
    this.initHeroCanvas();
    this.initAmbientSpace();

    // Handle window resize
    if (!this._resizeBound) {
      this._resizeBound = true;
      window.addEventListener('resize', () => {
        this.resizeHeroCanvas();
        this.resizeSpaceCanvas();
      }, { passive: true });

      window.addEventListener('mousemove', (e) => {
        const w = window.innerWidth || 1;
        const h = window.innerHeight || 1;
        this.globalMouse.targetX = (e.clientX / w - 0.5) * 2;
        this.globalMouse.targetY = (e.clientY / h - 0.5) * 2;
      }, { passive: true });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopHeroAnimation();
          this.stopSpaceAnimation();
        } else {
          this.startHeroAnimation();
          this.startSpaceAnimation();
        }
      });
    }

    // Observe SPA DOM updates
    if (!this._observerBound) {
      this._observerBound = true;
      const observer = new MutationObserver(() => {
        this.bindCards();
        this.initHeroCanvas();
      });

      const mainEl = document.getElementById('main-content');
      if (mainEl) {
        observer.observe(mainEl, { childList: true, subtree: true });
      }
    }
  },

  isDarkTheme() {
    if (typeof document === 'undefined') return true;
    return document.documentElement.getAttribute('data-theme') === 'dark' ||
           document.body.getAttribute('data-theme') === 'dark';
  },

  // ═══════════════════════════════════════════════════════════
  // 1. TRUE 3D MULTI-LAYER PARALLAX CARD TILT & HOLOGRAPHIC GLARE
  // ═══════════════════════════════════════════════════════════
  bindCards() {
    const selector = '.dash-subject-card, .subject-card-item, .smart-tool-card, .mode-card, .planner-task-card, .diagnostic-blueprint-card, .dashboard-hero-card';
    const cards = document.querySelectorAll(selector);

    cards.forEach(card => {
      if (card.dataset.tiltBound) return;
      card.dataset.tiltBound = 'true';

      const isHero = card.classList.contains('dashboard-hero-card');

      // Setup 3D transform container styles
      card.style.transformStyle = 'preserve-3d';
      card.style.willChange = 'transform, box-shadow';

      // Inject dynamic holographic glare element if not present
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
        isHero,
        maxTilt: isHero ? 4.5 : 16,
        zLift: isHero ? 8 : 16,
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
        state.glareOpacity = isHero ? 0.45 : 1;
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

        state.targetY = xOffset * state.maxTilt;
        state.targetX = -yOffset * state.maxTilt;

        // Glare specular position
        state.glareX = (mouseX / cardW) * 100;
        state.glareY = (mouseY / cardH) * 100;

        // Update CSS lighting coordinates for spotlight rim
        card.style.setProperty('--mouse-x', `${mouseX}px`);
        card.style.setProperty('--mouse-y', `${mouseY}px`);
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
    const damping = 0.14;
    state.currentX += (state.targetX - state.currentX) * damping;
    state.currentY += (state.targetY - state.currentY) * damping;
    state.currentOpacity += (state.glareOpacity - state.currentOpacity) * 0.16;

    const { card, glare, isHero, zLift, currentX, currentY, glareX, glareY, currentOpacity } = state;

    // Apply 3D matrix transform with perspective
    const zOffset = state.isHovered ? zLift : 0;
    card.style.setProperty(
      'transform',
      `perspective(1100px) rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg) translateZ(${zOffset}px)`,
      'important'
    );

    // Dynamic 3D lighting shadow shifting opposite to cursor tilt
    if (state.isHovered && !isHero) {
      const shadowX = (-currentY * 1.8).toFixed(1);
      const shadowY = (currentX * 1.8 + 18).toFixed(1);
      const isDark = this.isDarkTheme();
      const shadowColor = isDark ? 'rgba(0, 0, 0, 0.72)' : 'rgba(37, 99, 235, 0.22)';
      const rimColor = isDark ? 'rgba(96, 165, 250, 0.48)' : 'rgba(37, 99, 235, 0.35)';
      card.style.setProperty(
        'box-shadow',
        `${shadowX}px ${shadowY}px 40px -6px ${shadowColor}, 0 0 0 1.5px ${rimColor}, 0 0 28px -4px rgba(99, 102, 241, 0.25)`,
        'important'
      );
    }

    // Holographic prismatic foil reflection sheen
    if (glare) {
      const glareFactor = isHero ? 0.35 : 0.78;
      glare.style.setProperty('opacity', (currentOpacity * glareFactor).toFixed(2), 'important');
      glare.style.setProperty(
        'background',
        `radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255, 255, 255, 0.75) 0%, rgba(125, 211, 252, 0.35) 26%, rgba(167, 139, 250, 0.22) 48%, transparent 74%)`,
        'important'
      );
    }

    // Multi-layer 3D parallax elevation inside card
    const layers = isHero
      ? [
          { sel: '.hero-illustration-slot', z: 36, scale: 1.05 },
          { sel: '.hero-title', z: 22, scale: 1 },
          { sel: '.hero-actions', z: 28, scale: 1 },
          { sel: '.hero-student-stats', z: 18, scale: 1 }
        ]
      : [
          { sel: '.dash-sub-icon, .sub-icon-box, .tool-icon-wrapper, .mode-icon', z: 44, scale: 1.12 },
          { sel: '.dash-sub-name, .tool-title, .mode-name', z: 26, scale: 1 },
          { sel: '.dash-sub-pill, .badge', z: 24, scale: 1 },
          { sel: '.dash-sub-desc, .tool-desc', z: 14, scale: 1 },
          { sel: '.dash-sub-cta, .tool-action-arrow', z: 30, scale: 1.04 }
        ];

    for (let i = 0; i < layers.length; i++) {
      const l = layers[i];
      const el = card.querySelector(l.sel);
      if (el) {
        if (state.isHovered) {
          el.style.setProperty('transform', `translateZ(${l.z}px) scale(${l.scale})`, 'important');
        } else {
          el.style.removeProperty('transform');
        }
      }
    }

    // Stop animation loop when card settles
    const diff = Math.abs(state.targetX - currentX) + Math.abs(state.targetY - currentY) + Math.abs(state.glareOpacity - currentOpacity);
    if (!state.isHovered && diff < 0.05) {
      card.style.removeProperty('transform');
      card.style.removeProperty('box-shadow');
      card.removeAttribute('data-tilt-active');
      if (glare) glare.style.removeProperty('opacity');
      for (let i = 0; i < layers.length; i++) {
        const el = card.querySelector(layers[i].sel);
        if (el) el.style.removeProperty('transform');
      }
      state.rafActive = false;
      return;
    }

    requestAnimationFrame(() => this.animateCard(state));
  },

  // ═══════════════════════════════════════════════════════════
  // 2. HERO 3D GYROSCOPE CONSTELLATION & ORBITING GLYPHS (60 FPS)
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

    canvas.style.display = 'block';
    this.heroCanvas = canvas;
    this.heroCtx = canvas.getContext('2d');

    this.resizeHeroCanvas();
    if (this.heroNodes.length === 0) {
      this.generate3DNodes();
    }

    if (!heroCard.dataset.heroMouseBound) {
      heroCard.dataset.heroMouseBound = 'true';

      heroCard.addEventListener('mousemove', (e) => {
        const rect = heroCard.getBoundingClientRect();
        this.heroMouse.x = e.clientX - rect.left;
        this.heroMouse.y = e.clientY - rect.top;
        this.heroMouse.normX = (this.heroMouse.x / (rect.width || 1) - 0.5) * 2;
        this.heroMouse.normY = (this.heroMouse.y / (rect.height || 1) - 0.5) * 2;
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
    const width = Math.max(rect.width, heroCard.offsetWidth || 0, 320);
    const height = Math.max(rect.height, heroCard.offsetHeight || 0, 240);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.heroCanvas.width = width * dpr;
    this.heroCanvas.height = height * dpr;
    this.heroCanvas.style.width = `${width}px`;
    this.heroCanvas.style.height = `${height}px`;
    this.heroCanvas.style.display = 'block';

    if (this.heroCtx) {
      this.heroCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.heroCtx.scale(dpr, dpr);
    }
    this.startHeroAnimation();
  },

  generate3DNodes() {
    this.heroNodes = [];
    const count = 42;
    const radius = 210;

    for (let i = 0; i < count; i++) {
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
        scale: 1,
        hue: i % 3 === 0 ? 'cyan' : (i % 3 === 1 ? 'indigo' : 'gold')
      });
    }

    // Floating 3D Math & Academic Glyphs orbiting in 3D space
    const symbols = ['π', '∑', '∫', 'Δ', '∞', 'f(x)', 'λ', 'θ', '√x', 'Ω'];
    this.heroGlyphs = symbols.map((sym, idx) => {
      const angle = (idx / symbols.length) * Math.PI * 2;
      const r = 175 + (idx % 3) * 45;
      return {
        sym,
        origX: Math.cos(angle) * r,
        origY: ((idx % 4) - 1.5) * 65,
        origZ: Math.sin(angle) * r,
        phase: idx * 0.7
      };
    });
  },

  startHeroAnimation() {
    if (this.heroAnimId) return;
    if (this.heroCanvas) this.heroCanvas.style.display = 'block';

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

    if (this.heroCanvas.width === 0 || this.heroCanvas.height === 0 || w < 100) {
      this.resizeHeroCanvas();
    }

    const ctx = this.heroCtx;
    ctx.clearRect(0, 0, w, h);

    const isDark = this.isDarkTheme();

    // Smooth continuous 3D orbital angles + interactive mouse boost
    const mouseBoostX = this.heroMouse.active ? this.heroMouse.normY * 0.008 : 0;
    const mouseBoostY = this.heroMouse.active ? this.heroMouse.normX * 0.01 : 0;

    this.angleX += 0.004 + mouseBoostX;
    this.angleY += 0.0065 + mouseBoostY;
    this.angleZ += 0.0025;

    const cosX = Math.cos(this.angleX);
    const sinX = Math.sin(this.angleX);
    const cosY = Math.cos(this.angleY);
    const sinY = Math.sin(this.angleY);

    // Center the 3D sphere on the right half around the art slot
    const centerX = w < 640 ? w * 0.5 : Math.max(w * 0.74, w - 230);
    const centerY = h * 0.44;
    const fov = 360;

    // 1. Draw 3D Gyroscope Orbital Rings
    const ringCount = 2;
    for (let rIdx = 0; rIdx < ringCount; rIdx++) {
      const ringRadius = rIdx === 0 ? 225 : 165;
      const tiltA = this.angleX * (rIdx === 0 ? 1.2 : -1.4);
      const tiltB = this.angleY * (rIdx === 0 ? 0.9 : 1.5);
      const pts = 48;

      ctx.beginPath();
      for (let s = 0; s <= pts; s++) {
        const a = (s / pts) * Math.PI * 2;
        const lx = Math.cos(a) * ringRadius;
        const ly = Math.sin(a) * ringRadius * (rIdx === 0 ? 0.42 : 0.85);
        const lz = Math.sin(a) * ringRadius * (rIdx === 0 ? 0.85 : 0.42);

        const rx = lx * Math.cos(tiltB) - lz * Math.sin(tiltB);
        const rz1 = lz * Math.cos(tiltB) + lx * Math.sin(tiltB);
        const ry = ly * Math.cos(tiltA) - rz1 * Math.sin(tiltA);
        const rz2 = rz1 * Math.cos(tiltA) + ly * Math.sin(tiltA);

        const sc = fov / (fov + rz2 + 240);
        const px = centerX + rx * sc;
        const py = centerY + ry * sc;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = rIdx === 0
        ? (isDark ? 'rgba(56, 189, 248, 0.28)' : 'rgba(37, 99, 235, 0.2)')
        : (isDark ? 'rgba(167, 139, 250, 0.25)' : 'rgba(99, 102, 241, 0.18)');
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    // 2. Project 3D Geodesic Constellation Nodes
    for (let i = 0; i < this.heroNodes.length; i++) {
      const node = this.heroNodes[i];

      const x1 = node.origX * cosY - node.origZ * sinY;
      const z1 = node.origZ * cosY + node.origX * sinY;
      const y2 = node.origY * cosX - z1 * sinX;
      const z2 = z1 * cosX + node.origY * sinX;

      node.x = x1;
      node.y = y2;
      node.z = z2;

      const scale = fov / (fov + z2 + 240);
      let targetProjX = centerX + x1 * scale;
      let targetProjY = centerY + y2 * scale;

      if (this.heroMouse.active) {
        const dx = targetProjX - this.heroMouse.x;
        const dy = targetProjY - this.heroMouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 160;

        if (dist < maxDist && dist > 0) {
          const force = (1 - dist / maxDist) * 34;
          targetProjX += (dx / dist) * force;
          targetProjY += (dy / dist) * force;
        }
      }

      if (node.projX === 0 && node.projY === 0) {
        node.projX = targetProjX;
        node.projY = targetProjY;
      } else {
        node.projX += (targetProjX - node.projX) * 0.22;
        node.projY += (targetProjY - node.projY) * 0.22;
      }
      node.scale = scale;
    }

    // 3. Draw Luminous 3D Connecting Beams
    ctx.lineWidth = 1.25;
    for (let i = 0; i < this.heroNodes.length; i++) {
      for (let j = i + 1; j < this.heroNodes.length; j++) {
        const n1 = this.heroNodes[i];
        const n2 = this.heroNodes[j];

        const dx = n1.x - n2.x;
        const dy = n1.y - n2.y;
        const dz = n1.z - n2.z;
        const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist3d < 135) {
          const alpha = (1 - dist3d / 135) * (isDark ? 0.55 : 0.35);
          ctx.strokeStyle = isDark
            ? `rgba(96, 165, 250, ${alpha.toFixed(3)})`
            : `rgba(37, 99, 235, ${alpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(n1.projX, n1.projY);
          ctx.lineTo(n2.projX, n2.projY);
          ctx.stroke();
        }
      }
    }

    // 4. Draw Glowing 3D Nodes
    for (let i = 0; i < this.heroNodes.length; i++) {
      const node = this.heroNodes[i];
      const r = Math.max(2.4, 5.4 * node.scale);
      const alpha = Math.min(0.95, 0.38 + node.scale * 0.5);

      let rgb = '56, 189, 248';
      if (node.hue === 'indigo') rgb = '167, 139, 250';
      if (node.hue === 'gold') rgb = '251, 191, 36';
      if (!isDark && node.hue === 'cyan') rgb = '37, 99, 235';
      if (!isDark && node.hue === 'gold') rgb = '217, 119, 6';

      // Outer halo
      ctx.beginPath();
      ctx.arc(node.projX, node.projY, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${(alpha * 0.22).toFixed(3)})`;
      ctx.fill();

      // Core photon
      ctx.beginPath();
      ctx.arc(node.projX, node.projY, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rgb}, ${alpha.toFixed(3)})`;
      ctx.fill();
    }

    // 5. Draw Floating 3D Mathematical Glyphs
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < this.heroGlyphs.length; i++) {
      const g = this.heroGlyphs[i];
      const x1 = g.origX * cosY - g.origZ * sinY;
      const z1 = g.origZ * cosY + g.origX * sinY;
      const y2 = (g.origY + Math.sin(this.angleZ * 2 + g.phase) * 14) * cosX - z1 * sinX;
      const z2 = z1 * cosX + g.origY * sinX;

      const scale = fov / (fov + z2 + 240);
      const gx = centerX + x1 * scale;
      const gy = centerY + y2 * scale;
      const fontSize = Math.max(11, Math.round(17 * scale));
      const alpha = Math.min(0.75, Math.max(0.15, scale * 0.65));

      ctx.font = `700 ${fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = isDark
        ? `rgba(147, 197, 253, ${alpha.toFixed(2)})`
        : `rgba(37, 99, 235, ${(alpha * 0.75).toFixed(2)})`;
      ctx.fillText(g.sym, gx, gy);
    }
  },

  // ═══════════════════════════════════════════════════════════
  // 3. GLOBAL 3D AMBIENT POLYHEDRON & PARALLAX FIELD (60 FPS)
  // ═══════════════════════════════════════════════════════════
  initAmbientSpace() {
    if (typeof document === 'undefined') return;
    let canvas = document.getElementById('ntmk-3d-ambient-bg');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'ntmk-3d-ambient-bg';
      canvas.className = 'ntmk-3d-ambient-bg';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
    }

    this.spaceCanvas = canvas;
    this.spaceCtx = canvas.getContext('2d');
    this.resizeSpaceCanvas();

    if (this.spaceShapes.length === 0) {
      // Octahedron wireframe shapes floating at screen flanks
      const createOctahedron = (cxRatio, cyRatio, size, speedX, speedY) => ({
        cxRatio,
        cyRatio,
        size,
        speedX,
        speedY,
        ax: Math.random() * Math.PI,
        ay: Math.random() * Math.PI,
        vertices: [
          [0, 1, 0], [0, -1, 0],
          [1, 0, 0], [-1, 0, 0],
          [0, 0, 1], [0, 0, -1]
        ],
        edges: [
          [0, 2], [0, 3], [0, 4], [0, 5],
          [1, 2], [1, 3], [1, 4], [1, 5],
          [2, 4], [4, 3], [3, 5], [5, 2]
        ]
      });

      this.spaceShapes = [
        createOctahedron(0.08, 0.25, 48, 0.005, 0.007),
        createOctahedron(0.92, 0.75, 58, -0.004, 0.006),
        createOctahedron(0.12, 0.82, 34, 0.006, -0.005)
      ];

      // Ambient 3D floating bokeh dust
      this.spaceDust = [];
      for (let i = 0; i < 28; i++) {
        this.spaceDust.push({
          x: Math.random(),
          y: Math.random(),
          z: 0.4 + Math.random() * 0.8,
          r: 1.5 + Math.random() * 2.5,
          vx: (Math.random() - 0.5) * 0.00025,
          vy: -0.00015 - Math.random() * 0.00025
        });
      }
    }

    this.startSpaceAnimation();
  },

  resizeSpaceCanvas() {
    if (!this.spaceCanvas) return;
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.spaceCanvas.width = w * dpr;
    this.spaceCanvas.height = h * dpr;
    this.spaceCanvas.style.width = `${w}px`;
    this.spaceCanvas.style.height = `${h}px`;

    if (this.spaceCtx) {
      this.spaceCtx.setTransform(1, 0, 0, 1, 0, 0);
      this.spaceCtx.scale(dpr, dpr);
    }
  },

  startSpaceAnimation() {
    if (this.spaceAnimId) return;
    const loop = () => {
      this.renderAmbientSpace();
      this.spaceAnimId = requestAnimationFrame(loop);
    };
    this.spaceAnimId = requestAnimationFrame(loop);
  },

  stopSpaceAnimation() {
    if (this.spaceAnimId) {
      cancelAnimationFrame(this.spaceAnimId);
      this.spaceAnimId = null;
    }
  },

  renderAmbientSpace() {
    if (!this.spaceCanvas || !this.spaceCtx) return;
    const w = window.innerWidth || 1280;
    const h = window.innerHeight || 720;
    const ctx = this.spaceCtx;
    ctx.clearRect(0, 0, w, h);

    // Smooth camera parallax
    this.globalMouse.x += (this.globalMouse.targetX - this.globalMouse.x) * 0.06;
    this.globalMouse.y += (this.globalMouse.targetY - this.globalMouse.y) * 0.06;

    const isDark = this.isDarkTheme();

    // 1. Render floating 3D dust particles
    for (let i = 0; i < this.spaceDust.length; i++) {
      const p = this.spaceDust[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -0.05) p.y = 1.05;
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;

      const px = p.x * w - this.globalMouse.x * 24 * p.z;
      const py = p.y * h - this.globalMouse.y * 24 * p.z;

      ctx.beginPath();
      ctx.arc(px, py, p.r * p.z, 0, Math.PI * 2);
      ctx.fillStyle = isDark
        ? `rgba(99, 102, 241, ${(0.22 * p.z).toFixed(2)})`
        : `rgba(37, 99, 235, ${(0.14 * p.z).toFixed(2)})`;
      ctx.fill();
    }

    // 2. Render rotating 3D wireframe octahedrons
    for (let s = 0; s < this.spaceShapes.length; s++) {
      const shape = this.spaceShapes[s];
      shape.ax += shape.speedX;
      shape.ay += shape.speedY;

      const cx = shape.cxRatio * w - this.globalMouse.x * 36;
      const cy = shape.cyRatio * h - this.globalMouse.y * 36;

      const cosX = Math.cos(shape.ax);
      const sinX = Math.sin(shape.ax);
      const cosY = Math.cos(shape.ay);
      const sinY = Math.sin(shape.ay);

      const projected = shape.vertices.map(v => {
        const vx = v[0] * shape.size;
        const vy = v[1] * shape.size;
        const vz = v[2] * shape.size;

        const x1 = vx * cosY - vz * sinY;
        const z1 = vz * cosY + vx * sinY;
        const y2 = vy * cosX - z1 * sinX;
        const z2 = z1 * cosX + vy * sinX;

        const scale = 300 / (300 + z2);
        return [cx + x1 * scale, cy + y2 * scale];
      });

      ctx.lineWidth = 1.1;
      ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.18)' : 'rgba(37, 99, 235, 0.11)';
      ctx.beginPath();
      for (let e = 0; e < shape.edges.length; e++) {
        const [a, b] = shape.edges[e];
        ctx.moveTo(projected[a][0], projected[a][1]);
        ctx.lineTo(projected[b][0], projected[b][1]);
      }
      ctx.stroke();

      // Vertices dots
      ctx.fillStyle = isDark ? 'rgba(167, 139, 250, 0.32)' : 'rgba(37, 99, 235, 0.2)';
      for (let v = 0; v < projected.length; v++) {
        ctx.beginPath();
        ctx.arc(projected[v][0], projected[v][1], 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
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
