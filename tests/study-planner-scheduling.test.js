/**
 * Phase 03B Unit Tests — Study Planner & Schedule Optimizer
 * NTMK Rebuild Phase 03B — Tasks 3 & 4
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const LearningProfile = require('../engine/planner/learning-profile.js');
const PersonalizedStudyPlanner = require('../engine/planner/personalized-study-planner.js');
const StudyScheduleOptimizer = require('../engine/planner/study-schedule-optimizer.js');
const SkillGraph = require('../engine/diagnostic/skill-graph.js');
const { STUDY_PLAN_SCENARIOS } = require('./fixtures/study-plan-fixtures.js');

describe('Task 3 & 4 — Personalized Study Planner & Schedule Optimizer', () => {
  const skillGraph = new SkillGraph();
  const scheduleOptimizer = new StudyScheduleOptimizer();
  const studyPlanner = new PersonalizedStudyPlanner({
    skillGraph,
    scheduleOptimizer
  });

  test('3.1 Resolves plan duration correctly (7, 14, 30 days or exam deadline)', () => {
    const profileStandard = new LearningProfile({ userId: 'u1', grade: 10 });
    assert.equal(studyPlanner.resolvePlanDuration(profileStandard, null), 14);
    assert.equal(studyPlanner.resolvePlanDuration(profileStandard, 7), 7);
    assert.equal(studyPlanner.resolvePlanDuration(profileStandard, 30), 30);

    // Exam in 9 days -> resolves to 7 days
    const examDate9d = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const profileExam = new LearningProfile({ userId: 'u2', grade: 12, targetExamDate: examDate9d });
    assert.equal(studyPlanner.resolvePlanDuration(profileExam), 7);
  });

  test('3.2 Generates typed tasks with valid schema & pedagogical reasons', () => {
    const scenario = STUDY_PLAN_SCENARIOS.SCENARIO_1_G10_MATH_WEAK;
    const profile = new LearningProfile(scenario.profile);

    const plan = studyPlanner.generatePlan({
      learningProfile: profile,
      masteryMap: scenario.masteryMap,
      gapAnalysis: scenario.gapAnalysis,
      allowFixtureFallback: true
    });

    assert.ok(plan.planId);
    assert.equal(plan.planVersion, 1);
    assert.ok(plan.tasks.length > 0);

    const validTypes = ['remediation', 'adaptive_practice', 'wrong_review', 'spaced_review', 'followup_assessment'];
    for (const task of plan.tasks) {
      assert.ok(task.taskId);
      assert.ok(task.skillId);
      assert.ok(validTypes.includes(task.taskType), `Task type ${task.taskType} must be valid`);
      assert.ok(typeof task.title === 'string' && task.title.length > 0);
      assert.ok(typeof task.reason === 'string' && task.reason.length > 0);
      assert.ok(typeof task.estimatedMinutes === 'number' && task.estimatedMinutes > 0);
      assert.ok(task.scheduledDate, 'Task must be scheduled on a calendar date');
      assert.equal(task.completionEvidence, null, 'New tasks cannot have completion evidence');
    }
  });

  test('4.1 Strict daily time budget compliance: never exceeds dailyStudyMinutes', () => {
    const scenario = STUDY_PLAN_SCENARIOS.SCENARIO_5_MINIMAL_TIME_BUDGET;
    const profile = new LearningProfile(scenario.profile);
    const dailyLimit = profile.dailyStudyMinutes; // 20 mins

    const plan = studyPlanner.generatePlan({
      learningProfile: profile,
      allowFixtureFallback: true
    });

    // Check each calendar day
    for (const day of plan.calendarSchedule) {
      assert.ok(
        day.scheduledMinutes <= dailyLimit,
        `Day ${day.dateKey} scheduled ${day.scheduledMinutes} min, exceeding budget of ${dailyLimit} min`
      );
    }
  });

  test('4.2 Strictly respects rest days declared by student', () => {
    // Only study on Mon, Wed, Fri ([1, 3, 5])
    const profile = new LearningProfile({
      userId: 'u_rest_days',
      grade: 10,
      dailyStudyMinutes: 30,
      studyDaysPerWeek: [1, 3, 5]
    });

    const plan = studyPlanner.generatePlan({
      learningProfile: profile,
      allowFixtureFallback: true
    });

    for (const day of plan.calendarSchedule) {
      if (![1, 3, 5].includes(day.dayOfWeek)) {
        assert.equal(day.isStudyDay, false);
        assert.equal(day.tasks.length, 0, `Rest day ${day.dateKey} must not have scheduled tasks`);
      }
    }
  });

  test('4.3 Topological prerequisite ordering: foundational tasks scheduled on or before dependent tasks', () => {
    const tasks = [
      { skillId: 'math_advanced', estimatedMinutes: 20, prerequisiteReferences: ['math_foundation'] },
      { skillId: 'math_foundation', estimatedMinutes: 20, prerequisiteReferences: [] }
    ];

    const profile = new LearningProfile({ userId: 'u_topo', grade: 10, dailyStudyMinutes: 20 });
    const calendar = scheduleOptimizer.optimizeSchedule({
      tasks,
      learningProfile: profile,
      planDays: 7
    });

    const scheduledDays = [];
    for (const day of calendar) {
      for (const t of day.tasks) {
        scheduledDays.push({ skillId: t.skillId, dateKey: day.dateKey });
      }
    }

    const foundationIdx = scheduledDays.findIndex(s => s.skillId === 'math_foundation');
    const advancedIdx = scheduledDays.findIndex(s => s.skillId === 'math_advanced');

    assert.ok(foundationIdx !== -1, 'Foundation must be scheduled');
    assert.ok(advancedIdx !== -1, 'Advanced must be scheduled');
    assert.ok(foundationIdx < advancedIdx, 'Foundational task must be scheduled before dependent task');
  });

  test('3.3 Content availability guard: marks task blocked if verified questions are unavailable', () => {
    // Empty bank without fixture fallback -> content unavailable
    const emptyPlanner = new PersonalizedStudyPlanner({
      bankStorage: null,
      skillGraph
    });

    const profile = new LearningProfile({ userId: 'u_no_content', grade: 10 });
    const plan = emptyPlanner.generatePlan({
      learningProfile: profile,
      allowFixtureFallback: false
    });

    // In production mode with no verified questions in bank, tasks must be blocked
    for (const task of plan.tasks) {
      assert.equal(task.status, 'blocked');
      assert.equal(task.questionSetReference, null);
      assert.ok(task.contentNotice.includes('thẩm định bản quyền'));
    }
  });
});
