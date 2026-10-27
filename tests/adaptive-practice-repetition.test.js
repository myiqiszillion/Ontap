/**
 * Phase 03B Unit Tests — Adaptive Practice, Spaced Repetition & Replanning Engine
 * NTMK Rebuild Phase 03B — Tasks 5, 6 & 7
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const AdaptivePracticeEngine = require('../engine/planner/adaptive-practice-engine.js');
const SpacedRepetitionScheduler = require('../engine/planner/spaced-repetition-scheduler.js');
const AdaptiveReplanningEngine = require('../engine/planner/adaptive-replanning-engine.js');
const SkillGraph = require('../engine/diagnostic/skill-graph.js');

describe('Task 5 — Adaptive Practice Engine', () => {
  const skillGraph = new SkillGraph();
  const practiceEngine = new AdaptivePracticeEngine({ skillGraph });

  test('5.1 Starts practice session and strips answer keys & explanations for student', () => {
    const session = practiceEngine.startSession({
      studentId: 'student_t5',
      mode: 'weak_skill_practice',
      subjectId: 'toan',
      skillId: 'toan-10-menh-de-01',
      allowFixtureFallback: true
    });

    assert.ok(session.sessionId);
    assert.ok(session.token);
    assert.ok(session.questions.length >= 2);

    for (const q of session.questions) {
      assert.equal(q.mcqPayload?.correctOptionIndex, undefined, 'Answer key must be stripped');
      assert.ok(!q.explanation, 'Explanation must be stripped');
      assert.equal(q.authoritativeExplanation, undefined, 'Authoritative explanation must be stripped');
    }

  });

  test('5.2 Submits practice session authoritatively and returns completionEvidence', () => {
    const session = practiceEngine.startSession({
      studentId: 'student_t5',
      mode: 'weak_skill_practice',
      subjectId: 'toan',
      skillId: 'toan-10-menh-de-01',
      allowFixtureFallback: true
    });

    // Submit answers
    const answers = {};
    for (const q of session.questions) {
      answers[q.id] = 0; // Choose first option
    }

    const result = practiceEngine.submitSession({
      sessionId: session.sessionId,
      token: session.token,
      answers,
      timeSpentSeconds: 120
    });

    assert.ok(result.completionEvidence);
    assert.equal(typeof result.completionEvidence.accuracy, 'number');
    assert.equal(typeof result.completionEvidence.correctCount, 'number');
    assert.equal(result.completionEvidence.timeSpentSeconds, 120);
    assert.ok(result.skillEvidenceList.length > 0);
  });

  test('5.3 Fails closed if pool of verified questions is insufficient (< 2)', () => {
    assert.throws(() => {
      practiceEngine.startSession({
        studentId: 'student_t5',
        mode: 'weak_skill_practice',
        subjectId: 'toan',
        skillId: 'non-existent-skill-xyz',
        allowFixtureFallback: false
      });
    }, (err) => {
      return err.code === 'INSUFFICIENT_VERIFIED_QUESTIONS';
    });
  });
});

describe('Task 6 — Spaced Repetition & Review Scheduler', () => {
  const scheduler = new SpacedRepetitionScheduler();

  test('6.1 Expands review interval on strong performance (accuracy >= 80%)', () => {
    let record = scheduler.initializeRecord({ skillId: 'toan-10-menh-de-01', subjectId: 'toan' });
    assert.equal(record.currentIntervalDays, 1);

    // Day 1 review with 90% accuracy
    record = scheduler.recordPracticeResult(record, { accuracy: 0.9, practicedDate: '2026-10-01' });
    assert.equal(record.consecutiveSuccesses, 1);
    assert.ok(record.currentIntervalDays >= 3);
    assert.equal(record.retentionEvidence, 'strong');

    // Day 2 review with 85% accuracy
    record = scheduler.recordPracticeResult(record, { accuracy: 0.85, practicedDate: '2026-10-04' });
    assert.equal(record.consecutiveSuccesses, 2);
    assert.ok(record.currentIntervalDays >= 7);
  });

  test('6.2 Resets interval to 1 day on memory lapse (accuracy < 50%)', () => {
    let record = scheduler.initializeRecord({ skillId: 'toan-10-tap-hop-01', subjectId: 'toan' });
    record.currentIntervalDays = 14;
    record.consecutiveSuccesses = 3;

    // Student scored 25%
    record = scheduler.recordPracticeResult(record, { accuracy: 0.25, practicedDate: '2026-10-10' });
    assert.equal(record.consecutiveSuccesses, 0, 'Consecutive successes must reset to 0');
    assert.equal(record.currentIntervalDays, 1, 'Interval must reset to 1 day');
    assert.equal(record.retentionEvidence, 'lapsed');
    assert.ok(record.explanation.includes('khắc phục lỗ hổng'));
  });
});

describe('Task 7 — Adaptive Replanning Engine', () => {
  const replanner = new AdaptiveReplanningEngine({});

  test('7.1 Increments planVersion and NEVER deletes completed tasks', () => {
    const dummyPlan = {
      planId: 'plan-test-01',
      planVersion: 1,
      tasks: [
        { taskId: 'task-1', skillId: 's1', status: 'completed', completionEvidence: { accuracy: 0.9 } },
        { taskId: 'task-2', skillId: 's2', status: 'available' }
      ]
    };

    const replanned = replanner.replan({
      currentPlan: dummyPlan,
      learningProfile: { dailyStudyMinutes: 30, studyDaysPerWeek: [1, 2, 3, 4, 5, 6] },
      triggerEvent: 'practice_completed',
      eventData: { taskId: 'task-2', skillId: 's2', accuracy: 0.85 }
    });

    assert.equal(replanned.planVersion, 2);
    assert.ok(replanned.beforeAfterSummary);
    assert.equal(replanned.beforeAfterSummary.previousVersion, 1);
    assert.equal(replanned.beforeAfterSummary.newVersion, 2);

    const task1 = replanned.tasks.find(t => t.taskId === 'task-1');
    assert.ok(task1, 'Completed task-1 must be preserved');
    assert.equal(task1.status, 'completed');
  });
});
