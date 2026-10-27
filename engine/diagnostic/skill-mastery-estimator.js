/**
 * Skill Mastery Estimation Engine (Bayesian Beta-Binomial Model)
 * NTMK Rebuild Phase 03A — Task 4
 *
 * Responsibilities:
 * - Estimate latent skill mastery using a transparent, explainable Bayesian model.
 * - Prior: Weakly informative Beta(alpha=1.5, beta=1.5) centered at 0.50.
 * - Cognitive weighting: Recognize (1.0x), Understand (1.1x), Apply (1.25x), High Apply (1.4x).
 * - Minimum evidence threshold: Flags 'insufficient_evidence' if testedCount < 2.
 * - Strict separation: Distinguishes observed raw accuracy from estimated mastery.
 * - Clear mastery states:
 *   - 'not_assessed'
 *   - 'insufficient_evidence' ("Chưa đủ dữ liệu đánh giá")
 *   - 'needs_foundation' (posterior < 0.45)
 *   - 'developing' (0.45 <= posterior < 0.65)
 *   - 'proficient' (0.65 <= posterior < 0.85)
 *   - 'strong' (posterior >= 0.85)
 */

class SkillMasteryEstimator {
  constructor(options = {}) {
    this.minEvidenceThreshold = options.minEvidenceThreshold || 2;
    this.priorAlpha = options.priorAlpha || 1.5;
    this.priorBeta = options.priorBeta || 1.5;

    this.cognitiveWeights = {
      recognize: 1.0,
      understand: 1.1,
      apply: 1.25,
      high_apply: 1.4
    };
  }

