/**
 * Timer Module - Countdown with localStorage persistence
 * Solves F5 refresh issue - timer continues from where it left off
 */
const Timer = {
  duration: 0,
  remaining: 0,
  startTime: null,
  interval: null,
  onTick: null,
  onExpire: null,
  STORAGE_KEY: 'quiz_timer',

  /**
   * Initialize timer
   * @param {number} minutes - Duration in minutes
   * @param {function} onTick - Callback on every tick
   * @param {function} onExpire - Callback when timer expires
   */
  init(minutes, onTick, onExpire) {
    this.duration = minutes * 60;
    this.onTick = onTick;
    this.onExpire = onExpire;

    // Check for existing session
    const saved = this.loadState();

    if (saved && saved.duration === this.duration) {
      // Restore from localStorage
      this.remaining = saved.remaining;
      this.startTime = saved.startTime;
    } else {
      // Start fresh
      this.remaining = this.duration;
      this.startTime = Date.now();
    }

    this.start();
  },

  /**
   * Save state to localStorage
   */
  saveState() {
    const state = {
      duration: this.duration,
      remaining: this.remaining,
      startTime: this.startTime
    };
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  },

  /**
   * Load state from localStorage
   */
  loadState() {
    try {
      const saved = sessionStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;

      const state = JSON.parse(saved);
      // Recalculate remaining time based on actual elapsed time
      const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
      state.remaining = Math.max(0, state.duration - elapsed);

      return state;
    } catch (e) {
      return null;
    }
  },

  /**
   * Start the timer
   */
  start() {
    if (this.interval) clearInterval(this.interval);

    // Update immediately
    this.updateDisplay();

    this.interval = setInterval(() => {
      this.remaining--;
      this.updateDisplay();
      this.saveState();

      if (this.remaining <= 0) {
        this.stop();
        if (this.onExpire) this.onExpire();
      }
    }, 1000);
  },

  /**
   * Stop the timer
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  },

  /**
   * Update display
   */
  updateDisplay() {
    const minutes = Math.floor(this.remaining / 60);
    const seconds = this.remaining % 60;
    const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    if (this.onTick) this.onTick(display, this.remaining);
  },

  /**
   * Clear saved state
   */
  clearState() {
    sessionStorage.removeItem(this.STORAGE_KEY);
  },

  /**
   * Get time used in seconds
   */
  getTimeUsed() {
    if (!this.startTime) return 0;
    return this.duration - this.remaining;
  },

  /**
   * Format seconds to MM:SS
   */
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Timer;
}
