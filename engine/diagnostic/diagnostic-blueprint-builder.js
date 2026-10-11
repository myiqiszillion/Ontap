/**
 * Diagnostic Assessment Blueprint Builder
 * NTMK Rebuild Phase 03A — Task 2
 *
 * Responsibilities:
 * - Generate balanced diagnostic blueprints for:
 *   A. Grade-Based Assessment (Grades 10, 11, 12).
 *   B. Graduation Readiness Assessment (THPT Preparation, cross-grade foundation).
 * - Distribute question slots across topics, cognitive levels, and format types.
 * - Explicitly document sampling limitations (15–25 questions diagnostic sample).
 */

class DiagnosticBlueprintBuilder {
  constructor(curriculumRepository, skillGraph) {
    this.repo = curriculumRepository;
    this.graph = skillGraph;
  }

  /**
   * Build a Grade-Based Diagnostic Blueprint
   */
  buildGradeBlueprint({ subjectId, grade, target = 'full_year', targetQuestionCount = 20 } = {}) {
    if (!['toan', 'vatli', 'hoahoc', 'tienganh'].includes(subjectId)) {
      throw new Error(`Invalid subjectId: ${subjectId}`);
    }
    const targetGrade = Number(grade);
    if (![10, 11, 12].includes(targetGrade)) {
      throw new Error(`Invalid grade: ${grade}`);
    }

    const count = Math.max(15, Math.min(25, Number(targetQuestionCount) || 20));
    const gradeSkills = this.repo.querySkills({ subjectId, grade: targetGrade, verificationStatus: 'verified' });

    if (gradeSkills.length === 0) {
      throw new Error(`No verified curriculum skills found for ${subjectId} Grade ${targetGrade}`);
    }

    // Cognitive balance for diagnostic (40% Recognize/Understand, 40% Apply, 20% High Apply)
    const cognitiveDistribution = {
      recognize: Math.round(count * 0.20),
      understand: Math.round(count * 0.35),
      apply: Math.round(count * 0.35),
      high_apply: count - (Math.round(count * 0.20) + Math.round(count * 0.35) + Math.round(count * 0.35))
    };

    // Format distribution (aligns with subject format conventions)
    const formatDistribution = this._getFormatDistribution(subjectId, count);

    // Selected target skill IDs ensuring diverse topic representation
    const topics = this.repo.getTopicsBySubjectAndGrade(subjectId, targetGrade);
    const targetSkillSlots = [];

    let skillIdx = 0;
    for (let i = 0; i < count; i++) {
      const topic = topics[i % topics.length];
      const availableSkills = gradeSkills.filter(s => s.topicId === topic.topicId);
      const selectedSkill = availableSkills.length > 0
        ? availableSkills[skillIdx % availableSkills.length]
        : gradeSkills[skillIdx % gradeSkills.length];

      targetSkillSlots.push({
        slotIndex: i + 1,
        topicId: selectedSkill.topicId,
        topicTitle: selectedSkill.topicTitle,
        skillId: selectedSkill.skillId,
        skillTitle: selectedSkill.title,
        expectedCognitiveLevel: this._pickCognitiveLevel(i, count)
      });
      skillIdx++;
    }

    return {
      blueprintId: `diag_bp_${subjectId}_g${targetGrade}_${Date.now()}`,
      assessmentType: 'grade_diagnostic',
      subjectId,
      grade: targetGrade,
      target,
      durationMinutes: 45,
      totalQuestions: count,
      cognitiveDistribution,
      formatDistribution,
      skillSlots: targetSkillSlots,
      isOfficialGraduationExam: false,
      disclaimer: `Bài đánh giá chẩn đoán năng lực gồm ${count} câu hỏi được lấy mẫu trọng tâm theo chuẩn GDPT 2018. Kết quả cung cấp bằng chứng ban đầu về các kỹ năng cốt lõi và không thay thế kỳ thi học kì hay thi chính thức.`
    };
  }

