/**
 * Enhanced Review Queue & Pedagogical Verification Gate (NTMK Rebuild Phase 02B - Task 5)
 * Lifecycle: discovered -> extracted -> normalized -> needs_review -> verified -> rejected -> published
 */

const QuestionSchemaV2 = require('../schema.js');

class ReviewQueue {
  constructor(stateStore = null, options = {}) {
    this.stateStore = stateStore;
    this.storageAdapter = options.storageAdapter || null;
    let initialItems = [];
    if (this.storageAdapter && this.storageAdapter.tables) {
      initialItems = Array.from(this.storageAdapter.tables.ntmk_review_candidates.values());
    } else if (stateStore) {
      initialItems = stateStore.read([]);
    }
    this.items = new Map(initialItems.map(q => [q.id, q]));
  }

  /**
   * Enqueue candidate question into review queue
   */
  enqueue(question, provenance = {}) {
    if (!question || !question.id) {
      throw new Error('Valid question with ID is required');
    }

    const needsReview = Boolean(question.needsReview || provenance.needsReview);
    const initialStatus = 'needs_review';

    const entry = {
      ...question,
      rawSource: provenance.rawSource || null,
      fingerprint: provenance.rawHash || null,
      version: 1,
      status: initialStatus,
      reviewStatus: initialStatus,
      source: {
        ...(question.source || {}),
        licenseEvidence: provenance.licenseEvidence || null,
        permissionApproved: provenance.permissionApproved === true,
        sourceId: provenance.sourceId || (question.source && question.source.sourceId) || 'unknown_source',
        sourceName: provenance.sourceName || (question.source && question.source.sourceName) || 'Unknown Source',
        sourceUrl: provenance.sourceUrl || (question.source && question.source.sourceUrl) || null,
        license: provenance.license || (question.source && question.source.license) || QuestionSchemaV2.LICENSES.EDUCATIONAL_USE,
        verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED,
        retrievedAt: (question.source && question.source.retrievedAt) || new Date().toISOString(),
        verifiedBy: null,
        verifiedAt: null
      },
      provenance: {
        sourceId: provenance.sourceId || 'unknown_source',
        sourceName: provenance.sourceName || 'Unknown',
        sourceUrl: provenance.sourceUrl || null,
        importedAt: new Date().toISOString(),
        rawHash: provenance.rawHash || null,
        parserVersion: provenance.parserVersion || '2.0.0',
        importBatchId: provenance.importBatchId || `batch_${Date.now()}`
      },
      reviewNotes: [],
      auditTrail: [
        {
          state: 'enqueued',
          timestamp: new Date().toISOString(),
          by: 'Ingestion Pipeline',
          notes: needsReview ? `Flagged for review: ${(question.reviewReasons || []).join('; ')}` : 'Enqueued for pedagogical vetting'
        }
      ]
    };

    this.items.set(question.id, entry);
    if (this.storageAdapter && typeof this.storageAdapter.saveReviewCandidate === 'function') {
      this.storageAdapter.saveReviewCandidate(entry);
    }
    this.persist();
    return entry;
  }

  persist() { if (this.stateStore) this.stateStore.write(Array.from(this.items.values())); }

  getQuestion(questionId) {
    return this.items.get(questionId) || null;
  }

  /**
   * List pending questions awaiting pedagogical review
   */
  getPendingQuestions(filter = {}) {
    let list = Array.from(this.items.values()).filter(q => filter.includeReviewed || 
      q.reviewStatus !== 'rejected' && (q.source.verificationStatus === QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED ||
      q.reviewStatus === 'needs_review' ||
      q.status === QuestionSchemaV2.PUBLISH_STATUS.REVIEW)
    );

    if (filter.subjectId) {
      list = list.filter(q => q.subjectId === filter.subjectId);
    }
    if (filter.grade) {
      list = list.filter(q => Number(q.grade) === Number(filter.grade));
    }
    if (filter.needsReviewOnly) {
      list = list.filter(q => q.reviewStatus === 'needs_review');
    }

    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    return {
      total: list.length,
      items: list.slice(offset, offset + limit)
    };
  }

