/**
 * Diagnostic Scoring Adapter
 * NTMK Rebuild Phase 03A — Task 3
 *
 * Responsibilities:
 * - Evaluate student answers using official ScoringEngine (MOET QĐ 764/QĐ-BGDĐT).
 * - Distinguish:
 *   - Correct answers
 *   - Incorrect answers
 *   - Unanswered questions (skip vs wrong)
 * - Map each question's evaluation to its target skill evidence.
 * - Calculate overall rawScore, maxScore, accuracy, and skill-level evidence records.
 * - Prevent converting raw score to false graduation predicted score.
 */

const ScoringEngine = require('../scoring.js');

class DiagnosticScoringAdapter {
  constructor() {
    this.scoringEngine = ScoringEngine;
  }

  /**
   * Score a diagnostic exam session and extract evidence per skill
   */
  scoreDiagnostic({ questions, userAnswers, subjectId } = {}) {
    if (!Array.isArray(questions) || !questions.length) {
      throw new Error('Questions array required for diagnostic scoring');
    }
    const answers = userAnswers || {};

    let totalRawScore = 0;
    let totalMaxScore = 0;
    let answeredCount = 0;
    let unansweredCount = 0;
    let correctCount = 0;
    let incorrectCount = 0;

    const evaluatedQuestions = [];
    const skillEvidenceList = [];

    const profile = this.scoringEngine.SUBJECT_PROFILES[subjectId] || this.scoringEngine.SUBJECT_PROFILES.default;

    questions.forEach((q, idx) => {
      const qId = q.id;
      const rawAns = answers[qId] !== undefined ? answers[qId] : answers[idx];
      const isAnswered = rawAns !== undefined && rawAns !== null && rawAns !== '';

      let qScore = 0;
      let qMaxScore = 0;
      let isCorrect = false;
      let isPartial = false;
      let details = {};

      if (q.format === 'multiple_choice') {
        qMaxScore = profile.mcqPoints;
        const correctIndex = q.mcqPayload?.correctOptionIndex ?? q.correctOptionIndex ?? q.correctAnswer;
        if (isAnswered) {
          answeredCount++;
          if (Number(rawAns) === Number(correctIndex)) {
            qScore = qMaxScore;
            isCorrect = true;
            correctCount++;
          } else {
            incorrectCount++;
          }
        } else {
          unansweredCount++;
        }
        details = { chosenIndex: rawAns, correctIndex };
      } else if (q.format === 'true_false_group') {
        qMaxScore = profile.tfGroupPoints;
        const stmts = q.tfPayload?.statements || [];
        const numStmts = stmts.length || 4;

        if (isAnswered && typeof rawAns === 'object') {
          answeredCount++;
          let stmtCorrectCount = 0;
          stmts.forEach((stmt, sIdx) => {
            const userChoice = rawAns[stmt.id] ?? rawAns[sIdx];
            if (userChoice !== undefined && userChoice === stmt.correct) {
              stmtCorrectCount++;
            }
          });

          // MOET Part II partial scoring
          qScore = this.scoringEngine.TF_SCORE_TABLE[stmtCorrectCount] || 0;
          if (stmtCorrectCount === numStmts) {
            isCorrect = true;
            correctCount++;
          } else if (stmtCorrectCount > 0) {
            isPartial = true;
            incorrectCount++;
          } else {
            incorrectCount++;
          }
          details = { correctStatements: stmtCorrectCount, totalStatements: numStmts };
        } else {
          unansweredCount++;
        }
      } else if (q.format === 'short_answer') {
        qMaxScore = profile.saPoints;
        const accepted = q.shortAnswerPayload?.acceptedAnswers || [q.shortAnswerPayload?.correctAnswer || q.correctAnswer];
        const policy = q.answerPolicy || {};

        if (isAnswered && typeof rawAns === 'string') {
          answeredCount++;
          const evalResult = this.scoringEngine.evaluateShortAnswer(rawAns, accepted, policy);
          if (evalResult.isCorrect) {
            qScore = qMaxScore;
            isCorrect = true;
            correctCount++;
          } else {
            incorrectCount++;
          }
          details = { rawAnswer: rawAns, acceptedAnswers: accepted, normalizedUser: evalResult.normalizedUser };
        } else {
          unansweredCount++;
        }
      }

      totalRawScore += qScore;
      totalMaxScore += qMaxScore;

      const skillId = q.assessedSkillId || q.skillId || 'unassigned_skill';
      const skillTitle = q.assessedSkillTitle || q.skillTitle || q.topic || 'Chủ đề chung';
      const topicId = q.assessedTopicId || q.topicId || 'topic_unspecified';

      evaluatedQuestions.push({
        questionId: q.id,
        format: q.format,
        cognitiveLevel: q.cognitiveLevel || 'understand',
        grade: q.grade,
        skillId,
        skillTitle,
        topicId,
        isAnswered,
        isCorrect,
        isPartial,
        scoreEarned: Number(qScore.toFixed(3)),
        maxScore: Number(qMaxScore.toFixed(3)),
        details
      });

      // Emit evidence record for SkillMasteryEngine
      skillEvidenceList.push({
        questionId: q.id,
        skillId,
        skillTitle,
        topicId,
        grade: q.grade,
        cognitiveLevel: q.cognitiveLevel || 'understand',
        format: q.format,
        isAnswered,
        isCorrect,
        scoreRatio: qMaxScore > 0 ? qScore / qMaxScore : 0,
        evaluatedAt: new Date().toISOString()
      });
    });

    const observedAccuracy = answeredCount > 0 ? Number((correctCount / answeredCount).toFixed(3)) : 0;
    const completionRate = questions.length > 0 ? Number((answeredCount / questions.length).toFixed(3)) : 0;

    return {
      totalQuestions: questions.length,
      answeredCount,
      unansweredCount,
      correctCount,
      incorrectCount,
      totalRawScore: Number(totalRawScore.toFixed(2)),
      totalMaxScore: Number(totalMaxScore.toFixed(2)),
      observedAccuracy,
      completionRate,
      evaluatedQuestions,
      skillEvidenceList,
      scoringNotice: 'Điểm số bài chẩn đoán phản ánh độ chính xác trên mẫu câu hỏi được lấy mẫu và KHÔNG PHẢI là điểm thi tốt nghiệp chính thức.'
    };
  }
}

module.exports = DiagnosticScoringAdapter;
