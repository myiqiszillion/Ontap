/**
 * Phase 03B Unit Tests — Learning Profile & Learning Priority Engine
 * NTMK Rebuild Phase 03B — Tasks 1 & 2
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const LearningProfile = require('../engine/planner/learning-profile.js');
const LearningPriorityEngine = require('../engine/planner/learning-priority-engine.js');
const SkillGraph = require('../engine/diagnostic/skill-graph.js');

describe('Task 1 — Personalized Learning Profile', () => {
  test('1.1 Creates valid default learning profile without PII', () => {
    const profile = new LearningProfile({ userId: 'student_123', grade: 10 });
    const json = profile.toJSON();

    assert.equal(json.userId, 'student_123');
    assert.equal(json.grade, 10);
    assert.equal(json.dailyStudyMinutes, 30);
    assert.deepEqual(json.prioritySubjects, ['toan']);
    assert.deepEqual(json.studyDaysPerWeek, [1, 2, 3, 4, 5, 6]);
    assert.equal(json.email, undefined, 'Must not store PII');
    assert.equal(json.phone, undefined, 'Must not store PII');
    assert.equal(json.fullName, undefined, 'Must not store PII');
  });

  test('1.2 Validates time budget bounds (15 - 180 minutes)', () => {
    assert.throws(() => {
      new LearningProfile({ userId: 'u1', grade: 10, dailyStudyMinutes: 10 });
    }, /Thời gian học mỗi ngày phải từ 15 đến 180 phút/);

    assert.throws(() => {
      new LearningProfile({ userId: 'u1', grade: 10, dailyStudyMinutes: 200 });
    }, /Thời gian học mỗi ngày phải từ 15 đến 180 phút/);

    const validLow = new LearningProfile({ userId: 'u1', grade: 10, dailyStudyMinutes: 15 });
    assert.equal(validLow.dailyStudyMinutes, 15);
  });

  test('1.3 Validates study days per week (1=Mon to 7=Sun)', () => {
    assert.throws(() => {
      new LearningProfile({ userId: 'u1', grade: 10, studyDaysPerWeek: [0, 8] });
    }, /Ngày học trong tuần phải là số từ 1/);

    assert.throws(() => {
      new LearningProfile({ userId: 'u1', grade: 10, studyDaysPerWeek: [] });
    }, /Phải chọn ít nhất 1 ngày học/);
  });

  test('1.4 Updates goals and target exam date without redoing onboarding', () => {
    const profile = new LearningProfile({ userId: 'u1', grade: 11 });
    profile.updateGoals(['exam_preparation'], { targetExamDate: '2027-06-25' });

    assert.deepEqual(profile.learningGoals, ['exam_preparation']);
    assert.equal(profile.targetExamDate, '2027-06-25');
  });
});

describe('Task 2 — Learning Priority Engine', () => {
  const skillGraph = new SkillGraph();
  const priorityEngine = new LearningPriorityEngine({ skillGraph });

  test('2.1 Distinguishes remediation, further_assessment, and review_consolidation', () => {
    const profile = new LearningProfile({ userId: 'student_p1', grade: 10, prioritySubjects: ['toan'] });

    const masteryMap = {
      'math-10-sets-logic': {
        skillId: 'math-10-sets-logic',
        status: 'needs_foundation',
        confidenceLevel: 'medium',
        evidenceCount: 3,
        estimatedMastery: 0.35,
        observedAccuracy: 0.30
      },
      'math-10-quad-func': {
        skillId: 'math-10-quad-func',
        status: 'insufficient_evidence',
        confidenceLevel: 'low',
        evidenceCount: 1,
        estimatedMastery: 0.50,
        observedAccuracy: 0.50
      },
      'math-10-quad-ineq': {
        skillId: 'math-10-quad-ineq',
        status: 'proficient',
        confidenceLevel: 'high',
        evidenceCount: 4,
        estimatedMastery: 0.85,
        observedAccuracy: 0.90
      }
    };

    const ranked = priorityEngine.rankPriorities({
      learningProfile: profile,
      masteryMap
    });

    const menhDe = ranked.find(r => r.skillId === 'math-10-sets-logic');
    const tapHop = ranked.find(r => r.skillId === 'math-10-quad-func');
    const vecto = ranked.find(r => r.skillId === 'math-10-quad-ineq');

    assert.ok(menhDe, 'Remediation skill must be present');
    assert.equal(menhDe.category, 'remediation');

    assert.ok(tapHop, 'Insufficient evidence skill must be present');
    assert.equal(tapHop.category, 'further_assessment');

    assert.ok(vecto, 'Proficient skill must be present');
    assert.equal(vecto.category, 'review_consolidation');
  });

  test('2.2 Does NOT classify untested skills as weak by default', () => {
    const profile = new LearningProfile({ userId: 'student_p2', grade: 10, prioritySubjects: ['toan'] });
    const ranked = priorityEngine.rankPriorities({
      learningProfile: profile,
      masteryMap: {} // No tests taken
    });

    for (const item of ranked) {
      assert.notEqual(item.category, 'remediation', 'Untested skill cannot be labeled remediation without evidence');
      assert.equal(item.category, 'further_assessment');
    }
  });

  test('2.3 Computes transparent, explainable priority score breakdown', () => {
    const profile = new LearningProfile({ userId: 'student_p3', grade: 10, prioritySubjects: ['toan'] });
    const masteryMap = {
      'math-10-sets-logic': {
        skillId: 'math-10-sets-logic',
        status: 'needs_foundation',
        confidenceLevel: 'high',
        evidenceCount: 4,
        estimatedMastery: 0.20,
        observedAccuracy: 0.20
      }
    };

    const ranked = priorityEngine.rankPriorities({
      learningProfile: profile,
      masteryMap,
      gapAnalysis: { criticalGaps: ['math-10-sets-logic'] }
    });


    const item = ranked[0];
    assert.ok(item.priorityScore > 0);
    assert.ok(item.scoreBreakdown);
    assert.equal(typeof item.scoreBreakdown.needScore, 'number');
    assert.equal(typeof item.scoreBreakdown.severityScore, 'number');
    assert.equal(typeof item.scoreBreakdown.goalScore, 'number');
    assert.ok(item.reasons.length > 0, 'Must have clear pedagogical reasons');
  });
});
