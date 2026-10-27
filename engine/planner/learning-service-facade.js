/**
 * Learning Service Facade
 * NTMK Rebuild Phase 03B — Task 9 & Facade
 *
 * Responsibilities:
 * - Central service orchestrating Profile, Planner, Practice Engine,
 *   Spaced Repetition Scheduler, Replanning Engine, and Persistence.
 * - Secure task completion: requires authentic practice submission; client cannot spoof `completed: true`.
 * - Manages plan versioning and audit trails.
 * - Provides clean interface for API routes and controllers.
 */

const LearningProfile = require('./learning-profile.js');
const LearningPriorityEngine = require('./learning-priority-engine.js');
const StudyScheduleOptimizer = require('./study-schedule-optimizer.js');
const PersonalizedStudyPlanner = require('./personalized-study-planner.js');
const AdaptivePracticeEngine = require('./adaptive-practice-engine.js');
const SpacedRepetitionScheduler = require('./spaced-repetition-scheduler.js');
const AdaptiveReplanningEngine = require('./adaptive-replanning-engine.js');
const LearningStorage = require('./learning-storage.js');
const SkillGraph = require('../diagnostic/skill-graph.js');

class LearningServiceFacade {
  constructor(options = {}) {
    this.bankStorage = options.bankStorage || null;
    this.diagnosticSessions = options.diagnosticSessions || null;
    this.skillGraph = options.skillGraph || new SkillGraph();
    this.storage = options.storage || new LearningStorage();

    this.priorityEngine = new LearningPriorityEngine({ skillGraph: this.skillGraph });
    this.scheduleOptimizer = new StudyScheduleOptimizer();
    this.studyPlanner = new PersonalizedStudyPlanner({
      bankStorage: this.bankStorage,
      skillGraph: this.skillGraph,
      priorityEngine: this.priorityEngine,
      scheduleOptimizer: this.scheduleOptimizer
    });

    this.practiceEngine = new AdaptivePracticeEngine({
      bankStorage: this.bankStorage,
      skillGraph: this.skillGraph
    });

    this.reviewScheduler = new SpacedRepetitionScheduler();
    this.replanningEngine = new AdaptiveReplanningEngine({
      studyPlanner: this.studyPlanner,
      scheduleOptimizer: this.scheduleOptimizer,
      priorityEngine: this.priorityEngine
    });
  }

  // --- Profile Management ---
  getProfile(userId) {
    let raw = this.storage.getProfile(userId);
    if (!raw) {
      // Create sensible default profile without PII
      const profile = new LearningProfile({ userId, grade: 10 });
      raw = this.storage.saveProfile(profile.toJSON());
    }
    return raw;
  }

  updateProfile(userId, profileData = {}) {
    const existing = this.getProfile(userId);
    const profile = new LearningProfile({
      ...existing,
      ...profileData,
      userId
    });
    profile.validate();
    return this.storage.saveProfile(profile.toJSON());
  }

  // --- Plan Generation & Retrieval ---
  generatePlan({ userId, requestedDays = null, allowFixtureFallback = false } = {}) {
    const profileRaw = this.getProfile(userId);
    const profile = new LearningProfile(profileRaw);

    // Retrieve diagnostic mastery estimates if available
    let masteryMap = {};
    let gapAnalysis = {};
    let history = [];

    if (this.diagnosticSessions && typeof this.diagnosticSessions.getStudentHistory === 'function') {
      history = this.diagnosticSessions.getStudentHistory(userId) || [];
    }

    // Generate new plan
    const plan = this.studyPlanner.generatePlan({
      learningProfile: profile,
      masteryMap,
      gapAnalysis,
      history,
      requestedDays,
      allowFixtureFallback
    });

    // Save plan and record version 1
    const savedPlan = this.storage.savePlan(plan);
    this.storage.savePlanVersion(plan.planId, {
      version: 1,
      changeReason: 'Kế hoạch học tập ban đầu được tạo tự động dựa trên hồ sơ và kết quả chẩn đoán.',
      beforeAfterSummary: {
        previousVersion: 0,
        newVersion: 1,
        totalTasks: plan.tasks.length,
        dailyStudyMinutes: plan.dailyStudyMinutes
      },
      snapshotData: plan
    });

    return savedPlan;
  }

