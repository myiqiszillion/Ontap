/**
 * Question Normalizer (NTMK Rebuild Phase 02B - Task 4)
 * Standardizes raw extracted question objects into QuestionSchemaV2
 */

const crypto = require('crypto');
const QuestionSchemaV2 = require('../schema.js');

class QuestionNormalizer {
  static SUBJECT_MAP = {
    toan: 'toan',
    math: 'toan',
    mathematics: 'toan',
    toan10: 'toan',
    toan11: 'toan',
    toan12: 'toan',

    vatli: 'vatli',
    vatly: 'vatli',
    physics: 'vatli',
    vatli10: 'vatli',
    vatli11: 'vatli',
    vatli12: 'vatli',

    hoahoc: 'hoahoc',
    hoa: 'hoahoc',
    chemistry: 'hoahoc',
    hoahoc10: 'hoahoc',
    hoahoc11: 'hoahoc',
    hoahoc12: 'hoahoc',

    tienganh: 'tienganh',
    anh: 'tienganh',
    english: 'tienganh',
    tienganh10: 'tienganh',
    tienganh11: 'tienganh',
    tienganh12: 'tienganh'
  };

  static COGNITIVE_MAP = {
    nhan_biet: QuestionSchemaV2.COGNITIVE_LEVELS.RECOGNIZE,
    recognize: QuestionSchemaV2.COGNITIVE_LEVELS.RECOGNIZE,
    recall: QuestionSchemaV2.COGNITIVE_LEVELS.RECOGNIZE,
    remember: QuestionSchemaV2.COGNITIVE_LEVELS.RECOGNIZE,

    thong_hieu: QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
    understand: QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
    comprehend: QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,

    van_dung: QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,
    apply: QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,

    van_dung_cao: QuestionSchemaV2.COGNITIVE_LEVELS.HIGH_APPLY,
    high_apply: QuestionSchemaV2.COGNITIVE_LEVELS.HIGH_APPLY,
    expert: QuestionSchemaV2.COGNITIVE_LEVELS.HIGH_APPLY
  };

  /**
   * Normalize an extracted candidate question
   * @param {Object} candidate - Extracted question
   * @param {Object} fallbackMetadata - Fallback subject, grade, source info
   */
  static normalize(candidate, fallbackMetadata = {}) {
    if (!candidate || typeof candidate !== 'object') {
      throw new Error('Candidate question must be an object');
    }

    const rawSubject = (candidate.subjectId || candidate.subject || candidate.metadata?.subjectId || fallbackMetadata.subjectId || '').toLowerCase();
    const subjectId = this.SUBJECT_MAP[rawSubject] || rawSubject;

    let grade = parseInt(candidate.grade || candidate.metadata?.grade || fallbackMetadata.grade, 10);
    if (![10, 11, 12].includes(grade)) throw new Error('Missing or invalid grade classification');

    const rawLevel = String(candidate.cognitiveLevel || fallbackMetadata.cognitiveLevel || 'understand').toLowerCase();
    const cognitiveLevel = this.COGNITIVE_MAP[rawLevel] || QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND;

    const format = candidate.format || QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE;
    const prompt = (candidate.prompt || '').trim();

    // Compute deterministic ID based on subject, grade, format, and content hash
    const cleanContent = prompt + (candidate.mcqPayload ? candidate.mcqPayload.options.join('') : '');
    const hash = crypto.createHash('sha256').update(cleanContent.toLowerCase().replace(/\s+/g, ' ')).digest('hex').substring(0, 10);
    const id = candidate.id || `${subjectId}${grade}_${format.substring(0, 3)}_${hash}`;

    // Normalize answer policy
    const answerPolicy = {
      ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY,
      ...(candidate.answerPolicy || {})
    };
    if (candidate.shortAnswerPayload && candidate.shortAnswerPayload.tolerance !== null && candidate.shortAnswerPayload.tolerance !== undefined) {
      answerPolicy.tolerance = candidate.shortAnswerPayload.tolerance;
    }
    if (candidate.shortAnswerPayload && candidate.shortAnswerPayload.allowUnitStripping) {
      answerPolicy.allowUnitStripping = true;
    }

    return QuestionSchemaV2.createQuestion({
      id,
      needsReview: candidate.needsReview,
      reviewReasons: candidate.reviewReasons,
      format,
      subjectId,
      grade,
      chapter: candidate.chapter || fallbackMetadata.chapter || '',
      topic: candidate.topic || fallbackMetadata.topic || '',
      cognitiveLevel,
      prompt,
      imageUri: candidate.imageUri || null,
      needsReview: candidate.needsReview || Boolean(candidate.images?.length || candidate.table || candidate.graph || candidate.mathml),
      explanation: candidate.explanation || '',
      mcqPayload: candidate.mcqPayload || null,
      tfPayload: candidate.tfPayload || null,
      shortAnswerPayload: candidate.shortAnswerPayload || null,
      source: {
        sourceName: (candidate.source && candidate.source.sourceName) || fallbackMetadata.sourceName || 'Ingestion Pipeline',
        sourceUrl: (candidate.source && candidate.source.sourceUrl) || fallbackMetadata.sourceUrl || null,
        license: (candidate.source && candidate.source.license) || fallbackMetadata.license || QuestionSchemaV2.LICENSES.EDUCATIONAL_USE,
        retrievedAt: (candidate.source && candidate.source.retrievedAt) || new Date().toISOString(),
        verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED,
        verifiedBy: null
      },
      answerPolicy,
      status: QuestionSchemaV2.PUBLISH_STATUS.REVIEW
    });
  }
}

module.exports = QuestionNormalizer;
