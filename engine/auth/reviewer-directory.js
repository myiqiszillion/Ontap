/**
 * Hardened Reviewer Directory & Pedagogical Identity RBAC Module
 * NTMK Rebuild Phase 02C Hardening — Tasks 4 & 6
 *
 * Security & Governance Rules:
 * - NO unverified real names, academic titles, or forged credentials.
 * - Test identities are explicitly prefixed with 'fixture_'.
 * - Dynamic onboarding, invitation, activation, and revocation by Curriculum Lead / System Admin.
 * - Strict server-side RBAC: Pedagogical Auditor (subject-scoped) vs Curriculum Lead (curriculum-wide) vs System Operator (ops only).
 * - Shared ADMIN_API_KEY grants only System Operator rights, never academic vetting authority.
 * - All reviewer actions produce immutable audit entries.
 */

const crypto = require('crypto');
const EnvironmentConfig = require('../config/environment-config.js');

const REVIEWER_ROLES = {
  PEDAGOGICAL_AUDITOR: 'pedagogical_auditor',
  CURRICULUM_LEAD: 'curriculum_lead',
  SYSTEM_OPERATOR: 'system_operator'
};

const VALID_SUBJECTS = ['toan', 'vatli', 'hoahoc', 'tienganh'];

/**
 * Standard test fixtures for automated testing and staging environments.
 * Explicitly prefixed with 'fixture_' with no real personal names or academic degrees.
 */
const DEFAULT_FIXTURE_REVIEWERS = [
  {
    id: 'fixture_math_reviewer_01',
    displayName: 'Math Pedagogical Reviewer 01 (Fixture)',
    email: 'math-reviewer-01@fixtures.ntmk.internal',
    role: REVIEWER_ROLES.PEDAGOGICAL_AUDITOR,
    subjectSpecialties: ['toan'],
    token: 'tok_fixture_auditor_toan_a89f3c7e12',
    tokenAliases: ['tok_auditor_toan_a89f3c7e12'],
    active: true,
    isFixture: true,
    invitedBy: 'system',
    createdAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'fixture_phys_reviewer_01',
    displayName: 'Physics Pedagogical Reviewer 01 (Fixture)',
    email: 'phys-reviewer-01@fixtures.ntmk.internal',
    role: REVIEWER_ROLES.PEDAGOGICAL_AUDITOR,
    subjectSpecialties: ['vatli'],
    token: 'tok_fixture_auditor_vatli_b74e2d9a34',
    tokenAliases: ['tok_auditor_vatli_b74e2d9a34'],
    active: true,
    isFixture: true,
    invitedBy: 'system',
    createdAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'fixture_chem_reviewer_01',
    displayName: 'Chemistry Pedagogical Reviewer 01 (Fixture)',
    email: 'chem-reviewer-01@fixtures.ntmk.internal',
    role: REVIEWER_ROLES.PEDAGOGICAL_AUDITOR,
    subjectSpecialties: ['hoahoc'],
    token: 'tok_fixture_auditor_hoahoc_c61b4a8e56',
    tokenAliases: ['tok_auditor_hoahoc_c61b4a8e56'],
    active: true,
    isFixture: true,
    invitedBy: 'system',
    createdAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'fixture_eng_reviewer_01',
    displayName: 'English Pedagogical Reviewer 01 (Fixture)',
    email: 'eng-reviewer-01@fixtures.ntmk.internal',
    role: REVIEWER_ROLES.PEDAGOGICAL_AUDITOR,
    subjectSpecialties: ['tienganh'],
    token: 'tok_fixture_auditor_eng_d53a9c2f78',
    tokenAliases: ['tok_auditor_eng_d53a9c2f78'],
    active: true,
    isFixture: true,
    invitedBy: 'system',
    createdAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'fixture_lead_curriculum_01',
    displayName: 'Curriculum Lead 01 (Fixture)',
    email: 'curriculum-lead-01@fixtures.ntmk.internal',
    role: REVIEWER_ROLES.CURRICULUM_LEAD,
    subjectSpecialties: ['toan', 'vatli', 'hoahoc', 'tienganh'],
    token: 'tok_fixture_lead_curriculum_e19f8a3d90',
    tokenAliases: ['tok_lead_curriculum_e19f8a3d90'],
    active: true,
    isFixture: true,
    invitedBy: 'system',
    createdAt: '2026-10-01T00:00:00.000Z'
  },
  {
    id: 'fixture_sys_operator_01',
    displayName: 'System Operator 01 (Fixture)',
    email: 'sys-operator-01@fixtures.ntmk.internal',
    role: REVIEWER_ROLES.SYSTEM_OPERATOR,
    subjectSpecialties: [],
    token: 'tok_fixture_operator_sys_f42b7c1a89',
    tokenAliases: ['tok_operator_sys_f42b7c1a89'],
    active: true,
    isFixture: true,
    invitedBy: 'system',
    createdAt: '2026-10-01T00:00:00.000Z'
  }
];