  getActivePlan(userId) {
    const plan = this.storage.getActivePlan(userId);
    if (!plan) return null;

    // Attach current progress summary
    const tasks = plan.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
    const availableTasks = tasks.filter(t => t.status === 'available');
    const blockedTasks = tasks.filter(t => t.status === 'blocked');

    return {
      ...plan,
      progressSummary: {
        totalTasks: tasks.length,
        completedCount: completedTasks.length,
        inProgressCount: inProgressTasks.length,
        availableCount: availableTasks.length,
        blockedCount: blockedTasks.length,
        completionRate: tasks.length > 0 ? Number((completedTasks.length / tasks.length).toFixed(3)) : 0
      }
    };
  }

  // --- Task Lifecycle ---
  startTask({ userId, taskId, allowFixtureFallback = false } = {}) {
    const task = this.storage.getTask(taskId);
    if (!task) {
      const err = new Error('Task not found');
      err.code = 'TASK_NOT_FOUND';
      throw err;
    }

    if (task.status === 'blocked') {
      const err = new Error('Nhiệm vụ đang bị tạm khóa do ngân hàng câu hỏi chưa có đủ nội dung đã xác minh.');
      err.code = 'TASK_BLOCKED';
      throw err;
    }

    // Check prerequisite tasks in same plan
    if (Array.isArray(task.prerequisiteReferences) && task.prerequisiteReferences.length > 0) {
      const planTasks = this.storage.getTasks(task.planId);
      const uncompletedPrereqs = planTasks.filter(
        t => task.prerequisiteReferences.includes(t.skillId) && t.status !== 'completed'
      );
      if (uncompletedPrereqs.length > 0) {
        // Warning attached, foundational recommendation
        task.prerequisiteWarning = `Khuyến nghị: Bạn nên hoàn thành nhiệm vụ nền tảng (${uncompletedPrereqs[0].title}) trước để đạt hiệu quả cao nhất.`;
      }
    }

    // Start practice session via AdaptivePracticeEngine
    let practiceSession = null;
    let mode = 'weak_skill_practice';
    if (task.taskType === 'remediation') mode = 'prerequisite_practice';
    else if (task.taskType === 'wrong_review') mode = 'wrong_answer_review';
    else if (task.taskType === 'spaced_review') mode = 'mixed_review';
    else if (task.taskType === 'followup_assessment') mode = 'followup_assessment';

    try {
      practiceSession = this.practiceEngine.startSession({
        studentId: userId,
        taskId: task.taskId,
        mode,
        subjectId: task.subjectId,
        skillId: task.skillId,
        targetCount: 5,
        allowFixtureFallback
      });
    } catch (e) {
      if (e.code === 'INSUFFICIENT_VERIFIED_QUESTIONS') {
        this.storage.updateTask(taskId, {
          status: 'blocked',
          contentNotice: 'Ngân hàng chưa có đủ câu hỏi được thẩm định bản quyền.'
        });
      }
      throw e;
    }

    // Update status to in_progress
    this.storage.updateTask(taskId, {
      status: 'in_progress',
      currentSessionId: practiceSession.sessionId
    });
    this.storage.recordTaskEvent(taskId, 'started', { sessionId: practiceSession.sessionId });

    return {
      task: this.storage.getTask(taskId),
      practiceSession
    };
  }

