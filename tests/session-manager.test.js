/**
 * Test Suite: Exam Session Manager & Reload Recovery
 * Validates session lifecycle, reload recovery, and anti-duplicate submit protection
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const ExamSessionManager = require('../engine/session-manager.js');

describe('Exam Session Manager & Reload Resilience', () => {
  // Mock localStorage for test environment
  const mockStorage = {};
  global.localStorage = {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };

  beforeEach(() => {
    localStorage.clear();
    ExamSessionManager.isSubmitting = false;
  });

  test('Session Start: creates valid in-progress session', () => {
    const session = ExamSessionManager.startSession({
      subjectId: 'toan10',
      questions: [{ id: 'q1', format: 'multiple_choice' }],
      durationMinutes: 90
    });

    assert.ok(session.id.startsWith('ses_'));
    assert.equal(session.subjectId, 'toan10');
    assert.equal(session.status, 'in_progress');
    assert.equal(session.durationSeconds, 5400);
    assert.equal(session.remainingSeconds, 5400);
    assert.equal(session.isSubmitted, false);

    const active = ExamSessionManager.getActiveSession();
    assert.ok(active);
    assert.equal(active.id, session.id);
  });

  test('Answer Persistence: auto-saves answers and pointers', () => {
    ExamSessionManager.startSession({
      subjectId: 'toan10',
      questions: [
        { id: 'q1', format: 'multiple_choice' },
        { id: 'q2', format: 'short_answer' }
      ]
    });

    ExamSessionManager.recordAnswer(0, 2); // answered option C for question 0
    ExamSessionManager.recordAnswer(1, '25'); // answered 25 for question 1
    ExamSessionManager.updateCurrentIndex(1);

    const active = ExamSessionManager.getActiveSession();
    assert.equal(active.answers[0], 2);
    assert.equal(active.answers[1], '25');
    assert.equal(active.currentQuestionIndex, 1);
  });

  test('Reload Recovery: resumes active session with remaining time', () => {
    const session = ExamSessionManager.startSession({
      subjectId: 'vatli10',
      questions: [{ id: 'q1', format: 'multiple_choice' }],
      durationMinutes: 50
    });

    // Simulate answer given before browser reload
    ExamSessionManager.recordAnswer(0, 1);

    // Simulate page reload: retrieve active session anew
    const resumed = ExamSessionManager.getActiveSession();
    assert.ok(resumed, 'Must find active session on reload');
    assert.equal(resumed.id, session.id);
    assert.equal(resumed.answers[0], 1);
    assert.ok(resumed.remainingSeconds > 0 && resumed.remainingSeconds <= 3000);
  });

  test('Anti-Duplicate Submission: prevents multiple concurrent submits', () => {
    ExamSessionManager.startSession({
      subjectId: 'toan10',
      questions: [
        { id: 'q1', format: 'multiple_choice', mcqPayload: { options: ['A', 'B'], correctOptionIndex: 0 } }
      ]
    });
    ExamSessionManager.recordAnswer(0, 0);

    // First submission
    const result1 = ExamSessionManager.submitSession();
    assert.ok(result1, 'First submission must succeed');
    assert.equal(result1.session.status, 'submitted');

    // Immediate duplicate submission attempt
    const result2 = ExamSessionManager.submitSession();
    assert.equal(result2, null, 'Duplicate submission must be rejected');

    // Verify active session was cleared from storage
    assert.equal(ExamSessionManager.getActiveSession(), null);
  });
});
