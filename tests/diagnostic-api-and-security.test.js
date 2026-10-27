/**
 * Diagnostic Assessment API Contracts & Security Tests
 * NTMK Rebuild Phase 03A — Task 9 & Task 11 (Items 18, 19)
 *
 * Requirements Tested:
 * 1. Skills catalog endpoint (GET /api/v2/diagnostic/skills).
 * 2. Readiness check endpoint (GET /api/v2/diagnostic/readiness).
 * 3. Session creation & answer sanitization (POST /api/v2/diagnostic/start).
 * 4. Answer key & explanation leakage prevention.
 * 5. Auto-save answers with token validation (POST /api/v2/diagnostic/save-answers).
 * 6. Session resume & remaining time calculation (GET/POST /api/v2/diagnostic/resume).
 * 7. Server-side authoritative scoring & anti-tampering (POST /api/v2/diagnostic/submit).
 * 8. Submission idempotency.
 * 9. Student isolation & token security (forged/tampered token rejection).
 * 10. Student skill mastery & knowledge gap queries (GET /api/v2/diagnostic/mastery, gaps).
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

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
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

describe('Task 9 & 11 — Diagnostic API Contracts & Security Gates', () => {

  test('9.1 GET /api/v2/diagnostic/skills returns curriculum taxonomy with grade filters', async () => {
    const res = await httpGet('/api/v2/diagnostic/skills?subjectId=toan&grade=10');
    assert.strictEqual(res.statusCode, 200);

    const json = JSON.parse(res.body);
    assert.ok(json.total > 0);
    assert.strictEqual(json.subjectId, 'toan');
    assert.ok(Array.isArray(json.skills));
    assert.ok(json.skills.every(s => s.subjectId === 'toan' && s.grade === 10));
    assert.ok(json.skills[0].skillId);
    assert.ok(json.skills[0].title);
  });

  test('9.2 GET /api/v2/diagnostic/readiness evaluates bank coverage and reports readiness', async () => {
    const res = await httpGet('/api/v2/diagnostic/readiness?subjectId=toan&grade=10&allowFixtures=true');
    assert.strictEqual(res.statusCode, 200);

    const json = JSON.parse(res.body);
    assert.strictEqual(json.subjectId, 'toan');
    assert.strictEqual(json.grade, 10);
    assert.ok(typeof json.ready === 'boolean');
    assert.ok(Array.isArray(json.shortages));
    assert.ok(json.disclaimer);
  });

  test('9.3 POST /api/v2/diagnostic/start starts session and strips ALL answer keys & explanations', async () => {
    const startPayload = {
      subjectId: 'toan',
      grade: 10,
      assessmentType: 'grade_diagnostic',
      target: 'full_year',
      studentId: 'student_api_sec_01',
      allowFixtures: true,
      count: 15
    };

    const res = await httpPost('/api/v2/diagnostic/start', startPayload);
    assert.strictEqual(res.statusCode, 201);

    const session = JSON.parse(res.body);
    assert.ok(session.sessionId);
    assert.ok(session.token);
    assert.strictEqual(session.subjectId, 'toan');
    assert.strictEqual(session.grade, 10);
    assert.ok(Array.isArray(session.questions));
    assert.ok(session.questions.length > 0);

    // CRITICAL SECURITY GATE: Ensure answer keys and explanations are completely sanitized
    for (const q of session.questions) {
      assert.strictEqual(q.mcqPayload?.correctOptionIndex, undefined, `Leaked MCQ correctOptionIndex on question ${q.id}`);
      assert.strictEqual(q.shortAnswerPayload?.correctAnswer, undefined, `Leaked SA correctAnswer on question ${q.id}`);
      assert.strictEqual(q.shortAnswerPayload?.acceptedAnswers, undefined, `Leaked SA acceptedAnswers on question ${q.id}`);
      if (q.tfPayload && Array.isArray(q.tfPayload.statements)) {
        for (const s of q.tfPayload.statements) {
          assert.strictEqual(s.correct, undefined, `Leaked TF statement correctness on question ${q.id}`);
          assert.strictEqual(s.explanation, undefined, `Leaked TF statement explanation on question ${q.id}`);
        }
      }
      assert.ok(!q.explanation, `Leaked explanation on question ${q.id}`);
    }
  });

  test('9.4 POST /api/v2/diagnostic/save-answers auto-saves answers and rejects forged token', async () => {
    // 1. Start a session
    const startRes = await httpPost('/api/v2/diagnostic/start', {
      subjectId: 'toan',
      grade: 10,
      studentId: 'student_save_test',
      allowFixtures: true
    });
    const session = JSON.parse(startRes.body);

    const q0Id = session.questions[0].id;
    const answersToSave = { [q0Id]: 0 };

    // 2. Legit auto-save
    const saveRes = await httpPost('/api/v2/diagnostic/save-answers', {
      sessionId: session.sessionId,
      token: session.token,
      answers: answersToSave,
      currentQuestionIndex: 1
    });
    assert.strictEqual(saveRes.statusCode, 200);
    const saveJson = JSON.parse(saveRes.body);
    assert.strictEqual(saveJson.success, true);
    assert.strictEqual(saveJson.savedAnswersCount, 1);

    // 3. Forged token attempt -> REJECTED (HTTP 400)
    const forgedRes = await httpPost('/api/v2/diagnostic/save-answers', {
      sessionId: session.sessionId,
      token: 'forged_fake_token_attempt',
      answers: answersToSave
    });
    assert.strictEqual(forgedRes.statusCode, 400);
    const forgedJson = JSON.parse(forgedRes.body);
    assert.ok(forgedJson.error.includes('Unauthorized session token'));
  });

  test('9.5 GET/POST /api/v2/diagnostic/resume restores session state and remaining timer', async () => {
    // 1. Start a session and save answer
    const startRes = await httpPost('/api/v2/diagnostic/start', {
      subjectId: 'toan',
      grade: 10,
      studentId: 'student_resume_test',
      allowFixtures: true
    });
    const session = JSON.parse(startRes.body);
    const q0Id = session.questions[0].id;

    await httpPost('/api/v2/diagnostic/save-answers', {
      sessionId: session.sessionId,
      token: session.token,
      answers: { [q0Id]: 1 },
      currentQuestionIndex: 3
    });

    // 2. Resume session via GET
    const resumeRes = await httpGet(`/api/v2/diagnostic/resume?sessionId=${session.sessionId}&token=${session.token}`);
    assert.strictEqual(resumeRes.statusCode, 200);

    const resumed = JSON.parse(resumeRes.body);
    assert.strictEqual(resumed.sessionId, session.sessionId);
    assert.strictEqual(resumed.currentQuestionIndex, 3);
    assert.deepStrictEqual(resumed.savedAnswers, { [q0Id]: 1 });
    assert.strictEqual(resumed.isSubmitted, false);
    assert.ok(resumed.remainingTimeSeconds > 0);
  });

  test('9.6 POST /api/v2/diagnostic/submit enforces server-side scoring and submission idempotency', async () => {
    // 1. Start session
    const startRes = await httpPost('/api/v2/diagnostic/start', {
      subjectId: 'toan',
      grade: 10,
      studentId: 'student_submit_test',
      allowFixtures: true
    });
    const session = JSON.parse(startRes.body);

    const submitPayload = {
      sessionId: session.sessionId,
      token: session.token,
      answers: {
        [session.questions[0].id]: 0
      },
      // Client attempt to tamper with grade -> MUST BE IGNORED
      clientTamperedScore: 10.0,
      clientTamperedStatus: 'strong'
    };

    // 2. Submit assessment
    const submitRes = await httpPost('/api/v2/diagnostic/submit', submitPayload);
    assert.strictEqual(submitRes.statusCode, 200);

    const report1 = JSON.parse(submitRes.body);
    assert.strictEqual(report1.sessionId, session.sessionId);
    assert.ok(typeof report1.scoringSummary.rawScore === 'number');
    assert.ok(report1.scoringSummary.scoringNotice.includes('KHÔNG PHẢI là điểm thi tốt nghiệp chính thức'));

    // Verify client tampering was completely ignored
    assert.notStrictEqual(report1.scoringSummary.rawScore, 10.0);

    // 3. Re-submit assessment (Idempotency check)
    const submitRes2 = await httpPost('/api/v2/diagnostic/submit', submitPayload);
    assert.strictEqual(submitRes2.statusCode, 200);
    const report2 = JSON.parse(submitRes2.body);

    assert.strictEqual(report1.sessionId, report2.sessionId);
    assert.strictEqual(report1.scoringSummary.rawScore, report2.scoringSummary.rawScore);
  });

  test('9.7 GET /api/v2/diagnostic/mastery & gaps return structured analytics', async () => {
    const masteryRes = await httpGet('/api/v2/diagnostic/mastery?studentId=student_submit_test&subjectId=toan');
    assert.strictEqual(masteryRes.statusCode, 200);
    const masteryJson = JSON.parse(masteryRes.body);
    assert.strictEqual(masteryJson.studentId, 'student_submit_test');
    assert.strictEqual(masteryJson.subjectId, 'toan');
    assert.ok(Array.isArray(masteryJson.skills));

    const gapsRes = await httpGet('/api/v2/diagnostic/gaps?studentId=student_submit_test&subjectId=toan&grade=10');
    assert.strictEqual(gapsRes.statusCode, 200);
    const gapsJson = JSON.parse(gapsRes.body);
    assert.strictEqual(gapsJson.subjectId, 'toan');
    assert.ok(Array.isArray(gapsJson.prioritizedGaps));
    assert.ok(gapsJson.readinessVerdict);
  });

  test('9.8 Production environment strictly prohibits fixture fallback even with client allowFixtures flag', async () => {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      // In production, bank does not have verified questions, so readiness must fail closed (ready: false)
      const res = await httpGet('/api/v2/diagnostic/readiness?subjectId=toan&grade=10&allowFixtures=true');
      assert.strictEqual(res.statusCode, 200);
      const json = JSON.parse(res.body);
      assert.strictEqual(json.ready, false, 'Production must NOT allow fixtures to mark assessment as ready');
      assert.ok(json.shortages.length > 0, 'Production must report shortages when bank is unverified');
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