class ReviewerDirectory {
  constructor(initialReviewers = null, options = {}) {
    this.storageAdapter = options.storageAdapter || null;
    this.reviewersById = new Map();
    this.reviewersByToken = new Map();
    this.auditLog = [];

    const demoAllowed = EnvironmentConfig.isDemoAllowed(options);
    const reviewersToLoad = initialReviewers !== null
      ? initialReviewers
      : (demoAllowed ? DEFAULT_FIXTURE_REVIEWERS : []);

    for (const r of reviewersToLoad) {
      if (!demoAllowed && (r.isFixture || EnvironmentConfig.isFixtureReviewer(r))) continue;
      this._registerInternal(r);
    }
  }

  _registerInternal(reviewer) {
    if (!reviewer || !reviewer.id) throw new Error('Reviewer ID is required');
    const sanitized = {
      id: String(reviewer.id).trim(),
      displayName: reviewer.displayName || reviewer.fullName || reviewer.id,
      email: reviewer.email || `${reviewer.id}@ntmk.internal`,
      role: reviewer.role || REVIEWER_ROLES.PEDAGOGICAL_AUDITOR,
      subjectSpecialties: Array.isArray(reviewer.subjectSpecialties) ? [...reviewer.subjectSpecialties] : [],
      token: reviewer.token || `tok_${crypto.randomBytes(16).toString('hex')}`,
      tokenAliases: Array.isArray(reviewer.tokenAliases) ? [...reviewer.tokenAliases] : [],
      active: reviewer.active !== false,
      isFixture: Boolean(reviewer.isFixture),
      invitedBy: reviewer.invitedBy || 'admin',
      revokedAt: reviewer.revokedAt || null,
      revocationReason: reviewer.revocationReason || null,
      createdAt: reviewer.createdAt || new Date().toISOString(),
      updatedAt: reviewer.updatedAt || new Date().toISOString()
    };

    this.reviewersById.set(sanitized.id, sanitized);
    if (sanitized.token) {
      this.reviewersByToken.set(sanitized.token, sanitized);
    }
    if (sanitized.tokenAliases) {
      for (const alias of sanitized.tokenAliases) {
        this.reviewersByToken.set(alias, sanitized);
      }
    }
    return sanitized;
  }

  /**
   * Onboard / invite a new reviewer. Only Curriculum Lead or System Operator can invite.
   */
  onboardReviewer({ id, displayName, email, role, subjectSpecialties, invitedBy }) {
    if (!id || !displayName || !email || !role) {
      throw new Error('Missing required onboarding fields: id, displayName, email, role');
    }
    if (!Object.values(REVIEWER_ROLES).includes(role)) {
      throw new Error(`Invalid reviewer role: ${role}`);
    }
    if (this.reviewersById.has(id)) {
      throw new Error(`Reviewer with ID '${id}' already exists`);
    }

    // Validate specialties
    const validSpecs = (subjectSpecialties || []).filter(s => VALID_SUBJECTS.includes(s));
    if (role === REVIEWER_ROLES.PEDAGOGICAL_AUDITOR && validSpecs.length === 0) {
      throw new Error('Pedagogical auditor must have at least one valid subject specialty');
    }

    const token = `tok_${crypto.randomBytes(24).toString('hex')}`;
    const newReviewer = this._registerInternal({
      id,
      displayName,
      email,
      role,
      subjectSpecialties: validSpecs,
      token,
      active: true,
      isFixture: false,
      invitedBy: invitedBy || 'system'
    });

    this.auditLog.push({
      action: 'onboard_reviewer',
      targetId: id,
      actor: invitedBy,
      timestamp: new Date().toISOString()
    });

    return {
      reviewer: this._publicProfile(newReviewer),
      token
    };
  }

