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
const Timer = require('../public/js/timer.js');

describe('1. Repository & Data Integrity (Lịch Sử 11 GDPT 2018 Focus)', () => {
  test('subjects.json contains grade 11 and lichsu11 active subject', () => {
    const data = loadSubjectsData(path.join(__dirname, '..'));
    assert.deepEqual(data.grades, [11], 'Should support grade 11');
    
    // Check lichsu11 exists and is ready
    const found11 = data.subjects.find(s => s.id === 'lichsu11' && s.grade === 11);
    assert.ok(found11, 'Subject lichsu11 must exist');
    assert.equal(found11.ready, true, 'Subject lichsu11 must have ready: true');
    assert.equal(found11.status, 'active', 'Subject lichsu11 status must be active');
    assert.ok(found11.questionCount > 0, 'Subject lichsu11 must have questions');
  });

  test('Redundant subject files are completely cleaned and removed', () => {
    const redundantFiles = [
      'toan10.json', 'toan11.json', 'toan12.json',
      'vatli10.json', 'vatli11.json', 'vatli12.json',
      'hoahoc10.json', 'hoahoc11.json', 'hoahoc12.json',
      'tienganh10.json', 'tienganh11.json', 'tienganh12.json',
      'lichsu10.json', 'lichsu12.json',
      'su.json', 'sinh.json', 'tin.json'
    ];
    redundantFiles.forEach(f => {
      const p = path.join(__dirname, '..', 'data', f);
      assert.equal(fs.existsSync(p), false, `Redundant file data/${f} must be completely deleted`);
    });
  });

  test('Authentic question bank lichsu11.json exists and is valid JSON', () => {
    const p = path.join(__dirname, '..', 'data', 'lichsu11.json');
    assert.ok(fs.existsSync(p), 'File data/lichsu11.json must exist');
    const content = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.ok(Array.isArray(content.lessons), 'data/lichsu11.json must have lessons array');
    assert.equal(content.lessons.length, 4, 'data/lichsu11.json must have 4 core lessons');
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
      targetSubjects: ['lichsu'],
      goal: 'score_8_plus'
    });

    assert.equal(ProfileStore.hasCompletedOnboarding(), true, 'Should be true after saving');
    const profile = ProfileStore.getProfile();
    assert.equal(profile.grade, 11);
    assert.deepEqual(profile.targetSubjects, ['lichsu']);
    assert.equal(profile.goal, 'score_8_plus');
  });

  test('Recording real test attempts calculates genuine metrics', () => {
    localStorage.clear();
    ProfileStore.recordSession({
      subjectId: 'lichsu11',
      subjectName: 'Lịch sử 11',
      score: 18,
      total: 20,
      mode: 'exam',
      timeSpentSeconds: 600
    });

    ProfileStore.recordSession({
      subjectId: 'lichsu11',
      subjectName: 'Lịch sử 11',
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
  test('Question formats include MCQ and TF Group in lichsu11.json', () => {
    const suData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'lichsu11.json'), 'utf8'));

    const hasSuMcq = suData.lessons.some(l => l.questions && l.questions.some(q => q.type === 'mcq'));
    const hasSuTf = suData.lessons.some(l => l.questionGroups && l.questionGroups.length > 0);

    assert.ok(hasSuMcq, 'lichsu11.json must contain MCQ questions');
    assert.ok(hasSuTf, 'lichsu11.json must contain True/False groups');
  });
});