  /**
   * Estimate mastery for a single skill record from aggregated evidence
   */
  estimateSkillMastery(skillRecord) {
    if (!skillRecord || skillRecord.testedCount === 0) {
      return {
        skillId: skillRecord?.skillId || 'unknown',
        skillTitle: skillRecord?.skillTitle || '',
        grade: skillRecord?.grade || 10,
        status: 'not_assessed',
        statusLabel: 'Chưa đánh giá',
        observedAccuracy: 0,
        evidenceCount: 0,
        estimatedMastery: null,
        confidenceScore: 0,
        confidenceLevel: 'none',
        reasons: ['Chưa có câu hỏi nào thuộc kỹ năng này được kiểm tra.'],
        recommendedNextAssessment: 'Thực hiện bài đánh giá chứa kỹ năng này để thiết lập dữ liệu ban đầu.'
      };
    }

    const {
      skillId,
      skillTitle,
      grade,
      testedCount,
      answeredCount,
      correctCount,
      incorrectCount,
      unansweredCount,
      observedAccuracy,
      cognitiveBreakdown,
      evidenceHistory = []
    } = skillRecord;

    // 1. Check minimum evidence threshold rule
    if (testedCount < this.minEvidenceThreshold) {
      return {
        skillId,
        skillTitle,
        grade,
        status: 'insufficient_evidence',
        statusLabel: 'Chưa đủ dữ liệu đánh giá',
        observedAccuracy,
        evidenceCount: testedCount,
        correctCount,
        unansweredCount,
        estimatedMastery: null, // Transparently withheld to prevent false precision
        confidenceScore: Number((testedCount / (this.minEvidenceThreshold + 2)).toFixed(2)),
        confidenceLevel: 'low',
        reasons: [
          `Đã làm ${testedCount} câu hỏi (${correctCount} đúng). Cần tối thiểu ${this.minEvidenceThreshold} câu hỏi để kết luận mức độ thành thạo đáng tin cậy.`,
          'Không tự động kết luận thành thạo khi số lượng bằng chứng chưa đạt ngưỡng tối thiểu.'
        ],
        recommendedNextAssessment: `Làm thêm tối thiểu ${this.minEvidenceThreshold - testedCount + 1} câu hỏi về '${skillTitle}' để mở khóa trạng thái thành thạo.`
      };
    }

    // 2. Bayesian Beta-Binomial Updating with Cognitive Weights
    let alpha = this.priorAlpha;
    let beta = this.priorBeta;

    for (const ev of evidenceHistory) {
      const weight = this.cognitiveWeights[ev.cognitiveLevel] || 1.1;
      if (ev.isAnswered) {
        if (ev.isCorrect) {
          alpha += weight * 1.0;
        } else if (ev.scoreRatio > 0 && ev.scoreRatio < 1) {
          // Partial credit (True/False group)
          alpha += weight * ev.scoreRatio;
          beta += weight * (1 - ev.scoreRatio);
        } else {
          beta += weight * 1.0;
        }
      } else {
        // Unanswered: penalize uncertainty & knowledge absence
        beta += weight * 0.75;
      }
    }

    // Posterior distribution metrics
    const posteriorMean = alpha / (alpha + beta);
    const posteriorVariance = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const standardError = Math.sqrt(posteriorVariance);

    // Confidence: increases as variance shrinks and sample size grows
    const confidenceScore = Number(Math.max(0.2, Math.min(0.98, 1 - (standardError * 2.5))).toFixed(2));
    let confidenceLevel = 'low';
    if (confidenceScore >= 0.75) confidenceLevel = 'high';
    else if (confidenceScore >= 0.50) confidenceLevel = 'medium';

    // 80% Credible Interval (Normal approximation: mean +/- 1.28 * SE)
    const lowerBound = Number(Math.max(0, posteriorMean - (1.28 * standardError)).toFixed(2));
    const upperBound = Number(Math.min(1, posteriorMean + (1.28 * standardError)).toFixed(2));

    // 3. Mastery State Classification
    // Safety & Reliability Rule: Prevent premature overconfidence
    // - 'strong' strictly requires testedCount >= 4 and confidenceScore >= 0.60
    // - 'proficient' strictly requires testedCount >= 3
    // - testedCount == 2 with correct answers is conservatively kept at 'developing'
    let status = 'developing';
    let statusLabel = 'Đang phát triển';

    if (posteriorMean < 0.45) {
      status = 'needs_foundation';
      statusLabel = 'Cần củng cố nền tảng';
    } else if (posteriorMean >= 0.85 && confidenceScore >= 0.60 && testedCount >= 4) {
      status = 'strong';
      statusLabel = 'Vững vàng';
    } else if (posteriorMean >= 0.65 && testedCount >= 3) {
      status = 'proficient';
      statusLabel = 'Thành thạo';
    } else {
      status = 'developing';
      statusLabel = 'Đang phát triển';
    }

    // 4. Human-readable Pedagogical Explanations
    const reasons = [];
    reasons.push(`Đã kiểm tra ${testedCount} câu: ${correctCount} câu đúng, ${incorrectCount} câu sai${unansweredCount > 0 ? `, ${unansweredCount} câu chưa làm` : ''}.`);

    if (testedCount === 2 && posteriorMean >= 0.65) {
      reasons.push('Đã trả lời đúng 2 câu hỏi kiểm tra ban đầu; cần làm thêm tối thiểu 1 câu hỏi để xác nhận mức độ thành thạo đáng tin cậy.');
    }

    if (status === 'needs_foundation') {
      reasons.push('Tỉ lệ trả lời đúng thấp trên các mức độ nhận thức cơ bản; cần ôn tập lại khái niệm và phương pháp giải.');
    } else if (status === 'strong') {
      reasons.push('Kết quả ổn định và chính xác cao trên các câu hỏi từ Thông hiểu đến Vận dụng.');
    } else if (status === 'proficient') {
      reasons.push('Nắm vững kiến thức trọng tâm; cần rèn luyện thêm bài toán nâng cao để đạt mức vững vàng.');
    } else {
      reasons.push('Học sinh có khả năng giải quyết một số dạng bài nhưng kết quả còn dao động.');
    }

    // Specific cognitive observations
    if (cognitiveBreakdown.apply > 0 && correctCount <= cognitiveBreakdown.recognize) {
      reasons.push('Có dấu hiệu gặp khó khăn ở các câu hỏi mức Vận dụng thực tế.');
    }

    let recommendedNextAssessment = 'Tiếp tục luyện tập củng cố theo lộ trình.';
    if (status === 'needs_foundation') {
      recommendedNextAssessment = `Xem lại lý thuyết và làm bài tập nhận biết cơ bản về '${skillTitle}'.`;
    } else if (status === 'developing') {
      recommendedNextAssessment = `Luyện tập thêm 3-5 câu mức Thông hiểu và Vận dụng của '${skillTitle}'.`;
    } else if (status === 'proficient') {
      recommendedNextAssessment = 'Thử sức với các bài toán mức Vận dụng cao để bứt phá.';
    }

    return {
      skillId,
      skillTitle,
      grade,
      status,
      statusLabel,
      observedAccuracy: Number(observedAccuracy.toFixed(2)),
      evidenceCount: testedCount,
      correctCount,
      unansweredCount,
      estimatedMastery: Number(posteriorMean.toFixed(2)),
      confidenceScore,
      confidenceLevel,
      uncertaintyBand: [lowerBound, upperBound],
      credibleInterval80: { lowerBound, upperBound },
      reasons,
      recommendedNextAssessment
    };
  }

  /**
   * Estimate mastery across all skills in an aggregated evidence map
   */
  estimateAll(aggregatedEvidenceMap, allCurriculumSkills = []) {
    const results = new Map();

    // 1. Process assessed skills
    for (const [skillId, record] of aggregatedEvidenceMap.entries()) {
      results.set(skillId, this.estimateSkillMastery(record));
    }

    // 2. Include unassessed curriculum skills
    for (const skill of allCurriculumSkills) {
      if (!results.has(skill.skillId)) {
        results.set(skill.skillId, this.estimateSkillMastery({
          skillId: skill.skillId,
          skillTitle: skill.title,
          grade: skill.grade,
          testedCount: 0
        }));
      }
    }

    return results;
  }
}

module.exports = SkillMasteryEstimator;
