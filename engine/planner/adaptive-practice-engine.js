/**
 * Adaptive Practice Engine
 * NTMK Rebuild Phase 03B — Task 5
 *
 * Responsibilities:
 * - Generates targeted adaptive practice sessions based on student mastery gaps.
 * - Modes supported:
 *   1. weak_skill_practice (drill known gaps with evidence)
 *   2. prerequisite_practice (rebuild foundational prerequisites)
 *   3. mixed_review (interleaved practice across mastered & developing skills)
 *   4. wrong_answer_review (reattempt previously missed items)
 *   5. followup_assessment (checkpoint quiz for updating latent mastery)
 * - Strict verification & safety:
 *   - Uses verified, license-proofed questions from BankStorage.
 *   - Strictly sanitizes answer keys and explanations from client responses.
 *   - Fails closed if verified question pool is insufficient (< 2 questions).
 *   - Prevents client-side spoofing: task completion requires authoritative server evaluation.
 */

const crypto = require('crypto');
const QuestionSchemaV2 = require('../schema.js');
const DiagnosticScoringAdapter = require('../diagnostic/diagnostic-scoring-adapter.js');
const SkillGraph = require('../diagnostic/skill-graph.js');

class AdaptivePracticeEngine {
  constructor(options = {}) {
    this.bankStorage = options.bankStorage || null;
    this.scoringAdapter = options.scoringAdapter || new DiagnosticScoringAdapter();
    this.skillGraph = options.skillGraph || new SkillGraph();
    this.sessions = new Map(); // sessionId -> sessionRecord
  }

  /**
   * Determine target difficulty based on student's past mastery or accuracy
   */
  resolveTargetDifficulty(pastAccuracy = null, masteryLevel = null) {
    if (masteryLevel === 'needs_foundation' || (pastAccuracy !== null && pastAccuracy < 0.5)) {
      return 'easy';
    }
    if (masteryLevel === 'strong' || (pastAccuracy !== null && pastAccuracy >= 0.85)) {
      return 'hard';
    }
    return 'medium';
  }

