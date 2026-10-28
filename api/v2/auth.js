/**
 * Student Authentication & Identity API Router (V2)
 * NTMK Rebuild Phase 04A & SaaS Multi-Tenant Evolution
 *
 * Endpoints:
 * - POST /api/v2/auth/register      (Register new student with tenant context)
 * - POST /api/v2/auth/login         (Login student)
 * - POST /api/v2/auth/guest         (Obtain cryptographically signed guest session with tenant)
 * - GET  /api/v2/auth/me            (Get active session profile + tenant ID)
 * - POST /api/v2/auth/migrate       (Upgrade & transfer guest progress to student)
 * - POST /api/v2/auth/logout        (Terminate session)
 * - DELETE /api/v2/auth/account     (Erase account & scrub PI)
 */

const { defaultStudentAuth } = require('../../engine/auth/student-auth.js');
const LearningStorage = require('../../engine/planner/learning-storage.js');

let learningStorageInstance = null;
function getLearningStorage() {
  if (!learningStorageInstance) {
    learningStorageInstance = new LearningStorage();
  }
  return learningStorageInstance;
}

module.exports = async function authHandler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token, X-Tenant-ID, X-Tenant-Slug');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlPath = (req.originalUrl || req.url || '').split('?')[0];
  const query = req.query || {};
  const action = query.action || (urlPath.split('/').filter(Boolean).pop());

  try {
    // 1. POST /register
    if (req.method === 'POST' && (action === 'register' || urlPath.endsWith('/register'))) {
      const { email, password, displayName, grade, guestTokenToMigrate, tenantId } = req.body || {};
      const resolvedTenantId = tenantId || req.headers['x-tenant-id'] || null;
      const session = defaultStudentAuth.registerStudent({
        email,
        password,
        displayName,
        grade,
        tenantId: resolvedTenantId
      });

      // Automatically migrate guest progress if guest token provided
      if (guestTokenToMigrate) {
        const guestUser = defaultStudentAuth.verifySessionToken(guestTokenToMigrate);
        if (guestUser && guestUser.isGuest) {
          defaultStudentAuth.migrateGuestData(guestUser.id, session.user.id, {
            learningStorage: getLearningStorage()
          });
        }
      }

      return res.status(201).json({
        success: true,
        session
      });
    }

    // 2. POST /login
    if (req.method === 'POST' && (action === 'login' || urlPath.endsWith('/login'))) {
      const { email, password, guestTokenToMigrate } = req.body || {};
      const session = defaultStudentAuth.loginStudent(email, password);

      if (guestTokenToMigrate) {
        const guestUser = defaultStudentAuth.verifySessionToken(guestTokenToMigrate);
        if (guestUser && guestUser.isGuest) {
          defaultStudentAuth.migrateGuestData(guestUser.id, session.user.id, {
            learningStorage: getLearningStorage()
          });
        }
      }

      return res.status(200).json({
        success: true,
        session
      });
    }

    // 3. POST /guest
    if (req.method === 'POST' && (action === 'guest' || urlPath.endsWith('/guest'))) {
      const { grade, tenantId } = req.body || {};
      const resolvedTenantId = tenantId || req.headers['x-tenant-id'] || null;
      const session = defaultStudentAuth.createGuestSession({
        grade,
        tenantId: resolvedTenantId
      });
      return res.status(201).json({
        success: true,
        session
      });
    }

    // 4. GET /me
    if (req.method === 'GET' && (action === 'me' || urlPath.endsWith('/me'))) {
      const authUser = defaultStudentAuth.authenticateRequest(req);
      if (!authUser) {
        return res.status(401).json({ error: 'Chưa đăng nhập hoặc phiên học tập đã hết hạn.' });
      }
      return res.status(200).json({
        user: authUser,
        tenantId: authUser.tenantId
      });
    }

    // 5. POST /migrate
    if (req.method === 'POST' && (action === 'migrate' || urlPath.endsWith('/migrate'))) {
      const authUser = defaultStudentAuth.authenticateRequest(req);
      if (!authUser || authUser.isGuest) {
        return res.status(401).json({ error: 'Chỉ tài khoản học sinh đã đăng nhập mới có thể đồng bộ dữ liệu.' });
      }
      const { guestToken } = req.body || {};
      const guestUser = defaultStudentAuth.verifySessionToken(guestToken);
      if (!guestUser || !guestUser.isGuest) {
        return res.status(400).json({ error: 'Guest session token không hợp lệ hoặc đã hết hạn.' });
      }

      const migrationResult = defaultStudentAuth.migrateGuestData(guestUser.id, authUser.id, {
        learningStorage: getLearningStorage()
      });

      return res.status(200).json({
        success: true,
        ...migrationResult
      });
    }

    // 6. POST /logout
    if (req.method === 'POST' && (action === 'logout' || urlPath.endsWith('/logout'))) {
      const authHeader = req.headers && (req.headers['authorization'] || req.headers['x-session-token']);
      let token = null;
      if (authHeader) {
        token = authHeader.replace(/^Bearer\s+/i, '').trim();
      }
      if (token) {
        defaultStudentAuth.logout(token);
      }
      return res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công và phiên làm việc đã được thu hồi.'
      });
    }

    // 7. POST /password (Change Password)
    if (req.method === 'POST' && (action === 'password' || urlPath.endsWith('/password'))) {
      const authUser = defaultStudentAuth.authenticateRequest(req);
      if (!authUser || authUser.isGuest) {
        return res.status(401).json({ error: 'Yêu cầu đăng nhập tài khoản học sinh.' });
      }
      const { oldPassword, newPassword } = req.body || {};
      defaultStudentAuth.changePassword(authUser.id, oldPassword, newPassword);
      return res.status(200).json({
        success: true,
        message: 'Đổi mật khẩu thành công. Toàn bộ phiên cũ đã được thu hồi.'
      });
    }

    // 8. DELETE /account
    if (req.method === 'DELETE' && (action === 'account' || urlPath.endsWith('/account'))) {
      const authUser = defaultStudentAuth.authenticateRequest(req);
      if (!authUser || authUser.isGuest) {
        return res.status(401).json({ error: 'Yêu cầu đăng nhập tài khoản học sinh để thực hiện xóa.' });
      }
      defaultStudentAuth.deleteAccount(authUser.id);
      return res.status(200).json({
        success: true,
        message: 'Tài khoản đã được xóa thành công.'
      });
    }

    // 9. GET /info
    if (req.method === 'GET' && (action === 'info' || urlPath.endsWith('/info'))) {
      return res.status(200).json({
        success: true,
        architecture: defaultStudentAuth.getAuthArchitectureInfo()
      });
    }

    return res.status(404).json({ error: 'Tài nguyên xác thực không tồn tại.' });
  } catch (err) {
    const statusCode = err.statusCode || (err.message.includes('không chính xác') || err.message.includes('không hợp lệ') || err.message.includes('đã được đăng ký') ? 400 : 500);
    return res.status(statusCode).json({ error: err.message });
  }
};
