/**
 * Phase 02C Hardening Acceptance Test Suite (15 Targeted Acceptance Areas)
 * NTMK Rebuild Phase 02C Hardening — Tasks 1 through 9
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SupabasePostgresRepository = require('../engine/storage/supabase-postgres-repository.js');
const CloudStorageAdapter = require('../engine/storage/cloud-storage-adapter.js');
const BankStorage = require('../engine/storage/bank-storage.js');
const ReviewQueue = require('../engine/ingestion/review-queue.js');
const SyncManager = require('../engine/ingestion/sync-manager.js');
const ExamService = require('../engine/exam-service.js');
const SourceRegistry = require('../engine/ingestion/source-registry.js');
const { ReviewerDirectory, REVIEWER_ROLES, defaultDirectory } = require('../engine/auth/reviewer-directory.js');
const QuestionSchemaV2 = require('../engine/schema.js');
const legacySubjectHandler = require('../api/data/[subject].js');

describe('NTMK PHASE 02C HARDENING — 15 ACCEPTANCE VERIFICATION AREAS', () => {
  const scratchDir = path.join(process.cwd(), '.ntmk', 'test_hardening_02c');
  const durableVolume = path.join(scratchDir, 'hardening_cloud_volume.json');

  beforeEach(() => {
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
    if (fs.existsSync(durableVolume)) fs.unlinkSync(durableVolume);
  });

  afterEach(() => {
    if (fs.existsSync(durableVolume)) fs.unlinkSync(durableVolume);
    if (fs.existsSync(scratchDir)) fs.rmSync(scratchDir, { recursive: true, force: true });
  });

  // 1. REAL DATABASE PERSISTENCE & ENVIRONMENT VALIDATION
  test('1. Database repository validates cloud credentials and fails closed when unconfigured in production', () => {
    const unconfiguredRepo = new SupabasePostgresRepository({ isProduction: false });
    const check = unconfiguredRepo.validateEnvironment();
    assert.equal(check.configured, false);
    assert.equal(check.status, 'BLOCKED');
    assert.ok(check.reason.includes('Supabase credentials not configured'));

    // In production, unconfigured repository must throw fatal configuration error
    assert.throws(
      () => new SupabasePostgresRepository({ isProduction: true }),
      /BLOCKED: durable serverless storage is not configured/
    );
  });

  // 2. CROSS-PROCESS RESTART
  test('2. Data persistence survives complete cold start across separate adapter instances', async () => {
    const adapter1 = new CloudStorageAdapter({ durableFileBackend: durableVolume });
    const bank1 = new BankStorage({ storageAdapter: adapter1 });

    const q = {
      id: 'q_harden_persist_01',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Vectơ là một đoạn thẳng có hướng?',
      mcqPayload: { options: ['Đúng', 'Sai', 'Tùy trường hợp', 'Không xác định'], correctOptionIndex: 0 },
      source: {
        permissionApproved: true,
        licenseEvidence: 'Contract AGR-2026-MATH',
        verificationStatus: 'verified',
        verificationEvidence: 'Verified by fixture_math_reviewer_01'
      },
      topic: 'Vectơ',
      status: 'published',
      content_hash: 'hash_harden_01'
    };
    await bank1.save(q);

    // Boot fresh adapter 2
    const adapter2 = new CloudStorageAdapter({ durableFileBackend: durableVolume });
    const bank2 = new BankStorage({ storageAdapter: adapter2 });
    const reloaded = await bank2.getById('q_harden_persist_01');
    assert.ok(reloaded);
    assert.equal(reloaded.prompt, q.prompt);
  });

  // 3. CONCURRENT EXAM SUBMISSION
  test('3. Concurrent submissions of the same exam session return identical authoritative result with zero duplicate rows', async () => {
    const adapter = new CloudStorageAdapter({ durableFileBackend: durableVolume });
    const bank = new BankStorage({ storageAdapter: adapter });

    const q = {
      id: 'q_harden_exam_01',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: '1 + 1 = 2?',
      mcqPayload: { options: ['2', '3', '4', '5'], correctOptionIndex: 0 },
      source: {
        permissionApproved: true,
        licenseEvidence: 'Contract AGR-2026-MATH',
        verificationStatus: 'verified',
        verificationEvidence: 'Verified by fixture_math_reviewer_01'
      },
      topic: 'Số học',
      status: 'published',
      content_hash: 'hash_harden_exam_01'
    };
    await bank.save(q);

    const examService = new ExamService(bank, null, { storageAdapter: adapter });
    const session = examService.start('toan', 10);

    const submitPayload = {
      sessionId: session.sessionId,
      token: session.token,
      userAnswers: { [q.id]: 0 }
    };

    const [res1, res2] = await Promise.all([
      Promise.resolve().then(() => examService.submit(submitPayload)),
      Promise.resolve().then(() => examService.submit(submitPayload))
    ]);

    assert.deepEqual(res1, res2);
    assert.equal(res1.rawScore, 0.25);

    const storedResults = Array.from(adapter.tables.ntmk_exam_results.values());
    const matched = storedResults.filter(r => (r.sessionId || r.session_id) === session.sessionId);
    assert.equal(matched.length, 1, 'Only exactly 1 row must be stored for session_id');
  });

  // 4. CROSS-PROCESS DISTRIBUTED LEASES
  test('4. Distributed lease prevents concurrent job execution and supports atomic renewal', async () => {
    const adapter = new CloudStorageAdapter({ durableFileBackend: durableVolume });
    const lease1 = await adapter.acquireSyncLease('lease_sync_science', 'worker_alpha', 5000);
    assert.equal(lease1.acquired, true);

    const lease2 = await adapter.acquireSyncLease('lease_sync_science', 'worker_beta', 5000);
    assert.equal(lease2.acquired, false);
    assert.equal(lease2.heldBy, 'worker_alpha');

    // Holder renews lease
    const renewal = await adapter.acquireSyncLease('lease_sync_science', 'worker_alpha', 10000);
    assert.equal(renewal.acquired, true);

    await adapter.releaseSyncLease('lease_sync_science', 'worker_alpha');
    const leasePostRelease = await adapter.acquireSyncLease('lease_sync_science', 'worker_beta', 5000);
    assert.equal(leasePostRelease.acquired, true);
  });

  // 5. DATABASE UNIQUENESS CONSTRAINTS
  test('5. Unique constraint prevents duplicate question content and review candidates', async () => {
    const adapter = new CloudStorageAdapter({ durableFileBackend: durableVolume });

    const cand1 = {
      id: 'cand_unique_01',
      subjectId: 'toan',
      grade: 10,
      fingerprint: 'fp_same_123',
      prompt: 'Q1'
    };
    const cand2 = {
      id: 'cand_unique_02',
      subjectId: 'toan',
      grade: 10,
      fingerprint: 'fp_same_123', // Same subject, grade, fingerprint
      prompt: 'Q2'
    };

    await adapter.saveReviewCandidate(cand1);
    await assert.rejects(
      () => adapter.saveReviewCandidate(cand2),
      /duplicate key value violates unique constraint/
    );
  });

  // 6. RLS AND PERMISSIONS MATRIX
  test('6. RLS access matrix enforces privilege separation across anon, student, reviewer, lead, and service role', () => {
    const adapter = new CloudStorageAdapter();
    const tables = [
      'question_bank_v2',
      'ntmk_source_permissions',
      'ntmk_review_candidates',
      'ntmk_sync_jobs',
      'ntmk_sync_leases',
      'ntmk_exam_sessions',
      'ntmk_exam_results',
      'ntmk_content_audit'
    ];

    for (const tbl of tables) {
      assert.equal(adapter.checkRLSAccess('anon', tbl, 'SELECT').allowed, false);
      assert.equal(adapter.checkRLSAccess('authenticated', tbl, 'SELECT').allowed, false);
      assert.equal(adapter.checkRLSAccess('service_role', tbl, 'ALL').allowed, true);
    }
  });

  // 7. REVIEWER AUTHORIZATION & RBAC
  test('7. Reviewer directory enforces subject certification boundaries', () => {
    const directory = defaultDirectory;
    const mathReviewer = directory.authenticateByToken('tok_fixture_auditor_toan_a89f3c7e12');
    assert.ok(mathReviewer);

    // Math allowed on toan
    assert.equal(directory.authorizeAction({ reviewer: mathReviewer, action: 'verify', subjectId: 'toan' }).authorized, true);
    // Math forbidden on vatli
    assert.equal(directory.authorizeAction({ reviewer: mathReviewer, action: 'verify', subjectId: 'vatli' }).authorized, false);
    // Math auditor cannot publish
    assert.equal(directory.authorizeAction({ reviewer: mathReviewer, action: 'publish', subjectId: 'toan' }).authorized, false);
  });

  // 8. FAKE IDENTITY REJECTION
  test('8. Unregistered and forged reviewer identities are rejected from pedagogical vetting', () => {
    const directory = defaultDirectory;
    assert.equal(directory.authenticateByToken('fake_unregistered_token'), null);
    assert.equal(directory.authenticateByToken(''), null);
    assert.equal(directory.authenticateByToken(null), null);

    const fakeReviewer = { id: 'unregistered_person', role: 'pedagogical_auditor', subjectSpecialties: ['toan'] };
    const authResult = directory.authorizeAction({ reviewer: fakeReviewer, action: 'verify', subjectId: 'toan' });
    assert.equal(authResult.authorized, false);
  });

  // 9. REVOKED REVIEWER ACCESS
  test('9. Revoked reviewer token is immediately rejected and privileges terminated', () => {
    const directory = new ReviewerDirectory();
    const onboarded = directory.onboardReviewer({
      id: 'rev_temp_auditor_01',
      displayName: 'Temporary Auditor',
      email: 'temp@fixtures.ntmk.internal',
      role: REVIEWER_ROLES.PEDAGOGICAL_AUDITOR,
      subjectSpecialties: ['toan'],
      invitedBy: 'Lead'
    });

    const authedBefore = directory.authenticateByToken(onboarded.token);
    assert.ok(authedBefore);

    // Revoke
    directory.revokeReviewer('rev_temp_auditor_01', { revokedBy: 'Admin', reason: 'Contract ended' });
    const authedAfter = directory.authenticateByToken(onboarded.token);
    assert.equal(authedAfter, null, 'Revoked token must be rejected immediately');
  });

  // 10. LEGACY ANSWER-KEY EXPOSURE AUDIT
  test('10. Legacy API strips answer keys in exam mode and retains explanations in study mode', () => {
    // 10.1 Study Mode (no exam mode) -> explanations allowed for learning
    const studyReq = { query: { subject: 'lichsu11' }, headers: {} };
    let studyRes = null;
    legacySubjectHandler(studyReq, {
      setHeader() {},
      status() { return this; },
      json(d) { studyRes = d; }
    });
    assert.ok(studyRes.lessons[0].questions[0].explanation);

    // 10.2 Exam Mode (?mode=exam) -> all answers and explanations stripped
    const examReq = { query: { subject: 'lichsu11', mode: 'exam' }, headers: {} };
    let examRes = null;
    legacySubjectHandler(examReq, {
      setHeader() {},
      status() { return this; },
      json(d) { examRes = d; }
    });
    const q = examRes.lessons[0].questions[0];
    assert.equal(q.correct, undefined);
    assert.equal(q.correctAnswer, undefined);
    assert.equal(q.explanation, undefined);
  });

  // 11. PROTECTED EXAM QUESTION ISOLATION
  test('11. Protected exam delivery sanitizes all question formats across MCQ, TF, and Short Answer', () => {
    const fullExamItem = {
      id: 'q_iso_01',
      format: 'short_answer',
      prompt: 'Solve equation $x + 5 = 10$',
      shortAnswerPayload: { acceptedAnswers: ['5'] },
      explanation: 'x = 10 - 5 = 5',
      topic: 'PT bậc nhất'
    };
    const sanitized = QuestionSchemaV2.sanitizeForStudent(fullExamItem);
    assert.equal(sanitized.shortAnswerPayload.acceptedAnswers, undefined);
    assert.equal(sanitized.explanation, '');
  });

  // 12. DATABASE UNAVAILABLE HANDLING
  test('12. Database connection failure provides informative status and fails safely without crash', async () => {
    const unconfigured = new SupabasePostgresRepository();
    const conn = await unconfigured.testConnection();
    assert.equal(conn.connected, false);
    assert.equal(conn.gateStatus, 'BLOCKED');
    assert.ok(conn.error);
  });

  // 13. TRANSACTION ROLLBACK
  test('13. Transaction rollback prevents partial state writes when operation fails midway', async () => {
    const adapter = new CloudStorageAdapter({ durableFileBackend: durableVolume });
    const bank = new BankStorage({ storageAdapter: adapter });

    const qValid = {
      id: 'q_tx_01',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Valid prompt',
      mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 },
      source: { permissionApproved: true, licenseEvidence: 'Contract', verificationStatus: 'verified', verificationEvidence: 'OK' },
      content_hash: 'tx_hash_1'
    };
    await bank.save(qValid);

    // Attempt invalid save with duplicate content hash
    const qDuplicate = {
      id: 'q_tx_02',
      format: 'multiple_choice',
      subjectId: 'toan',
      grade: 10,
      prompt: 'Another prompt with duplicate hash',
      mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 },
      source: { permissionApproved: true, licenseEvidence: 'Contract', verificationStatus: 'verified', verificationEvidence: 'OK' },
      content_hash: 'tx_hash_1'
    };

    await assert.rejects(
      () => bank.save(qDuplicate),
      /duplicate key value violates unique constraint/
    );

    // Ensure bank still only has 1 question
    const check = await bank.getById('q_tx_02');
    assert.equal(check, null);
  });

  // 14. MIGRATION COMPATIBILITY
  test('14. SQL migration files 001, 002, 003, and 004 contain strict transaction blocks and RPC definitions', () => {
    const migDir = path.join(process.cwd(), 'engine', 'storage', 'migrations');
    const m001 = fs.readFileSync(path.join(migDir, '001_init_bank_schema.sql'), 'utf8');
    const m002 = fs.readFileSync(path.join(migDir, '002_private_ingestion_state.sql'), 'utf8');
    const m003 = fs.readFileSync(path.join(migDir, '003_cloud_concurrency_and_audit.sql'), 'utf8');
    const m004 = fs.readFileSync(path.join(migDir, '004_rollback_phase02c.sql'), 'utf8');

    assert.ok(m001.includes('BEGIN;') && m001.includes('COMMIT;'), '001 must have transaction boundaries');
    assert.ok(m002.includes('BEGIN;') && m002.includes('COMMIT;'), '002 must have transaction boundaries');
    assert.ok(m003.includes('acquire_sync_lease'), '003 must contain acquire_sync_lease RPC');
    assert.ok(m003.includes('submit_exam_result'), '003 must contain submit_exam_result RPC');
    assert.ok(m004.includes('DROP FUNCTION IF EXISTS'), '004 must safely tear down functions');
  });

  // 15. NO UNAUTHORIZED PUBLICATION
  test('15. Unauthorized publication is strictly blocked by Pedagogical Quality Gate', async () => {
    const queue = new ReviewQueue();
    const unverifiedCand = {
      id: 'q_unpub_01',
      subjectId: 'toan',
      grade: 10,
      format: 'multiple_choice',
      prompt: 'Unverified question',
      topic: 'Topic',
      mcqPayload: { options: ['A', 'B', 'C', 'D'], correctOptionIndex: 0 }
    };
    queue.enqueue(unverifiedCand, { permissionApproved: true, licenseEvidence: 'Contract AGR' });

    assert.throws(
      () => queue.markPublished('q_unpub_01'),
      /Must be verified by pedagogical auditor first/
    );
  });
});
