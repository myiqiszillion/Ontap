/**
 * Diagnostic Report Builder
 * NTMK Rebuild Phase 03A — Task 7
 *
 * Responsibilities:
 * - Synthesize session result, evaluated questions, skill mastery estimates, and knowledge gaps.
 * - Format a clean, human-readable, and machine-actionable diagnostic report.
 * - Provide transparent disclaimers: no uncalibrated graduation scores, no fake precision.
 */

class DiagnosticReportBuilder {
  static build({ session, scoringResult, masteryMap, gapAnalysis } = {}) {
    if (!session || !scoringResult) {
      throw new Error('Session and scoringResult required to build diagnostic report');
    }

    const assessedSkillsList = Array.from(masteryMap.values()).filter(m => m.evidenceCount > 0);

    return {
      reportId: `diag_rep_${session.sessionId}`,
      sessionId: session.sessionId,
      studentId: session.studentId || 'anonymous_student',
      subjectId: session.subjectId,
      grade: session.grade,
      assessmentType: session.assessmentType,
      target: session.target,
      completedAt: new Date().toISOString(),
      durationSpentMinutes: session.startedAt
        ? Number(((Date.now() - session.startedAt) / (60 * 1000)).toFixed(1))
        : null,

      // 1. Scoring & Completion Metrics
      assessmentPerformance: {
        totalQuestions: scoringResult.totalQuestions,
        answeredCount: scoringResult.answeredCount,
        unansweredCount: scoringResult.unansweredCount,
        correctCount: scoringResult.correctCount,
        incorrectCount: scoringResult.incorrectCount,
        totalRawScore: scoringResult.totalRawScore,
        totalMaxScore: scoringResult.totalMaxScore,
        observedAccuracy: scoringResult.observedAccuracy,
        completionRate: scoringResult.completionRate
      },

      // 2. Evaluated Question Details (Sanitized: student sees their answer vs correct after submit)
      questionEvaluations: scoringResult.evaluatedQuestions,

      // 3. Skill Mastery Breakdown
      assessedSkills: assessedSkillsList,

      // 4. Knowledge Gap Analysis
      gapAnalysis: {
        summary: gapAnalysis?.summary || {},
        prioritizedGaps: gapAnalysis?.prioritizedGaps || [],
        developingAreas: gapAnalysis?.developingAreas || [],
        insufficientEvidenceSkills: gapAnalysis?.insufficientEvidenceSkills || [],
        strengths: gapAnalysis?.strengths || [],
        prerequisiteInvestigations: gapAnalysis?.prerequisiteInvestigations || [],
        readinessVerdict: gapAnalysis?.readinessVerdict || {}
      },

      // 5. Next Steps for Student (Phase 03B handoff)
      actionableRecommendations: this._buildRecommendations(gapAnalysis),

      // 6. Educational Disclaimers
      disclaimers: [
        'Kết quả đánh giá chẩn đoán phản ánh mức độ thành thạo trên các kỹ năng được kiểm tra trong bài làm này.',
        'Điểm số này KHÔNG PHẢI là điểm thi tốt nghiệp THPT chính thức và không dùng để xếp loại học tập.',
        'Các kỹ năng hiển thị "Chưa đủ dữ liệu đánh giá" cần được làm thêm bài bổ trợ để có kết luận tin cậy.'
      ]
    };
  }

  static _buildRecommendations(gapAnalysis) {
    const recommendations = [];

    if (!gapAnalysis) return recommendations;

    const topGaps = gapAnalysis.prioritizedGaps || [];
    if (topGaps.length > 0) {
      const topGap = topGaps[0];
      recommendations.push({
        priority: 1,
        type: 'remediate_foundation',
        targetSkillId: topGap.skillId,
        title: `Củng cố ưu tiên: ${topGap.skillTitle}`,
        message: topGap.actionPlan || 'Xem lại lý thuyết và làm bài tập cơ bản.'
      });
    }

    if (gapAnalysis.prerequisiteInvestigations && gapAnalysis.prerequisiteInvestigations.length > 0) {
      const pInv = gapAnalysis.prerequisiteInvestigations[0];
      const upstream = pInv.upstreamPrerequisites[0];
      if (upstream && upstream.diagnosisStatus === 'untested_suspect') {
        recommendations.push({
          priority: 2,
          type: 'verify_prerequisite',
          targetSkillId: upstream.prerequisiteSkillId,
          title: `Kiểm tra kỹ năng nền tảng [Lớp ${upstream.grade}]: ${upstream.title}`,
          message: 'Làm bài kiểm tra ngắn 3 câu để xác định lỗi sai do kiến thức nền hay kỹ năng nâng cao.'
        });
      }
    }

    const insufficient = gapAnalysis.insufficientEvidenceSkills || [];
    if (insufficient.length > 0) {
      recommendations.push({
        priority: 3,
        type: 'gather_evidence',
        targetSkillId: insufficient[0].skillId,
        title: `Mở khóa đánh giá: ${insufficient[0].skillTitle}`,
        message: 'Làm thêm câu hỏi để hệ thống có đủ dữ liệu xác nhận mức độ thành thạo.'
      });
    }

    return recommendations;
  }
}

module.exports = DiagnosticReportBuilder;
