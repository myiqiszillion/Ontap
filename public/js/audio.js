/**
 * SoundFX - Native Web Audio API Sound Effects (Zero external audio files needed)
 * Provides subtle, satisfying auditory feedback for learning interactions
 */
const SoundFX = {
  ctx: null,
  enabled: true,

  init() {
    const saved = localStorage.getItem('ntmk_sound_enabled');
    this.enabled = saved !== null ? saved === 'true' : true;
    this.updateToggleBtn();
  },

  getAudioContext() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  },

  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('ntmk_sound_enabled', String(this.enabled));
    this.updateToggleBtn();
    if (this.enabled) {
      this.playClick();
    }
  },

  updateToggleBtn() {
    const btn = document.getElementById('sound-toggle-btn');
    if (btn) {
      if (typeof Icons !== 'undefined' && Icons.get) {
        btn.innerHTML = this.enabled ? Icons.get('volume-2', { size: 18 }) : Icons.get('volume-x', { size: 18 });
      } else {
        btn.innerHTML = this.enabled ? '🔊' : '🔇';
      }
      btn.title = this.enabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt';
      btn.classList.toggle('muted', !this.enabled);
    }
  },

  // Crisp, tactile mechanical switch sound ("thock")
  playClick() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch (e) {}
  },

  // Pleasant ascending chime for correct answer
  playCorrect() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.12, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.25);
      });
    } catch (e) {}
  },

  // Soft low thud for incorrect answer
  playWrong() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [311.13, 293.66].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.14, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.22);
      });
    } catch (e) {}
  },

  // Victory Fanfare
  playVictory() {
    if (!this.enabled) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [
        { f: 523.25, d: 0.12 },
        { f: 659.25, d: 0.12 },
        { f: 783.99, d: 0.12 },
        { f: 1046.50, d: 0.35 }
      ];
      let t = ctx.currentTime;
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, t);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + n.d);
        t += n.d;
      });
    } catch (e) {}
  }
};

if (typeof window !== 'undefined') {
  window.SoundFX = SoundFX;
}
