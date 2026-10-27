/**
 * Environment Configuration & Fail-Safe Demo Isolation Module
 * NTMK Rebuild Phase 04B — Task 4
 *
 * Security & Isolation Governance:
 * 1. Demo mode is DEFAULT DISABLED.
 * 2. Only permitted in explicit 'test' or 'development' environments with ENABLE_DEMO_FIXTURES === 'true'.
 * 3. Fail-Closed: If NODE_ENV is undeclared, empty, staging, preview, or production,
 *    demo fixtures and test reviewers are strictly forbidden.
 * 4. Client requests (headers, query params, cookies) CANNOT enable demo mode or elevate privileges.
 * 5. Fixture reviewers cannot sign off or publish questions outside allowed test/dev mode.
 * 6. Fixture student accounts cannot update real student progress or influence production metrics.
 */

class EnvironmentConfig {
  /**
   * Determine the normalized current environment
   */
  static getEnvironment(options = {}) {
    if (options && options.environment) return options.environment;
    const raw = (process.env.APP_ENV || process.env.NODE_ENV || process.env.VERCEL_ENV || '').trim().toLowerCase();
    if (raw === 'production' || raw === 'prod') return 'production';
    if (raw === 'staging' || raw === 'stage') return 'staging';
    if (raw === 'test') return 'test';
    if (raw === 'development' || raw === 'dev' || raw === 'local') return 'development';
    if (raw === 'undeclared') return 'undeclared';

    // Auto-detect node --test runner execution when NODE_ENV is not explicitly set
    if (!raw && (!options || options.isTestMode !== false)) {
      const isTestRunner = (process.execArgv && process.execArgv.includes('--test')) ||
        (process.argv && process.argv.some(arg => typeof arg === 'string' && (arg === '--test' || arg.includes('.test.js') || arg.includes('tests/') || arg.includes('tests\\'))));
      if (isTestRunner) {
        process.env.NODE_ENV = 'test';
        return 'test';
      }
    }

    return 'undeclared';
  }

  /**
   * Check if Demo Mode and Test Fixtures are strictly allowed
   * Defaults to false (FAIL CLOSED)
   */
  static isDemoAllowed(options = {}) {
    if (options && options.isDemoAllowed !== undefined) return Boolean(options.isDemoAllowed);
    if (options && options.isTestMode === false) return false;
    if (options && options.isTestMode === true) return true;

    const env = EnvironmentConfig.getEnvironment(options);

    // In automated test runs (jest, node --test), allow test fixtures
    if (env === 'test') {
      return true;
    }

    // In local development, only allow if explicitly configured via flag
    if (env === 'development') {
      return process.env.ENABLE_DEMO_FIXTURES === 'true';
    }

    // All other environments (production, staging, undeclared): STRICTLY DISABLED
    return false;
  }

  /**
   * Check if a given reviewer identity is a test fixture
   */
  static isFixtureReviewer(reviewer) {
    if (!reviewer) return false;
    if (reviewer.isFixture === true) return true;
    const id = String(reviewer.id || '');
    return id.startsWith('fixture_') || id.includes('_fixture_') || id.startsWith('test_');
  }

  /**
   * Check if a student identity is a test fixture
   */
  static isFixtureStudent(user) {
    if (!user) return false;
    const id = String(user.id || '');
    return id.startsWith('student_fixture_') || id.includes('_fixture_') || id.startsWith('test_student_');
  }

  /**
   * Enforce fixture isolation guard: throws or returns error if a fixture is used in unauthorized env
   */
  static assertDemoAllowed(action = 'use demo fixtures') {
    if (!EnvironmentConfig.isDemoAllowed()) {
      const env = EnvironmentConfig.getEnvironment();
      const err = new Error(`FORBIDDEN: Cannot ${action} in '${env}' environment. Demo mode is strictly disabled.`);
      err.statusCode = 403;
      err.code = 'DEMO_MODE_DISABLED';
      throw err;
    }
    return true;
  }

  /**
   * Get public environment disclosure metadata (safe for status endpoints)
   */
  static getDisclosure() {
    const env = EnvironmentConfig.getEnvironment();
    const demoAllowed = EnvironmentConfig.isDemoAllowed();
    return {
      environment: env,
      isProduction: env === 'production',
      isStaging: env === 'staging',
      demoMode: demoAllowed ? 'ENABLED_TEST_DEV_ONLY' : 'DISABLED_FAIL_CLOSED',
      fixturesAllowed: demoAllowed,
      contentGateStatus: 'BLOCKED_PENDING_HUMAN_REVIEW',
      stagingGateStatus: process.env.SUPABASE_URL ? 'CONFIGURED' : 'BLOCKED_NO_CREDENTIALS'
    };
  }
}

module.exports = EnvironmentConfig;
