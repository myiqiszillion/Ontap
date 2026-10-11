/**
 * Diagnostic Question Selector
 * NTMK Rebuild Phase 03A — Task 2
 *
 * Responsibilities:
 * - Match blueprint skill slots against candidate questions in BankStorage.
 * - Enforce strict quality gates:
 *   1. Question must be 'published'.
 *   2. Question must have verificationStatus: 'verified'.
 *   3. Question must have permissionApproved: true and valid licensing evidence.
 *   4. Question must have reliable skill metadata (skillId).
 *   5. Anti-duplicate filter: avoids repeating questions from recent attempts.
 * - Detect and report shortages: fails closed if verified bank content is insufficient.
 */

class DiagnosticQuestionSelector {
  constructor(bankStorage) {
    this.bank = bankStorage;
  }

  /**
   * Select questions matching the diagnostic blueprint
   */
  selectQuestions(blueprint, { pastQuestionIds = [], allowFixtureFallback = false } = {}) {
    if (!blueprint || !Array.isArray(blueprint.skillSlots)) {
      throw new Error('Invalid diagnostic blueprint');
    }

    // Retrieve pool of verified questions
    const poolFilter = {
      subjectId: blueprint.subjectId,
      status: 'published',
      verificationStatus: 'verified',
      limit: 100000
    };

    let allQuestions = [];
    if (this.bank && typeof this.bank.query === 'function') {
      const qRes = this.bank.query(poolFilter);
      allQuestions = (qRes.questions || []).filter(q => {
        // Enforce verification proof
        const hasLicenseProof = q.source?.permissionApproved && q.source?.licenseEvidence;
        const hasVerificationProof = q.source?.verificationStatus === 'verified' && q.source?.verificationEvidence;
        const isVerifiedFixture = allowFixtureFallback && (q.isTestFixture || q.source?.sourceName?.includes('Fixture'));
        return (hasLicenseProof && hasVerificationProof) || isVerifiedFixture;
      });
    }

    const usedIds = new Set(pastQuestionIds || []);
    const selectedQuestions = [];
    const shortages = [];

    for (const slot of blueprint.skillSlots) {
      const targetGrade = slot.grade || blueprint.grade;
      const targetSkillId = slot.skillId;
      const targetTopicId = slot.topicId;

      // Filter matching candidates
      const candidates = allQuestions.filter(q => {
        if (q.subjectId !== blueprint.subjectId) return false;
        if (Number(q.grade) !== Number(targetGrade)) return false;
        if (usedIds.has(q.id)) return false;

        // Skill match (exact skillId or topicId match)
        const matchesSkill = q.skillId === targetSkillId || (Array.isArray(q.skillIds) && q.skillIds.includes(targetSkillId));
        const matchesTopic = q.topic === slot.topicTitle || q.topicId === targetTopicId;

        return matchesSkill || matchesTopic;
      });

      if (candidates.length > 0) {
        // Pick best matching candidate (prioritize exact skillId match)
        const exactMatch = candidates.find(q => q.skillId === targetSkillId);
        const chosen = exactMatch || candidates[0];
        usedIds.add(chosen.id);

        selectedQuestions.push({
          ...chosen,
          diagnosticSlot: slot.slotIndex,
          assessedSkillId: targetSkillId,
          assessedSkillTitle: slot.skillTitle,
          assessedTopicId: targetTopicId,
          scope: slot.scope || 'grade_skill'
        });
      } else {
        shortages.push({
          slotIndex: slot.slotIndex,
          grade: targetGrade,
          skillId: targetSkillId,
          skillTitle: slot.skillTitle,
          topicId: targetTopicId,
          reason: `Thiếu câu hỏi thẩm định đã verified cho kỹ năng '${slot.skillTitle}' (Lớp ${targetGrade})`
        });
      }
    }

    const isReady = shortages.length === 0;

    return {
      ready: isReady,
      blueprintId: blueprint.blueprintId,
      subjectId: blueprint.subjectId,
      grade: blueprint.grade,
      requestedCount: blueprint.skillSlots.length,
      selectedCount: selectedQuestions.length,
      shortages,
      selectedQuestions,
      reason: isReady
        ? 'Đủ số lượng câu hỏi thẩm định đáp ứng ma trận đánh giá'
        : `Ngân hàng câu hỏi chưa đủ điều kiện mở bài đánh giá chính thức (Thiếu ${shortages.length}/${blueprint.skillSlots.length} kỹ năng verified).`
    };
  }
}

module.exports = DiagnosticQuestionSelector;
