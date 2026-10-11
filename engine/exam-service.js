const crypto = require('crypto');
const path = require('path');
const LocalState = require('./storage/local-state.js');
const Schema = require('./schema.js');
const Scoring = require('./scoring.js');
const Blueprint = require('./blueprint-generator.js');

class ExamService {
  constructor(bank, filename = process.env.NTMK_EXAM_PATH || path.join(process.cwd(), '.ntmk', 'exam-sessions.json'), options = {}) {
    this.bank = bank;
    this.storageAdapter = options.storageAdapter || bank?.storageAdapter || null;
    if (!this.storageAdapter) {
      this.store = new LocalState(filename);
    }
  }

  start(subjectId, grade) {
    if (!['toan', 'vatli', 'hoahoc', 'tienganh'].includes(subjectId) || ![10, 11, 12].includes(grade)) {
      throw new Error('Invalid subject or grade');
    }
    const pool = this.bank.query({
      subjectId,
      grade,
      status: 'published',
      verificationStatus: 'verified',
      limit: 100000
    }).questions.filter(q => q.source?.permissionApproved && q.source?.licenseEvidence && q.source?.verificationEvidence);

    const exam = Blueprint.assembleExam(pool, subjectId);
    if (!exam.questions.length) throw new Error('Insufficient verified published data');

    const id = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const startedAt = Date.now();
    const expiresAt = startedAt + exam.durationMinutes * 60000;

    const session = {
      id,
      tokenHash,
      subjectId,
      grade,
      questions: exam.questions,
      startedAt,
      expiresAt,
      result: null
    };

    if (this.storageAdapter) {
      if (typeof this.storageAdapter.saveExamSession === 'function') {
        const res = this.storageAdapter.saveExamSession(session);
        if (res && typeof res.then === 'function') res.catch(console.warn);
      }
      return {
        sessionId: id,
        token,
        expiresAt,
        examType: exam.hasShortage ? 'practice_quiz' : 'blueprint_format',
        shortages: exam.shortages,
        questions: exam.questions.map(q => Schema.sanitizeForStudent(q))
      };
    }

    const sessions = this.store.read({});
    sessions[id] = session;
    this.store.write(sessions);
    return {
      sessionId: id,
      token,
      expiresAt,
      examType: exam.hasShortage ? 'practice_quiz' : 'blueprint_format',
      shortages: exam.shortages,
      questions: exam.questions.map(q => Schema.sanitizeForStudent(q))
    };
  }

  submit({ sessionId, token, userAnswers }) {
    if (typeof sessionId !== 'string' || typeof token !== 'string' || !userAnswers || typeof userAnswers !== 'object' || Array.isArray(userAnswers)) {
      throw new Error('Invalid submission');
    }
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    if (this.storageAdapter) {
      // 1. Check if already submitted (Database idempotency boundary)
      let existingResult = null;
      if (typeof this.storageAdapter.getExamResult === 'function') {
        const res = this.storageAdapter.getExamResult(sessionId);
        if (res && typeof res.then !== 'function') {
          existingResult = res;
        }
      }
      if (!existingResult && this.storageAdapter.tables?.ntmk_exam_results) {
        existingResult = this.storageAdapter.tables.ntmk_exam_results.get(sessionId);
      }
      if (existingResult) {
        return existingResult.result || existingResult;
      }

      // 2. Fetch session
      let session = null;
      if (typeof this.storageAdapter.getExamSession === 'function') {
        const res = this.storageAdapter.getExamSession(sessionId);
        if (res && typeof res.then !== 'function') {
          session = res;
        }
      }
      if (!session && this.storageAdapter.tables?.ntmk_exam_sessions) {
        session = this.storageAdapter.tables.ntmk_exam_sessions.get(sessionId);
      }

      if (!session || hash !== session.tokenHash) throw new Error('Unauthorized session');
      if (session.result) return session.result;
      if (Date.now() > session.expiresAt) throw new Error('Session expired');
      if (Object.keys(userAnswers).some(k => !session.questions.some((q, i) => k === q.id || k === String(i)))) {
        throw new Error('Unknown answer key');
      }

      const answers = {};
      session.questions.forEach((q, i) => {
        const a = userAnswers[q.id] ?? userAnswers[i];
        if (a === undefined) return;
        if (q.format === 'multiple_choice' && (!Number.isInteger(a) || a < 0 || a > 3)) throw new Error('Invalid MCQ answer');
        if (q.format === 'short_answer' && (typeof a !== 'string' || a.length > 500)) throw new Error('Invalid short answer');
        if (q.format === 'true_false_group' && (!a || typeof a !== 'object' || Object.values(a).some(v => typeof v !== 'boolean'))) {
          throw new Error('Invalid statement answer');
        }
        answers[q.id] = a;
      });

      const scored = Scoring.scoreExam(session.questions, answers, session.subjectId);
      const computedResult = {
        sessionId,
        rawScore: scored.rawScore,
        maxScore: scored.maxScore,
        scaledScore: scored.scaledScore,
        examType: scored.examType,
        submittedAt: new Date().toISOString()
      };

      let saved = computedResult;
      if (typeof this.storageAdapter.saveExamResult === 'function') {
        const saveRes = this.storageAdapter.saveExamResult(sessionId, computedResult);
        if (saveRes && typeof saveRes.then === 'function') {
          saveRes.catch(err => console.warn('Async exam result save error:', err.message));
        } else if (saveRes) {
          saved = saveRes.result || saveRes;
        }
      }
      session.result = saved;
      return saved;
    }

    const sessions = this.store.read({});
    const session = sessions[sessionId];
    if (!session || hash !== session.tokenHash) throw new Error('Unauthorized session');
    if (session.result) return session.result;
    if (Date.now() > session.expiresAt) throw new Error('Session expired');
    if (Object.keys(userAnswers).some(k => !session.questions.some((q, i) => k === q.id || k === String(i)))) {
      throw new Error('Unknown answer key');
    }

    const answers = {};
    session.questions.forEach((q, i) => {
      const a = userAnswers[q.id] ?? userAnswers[i];
      if (a === undefined) return;
      if (q.format === 'multiple_choice' && (!Number.isInteger(a) || a < 0 || a > 3)) throw new Error('Invalid MCQ answer');
      if (q.format === 'short_answer' && (typeof a !== 'string' || a.length > 500)) throw new Error('Invalid short answer');
      if (q.format === 'true_false_group' && (!a || typeof a !== 'object' || Object.values(a).some(v => typeof v !== 'boolean'))) {
        throw new Error('Invalid statement answer');
      }
      answers[q.id] = a;
    });

    const scored = Scoring.scoreExam(session.questions, answers, session.subjectId);
    session.result = {
      sessionId,
      rawScore: scored.rawScore,
      maxScore: scored.maxScore,
      scaledScore: scored.scaledScore,
      examType: scored.examType,
      submittedAt: new Date().toISOString()
    };
    this.store.write(sessions);
    return session.result;
  }

