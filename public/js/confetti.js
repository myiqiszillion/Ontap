/**
 * NTMK Lightweight Canvas Confetti Engine
 * Zero-dependency celebratory confetti particles for high exam scores
 */

const Confetti = {
  canvas: null,
  ctx: null,
  particles: [],
  animationId: null,

  init() {
    if (typeof document === 'undefined') return;
    if (this.canvas) return;

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'confetti-canvas';
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '999999';
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    window.addEventListener('resize', () => this.resize());
    this.resize();
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
    this.canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
    if (this.ctx) {
      this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    }
  },

  fire(durationMs = 3000) {
    this.init();
    if (!this.canvas || !this.ctx) return;

    const colors = ['#f59e0b', '#d97706', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ef4444'];
    const count = 100;

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
        y: window.innerHeight * 0.4 + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 18,
        vy: -Math.random() * 14 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        alpha: 1,
        gravity: 0.35,
        drag: 0.96
      });
    }

    if (!this.animationId) {
      const startTime = Date.now();
      const loop = () => {
        this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= p.drag;
          p.rotation += p.rSpeed;

          if (Date.now() - startTime > durationMs - 1000) {
            p.alpha -= 0.02;
          }

          if (p.alpha <= 0 || p.y > window.innerHeight) {
            this.particles.splice(i, 1);
            continue;
          }

          this.ctx.save();
          this.ctx.globalAlpha = Math.max(0, p.alpha);
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate((p.rotation * Math.PI) / 180);
          this.ctx.fillStyle = p.color;
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          this.ctx.restore();
        }

        if (this.particles.length > 0) {
          this.animationId = requestAnimationFrame(loop);
        } else {
          this.ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
          this.animationId = null;
        }
      };

      this.animationId = requestAnimationFrame(loop);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Confetti;
}