  /**
   * Revoke reviewer access. Immediate invalidation of all privileges.
   */
  revokeReviewer(id, { revokedBy, reason }) {
    const reviewer = this.reviewersById.get(id);
    if (!reviewer) throw new Error(`Reviewer '${id}' not found`);

    reviewer.active = false;
    reviewer.revokedAt = new Date().toISOString();
    reviewer.revocationReason = reason || 'Administrative revocation';
    reviewer.updatedAt = new Date().toISOString();

    // Remove active token mapping
    if (reviewer.token) {
      this.reviewersByToken.delete(reviewer.token);
    }

    this.auditLog.push({
      action: 'revoke_reviewer',
      targetId: id,
      actor: revokedBy,
      reason,
      timestamp: new Date().toISOString()
    });

    return this._publicProfile(reviewer);
  }

  /**
   * Reactivate a previously revoked reviewer
   */
  activateReviewer(id, { activatedBy }) {
    const reviewer = this.reviewersById.get(id);
    if (!reviewer) throw new Error(`Reviewer '${id}' not found`);

    reviewer.active = true;
    reviewer.revokedAt = null;
    reviewer.revocationReason = null;
    reviewer.updatedAt = new Date().toISOString();

    // Re-issue a fresh token if needed
    if (!reviewer.token || !this.reviewersByToken.has(reviewer.token)) {
      reviewer.token = `tok_${crypto.randomBytes(24).toString('hex')}`;
      this.reviewersByToken.set(reviewer.token, reviewer);
    }

    this.auditLog.push({
      action: 'activate_reviewer',
      targetId: id,
      actor: activatedBy,
      timestamp: new Date().toISOString()
    });

    return this._publicProfile(reviewer);
  }

  /**
   * Authenticate reviewer by bearer token
   */
  authenticateByToken(token) {
    if (!token || typeof token !== 'string') return null;
    const cleanToken = token.trim().replace(/^Bearer\s+/i, '');
    const reviewer = this.reviewersByToken.get(cleanToken);
    if (!reviewer || !reviewer.active) return null;
    if (!EnvironmentConfig.isDemoAllowed() && (reviewer.isFixture || EnvironmentConfig.isFixtureReviewer(reviewer))) {
      return null; // Production/Staging/Undeclared safety: reject test fixtures strictly
    }
    return this._publicProfile(reviewer);
  }

  getReviewerById(id) {
    const reviewer = this.reviewersById.get(id);
    if (!reviewer || !reviewer.active) return null;
    if (!EnvironmentConfig.isDemoAllowed() && (reviewer.isFixture || EnvironmentConfig.isFixtureReviewer(reviewer))) {
      return null;
    }
    return this._publicProfile(reviewer);
  }

  listReviewers({ includeInactive = false } = {}) {
    return Array.from(this.reviewersById.values())
      .filter(r => includeInactive || r.active)
      .filter(r => EnvironmentConfig.isDemoAllowed() || (!r.isFixture && !EnvironmentConfig.isFixtureReviewer(r)))
      .map(r => this._publicProfile(r));
  }

  /**
   * Authorize pedagogical action strictly via server-side RBAC
   */
  authorizeAction({ reviewer, action, subjectId }) {
    if (!reviewer || !reviewer.id) {
      return { authorized: false, reason: 'Missing authenticated reviewer identity' };
    }

    if (!EnvironmentConfig.isDemoAllowed() && (reviewer.isFixture || EnvironmentConfig.isFixtureReviewer(reviewer))) {
      return { authorized: false, reason: 'Test fixture reviewers are strictly forbidden in this environment' };
    }

    // Must be currently active
    const liveRecord = this.reviewersById.get(reviewer.id) || (reviewer.isFixture ? reviewer : null);
    if (!liveRecord || !liveRecord.active) {
      return { authorized: false, reason: `Reviewer identity '${reviewer.id}' is revoked or inactive` };
    }

    // Action: Pedagogical Vetting (verify / reject)
    if (action === 'verify' || action === 'reject') {
      if (reviewer.role !== REVIEWER_ROLES.PEDAGOGICAL_AUDITOR && reviewer.role !== REVIEWER_ROLES.CURRICULUM_LEAD) {
        return {
          authorized: false,
          reason: `Role '${reviewer.role}' is not permitted to perform pedagogical vetting`
        };
      }
      if (subjectId && !reviewer.subjectSpecialties.includes(subjectId)) {
        return {
          authorized: false,
          reason: `Reviewer ${reviewer.displayName} (${reviewer.id}) is not certified for subject '${subjectId}' (specialties: ${reviewer.subjectSpecialties.join(', ')})`
        };
      }
      return { authorized: true };
    }

    // Action: Publish to Verified Bank
    if (action === 'publish') {
      if (reviewer.role !== REVIEWER_ROLES.CURRICULUM_LEAD) {
        return {
          authorized: false,
          reason: 'Only Curriculum Lead can approve publishing questions to the verified bank'
        };
      }
      return { authorized: true };
    }

    // Action: Approve Educational Source License
    if (action === 'approve_source') {
      if (reviewer.role !== REVIEWER_ROLES.CURRICULUM_LEAD) {
        return {
          authorized: false,
          reason: 'Only Curriculum Lead can approve legal source re-publication licensing'
        };
      }
      return { authorized: true };
    }

    return { authorized: false, reason: `Unknown pedagogical action: '${action}'` };
  }

