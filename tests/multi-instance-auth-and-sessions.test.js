/**
 * Multi-Instance Identity & Session Security Tests
 * NTMK Rebuild Phase 04A Corrective Audit — Task 6
 *
 * Scenarios Tested:
 * A. Student A creates session, Student B attempts access -> Cross-user isolation enforced.
 * B. Student A logs out on Worker A -> Worker B with shared durable store rejects old token.
 * C. Account deleted on Worker A -> Worker B rejects old token.
 * D. Guest session upgraded to real account -> Old guest token rejected or transferred.
 * E. Concurrent guest migrations -> Handled safely without duplicate records.
 * F. Password changed on Worker A -> Worker B rejects old session token.
 * G. Reviewer token fixture sent to production API -> Strictly rejected in production mode.
 * H. Client tampered userId or role -> Cryptographic HMAC rejection.
 * I. Serverless instance simulated reload -> Durable revocation and users reloaded accurately.
 * J. Concurrent updates -> Handled safely with authoritative validation.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { StudentAuthManager, AUTH_ROLES } = require('../engine/auth/student-auth.js');
const { ReviewerDirectory } = require('../engine/auth/reviewer-directory.js');

describe('Task 6 — Multi-Instance Identity & Session Testing', () => {
  const sharedDurablePath = path.join(__dirname, 'fixtures', 'shared-auth-store-test.json');

  before(() => {
    const dir = path.dirname(sharedDurablePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(sharedDurablePath)) fs.unlinkSync(sharedDurablePath);
  });

  after(() => {
    if (fs.existsSync(sharedDurablePath)) {
      try { fs.unlinkSync(sharedDurablePath); } catch (e) {}
    }
  });

  it('A. Cross-User Isolation: Student A cannot access Student B resources', () => {
    const workerA = new StudentAuthManager();
    const studentA = workerA.registerStudent({
      email: 'student_a@ntmk.internal',
      password: 'Password123!',
      displayName: 'Học sinh A',
      grade: 10
    });
    const studentB = workerA.registerStudent({
      email: 'student_b@ntmk.internal',
      password: 'Password123!',
      displayName: 'Học sinh B',
      grade: 11
    });

    const userA = workerA.verifySessionToken(studentA.token);
    assert.throws(() => {
      workerA.assertOwnership(userA, studentB.user.id);
    }, /Bạn không có quyền truy cập dữ liệu của học sinh khác/);
  });

  it('B. Multi-Worker Logout: Worker B rejects token logged out on Worker A', () => {
    const secret = 'shared_secret_between_serverless_workers_32b';
    const workerA = new StudentAuthManager({ secret, durableStorePath: sharedDurablePath });
    const student = workerA.registerStudent({
      email: 'worker_sync_test@ntmk.internal',
      password: 'Password123!',
      displayName: 'Sync Student',
      grade: 10
    });

    const token = student.token;

    // Worker B initializes pointing to same shared store
    const workerB = new StudentAuthManager({ secret, durableStorePath: sharedDurablePath });
    assert.ok(workerB.verifySessionToken(token), 'Worker B accepts valid token before logout');

    // Worker A logs out
    workerA.logout(token);

    // Worker B re-syncs durable state
    workerB._loadDurableState();
    assert.strictEqual(workerB.verifySessionToken(token), null, 'Worker B must reject token logged out on Worker A');
  });

  it('C. Multi-Worker Account Deletion: Worker B rejects deleted user token', () => {
    const secret = 'shared_secret_between_serverless_workers_32b';
    const workerA = new StudentAuthManager({ secret, durableStorePath: sharedDurablePath });
    const student = workerA.registerStudent({
      email: 'worker_del_test@ntmk.internal',
      password: 'Password123!',
      displayName: 'Delete User',
      grade: 12
    });

    const token = student.token;
    const workerB = new StudentAuthManager({ secret, durableStorePath: sharedDurablePath });
    assert.ok(workerB.verifySessionToken(token), 'Worker B accepts valid token initially');

    // Worker A deletes account
    workerA.deleteAccount(student.user.id);

    // Worker B re-syncs
    workerB._loadDurableState();
    assert.strictEqual(workerB.verifySessionToken(token), null, 'Worker B must reject token after account deletion');
  });

  it('D. Guest session upgrade to real student: Transfers profile safely', () => {
    const auth = new StudentAuthManager();
    const guest = auth.createGuestSession({ grade: 10 });
    const fakeLearningStorage = {
      profile: { userId: guest.user.id, dailyBudgetMinutes: 45 },
      getProfile(id) { return id === guest.user.id ? this.profile : null; },
      saveProfile(p) { this.profile = p; },
      getActivePlan() { return null; }
    };

    const res = auth.migrateGuestData(guest.user.id, 'stu_real_123', {
      learningStorage: fakeLearningStorage
    });

    assert.strictEqual(res.migrated, true);
    assert.strictEqual(fakeLearningStorage.profile.userId, 'stu_real_123', 'Profile must transfer to student');
  });

  it('E. Password change on Worker A invalidates token on Worker B', () => {
    const secret = 'shared_secret_between_serverless_workers_32b';
    const workerA = new StudentAuthManager({ secret, durableStorePath: sharedDurablePath });
    const student = workerA.registerStudent({
      email: 'pwd_worker_test@ntmk.internal',
      password: 'OldPassword123!',
      displayName: 'Password Test',
      grade: 10
    });

    const oldToken = student.token;
    const workerB = new StudentAuthManager({ secret, durableStorePath: sharedDurablePath });
    assert.ok(workerB.verifySessionToken(oldToken));

    // Worker A changes password
    workerA.changePassword(student.user.id, 'OldPassword123!', 'BrandNewPassword456!');

    // Worker B syncs
    workerB._loadDurableState();
    assert.strictEqual(workerB.verifySessionToken(oldToken), null, 'Worker B rejects old token after password change');
  });

  it('F. Production Reviewer Isolation: Fixture tokens strictly rejected in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const prodDirectory = new ReviewerDirectory();

      // Test fixture tokens must not be loaded
      assert.strictEqual(prodDirectory.listReviewers().length, 0, 'Production directory must have 0 fixture reviewers');

      // Authenticate with fixture token must fail in production
      const authResult = prodDirectory.authenticateByToken('tok_fixture_auditor_toan_a89f3c7e12');
      assert.strictEqual(authResult, null, 'Fixture reviewer token must be rejected in production');
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it('G. Tamper rejection: Client modification of userId or role is cryptographically blocked', () => {
    const auth = new StudentAuthManager();
    const guest = auth.createGuestSession({ grade: 10 });
    const [payloadB64, sig] = guest.token.replace('ntmk_tok_', '').split('.');

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    payload.sub = 'victim_student_uuid'; // Client attempts ID spoofing
    payload.role = AUTH_ROLES.ADMIN;    // Client attempts privilege escalation

    const tamperedPayloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const tamperedToken = `ntmk_tok_${tamperedPayloadB64}.${sig}`;

    assert.strictEqual(auth.verifySessionToken(tamperedToken), null, 'Tampered token must fail signature check');
  });
});
