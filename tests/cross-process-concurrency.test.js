/**
 * Real Cross-Instance Persistence & Concurrency Test Suite
 * NTMK Rebuild Phase 02C Hardening — Task 3
 *
 * Verifies with real independent Node.js child processes (separate PIDs & V8 heaps):
 * - Scenario A: Cross-process restart and cold start survivability
 * - Scenario B: Concurrent exam submission from dual processes (idempotency, 1 authoritative result)
 * - Scenario C: Distributed lock contention, lease expiration, crash recovery (worker SIGKILL)
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function spawnWorker(workerId, durableVolume) {
  const child = child_process.fork(path.join(__dirname, '../scripts/worker-process.js'));
  const sendCommand = (command, payload = {}) => {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timeout = setTimeout(() => {
        child.off('message', onMessage);
        reject(new Error(`Worker timed out on command '${command}'`));
      }, 8000);

      const onMessage = (msg) => {
        if (msg && msg.id === id) {
          clearTimeout(timeout);
          child.off('message', onMessage);
          if (msg.status === 'ok') resolve(msg);
          else reject(new Error(msg.error));
        }
      };
      child.on('message', onMessage);
      child.send({ id, command, payload });
    });
  };

  return {
    child,
    sendCommand,
    init: () => sendCommand('init', { durableVolume, workerId }),
    kill: (signal = 'SIGTERM') => {
      try {
        child.kill(signal);
      } catch (e) {}
    }
  };
}

describe('NTMK HARDENING — REAL CROSS-INSTANCE PERSISTENCE & CONCURRENCY', () => {
  const scratchDir = path.join(process.cwd(), '.ntmk', 'test_cross_process');
  const durableVolume = path.join(scratchDir, 'cross_process_cloud.json');

  beforeEach(() => {
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    if (fs.existsSync(durableVolume)) fs.unlinkSync(durableVolume);
  });

  afterEach(() => {
    if (fs.existsSync(durableVolume)) fs.unlinkSync(durableVolume);
    if (fs.existsSync(scratchDir)) fs.rmSync(scratchDir, { recursive: true, force: true });
  });

  test('Scenario A: Cross-Process Cold Restart — Worker A writes, completely terminates; Worker B reads identical data', async () => {
    // 1. Boot Worker A in separate OS process
    const workerA = spawnWorker('worker_instance_A', durableVolume);
    const initA = await workerA.init();
    assert.ok(initA.pid, 'Worker A must have an active OS process PID');

    const testQuestion = {
      id: 'q_xp_math10_01',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Hàm số $y = 2x + 1$ đồng biến trên khoảng nào?',
      mcqPayload: { options: ['(-inf, +inf)', '(0, 1)', '(-inf, 0)', 'R \\ {0}'], correctOptionIndex: 0 },
      source: {
        permissionApproved: true,
        licenseEvidence: 'Contract ref #MATH-LEGAL-XP-2026',
        verificationStatus: 'verified',
        verificationEvidence: 'Verified by fixture_math_reviewer_01'
      },
      topic: 'Hàm số bậc nhất',
      status: 'published',
      content_hash: 'hash_xp_math_01'
    };

    const testSession = {
      id: 'ses_xp_001',
      tokenHash: crypto.createHash('sha256').update('secret_tok_001').digest('hex'),
      subjectId: 'toan',
      grade: 10,
      questions: [testQuestion],
      startedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      result: null
    };

    // Worker A writes to storage
    const writeRes = await workerA.sendCommand('write_question_and_session', {
      question: testQuestion,
      session: testSession
    });
    assert.equal(writeRes.status, 'ok');

    // 2. Worker A completely terminates (SIGKILL)
    workerA.kill('SIGKILL');
    await new Promise(r => setTimeout(r, 200));

    // 3. Worker B boots up in a completely separate OS process
    const workerB = spawnWorker('worker_instance_B', durableVolume);
    const initB = await workerB.init();
    assert.notEqual(initB.pid, initA.pid, 'Worker B must have a completely different PID');

    // 4. Worker B queries data written by Worker A
    const readRes = await workerB.sendCommand('query_question_and_session', {
      questionId: 'q_xp_math10_01',
      sessionId: 'ses_xp_001'
    });

    assert.ok(readRes.q, 'Question must survive process death');
    assert.equal(readRes.q.prompt, testQuestion.prompt);
    assert.ok(readRes.s, 'Session must survive process death');
    assert.equal(readRes.s.tokenHash, testSession.tokenHash);

    workerB.kill();
  });

  test('Scenario B: Real Concurrent Submission from Two Independent Worker Processes', async () => {
    // 1. Prepare question and session via worker master
    const master = spawnWorker('worker_master', durableVolume);
    await master.init();

    const q = {
      id: 'q_xp_conc_01',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Tập hợp nào là tập con của mọi tập hợp?',
      mcqPayload: { options: ['Tập rỗng', 'Tập R', 'Tập N', 'Tập Z'], correctOptionIndex: 0 },
      source: {
        permissionApproved: true,
        licenseEvidence: 'Contract agreement #XP-MATH-2026',
        verificationStatus: 'verified',
        verificationEvidence: 'Verified by fixture_math_reviewer_01'
      },
      topic: 'Tập hợp',
      status: 'published',
      content_hash: 'hash_xp_conc_01'
    };

    const token = 'token_xp_concurrent_123';
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = {
      id: 'ses_xp_conc_01',
      tokenHash,
      subjectId: 'toan',
      grade: 10,
      questions: [q],
      startedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      result: null
    };

    await master.sendCommand('write_question_and_session', { question: q, session });
    master.kill();

    // 2. Spawn Worker 1 and Worker 2 in parallel processes
    const worker1 = spawnWorker('worker_submit_1', durableVolume);
    const worker2 = spawnWorker('worker_submit_2', durableVolume);

    await Promise.all([worker1.init(), worker2.init()]);

    const submitPayload = {
      sessionId: 'ses_xp_conc_01',
      token,
      userAnswers: { [q.id]: 0 }
    };

    // 3. Fire submissions concurrently from two independent OS processes
    const [sub1, sub2] = await Promise.all([
      worker1.sendCommand('submit_exam', submitPayload),
      worker2.sendCommand('submit_exam', submitPayload)
    ]);

    assert.equal(sub1.status, 'ok');
    assert.equal(sub2.status, 'ok');

    // Both workers must receive the exact same authoritative score
    assert.equal(sub1.result.rawScore, sub2.result.rawScore);
    assert.equal(sub1.result.sessionId, 'ses_xp_conc_01');
    assert.equal(sub2.result.sessionId, 'ses_xp_conc_01');

    // Verify storage has exactly 1 result row
    const rawVolume = JSON.parse(fs.readFileSync(durableVolume, 'utf8'));
    const results = Object.values(rawVolume.tables.ntmk_exam_results || {});
    assert.equal(results.length, 1, 'Storage must contain exactly 1 authoritative result row');

    worker1.kill();
    worker2.kill();
  });

  test('Scenario C: Real Distributed Lock Contention, Sudden Process Kill & Safe Recovery', async () => {
    const workerA = spawnWorker('worker_lock_A', durableVolume);
    const workerB = spawnWorker('worker_lock_B', durableVolume);

    await Promise.all([workerA.init(), workerB.init()]);

    const leaseKey = 'job_ingestion_moet_reference';

    // 1. Worker A acquires distributed lock with 600ms TTL
    const leaseA = await workerA.sendCommand('acquire_lease', {
      leaseKey,
      holderId: 'worker_lock_A',
      ttlMs: 600
    });
    assert.equal(leaseA.lease.acquired, true);

    // 2. Worker B immediately attempts to acquire same lock -> must be denied
    const leaseB = await workerB.sendCommand('acquire_lease', {
      leaseKey,
      holderId: 'worker_lock_B',
      ttlMs: 600
    });
    assert.equal(leaseB.lease.acquired, false);
    assert.equal(leaseB.lease.heldBy, 'worker_lock_A');

    // 3. Worker A dies suddenly (SIGKILL) without releasing lease
    workerA.kill('SIGKILL');

    // 4. Worker B attempts acquisition while lease is still unexpired -> still blocked
    const leaseBBeforeExpire = await workerB.sendCommand('acquire_lease', {
      leaseKey,
      holderId: 'worker_lock_B',
      ttlMs: 600
    });
    assert.equal(leaseBBeforeExpire.lease.acquired, false);

    // 5. Wait for TTL to expire (650ms)
    await new Promise(r => setTimeout(r, 650));

    // 6. Worker B retries acquisition after lease expired -> must succeed!
    const leaseBAfterExpire = await workerB.sendCommand('acquire_lease', {
      leaseKey,
      holderId: 'worker_lock_B',
      ttlMs: 600
    });
    assert.equal(leaseBAfterExpire.lease.acquired, true);
    assert.equal(leaseBAfterExpire.lease.holderId, 'worker_lock_B');

    // Worker B releases lease cleanly
    const relRes = await workerB.sendCommand('release_lease', {
      leaseKey,
      holderId: 'worker_lock_B'
    });
    assert.equal(relRes.released, true);

    workerB.kill();
  });
});
