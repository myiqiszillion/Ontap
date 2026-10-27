/**
 * Phase 04B — Staging Gate, Demo Isolation, Auth Architecture & Content Integrity Test Suite
 * NTMK Rebuild Phase 04B
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const EnvironmentConfig = require('../engine/config/environment-config.js');
const { ReviewerDirectory, defaultDirectory, REVIEWER_ROLES } = require('../engine/auth/reviewer-directory.js');
const { StudentAuthManager, defaultStudentAuth } = require('../engine/auth/student-auth.js');
const BankStorage = require('../engine/storage/bank-storage.js');
const QuestionSchemaV2 = require('../engine/schema.js');
const LearningStorage = require('../engine/planner/learning-storage.js');
const { MigrationRunner } = require('../engine/storage/migration-runner.js');
const { generateReviewDossier } = require('../engine/ingestion/human-review-package.js');

describe('NTMK Phase 04B — Cloud Staging, Demo Isolation & Security Acceptance', () => {

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 4: FAIL-SAFE DEMO ISOLATION ACROSS ENVIRONMENTS
  // ═════════════════════════════════════════════════════════════════════════
  describe('Task 4 — Fail-Safe Demo Isolation Matrix', () => {
    let originalEnv;
    let originalEnableFixtures;

    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      originalEnableFixtures = process.env.ENABLE_DEMO_FIXTURES;
    });

    afterEach(() => {
      if (originalEnv !== undefined) process.env.NODE_ENV = originalEnv;
      else delete process.env.NODE_ENV;
      if (originalEnableFixtures !== undefined) process.env.ENABLE_DEMO_FIXTURES = originalEnableFixtures;
      else delete process.env.ENABLE_DEMO_FIXTURES;
    });

    test('4.1 Demo mode is strictly DISABLED in production, staging, and undeclared environments', () => {
      // Production
      process.env.NODE_ENV = 'production';
      assert.equal(EnvironmentConfig.isDemoAllowed(), false, 'Demo mode must be false in production');

      // Staging
      process.env.NODE_ENV = 'staging';
      assert.equal(EnvironmentConfig.isDemoAllowed(), false, 'Demo mode must be false in staging');

      // Undeclared / empty (fail-closed)
      delete process.env.NODE_ENV;
      delete process.env.APP_ENV;
      delete process.env.VERCEL_ENV;
      // When explicitly checked with options
      assert.equal(EnvironmentConfig.isDemoAllowed({ isTestMode: false }), false, 'Demo mode must fail closed');
    });

    test('4.2 In development, demo mode requires explicit ENABLE_DEMO_FIXTURES=true', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ENABLE_DEMO_FIXTURES;
      assert.equal(EnvironmentConfig.isDemoAllowed(), false, 'Dev without flag must be disabled');

      process.env.ENABLE_DEMO_FIXTURES = 'true';
      assert.equal(EnvironmentConfig.isDemoAllowed(), true, 'Dev with flag must be enabled');
    });

    test('4.3 Reviewer Directory refuses fixture reviewers in production and staging', () => {
      // Production test
      process.env.NODE_ENV = 'production';
      const prodDir = new ReviewerDirectory(null, { isDemoAllowed: false });
      assert.equal(prodDir.listReviewers().length, 0, 'Production must load zero fixture reviewers');
      assert.equal(prodDir.authenticateByToken('tok_fixture_auditor_toan_a89f3c7e12'), null);
      assert.equal(prodDir.getReviewerById('fixture_math_reviewer_01'), null);

      const fakeFixture = { id: 'fixture_math_reviewer_01', isFixture: true, active: true };
      const auth = prodDir.authorizeAction({ reviewer: fakeFixture, action: 'verify', subjectId: 'toan' });
      assert.equal(auth.authorized, false);
      assert.ok(auth.reason.includes('forbidden') || auth.reason.includes('Missing'));
    });

    test('4.4 Student Auth refuses fixture accounts in production and staging', () => {
      process.env.NODE_ENV = 'production';
      const prodAuth = new StudentAuthManager({ isTestMode: false, durableStorePath: null });
      assert.equal(prodAuth.users.has('student_fixture_alice'), false, 'Must not seed fixtures in production');

      // Attempting to use a fixture user
      const fakeSession = prodAuth.createSession({
        id: 'student_fixture_alice',
        role: 'student',
        email: 'alice@student.ntmk.internal',
        displayName: 'Alice'
      });
      assert.equal(prodAuth.verifySessionToken(fakeSession.token), null, 'Fixture token must be rejected in production');
    });

    test('4.5 Coverage matrix isolates internal demo readiness from production', () => {
      const bank = new BankStorage();
      
      // In test mode, internal demo is reported
      const testMatrix = bank.getCoverageMatrix();
      assert.equal(testMatrix.toan[10].readinessLevel, 'internal_demo_ready');

      // In production mode, internal demo is BLOCKED
      process.env.NODE_ENV = 'production';
      const prodMatrix = bank.getCoverageMatrix();
      assert.equal(prodMatrix.toan[10].readinessLevel, 'blocked_insufficient_content');
      assert.equal(prodMatrix.toan[10].isInternalDemoReady, false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 5: 14-QUESTION HUMAN REVIEW DOSSIER INTEGRITY
  // ═════════════════════════════════════════════════════════════
  describe('Task 5 — 14-Question Human Review Dossier Integrity', () => {
    test('5.1 Review dossier contains all 14 questions with default needs_review and null signature', () => {
      const dossier = generateReviewDossier();
      assert.equal(dossier.totalQuestions, 14);
      assert.equal(dossier.defaultStatus, 'needs_review');
      assert.ok(dossier.humanVerificationGate.includes('BLOCKED'));

      dossier.questions.forEach((q, idx) => {
        assert.ok(q.id.startsWith('toan10_pilot_'));
        assert.equal(q.grade, 10);
        assert.equal(q.subjectId, 'toan');
        assert.equal(q.reviewStatus, 'needs_review');
        assert.equal(q.verifiedBy, null, `Question ${q.id} must have verifiedBy: null`);
        assert.equal(q.verifiedAt, null, `Question ${q.id} must have verifiedAt: null`);
        assert.equal(q.decision, 'AWAITING_HUMAN_REVIEWER');
        assert.equal(q.checklist.length, 8, 'Checklist must contain 8 criteria');
        assert.ok(q.explanation.length > 10, 'Must have detailed explanation');
        assert.ok(q.answerSummary.length > 5, 'Must have clear answer summary');
      });
    });

    test('5.2 Markdown review package is successfully rendered and matches disk artifact', () => {
      const mdPath = path.join(process.cwd(), 'docs', 'rebuild', '58-toan10-human-review-package.md');
      assert.ok(fs.existsSync(mdPath), 'Review package artifact must exist');
      const content = fs.readFileSync(mdPath, 'utf8');
      assert.ok(content.includes('HỒ SƠ KIỂM DUYỆT SƯ PHẠM — 14 CÂU HỎI THÍ ĐIỂM TOÁN 10'));
      assert.ok(content.includes('toan10_pilot_set_mcq_01'));
      assert.ok(content.includes('toan10_pilot_quad_sa_01'));
      assert.ok(content.includes('BLOCKED'));
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 6: ROLLBACK & ERRONEOUS CONTENT UNPUBLISHING REMEDIATION
  // ═════════════════════════════════════════════════════════════
  describe('Task 6 — Publication Rollback & Student Remediation Tracking', () => {
    test('6.1 Rollback flags student learning tasks and events without deleting history', () => {
      const testDir = path.join(process.cwd(), '.ntmk_test_rollback');
      if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
      
      const ls = new LearningStorage({ baseDir: testDir });
      
      // Save a learning plan with tasks referencing question
      const samplePlan = {
        planId: 'plan_test_01',
        userId: 'std_alice_01',
        tasks: [
          {
            taskId: 'task_01',
            planId: 'plan_test_01',
            questionId: 'toan10_pilot_set_mcq_01',
            status: 'completed'
          },
          {
            taskId: 'task_02',
            planId: 'plan_test_01',
            questionId: 'other_valid_q',
            status: 'in_progress'
          }
        ]
      };
      ls.savePlan(samplePlan);

      // Record a task event referencing question
      ls.recordTaskEvent('task_01', 'item_submitted', { questionId: 'toan10_pilot_set_mcq_01', correct: true });

      // Execute rollback remediation
      const flagged = ls.flagQuestionAffectedSessions('toan10_pilot_set_mcq_01', 'Erroneous answer key retracted');
      assert.equal(flagged.length, 2, 'Should flag 1 task and 1 event');

      // Verify task retained with remediation note
      const updatedTask = ls.getTask('task_01');
      assert.equal(updatedTask.flaggedForRemediation, true);
      assert.equal(updatedTask.remediationReason, 'Erroneous answer key retracted');
      assert.equal(updatedTask.status, 'completed', 'Historical completion must NOT be deleted');

      // Clean up test dir
      fs.rmSync(testDir, { recursive: true, force: true });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // TASK 2: MIGRATION RUNNER STATIC INTEGRITY
  // ═════════════════════════════════════════════════════════════
  describe('Task 2 — Migration Runner Static Verification & Guarding', () => {
    test('2.1 Static validation verifies 6 forward migrations with transactions and excludes rollback', () => {
      const runner = new MigrationRunner();
      const report = runner.validateStaticAll();
      assert.equal(report.valid, true);
      assert.equal(report.errors.length, 0);
      assert.equal(report.validatedFiles.length, 6);

      // Ensure 004 is NOT in forward list
      assert.equal(runner.forwardList.includes('004_rollback_phase02c.sql'), false);

      // Ensure all 6 forward migrations have transactions
      report.validatedFiles.forEach(f => {
        assert.equal(f.hasTransaction, true, `${f.fileName} must have BEGIN/COMMIT`);
      });

      // Verify dry-run outputs correct gate status when unconfigured
      const dryRun = runner.dryRun();
      assert.equal(dryRun.gateStatus, 'BLOCKED_NO_CREDENTIALS');
      assert.ok(Array.isArray(dryRun.adminInstructions));
    });
  });
});