  /**
   * Build a Graduation Readiness Assessment Blueprint (THPT Preparation)
   * Cross-grade: ~70% Grade 12 core, ~20% Grade 11 prerequisites, ~10% Grade 10 fundamentals.
   */
  buildGraduationReadinessBlueprint({ subjectId, targetQuestionCount = 25 } = {}) {
    if (!['toan', 'vatli', 'hoahoc', 'tienganh'].includes(subjectId)) {
      throw new Error(`Invalid subjectId: ${subjectId}`);
    }

    const count = Math.max(20, Math.min(30, Number(targetQuestionCount) || 25));

    // Grade breakdown
    const g12Count = Math.round(count * 0.68); // ~17 questions
    const g11Count = Math.round(count * 0.20); // ~5 questions
    const g10Count = count - g12Count - g11Count; // ~3 questions

    const g12Skills = this.repo.querySkills({ subjectId, grade: 12 });
    const g11Skills = this.repo.querySkills({ subjectId, grade: 11 });
    const g10Skills = this.repo.querySkills({ subjectId, grade: 10 });

    const skillSlots = [];
    let slotNum = 1;

    // 1. Grade 10 Foundational slots
    for (let i = 0; i < g10Count; i++) {
      const s = g10Skills[i % g10Skills.length];
      skillSlots.push({
        slotIndex: slotNum++,
        grade: 10,
        scope: 'foundational_prerequisite',
        skillId: s.skillId,
        skillTitle: s.title,
        topicId: s.topicId,
        topicTitle: s.topicTitle,
        expectedCognitiveLevel: 'understand'
      });
    }

    // 2. Grade 11 Prerequisite slots
    for (let i = 0; i < g11Count; i++) {
      const s = g11Skills[i % g11Skills.length];
      skillSlots.push({
        slotIndex: slotNum++,
        grade: 11,
        scope: 'intermediate_prerequisite',
        skillId: s.skillId,
        skillTitle: s.title,
        topicId: s.topicId,
        topicTitle: s.topicTitle,
        expectedCognitiveLevel: i % 2 === 0 ? 'understand' : 'apply'
      });
    }

    // 3. Grade 12 Core slots
    for (let i = 0; i < g12Count; i++) {
      const s = g12Skills[i % g12Skills.length];
      skillSlots.push({
        slotIndex: slotNum++,
        grade: 12,
        scope: 'core_graduation',
        skillId: s.skillId,
        skillTitle: s.title,
        topicId: s.topicId,
        topicTitle: s.topicTitle,
        expectedCognitiveLevel: this._pickCognitiveLevel(i, g12Count)
      });
    }

    return {
      blueprintId: `diag_bp_grad_${subjectId}_${Date.now()}`,
      assessmentType: 'graduation_readiness',
      subjectId,
      grade: 12,
      target: 'tot_nghiep_thpt_readiness',
      durationMinutes: 50,
      totalQuestions: count,
      gradeBreakdown: { grade12: g12Count, grade11: g11Count, grade10: g10Count },
      formatDistribution: this._getFormatDistribution(subjectId, count),
      skillSlots,
      isOfficialGraduationExam: false,
      disclaimer: 'Đây là bài đánh giá chẩn đoán độ sẵn sàng tốt nghiệp THPT, tập trung phát hiện lỗ hổng kiến thức liên lớp (10-11-12). Bài đánh giá KHÔNG PHẢI là đề thi thử tốt nghiệp THPT chuẩn và không dùng để dự đoán điểm thi chính thức.'
    };
  }

  _pickCognitiveLevel(idx, total) {
    const ratio = idx / total;
    if (ratio < 0.25) return 'recognize';
    if (ratio < 0.60) return 'understand';
    if (ratio < 0.85) return 'apply';
    return 'high_apply';
  }

  _getFormatDistribution(subjectId, count) {
    if (subjectId === 'tienganh') {
      // English graduation reference structure: MCQ
      return { multiple_choice: count, true_false_group: 0, short_answer: 0 };
    }
    if (subjectId === 'toan') {
      // Math: mix of MCQ (Part I), True/False (Part II), Short Answer (Part III)
      const mcq = Math.round(count * 0.50);
      const tf = Math.max(1, Math.round(count * 0.25));
      const sa = count - mcq - tf;
      return { multiple_choice: mcq, true_false_group: tf, short_answer: sa };
    }
    // Science (Physics, Chemistry)
    const mcq = Math.round(count * 0.60);
    const tf = Math.max(1, Math.round(count * 0.20));
    const sa = count - mcq - tf;
    return { multiple_choice: mcq, true_false_group: tf, short_answer: sa };
  }
}

module.exports = DiagnosticBlueprintBuilder;
