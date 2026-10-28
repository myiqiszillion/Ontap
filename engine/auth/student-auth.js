/**
 * Student Identity, Authentication & Secure Access Control Module
 * NTMK Rebuild Phase 04A & SaaS Multi-Tenant Evolution
 *
 * Security & Privacy Principles:
 * 1. Minimal PII: Collects only essential learning data (email/username, grade, display name).
 * 2. Multi-tenant awareness: Associates accounts and sessions with tenant_id.
 * 3. Never trust client-provided user IDs in query/body; identity strictly derived from validated session token.
 * 4. Cryptographically signed tokens (HMAC-SHA256) + Supabase Auth JWT compatibility.
 * 5. Cross-user & Cross-tenant isolation: Tenant A cannot access Tenant B resources.
 * 6. Tamper-proof Guest Sessions: Guests receive signed tokens scoped to guest permissions and tenant.
 * 7. Smooth Guest-to-Student upgrade: Migrates guest learning records to new account upon registration/login.
 * 8. Secure password hashing: Salted scrypt key derivation.
 * 9. Account deletion: Secure scrub of student account and personal identifiers.
 */

const crypto = require('crypto');
const EnvironmentConfig = require('../config/environment-config.js');

const AUTH_ROLES = {
  GUEST: 'guest',
  STUDENT: 'student',
  REVIEWER: 'reviewer',
  ADMIN: 'admin'
};

const DEFAULT_TENANT_ID = 'a0000000-0000-0000-0000-000000000001'; // Default THPT NTMK
const path = require('path');
const fs = require('fs');

const DEFAULT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'ntmk_dev_fallback_secret_never_use_in_production_key_32b';

class StudentAuthManager {
  constructor(options = {}) {
    this.secret = options.secret || DEFAULT_SECRET;
    this.tokenTtlMs = options.tokenTtlMs || 7 * 24 * 60 * 60 * 1000; // 7 days
    this.defaultTenantId = options.defaultTenantId || DEFAULT_TENANT_ID;
    this.storageAdapter = options.storageAdapter || null;
    this.users = new Map(); // id -> user object
    this.sessions = new Map(); // token -> session info
    this.emailIndex = new Map(); // lower(email) -> user id
    this.revokedUserIds = new Set(); // user IDs marked deleted/revoked
    this.revokedTokens = new Set(); // tokens explicitly logged out or revoked
    this.failedAttempts = new Map(); // email -> { count, lockedUntil }
    this.durableStorePath = options.durableStorePath || null;

    if (this.durableStorePath && fs.existsSync(this.durableStorePath)) {
      this._loadDurableState();
    }

    // Pre-populate system/test fixtures strictly if demo mode is permitted
    if (EnvironmentConfig.isDemoAllowed(options)) {
      this._seedTestUsers();
    }
  }

