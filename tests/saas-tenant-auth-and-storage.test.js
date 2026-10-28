/**
 * SaaS Multi-Tenant Authentication & Learning Storage Test Suite
 * Step 2: Tenant-Scoped Identity, Tokens & Data Isolation Verification
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { StudentAuthManager, AUTH_ROLES, DEFAULT_TENANT_ID } = require('../engine/auth/student-auth.js');
const LearningStorage = require('../engine/planner/learning-storage.js');
const authHandler = require('../api/v2/auth.js');

describe('SaaS Multi-Tenant Auth & Storage Integrity', () => {
  let authManager;
  const sampleSchoolTenant = 'c0000000-0000-0000-0000-000000000002'; // THPT Lê Quý Đôn

  beforeEach(() => {
    authManager = new StudentAuthManager({ isTestMode: true, durableStorePath: null });
  });

  test('2.1 Student registration assigns default or explicit tenant_id to user and session', () => {
    // Default tenant
    const sess1 = authManager.registerStudent({
      email: 'minh@ntmk.edu.vn',
      password: 'StrongPassword123!',
      displayName: 'Minh Student',
      grade: 10
    });
    assert.equal(sess1.user.tenantId, DEFAULT_TENANT_ID);
    assert.ok(sess1.token.startsWith('ntmk_tok_'));

    // Explicit tenant (Lê Quý Đôn)
    const sess2 = authManager.registerStudent({
      email: 'quang@lequydon.edu.vn',
      password: 'StrongPassword123!',
      displayName: 'Quang Student',
      grade: 11,
      tenantId: sampleSchoolTenant
    });
    assert.equal(sess2.user.tenantId, sampleSchoolTenant);
  });

  test('2.2 Cryptographically verified token retains tenant_id in validated session identity', () => {
    const session = authManager.registerStudent({
      email: 'linh@school.edu.vn',
      password: 'StrongPassword123!',
      displayName: 'Linh Student',
      grade: 12,
      tenantId: sampleSchoolTenant
    });

    const verified = authManager.verifySessionToken(session.token);
    assert.ok(verified, 'Token must be cryptographically valid');
    assert.equal(verified.id, session.user.id);
    assert.equal(verified.tenantId, sampleSchoolTenant);
  });

  test('2.3 Guest session issues valid cryptographically signed token with tenant scope', () => {
    const guestSess = authManager.createGuestSession({
      grade: 10,
      tenantId: sampleSchoolTenant
    });

    assert.equal(guestSess.user.isGuest, true);
    assert.equal(guestSess.user.tenantId, sampleSchoolTenant);

    const verified = authManager.verifySessionToken(guestSess.token);
    assert.ok(verified);
    assert.equal(verified.isGuest, true);
    assert.equal(verified.tenantId, sampleSchoolTenant);
  });

  test('2.4 Cross-tenant isolation gate rejects access across different organizations', () => {
    const ntmkStudent = {
      id: 'std_ntmk_01',
      role: AUTH_ROLES.STUDENT,
      tenantId: DEFAULT_TENANT_ID
    };

    // Accessing own tenant passes
    assert.doesNotThrow(() => {
      authManager.assertTenantIsolation(ntmkStudent, DEFAULT_TENANT_ID);
    });

    // Accessing different tenant fails with 403
    assert.throws(() => {
      authManager.assertTenantIsolation(ntmkStudent, sampleSchoolTenant);
    }, (err) => err.statusCode === 403 && err.message.includes('khác'));

    // Admin has multi-tenant oversight
    const platformAdmin = {
      id: 'admin_sys_01',
      role: AUTH_ROLES.ADMIN,
      tenantId: null
    };
    assert.doesNotThrow(() => {
      authManager.assertTenantIsolation(platformAdmin, sampleSchoolTenant);
    });
  });

  test('2.5 LearningStorage scopes profiles and active plans with tenantId', () => {
    const testDir = path.join(process.cwd(), '.ntmk_test_saas_storage');
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });

    const ls = new LearningStorage({ baseDir: testDir });

    // Save profile with tenant
    const savedProfile = ls.saveProfile({
      userId: 'user_school_a',
      grade: 10,
      tenantId: sampleSchoolTenant
    });
    assert.equal(savedProfile.tenantId, sampleSchoolTenant);

    // Filter by tenantId
    assert.ok(ls.getProfile('user_school_a', { tenantId: sampleSchoolTenant }));
    assert.equal(ls.getProfile('user_school_a', { tenantId: DEFAULT_TENANT_ID }), null);

    // Save plan with tenant
    const savedPlan = ls.savePlan({
      planId: 'plan_tenant_a',
      userId: 'user_school_a',
      tenantId: sampleSchoolTenant,
      createdAt: new Date().toISOString()
    });
    assert.equal(savedPlan.tenantId, sampleSchoolTenant);

    // Active plan matching tenant
    assert.ok(ls.getActivePlan('user_school_a', { tenantId: sampleSchoolTenant }));
    assert.equal(ls.getActivePlan('user_school_a', { tenantId: DEFAULT_TENANT_ID }), null);

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('2.6 API /api/v2/auth endpoints respect X-Tenant-ID header and return tenantId in profile', async () => {
    // 1. Register with X-Tenant-ID header
    const mockReq = {
      method: 'POST',
      url: '/api/v2/auth/register',
      headers: {
        'x-tenant-id': sampleSchoolTenant
      },
      body: {
        email: `hoa_${Date.now()}@lequydon.edu.vn`,
        password: 'SecurePassword123!',
        displayName: 'Hoa Student',
        grade: 11
      }
    };

    let responseStatus = 0;
    let responseBody = null;
    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => { responseBody = data; }
        };
      }
    };

    await authHandler(mockReq, mockRes);
    assert.equal(responseStatus, 201);
    assert.ok(responseBody.success);
    assert.equal(responseBody.session.user.tenantId, sampleSchoolTenant);

    // 2. GET /me returns tenantId
    const meReq = {
      method: 'GET',
      url: '/api/v2/auth/me',
      headers: {
        'authorization': `Bearer ${responseBody.session.token}`
      }
    };

    let meStatus = 0;
    let meBody = null;
    const meRes = {
      setHeader: () => {},
      status: (code) => {
        meStatus = code;
        return {
          json: (data) => { meBody = data; }
        };
      }
    };

    await authHandler(meReq, meRes);
    assert.equal(meStatus, 200);
    assert.equal(meBody.user.id, responseBody.session.user.id);
    assert.equal(meBody.tenantId, sampleSchoolTenant);
  });
});
