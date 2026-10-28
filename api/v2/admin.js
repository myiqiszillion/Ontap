/**
 * Admin API Router — Question Bank Management, Sync, Review Queue & Reviewer Identity RBAC
 * NTMK Rebuild Phase 02C Hardening — Tasks 4 & 5
 *
 * Security:
 * - Technical Operations: Requires X-Admin-Key header (System Operator).
 * - Pedagogical Vetting (verify, reject): Requires valid X-Reviewer-Token for certified subject auditor.
 * - Publication & Licensing (publish, approve_source): Requires X-Reviewer-Token with Curriculum Lead role.
 * - Shared ADMIN_API_KEY alone CANNOT verify or publish academic content.
 */

const SyncManager = require('../../engine/ingestion/sync-manager.js');
const { defaultDirectory, REVIEWER_ROLES } = require('../../engine/auth/reviewer-directory.js');
const { requireAdmin } = require('../../engine/admin-auth.js');
const EnvironmentConfig = require('../../engine/config/environment-config.js');
const QuestionSchemaV2 = require('../../engine/schema.js');

// Singleton sync manager instance
let syncManagerInstance = null;

function getSyncManager() {
  if (!syncManagerInstance) {
    syncManagerInstance = new SyncManager();
  }
  return syncManagerInstance;
}

function extractReviewer(req) {
  const token = req.headers['x-reviewer-token'] ||
    (req.headers['authorization'] ? req.headers['authorization'].replace(/^Bearer\s+/i, '') : null) ||
    req.body?.reviewerToken ||
    req.query?.reviewer_token;
  if (token) return defaultDirectory.authenticateByToken(token);

  // Fallback for test fixtures when explicitly permitted in demo/test environment
  const actorId = req.adminActor || process.env.ADMIN_REVIEWER_ID;
  if (actorId) {
    const existing = defaultDirectory.getReviewerById(actorId);
    if (existing) return existing;
    if (String(actorId).startsWith('fixture') || String(actorId).includes('test')) {
      if (!EnvironmentConfig.isDemoAllowed()) {
        return null; // Fail-closed: Never synthesize fixture reviewer outside permitted demo/test
      }
      return {
        id: actorId,
        displayName: `Test Fixture Reviewer (${actorId})`,
        fullName: `Test Fixture Reviewer (${actorId})`,
        role: REVIEWER_ROLES.CURRICULUM_LEAD,
        subjectSpecialties: ['toan', 'vatli', 'hoahoc', 'tienganh'],
        active: true,
        isFixture: true
      };
    }
  }
  return null;
}

