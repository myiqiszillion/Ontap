/**
 * Exam Session Manager (NTMK Rebuild Phase 02B)
 * Handles Exam lifecycle, answer persistence, reload recovery & idempotent submission protection
 */

const ScoringEngine = require('./scoring.js');

const ExamSessionManager = {
  STORAGE_KEY: 'ntmk_active_exam_session_v2',
  RESULTS_KEY: 'ntmk_exam_results_history_v2',
  isSubmitting: false,

  _getStorage() {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
    return {
      _data: {},
      getItem(k) { return this._data[k] || null; },
      setItem(k, v) { this._data[k] = String(v); },
      removeItem(k) { delete this._data[k]; }
    };
  },

  /**
   * Start a new exam session
   */
  startSession({ subjectId, questions, durationMinutes = 50, mode = 'exam', userId = 'anonymous' }) {
    this.isSubmitting = false;
    const now = Date.now();
    const durationSeconds = durationMinutes * 60;

    const session = {
      id: `ses_${now}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      subjectId,
      mode,
      status: 'in_progress',
      durationMinutes,
      durationSeconds,
      remainingSeconds: durationSeconds,
      startTime: now,
      expiresAt: now + (durationSeconds * 1000),
      currentQuestionIndex: 0,
      questions: questions || [],
      answers: {},
      isSubmitted: false,
      submittedAt: null
    };

    this.saveSession(session);
    return session;
  },

  /**
   * Save session to persistent storage
   */
  saveSession(session) {
    if (!session) return;
    try {
      const storage = this._getStorage();
      storage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn('Failed to save exam session:', e);
    }
  },

  /**
   * Retrieve currently active in-progress session
   */
  getActiveSession() {
    try {
      const storage = this._getStorage();
      const raw = storage.getItem(this.STORAGE_KEY);
      if (!raw) return null;

      const session = JSON.parse(raw);
      if (!session || session.status !== 'in_progress') return null;

      // Recalculate remaining seconds based on real clock elapsed
      if (session.durationSeconds > 0) {
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
        session.remainingSeconds = Math.max(0, session.durationSeconds - elapsed);
      }

      return session;
    } catch (e) {
      console.warn('Failed to parse active session:', e);
      return null;
    }
  },

  /**
   * Record answer for a question
   */
  recordAnswer(questionIndex, answer) {
    const session = this.getActiveSession();
    if (!session) return null;

    session.answers[questionIndex] = answer;
    this.saveSession(session);
    return session;
  },

  /**
   * Update current question index pointer
   */
  updateCurrentIndex(index) {
    const session = this.getActiveSession();
    if (!session) return null;

    session.currentQuestionIndex = index;
    this.saveSession(session);
    return session;
  },

  /**
   * Get past submitted result by sessionId or idempotencyKey
   */
  getStoredResult(key) {
    if (!key) return null;
    try {
      const storage = this._getStorage();
      const raw = storage.getItem(this.RESULTS_KEY);
      if (!raw) return null;
      const resultsMap = JSON.parse(raw);
      return resultsMap[key] || null;
    } catch (e) {
      console.warn('Failed to retrieve stored exam result:', e);
      return null;
    }
  },

  /**
   * Persist submitted result into results storage
   */
  saveStoredResult(key, submissionData) {
    if (!key || !submissionData) return;
    try {
      const storage = this._getStorage();
      const raw = storage.getItem(this.RESULTS_KEY);
      const resultsMap = raw ? JSON.parse(raw) : {};
      resultsMap[key] = submissionData;
      if (submissionData.session && submissionData.session.id) {
        resultsMap[submissionData.session.id] = submissionData;
      }
      storage.setItem(this.RESULTS_KEY, JSON.stringify(resultsMap));
    } catch (e) {
      console.warn('Failed to save exam result to history:', e);
    }
  },

  /**
   * Submit the exam session with anti-duplicate and idempotency guard at results store
   * @param {Object} options - { idempotencyKey, sessionId, useMOETWeights }
   * @returns {{ session: Object, scoreResult: Object, isDuplicate: boolean, idempotent: boolean } | null}
   */
  submitSession(options = {}) {
    const session = this.getActiveSession();
    const targetSessionId = options.sessionId || (session ? session.id : null);
    const idempotencyKey = options.idempotencyKey || targetSessionId;

    // 1. Idempotency Check: Return existing result if already processed
    if (idempotencyKey) {
      const existing = this.getStoredResult(idempotencyKey);
      if (existing) {
        return {
          session: existing.session,
          scoreResult: existing.scoreResult,
          isDuplicate: true,
          idempotent: true
        };
      }
    }

    if (this.isSubmitting) {
      console.warn('Submission already in progress. Checking existing result...');
      if (idempotencyKey) {
        const existing = this.getStoredResult(idempotencyKey);
        if (existing) {
          return {
            session: existing.session,
            scoreResult: existing.scoreResult,
            isDuplicate: true,
            idempotent: true
          };
        }
      }
      return null;
    }

    if (!session) {
      console.warn('No active session to submit.');
      return null;
    }

    if (session.isSubmitted || session.status === 'submitted') {
      const existing = this.getStoredResult(session.id);
      if (existing) {
        return {
          session: existing.session,
          scoreResult: existing.scoreResult,
          isDuplicate: true,
          idempotent: true
        };
      }
      return null;
    }

    try {
      this.isSubmitting = true;

      // Compute score using Subject Scoring Engine
      const scoreResult = ScoringEngine.scoreExam(
        session.questions,
        session.answers,
        session.subjectId,
        options
      );

      session.status = 'submitted';
      session.isSubmitted = true;
      session.submittedAt = Date.now();
      session.timeSpentSeconds = session.durationSeconds > 0 
        ? Math.min(session.durationSeconds, Math.floor((session.submittedAt - session.startTime) / 1000))
        : Math.floor((session.submittedAt - session.startTime) / 1000);

      session.result = scoreResult;

      const submissionPayload = {
        session,
        scoreResult,
        submittedAt: session.submittedAt
      };

      // Idempotent Persistence
      this.saveStoredResult(session.id, submissionPayload);
      if (idempotencyKey && idempotencyKey !== session.id) {
        this.saveStoredResult(idempotencyKey, submissionPayload);
      }

      // Clear active in-progress session from storage so reload doesn't resume it
      const storage = this._getStorage();
      storage.removeItem(this.STORAGE_KEY);

      return {
        session,
        scoreResult,
        isDuplicate: false,
        idempotent: true
      };
    } finally {
      this.isSubmitting = false;
    }
  },

  /**
   * Cancel / Clear active session
   */
  cancelSession() {
    this.isSubmitting = false;
    const storage = this._getStorage();
    storage.removeItem(this.STORAGE_KEY);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExamSessionManager;
}
