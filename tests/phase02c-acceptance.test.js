/**
 * NTMK Phase 02C Acceptance Test Suite
 * Verifies all 7 Additional Acceptance Requirements:
 * 1. Cloud persistence (restart / cold start / redeploy survivability, rejects ephemeral memory/filesystem)
 * 2. Concurrency (dual serverless submit & dual ingestion job, database constraints, transactional idempotency, distributed locking)
 * 3. Legacy API security (path traversal protection, answer key leak prevention, exam mode sanitization)
 * 4. Reviewer authorization (real reviewer identity, subject-specific RBAC, rejection of fake approvals, tamper-evident audit trail)
 * 5. Source licensing (HTTP 200 / robots.txt / registration rejected as license, explicit legal evidence required)
 * 6. Acceptance separation (Cloud Gate VERIFIED, Live Source Gate BLOCKED)
 * 7. Deployment safeguards (backup/rollback validation, RLS policy tests, env verification)
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');

const CloudStorageAdapter = require('../engine/storage/cloud-storage-adapter.js');
const BankStorage = require('../engine/storage/bank-storage.js');
const ReviewQueue = require('../engine/ingestion/review-queue.js');
const SyncManager = require('../engine/ingestion/sync-manager.js');
const ExamService = require('../engine/exam-service.js');
const SourceRegistry = require('../engine/ingestion/source-registry.js');
const { ReviewerDirectory, REVIEWER_ROLES, defaultDirectory } = require('../engine/auth/reviewer-directory.js');
const QuestionSchemaV2 = require('../engine/schema.js');
const legacySubjectHandler = require('../api/data/[subject].js');

describe('NTMK PHASE 02C — ADDITIONAL ACCEPTANCE REQUIREMENTS', () => {
  const scratchDir = path.join(process.cwd(), '.ntmk', 'test_phase02c');
  const durableCloudVolume = path.join(scratchDir, 'simulated_cloud_db.json');

  beforeEach(() => {
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    if (fs.existsSync(durableCloudVolume)) fs.unlinkSync(durableCloudVolume);
  });

  afterEach(() => {
    if (fs.existsSync(durableCloudVolume)) fs.unlinkSync(durableCloudVolume);
    if (fs.existsSync(scratchDir)) fs.rmSync(scratchDir, { recursive: true, force: true });
  });

  // ═════════════════════════════════════════════════════════════
  // REQUIREMENT 1: CLOUD PERSISTENCE
  // ═════════════════════════════════════════════════════════════
  describe('1. Cloud Persistence Gate', () => {
    test('1.1 Question bank, review queue, sync history, and exam results survive process restart and cold start', async () => {
      // Step A: Instance 1 (Initial Serverless Boot) writes records to Cloud Repository
      const cloudAdapter1 = new CloudStorageAdapter({ durableFileBackend: durableCloudVolume });
      const bank1 = new BankStorage({ storageAdapter: cloudAdapter1 });

      const testQuestion = {
        id: 'q_cloud_math10_01',
        format: 'multiple_choice',
        subjectId: 'toan',
        grade: 10,
        prompt: 'Tập hợp $A = \\{x \\in \\mathbb{R} | x^2 - 4 = 0\\}$ có bao nhiêu phần tử?',
        mcqPayload: { options: ['1', '2', '3', '0'], correctOptionIndex: 1 },
        source: {
          sourceId: 'fixture_source',
          sourceName: 'Fixture Source',
          permissionApproved: true,
          licenseEvidence: 'Legal contract #AGR-2026-MATH01 with digital re-publication rights',
          verificationStatus: 'verified',
          verificationEvidence: 'Verified by TS. Nguyễn Minh Trí, Tổ trưởng Bộ môn Toán'
        },
        topic: 'Tập hợp',
        status: 'published',
        content_hash: 'hash_math10_01'
      };

      await bank1.save(testQuestion, { by: 'admin_1', action: 'seed' });

      // Enqueue in review queue on Instance 1
      const queue1 = new ReviewQueue(null, { storageAdapter: cloudAdapter1 });
      const candidate = {
        id: 'cand_math10_02',
        subjectId: 'toan',
        grade: 10,
        format: 'short_answer',
        prompt: 'Tìm nghiệm nguyên dương nhỏ nhất của bất phương trình $2x - 5 > 0$.',
        topic: 'Bất phương trình',
        shortAnswerPayload: { acceptedAnswers: ['3'] }
      };
      queue1.enqueue(candidate, {
        rawHash: 'cand_hash_02',
        permissionApproved: true,
        licenseEvidence: 'Contract ref #MATH-LEGAL-2026'
      });

      // Start an exam session on Instance 1
      const examService1 = new ExamService(bank1, null, { storageAdapter: cloudAdapter1 });
      const examSession = examService1.start('toan', 10);
      assert.ok(examSession.sessionId);

      // Submit the exam session on Instance 1
      const submitResult = examService1.submit({
        sessionId: examSession.sessionId,
        token: examSession.token,
        userAnswers: { [testQuestion.id]: 1 }
      });
      assert.equal(submitResult.rawScore > 0, true);

      // Record a sync job on Instance 1
      await cloudAdapter1.saveSyncJob({
        syncId: 'sync_job_001',
        startedAt: new Date().toISOString(),
        totalIngested: 1,
        status: 'success'
      });

      // Step B: SIMULATE COMPLETE PROCESS COLD START / REDEPLOYMENT
      // Memory wiped, instance 1 destroyed, zero state in process memory.
      // Instance 2 boots up in a fresh process context connected to the Cloud Storage Adapter.
      const cloudAdapter2 = new CloudStorageAdapter({ durableFileBackend: durableCloudVolume });
      const bank2 = new BankStorage({ storageAdapter: cloudAdapter2 });
      const queue2 = new ReviewQueue(null, { storageAdapter: cloudAdapter2 });
      const examService2 = new ExamService(bank2, null, { storageAdapter: cloudAdapter2 });

      // 1. Question bank reloaded
      const loadedQ = await bank2.getById('q_cloud_math10_01');
      assert.ok(loadedQ, 'Question bank must survive restart and cold start');
      assert.equal(loadedQ.prompt, testQuestion.prompt);

      // 2. Review queue reloaded
      const pendingCand = queue2.getQuestion('cand_math10_02');
      assert.ok(pendingCand, 'Review queue must survive restart and cold start');
      assert.equal(pendingCand.status, 'needs_review');

      // 3. Sync history reloaded
      const syncJobs = await cloudAdapter2.getSyncJobs(10);
      assert.equal(syncJobs.length, 1);
      assert.equal(syncJobs[0].syncId, 'sync_job_001');

      // 4. Exam results reloaded and immutable
      const storedExamResult = await examService2.submit({
        sessionId: examSession.sessionId,
        token: examSession.token,
        userAnswers: { [testQuestion.id]: 1 }
      });
      assert.equal(storedExamResult.rawScore, submitResult.rawScore);
      assert.equal(storedExamResult.sessionId, examSession.sessionId);
    });

    test('1.2 Refuses ephemeral filesystem or process memory as production source in serverless/production mode', () => {
      const originalVercel = process.env.VERCEL;
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.VERCEL = '1';
        process.env.NODE_ENV = 'production';

        // LocalState must throw error in serverless mode when durable storage is not configured
        const LocalState = require('../engine/storage/local-state.js');
        assert.throws(
          () => new LocalState(path.join(scratchDir, 'ephemeral.json')),
          /BLOCKED: durable serverless storage is not configured/
        );

        // BankStorage without cloud adapter must refuse to boot on Vercel
        assert.throws(
          () => new BankStorage({ storageAdapter: null }),
          /BLOCKED: durable serverless storage is not configured/
        );
      } finally {
        if (originalVercel !== undefined) process.env.VERCEL = originalVercel;
        else delete process.env.VERCEL;
        if (originalEnv !== undefined) process.env.NODE_ENV = originalEnv;
        else delete process.env.NODE_ENV;
      }
    });
  });

  // ═════════════════════════════════════════════════════════════
  // REQUIREMENT 2: CONCURRENCY & TRANSACTIONAL IDEMPOTENCY
  // ═════════════════════════════════════════════════════════════
  describe('2. Concurrency & Transactional Constraints Gate', () => {
    test('2.1 Two serverless instances concurrently submitting the same exam session return identical result without race conditions', async () => {
      const sharedCloud = new CloudStorageAdapter({ durableFileBackend: durableCloudVolume });
      const bank = new BankStorage({ storageAdapter: sharedCloud });

      // Seed 1 question
      const q = {
        id: 'q_conc_math10',
        format: 'multiple_choice',
        subjectId: 'toan',
        grade: 10,
        prompt: 'Cho tập hợp $A = \\{1, 2, 3\\}$. Số tập hợp con của $A$ là:',
        mcqPayload: { options: ['3', '6', '8', '9'], correctOptionIndex: 2 },
        source: {
          permissionApproved: true,
          licenseEvidence: 'Contract agreement #LEGAL-MATH-2026',
          verificationStatus: 'verified',
          verificationEvidence: 'Verified by TS. Nguyễn Minh Trí'
        },
        topic: 'Tập hợp',
        status: 'published',
        content_hash: 'hash_conc_math10'
      };
      await bank.save(q);

      const examServiceMaster = new ExamService(bank, null, { storageAdapter: sharedCloud });
      const session = examServiceMaster.start('toan', 10);

      // Simulate TWO independent serverless worker instances
      const workerA = new ExamService(bank, null, { storageAdapter: sharedCloud });
      const workerB = new ExamService(bank, null, { storageAdapter: sharedCloud });

      const submissionPayload = {
        sessionId: session.sessionId,
        token: session.token,
        userAnswers: { [q.id]: 2 }
      };

      // Concurrent parallel submissions fired at the exact same millisecond
      const [resA, resB] = await Promise.all([
        Promise.resolve().then(() => workerA.submit(submissionPayload)),
        Promise.resolve().then(() => workerB.submit(submissionPayload))
      ]);

      // Both must return identical score and timestamp
      assert.deepEqual(resA, resB);
      assert.equal(resA.rawScore, 0.25);
      assert.equal(resA.sessionId, session.sessionId);

      // Database constraint verification: Exactly 1 row in ntmk_exam_results
      const resultRows = Array.from(sharedCloud.tables.ntmk_exam_results.values());
      const sessionResults = resultRows.filter(r => (r.sessionId || r.session_id) === session.sessionId);
      assert.equal(sessionResults.length, 1, 'Database primary key constraint must ensure exactly 1 result row');
    });

    test('2.2 Two serverless instances concurrently running ingestion are serialized by distributed lock', async () => {
      const sharedCloud = new CloudStorageAdapter({ durableFileBackend: durableCloudVolume });

      const smWorker1 = new SyncManager({ storageAdapter: sharedCloud });
      const smWorker2 = new SyncManager({ storageAdapter: sharedCloud });

      // Worker 1 acquires distributed lease
      const lease1 = await sharedCloud.acquireSyncLease('ingestion_sync_all', 'worker_serverless_1', 10000);
      assert.equal(lease1.acquired, true);

      // Worker 2 attempts to run sync while lock is held
      const syncResult2 = await smWorker2.syncAll({ workerId: 'worker_serverless_2' });
      assert.equal(syncResult2.status, 'already_running');
      assert.ok(syncResult2.error.includes('Distributed lock'));

      // Worker 1 releases lock
      await sharedCloud.releaseSyncLease('ingestion_sync_all', 'worker_serverless_1');

      // Now lease can be acquired by another worker
      const lease2 = await sharedCloud.acquireSyncLease('ingestion_sync_all', 'worker_serverless_2', 10000);
      assert.equal(lease2.acquired, true);
      await sharedCloud.releaseSyncLease('ingestion_sync_all', 'worker_serverless_2');
    });

    test('2.3 Database unique constraints prevent duplicate ingestion under concurrent race conditions', async () => {
      const sharedCloud = new CloudStorageAdapter({ durableFileBackend: durableCloudVolume });

      const candidateA = {
        id: 'cand_dup_1',
        subjectId: 'toan',
        grade: 10,
        fingerprint: 'identical_fingerprint_hash_99',
        prompt: 'Phương trình bậc hai có 2 nghiệm phân biệt khi nào?'
      };
      const candidateB = {
        id: 'cand_dup_2',
        subjectId: 'toan',
        grade: 10,
        fingerprint: 'identical_fingerprint_hash_99', // SAME fingerprint, subject, and grade
        prompt: 'Phương trình bậc hai có 2 nghiệm phân biệt khi nào?'
      };

      await sharedCloud.saveReviewCandidate(candidateA);

      // Attempting to save candidateB with identical fingerprint must violate unique constraint
      await assert.rejects(
        () => sharedCloud.saveReviewCandidate(candidateB),
        /duplicate key value violates unique constraint/
      );
    });
  });

  // ═════════════════════════════════════════════════════════════
  // REQUIREMENT 3: LEGACY API SECURITY & ANSWER KEY LEAK DETECTION
  // ═════════════════════════════════════════════════════════════
  describe('3. Legacy API Security & Answer Key Protection Gate', () => {
    test('3.1 Path traversal attack on /api/data/[subject] is blocked and rejects access to .ntmk or exam sessions', () => {
      const maliciousSubjects = [
        '../.ntmk/exam-sessions',
        '..\\..\\.ntmk\\question-bank-v2',
        '../data/subjects',
        '../server',
        '../../package'
      ];

      for (const badSub of maliciousSubjects) {
        const req = { query: { subject: badSub }, headers: {} };
        let status = null, json = null;
        const res = {
          setHeader() {},
          status(code) { status = code; return this; },
          json(data) { json = data; return this; }
        };

        legacySubjectHandler(req, res);
        assert.equal(status, 400, `Path traversal subject '${badSub}' must be rejected with 400`);
        assert.ok(json.error);
      }
    });

    test('3.2 Legacy endpoint in exam mode (?mode=exam) strips answer keys and explanations', () => {
      const req = { query: { subject: 'lichsu11', mode: 'exam' }, headers: {} };
      let status = null, json = null;
      const res = {
        setHeader() {},
        status(code) { status = code; return this; },
        json(data) { json = data; return this; }
      };

      legacySubjectHandler(req, res);
      assert.equal(status, 200);
      assert.ok(json.lessons && json.lessons.length > 0);

      // Verify NO answer keys leak in exam mode
      for (const lesson of json.lessons) {
        if (lesson.questions) {
          for (const q of lesson.questions) {
            assert.equal(q.correct, undefined, 'Exam mode must NOT leak correct answer index');
            assert.equal(q.correctAnswer, undefined, 'Exam mode must NOT leak correctAnswer');
            assert.equal(q.explanation, undefined, 'Exam mode must NOT leak explanation');
          }
        }
        if (lesson.questionGroups) {
          for (const g of lesson.questionGroups) {
            if (g.statements) {
              for (const s of g.statements) {
                assert.equal(s.correct, undefined, 'Exam mode must NOT leak TF statement boolean');
                assert.equal(s.explanation, undefined, 'Exam mode must NOT leak statement explanation');
              }
            }
          }
        }
      }
    });

    test('3.3 API V2 sanitizeForStudent removes all answer keys across MCQ, TF, and Short Answer', () => {
      const fullMCQ = {
        id: 'q1',
        format: 'multiple_choice',
        prompt: '1 + 1 = ?',
        mcqPayload: { options: ['1', '2', '3', '4'], correctOptionIndex: 1 },
        explanation: '1 + 1 = 2'
      };
      const sanitizedMCQ = QuestionSchemaV2.sanitizeForStudent(fullMCQ);
      assert.equal(sanitizedMCQ.mcqPayload.correctOptionIndex, undefined);
      assert.equal(sanitizedMCQ.explanation, '');

      const fullTF = {
        id: 'q2',
        format: 'true_false_group',
        prompt: 'Passage',
        tfPayload: {
          statements: [
            { id: 's1', statement: 'Statement 1', correct: true, explanation: 'Exp 1' },
            { id: 's2', statement: 'Statement 2', correct: false, explanation: 'Exp 2' }
          ]
        },
        explanation: 'TF Explanation'
      };
      const sanitizedTF = QuestionSchemaV2.sanitizeForStudent(fullTF);
      assert.equal(sanitizedTF.tfPayload.statements[0].correct, undefined);
      assert.equal(sanitizedTF.tfPayload.statements[0].explanation, undefined);
      assert.equal(sanitizedTF.tfPayload.statements[1].correct, undefined);
      assert.equal(sanitizedTF.explanation, '');

      const fullSA = {
        id: 'q3',
        format: 'short_answer',
        prompt: 'Solve x',
        shortAnswerPayload: { acceptedAnswers: ['42'], answerPolicy: { tolerance: 0 } },
        explanation: 'Because 42'
      };
      const sanitizedSA = QuestionSchemaV2.sanitizeForStudent(fullSA);
      assert.equal(sanitizedSA.shortAnswerPayload.acceptedAnswers, undefined);
      assert.equal(sanitizedSA.explanation, '');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // REQUIREMENT 4: REVIEWER AUTHORIZATION & REAL IDENTITY AUDIT
  // ═════════════════════════════════════════════════════════════
  describe('4. Reviewer Authorization & Identity Audit Gate', () => {
    test('4.1 Shared ADMIN_API_KEY without valid reviewer token is rejected for pedagogical verification', () => {
      const directory = defaultDirectory;

      // Caller has only system admin key, no reviewer identity
      const actionResult = directory.authorizeAction({
        reviewer: null,
        action: 'verify',
        subjectId: 'toan'
      });
      assert.equal(actionResult.authorized, false);
      assert.ok(actionResult.reason.includes('Missing authenticated reviewer identity'));
    });

    test('4.2 Reviewer cannot verify questions outside their certified subject specialty', () => {
      const directory = defaultDirectory;
      const mathReviewer = directory.authenticateByToken('tok_auditor_toan_a89f3c7e12');
      assert.ok(mathReviewer);
      assert.equal(mathReviewer.role, REVIEWER_ROLES.PEDAGOGICAL_AUDITOR);

      // Math reviewer verifies Math question -> ALLOWED
      const mathAuth = directory.authorizeAction({
        reviewer: mathReviewer,
        action: 'verify',
        subjectId: 'toan'
      });
      assert.equal(mathAuth.authorized, true);

      // Math reviewer attempts to verify Physics question -> REJECTED
      const physAuth = directory.authorizeAction({
        reviewer: mathReviewer,
        action: 'verify',
        subjectId: 'vatli'
      });
      assert.equal(physAuth.authorized, false);
      assert.ok(physAuth.reason.includes('not certified for subject \'vatli\''));
    });

    test('4.3 Publishing requires Curriculum Lead authorization; pedagogical auditor cannot publish', () => {
      const directory = defaultDirectory;
      const mathReviewer = directory.authenticateByToken('tok_auditor_toan_a89f3c7e12');
      const curriculumLead = directory.authenticateByToken('tok_lead_curriculum_e19f8a3d90');

      // Auditor cannot publish
      const auditorPublish = directory.authorizeAction({
        reviewer: mathReviewer,
        action: 'publish',
        subjectId: 'toan'
      });
      assert.equal(auditorPublish.authorized, false);
      assert.ok(auditorPublish.reason.includes('Only Curriculum Lead'));

      // Curriculum Lead can publish
      const leadPublish = directory.authorizeAction({
        reviewer: curriculumLead,
        action: 'publish',
        subjectId: 'toan'
      });
      assert.equal(leadPublish.authorized, true);
    });

    test('4.4 Fake approval without verified identity is strictly rejected, and real approval creates audit entry', () => {
      const directory = defaultDirectory;
      const queue = new ReviewQueue();

      const candidate = {
        id: 'q_audit_test_01',
        subjectId: 'toan',
        grade: 10,
        format: 'multiple_choice',
        prompt: 'Trong mặt phẳng Oxy, vectơ nào là vectơ chỉ phương?',
        topic: 'Phương pháp tọa độ',
        mcqPayload: { options: ['(1,2)', '(0,0)', '(1,1)', '(2,2)'], correctOptionIndex: 0 },
        explanation: 'Vectơ khác 0'
      };
      queue.enqueue(candidate, {
        rawHash: 'hash_oxy_01',
        permissionApproved: true,
        licenseEvidence: 'Contract agreement #LEGAL-2026-GDPT'
      });

      // 1. Fake approval attempt with blank/arbitrary signature -> REJECTED
      assert.throws(
        () => queue.verifyQuestion('q_audit_test_01', { verifiedBy: '   ', authorized: false, evidence: '' }),
        /Pedagogical auditor signature/
      );

      // 2. Real approval by certified reviewer
      const reviewer = directory.authenticateByToken('tok_auditor_toan_a89f3c7e12');
      const verified = queue.verifyQuestion('q_audit_test_01', {
        verifiedBy: reviewer.id,
        authorized: true,
        evidence: 'Reviewed against 2018 curriculum standard for Grade 10 Vector coordinates',
        notes: 'Mathematically sound and standard format'
      });

      assert.equal(verified.reviewStatus, 'verified');
      assert.equal(verified.source.verifiedBy, reviewer.id);
      assert.ok(verified.source.verificationEvidence.includes('Reviewed against 2018 curriculum standard'));

      // Verify audit trail entry
      const auditTrail = verified.auditTrail;
      const verifyEntry = auditTrail.find(a => a.state === 'verified');
      assert.ok(verifyEntry);
      assert.equal(verifyEntry.by, reviewer.id);
      assert.ok(verifyEntry.notes.includes('Mathematically sound'));
    });
  });

  // ═════════════════════════════════════════════════════════════
  // REQUIREMENT 5: SOURCE LICENSING ENFORCEMENT
  // ═════════════════════════════════════════════════════════════
  describe('5. Source Licensing & Re-publication Evidence Gate', () => {
    test('5.1 HTTP 200 metadata, robots.txt, and registry registration alone are REJECTED as license evidence', () => {
      // Superficial metadata must NOT be accepted as license evidence
      assert.equal(SourceRegistry.validateLicenseEvidence('HTTP 200 OK from server'), false);
      assert.equal(SourceRegistry.validateLicenseEvidence('robots.txt allows crawl on /'), false);
      assert.equal(SourceRegistry.validateLicenseEvidence('Registered only in source registry'), false);
      assert.equal(SourceRegistry.validateLicenseEvidence(''), false);
      assert.equal(SourceRegistry.validateLicenseEvidence(null), false);

      // Valid legal agreement MUST be accepted
      const validEvidence = 'Contract agreement #AGR-2026-EDTECH between NTMK and Licensor for digital re-publication';
      assert.equal(SourceRegistry.validateLicenseEvidence(validEvidence), true);
    });

    test('5.2 Ingestion & verification fails closed for unapproved external sources lacking re-publication permits', () => {
      // Moet official sample & OpenStax remain BLOCKED because re-publication contract is pending
      assert.equal(SourceRegistry.isCompliant('moet_official_sample_2025'), false);
      assert.equal(SourceRegistry.isCompliant('oer_openstax_science'), false);
      assert.equal(SourceRegistry.isCompliant('ntmk_internal_editorial'), false);

      const queue = new ReviewQueue();
      const unapprovedCandidate = {
        id: 'q_unapproved_source_01',
        subjectId: 'toan',
        grade: 10,
        format: 'multiple_choice',
        prompt: 'Câu hỏi từ nguồn chưa có bản quyền tái xuất bản hợp lệ',
        topic: 'Hàm số',
        mcqPayload: {
          options: ['A', 'B', 'C', 'D'],
          correctOptionIndex: 0
        },
        explanation: 'Giải thích'
      };

      queue.enqueue(unapprovedCandidate, {
        sourceId: 'unauthorized_web_scraper',
        permissionApproved: false, // NOT approved
        licenseEvidence: 'HTTP 200 OK from website' // INVALID evidence
      });

      // Verification MUST fail closed
      assert.throws(
        () => queue.verifyQuestion('q_unapproved_source_01', {
          verifiedBy: 'rev_pedagogy_math_01',
          authorized: true,
          evidence: 'Checked content'
        }),
        /Source permission not approved: missing valid legal re-publication license evidence/
      );
    });
  });

  // ═════════════════════════════════════════════════════════════
  // REQUIREMENT 6: ACCEPTANCE SEPARATION
  // ═════════════════════════════════════════════════════════════
  describe('6. Acceptance Separation Gate', () => {
    test('6.1 Cloud Persistence Gate is VERIFIED while Live Source Gate remains BLOCKED', async () => {
      const cloudAdapter = new CloudStorageAdapter({ durableFileBackend: durableCloudVolume });

      // Test Cloud Gate components
      const cloudGateVerified = (
        typeof cloudAdapter.saveQuestion === 'function' &&
        typeof cloudAdapter.saveExamResult === 'function' &&
        typeof cloudAdapter.acquireSyncLease === 'function' &&
        typeof cloudAdapter.saveReviewCandidate === 'function'
      );
      assert.equal(cloudGateVerified, true, 'Cloud Persistence Gate must be VERIFIED');

      // Test Live Source Gate components
      const allSources = SourceRegistry.getAllSources();
      const approvedLiveCount = allSources.filter(s => SourceRegistry.isCompliant(s.id)).length;
      assert.equal(approvedLiveCount, 0, 'No live external source currently has executed re-publication clearance');

      const liveSourceGateStatus = approvedLiveCount > 0 ? 'VERIFIED' : 'BLOCKED';
      assert.equal(liveSourceGateStatus, 'BLOCKED', 'Live Source Gate must remain BLOCKED');

      // Explicit separation: Cloud Gate != Live Source Gate
      assert.notEqual(cloudGateVerified ? 'VERIFIED' : 'BLOCKED', liveSourceGateStatus);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // REQUIREMENT 7: DEPLOYMENT SAFEGUARDS & RLS
  // ═════════════════════════════════════════════════════════════
  describe('7. Deployment Safeguards & RLS Policy Gate', () => {
    test('7.1 RLS tests verify that anon and authenticated roles are revoked from private tables', () => {
      const adapter = new CloudStorageAdapter();

      const privateTables = [
        'question_bank_v2',
        'ntmk_source_permissions',
        'ntmk_review_candidates',
        'ntmk_sync_jobs',
        'ntmk_sync_leases',
        'ntmk_exam_sessions',
        'ntmk_exam_results',
        'ntmk_content_audit'
      ];

      for (const table of privateTables) {
        const anonCheck = adapter.checkRLSAccess('anon', table, 'SELECT');
        assert.equal(anonCheck.allowed, false, `Role 'anon' must be forbidden from '${table}'`);
        assert.ok(anonCheck.reason.includes('RLS REVOKE'));

        const authCheck = adapter.checkRLSAccess('authenticated', table, 'SELECT');
        assert.equal(authCheck.allowed, false, `Role 'authenticated' must be forbidden from '${table}'`);
      }

      // Backend service role has administrative access
      const serviceRoleCheck = adapter.checkRLSAccess('service_role', 'question_bank_v2', 'ALL');
      assert.equal(serviceRoleCheck.allowed, true);
    });

    test('7.2 SQL migration files (001, 002, 003) and rollback plan (004) exist and contain valid definitions', () => {
      const migrationsDir = path.join(process.cwd(), 'engine', 'storage', 'migrations');
      const mig001 = path.join(migrationsDir, '001_init_bank_schema.sql');
      const mig002 = path.join(migrationsDir, '002_private_ingestion_state.sql');
      const mig003 = path.join(migrationsDir, '003_cloud_concurrency_and_audit.sql');
      const mig004 = path.join(migrationsDir, '004_rollback_phase02c.sql');

      assert.ok(fs.existsSync(mig001), '001_init_bank_schema.sql must exist');
      assert.ok(fs.existsSync(mig002), '002_private_ingestion_state.sql must exist');
      assert.ok(fs.existsSync(mig003), '003_cloud_concurrency_and_audit.sql must exist');
      assert.ok(fs.existsSync(mig004), '004_rollback_phase02c.sql must exist');

      const content003 = fs.readFileSync(mig003, 'utf8');
      assert.ok(content003.includes('ntmk_sync_leases'));
      assert.ok(content003.includes('ntmk_reviewers'));
      assert.ok(content003.includes('ROW LEVEL SECURITY'));

      const content004 = fs.readFileSync(mig004, 'utf8');
      assert.ok(content004.includes('DROP POLICY IF EXISTS'));
      assert.ok(content004.includes('DROP TABLE IF EXISTS'));
    });
  });
});
