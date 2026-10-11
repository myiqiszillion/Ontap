/**
 * NTMK State Management & Profile Store
 * Manages UserProfile, Onboarding persistence, and Learning History
 */

const ProfileStore = {
  PROFILE_KEY: 'ntmk_user_profile_v1',
  HISTORY_KEY: 'ntmk_exam_history_v1',
  THEME_KEY: 'ntmk_theme_v1',

  GOAL_META: {
    score_8_plus: {
      id: 'score_8_plus',
      title: 'Đạt điểm 8+ trên lớp',
      desc: 'Nắm vững kiến thức SGK, chinh phục bài kiểm tra định kỳ',
      icon: '🎯'
    },
    graduation_pass: {
      id: 'graduation_pass',
      title: 'Tốt nghiệp THPT vững vàng',
      desc: 'Bám sát cấu trúc đề thi QĐ 764/QĐ-BGDĐT mới nhất',
      icon: '🎓'
    },
    university_exam: {
      id: 'university_exam',
      title: 'Luyện thi ĐGNL & Đại học',
      desc: 'Luyện đề nâng cao, tư duy giải nhanh và phản xạ',
      icon: '🚀'
    },
    quick_review: {
      id: 'quick_review',
      title: 'Củng cố kiến thức cấp tốc',
      desc: 'Ôn tập nhanh lý thuyết cốt lõi và dạng bài cơ bản',
      icon: '⚡'
    }
  },

  listeners: [],

  /**
   * Subscribe to state changes
   */
  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  },

  notify(event, data) {
    this.listeners.forEach(fn => {
      try { fn(event, data); } catch (e) { console.error('Store listener error:', e); }
    });
  },

  /**
   * Get current user profile
   */
  getProfile() {
    try {
      const raw = localStorage.getItem(this.PROFILE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse profile:', e);
      return null;
    }
  },

  /**
   * Check if onboarding is completed
   */
  hasCompletedOnboarding() {
    const profile = this.getProfile();
    return Boolean(profile && profile.onboardingCompleted);
  },

  /**
   * Save user profile
   */
  saveProfile(profileData) {
    const current = this.getProfile() || {};
    const updated = {
      ...current,
      ...profileData,
      onboardingCompleted: true,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this.PROFILE_KEY, JSON.stringify(updated));
    this.notify('profile_updated', updated);
    return updated;
  },

  /**
   * Reset profile (re-trigger onboarding)
   */
  resetProfile() {
    localStorage.removeItem(this.PROFILE_KEY);
    this.notify('profile_reset', null);
  },

  /**
   * Get learning history
   */
  getHistory() {
    try {
      const raw = localStorage.getItem(this.HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Record a completed test or session
   */
  recordSession(session) {
    const history = this.getHistory();
    if (session.id) { const existing = history.find(entry=>entry.id === session.id); if (existing) return existing; }
    const entry = {
      id: session.id || 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      subjectId: session.subjectId,
      subjectName: session.subjectName || session.subjectId,
      score: session.score,
      total: session.total,
      percentage: session.total > 0 ? Math.round((session.score / session.total) * 100) : 0,
      mode: session.mode || 'exam',
      timeSpentSeconds: session.timeSpentSeconds || 0,
      timestamp: new Date().toISOString()
    };
    history.unshift(entry);
    // Keep last 50 attempts
    const trimmed = history.slice(0, 50);
    localStorage.setItem(this.HISTORY_KEY, JSON.stringify(trimmed));
    this.notify('session_recorded', entry);
    return entry;
  },

  /**
   * Get real aggregated learning metrics (No fake stats)
   */
  getMetrics() {
    const history = this.getHistory();
    if (history.length === 0) {
      return {
        totalSessions: 0,
        averagePercentage: null,
        totalTimeMinutes: 0,
        hasActivity: false
      };
    }

    const totalSessions = history.length;
    const totalScore = history.reduce((sum, item) => sum + (item.percentage || 0), 0);
    const averagePercentage = Math.round(totalScore / totalSessions);
    const totalTimeSeconds = history.reduce((sum, item) => sum + (item.timeSpentSeconds || 0), 0);
    const totalTimeMinutes = Math.round(totalTimeSeconds / 60);

    return {
      totalSessions,
      averagePercentage,
      totalTimeMinutes,
      hasActivity: true
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProfileStore;
}
