/**
 * Phase 03B API Contracts & Security Gates
 * NTMK Rebuild Phase 03B — Task 9 & Task 11
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app } = require('../server.js');

process.env.NODE_ENV = 'test';

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

function httpGet(path, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, { headers }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });
}

function httpPost(path, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

describe('Task 9 & 11 — Learning Planner API Contracts & Security Gates', () => {
  const testStudentId = 'student_api_test_' + Date.now();

  test('9.1 GET & PUT /api/v2/learning/profile manage learning profile cleanly', async () => {
    // 1. GET default profile
    const getRes = await httpGet(`/api/v2/learning/profile?userId=${testStudentId}`);
    assert.equal(getRes.statusCode, 200);
    const getBody = JSON.parse(getRes.body);
    assert.ok(getBody.success);
    assert.equal(getBody.profile.userId, testStudentId);

    // 2. PUT updated profile
    const putRes = await httpPost(`/api/v2/learning/profile`, {
      userId: testStudentId,
      dailyStudyMinutes: 45,
      learningGoals: ['exam_preparation']
    });
    assert.equal(putRes.statusCode, 200);
    const putBody = JSON.parse(putRes.body);
    assert.ok(putBody.success);
    assert.equal(putBody.profile.dailyStudyMinutes, 45);
    assert.deepEqual(putBody.profile.learningGoals, ['exam_preparation']);
  });

  test('9.2 POST /api/v2/learning/plan/generate creates study plan and GET /plan retrieves it', async () => {
    const genRes = await httpPost(`/api/v2/learning/plan/generate?allowFixtures=true`, {
      userId: testStudentId,
      requestedDays: 14,
      allowFixtures: true
    });
    assert.equal(genRes.statusCode, 201);
    const genBody = JSON.parse(genRes.body);
    assert.ok(genBody.success);
    assert.ok(genBody.plan.planId);
    assert.equal(genBody.plan.planDays, 14);
    assert.ok(genBody.plan.tasks.length > 0);

    // Retrieve active plan
    const getPlanRes = await httpGet(`/api/v2/learning/plan?userId=${testStudentId}`);
    assert.equal(getPlanRes.statusCode, 200);
    const getPlanBody = JSON.parse(getPlanRes.body);
    assert.ok(getPlanBody.success);
    assert.equal(getPlanBody.plan.planId, genBody.plan.planId);
    assert.ok(getPlanBody.plan.progressSummary);
  });

  test('9.3 POST /api/v2/learning/tasks/start begins adaptive practice session', async () => {
    // Get tasks
    const tasksRes = await httpGet(`/api/v2/learning/tasks?userId=${testStudentId}`);
    const tasksBody = JSON.parse(tasksRes.body);
    const targetTask = tasksBody.tasks.find(t => t.status !== 'blocked') || tasksBody.tasks[0];

    const startRes = await httpPost(`/api/v2/learning/tasks/start?allowFixtures=true`, {
      userId: testStudentId,
      taskId: targetTask.taskId,
      allowFixtures: true
    });
    assert.equal(startRes.statusCode, 200);
    const startBody = JSON.parse(startRes.body);
    assert.ok(startBody.success);
    assert.ok(startBody.practiceSession?.sessionId);
    assert.ok(startBody.practiceSession?.token);
    assert.ok(startBody.practiceSession?.questions?.length >= 2);

    // Verify answers stripped
    for (const q of startBody.practiceSession.questions) {
      assert.equal(q.mcqPayload?.correctOptionIndex, undefined);
    }
  });

  test('9.4 Anti-Spoofing: Rejects task completion without valid practice session token', async () => {
    const tasksRes = await httpGet(`/api/v2/learning/tasks?userId=${testStudentId}`);
    const tasksBody = JSON.parse(tasksRes.body);
    const targetTask = tasksBody.tasks[0];

    // Attempt to spoof completion with arbitrary payload
    const spoofRes = await httpPost(`/api/v2/learning/tasks/complete`, {
      userId: testStudentId,
      taskId: targetTask.taskId,
      completed: true // Spoofed flag
    });

    assert.equal(spoofRes.statusCode, 400);
    const spoofBody = JSON.parse(spoofRes.body);
    assert.equal(spoofBody.error, 'SUBMISSION_EVIDENCE_REQUIRED');
  });

  test('9.5 Valid task completion authoritatively updates progress and reviews', async () => {
    // Start task
    const tasksRes = await httpGet(`/api/v2/learning/tasks?userId=${testStudentId}`);
    const tasksBody = JSON.parse(tasksRes.body);
    const targetTask = tasksBody.tasks.find(t => t.status !== 'blocked') || tasksBody.tasks[0];

    const startRes = await httpPost(`/api/v2/learning/tasks/start?allowFixtures=true`, {
      userId: testStudentId,
      taskId: targetTask.taskId,
      allowFixtures: true
    });
    const { practiceSession } = JSON.parse(startRes.body);

    // Submit answers
    const answers = {};
    for (const q of practiceSession.questions) {
      answers[q.id] = 0;
    }

    const completeRes = await httpPost(`/api/v2/learning/tasks/complete`, {
      userId: testStudentId,
      taskId: targetTask.taskId,
      sessionId: practiceSession.sessionId,
      token: practiceSession.token,
      answers,
      timeSpentSeconds: 90
    });

    assert.equal(completeRes.statusCode, 200);
    const completeBody = JSON.parse(completeRes.body);
    assert.ok(completeBody.success);
    assert.equal(completeBody.status, 'completed');
    assert.ok(completeBody.completionEvidence);
    assert.ok(completeBody.reviewSchedule);

    // Verify progress endpoint
    const progRes = await httpGet(`/api/v2/learning/progress?userId=${testStudentId}`);
    const progBody = JSON.parse(progRes.body);
    assert.ok(progBody.progress.completedTasksCount >= 1);
  });
});