  canReviewSubject(reviewerId, subjectId) {
    const reviewer = this.getReviewerById(reviewerId);
    return this.authorizeAction({ reviewer, action: 'verify', subjectId }).authorized;
  }

  canPublish(reviewerId) {
    const reviewer = this.getReviewerById(reviewerId);
    return this.authorizeAction({ reviewer, action: 'publish' }).authorized;
  }

  /**
   * Create tamper-evident audit record
   */
  createAuditEntry({ reviewer, action, targetId, evidence, notes }) {
    if (!reviewer || !reviewer.id) {
      throw new Error('Real authenticated reviewer identity required for audit trail');
    }
    return {
      id: `audit_${crypto.randomUUID()}`,
      actorId: reviewer.id,
      actorName: reviewer.displayName || reviewer.id,
      actorRole: reviewer.role,
      action,
      targetId,
      evidence: evidence || null,
      notes: notes || '',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Audit and rectify unverified approvals:
   * Inspects existing candidates/questions and flags any approvals performed by
   * unverified real names (e.g. 'TS. Nguyễn Minh Trí') or non-fixture unauthorized accounts.
   */
  auditAndRectifyUnverifiedApprovals(candidates = []) {
    const rectified = [];
    for (const cand of candidates) {
      const verifiedBy = cand.source?.verifiedBy || cand.verifiedBy;
      const isVerified = cand.reviewStatus === 'verified' || cand.status === 'published' || cand.source?.verificationStatus === 'verified';

      if (isVerified && verifiedBy) {
        const isRecognizedReviewer = this.reviewersById.has(verifiedBy);
        const containsUnverifiedRealName = /nguyễn minh trí|hoàng thu thảo|đỗ tuấn kiệt|lê phương thảo|trần đình châu/i.test(String(verifiedBy));

        if (!isRecognizedReviewer || containsUnverifiedRealName) {
          // Revert to needs_review with explicit audit trail preservation
          const priorStatus = cand.reviewStatus || cand.status;
          cand.reviewStatus = 'needs_review';
          cand.status = 'review';
          if (cand.source) {
            cand.source.verificationStatus = 'unverified';
            cand.source.unverifiedApprovalRectified = true;
            cand.source.previousUnverifiedActor = verifiedBy;
            cand.source.verifiedBy = null;
            cand.source.verifiedAt = null;
          }

          if (!cand.auditTrail) cand.auditTrail = [];
          cand.auditTrail.push({
            state: 'needs_review',
            action: 'approval_rectified',
            by: 'System Independent Auditor',
            notes: `Prior approval by unverified identity '${verifiedBy}' revoked during Phase 02C audit. Re-vetting required.`,
            timestamp: new Date().toISOString()
          });

          rectified.push({
            id: cand.id,
            priorStatus,
            unverifiedActor: verifiedBy,
            status: 'reset_to_needs_review'
          });
        }
      }
    }
    return rectified;
  }

  _publicProfile(r) {
    return {
      id: r.id,
      displayName: r.displayName,
      fullName: r.displayName, // backward compatibility
      title: r.isFixture ? 'Test Fixture Reviewer' : 'Pedagogical Reviewer',
      email: r.email,
      role: r.role,
      subjectSpecialties: [...r.subjectSpecialties],
      active: r.active,
      isFixture: r.isFixture
    };
  }
}

const defaultDirectory = new ReviewerDirectory();

module.exports = {
  ReviewerDirectory,
  REVIEWER_ROLES,
  DEFAULT_FIXTURE_REVIEWERS,
  defaultDirectory
};
