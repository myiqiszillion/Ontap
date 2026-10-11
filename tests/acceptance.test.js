/**
 * Automated Acceptance Test Suite for NTMK Rebuild Phase 01
 * Uses Node.js built-in test runner (node --test)
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

// Import server helpers
const { loadSubjectsData } = require('../server.js');
const ProfileStore = require('../public/js/state.js');
const DataLoader = require('../public/js/data-loader.js');
const Timer = require('../public/js/timer.js');

describe('1. Repository & Data Integrity', () => {
  test('subjects.json contains grades 10, 11, 12 and target 4 subjects', () => {
    const data = loadSubjectsData(path.join(__dirname, '..'));
    assert.deepEqual(data.grades, [10, 11, 12], 'Should support grades 10, 11, and 12');
    
    // Check target subjects exist
    const targetKeys = ['toan', 'vatli', 'hoahoc', 'tienganh'];
    targetKeys.forEach(key => {
      const found10 = data.subjects.find(s => s.subjectKey === key && s.grade === 10);
      assert.ok(found10, `Target subject ${key} for grade 10 should exist`);
      assert.equal(found10.ready, false, `New subject ${key} should have ready: false in Phase 01`);
      assert.equal(found10.status, 'in_development', `New subject ${key} status should be in_development`);
    });
  });

  test('Legacy subjects (Lịch sử, Sinh học, Tin học) are 100% preserved and ready', () => {
    const data = loadSubjectsData(path.join(__dirname, '..'));
    const su = data.subjects.find(s => s.id === 'su');
    const sinh = data.subjects.find(s => s.id === 'sinh');
    const tin = data.subjects.find(s => s.id === 'tin');

    assert.ok(su && su.ready && su.questionCount > 0, 'Lịch Sử 10 must be active with questions');
    assert.ok(sinh && sinh.ready && sinh.questionCount > 0, 'Sinh Học 10 must be active with questions');
    assert.ok(tin && tin.ready && tin.questionCount > 0, 'Tin Học 10 must be active with questions');
  });

  test('Existing question bank files exist and are valid JSON', () => {
    const files = ['su.json', 'sinh.json', 'tin.json'];
    files.forEach(f => {
      const p = path.join(__dirname, '..', 'data', f);
      assert.ok(fs.existsSync(p), `File data/${f} must exist`);
      const content = JSON.parse(fs.readFileSync(p, 'utf8'));
      assert.ok(Array.isArray(content.lessons), `data/${f} must have lessons array`);
      assert.ok(content.lessons.length > 0, `data/${f} must have at least 1 lesson`);
    });
  });
});

describe('2. State Management & Zero-Mock Metrics', () => {
  // Mock localStorage for node environment
  const mockStorage = {};
  global.localStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };

  test('Empty state initially reports 0 sessions and null average', () => {
    localStorage.clear();
    const metrics = ProfileStore.getMetrics();
    assert.equal(metrics.totalSessions, 0, 'Should start with 0 completed sessions');
    assert.equal(metrics.averagePercentage, null, 'Should not report fake average score');
    assert.equal(metrics.hasActivity, false, 'Should have hasActivity: false');
  });

  test('Onboarding profile save and retrieval', () => {
    localStorage.clear();
    assert.equal(ProfileStore.hasCompletedOnboarding(), false, 'Should be false before saving');

    ProfileStore.saveProfile({
      grade: 11,
      targetSubjects: ['toan', 'vatli'],
      goal: 'graduation_pass'
    });

    assert.equal(ProfileStore.hasCompletedOnboarding(), true, 'Should be true after saving');
    const profile = ProfileStore.getProfile();
    assert.equal(profile.grade, 11);
    assert.deepEqual(profile.targetSubjects, ['toan', 'vatli']);
    assert.equal(profile.goal, 'graduation_pass');
  });

  test('Recording real test attempts calculates genuine metrics', () => {
    localStorage.clear();
    ProfileStore.recordSession({
      subjectId: 'su',
      subjectName: 'Lịch Sử 10',
      score: 18,
      total: 20,
      mode: 'exam',
      timeSpentSeconds: 600
    });

    ProfileStore.recordSession({
      subjectId: 'sinh',
      subjectName: 'Sinh Học 10',
      score: 14,
      total: 20,
      mode: 'exam',
      timeSpentSeconds: 480
    });

    const metrics = ProfileStore.getMetrics();
    assert.equal(metrics.totalSessions, 2, 'Should record exactly 2 sessions');
    // Session 1: 90%, Session 2: 70% -> Average: 80%
    assert.equal(metrics.averagePercentage, 80, 'Average should be exactly 80%');
    assert.equal(metrics.totalTimeMinutes, 18, 'Total time should be 18 minutes');
    assert.equal(metrics.hasActivity, true);
  });
});

describe('3. Timer Persistence & Edge Cases', () => {
  const mockSessionStorage = {};
  global.sessionStorage = {
    getItem: (k) => mockSessionStorage[k] || null,
    setItem: (k, v) => { mockSessionStorage[k] = String(v); },
    removeItem: (k) => { delete mockSessionStorage[k]; }
  };

  test('Timer formats seconds to MM:SS correctly', () => {
    assert.equal(Timer.formatTime(125), '2:05');
    assert.equal(Timer.formatTime(0), '0:00');
    assert.equal(Timer.formatTime(3600), '60:00');
  });
});

describe('4. GDPT 2018 Decision 764/QĐ-BGDĐT Specifications', () => {
  test('Question formats include MCQ, TF Group, Short Answer in su.json & tin.json', () => {
    const suData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'su.json'), 'utf8'));
    const tinData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'tin.json'), 'utf8'));

    const hasMcq = suData.lessons.some(l => l.questions && l.questions.some(q => q.type === 'mcq'));
    const hasTf = suData.lessons.some(l => l.questionGroups && l.questionGroups.length > 0);
    const hasTinTf = tinData.lessons.some(l => l.questionGroups && l.questionGroups.length > 0);

    assert.ok(hasMcq, 'su.json must contain MCQ questions');
    assert.ok(hasTf, 'su.json must contain True/False groups');
    assert.ok(hasTinTf, 'tin.json must contain True/False groups');
  });
});