  _loadDurableState() {
    try {
      if (!this.durableStorePath || !fs.existsSync(this.durableStorePath)) return;
      const data = JSON.parse(fs.readFileSync(this.durableStorePath, 'utf8') || '{}');
      if (Array.isArray(data.revokedUserIds)) {
        data.revokedUserIds.forEach(id => this.revokedUserIds.add(id));
      }
      if (Array.isArray(data.revokedTokens)) {
        data.revokedTokens.forEach(t => this.revokedTokens.add(t));
      }
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          if (!u.tenantId) u.tenantId = this.defaultTenantId;
          this.users.set(u.id, u);
          if (u.email) this.emailIndex.set(u.email.toLowerCase(), u.id);
        }
      }
    } catch (e) {
      // Non-fatal
    }
  }

  _saveDurableState() {
    try {
      if (!this.durableStorePath) return;
      const dir = path.dirname(this.durableStorePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const payload = {
        updatedAt: new Date().toISOString(),
        revokedUserIds: Array.from(this.revokedUserIds),
        revokedTokens: Array.from(this.revokedTokens),
        users: Array.from(this.users.values()).map(u => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          grade: u.grade,
          role: u.role,
          tenantId: u.tenantId || this.defaultTenantId,
          passwordHash: u.passwordHash,
          isGuest: u.isGuest,
          createdAt: u.createdAt
        }))
      };
      fs.writeFileSync(this.durableStorePath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (e) {
      // Non-fatal
    }
  }

  _seedTestUsers() {
    if (!this.emailIndex.has('alice@student.ntmk.internal') && !this.users.has('student_fixture_alice')) {
      try {
        this.registerStudent({
          id: 'student_fixture_alice',
          email: 'alice@student.ntmk.internal',
          password: 'AlicePassword123!',
          displayName: 'Alice Student (Test)',
          grade: 10,
          tenantId: this.defaultTenantId
        });
      } catch (e) {
        // Ignore if already seeded
      }
    }
    if (!this.emailIndex.has('bob@student.ntmk.internal') && !this.users.has('student_fixture_bob')) {
      try {
        this.registerStudent({
          id: 'student_fixture_bob',
          email: 'bob@student.ntmk.internal',
          password: 'BobPassword123!',
          displayName: 'Bob Student (Test)',
          grade: 11,
          tenantId: this.defaultTenantId
        });
      } catch (e) {
        // Ignore if already seeded
      }
    }
  }

  /**
   * Securely hash password with scrypt and random salt
   */
  hashPassword(password) {
    if (!password || typeof password !== 'string' || password.length < 8) {
      throw new Error('Mật khẩu phải có tối thiểu 8 ký tự.');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return `${salt}:${derivedKey.toString('hex')}`;
  }

  /**
   * Verify password against stored hash using constant-time comparison
   */
  verifyPassword(password, storedHash) {
    if (!password || !storedHash || typeof storedHash !== 'string') return false;
    const parts = storedHash.split(':');
    if (parts.length !== 2) return false;
    const [salt, keyHex] = parts;
    const keyBuffer = Buffer.from(keyHex, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    if (keyBuffer.length !== derivedKey.length) return false;
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  }

  /**
   * Register a new student account
   */
  registerStudent({ email, password, displayName, grade, id, tenantId }) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error('Email không hợp lệ.');
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (this.emailIndex.has(normalizedEmail)) {
      throw new Error('Email này đã được đăng ký.');
    }

    const userId = id || `std_${crypto.randomUUID()}`;
    const passwordHash = this.hashPassword(password);
    const now = new Date().toISOString();
    const finalTenantId = tenantId || this.defaultTenantId;

    const user = {
      id: userId,
      email: normalizedEmail,
      displayName: (displayName || email.split('@')[0]).trim(),
      grade: [10, 11, 12].includes(Number(grade)) ? Number(grade) : 10,
      role: AUTH_ROLES.STUDENT,
      tenantId: finalTenantId,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      isGuest: false
    };

    this.users.set(userId, user);
    this.emailIndex.set(normalizedEmail, userId);
    this._saveDurableState();

    return this.createSession(user);
  }

  /**
   * Authenticate student with email and password
   */
  loginStudent(email, password) {
    if (!email || !password) {
      throw new Error('Vui lòng nhập đầy đủ email và mật khẩu.');
    }
    const normalizedEmail = email.toLowerCase().trim();

    // Brute-force protection: check locked state
    const attempt = this.failedAttempts.get(normalizedEmail);
    if (attempt && attempt.lockedUntil > Date.now()) {
      const waitSeconds = Math.ceil((attempt.lockedUntil - Date.now()) / 1000);
      throw new Error(`Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau ${waitSeconds} giây.`);
    }

    const userId = this.emailIndex.get(normalizedEmail);
    if (!userId) {
      this._recordFailedLogin(normalizedEmail);
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    const user = this.users.get(userId);
    if (!user || !this.verifyPassword(password, user.passwordHash)) {
      this._recordFailedLogin(normalizedEmail);
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    // Reset failed attempts on success
    this.failedAttempts.delete(normalizedEmail);
    return this.createSession(user);
  }

  _recordFailedLogin(normalizedEmail) {
    const current = this.failedAttempts.get(normalizedEmail) || { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= 5) {
      current.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 mins
    }
    this.failedAttempts.set(normalizedEmail, current);
  }

  /**
   * Create an anonymous, secure guest session
   */
  createGuestSession(metadata = {}) {
    const guestId = `gst_${crypto.randomUUID()}`;
    const guestUser = {
      id: guestId,
      displayName: 'Khách',
      grade: [10, 11, 12].includes(Number(metadata.grade)) ? Number(metadata.grade) : 10,
      role: AUTH_ROLES.GUEST,
      tenantId: metadata.tenantId || this.defaultTenantId,
      isGuest: true,
      createdAt: new Date().toISOString()
    };
    return this.createSession(guestUser);
  }

  /**
   * Issue a cryptographically signed session token
   */
  createSession(user) {
    const expiresAt = Date.now() + this.tokenTtlMs;
    const tenantId = user.tenantId || this.defaultTenantId;
    const payload = {
      sub: user.id,
      role: user.role,
      isGuest: Boolean(user.isGuest),
      email: user.email || null,
      tenantId,
      exp: expiresAt,
      iat: Date.now()
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(payloadBase64)
      .digest('base64url');
    const token = `ntmk_tok_${payloadBase64}.${signature}`;

    const sessionInfo = {
      token,
      user: {
        id: user.id,
        email: user.email || null,
        displayName: user.displayName,
        grade: user.grade,
        role: user.role,
        tenantId,
        isGuest: Boolean(user.isGuest)
      },
      expiresAt: new Date(expiresAt).toISOString()
    };

    this.sessions.set(token, sessionInfo);
    return sessionInfo;
  }

  /**
   * Verify session token and return user identity
   */
  verifySessionToken(token) {
    if (!token || typeof token !== 'string') return null;

    if (this.durableStorePath) {
      this._loadDurableState();
    }

    if (this.revokedTokens && this.revokedTokens.has(token)) return null;

    // 1. Check in-memory session cache
    if (this.sessions.has(token)) {
      const sess = this.sessions.get(token);
      if (this.revokedUserIds && this.revokedUserIds.has(sess.user.id)) {
        this.sessions.delete(token);
        return null;
      }
      if (!EnvironmentConfig.isDemoAllowed() && EnvironmentConfig.isFixtureStudent(sess.user)) {
        this.sessions.delete(token);
        return null;
      }
      if (new Date(sess.expiresAt).getTime() > Date.now()) {
        if (!sess.user.tenantId) sess.user.tenantId = this.defaultTenantId;
        return sess.user;
      }
      this.sessions.delete(token);
      return null;
    }

    // 2. Cryptographic signature check for NTMK token
    if (token.startsWith('ntmk_tok_')) {
      const raw = token.replace('ntmk_tok_', '');
      const [payloadBase64, providedSig] = raw.split('.');
      if (!payloadBase64 || !providedSig) return null;

      const expectedSig = crypto
        .createHmac('sha256', this.secret)
        .update(payloadBase64)
        .digest('base64url');

      if (
        Buffer.byteLength(expectedSig) !== Buffer.byteLength(providedSig) ||
        !crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(providedSig))
      ) {
        return null;
      }

      try {
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
        if (payload.exp && payload.exp < Date.now()) return null;
        if (this.revokedUserIds && this.revokedUserIds.has(payload.sub)) return null;

        if (!payload.isGuest) {
          const user = this.users.get(payload.sub);
          if (!user) return null;
          if (!EnvironmentConfig.isDemoAllowed() && EnvironmentConfig.isFixtureStudent(user)) {
            return null; // Reject fixture student in unauthorized environments
          }
          return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            grade: user.grade,
            role: user.role,
            tenantId: user.tenantId || payload.tenantId || this.defaultTenantId,
            isGuest: false
          };
        }

        return {
          id: payload.sub,
          role: payload.role,
          tenantId: payload.tenantId || this.defaultTenantId,
          isGuest: true,
          email: null
        };
      } catch (e) {
        return null;
      }
    }

    // 3. Supabase Auth JWT compatibility check
    if (token.includes('.') && process.env.SUPABASE_JWT_SECRET) {
      try {
        const [headerB64, payloadB64, sigB64] = token.split('.');
        if (headerB64 && payloadB64 && sigB64) {
          const expectedSig = crypto
            .createHmac('sha256', process.env.SUPABASE_JWT_SECRET)
            .update(`${headerB64}.${payloadB64}`)
            .digest('base64url');
          if (crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sigB64))) {
            const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
            if (payload.exp && payload.exp * 1000 > Date.now()) {
              return {
                id: payload.sub,
                email: payload.email,
                role: payload.role === 'authenticated' ? AUTH_ROLES.STUDENT : AUTH_ROLES.GUEST,
                tenantId: payload.app_metadata?.tenantId || payload.user_metadata?.tenantId || this.defaultTenantId,
                isGuest: payload.role !== 'authenticated'
              };
            }
          }
        }
      } catch (e) {
        // Fall through
      }
    }

    return null;
  }

  /**
   * Authenticate incoming HTTP request
   * Extracts token strictly from Authorization header, X-Session-Token or cookie
   * Never trusts unverified client query/body parameters
   */
  authenticateRequest(req) {
    if (!req) return null;
    const authHeader = req.headers && (req.headers['authorization'] || req.headers['x-session-token']);
    let token = null;

    if (authHeader) {
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    if (!token && req.cookies && req.cookies.ntmk_session) {
      token = req.cookies.ntmk_session;
    }

    if (!token) return null;
    const user = this.verifySessionToken(token);
    if (user && req) {
      req.authenticatedUser = user;
      req.tenantId = user.tenantId;
    }
    return user;
  }

  /**
   * Enforce object-level authorization
   * Verifies that the authenticated actor is the owner of target resource
   */
  assertOwnership(authenticatedUser, targetOwnerId) {
    if (!authenticatedUser) {
      const err = new Error('Yêu cầu đăng nhập để truy cập tài nguyên.');
      err.statusCode = 401;
      throw err;
    }
    if (authenticatedUser.role === AUTH_ROLES.ADMIN) {
      return true; // Admins have oversight
    }
    if (authenticatedUser.id !== targetOwnerId) {
      const err = new Error('Bạn không có quyền truy cập dữ liệu của học sinh khác.');
      err.statusCode = 403;
      throw err;
    }
    return true;
  }

  /**
   * Enforce tenant-level isolation
   */
  assertTenantIsolation(authenticatedUser, targetTenantId) {
    if (!authenticatedUser) {
      const err = new Error('Yêu cầu đăng nhập để truy cập tài nguyên.');
      err.statusCode = 401;
      throw err;
    }
    if (authenticatedUser.role === AUTH_ROLES.ADMIN) {
      return true; // Platform admin has multi-tenant oversight
    }
    if (targetTenantId && authenticatedUser.tenantId && authenticatedUser.tenantId !== targetTenantId) {
      const err = new Error('Bạn không có quyền truy cập dữ liệu của trường/tổ chức khác.');
      err.statusCode = 403;
      throw err;
    }
    return true;
  }

  /**
   * Migrate guest records to student account upon login or registration
   */
  migrateGuestData(guestId, studentId, storageAdapters = {}) {
    if (!guestId || !studentId || guestId === studentId) return { migrated: false };

    // Transfer learning profile, plan, tasks, and sessions from guest to student
    let migratedCount = 0;
    if (storageAdapters.learningStorage) {
      const ls = storageAdapters.learningStorage;
      const guestProfile = ls.getProfile(guestId);
      if (guestProfile) {
        guestProfile.userId = studentId;
        ls.saveProfile(guestProfile);
        ls.deleteProfile?.(guestId);
        migratedCount++;
      }

      const guestPlan = ls.getActivePlan(guestId);
      if (guestPlan) {
        guestPlan.userId = studentId;
        ls.savePlan(guestPlan);
        migratedCount++;
      }
    }

    return { migrated: true, migratedItems: migratedCount, guestId, studentId };
  }

  /**
   * Log out active session and revoke token
   */
  logout(token) {
    if (!token || typeof token !== 'string') return false;
    this.revokedTokens.add(token);
    this.sessions.delete(token);
    this._saveDurableState();
    return true;
  }

  /**
   * Change password and revoke all existing sessions
   */
  changePassword(userId, oldPassword, newPassword) {
    const user = this.users.get(userId);
    if (!user) throw new Error('Người dùng không tồn tại.');
    if (!this.verifyPassword(oldPassword, user.passwordHash)) {
      throw new Error('Mật khẩu cũ không chính xác.');
    }
    user.passwordHash = this.hashPassword(newPassword);
    user.updatedAt = new Date().toISOString();

    // Revoke all existing sessions for this user
    for (const [token, sess] of this.sessions.entries()) {
      if (sess.user.id === userId) {
        this.revokedTokens.add(token);
        this.sessions.delete(token);
      }
    }
    this._saveDurableState();
    return true;
  }

  /**
   * Delete student account and scrub personal data
   */
  deleteAccount(userId) {
    const user = this.users.get(userId);
    if (!user) return false;

    if (user.email) {
      this.emailIndex.delete(user.email.toLowerCase());
    }
    this.users.delete(userId);
    this.revokedUserIds.add(userId);

    // Invalidate sessions and mark all user tokens as revoked
    for (const [token, sess] of this.sessions.entries()) {
      if (sess.user.id === userId) {
        this.revokedTokens.add(token);
        this.sessions.delete(token);
      }
    }
    this._saveDurableState();
    return true;
  }

  /**
   * Return architectural authentication metadata for audits and status checks
   */
  getAuthArchitectureInfo() {
    return {
      authMode: 'custom_hmac_session',
      tokenType: 'HMAC-SHA256 Signed Opaque Session Token',
      isNativeSupabaseAuth: false,
      supabaseStatus: 'BLOCKED_NO_CREDENTIALS',
      passwordAlgorithm: 'scrypt (N=16384, r=8, p=1, salt=16B)',
      sessionDurability: this.durableStorePath ? 'file_persisted' : 'in_memory_with_optional_file_backing'
    };
  }
}

// Global singleton instance
const defaultStudentAuth = new StudentAuthManager({
  durableStorePath: process.env.NTMK_AUTH_STORE_PATH || (process.env.NODE_ENV === 'test' ? null : path.join(process.cwd(), '.ntmk', 'student-auth-state.json'))
});

module.exports = {
  StudentAuthManager,
  defaultStudentAuth,
  AUTH_ROLES,
  DEFAULT_TENANT_ID
};