  /**
   * Verify question by authorized pedagogical auditor
   */
  verifyQuestion(questionId, { verifiedBy, notes = '', authorized = false, evidence = '' } = {}) {
    const q = this.items.get(questionId);
    if (!q) throw new Error(`Question ${questionId} not found in review queue`);

    if (!verifiedBy || typeof verifiedBy !== 'string' || verifiedBy.trim() === '') {
      throw new Error('Pedagogical auditor signature (verifiedBy) is mandatory to verify a question');
    }

    if (!authorized || !evidence.trim()) throw new Error('Authorized reviewer and verification evidence required');
    if (q.reviewStatus === 'rejected' || q.needsReview || !q.topic) throw new Error('Resolve review defects before verification');
    const validation = require('./content-validator.js').validate(q);
    if (!validation.valid) throw new Error('Invalid content: ' + validation.errors.join('; '));
    
    // Validate re-publication license evidence
    const SourceRegistry = require('./source-registry.js');
    if (!q.source.permissionApproved || !SourceRegistry.validateLicenseEvidence(q.source.licenseEvidence)) {
      throw new Error('Source permission not approved: missing valid legal re-publication license evidence');
    }
    q.source.verificationEvidence = evidence;
    q.source.verificationStatus = QuestionSchemaV2.VERIFICATION_STATUS.VERIFIED;
    q.source.verifiedBy = verifiedBy.trim();
    q.source.verifiedAt = new Date().toISOString();
    q.source.reviewNotes = notes;
    q.reviewStatus = 'verified';
    q.status = 'verified';
    q.updatedAt = new Date().toISOString();

    q.auditTrail.push({
      state: 'verified',
      timestamp: q.source.verifiedAt,
      by: verifiedBy.trim(),
      notes: notes || 'Verified pedagogical correctness and answer accuracy'
    });

    if (this.storageAdapter && typeof this.storageAdapter.recordAudit === 'function') {
      this.storageAdapter.recordAudit({
        questionId,
        actorId: verifiedBy.trim(),
        action: 'verify',
        evidence,
        notes
      });
      if (typeof this.storageAdapter.saveReviewCandidate === 'function') {
        this.storageAdapter.saveReviewCandidate(q);
      }
    }

    this.persist();
    return q;
  }

  /**
   * Reject / flag question for curriculum or formatting violation
   */
  rejectQuestion(questionId, { rejectedBy, reason = '' } = {}) {
    const q = this.items.get(questionId);
    if (!q) throw new Error(`Question ${questionId} not found in review queue`);

    q.source.verificationStatus = QuestionSchemaV2.VERIFICATION_STATUS.FLAGGED;
    q.source.flaggedBy = (rejectedBy || 'Quality Gate').trim();
    q.source.flagReason = reason;
    q.reviewStatus = 'rejected';
    q.status = QuestionSchemaV2.PUBLISH_STATUS.ARCHIVED;
    q.updatedAt = new Date().toISOString();

    q.auditTrail.push({
      state: 'rejected',
      timestamp: new Date().toISOString(),
      by: q.source.flaggedBy,
      notes: reason || 'Rejected due to pedagogical or technical deficiency'
    });

    return q;
  }

  /**
   * Mark as published after approval
   */
  markPublished(questionId, publisherName = 'QuestionPublisher') {
    const q = this.items.get(questionId);
    if (!q) throw new Error(`Question ${questionId} not found in review queue`);

    if (q.source.verificationStatus !== QuestionSchemaV2.VERIFICATION_STATUS.VERIFIED) {
      throw new Error(`Cannot publish question ${questionId}: Must be verified by pedagogical auditor first.`);
    }

    q.status = QuestionSchemaV2.PUBLISH_STATUS.PUBLISHED;
    q.reviewStatus = 'published';
    q.publishedAt = new Date().toISOString();
    q.publishedBy = publisherName;

    q.auditTrail.push({
      state: 'published',
      timestamp: q.publishedAt,
      by: publisherName,
      notes: 'Published to official question bank'
    });

    return q;
  }

  getStats() {
    let unverified = 0;
    let needsReview = 0;
    let verified = 0;
    let rejected = 0;
    let published = 0;

    for (const q of this.items.values()) {
      if (q.reviewStatus === 'needs_review') needsReview++;
      else if (q.reviewStatus === 'verified') verified++;
      else if (q.reviewStatus === 'rejected') rejected++;
      else if (q.reviewStatus === 'published' || q.status === QuestionSchemaV2.PUBLISH_STATUS.PUBLISHED) published++;
      else unverified++;
    }

    return {
      total: this.items.size,
      unverified,
      needsReview,
      verified,
      rejected,
      published
    };
  }
}

module.exports = ReviewQueue;
