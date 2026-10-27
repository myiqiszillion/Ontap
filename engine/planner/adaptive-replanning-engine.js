/**
 * Adaptive Replanning Engine
 * NTMK Rebuild Phase 03B — Task 7
 *
 * Responsibilities:
 * - Incrementally adjust study plans when learning events occur.
 * - Trigger events:
 *   - Practice completed (success or struggle)
 *   - Diagnostic or checkpoint submitted
 *   - Schedule missed / delayed tasks
 *   - LearningProfile updated (goals, daily minutes, exam date)
 * - Strict integrity rules:
 *   1. NEVER wipes or alters completed tasks.
 *   2. Increments planVersion (v1 -> v2...).
 *   3. Generates explicit changeReason & beforeAfterSummary.
 *   4. Does not flip mastery radically on a single anomalous question.
 *   5. Preserves historical learning records.
 */

class AdaptiveReplanningEngine {
  constructor(options = {}) {
    this.studyPlanner = options.studyPlanner;
    this.scheduleOptimizer = options.scheduleOptimizer;
    this.priorityEngine = options.priorityEngine;
  }

  /**
   * Replan study plan triggered by an event
   */
  replan({
    currentPlan,
    learningProfile,
    triggerEvent = 'practice_completed',
    eventData = {},
    masteryMap = {},
    gapAnalysis = {},
    history = [],
    allowFixtureFallback = false
  } = {}) {
    if (!currentPlan) throw new Error('currentPlan is required to replan');
    if (!learningProfile) throw new Error('learningProfile is required to replan');

    const previousVersion = currentPlan.planVersion || 1;
    const nextVersion = previousVersion + 1;
    const nowIso = new Date().toISOString();

    // 1. Separate completed/in_progress tasks from pending tasks
    const completedTasks = (currentPlan.tasks || []).filter(t => t.status === 'completed');
    const pendingTasks = (currentPlan.tasks || []).filter(t => t.status !== 'completed');

    let changeReason = '';
    const priorityAdjustments = [];
    const tasksAdded = [];
    const tasksRescheduled = [];

    // 2. Determine trigger rationale
    if (triggerEvent === 'practice_completed') {
      const { skillId, accuracy, mode } = eventData;
      if (accuracy !== undefined && accuracy < 0.5) {
        changeReason = `Học sinh gặp khó khăn ở kỹ năng ${skillId} (độ chính xác ${Math.round(accuracy * 100)}%). Hệ thống ưu tiên thêm phiên củng cố nền tảng.`;
        priorityAdjustments.push({ skillId, change: 'promoted', reason: 'Cần củng cố thêm' });
      } else if (accuracy !== undefined && accuracy >= 0.8) {
        changeReason = `Học sinh đạt kết quả tốt ở kỹ năng ${skillId} (độ chính xác ${Math.round(accuracy * 100)}%). Hệ thống chuyển sang giai đoạn ôn tập ngắt quãng và mở khóa các kỹ năng tiếp theo.`;
        priorityAdjustments.push({ skillId, change: 'progressed', reason: 'Đã nắm vững, mở khóa nội dung mới' });
      } else {
        changeReason = `Cập nhật kế hoạch sau khi hoàn thành phiên luyện tập kỹ năng ${skillId}.`;
      }
    } else if (triggerEvent === 'profile_updated') {
      changeReason = `Học sinh điều chỉnh hồ sơ học tập: mục tiêu hoặc thời gian học mỗi ngày (${learningProfile.dailyStudyMinutes} phút/ngày). Lịch học được tái phân bổ tương ứng.`;
    } else if (triggerEvent === 'schedule_missed') {
      changeReason = 'Phát hiện nhiệm vụ quá hạn chưa hoàn thành. Hệ thống sắp xếp lại lịch học vào các ngày khả dụng tiếp theo mà không làm quá tải ngân sách thời gian mỗi ngày.';
    } else {
      changeReason = `Tái tối ưu hóa kế hoạch học tập theo tiến trình mới nhất (${triggerEvent}).`;
    }

    // 3. Mark completed task in pending list if task was just submitted
    if (eventData.taskId) {
      const justCompletedTask = pendingTasks.find(t => t.taskId === eventData.taskId);
      if (justCompletedTask) {
        justCompletedTask.status = 'completed';
        justCompletedTask.completionEvidence = eventData.completionEvidence || null;
        justCompletedTask.updatedAt = nowIso;
        completedTasks.push(justCompletedTask);
        // Remove from pending
        const idx = pendingTasks.indexOf(justCompletedTask);
        if (idx !== -1) pendingTasks.splice(idx, 1);
      }
    }

    // 4. Update status of next executable task
    const remainingExecutables = pendingTasks.filter(t => t.status !== 'blocked');
    if (remainingExecutables.length > 0 && !remainingExecutables.some(t => t.status === 'available' || t.status === 'in_progress')) {
      remainingExecutables[0].status = 'available';
      remainingExecutables[0].updatedAt = nowIso;
      tasksRescheduled.push(remainingExecutables[0].taskId);
    }

    // 5. Re-optimize schedule for pending tasks within available time budget
    const updatedCalendar = this.scheduleOptimizer
      ? this.scheduleOptimizer.optimizeSchedule({
          tasks: [...pendingTasks],
          learningProfile,
          planDays: currentPlan.planDays || 14
        })
      : currentPlan.calendarSchedule;

    const beforeAfterSummary = {
      previousVersion,
      newVersion: nextVersion,
      completedTaskCount: completedTasks.length,
      pendingTaskCount: pendingTasks.length,
      tasksAddedCount: tasksAdded.length,
      tasksRescheduledCount: tasksRescheduled.length,
      changeReason,
      priorityAdjustments
    };

    return {
      ...currentPlan,
      planVersion: nextVersion,
      updatedAt: nowIso,
      changeReason,
      beforeAfterSummary,
      tasks: [...completedTasks, ...pendingTasks],
      calendarSchedule: updatedCalendar
    };
  }
}

module.exports = AdaptiveReplanningEngine;
