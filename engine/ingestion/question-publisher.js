/**
 * Question Publisher (NTMK Rebuild Phase 02B - Task 5 & 6)
 * Publishes verified questions into persistent storage with audit trails
 */

const QuestionSchemaV2 = require('../schema.js');

class QuestionPublisher {
  constructor(reviewQueue, bankStorage) {
    this.reviewQueue = reviewQueue;
    this.bankStorage = bankStorage;
  }

  /**
   * Publish a verified question
   * @param {string} questionId
   * @param {Object} publisherContext - { publishedBy, notes }
   */
  async publish(questionId, { publishedBy = 'Admin Editorial', notes = '' } = {}) {
    const question = this.reviewQueue.getQuestion(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found in review queue`);
    }

    // Strict Gate: Cannot publish unverified or rejected questions
    if (question.source.verificationStatus !== QuestionSchemaV2.VERIFICATION_STATUS.VERIFIED) {
      throw new Error(`Quality Gate Violation: Question ${questionId} cannot be published because verificationStatus is "${question.source.verificationStatus}". Must be "verified" by an authorized pedagogical auditor.`);
    }

    if (question.needsReview || !question.source.permissionApproved || !question.source.licenseEvidence || !question.source.verificationEvidence) throw new Error('Publication approval evidence missing');
    const validation = require('./content-validator.js').validate(question);
    if (!validation.valid) throw new Error('Invalid content');

    // Save to persistent bank storage
    const publishedRecord = await this.bankStorage.save({
      ...question,
      status: QuestionSchemaV2.PUBLISH_STATUS.PUBLISHED,
      publishedAt: new Date().toISOString(),
      publishedBy
    }, {
      action: 'publish',
      by: publishedBy,
      notes: notes || 'Published to Question Bank V2'
    });

    this.reviewQueue.markPublished(questionId, publishedBy);
    return publishedRecord;
  }

  /**
   * Publish all questions that are in verified status
   */
  async publishAllVerified({ publishedBy = 'Batch Publisher', notes = '' } = {}) {
    const verifiedList = Array.from(this.reviewQueue.items.values()).filter(q => 
      q.source.verificationStatus === QuestionSchemaV2.VERIFICATION_STATUS.VERIFIED &&
      q.status !== QuestionSchemaV2.PUBLISH_STATUS.PUBLISHED
    );

    const published = [];
    for (const q of verifiedList) {
      const res = await this.publish(q.id, { publishedBy, notes });
      published.push(res);
    }

    return {
      totalEligible: verifiedList.length,
      publishedCount: published.length,
      published
    };
  }
}

module.exports = QuestionPublisher;
