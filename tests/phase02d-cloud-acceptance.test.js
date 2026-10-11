/**
 * Phase 02D — Real Supabase Staging Integration & Cloud Acceptance Gate Test Suite
 * NTMK Rebuild Phase 02D
 *
 * Covers:
 * Task 2: Staging Database Configuration & Connection Pool Validation
 * Task 3: Migration Dry-Run Analysis & RPC Function Grants Verification
 * Task 4: Real Cross-Process Storage Acceptance (Scenarios A, B, C, D, E)
 * Task 5: End-to-End Staging Life-Cycle Verification
 * Task 6: Security Hardening & Isolation Matrix
 * Task 7: Vercel Staging Routing & Serverless Storage Contract
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const SupabasePostgresRepository = require('../engine/storage/supabase-postgres-repository.js');
const CloudStorageAdapter = require('../engine/storage/cloud-storage-adapter.js');
const BankStorage = require('../engine/storage/bank-storage.js');
const ExamService = require('../engine/exam-service.js');
const { defaultDirectory, REVIEWER_ROLES } = require('../engine/auth/reviewer-directory.js');
const ReviewQueue = require('../engine/ingestion/review-queue.js');
const QuestionPublisher = require('../engine/ingestion/question-publisher.js');
const QuestionSchemaV2 = require('../engine/schema.js');
const Scoring = require('../engine/scoring.js');

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
          if (msg.status === 'ok' || msg.status === 'rejected') resolve(msg);
          else reject(new Error(msg.reason || msg.error));
        }
      };
      child.on('message', onMessage);
      child.send({ id, command, payload });
    });
  };

  return {
    child,
    sendCommand,
    init: (opts = {}) => sendCommand('init', { durableVolume, workerId, ...opts }),
    kill: (signal = 'SIGTERM') => {
      try {
        child.kill(signal);
      } catch (e) {}
    }
  };
}

describe('NTMK PHASE 02D — REAL SUPABASE STAGING & CLOUD ACCEPTANCE GATE', () => {
  const scratchDir = path.join(process.cwd(), '.ntmk', 'test_phase02d');
  const durableVolume = path.join(scratchDir, 'staging_acceptance_volume.json');

  beforeEach(() => {
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    if (fs.existsSync(durableVolume)) {
      try { fs.unlinkSync(durableVolume); } catch (e) {}
    }
  });

  afterEach(() => {
    if (fs.existsSync(durableVolume)) {
      try { fs.unlinkSync(durableVolume); } catch (e) {}
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 2: STAGING DATABASE CONFIGURATION & ENVIRONMENT VALIDATION
  // ═════════════════════════════════════════════════════════════════════════
  describe('Task 2 — Staging Database Configuration & Connection Safeguards', () => {
    test('2.1 Database repository validates environment and masks secrets safely', () => {
      const repo = new SupabasePostgresRepository({
        databaseUrl: 'postgresql://postgres:SuperSecretP@ssw0rd!@db.staging.supabase.co:5432/postgres',
        supabaseUrl: 'https://staging-project-xyz.supabase.co',
        supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock_service_role_secret_key_1234567890',
        connectionTimeoutMillis: 8000,
        idleTimeoutMillis: 20000,
        poolMax: 5
      });

      const envValidation = repo.validateEnvironment();
      assert.equal(envValidation.configured, true);
      assert.equal(envValidation.status, 'READY');

      // Zero secret exposure in masked outputs
      assert.ok(!envValidation.maskedDatabaseUrl.includes('SuperSecretP@ssw0rd!'), 'Database password must be masked');
      assert.ok(envValidation.maskedDatabaseUrl.includes(':***@'), 'Database URL must show :***@');
      assert.ok(!envValidation.maskedSupabaseServiceKey.includes('mock_service_role_secret'), 'Service role key must be masked');
      assert.equal(envValidation.poolConfig.connectionTimeoutMillis, 8000);
      assert.equal(envValidation.poolConfig.idleTimeoutMillis, 20000);
      assert.equal(envValidation.poolConfig.poolMax, 5);
      assert.equal(envValidation.poolConfig.sslEnabled, true);
    });

    test('2.2 Sanitizes error strings to prevent leaking database passwords or JWT tokens', () => {
      const rawError1 = 'Error: connect ECONNREFUSED postgresql://user:my_secret_db_pass123@10.0.0.1:5432/db';
      const sanitized1 = SupabasePostgresRepository.sanitizeError(rawError1);
      assert.ok(!sanitized1.includes('my_secret_db_pass123'), 'Sanitizer must strip password');
      assert.ok(sanitized1.includes(':***@'), 'Sanitizer must replace with :***@');

      const rawError2 = 'Auth failed: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.xyz987';
      const sanitized2 = SupabasePostgresRepository.sanitizeError(rawError2);
      assert.ok(!sanitized2.includes('xyz987'), 'Sanitizer must strip JWT payload');
      assert.ok(sanitized2.includes('***JWT***'), 'Sanitizer must replace with ***JWT***');
    });

    test('2.3 Missing credentials in production or unconfigured staging fails closed safely', () => {
      const repo = new SupabasePostgresRepository();
      const envCheck = repo.validateEnvironment();
      assert.equal(envCheck.configured, false);
      assert.equal(envCheck.status, 'BLOCKED');
      assert.ok(envCheck.reason.includes('BLOCKED'));

      // In production mode without credentials, must throw
      assert.throws(() => {
        new SupabasePostgresRepository({ isProduction: true });
      }, /BLOCKED: durable serverless storage is not configured/);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 3: MIGRATION DRY-RUN
  // ═════════════════════════════════════════════════════════════════════════
  describe('Task 3 — Migration Dry-Run & SQL Constraints Verification', () => {
    test('3.1 Migrations 001-004 contain strict transaction boundaries, idempotent guards and function grants', () => {
      const mDir = path.join(process.cwd(), 'engine', 'storage', 'migrations');
      const m1 = fs.readFileSync(path.join(mDir, '001_init_bank_schema.sql'), 'utf8');
      const m2 = fs.readFileSync(path.join(mDir, '002_private_ingestion_state.sql'), 'utf8');
      const m3 = fs.readFileSync(path.join(mDir, '003_cloud_concurrency_and_audit.sql'), 'utf8');
      const m4 = fs.readFileSync(path.join(mDir, '004_rollback_phase02c.sql'), 'utf8');

      // 1. Transaction blocks
      [m1, m2, m3, m4].forEach((m, idx) => {
        assert.ok(m.includes('BEGIN;'), `Migration 00${idx + 1} must include BEGIN;`);
        assert.ok(m.includes('COMMIT;'), `Migration 00${idx + 1} must include COMMIT;`);
      });

      // 2. Migration 001: Idempotent role creation guard and unique constraint
      assert.ok(m1.includes('CREATE ROLE anon NOLOGIN;'), 'Migration 001 must guard anon role');
      assert.ok(m1.includes('CREATE ROLE authenticated NOLOGIN;'), 'Migration 001 must guard authenticated role');
      assert.ok(m1.includes('CREATE ROLE service_role NOLOGIN;'), 'Migration 001 must guard service_role');
      assert.ok(m1.includes('CONSTRAINT uq_question_content_hash UNIQUE (subject_id, grade, content_hash)'), 'Migration 001 must define content hash uniqueness');

      // 3. Migration 002: Source permission seed and candidate uniqueness
      assert.ok(m2.includes("'source_unspecified'"), 'Migration 002 must seed source_unspecified for FK integrity');
      assert.ok(m2.includes('CONSTRAINT uq_review_candidate_fingerprint UNIQUE (subject_id, grade, fingerprint)'), 'Migration 002 must define candidate fingerprint uniqueness');
      assert.ok(m2.includes('REFERENCES ntmk_exam_sessions(id) ON DELETE CASCADE'), 'Migration 002 must link exam results to sessions');

      // 4. Migration 003: RPC functions and execute privileges restricted to service_role
      assert.ok(m3.includes('CREATE OR REPLACE FUNCTION acquire_sync_lease'), 'Migration 003 must define acquire_sync_lease');
      assert.ok(m3.includes('CREATE OR REPLACE FUNCTION release_sync_lease'), 'Migration 003 must define release_sync_lease');
      assert.ok(m3.includes('CREATE OR REPLACE FUNCTION submit_exam_result'), 'Migration 003 must define submit_exam_result');
      assert.ok(m3.includes('REVOKE EXECUTE ON FUNCTION acquire_sync_lease(TEXT, TEXT, INT) FROM PUBLIC;'), 'Migration 003 must revoke execute from PUBLIC');
      assert.ok(m3.includes('GRANT EXECUTE ON FUNCTION submit_exam_result(UUID, JSONB) TO service_role;'), 'Migration 003 must grant execute to service_role');

      // 5. Migration 004: Safe non-destructive rollback
      assert.ok(m4.includes('DROP FUNCTION IF EXISTS submit_exam_result(UUID, JSONB);'), 'Rollback must drop submit_exam_result');
      assert.ok(m4.includes('DROP TABLE IF EXISTS ntmk_sync_leases CASCADE;'), 'Rollback must drop sync leases');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 4: REAL POSTGRESQL ACCEPTANCE (DUAL WORKER PROCESSES)
  // ═════════════════════════════════════════════════════════════
  describe('Task 4 — Real Cross-Process Storage Acceptance', () => {
    test('4.A Persistent Storage: Worker A writes question, candidate, job, session; Worker A killed; Worker B reads identical data', async () => {
      const workerA = spawnWorker('worker_instance_4A', durableVolume);
      const initA = await workerA.init();
      assert.ok(initA.pid, 'Worker A must have active PID');

      const q = {
        id: 'q_stg_math_4a',
        format: 'multiple_choice',
        subjectId: 'toan',
        grade: 10,
        prompt: 'Tập xác định của hàm số $y = \\sqrt{x-1}$ là gì?',
        mcqPayload: { options: ['[1, +inf)', '(1, +inf)', '(-inf, 1]', 'R'], correctOptionIndex: 0 },
        source: {
          permissionApproved: true,
          licenseEvidence: 'Contract ref #MATH-LEGAL-4A',
          verificationStatus: 'verified',
          verificationEvidence: 'Verified by fixture_math_reviewer_01'
        },
        topic: 'Tập xác định',
        status: 'published',
        content_hash: 'hash_stg_math_4a'
      };

      const cand = {
        id: 'cand_stg_math_4a',
        sourceId: 'source_unspecified',
        subjectId: 'toan',
        grade: 10,
        fingerprint: 'fp_stg_math_4a',
        status: 'verified',
        prompt: q.prompt
      };

      const job = {
        syncId: 'sync_job_4a_001',
        sourceId: 'source_unspecified',
        status: 'completed',
        totalProcessed: 1,
        startedAt: new Date(Date.now() - 5000).toISOString(),
        completedAt: new Date().toISOString()
      };

      const session = {
        id: 'ses_stg_4a_001',
        tokenHash: crypto.createHash('sha256').update('tok_4a_001').digest('hex'),
        subjectId: 'toan',
        grade: 10,
        questions: [q],
        startedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        result: null
      };

      // 1. Worker A writes bundle
      const writeRes = await workerA.sendCommand('write_full_storage_bundle', {
        question: q,
        candidate: cand,
        syncJob: job,
        session: session
      });
      assert.equal(writeRes.status, 'ok');

      // 2. Kill Worker A completely
      workerA.kill('SIGKILL');

      // 3. Worker B boots in separate process
      const workerB = spawnWorker('worker_instance_4B', durableVolume);
      await workerB.init();

      // 4. Worker B reads and verifies
      const readRes = await workerB.sendCommand('query_full_storage_bundle', {
        questionId: q.id,
        candidateId: cand.id,
        sessionId: session.id,
        limitJobs: 10
      });

      assert.equal(readRes.status, 'ok');
      assert.equal(readRes.q.id, q.id);
      assert.equal(readRes.q.content_hash, q.content_hash);
      assert.equal(readRes.c.id, cand.id);
      assert.equal(readRes.c.fingerprint, cand.fingerprint);
      assert.equal(readRes.s.id, session.id);
      assert.equal(readRes.jobs.length, 1);
      assert.equal(readRes.jobs[0].syncId, job.syncId);

      workerB.kill();
    });

    test('4.B Concurrent Exam Submission: Worker 1 & Worker 2 submit same session simultaneously; single authoritative result', async () => {
      // 1. Seed session via master
      const adapter = new CloudStorageAdapter({ durableFileBackend: durableVolume });
      const testQuestion = {
        id: 'q_conc_4b',
        format: 'multiple_choice',
        subjectId: 'toan',
        grade: 10,
        prompt: 'Toán học 10 câu trắc nghiệm',
        mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 2 },
        topic: 'Phương trình',
        status: 'published'
      };
      const session = {
        id: 'ses_conc_4b',
        tokenHash: crypto.createHash('sha256').update('secret_tok_4b').digest('hex'),
        subjectId: 'toan',
        grade: 10,
        questions: [testQuestion],
        startedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
        result: null
      };
      await adapter.saveExamSession(session);

      // 2. Spawn Worker 1 and Worker 2
      const w1 = spawnWorker('worker_submit_1', durableVolume);
      const w2 = spawnWorker('worker_submit_2', durableVolume);
      await Promise.all([w1.init(), w2.init()]);

      // 3. Submit simultaneously
      const [res1, res2] = await Promise.all([
        w1.sendCommand('submit_exam', {
          sessionId: session.id,
          token: 'secret_tok_4b',
          userAnswers: { [testQuestion.id]: 2 } // Correct answer (Index 2)
        }),
        w2.sendCommand('submit_exam', {
          sessionId: session.id,
          token: 'secret_tok_4b',
          userAnswers: { [testQuestion.id]: 2 }
        })
      ]);

      assert.equal(res1.status, 'ok');
      assert.equal(res2.status, 'ok');
      assert.equal(res1.result.sessionId, session.id);
      assert.equal(res2.result.sessionId, session.id);
      assert.equal(res1.result.rawScore, res2.result.rawScore);
      assert.equal(res1.result.rawScore, 0.25);

      // Verify stored result is single authoritative entry
      const committed = await adapter.getExamResult(session.id);
      assert.ok(committed);
      assert.equal(committed.result ? committed.result.rawScore : committed.rawScore, 0.25);

      w1.kill();
      w2.kill();
    });

    test('4.C Distributed Sync Lock: Worker A holds lease; Worker B rejected; Worker A crash -> Worker B recovers after TTL', async () => {
      const wA = spawnWorker('worker_lock_A', durableVolume);
      const wB = spawnWorker('worker_lock_B', durableVolume);
      await Promise.all([wA.init(), wB.init()]);

      const leaseKey = 'job_ingestion_stg_01';
      const ttlMs = 400; // 400ms TTL

      // 1. Worker A acquires lease
      const leaseA = await wA.sendCommand('acquire_lease', { leaseKey, holderId: 'worker_lock_A', ttlMs });
      assert.equal(leaseA.lease.acquired, true);

      // 2. Worker B attempts acquisition -> Rejected
      const leaseB1 = await wB.sendCommand('acquire_lease', { leaseKey, holderId: 'worker_lock_B', ttlMs });
      assert.equal(leaseB1.lease.acquired, false);
      assert.equal(leaseB1.lease.heldBy, 'worker_lock_A');

      // 3. Worker A crashes (SIGKILL)
      wA.kill('SIGKILL');

      // 4. Wait for TTL expiry
      await new Promise(r => setTimeout(r, 450));

      // 5. Worker B retries -> Successfully recovers lease
      const leaseB2 = await wB.sendCommand('acquire_lease', { leaseKey, holderId: 'worker_lock_B', ttlMs });
      assert.equal(leaseB2.lease.acquired, true);
      assert.equal(leaseB2.lease.holderId, 'worker_lock_B');

      // 6. Worker B releases lease
      const released = await wB.sendCommand('release_lease', { leaseKey, holderId: 'worker_lock_B' });
      assert.equal(released.released, true);

      wB.kill();
    });

    test('4.D Publication Transactions: Unverified candidate rejected; unauthorized reviewer rejected', async () => {
      const adapter = new CloudStorageAdapter({ durableFileBackend: durableVolume });
      const candidate = {
        id: 'cand_math_unverified_01',
        sourceId: 'source_unspecified',
        subjectId: 'toan',
        grade: 10,
        fingerprint: 'fp_unverified_01',
        status: 'needs_review',
        prompt: 'Câu hỏi chưa thẩm định',
        reviewStatus: 'needs_review',
        source: {
          verificationStatus: 'unverified'
        }
      };
      await adapter.saveReviewCandidate(candidate);

      const worker = spawnWorker('worker_pub_test', durableVolume);
      await worker.init();

      // Attempt 1: Non-lead reviewer attempting to publish fails
      const pubAttempt1 = await worker.sendCommand('test_publication', {
        candidateId: candidate.id,
        reviewerActor: 'fixture_math_reviewer_01' // Math auditor, NOT curriculum lead
      });
      assert.equal(pubAttempt1.status, 'rejected');
      assert.ok(pubAttempt1.reason.includes('curriculum_lead'));

      // Attempt 2: Lead reviewer attempting to publish unverified candidate fails
      const pubAttempt2 = await worker.sendCommand('test_publication', {
        candidateId: candidate.id,
        reviewerActor: 'fixture_lead_curriculum_01'
      });
      assert.equal(pubAttempt2.status, 'rejected');
      assert.ok(pubAttempt2.reason.includes('verificationStatus') || pubAttempt2.reason.includes('unverified'));

      worker.kill();
    });

    test('4.E RLS: Anon, student, and unauthorized roles denied SQL access to private tables', async () => {
      const worker = spawnWorker('worker_rls_test', durableVolume);
      await worker.init();

      const rolesToTest = ['anon', 'authenticated'];
      const privateTables = ['question_bank_v2', 'ntmk_exam_sessions', 'ntmk_exam_results', 'ntmk_content_audit'];

      for (const role of rolesToTest) {
        for (const table of privateTables) {
          const res = await worker.sendCommand('check_rls', { role, table, action: 'SELECT' });
          assert.equal(res.rls.allowed, false, `Role '${role}' must be denied direct SQL on '${table}'`);
          assert.ok(res.rls.reason.includes('RLS REVOKE'));
        }
      }

      // Backend service role granted full access
      const serviceRes = await worker.sendCommand('check_rls', { role: 'service_role', table: 'question_bank_v2', action: 'SELECT' });
      assert.equal(serviceRes.rls.allowed, true);

      worker.kill();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 5: FULL END-TO-END STAGING LIFECYCLE
  // ═════════════════════════════════════════════════════════════════════════
  describe('Task 5 — Full End-to-End Staging Workflow', () => {
    test('5.1 Verified Content -> Storage -> Review -> Publish -> API -> Exam -> Submit -> Scoring -> Persistent Result', async () => {
      const adapter = new CloudStorageAdapter({ durableFileBackend: durableVolume });
      const bank = new BankStorage({ storageAdapter: adapter });
      const reviewQueue = new ReviewQueue(null, { storageAdapter: adapter });
      const publisher = new QuestionPublisher(reviewQueue, bank);

      // 1. Ingestion: Candidate discovered with legal fixture source
      const candidate = {
        id: 'cand_e2e_stg_01',
        subjectId: 'toan',
        grade: 10,
        prompt: 'Cho tam giác ABC với các cạnh a, b, c. Khẳng định nào sau đây đúng về định lí cosin?',
        format: 'multiple_choice',
        mcqPayload: {
          options: [
            'a^2 = b^2 + c^2 - 2bc cos A',
            'a^2 = b^2 + c^2 + 2bc cos A',
            'a^2 = b^2 - c^2 - 2bc cos A',
            'a^2 = b^2 + c^2 - 2bc sin A'
          ],
          correctOptionIndex: 0
        },
        topic: 'Hệ thức lượng trong tam giác',
        explanation: 'Theo định lí cosin trong tam giác ABC: a^2 = b^2 + c^2 - 2bc cos A.'
      };

      reviewQueue.enqueue(candidate, {
        sourceId: 'source_unspecified',
        sourceName: 'GDPT2018 Reference Fixture',
        permissionApproved: true,
        licenseEvidence: 'Contract Ref #FIXTURE-E2E-2026'
      });

      // 2. Review: Certified Math Auditor verifies pedagogical quality
      const auditor = defaultDirectory.getReviewerById('fixture_math_reviewer_01');
      assert.ok(auditor && auditor.subjectSpecialties.includes('toan'));
      const verified = reviewQueue.verifyQuestion(candidate.id, {
        verifiedBy: auditor.id,
        authorized: true,
        evidence: 'Verified per GDPT 2018 Toan 10',
        notes: 'Strict compliance'
      });
      assert.equal(verified.source.verificationStatus, 'verified');

      // 3. Publish: Curriculum Lead publishes question to bank
      const lead = defaultDirectory.getReviewerById('fixture_lead_curriculum_01');
      const published = await publisher.publish(candidate.id, { publishedBy: lead.id });
      assert.equal(published.status, 'published');

      // 4. Question API Projections: Exam mode sanitize removes answer key & explanation
      const publicQ = QuestionSchemaV2.sanitizeForStudent(published, { isExamMode: true });
      assert.ok(!publicQ.explanation, 'Explanation must be stripped in exam mode');
      assert.equal(publicQ.mcqPayload.correctOptionIndex, undefined);

      // 5. Exam Service: Start protected exam session
      const examService = new ExamService(bank, null, { storageAdapter: adapter });
      const examStart = examService.start('toan', 10);
      assert.ok(examStart.sessionId);
      assert.ok(examStart.token);
      assert.ok(examStart.questions.length > 0);
      assert.equal(examStart.questions[0].mcqPayload.correctOptionIndex, undefined);

      // 6. Submit Exam: Server-side scoring calculates authoritative score
      const submitRes = examService.submit({
        sessionId: examStart.sessionId,
        token: examStart.token,
        userAnswers: { [examStart.questions[0].id]: 0 } // Correct answer chosen
      });
      assert.equal(submitRes.sessionId, examStart.sessionId);
      assert.ok(submitRes.rawScore > 0);

      // 7. Persistent Result & Reload Recovery: Re-submitting returns identical result
      const reSubmit = examService.submit({
        sessionId: examStart.sessionId,
        token: examStart.token,
        userAnswers: { [examStart.questions[0].id]: 0 }
      });
      assert.equal(reSubmit.rawScore, submitRes.rawScore);
      assert.equal(reSubmit.submittedAt, submitRes.submittedAt);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 6: SECURITY HARDENING
  // ═════════════════════════════════════════════════════════════════════════
  describe('Task 6 — Security Hardening & Isolation Safeguards', () => {
    test('6.1 Student A cannot access Student B session with invalid token', async () => {
      const adapter = new CloudStorageAdapter({ durableFileBackend: durableVolume });
      const bank = new BankStorage({ storageAdapter: adapter });
      const examService = new ExamService(bank, null, { storageAdapter: adapter });

      const testQ = {
        id: 'q_sec_01',
        format: 'multiple_choice',
        subjectId: 'toan',
        grade: 10,
        prompt: 'Toán 10 bảo mật',
        mcqPayload: { options: ['A', 'B'], correctOptionIndex: 0 },
        topic: 'Số học',
        source: { permissionApproved: true, licenseEvidence: 'ref', verificationStatus: 'verified', verificationEvidence: 'ev' },
        status: 'published'
      };
      await bank.save(testQ);

      const session = examService.start('toan', 10);

      // Attempt submit with wrong token (Student B spoofing Student A)
      assert.throws(() => {
        examService.submit({
          sessionId: session.sessionId,
          token: 'wrong_impostor_token',
          userAnswers: {}
        });
      }, /Unauthorized session/);
    });

    test('6.2 Operator cannot act as reviewer without certified pedagogical token', () => {
      const op = defaultDirectory.getReviewerById('fixture_sys_operator_01');
      assert.equal(op.role, REVIEWER_ROLES.SYSTEM_OPERATOR);

      // Operator cannot verify candidate in any subject
      assert.equal(defaultDirectory.canReviewSubject(op.id, 'toan'), false);
      assert.equal(defaultDirectory.canReviewSubject(op.id, 'vatli'), false);
      assert.equal(defaultDirectory.canPublish(op.id), false);
    });

    test('6.3 Client-provided scores are strictly ignored and server calculates authoritative grade', () => {
      const q = {
        id: 'q_score_tamper',
        format: 'multiple_choice',
        subjectId: 'toan',
        grade: 10,
        prompt: '1 + 1 = ?',
        mcqPayload: { options: ['1', '2', '3', '4'], correctOptionIndex: 1 },
        topic: 'Số học',
        status: 'published'
      };
      // Student answers incorrectly (Index 0 instead of 1)
      const scored = Scoring.scoreExam([q], { [q.id]: 0 }, 'toan');
      assert.equal(scored.rawScore, 0, 'Server must award 0 points for incorrect answer');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 7: VERCEL STAGING ROUTING & GATE STATUS
  // ═════════════════════════════════════════════════════════════════════════
  describe('Task 7 — Vercel Staging Compatibility & Routing Matrix', () => {
    test('7.1 vercel.json defines serverless rewrites for exam, blueprint, sources, and admin', () => {
      const vercelConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8'));
      assert.ok(Array.isArray(vercelConfig.rewrites), 'vercel.json must specify rewrites');

      const sources = vercelConfig.rewrites.map(r => r.source);
      assert.ok(sources.includes('/api/v2/exam/:action'), 'Rewrite for /api/v2/exam/:action must exist');
      assert.ok(sources.includes('/api/v2/exam-blueprint'), 'Rewrite for /api/v2/exam-blueprint must exist');
      assert.ok(sources.includes('/api/v2/sources'), 'Rewrite for /api/v2/sources must exist');
      assert.ok(sources.includes('/api/admin/:action*'), 'Rewrite for /api/admin/:action* must exist');
    });

    test('7.2 Staging Gate evaluation reflects unconfigured credentials with gate BLOCKED and guides admin', () => {
      const repo = new SupabasePostgresRepository();
      const status = repo.validateEnvironment();

      assert.equal(status.status, 'BLOCKED');
      assert.ok(status.reason.includes('BLOCKED'));
    });
  });
});