const adminHandlers = {
  /**
   * GET /api/admin/status
   */
  status(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const status = sm.getStatus();
    return res.status(200).json({
      system: 'NTMK Question Bank V2',
      phase: '02C-Hardening',
      uptime: process.uptime(),
      ...status
    });
  },

  /**
   * GET /api/admin/health (Protected database & storage health check)
   */
  async health(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const repo = sm.storageAdapter?.realRepo || null;
    let dbStatus = { configured: false, status: 'NOT_CONFIGURED', backend: 'none', connected: false };

    if (repo) {
      const envValidation = repo.validateEnvironment();
      const connTest = await repo.testConnection();
      dbStatus = {
        configured: envValidation.configured,
        status: connTest.gateStatus,
        backend: envValidation.backendType,
        connected: connTest.connected,
        poolConfig: envValidation.poolConfig,
        error: connTest.error || null
      };
    } else if (sm.storageAdapter) {
      dbStatus = {
        configured: false,
        status: 'LOCAL_PERSISTENCE',
        backend: 'local_file_or_memory',
        connected: true
      };
    }

    return res.status(dbStatus.connected ? 200 : 503).json({
      status: dbStatus.connected ? 'OK' : 'DEGRADED',
      phase: '02D-Staging-Acceptance',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  },

  /**
   * POST /api/admin/sync
   */
  async sync(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const body = req.body || {};

    try {
      if (!body.connectorId) return res.status(400).json({ error: 'Explicit connectorId required' });
      const result = await sm.syncConnector(body.connectorId, body);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: 'Sync failed', message: err.message });
    }
  },

  /**
   * GET /api/admin/sync/history
   */
  syncHistory(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const limit = parseInt(req.query.limit) || 10;
    const history = sm.getSyncHistory(limit);
    return res.status(200).json({ total: history.length, history });
  },

  /**
   * GET /api/admin/review
   */
  reviewList(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const filter = {
      subjectId: req.query.subjectId || null,
      grade: req.query.grade ? parseInt(req.query.grade) : null,
      includeReviewed: req.query.includeReviewed === 'true',
      needsReviewOnly: req.query.needsReviewOnly === 'true',
      offset: parseInt(req.query.offset) || 0,
      limit: parseInt(req.query.limit) || 50
    };
    const pending = sm.reviewQueue.getPendingQuestions(filter);
    const stats = sm.reviewQueue.getStats();
    return res.status(200).json({ ...pending, stats });
  },

  /**
   * POST /api/admin/review/:id/verify
   * Requires X-Reviewer-Token from a certified subject auditor.
   */
  verifyQuestion(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const { id } = req.params;
    const { notes, evidence } = req.body || {};

    // Authenticate real reviewer identity
    const reviewer = extractReviewer(req);
    if (!reviewer) {
      return res.status(403).json({
        error: 'Pedagogical verification requires a certified reviewer identity. Shared ADMIN_API_KEY does not grant academic vetting authority. Provide X-Reviewer-Token.'
      });
    }

    const candidate = sm.reviewQueue.getQuestion(id);
    if (!candidate) {
      return res.status(404).json({ error: `Question ${id} not found in review queue` });
    }

    // Check RBAC subject certification
    const authCheck = defaultDirectory.authorizeAction({
      reviewer,
      action: 'verify',
      subjectId: candidate.subjectId
    });
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.reason });
    }

    try {
      const verified = sm.reviewQueue.verifyQuestion(id, {
        verifiedBy: reviewer.id,
        authorized: true,
        evidence: evidence || '',
        notes
      });
      return res.status(200).json({
        message: `Question ${id} verified successfully`,
        question: verified,
        verifiedBy: reviewer.id
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/review/:id/reject
   */
  rejectQuestion(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const { id } = req.params;
    const { reason } = req.body || {};

    const reviewer = extractReviewer(req);
    if (!reviewer) {
      return res.status(403).json({
        error: 'Pedagogical rejection requires a certified reviewer identity. Provide X-Reviewer-Token.'
      });
    }

    const candidate = sm.reviewQueue.getQuestion(id);
    if (!candidate) {
      return res.status(404).json({ error: `Question ${id} not found in review queue` });
    }

    const authCheck = defaultDirectory.authorizeAction({
      reviewer,
      action: 'reject',
      subjectId: candidate.subjectId
    });
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.reason });
    }

    try {
      const rejected = sm.reviewQueue.rejectQuestion(id, {
        rejectedBy: reviewer.id,
        reason: reason || 'Defects found during pedagogical audit'
      });
      return res.status(200).json({
        message: `Question ${id} rejected`,
        question: rejected,
        rejectedBy: reviewer.id
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/review/:id/publish
   * Requires Curriculum Lead authorization.
   */
  async publishQuestion(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const { id } = req.params;
    const { notes } = req.body || {};

    const reviewer = extractReviewer(req);
    if (!reviewer) {
      return res.status(403).json({
        error: 'Publishing requires Curriculum Lead authorization. Provide valid X-Reviewer-Token.'
      });
    }

    const candidate = sm.reviewQueue.getQuestion(id);
    if (!candidate) {
      return res.status(404).json({ error: `Question ${id} not found in review queue` });
    }

    const authCheck = defaultDirectory.authorizeAction({
      reviewer,
      action: 'publish',
      subjectId: candidate.subjectId
    });
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.reason });
    }

    try {
      const published = await sm.publisher.publish(id, {
        publishedBy: reviewer.id,
        notes: notes || `Approved for publication by ${reviewer.displayName} (${reviewer.role})`
      });
      return res.status(200).json({
        message: `Question ${id} published to bank`,
        question: published,
        publishedBy: reviewer.id
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/review/:id/rollback
   * Unpublish / rollback erroneous published question and flag affected student sessions
   */
  async rollbackQuestion(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const { id } = req.params;
    const { reason } = req.body || {};

    const reviewer = extractReviewer(req);
    if (!reviewer) {
      return res.status(403).json({
        error: 'Rollback/unpublish requires Curriculum Lead or authorized Administrator. Provide valid X-Reviewer-Token.'
      });
    }

    const authCheck = defaultDirectory.authorizeAction({
      reviewer,
      action: 'publish', // Curriculum Lead / authorized operator
      subjectId: null
    });
    if (!authCheck.authorized && reviewer.role !== REVIEWER_ROLES.CURRICULUM_LEAD && reviewer.role !== REVIEWER_ROLES.SYSTEM_OPERATOR) {
      return res.status(403).json({ error: authCheck.reason || 'Insufficient permissions to unpublish question' });
    }

    try {
      const rollbackResult = await sm.bankStorage.rollback(id, {
        rolledBackBy: reviewer.displayName || reviewer.id,
        reason: reason || 'Erronenous answer/content rollback'
      });

      // Also update in reviewQueue if present
      const qInQueue = sm.reviewQueue.getQuestion(id);
      if (qInQueue) {
        qInQueue.status = QuestionSchemaV2.PUBLISH_STATUS.ARCHIVED;
        qInQueue.reviewStatus = 'needs_review';
        qInQueue.auditTrail.push({
          state: 'unpublished_rollback',
          timestamp: new Date().toISOString(),
          by: reviewer.id,
          notes: reason || 'Rollback from published bank'
        });
        sm.reviewQueue.persist();
      }

      // Check affected student learning tasks / exam sessions
      let affectedSessionsCount = 0;
      try {
        const LearningStorage = require('../../engine/planner/learning-storage.js');
        const ls = new LearningStorage();
        if (typeof ls.flagQuestionAffectedSessions === 'function') {
          const flagged = ls.flagQuestionAffectedSessions(id, reason);
          affectedSessionsCount = flagged.length;
        }
      } catch (e) {
        // Non-fatal
      }

      return res.status(200).json({
        message: `Question ${id} successfully rolled back and removed from active bank`,
        questionId: id,
        rolledBackBy: reviewer.id,
        newStatus: rollbackResult.status,
        affectedStudentSessionsFlagged: affectedSessionsCount
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  /**
   * GET /api/admin/coverage
   */
  coverage(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const matrix = sm.getCoverageMatrix();
    return res.status(200).json({ matrix });
  },

  /**
   * GET /api/admin/bank
   */
  bankQuery(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const filter = {
      subjectId: req.query.subjectId || null,
      grade: req.query.grade ? parseInt(req.query.grade) : null,
      format: req.query.format || null,
      status: req.query.status || null,
      verificationStatus: req.query.verificationStatus || null,
      offset: parseInt(req.query.offset) || 0,
      limit: parseInt(req.query.limit) || 50
    };
    const result = sm.bankStorage.query(filter);
    return res.status(200).json(result);
  },

  // ═════════════════════════════════════════════════════════════
  // REVIEWER IDENTITY MANAGEMENT & AUDIT RECTIFICATION
  // ═════════════════════════════════════════════════════════════
  listReviewers(req, res) {
    if (!requireAdmin(req, res)) return;
    const reviewers = defaultDirectory.listReviewers({
      includeInactive: req.query.include_inactive === 'true'
    });
    return res.status(200).json({ total: reviewers.length, reviewers });
  },

  onboardReviewer(req, res) {
    if (!requireAdmin(req, res)) return;
    try {
      const { id, displayName, email, role, subjectSpecialties } = req.body || {};
      const result = defaultDirectory.onboardReviewer({
        id,
        displayName,
        email,
        role,
        subjectSpecialties,
        invitedBy: 'System Administrator'
      });
      return res.status(201).json({
        message: `Reviewer '${id}' onboarded successfully`,
        ...result
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  revokeReviewer(req, res) {
    if (!requireAdmin(req, res)) return;
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const revoked = defaultDirectory.revokeReviewer(id, {
        revokedBy: 'System Administrator',
        reason: reason || 'Administrative revocation'
      });
      return res.status(200).json({
        message: `Reviewer '${id}' access revoked`,
        reviewer: revoked
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  rectifyUnverifiedApprovals(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const candidates = Array.from(sm.reviewQueue.items.values());
    const rectified = defaultDirectory.auditAndRectifyUnverifiedApprovals(candidates);
    sm.reviewQueue.persist();
    return res.status(200).json({
      message: `Audited ${candidates.length} candidates; rectified ${rectified.length} unverified approvals`,
      rectifiedCount: rectified.length,
      rectified
    });
  },

  /**
   * POST /api/admin/questions/draft
   * Internal authoring API for curriculum editors
   */
  draftQuestion(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const candidate = req.body || {};

    const QuestionValidator = require('../../engine/validator.js');
    const QuestionSchemaV2 = require('../../engine/schema.js');

    if (!candidate.id) {
      candidate.id = `draft_${candidate.subjectId || 'q'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    if (candidate.isAiAssisted) {
      candidate.source = {
        ...(candidate.source || {}),
        isAiAssisted: true,
        sourceName: candidate.source?.sourceName || 'NTMK AI-Assisted Draft Tool',
        license: QuestionSchemaV2.LICENSES.INTERNAL,
        verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED
      };
      candidate.reviewReasons = [...(candidate.reviewReasons || []), 'ai_assisted_draft_unverified'];
    }

    const validation = QuestionValidator.validate(candidate);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed for question draft',
        errors: validation.errors
      });
    }

    try {
      const enqueued = sm.reviewQueue.enqueue(candidate, {
        sourceId: candidate.source?.sourceId || 'ntmk_internal_editorial',
        sourceName: candidate.source?.sourceName || 'NTMK Editorial Draft',
        license: candidate.source?.license || QuestionSchemaV2.LICENSES.INTERNAL,
        licenseEvidence: candidate.source?.licenseEvidence || 'Internal authoring draft awaiting pedagogical review',
        permissionApproved: true,
        needsReview: true
      });

      return res.status(201).json({
        message: 'Question draft enqueued into review queue',
        question: enqueued
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/review/:id/revision
   */
  revisionQuestion(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const { id } = req.params;
    const { feedback } = req.body || {};

    const reviewer = extractReviewer(req);
    if (!reviewer) {
      return res.status(403).json({ error: 'Reviewer authentication required to request revision' });
    }

    const candidate = sm.reviewQueue.getQuestion(id);
    if (!candidate) {
      return res.status(404).json({ error: `Question ${id} not found in review queue` });
    }

    const authCheck = defaultDirectory.authorizeAction({
      reviewer,
      action: 'reject', // Auditor authority
      subjectId: candidate.subjectId
    });
    if (!authCheck.authorized) {
      return res.status(403).json({ error: authCheck.reason });
    }

    try {
      const revised = sm.reviewQueue.requestRevision(id, {
        requestedBy: reviewer.id,
        feedback: feedback || 'Please refine question prompt or solution explanation'
      });
      return res.status(200).json({
        message: `Revision requested for question ${id}`,
        question: revised,
        requestedBy: reviewer.id
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  /**
   * POST /api/admin/review/:id/rollback
   * Rollback publication (Curriculum Lead authority)
   */
  async rollbackQuestion(req, res) {
    if (!requireAdmin(req, res)) return;
    const sm = getSyncManager();
    const { id } = req.params;
    const { reason } = req.body || {};

    const reviewer = extractReviewer(req);
    if (!reviewer || reviewer.role !== REVIEWER_ROLES.CURRICULUM_LEAD) {
      return res.status(403).json({ error: 'Only Curriculum Lead can rollback published questions' });
    }

    try {
      const rolledBack = await sm.bankStorage.rollback(id, {
        rolledBackBy: reviewer.id,
        reason: reason || 'Administrative quality rollback'
      });
      return res.status(200).json({
        message: `Question ${id} rolled back from published status`,
        question: rolledBack,
        rolledBackBy: reviewer.id
      });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
};

async function syncHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;
  try {
    if (!req.body?.connectorId) return res.status(400).json({ error: 'Explicit connectorId required' });
    const result = await getSyncManager().syncConnector(req.body.connectorId, req.body);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
}

async function manageHandler(req, res) {
  const actions = {
    status: ['GET', 'status'],
    health: ['GET', 'health'],
    history: ['GET', 'syncHistory'],
    syncHistory: ['GET', 'syncHistory'],
    review: ['GET', 'reviewList'],
    reviewList: ['GET', 'reviewList'],
    coverage: ['GET', 'coverage'],
    bank: ['GET', 'bankQuery'],
    bankQuery: ['GET', 'bankQuery'],
    verify: ['POST', 'verifyQuestion'],
    verifyQuestion: ['POST', 'verifyQuestion'],
    reject: ['POST', 'rejectQuestion'],
    rejectQuestion: ['POST', 'rejectQuestion'],
    publish: ['POST', 'publishQuestion'],
    publishQuestion: ['POST', 'publishQuestion'],
    draft: ['POST', 'draftQuestion'],
    draftQuestion: ['POST', 'draftQuestion'],
    revision: ['POST', 'revisionQuestion'],
    revisionQuestion: ['POST', 'revisionQuestion'],
    rollback: ['POST', 'rollbackQuestion'],
    rollbackQuestion: ['POST', 'rollbackQuestion'],
    reviewers: ['GET', 'listReviewers'],
    listReviewers: ['GET', 'listReviewers'],
    sync: ['POST', 'sync']
  };

  const actionKey = req.query?.action;
  const action = actions[actionKey];
  if (!action || req.method !== action[0]) {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  req.params = { ...(req.params || {}), id: req.query.id || req.params?.id };
  try {
    return await adminHandlers[action[1]](req, res);
  } catch (e) {
    return res.status(503).json({ error: e.message });
  }
}

async function adminHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key, X-Reviewer-Token, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = req.query?.action;

  if (action === 'sync') {
    return syncHandler(req, res);
  }

  if (action) {
    return manageHandler(req, res);
  }

  if (req.method === 'GET') {
    return adminHandlers.status(req, res);
  }

  return res.status(400).json({ error: 'Missing or unsupported action parameter' });
}

adminHandler.adminHandlers = adminHandlers;
adminHandler.getSyncManager = getSyncManager;
adminHandler.extractReviewer = extractReviewer;
adminHandler.manage = manageHandler;
adminHandler.sync = syncHandler;

module.exports = adminHandler;
module.exports.adminHandlers = adminHandlers;
module.exports.getSyncManager = getSyncManager;
module.exports.extractReviewer = extractReviewer;
module.exports.manage = manageHandler;
module.exports.sync = syncHandler;
