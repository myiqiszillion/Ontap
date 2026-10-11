/**
 * Question Validator Module (NTMK Rebuild Phase 02)
 * Validates questions against Question Schema V2 standards
 */

const QuestionSchemaV2 = require('./schema.js');

const QuestionValidator = {
  /**
   * Validate a Question object against Schema V2
   * @param {Object} q - Question candidate
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  validate(q) {
    const errors = [];
    const warnings = [];

    if (!q || typeof q !== 'object') {
      return { valid: false, errors: ['Question must be an object'], warnings: [] };
    }

    // 1. Mandatory Identity Fields
    if (!q.id || typeof q.id !== 'string' || q.id.trim() === '') {
      errors.push('Question ID is missing or empty');
    }

    const validFormats = Object.values(QuestionSchemaV2.FORMATS);
    if (!q.format || !validFormats.includes(q.format)) {
      errors.push(`Invalid format "${q.format}". Must be one of: ${validFormats.join(', ')}`);
    }

    if (!['toan','vatli','hoahoc','tienganh'].includes(q.subjectId)) {
      errors.push('Subject ID is missing or invalid');
    }

    if (![10, 11, 12].includes(Number(q.grade))) {
      errors.push('Grade must be 10, 11, or 12');
    }

    const validLevels = Object.values(QuestionSchemaV2.COGNITIVE_LEVELS);
    if (q.cognitiveLevel && !validLevels.includes(q.cognitiveLevel)) {
      errors.push(`Invalid cognitiveLevel "${q.cognitiveLevel}". Must be one of: ${validLevels.join(', ')}`);
    } else if (!q.cognitiveLevel) {
      warnings.push('cognitiveLevel is not specified (defaulting to understand)');
    }

    // 2. Prompt Content Validation
    if (!q.prompt || typeof q.prompt !== 'string' || q.prompt.trim().length < 5) {
      errors.push('Prompt is missing or too short (< 5 characters)');
    } else {
      this._checkXSS(q.prompt, 'prompt', errors);
      this._checkMathDelimiters(q.prompt, 'prompt', errors, warnings);
    }

    if (q.explanation) {
      this._checkXSS(q.explanation, 'explanation', errors);
      this._checkMathDelimiters(q.explanation, 'explanation', errors, warnings);
    }

    // 3. Format-Specific Payload Validation
    if (q.format === QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE) {
      this._validateMCQ(q, errors, warnings);
    } else if (q.format === QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP) {
      this._validateTF(q, errors, warnings);
    } else if (q.format === QuestionSchemaV2.FORMATS.SHORT_ANSWER) {
      this._validateShortAnswer(q, errors, warnings);
    }

    if (q.answerPolicy?.tolerance !== undefined && (!Number.isFinite(q.answerPolicy.tolerance) || q.answerPolicy.tolerance < 0)) errors.push('Invalid answer tolerance');
    if (q.shortAnswerPayload?.tolerance != null && (!Number.isFinite(q.shortAnswerPayload.tolerance) || q.shortAnswerPayload.tolerance < 0)) errors.push('Invalid payload tolerance');
    // 4. Source & Verification Provenance
    if (!q.source || typeof q.source !== 'object') {
      warnings.push('Question source metadata is missing');
    } else {
      if (!q.source.sourceName) {
        warnings.push('Source name is not specified');
      }
      const validVerif = Object.values(QuestionSchemaV2.VERIFICATION_STATUS);
      if (q.source.verificationStatus && !validVerif.includes(q.source.verificationStatus)) {
        errors.push(`Invalid verificationStatus "${q.source.verificationStatus}"`);
      }
      if (q.source.verificationStatus === QuestionSchemaV2.VERIFICATION_STATUS.VERIFIED && !q.source.verifiedBy) {
        warnings.push('Question marked as verified but verifiedBy is missing');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },

  _validateMCQ(q, errors, warnings) {
    const payload = q.mcqPayload;
    if (!payload || typeof payload !== 'object') {
      errors.push('mcqPayload is required for multiple_choice questions');
      return;
    }

    const options = payload.options;
    if (!Array.isArray(options) || options.length < 2) {
      errors.push('mcqPayload.options must be an array with at least 2 options');
      return;
    }

    if (options.length !== 4) {
      warnings.push(`Standard GDPT 2018 MCQ expects 4 options, found ${options.length}`);
    }

    // Check options content and uniqueness
    const seen = new Set();
    options.forEach((opt, idx) => {
      if (typeof opt !== 'string' || opt.trim() === '') {
        errors.push(`Option ${idx} is empty or not a string`);
      } else {
        const norm = opt.trim().toLowerCase();
        if (seen.has(norm)) {
          warnings.push(`Duplicate option text detected: "${opt}"`);
        }
        seen.add(norm);
        this._checkXSS(opt, `option[${idx}]`, errors);
      }
    });

    const correct = payload.correctOptionIndex;
    if (correct === undefined || correct === null || !Number.isInteger(correct) || correct < 0 || correct >= options.length) {
      errors.push(`Invalid correctOptionIndex "${correct}". Must be an integer between 0 and ${options.length - 1}`);
    }
  },

  _validateTF(q, errors, warnings) {
    const payload = q.tfPayload;
    if (!payload || typeof payload !== 'object') {
      errors.push('tfPayload is required for true_false_group questions');
      return;
    }

    const statements = payload.statements;
    if (!Array.isArray(statements) || statements.length === 0) {
      errors.push('tfPayload.statements must be a non-empty array');
      return;
    }

    if (statements.length !== 4) {
      warnings.push(`Standard GDPT 2018 Part II expects 4 statements, found ${statements.length}`);
    }

    statements.forEach((stmt, idx) => {
      if (!stmt || typeof stmt !== 'object') { errors.push('Invalid statement object'); return; }
      const text = stmt.statement || stmt.question;
      if (!text || typeof text !== 'string' || text.trim() === '') {
        errors.push(`Statement ${idx} text is empty or missing`);
      } else {
        this._checkXSS(text, `statement[${idx}]`, errors);
      }

      if (stmt.correct !== true && stmt.correct !== false) {
        errors.push(`Statement ${idx} must have boolean correct property (got ${stmt.correct})`);
      }
    });
  },

  _validateShortAnswer(q, errors, warnings) {
    const payload = q.shortAnswerPayload;
    if (!payload || typeof payload !== 'object') {
      errors.push('shortAnswerPayload is required for short_answer questions');
      return;
    }

    let answers = payload.correctAnswers;
    if (!answers && payload.correctAnswer) {
      answers = [String(payload.correctAnswer)];
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      errors.push('shortAnswerPayload.correctAnswers must be an array with at least 1 valid answer');
      return;
    }

    answers.forEach((ans, idx) => {
      if (typeof ans !== 'string' || ans.trim() === '') {
        errors.push(`correctAnswer[${idx}] is empty or not a string`);
      }
    });
  },

  _checkXSS(str, field, errors) {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /<iframe\b/gi
    ];
    for (const pat of dangerousPatterns) {
      if (pat.test(str)) {
        errors.push(`Security violation: Disallowed script markup detected in ${field}`);
        break;
      }
    }
  },

  _checkMathDelimiters(str, field, errors, warnings) {
    // Check balanced $$ (display math)
    const displayMatches = (str.match(/\$\$/g) || []).length;
    if (displayMatches % 2 !== 0) {
      errors.push(`Unbalanced display math $$ delimiter in ${field}`);
    }

    // Remove $$ first, then check $ (inline math)
    const cleaned = str.replace(/\$\$/g, '');
    const inlineMatches = (cleaned.match(/\$/g) || []).length;
    if (inlineMatches % 2 !== 0) {
      warnings.push(`Potentially unbalanced inline math $ delimiter in ${field}`);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuestionValidator;
}
