/**
 * Diagnostic Assessment Engine (Unified Facade)
 * NTMK Rebuild Phase 03A — Task 2, Task 7
 *
 * Responsibilities:
 * - High-level orchestrator connecting all diagnostic domain services.
 * - Decoupled from UI and DOM: runs on Node.js server, Express, and Serverless.
 * - Provides end-to-end APIs for starting, saving, resuming, scoring, and analyzing diagnostics.
 */

const CurriculumRepository = require('./curriculum-repository.js');
const SkillGraph = require('./skill-graph.js');
const DiagnosticBlueprintBuilder = require('./diagnostic-blueprint-builder.js');
const DiagnosticQuestionSelector = require('./diagnostic-question-selector.js');
const DiagnosticSessionManager = require('./diagnostic-session-manager.js');
const DiagnosticScoringAdapter = require('./diagnostic-scoring-adapter.js');
const SkillEvidenceAggregator = require('./skill-evidence-aggregator.js');
const SkillMasteryEstimator = require('./skill-mastery-estimator.js');
const KnowledgeGapAnalyzer = require('./knowledge-gap-analyzer.js');
const DiagnosticReportBuilder = require('./diagnostic-report-builder.js');

class DiagnosticAssessmentEngine {
  constructor(options = {}) {
    this.bank = options.bankStorage || null;
    this.storageAdapter = options.storageAdapter || null;

    this.curriculumRepo = options.curriculumRepository || new CurriculumRepository();
    this.skillGraph = options.skillGraph || new SkillGraph(this.curriculumRepo);
    this.blueprintBuilder = new DiagnosticBlueprintBuilder(this.curriculumRepo, this.skillGraph);
    this.questionSelector = new DiagnosticQuestionSelector(this.bank);
    this.sessionManager = new DiagnosticSessionManager({ storageAdapter: this.storageAdapter });
    this.scoringAdapter = new DiagnosticScoringAdapter();
    this.masteryEstimator = new SkillMasteryEstimator();
    this.gapAnalyzer = new KnowledgeGapAnalyzer(this.skillGraph);

    // In-memory student evidence cache across sessions
    this.studentEvidenceStore = new Map(); // studentId -> Array of evidence records
  }

  /**
   * Check if the question bank has sufficient verified questions to launch an assessment
   */
  checkReadiness({ subjectId, grade = 10, assessmentType = 'grade_diagnostic', targetQuestionCount = 20, allowFixtureFallback = false } = {}) {
    let blueprint;
    if (assessmentType === 'graduation_readiness') {
      blueprint = this.blueprintBuilder.buildGraduationReadinessBlueprint({ subjectId, targetQuestionCount });
    } else {
      blueprint = this.blueprintBuilder.buildGradeBlueprint({ subjectId, grade, targetQuestionCount });
    }

    const selection = this.questionSelector.selectQuestions(blueprint, { allowFixtureFallback });
    return {
      ready: selection.ready,
      assessmentType,
      subjectId,
      grade: blueprint.grade,
      totalQuestions: blueprint.totalQuestions,
      shortages: selection.shortages,
      reason: selection.reason,
      disclaimer: blueprint.disclaimer
    };
  }

  /**
   * Start a new diagnostic assessment session
   */
  startAssessment({ subjectId, grade = 10, assessmentType = 'grade_diagnostic', target = 'full_year', studentId = 'anonymous_student', initialRating = null, targetQuestionCount = 20, allowFixtureFallback = false } = {}) {
    let blueprint;
    if (assessmentType === 'graduation_readiness') {
      blueprint = this.blueprintBuilder.buildGraduationReadinessBlueprint({ subjectId, targetQuestionCount });
    } else {
      blueprint = this.blueprintBuilder.buildGradeBlueprint({ subjectId, grade, target, targetQuestionCount });
    }

    const selection = this.questionSelector.selectQuestions(blueprint, { allowFixtureFallback });
    if (!selection.ready && !allowFixtureFallback) {
      const err = new Error(selection.reason);
      err.shortages = selection.shortages;
      err.code = 'INSUFFICIENT_VERIFIED_QUESTIONS';
      throw err;
    }

    return this.sessionManager.startSession({
      blueprint,
      selectedQuestions: selection.selectedQuestions,
      studentId,
      initialRating
    });
  }

  /**
   * Save in-progress student answers
   */
  saveAnswers({ sessionId, token, answers, currentQuestionIndex }) {
    return this.sessionManager.saveAnswers({ sessionId, token, answers, currentQuestionIndex });
  }

  /**
   * Resume an in-progress session
   */
  resumeAssessment({ sessionId, token }) {
    return this.sessionManager.resumeSession({ sessionId, token });
  }

  /**
   * Submit and calculate authoritative diagnostic evaluation
   */
  submitAssessment({ sessionId, token, userAnswers = {} }) {
    const session = this.sessionManager.verifyAndGetSession(sessionId, token);

    // 1. Idempotency check: if session was already submitted, return authoritative stored report
    if (session.isSubmitted && session.result) {
      return session.result;
    }

    // Combine user-provided answers with previously auto-saved answers
    const answersToScore = { ...(session.savedAnswers || {}), ...userAnswers };

    // 2. Score questions server-side
    const scoringResult = this.scoringAdapter.scoreDiagnostic({
      questions: session.questions,
      userAnswers: answersToScore,
      subjectId: session.subjectId
    });

    // 3. Record student evidence history
    const studentId = session.studentId || 'anonymous_student';
    if (!this.studentEvidenceStore.has(studentId)) {
      this.studentEvidenceStore.set(studentId, []);
    }
    const studentHistory = this.studentEvidenceStore.get(studentId);
    studentHistory.push(...scoringResult.skillEvidenceList);

    // 4. Aggregate evidence and estimate skill mastery
    const aggregated = SkillEvidenceAggregator.aggregate(studentHistory);
    const relevantSkills = this.curriculumRepo.querySkills({ subjectId: session.subjectId });
    const masteryMap = this.masteryEstimator.estimateAll(aggregated, relevantSkills);

    // 5. Analyze knowledge gaps
    const gapAnalysis = this.gapAnalyzer.analyzeGaps({
      masteryMap,
      subjectId: session.subjectId,
      targetGrade: session.grade,
      targetGoal: session.target
    });

    // 6. Build final diagnostic report
    const report = DiagnosticReportBuilder.build({
      session,
      scoringResult,
      masteryMap,
      gapAnalysis
    });

    // 7. Commit result to persistent session
    this.sessionManager.commitResult(sessionId, report);

    return report;
  }

  /**
   * Get student mastery profile across curriculum skills
   */
  getStudentMasteryProfile(studentId = 'anonymous_student', subjectId = null) {
    const history = this.studentEvidenceStore.get(studentId) || [];
    const aggregated = SkillEvidenceAggregator.aggregate(history);
    const relevantSkills = this.curriculumRepo.querySkills(subjectId ? { subjectId } : {});
    const masteryMap = this.masteryEstimator.estimateAll(aggregated, relevantSkills);

    return {
      studentId,
      subjectId,
      totalSkills: relevantSkills.length,
      skills: Array.from(masteryMap.values())
    };
  }

  /**
   * Get knowledge gap report for a student
   */
  getKnowledgeGapReport(studentId = 'anonymous_student', subjectId = 'toan', targetGrade = 12) {
    const profile = this.getStudentMasteryProfile(studentId, subjectId);
    const masteryMap = new Map(profile.skills.map(s => [s.skillId, s]));
    return this.gapAnalyzer.analyzeGaps({
      masteryMap,
      subjectId,
      targetGrade
    });
  }
}

module.exports = DiagnosticAssessmentEngine;
