/**
 * Learning Priority Engine
 * NTMK Rebuild Phase 03B — Task 2
 *
 * Responsibilities:
 * - Determine the pedagogical order of skills to study.
 * - Distinguish 3 distinct learning needs:
 *   1. Remediation (remediate confirmed weak skills)
 *   2. Further Assessment (gather evidence for unassessed/insufficient skills)
 *   3. Review & Consolidation (spaced repetition for proficient/strong skills)
 * - Honest evidence rules: Never classify untested skills as weak.
 * - Transparent priority score with explainable components.
 */

const CurriculumRepository = require('../diagnostic/curriculum-repository.js');
const SkillGraph = require('../diagnostic/skill-graph.js');

class LearningPriorityEngine {
  constructor(options = {}) {
    this.curriculumRepo = options.curriculumRepository || new CurriculumRepository();
    this.skillGraph = options.skillGraph || new SkillGraph(this.curriculumRepo);
    this.bankStorage = options.bankStorage || null;

    // Configurable weighting matrix (transparent & modifiable)
    this.weights = {
      remediationBase: options.remediationBase || 35,
      furtherAssessmentBase: options.furtherAssessmentBase || 20,
      reviewBase: options.reviewBase || 15,
      maxSeverityScore: options.maxSeverityScore || 25,
      maxBlockerScore: options.maxBlockerScore || 25,
      goalBonus: options.goalBonus || 15,
      retentionBonus: options.retentionBonus || 10
    };
  }

  /**
   * Rank skills into prioritized order
   */
  rankPriorities({
    learningProfile,
    masteryMap = {},
    gapAnalysis = {},
    history = [],
    availableContentFilter = null
  } = {}) {
    if (!learningProfile) throw new Error('LearningProfile required');

    const prioritySubjects = learningProfile.prioritySubjects || ['toan'];
    const targetGrade = learningProfile.grade || 10;

    // Query candidate skills from curriculum repo
    const allSkills = this.curriculumRepo.getAllSkills();
    const subjectSkills = allSkills.filter(s => prioritySubjects.includes(s.subjectId));

    const ranked = [];

    for (const skill of subjectSkills) {
      const skillId = skill.skillId;
      const mastery = masteryMap[skillId] || learningProfile.skillMastery[skillId] || {
        skillId,
        status: 'not_assessed',
        evidenceCount: 0,
        estimatedMastery: null,
        observedAccuracy: 0,
        confidenceScore: 0
      };

      // 1. Categorize Learning Need
      let category = 'further_assessment';
      let needScore = this.weights.furtherAssessmentBase;

      if (mastery.status === 'needs_foundation') {
        category = 'remediation';
        needScore = this.weights.remediationBase;
      } else if (mastery.status === 'developing') {
        category = 'remediation';
        needScore = this.weights.remediationBase * 0.8;
      } else if (mastery.status === 'proficient' || mastery.status === 'strong') {
        category = 'review_consolidation';
        needScore = this.weights.reviewBase;
      } else {
        // 'not_assessed' or 'insufficient_evidence'
        category = 'further_assessment';
        needScore = this.weights.furtherAssessmentBase;
      }

      // 2. Severity Score (only for skills with observed deficiency)
      let severityScore = 0;
      if (category === 'remediation') {
        const est = typeof mastery.estimatedMastery === 'number' ? mastery.estimatedMastery : 0.4;
        const deficiency = 1 - est;
        const confidence = mastery.confidenceLevel === 'high' ? 1.0 : mastery.confidenceLevel === 'medium' ? 0.75 : 0.5;
        severityScore = Math.min(this.weights.maxSeverityScore, Math.round(deficiency * confidence * this.weights.maxSeverityScore));
      }

      // 3. Blocker Score (Foundational Prerequisite Dependency)
      let blockerScore = 0;
      const dependents = this.skillGraph.getDependents(skillId, { recursive: true });
      const prerequisites = this.skillGraph.getDirectPrerequisites(skillId);

      if (dependents.length > 0 && (category === 'remediation' || category === 'further_assessment')) {
        blockerScore = Math.min(this.weights.maxBlockerScore, dependents.length * 6);
      }
      if (gapAnalysis.criticalGaps && gapAnalysis.criticalGaps.includes(skillId)) {
        blockerScore = Math.min(this.weights.maxBlockerScore, blockerScore + 10);
      }

      // 4. Goal Alignment Score
      let goalScore = 0;
      if (Number(skill.grade) === Number(targetGrade)) goalScore += 10;
      if (prioritySubjects.includes(skill.subjectId)) goalScore += 5;
      goalScore = Math.min(this.weights.goalBonus, goalScore);

      // 5. Retention Score
      let retentionScore = 0;
      if (category === 'review_consolidation') {
        retentionScore = 5;
      }

      const priorityScore = Number((needScore + severityScore + blockerScore + goalScore + retentionScore).toFixed(1));

      // 6. Reasons
      const reasons = [];
      if (category === 'remediation') {
        reasons.push(`Kỹ năng cần củng cố: tỉ lệ đúng quan sát ${Math.round((mastery.observedAccuracy || 0) * 100)}% trên ${mastery.evidenceCount || 0} câu hỏi.`);
        if (blockerScore > 0) {
          reasons.push(`Kỹ năng này là nền tảng tiên quyết cho ${dependents.length} kỹ năng nâng cao tiếp theo.`);
        }
      } else if (category === 'further_assessment') {
        reasons.push(mastery.evidenceCount === 0
          ? 'Kỹ năng chưa được kiểm tra trong bài chẩn đoán; cần làm bài đánh giá ban đầu.'
          : 'Dữ liệu chưa đủ tin cậy để khẳng định thành thạo; cần thêm câu hỏi kiểm chứng.');
      } else {
        reasons.push('Kỹ năng đã đạt độ thành thạo tốt; xếp lịch ôn tập ngắt quãng để duy trì phản xạ.');
      }

      ranked.push({
        skillId,
        subjectId: skill.subjectId,
        grade: skill.grade,
        title: skill.title,
        category,
        priorityScore,
        scoreBreakdown: {
          needScore,
          severityScore,
          blockerScore,
          goalScore,
          retentionScore
        },
        reasons,
        primaryReason: reasons[0],
        prerequisites: prerequisites.map(p => p.skillId || p)
      });
    }

    // Sort descending by priorityScore
    ranked.sort((a, b) => b.priorityScore - a.priorityScore);

    return ranked;
  }

  computePriorities(learningProfile, options = {}) {
    return this.rankPriorities({
      learningProfile,
      masteryMap: learningProfile.skillMastery || {}
    });
  }
}

module.exports = LearningPriorityEngine;