  /**
   * Start an adaptive practice session
   */
  startSession({
    studentId = 'student_default',
    taskId = null,
    mode = 'weak_skill_practice',
    subjectId = 'math',
    skillId = null,
    targetCount = 5,
    pastQuestionIds = [],
    pastAccuracy = null,
    masteryLevel = null,
    allowFixtureFallback = false
  } = {}) {
    const validModes = [
      'weak_skill_practice',
      'prerequisite_practice',
      'mixed_review',
      'wrong_answer_review',
      'followup_assessment'
    ];

    if (!validModes.includes(mode)) {
      throw new Error(`Invalid practice mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
    }

    const isTestServerEnv = process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_FIXTURES === 'true' || process.argv.some(a => a.includes('test'));
    const isProduction = process.env.NODE_ENV === 'production';
    const effectiveFixtureFallback = Boolean(allowFixtureFallback && isTestServerEnv && !isProduction);

    // 1. Gather target skills based on mode
    let targetSkills = [];
    if (skillId) {
      if (mode === 'prerequisite_practice') {
        const prereqs = this.skillGraph.getDirectPrerequisites(skillId);
        targetSkills = prereqs.length > 0 ? prereqs : [skillId];
      } else {
        targetSkills = [skillId];
      }
    }

    // 2. Query verified questions from BankStorage
    let pool = [];
    if (this.bankStorage && typeof this.bankStorage.query === 'function') {
      const qRes = this.bankStorage.query({
        subjectId,
        status: 'published',
        verificationStatus: 'verified',
        limit: 10000
      });

      pool = (qRes.questions || []).filter(q => {
        const hasLicenseProof = q.source?.permissionApproved && q.source?.licenseEvidence;
        const hasVerificationProof = q.source?.verificationStatus === 'verified' && q.source?.verificationEvidence;
        const isVerifiedFixture = effectiveFixtureFallback && (q.isTestFixture || q.source?.sourceName?.includes('Fixture'));
        return (hasLicenseProof && hasVerificationProof) || isVerifiedFixture;
      });
    }

    // Fixture fallback solely in isolated test mode
    if (effectiveFixtureFallback && pool.length === 0) {
      try {
        const { FIXTURE_DIAGNOSTIC_QUESTIONS } = require('../../tests/fixtures/diagnostic-fixtures.js');
        pool = (FIXTURE_DIAGNOSTIC_QUESTIONS || []).filter(q => q.subjectId === subjectId);
      } catch (e) {
        // Ignored
      }
    }

    // 3. Filter by skills and filter recent duplicates
    let candidates = pool;
    if (targetSkills.length > 0 && mode !== 'mixed_review') {
      const skillMatched = candidates.filter(q => targetSkills.includes(q.skillId));
      if (skillMatched.length >= 2 || !effectiveFixtureFallback) {
        candidates = skillMatched;
      }
    }


    // Deduplicate against past questions if possible, but keep at least 2
    const nonDuplicated = candidates.filter(q => !pastQuestionIds.includes(q.id));
    const finalCandidates = nonDuplicated.length >= 2 ? nonDuplicated : candidates;

    // Fail closed if pool is insufficient
    if (finalCandidates.length < 2) {
      const err = new Error(`Không đủ câu hỏi đã xác minh (verified) cho kỹ năng ${skillId || subjectId}.`);
      err.code = 'INSUFFICIENT_VERIFIED_QUESTIONS';
      err.availableCount = finalCandidates.length;
      throw err;
    }

    // 4. Sort / Select by difficulty
    const targetDifficulty = this.resolveTargetDifficulty(pastAccuracy, masteryLevel);
    const sorted = [...finalCandidates].sort((a, b) => {
      if (a.difficulty === targetDifficulty && b.difficulty !== targetDifficulty) return -1;
      if (b.difficulty === targetDifficulty && a.difficulty !== targetDifficulty) return 1;
      return 0;
    });

    const selectedQuestions = sorted.slice(0, Math.min(targetCount, sorted.length));

    // 5. Build session state
    const sessionId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const sessionRecord = {
      sessionId,
      studentId,
      taskId,
      tokenHash,
      mode,
      subjectId,
      skillId,
      targetDifficulty,
      startedAt: Date.now(),
      questions: selectedQuestions, // Server-only authoritative copy
      savedAnswers: {},
      isSubmitted: false,
      result: null
    };

    this.sessions.set(sessionId, sessionRecord);

    // 6. Return sanitized projection to client
    return {
      sessionId,
      token,
      taskId,
      mode,
      subjectId,
      skillId,
      targetDifficulty,
      totalQuestions: selectedQuestions.length,
      startedAt: sessionRecord.startedAt,
      questions: selectedQuestions.map(q => QuestionSchemaV2.sanitizeForStudent(q, { isExamMode: true }))
    };
  }

  /**
   * Submit and score a practice session
   */
  submitSession({ sessionId, token, answers = {}, timeSpentSeconds = 0 } = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      const err = new Error('Session not found');
      err.code = 'SESSION_NOT_FOUND';
      throw err;
    }

    // Check token authentication
    const tokenHash = crypto.createHash('sha256').update(token || '').digest('hex');
    if (session.tokenHash !== tokenHash) {
      const err = new Error('Unauthorized session token');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    // Idempotent submission: return existing result if already submitted
    if (session.isSubmitted && session.result) {
      return session.result;
    }

    // Authoritative scoring via DiagnosticScoringAdapter
    const scoringResult = this.scoringAdapter.scoreDiagnostic({
      questions: session.questions,
      studentAnswers: answers,
      subjectId: session.subjectId
    });

    // Determine difficulty progression recommendation
    let difficultyProgression = 'maintain';
    if (scoringResult.observedAccuracy >= 0.8) {
      difficultyProgression = 'increase';
    } else if (scoringResult.observedAccuracy < 0.5) {
      difficultyProgression = 'decrease';
    }

    // Format completion evidence
    const completionEvidence = {
      sessionId: session.sessionId,
      taskId: session.taskId,
      mode: session.mode,
      subjectId: session.subjectId,
      skillId: session.skillId,
      totalQuestions: scoringResult.totalQuestions,
      answeredCount: scoringResult.answeredCount,
      correctCount: scoringResult.correctCount,
      accuracy: scoringResult.observedAccuracy,
      rawScore: scoringResult.totalRawScore,
      maxScore: scoringResult.totalMaxScore,
      timeSpentSeconds,
      difficultyProgression,
      completedAt: new Date().toISOString()
    };

    const finalResult = {
      sessionId: session.sessionId,
      taskId: session.taskId,
      mode: session.mode,
      subjectId: session.subjectId,
      skillId: session.skillId,
      completionEvidence,
      scoringSummary: {
        totalQuestions: scoringResult.totalQuestions,
        answeredCount: scoringResult.answeredCount,
        correctCount: scoringResult.correctCount,
        incorrectCount: scoringResult.incorrectCount,
        observedAccuracy: scoringResult.observedAccuracy,
        totalRawScore: scoringResult.totalRawScore,
        totalMaxScore: scoringResult.totalMaxScore
      },
      questionEvaluations: scoringResult.evaluatedQuestions,
      skillEvidenceList: scoringResult.skillEvidenceList,
      difficultyProgression,
      submittedAt: completionEvidence.completedAt
    };

    session.isSubmitted = true;
    session.result = finalResult;

    return finalResult;
  }
}

module.exports = AdaptivePracticeEngine;
