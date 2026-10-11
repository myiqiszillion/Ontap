/**
 * Test Suite: Question Bank API V2 Integration
 * Validates endpoints for querying questions, validating candidate schemas, and blueprints
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app } = require('../server.js');

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

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    }).on('error', reject);
  });
}

function httpPost(path, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
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

describe('Question Bank API V2 Integration', () => {

  test('GET /api/v2/questions: returns normalized V2 questions with pagination', async () => {
    const res = await httpGet('/api/v2/questions?subject=toan10&limit=5');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.subject, 'toan10');
    assert.equal(json.total, 0, 'Unreviewed bundled samples are not published V2 data');
    assert.ok(Array.isArray(json.questions));
    assert.ok(json.questions.length <= 5);


  });

  test('GET /api/v2/questions?format=multiple_choice: filters by format', async () => {
    const res = await httpGet('/api/v2/questions?subject=toan10&format=multiple_choice');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.questions.every(q => q.format === 'multiple_choice'));
  });

  test('GET /api/v2/exam-blueprint?subject=toan: returns MOET Decision 764 blueprint', async () => {
    const res = await httpGet('/api/v2/exam-blueprint?subject=toan');
    assert.equal(res.statusCode, 200);
    const bp = JSON.parse(res.body);
    assert.equal(bp.subjectId, 'toan');
    assert.equal(bp.durationMinutes, 90);
    assert.equal(bp.totalQuestions, 22);
    assert.equal(bp.totalCommands, 34);
  });

  test('GET /api/v2/sources: returns registered educational sources', async () => {
    const res = await httpGet('/api/v2/sources');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.total >= 3);
    assert.ok(json.sources.some(s => s.id === 'moet_official_sample_2025'));
  });

  test('POST /api/v2/questions/validate: validates candidate question payload', async () => {
    const validCandidate = {
      id: 'TEST_API_001',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Tìm số nguyên tố chẵn duy nhất',
      mcqPayload: {
        options: ['2', '4', '6', '8'],
        correctOptionIndex: 0
      }
    };

    const res = await httpPost('/api/v2/questions/validate', validCandidate);
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.valid, true);

    // Invalid candidate
    const badCandidate = { id: 'BAD_001' };
    const badRes = await httpPost('/api/v2/questions/validate', badCandidate);
    assert.equal(badRes.statusCode, 422);
  });

  test('GET /api/v2/questions?mode=exam: sanitizes answer keys to prevent leaks to test-takers', async () => {
    const res = await httpGet('/api/v2/questions?subject=toan10&mode=exam&limit=5');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.equal(json.sanitized, true);

    json.questions.forEach(q => {
      if (q.format === 'multiple_choice' && q.mcqPayload) {
        assert.equal(q.mcqPayload.correctOptionIndex, undefined, 'Must not leak correctOptionIndex');
      }
      if (q.format === 'true_false_group' && q.tfPayload && q.tfPayload.statements) {
        q.tfPayload.statements.forEach(s => {
          assert.equal(s.correct, undefined, 'Must not leak statement.correct');
        });
      }
      if (q.format === 'short_answer' && q.shortAnswerPayload) {
        assert.equal(q.shortAnswerPayload.correctAnswers, undefined, 'Must not leak correctAnswers');
      }
      assert.equal(q.explanation, '', 'Must not leak explanation in exam mode');
    });
  });

  test('POST /api/v2/exam/submit: scores student submission securely on server', async () => {
    const questions = [
      { id: 'q1', format: 'multiple_choice', mcqPayload: { options: ['A', 'B'], correctOptionIndex: 0 } }
    ];
    const userAnswers = { 0: 0 };
    const res = await httpPost('/api/v2/exam/submit', { questions, userAnswers, subjectId: 'toan' });
    assert.equal(res.statusCode, 400, 'Client cannot supply grading questions/keys');
  });
});
