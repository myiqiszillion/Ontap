/**
 * Diagnostic Session Manager
 * NTMK Rebuild Phase 03A — Tasks 2, 7 & 8
 *
 * Responsibilities:
 * - Manage active diagnostic sessions: start, token verification, auto-save answers, reload resume.
 * - Idempotent submission: returns authoritative result if session was already submitted.
 * - Anti-tampering: token hash validation prevents unauthorized access between students.
 * - Works across CloudStorageAdapter, PostgreSQL/Supabase, or LocalState.
 */

const crypto = require('crypto');
const path = require('path');
const LocalState = require('../storage/local-state.js');
const QuestionSchemaV2 = require('../schema.js');

class DiagnosticSessionManager {
  constructor(options = {}) {
    this.storageAdapter = options.storageAdapter || null;
    this.sessionsPath = options.sessionsPath || path.join(process.cwd(), '.ntmk', 'diagnostic-sessions.json');
    this.resultsPath = options.resultsPath || path.join(process.cwd(), '.ntmk', 'diagnostic-results.json');

    if (!this.storageAdapter) {
      this.sessionsStore = new LocalState(this.sessionsPath);
      this.resultsStore = new LocalState(this.resultsPath);
    }

    this.sessionsMap = new Map();
    this.resultsMap = new Map();
  }

  /**
   * Start a new diagnostic assessment session
   */
  startSession({ blueprint, selectedQuestions, studentId = 'anonymous_student', initialRating = null } = {}) {
    if (!blueprint || !Array.isArray(selectedQuestions) || selectedQuestions.length === 0) {
      throw new Error('Blueprint and non-empty selectedQuestions required');
    }

    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const startedAt = Date.now();
    const durationMinutes = blueprint.durationMinutes || 45;
    const expiresAt = startedAt + (durationMinutes * 60 * 1000);

    const sessionRecord = {
      sessionId,
      studentId,
      tokenHash,
      subjectId: blueprint.subjectId,
      grade: blueprint.grade,
      blueprintId: blueprint.blueprintId,
      assessmentType: blueprint.assessmentType,
      target: blueprint.target,
      initialRating,
      startedAt,
      expiresAt,
      durationMinutes,
      questions: selectedQuestions, // Full private questions retained on server
      savedAnswers: {},
      currentQuestionIndex: 0,
      isSubmitted: false,
      result: null,
      createdAt: new Date().toISOString()
    };

    if (this.storageAdapter && typeof this.storageAdapter.saveDiagnosticSession === 'function') {
      this.storageAdapter.saveDiagnosticSession(sessionRecord);
    } else if (this.sessionsStore) {
      const all = this.sessionsStore.read({});
      all[sessionId] = sessionRecord;
      this.sessionsStore.write(all);
    }
    this.sessionsMap.set(sessionId, sessionRecord);

    // Return sanitized projection to student (answer keys & explanations stripped!)
    return {
      sessionId,
      token,
      subjectId: blueprint.subjectId,
      grade: blueprint.grade,
      assessmentType: blueprint.assessmentType,
      target: blueprint.target,
      durationMinutes,
      expiresAt,
      totalQuestions: selectedQuestions.length,
      disclaimer: blueprint.disclaimer,
      questions: selectedQuestions.map(q => QuestionSchemaV2.sanitizeForStudent(q, { isExamMode: true }))
    };
  }

  /**
   * Save in-progress student answers (Auto-save)
   */
  saveAnswers({ sessionId, token, answers, currentQuestionIndex } = {}) {
    const session = this._getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    if (session.tokenHash !== hash) throw new Error('Unauthorized session token');

    if (session.isSubmitted) throw new Error('Session has already been submitted');
    if (Date.now() > session.expiresAt) throw new Error('Session has expired');

    if (answers && typeof answers === 'object') {
      session.savedAnswers = { ...session.savedAnswers, ...answers };
    }
    if (Number.isInteger(currentQuestionIndex)) {
      session.currentQuestionIndex = currentQuestionIndex;
    }
    session.lastSavedAt = new Date().toISOString();

    this._updateSession(session);
    return { success: true, savedAnswersCount: Object.keys(session.savedAnswers).length, lastSavedAt: session.lastSavedAt };
  }

  /**
   * Reload / Resume an in-progress session
   */
  resumeSession({ sessionId, token } = {}) {
    const session = this._getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    if (session.tokenHash !== hash) throw new Error('Unauthorized session token');

    const now = Date.now();
    const remainingTimeSeconds = Math.max(0, Math.round((session.expiresAt - now) / 1000));
    const isExpired = remainingTimeSeconds <= 0;

    return {
      sessionId: session.sessionId,
      subjectId: session.subjectId,
      grade: session.grade,
      assessmentType: session.assessmentType,
      target: session.target,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      remainingTimeSeconds,
      isExpired,
      isSubmitted: session.isSubmitted,
      savedAnswers: session.savedAnswers || {},
      currentQuestionIndex: session.currentQuestionIndex || 0,
      totalQuestions: session.questions.length,
      questions: session.questions.map(q => QuestionSchemaV2.sanitizeForStudent(q, { isExamMode: true })),
      result: session.result
    };
  }

  /**
   * Retrieve session by ID and verify token
   */
  verifyAndGetSession(sessionId, token) {
    const session = this._getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    if (session.tokenHash !== hash) throw new Error('Unauthorized session token');

    return session;
  }

  /**
   * Commit authoritative result to session
   */
  commitResult(sessionId, report) {
    const session = this._getSession(sessionId);
    if (session) {
      session.isSubmitted = true;
      session.result = report;
      this._updateSession(session);
    }

    if (this.storageAdapter && typeof this.storageAdapter.saveDiagnosticResult === 'function') {
      this.storageAdapter.saveDiagnosticResult(sessionId, report);
    } else if (this.resultsStore) {
      const all = this.resultsStore.read({});
      all[sessionId] = report;
      this.resultsStore.write(all);
    }
    this.resultsMap.set(sessionId, report);
    return report;
  }

  getResult(sessionId) {
    if (this.resultsMap.has(sessionId)) return this.resultsMap.get(sessionId);
    if (this.resultsStore) {
      const all = this.resultsStore.read({});
      return all[sessionId] || null;
    }
    return null;
  }

  _getSession(sessionId) {
    if (this.sessionsMap.has(sessionId)) return this.sessionsMap.get(sessionId);
    if (this.sessionsStore) {
      const all = this.sessionsStore.read({});
      const s = all[sessionId];
      if (s) this.sessionsMap.set(sessionId, s);
      return s || null;
    }
    return null;
  }

  _updateSession(session) {
    this.sessionsMap.set(session.sessionId, session);
    if (this.sessionsStore) {
      const all = this.sessionsStore.read({});
      all[session.sessionId] = session;
      this.sessionsStore.write(all);
    }
  }
}

module.exports = DiagnosticSessionManager;