  async submitAsync({ sessionId, token, userAnswers }) {
    if (typeof sessionId !== 'string' || typeof token !== 'string' || !userAnswers || typeof userAnswers !== 'object' || Array.isArray(userAnswers)) {
      throw new Error('Invalid submission');
    }
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    if (this.storageAdapter) {
      let existingResult = null;
      if (typeof this.storageAdapter.getExamResult === 'function') {
        existingResult = await this.storageAdapter.getExamResult(sessionId);
      }
      if (!existingResult && this.storageAdapter.tables?.ntmk_exam_results) {
        existingResult = this.storageAdapter.tables.ntmk_exam_results.get(sessionId);
      }
      if (existingResult) {
        return existingResult.result || existingResult;
      }

      let session = null;
      if (typeof this.storageAdapter.getExamSession === 'function') {
        session = await this.storageAdapter.getExamSession(sessionId);
      }
      if (!session && this.storageAdapter.tables?.ntmk_exam_sessions) {
        session = this.storageAdapter.tables.ntmk_exam_sessions.get(sessionId);
      }

      if (!session || hash !== session.tokenHash) throw new Error('Unauthorized session');
      if (session.result) return session.result;
      if (Date.now() > session.expiresAt) throw new Error('Session expired');
      if (Object.keys(userAnswers).some(k => !session.questions.some((q, i) => k === q.id || k === String(i)))) {
        throw new Error('Unknown answer key');
      }

      const answers = {};
      session.questions.forEach((q, i) => {
        const a = userAnswers[q.id] ?? userAnswers[i];
        if (a === undefined) return;
        if (q.format === 'multiple_choice' && (!Number.isInteger(a) || a < 0 || a > 3)) throw new Error('Invalid MCQ answer');
        if (q.format === 'short_answer' && (typeof a !== 'string' || a.length > 500)) throw new Error('Invalid short answer');
        if (q.format === 'true_false_group' && (!a || typeof a !== 'object' || Object.values(a).some(v => typeof v !== 'boolean'))) {
          throw new Error('Invalid statement answer');
        }
        answers[q.id] = a;
      });

      const scored = Scoring.scoreExam(session.questions, answers, session.subjectId);
      const computedResult = {
        sessionId,
        rawScore: scored.rawScore,
        maxScore: scored.maxScore,
        scaledScore: scored.scaledScore,
        examType: scored.examType,
        submittedAt: new Date().toISOString()
      };

      let saved = computedResult;
      if (typeof this.storageAdapter.saveExamResult === 'function') {
        const saveRes = await this.storageAdapter.saveExamResult(sessionId, computedResult);
        if (saveRes) saved = saveRes.result || saveRes;
      }
      session.result = saved;
      return saved;
    }

    return this.submit({ sessionId, token, userAnswers });
  }
}

module.exports = ExamService;
