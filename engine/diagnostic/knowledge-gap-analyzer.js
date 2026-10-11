/**
 * Knowledge Gap Analyzer
 * NTMK Rebuild Phase 03A — Task 5
 *
 * Responsibilities:
 * - Analyze diagnostic results against SkillGraph and mastery estimates.
 * - Detect confirmed gaps ('needs_foundation'), developing areas, and strengths.
 * - Propagate prerequisite gaps: if an advanced skill fails, identify foundational dependencies to assess.
 * - Rank prioritized remediation items based on:
 *   1. Observed deficiency severity
 *   2. Data confidence
 *   3. Prerequisite dependency depth (foundational blockers prioritized first!)
 *   4. Target goal relevance
 * - Produce structured gap report feeding into Phase 03B personal planner.
 */

class KnowledgeGapAnalyzer {
  constructor(skillGraph) {
    this.graph = skillGraph;
  }

  analyzeGaps({ masteryMap, subjectId, targetGrade, targetGoal = 'general' } = {}) {
    const confirmedGaps = [];
    const developingAreas = [];
    const insufficientEvidenceSkills = [];
    const unassessedSkills = [];
    const strengths = [];
    const prerequisiteInvestigations = [];

    // 1. Categorize all skills by current mastery state
    for (const [skillId, mastery] of masteryMap.entries()) {
      if (mastery.status === 'needs_foundation') {
        confirmedGaps.push(mastery);
      } else if (mastery.status === 'developing') {
        developingAreas.push(mastery);
      } else if (mastery.status === 'insufficient_evidence') {
        insufficientEvidenceSkills.push(mastery);
      } else if (mastery.status === 'not_assessed') {
        unassessedSkills.push(mastery);
      } else if (mastery.status === 'proficient' || mastery.status === 'strong') {
        strengths.push(mastery);
      }
    }

    // 2. Prerequisite Diagnosis: for every confirmed gap or failing advanced skill,
    // trace upstream prerequisites to discover root causes.
    for (const gap of confirmedGaps) {
      const prereqDiags = this.graph.diagnosePrerequisiteGaps(gap.skillId, Object.fromEntries(masteryMap));
      if (prereqDiags.length > 0) {
        prerequisiteInvestigations.push({
          failingSkillId: gap.skillId,
          failingSkillTitle: gap.skillTitle,
          grade: gap.grade,
          upstreamPrerequisites: prereqDiags
        });
      }
    }

    // 3. Priority Scoring & Ranking
    // Formula: PriorityScore = (1 - mastery) * 40 + confidence * 20 + dependentSkillsCount * 25 + crossGradeBonus * 15
    const prioritizedGaps = confirmedGaps.map(gap => {
      const dependentSkills = this.graph.getDependents(gap.skillId, { recursive: true });
      const prereqs = this.graph.getDirectPrerequisites(gap.skillId);

      const isFoundationalBlocker = dependentSkills.length > 0;
      const severityScore = (1 - (gap.estimatedMastery || 0.3)) * 40;
      const confidenceScore = (gap.confidenceScore || 0.5) * 20;
      const blockerScore = Math.min(25, dependentSkills.length * 8);
      const isTargetGrade = Number(gap.grade) === Number(targetGrade) ? 15 : 5;

      const priorityWeight = Number((severityScore + confidenceScore + blockerScore + isTargetGrade).toFixed(1));

      return {
        ...gap,
        priorityWeight,
        dependentSkillsCount: dependentSkills.length,
        isFoundationalBlocker,
        blockingSkillTitles: dependentSkills.slice(0, 3).map(d => d.title),
        actionPlan: isFoundationalBlocker
          ? `Ưu tiên cao nhất: Kỹ năng nền tảng đang chặn ${dependentSkills.length} kỹ năng nâng cao tiếp theo.`
          : 'Củng cố thông qua các bài tập chuyên đề.'
      };
    });

    // Sort descending by priority weight
    prioritizedGaps.sort((a, b) => b.priorityWeight - a.priorityWeight);

    return {
      subjectId,
      targetGrade: Number(targetGrade) || 12,
      targetGoal,
      summary: {
        totalSkillsAudited: masteryMap.size,
        confirmedGapsCount: confirmedGaps.length,
        developingCount: developingAreas.length,
        insufficientEvidenceCount: insufficientEvidenceSkills.length,
        unassessedCount: unassessedSkills.length,
        strengthsCount: strengths.length
      },
      prioritizedGaps,
      developingAreas,
      insufficientEvidenceSkills,
      strengths,
      prerequisiteInvestigations,
      readinessVerdict: this._generateReadinessVerdict(confirmedGaps, strengths, developingAreas)
    };
  }

  _generateReadinessVerdict(gaps, strengths, developing) {
    if (gaps.length === 0 && developing.length <= 1 && strengths.length >= 3) {
      return {
        level: 'good_foundation',
        message: 'Nền tảng kiến thức rất vững vàng. Sẵn sàng cho các chuyên đề nâng cao và luyện đề chuẩn hóa.'
      };
    }
    if (gaps.length <= 2) {
      return {
        level: 'moderate_gaps',
        message: 'Nắm được đa số kiến thức cơ bản nhưng còn một vài lỗ hổng cần củng cố sớm trước khi bước vào luyện đề.'
      };
    }
    return {
      level: 'critical_foundational_gaps',
      message: 'Phát hiện nhiều lỗ hổng nền tảng trọng tâm. Cần ưu tiên ôn luyện các kỹ năng nền trước khi tiếp tục học nâng cao.'
    };
  }
}

module.exports = KnowledgeGapAnalyzer;
