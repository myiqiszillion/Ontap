/**
 * Skill Evidence Aggregator
 * NTMK Rebuild Phase 03A — Task 4
 *
 * Responsibilities:
 * - Collect and aggregate evidence across questions and sessions per curriculum skill.
 * - Compute raw observation counts: testedCount, correctCount, incorrectCount, unansweredCount.
 * - Track cognitive level breakdown and question format breakdown.
 * - Calculate temporal stability across multiple attempts.
 */

class SkillEvidenceAggregator {
  /**
   * Aggregate raw evidence list (from one or multiple sessions) into a map of skill profiles
   */
  static aggregate(evidenceList = []) {
    const skillMap = new Map();

    for (const ev of evidenceList) {
      const sId = ev.skillId || 'unassigned_skill';
      if (!skillMap.has(sId)) {
        skillMap.set(sId, {
          skillId: sId,
          skillTitle: ev.skillTitle || sId,
          topicId: ev.topicId || 'unknown_topic',
          grade: ev.grade || 10,
          testedCount: 0,
          answeredCount: 0,
          unansweredCount: 0,
          correctCount: 0,
          incorrectCount: 0,
          partialCount: 0,
          totalScoreEarned: 0,
          cognitiveBreakdown: { recognize: 0, understand: 0, apply: 0, high_apply: 0 },
          formatBreakdown: { multiple_choice: 0, true_false_group: 0, short_answer: 0 },
          evidenceHistory: []
        });
      }

      const record = skillMap.get(sId);
      record.testedCount++;

      if (ev.isAnswered) {
        record.answeredCount++;
        if (ev.isCorrect) record.correctCount++;
        else if (ev.scoreRatio > 0 && ev.scoreRatio < 1) {
          record.partialCount++;
          record.incorrectCount++;
        } else {
          record.incorrectCount++;
        }
      } else {
        record.unansweredCount++;
      }

      record.totalScoreEarned += (ev.scoreRatio || 0);

      // Cognitive level tracking
      const cog = ev.cognitiveLevel || 'understand';
      if (record.cognitiveBreakdown[cog] !== undefined) {
        record.cognitiveBreakdown[cog]++;
      }

      // Format tracking
      const fmt = ev.format || 'multiple_choice';
      if (record.formatBreakdown[fmt] !== undefined) {
        record.formatBreakdown[fmt]++;
      }

      record.evidenceHistory.push({
        questionId: ev.questionId,
        isAnswered: ev.isAnswered,
        isCorrect: ev.isCorrect,
        scoreRatio: ev.scoreRatio,
        cognitiveLevel: cog,
        evaluatedAt: ev.evaluatedAt || new Date().toISOString()
      });
    }

    // Compute observed rates
    for (const record of skillMap.values()) {
      record.observedAccuracy = record.answeredCount > 0
        ? Number((record.correctCount / record.answeredCount).toFixed(3))
        : 0;
      record.attemptRate = record.testedCount > 0
        ? Number((record.answeredCount / record.testedCount).toFixed(3))
        : 0;
    }

    return skillMap;
  }
}

module.exports = SkillEvidenceAggregator;
