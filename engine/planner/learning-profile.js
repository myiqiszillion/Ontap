/**
 * Learning Profile Domain Model
 * NTMK Rebuild Phase 03B — Task 1
 *
 * Responsibilities:
 * - Represents student learning configurations, targets, time budget, and mastery profile.
 * - Decoupled from UI and DOM: runs on Node.js server, Express, and Serverless.
 * - Supports editable settings without forcing repeated onboarding.
 * - Enforces zero non-educational PII storage.
 */

class LearningProfile {
  constructor(data = {}) {
    this.userId = data.userId || data.studentId || 'anonymous_student';
    this.studentId = this.userId;
    this.profileId = data.profileId || `prof-${this.userId}`;
    this.grade = Number(data.grade) || 10;

    // Daily study minutes validation
    if (data.dailyStudyMinutes !== undefined) {
      const mins = Number(data.dailyStudyMinutes);
      if (isNaN(mins) || mins < 15 || mins > 180) {
        throw new Error('Thời gian học mỗi ngày phải từ 15 đến 180 phút');
      }
      this.dailyStudyMinutes = mins;
    } else {
      this.dailyStudyMinutes = 30;
    }

    // Days of week active (1=Monday ... 7=Sunday)
    if (data.studyDaysPerWeek !== undefined) {
      if (!Array.isArray(data.studyDaysPerWeek) || data.studyDaysPerWeek.length === 0) {
        throw new Error('Phải chọn ít nhất 1 ngày học trong tuần');
      }
      for (const d of data.studyDaysPerWeek) {
        const num = Number(d);
        if (isNaN(num) || num < 1 || num > 7) {
          throw new Error('Ngày học trong tuần phải là số từ 1 (Thứ 2) đến 7 (Chủ nhật)');
        }
      }
      this.studyDaysPerWeek = [...new Set(data.studyDaysPerWeek.map(Number))].sort((a, b) => a - b);
    } else {
      this.studyDaysPerWeek = [1, 2, 3, 4, 5, 6];
    }

    // Priority subjects
    if (Array.isArray(data.prioritySubjects) && data.prioritySubjects.length > 0) {
      this.prioritySubjects = [...data.prioritySubjects];
    } else if (Array.isArray(data.preferredSubjects) && data.preferredSubjects.length > 0) {
      this.prioritySubjects = data.preferredSubjects.map(s => typeof s === 'string' ? s : s.subjectId);
    } else {
      this.prioritySubjects = ['toan'];
    }

    this.preferredSubjects = this.prioritySubjects.map(sub => ({ subjectId: sub, priority: 'high' }));

    // Goals & Targets
    this.learningGoals = Array.isArray(data.learningGoals)
      ? [...data.learningGoals]
      : [data.target || 'strengthen_foundation'];
    this.target = this.learningGoals[0] || 'strengthen_foundation';
    this.targetScore = typeof data.targetScore === 'number' ? Math.max(1, Math.min(10, data.targetScore)) : 8.0;
    this.targetExamDate = data.targetExamDate || null;

    // State caches
    this.diagnosticHistory = Array.isArray(data.diagnosticHistory) ? [...data.diagnosticHistory] : [];
    this.skillMastery = typeof data.skillMastery === 'object' && data.skillMastery !== null
      ? { ...data.skillMastery }
      : {};
    this.practiceHistory = Array.isArray(data.practiceHistory) ? [...data.practiceHistory] : [];

    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  validate() {
    if (!this.userId) throw new Error('userId is required');
    if (![10, 11, 12].includes(this.grade)) throw new Error('Khối lớp phải là 10, 11 hoặc 12');
    if (this.dailyStudyMinutes < 15 || this.dailyStudyMinutes > 180) {
      throw new Error('Thời gian học mỗi ngày phải từ 15 đến 180 phút');
    }
    if (!Array.isArray(this.studyDaysPerWeek) || this.studyDaysPerWeek.length === 0) {
      throw new Error('Phải chọn ít nhất 1 ngày học trong tuần');
    }
    return true;
  }

  updateGoals(goals = [], options = {}) {
    if (Array.isArray(goals) && goals.length > 0) {
      this.learningGoals = [...goals];
      this.target = goals[0];
    }
    if (options.targetScore !== undefined) {
      this.targetScore = Number(options.targetScore);
    }
    if (options.targetExamDate !== undefined) {
      this.targetExamDate = options.targetExamDate;
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  updateSettings(settings = {}) {
    if (settings.dailyStudyMinutes !== undefined) {
      const mins = Number(settings.dailyStudyMinutes);
      if (mins < 15 || mins > 180) throw new Error('Thời gian học mỗi ngày phải từ 15 đến 180 phút');
      this.dailyStudyMinutes = mins;
    }
    if (Array.isArray(settings.studyDaysPerWeek)) {
      if (settings.studyDaysPerWeek.length === 0) throw new Error('Phải chọn ít nhất 1 ngày học trong tuần');
      this.studyDaysPerWeek = [...new Set(settings.studyDaysPerWeek.map(Number))].sort((a, b) => a - b);
    }
    if (Array.isArray(settings.prioritySubjects)) {
      this.prioritySubjects = [...settings.prioritySubjects];
      this.preferredSubjects = this.prioritySubjects.map(sub => ({ subjectId: sub, priority: 'high' }));
    }
    if (settings.targetExamDate !== undefined) {
      this.targetExamDate = settings.targetExamDate;
    }
    if (settings.grade !== undefined) {
      this.grade = Number(settings.grade);
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  linkDiagnosticResult(diagnosticReport) {
    if (!diagnosticReport) return;
    this.diagnosticHistory.push({
      reportId: diagnosticReport.reportId,
      sessionId: diagnosticReport.sessionId,
      subjectId: diagnosticReport.subjectId,
      grade: diagnosticReport.grade,
      completedAt: diagnosticReport.completedAt,
      accuracyRate: diagnosticReport.assessmentPerformance?.observedAccuracy || 0,
      totalRawScore: diagnosticReport.assessmentPerformance?.totalRawScore || 0
    });

    if (Array.isArray(diagnosticReport.assessedSkills)) {
      for (const skill of diagnosticReport.assessedSkills) {
        this.updateSkillMastery(skill.skillId, skill);
      }
    }
    this.updatedAt = new Date().toISOString();
  }

  updateSkillMastery(skillId, masteryData) {
    if (!skillId) return;
    this.skillMastery[skillId] = {
      ...(this.skillMastery[skillId] || {}),
      ...masteryData,
      lastUpdatedAt: new Date().toISOString()
    };
    this.updatedAt = new Date().toISOString();
  }

  logPracticeCompletion(practiceRecord) {
    this.practiceHistory.push({
      practiceId: practiceRecord.practiceId,
      taskId: practiceRecord.taskId || null,
      skillId: practiceRecord.skillId,
      taskType: practiceRecord.taskType,
      score: practiceRecord.score,
      accuracyRate: practiceRecord.accuracyRate,
      completedAt: new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  isStudyDay(dayOfWeek) {
    return this.studyDaysPerWeek.includes(Number(dayOfWeek));
  }

  toJSON() {
    return {
      userId: this.userId,
      studentId: this.studentId,
      profileId: this.profileId,
      grade: this.grade,
      target: this.target,
      learningGoals: this.learningGoals,
      targetScore: this.targetScore,
      targetExamDate: this.targetExamDate,
      dailyStudyMinutes: this.dailyStudyMinutes,
      studyDaysPerWeek: this.studyDaysPerWeek,
      prioritySubjects: this.prioritySubjects,
      preferredSubjects: this.preferredSubjects,
      diagnosticHistory: this.diagnosticHistory,
      skillMastery: this.skillMastery,
      practiceHistory: this.practiceHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  static fromJSON(json) {
    return new LearningProfile(json);
  }
}

module.exports = LearningProfile;