  completeTask({ userId, taskId, sessionId, token, answers = {}, timeSpentSeconds = 0 } = {}) {
    const task = this.storage.getTask(taskId);
    if (!task) {
      const err = new Error('Task not found');
      err.code = 'TASK_NOT_FOUND';
      throw err;
    }

    // Authoritative submission: Client cannot spoof `completed: true`
    if (!sessionId || !token) {
      const err = new Error('Chỉ có thể hoàn thành nhiệm vụ khi nộp kết quả phiên luyện tập hợp lệ (sessionId và token required).');
      err.code = 'SUBMISSION_EVIDENCE_REQUIRED';
      throw err;
    }

    const submissionResult = this.practiceEngine.submitSession({
      sessionId,
      token,
      answers,
      timeSpentSeconds
    });

    const completionEvidence = submissionResult.completionEvidence;

    // Mark task completed
    this.storage.updateTask(taskId, {
      status: 'completed',
      completionEvidence,
      currentSessionId: null
    });
    this.storage.recordTaskEvent(taskId, 'completed', completionEvidence);

    // Update Spaced Repetition Record
    let reviewRecord = this.storage.getReviewSchedule(userId, task.skillId);
    if (!reviewRecord) {
      reviewRecord = this.reviewScheduler.initializeRecord({ skillId: task.skillId, subjectId: task.subjectId });
    }
    const updatedReview = this.reviewScheduler.recordPracticeResult(reviewRecord, {
      accuracy: completionEvidence.accuracy,
      practicedDate: new Date()
    });
    updatedReview.userId = userId;
    this.storage.saveReviewSchedule(updatedReview);

    // Trigger Incremental Replanning
    const currentPlan = this.storage.getPlan(task.planId);
    if (currentPlan) {
      const profile = new LearningProfile(this.getProfile(userId));
      const updatedPlan = this.replanningEngine.replan({
        currentPlan,
        learningProfile: profile,
        triggerEvent: 'practice_completed',
        eventData: {
          taskId,
          skillId: task.skillId,
          accuracy: completionEvidence.accuracy,
          mode: completionEvidence.mode,
          completionEvidence
        }
      });

      this.storage.savePlan(updatedPlan);
      this.storage.savePlanVersion(updatedPlan.planId, {
        version: updatedPlan.planVersion,
        changeReason: updatedPlan.changeReason,
        beforeAfterSummary: updatedPlan.beforeAfterSummary,
        snapshotData: updatedPlan
      });
    }

    return {
      success: true,
      taskId,
      status: 'completed',
      completionEvidence,
      submissionResult,
      reviewSchedule: updatedReview
    };
  }

  postponeTask({ userId, taskId, newDate = null, reason = '' } = {}) {
    const task = this.storage.getTask(taskId);
    if (!task) throw new Error('Task not found');

    const updatedTask = this.storage.updateTask(taskId, {
      status: 'postponed',
      scheduledDate: newDate || task.scheduledDate,
      postponeReason: reason
    });
    this.storage.recordTaskEvent(taskId, 'postponed', { newDate, reason });

    return updatedTask;
  }

  replanPlan({ userId, triggerEvent = 'manual_replan', eventData = {} } = {}) {
    const currentPlan = this.getActivePlan(userId);
    if (!currentPlan) throw new Error('No active plan found to replan');

    const profile = new LearningProfile(this.getProfile(userId));
    const updatedPlan = this.replanningEngine.replan({
      currentPlan,
      learningProfile: profile,
      triggerEvent,
      eventData
    });

    this.storage.savePlan(updatedPlan);
    this.storage.savePlanVersion(updatedPlan.planId, {
      version: updatedPlan.planVersion,
      changeReason: updatedPlan.changeReason,
      beforeAfterSummary: updatedPlan.beforeAfterSummary,
      snapshotData: updatedPlan
    });

    return updatedPlan;
  }

  getProgress(userId) {
    const plan = this.getActivePlan(userId);
    const reviews = this.storage.getReviewSchedules(userId);
    const tasks = plan?.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'completed');

    let totalPracticeMinutes = 0;
    for (const t of completedTasks) {
      if (t.completionEvidence?.timeSpentSeconds) {
        totalPracticeMinutes += Math.round(t.completionEvidence.timeSpentSeconds / 60);
      } else {
        totalPracticeMinutes += t.estimatedMinutes || 20;
      }
    }

    return {
      userId,
      activePlanId: plan?.planId || null,
      planVersion: plan?.planVersion || 1,
      totalTasks: tasks.length,
      completedTasksCount: completedTasks.length,
      completionRate: tasks.length > 0 ? Number((completedTasks.length / tasks.length).toFixed(3)) : 0,
      totalPracticeMinutes,
      activeReviewSchedulesCount: reviews.length,
      dueReviewsCount: reviews.filter(r => this.reviewScheduler.isReviewDue(r)).length,
      recentCompletedTasks: completedTasks.slice(-5)
    };
  }

  getReviews(userId) {
    const reviews = this.storage.getReviewSchedules(userId);
    const now = new Date();
    return reviews.map(r => ({
      ...r,
      isDue: this.reviewScheduler.isReviewDue(r, now)
    }));
  }
}

module.exports = LearningServiceFacade;
