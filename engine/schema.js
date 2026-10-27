/**
 * Question Schema V2 Specification & Taxonomy (NTMK Rebuild Phase 02)
 * Based on docs/rebuild/04-data-model.md & MOET Decision 764/QĐ-BGDĐT
 */

const QuestionSchemaV2 = {
  VERSION: '2.0.0',
  CURRICULUM: 'GDPT2018',

  FORMATS: {
    MULTIPLE_CHOICE: 'multiple_choice',
    TRUE_FALSE_GROUP: 'true_false_group',
    SHORT_ANSWER: 'short_answer'
  },

  COGNITIVE_LEVELS: {
    RECOGNIZE: 'recognize',       // Nhận biết
    UNDERSTAND: 'understand',     // Thông hiểu
    APPLY: 'apply',               // Vận dụng
    HIGH_APPLY: 'high_apply'      // Vận dụng cao
  },

  VERIFICATION_STATUS: {
    VERIFIED: 'verified',
    UNVERIFIED: 'unverified',
    PENDING: 'pending',
    FLAGGED: 'flagged'
  },

  PUBLISH_STATUS: {
    PUBLISHED: 'published',
    REVIEW: 'review',
    NEEDS_REVIEW: 'needs_review',
    ARCHIVED: 'archived'
  },

  LICENSES: {
    OFFICIAL_EDUCATIONAL_REFERENCE: 'official_educational_reference', // Đề tham khảo Bộ GD&ĐT (Sử dụng giáo dục phi thương mại)
    PUBLIC_DOMAIN: 'public_domain',
    CC_BY: 'cc_by',
    CC_BY_SA: 'cc_by_sa',
    EDUCATIONAL_USE: 'educational_use',
    INTERNAL: 'internal'
  },

  DEFAULT_ANSWER_POLICY: {
    caseSensitive: false,
    normalizeSpaces: true,
    allowCommaDecimal: true,
    tolerance: 0,             // Mặc định 0: Tuyệt đối không tự động nới lỏng dung sai khi câu hỏi chưa quy định
    allowUnitStripping: false // Mặc định false: Không tự ý cắt bỏ đơn vị đo lường khi chưa được phép
  },

  /**
   * Sanitize question object for student delivery during test taking.
   * Strips correct answers and explanations to prevent answer leakage in client DOM / network payloads.
   */
  sanitizeForStudent(question, { isExamMode = true } = {}) {
    if (!question || typeof question !== 'object') return null;
    const sanitized = JSON.parse(JSON.stringify(question));

    // 1. MCQ: Remove correct option index
    if (sanitized.mcqPayload) {
      delete sanitized.mcqPayload.correctOptionIndex;
    }
    delete sanitized.correctAnswer;
    delete sanitized.correct;

    // 2. True/False Group: Remove per-statement correctness
    if (sanitized.tfPayload && Array.isArray(sanitized.tfPayload.statements)) {
      sanitized.tfPayload.statements = sanitized.tfPayload.statements.map(stmt => {
        const cleanStmt = { ...stmt };
        delete cleanStmt.correct;
        if (isExamMode) {
          delete cleanStmt.explanation;
        }
        return cleanStmt;
      });
    }

    // 3. Short Answer: Remove correct answers
    if (sanitized.shortAnswerPayload) {
      delete sanitized.shortAnswerPayload.correctAnswers;
      delete sanitized.shortAnswerPayload.correctAnswer;
      delete sanitized.shortAnswerPayload.acceptedAnswers;
    }

    // 4. In active exam mode, remove explanation to prevent cheating
    if (isExamMode) {
      sanitized.explanation = '';
    }

    delete sanitized.rawSource; delete sanitized.provenance; delete sanitized.auditTrail; delete sanitized.auditLog;
    delete sanitized.reviewNotes; delete sanitized.reviewReasons;
    if (sanitized.source) { delete sanitized.source.verificationEvidence; delete sanitized.source.reviewNotes; }
    return sanitized;
  },

  /**
   * Factory function to create a validated Question object template
   */
  createQuestion(props = {}) {
    return {
      needsReview: Boolean(props.needsReview),
      reviewReasons: props.reviewReasons || [],
      id: props.id || '',
      format: props.format || QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
      subjectId: props.subjectId || 'toan',
      grade: props.grade || 10,
      curriculumVersion: QuestionSchemaV2.CURRICULUM,
      chapter: props.chapter || '',
      topic: props.topic || '',
      cognitiveLevel: props.cognitiveLevel || QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
      prompt: props.prompt || '',
      imageUri: props.imageUri || null,
      explanation: props.explanation || '',
      mcqPayload: props.mcqPayload || null,
      tfPayload: props.tfPayload || null,
      shortAnswerPayload: props.shortAnswerPayload || null,
      source: {
        sourceName: (props.source && props.source.sourceName) || 'Internal Editorial',
        sourceUrl: (props.source && props.source.sourceUrl) || null,
        license: (props.source && props.source.license) || QuestionSchemaV2.LICENSES.EDUCATIONAL_USE,
        retrievedAt: (props.source && props.source.retrievedAt) || new Date().toISOString(),
        verificationStatus: (props.source && props.source.verificationStatus) || QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED,
        verifiedBy: (props.source && props.source.verifiedBy) || null
      },
      answerPolicy: {
        ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY,
        ...(props.answerPolicy || {})
      },
      status: props.status || QuestionSchemaV2.PUBLISH_STATUS.REVIEW,
      createdAt: props.createdAt || new Date().toISOString(),
      updatedAt: props.updatedAt || new Date().toISOString()
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuestionSchemaV2;
}
