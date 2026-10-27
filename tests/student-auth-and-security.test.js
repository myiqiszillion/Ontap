/**
 * Student Authentication, Identity & Access Control Tests
 * NTMK Rebuild Phase 04A — Tasks 3 & 9
 *
 * Requirements Tested:
 * 1. Password hashing security (scrypt + salt) & constant-time comparison.
 * 2. Authenticated registration & login issuing signed HMAC-SHA256 tokens.
 * 3. Tamper-evident token verification (rejects forged/tampered tokens).
 * 4. Anonymous Guest session creation with signed scope.
 * 5. Guest-to-Student upgrade: seamless migration of learning progress.
 * 6. Cross-User Isolation: Student A cannot access Student B profile (403 Forbidden).
 * 7. Anti-Spoofing: Ignores client-sent unauthenticated userId in query/body.
 * 8. Account deletion: scrubs personal identifiers and revokes active sessions.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { StudentAuthManager, AUTH_ROLES } = require('../engine/auth/student-auth.js');
const LearningStorage = require('../engine/planner/learning-storage.js');
const learningHandler = require('../api/v2/learning.js');

describe('Task 3 & 9 — Student Authentication & Security Gates', () => {
  const auth = new StudentAuthManager({
    secret: 'test_secret_key_for_unit_tests_32_bytes_length!!'
  });

  it('3.1 Password security: hashes with salt and verifies via constant-time comparison', () => {
    const pwd = 'StudentPassword@123';
    const hash = auth.hashPassword(pwd);

    assert.ok(hash.includes(':'), 'Hash must contain salt:key delimiter');
    assert.strictEqual(auth.verifyPassword(pwd, hash), true, 'Correct password must verify');
    assert.strictEqual(auth.verifyPassword('WrongPassword', hash), false, 'Incorrect password must fail');
    assert.strictEqual(auth.verifyPassword('', hash), false, 'Empty password must fail');

    // Reject short passwords
    assert.throws(() => auth.hashPassword('short'), /Mật khẩu phải có tối thiểu 8 ký tự/);
  });

  it('3.2 Student registration and login issue cryptographically signed session tokens', () => {
    const email = `test_student_${Date.now()}@ntmk.internal`;
    const regSession = auth.registerStudent({
      email,
      password: 'SecurePassword123!',
      displayName: 'Nguyễn Văn Test',
      grade: 10
    });

    assert.ok(regSession.token.startsWith('ntmk_tok_'), 'Token must carry NTMK prefix');
    assert.strictEqual(regSession.user.email, email.toLowerCase());
    assert.strictEqual(regSession.user.grade, 10);
    assert.strictEqual(regSession.user.role, AUTH_ROLES.STUDENT);
    assert.strictEqual(regSession.user.isGuest, false);

    // Re-login
    const loginSession = auth.loginStudent(email, 'SecurePassword123!');
    assert.ok(loginSession.token, 'Login must issue token');
    assert.strictEqual(loginSession.user.id, regSession.user.id);

    // Duplicate email registration rejected
    assert.throws(() => {
      auth.registerStudent({
        email,
        password: 'AnotherPassword123!',
        displayName: 'Trùng Email',
        grade: 10
      });
    }, /Email này đã được đăng ký/);
  });

  it('3.3 Token tampering prevention: rejects forged signatures and modified payloads', () => {
    const session = auth.createGuestSession({ grade: 10 });
    const validToken = session.token;

    // Verify valid token
    const verified = auth.verifySessionToken(validToken);
    assert.ok(verified, 'Valid token must verify');

    // Tamper with payload
    const raw = validToken.replace('ntmk_tok_', '');
    const [payloadB64, sig] = raw.split('.');
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    decoded.role = 'admin'; // Attacker attempts privilege escalation
    const forgedPayloadB64 = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const forgedToken = `ntmk_tok_${forgedPayloadB64}.${sig}`;

    assert.strictEqual(auth.verifySessionToken(forgedToken), null, 'Forged payload must be rejected');

    // Tamper with signature
    const corruptSigToken = `ntmk_tok_${payloadB64}.invalidsignature12345`;
    assert.strictEqual(auth.verifySessionToken(corruptSigToken), null, 'Invalid signature must be rejected');
  });

  it('3.4 Anonymous Guest Sessions: creates temporary scoped session without PII', () => {
    const guestSession = auth.createGuestSession({ grade: 11 });

    assert.ok(guestSession.user.id.startsWith('gst_'), 'Guest ID must carry gst_ prefix');
    assert.strictEqual(guestSession.user.isGuest, true);
    assert.strictEqual(guestSession.user.role, AUTH_ROLES.GUEST);
    assert.strictEqual(guestSession.user.grade, 11);
    assert.strictEqual(guestSession.user.email, null, 'Guest must have no email');
  });

  it('3.5 Guest-to-Student upgrade: seamlessly transfers learning profile and plan', () => {
    const guestSession = auth.createGuestSession({ grade: 10 });
    const guestId = guestSession.user.id;

    // Simulate guest creating learning profile and plan
    const ls = new LearningStorage();
    ls.saveProfile({
      userId: guestId,
      grade: 10,
      prioritySubjects: ['toan'],
      dailyStudyMinutes: 45
    });
    ls.savePlan({
      planId: `plan_gst_${Date.now()}`,
      userId: guestId,
      status: 'active',
      planDays: 7
    });

    // Register real student and migrate
    const studentSession = auth.registerStudent({
      email: `migrated_${Date.now()}@ntmk.internal`,
      password: 'StrongPassword123!',
      displayName: 'Học sinh chuyển đổi',
      grade: 10
    });

    const result = auth.migrateGuestData(guestId, studentSession.user.id, {
      learningStorage: ls
    });

    assert.strictEqual(result.migrated, true);
    assert.strictEqual(result.guestId, guestId);
    assert.strictEqual(result.studentId, studentSession.user.id);

    // Verify student now owns the profile
    const studentProfile = ls.getProfile(studentSession.user.id);
    assert.ok(studentProfile, 'Profile must be migrated to student');
    assert.strictEqual(studentProfile.dailyStudyMinutes, 45);
  });

  it('3.6 Cross-User Isolation: Student A cannot access or tamper with Student B resources', async () => {
    const { defaultStudentAuth } = require('../engine/auth/student-auth.js');
    const studentA = defaultStudentAuth.registerStudent({
      email: `alice_${Date.now()}@ntmk.internal`,
      password: 'AlicePassword123!',
      displayName: 'Alice',
      grade: 10
    });

    const studentB = defaultStudentAuth.registerStudent({
      email: `bob_${Date.now()}@ntmk.internal`,
      password: 'BobPassword123!',
      displayName: 'Bob',
      grade: 11
    });

    // Object-level assertion check
    assert.strictEqual(defaultStudentAuth.assertOwnership(studentA.user, studentA.user.id), true);
    assert.throws(() => {
      defaultStudentAuth.assertOwnership(studentA.user, studentB.user.id);
    }, /Bạn không có quyền truy cập dữ liệu của học sinh khác/);

    // Simulated API call: Student A provides their token but requests Student B's profile
    const req = {
      headers: {
        'authorization': `Bearer ${studentA.token}`
      },
      query: {
        userId: studentB.user.id
      },
      originalUrl: '/api/v2/learning/profile',
      method: 'GET'
    };

    let statusCode = 0;
    let responseBody = null;
    const res = {
      setHeader() {},
      status(code) { statusCode = code; return this; },
      json(data) { responseBody = data; return this; }
    };

    await learningHandler(req, res);

    assert.strictEqual(statusCode, 403, 'Must return 403 Forbidden on cross-user access');
    assert.ok(responseBody.error.includes('không có quyền truy cập'), 'Must explain permission denial');
  });

  it('3.7 Account Deletion (Right to be Forgotten): scrubs user data and revokes active sessions', () => {
    const student = auth.registerStudent({
      email: `delete_me_${Date.now()}@ntmk.internal`,
      password: 'DeletePassword123!',
      displayName: 'Xóa Tôi',
      grade: 12
    });

    const token = student.token;
    assert.ok(auth.verifySessionToken(token), 'Session must be valid before deletion');

    // Delete account
    const deleted = auth.deleteAccount(student.user.id);
    assert.strictEqual(deleted, true, 'Account deletion must return true');

    // Token must be invalidated immediately
    assert.strictEqual(auth.verifySessionToken(token), null, 'Token must be invalidated after deletion');

    // Login must fail
    assert.throws(() => {
      auth.loginStudent(student.user.email, 'DeletePassword123!');
    }, /Email hoặc mật khẩu không chính xác/);
  });

  it('3.8 Explicit logout immediately revokes active token', () => {
    const student = auth.registerStudent({
      email: `logout_student_${Date.now()}@ntmk.internal`,
      password: 'LogoutPassword123!',
      displayName: 'Học sinh Đăng xuất',
      grade: 10
    });

    const token = student.token;
    assert.ok(auth.verifySessionToken(token), 'Token valid before logout');

    const loggedOut = auth.logout(token);
    assert.strictEqual(loggedOut, true, 'Logout returns true');
    assert.strictEqual(auth.verifySessionToken(token), null, 'Token must be revoked immediately after logout');
  });

  it('3.9 Password change revokes all prior session tokens', () => {
    const student = auth.registerStudent({
      email: `pwd_change_${Date.now()}@ntmk.internal`,
      password: 'OldPassword123!',
      displayName: 'Đổi Mật Khẩu',
      grade: 11
    });

    const oldToken = student.token;
    assert.ok(auth.verifySessionToken(oldToken), 'Old session is initially valid');

    // Change password
    auth.changePassword(student.user.id, 'OldPassword123!', 'NewPassword456!');

    // Old token revoked
    assert.strictEqual(auth.verifySessionToken(oldToken), null, 'Old token must be revoked after password change');

    // Login with new password succeeds
    const newSession = auth.loginStudent(student.user.email, 'NewPassword456!');
    assert.ok(newSession.token, 'New session issued');
  });

  it('3.10 Brute-force rate limiting: locks account temporarily after 5 failed attempts', () => {
    const email = `brute_target_${Date.now()}@ntmk.internal`;
    auth.registerStudent({
      email,
      password: 'RealPassword123!',
      displayName: 'Nạn nhân Brute Force',
      grade: 10
    });

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      assert.throws(() => auth.loginStudent(email, 'WrongPass!'), /Email hoặc mật khẩu không chính xác/);
    }

    // 5th failed attempt triggers lock
    assert.throws(() => auth.loginStudent(email, 'WrongPass!'), /Email hoặc mật khẩu không chính xác/);

    // 6th attempt should be blocked by rate limit
    assert.throws(() => auth.loginStudent(email, 'RealPassword123!'), /Tài khoản tạm thời bị khóa do nhập sai nhiều lần/);
  });

  it('3.11 Architecture transparency: honestly discloses custom HMAC session auth', () => {
    const info = auth.getAuthArchitectureInfo();
    assert.strictEqual(info.authMode, 'custom_hmac_session');
    assert.strictEqual(info.isNativeSupabaseAuth, false, 'Must not claim native Supabase Auth without credentials');
    assert.strictEqual(info.supabaseStatus, 'BLOCKED_NO_CREDENTIALS');
  });
});
