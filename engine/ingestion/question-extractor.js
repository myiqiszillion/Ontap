/**
 * Automatic Question Extractor (NTMK Rebuild Phase 02B - Task 4)
 * Extracts Multiple Choice, True/False Groups, Short Answer & Rich Content (LaTeX, Chem, Tables)
 */

class QuestionExtractor {
  /**
   * Extract question from a structured raw text / markdown or JSON record
   * @param {string|Object} rawItem - Raw question text block or raw JSON object
   * @param {Object} metadata - Context metadata (subjectId, grade, sourceId, sourceUrl)
   */
  static extract(rawItem, metadata = {}) {
    if (!rawItem) return null;

    if (typeof rawItem === 'object') {
      return this._extractFromObject(rawItem, metadata);
    } else if (typeof rawItem === 'string') {
      return this._extractFromText(rawItem, metadata);
    }
    return null;
  }

  /**
   * Extraction from raw object (e.g. from JSON API)
   */
  static _extractFromObject(obj, metadata) {
    const format = obj.format || obj.type || 'multiple_choice';
    let needsReview = false;
    const reviewReasons = [];

    // Check prompt
    const prompt = (obj.prompt || obj.question || obj.title || '').trim();
    if (!prompt || prompt.length < 5) {
      needsReview = true;
      reviewReasons.push('Prompt is missing or too short');
    }

    // Check rich content integrity
    const mathIntegrity = this._verifyMathIntegrity(prompt);
    if (!mathIntegrity.valid) {
      needsReview = true;
      reviewReasons.push(...mathIntegrity.errors);
    }

    let extracted = {
      ...obj,
      format,
      prompt,
      explanation: (obj.explanation || obj.solution || '').trim(),
      imageUri: obj.image || obj.imageUri || null,
      metadata: { ...(obj.metadata || {}), ...metadata },
      needsReview,
      reviewReasons
    };

    // Format specific extraction
    if (format === 'multiple_choice' || format === 'mcq') {
      const options = obj.options || (obj.mcqPayload && obj.mcqPayload.options) || [];
      const correctOptionIndex = obj.correctOptionIndex !== undefined 
        ? obj.correctOptionIndex 
        : (obj.mcqPayload && obj.mcqPayload.correctOptionIndex !== undefined ? obj.mcqPayload.correctOptionIndex : obj.correct);

      if (!Array.isArray(options) || options.length < 2) {
        needsReview = true;
        reviewReasons.push('MCQ has less than 2 options');
      }
      if (correctOptionIndex === undefined || correctOptionIndex === null || isNaN(correctOptionIndex)) {
        needsReview = true;
        reviewReasons.push('MCQ missing valid correct option index');
      }

      extracted.format = 'multiple_choice';
      extracted.mcqPayload = {
        options: options.map(o => String(o).trim()),
        correctOptionIndex: correctOptionIndex == null ? null : Number(correctOptionIndex)
      };

    } else if (format === 'true_false_group' || format === 'tf-group') {
      const statements = obj.statements || (obj.tfPayload && obj.tfPayload.statements) || [];
      const passage = obj.passage || obj.tfPayload?.passage || prompt;

      if (!Array.isArray(statements) || statements.length === 0) {
        needsReview = true;
        reviewReasons.push('True/False group has no statements');
      }

      const validStatements = statements.map((s, idx) => {
        const text = s.statement || s.question || '';
        const correct = typeof s.correct === 'boolean' ? s.correct : null;
        if (correct === null) { needsReview = true; reviewReasons.push('Missing explicit statement answer'); }
        if (!text) {
          needsReview = true;
          reviewReasons.push(`Statement ${idx} is empty`);
        }
        return {
          id: s.id || `stmt_${String.fromCharCode(97 + idx)}`,
          statement: text.trim(),
          correct
        };
      });

      extracted.format = 'true_false_group';
      extracted.tfPayload = {
        passage: passage.trim(),
        statements: validStatements
      };

    } else if (format === 'short_answer' || format === 'shortanswer') {
      let correctAnswers = [];
      if (obj.shortAnswerPayload && Array.isArray(obj.shortAnswerPayload.correctAnswers)) {
        correctAnswers = obj.shortAnswerPayload.correctAnswers;
      } else if (obj.correctAnswers && Array.isArray(obj.correctAnswers)) {
        correctAnswers = obj.correctAnswers;
      } else if (obj.correctAnswer !== undefined) {
        correctAnswers = [String(obj.correctAnswer)];
      } else if (obj.correct !== undefined) {
        correctAnswers = [String(obj.correct)];
      }

      if (correctAnswers.length === 0) {
        needsReview = true;
        reviewReasons.push('Short answer question has no answer defined');
      }

      extracted.format = 'short_answer';
      extracted.shortAnswerPayload = {
        correctAnswers: correctAnswers.map(a => String(a).trim()),
        unit: obj.unit || (obj.shortAnswerPayload && obj.shortAnswerPayload.unit) || null,
        tolerance: (obj.tolerance !== undefined) 
          ? obj.tolerance 
          : (obj.shortAnswerPayload && obj.shortAnswerPayload.tolerance !== undefined ? obj.shortAnswerPayload.tolerance : null),
        allowUnitStripping: Boolean(obj.allowUnitStripping || (obj.shortAnswerPayload && obj.shortAnswerPayload.allowUnitStripping))
      };
    }

    extracted.needsReview = needsReview;
    extracted.reviewReasons = reviewReasons;
    return extracted;
  }

  /**
   * Extraction from plain text / markdown block
   */
  static _extractFromText(textBlock, metadata) {
    const trimmed = textBlock.trim();
    if (trimmed.length < 10) return null;

    // 1. Detect True/False group: contains a), b), c), d) AND "Đúng" / "Sai"
    if (/[a-d]\)\s+/i.test(trimmed) && /(?:đúng|sai)/i.test(trimmed)) {
      return this._parseTfGroupFromText(trimmed, metadata);
    }

    // 2. Detect Short Answer: contains "Đáp án:" / "Kết quả:" without A. B. C. D.
    if (/(?:đáp án|kết quả):\s*([^\n]+)/i.test(trimmed) && !/[A-D]\.\s+/i.test(trimmed)) {
      return this._parseShortAnswerFromText(trimmed, metadata);
    }

    // 3. Default MCQ: contains A., B., C., D.
    if (/[A-D]\.\s+/i.test(trimmed)) {
      return this._parseMcqFromText(trimmed, metadata);
    }

    // Fallback: ambiguous or raw unstructured text -> mark for review
    return {
      format: 'multiple_choice',
      prompt: trimmed,
      explanation: '',
      needsReview: true,
      reviewReasons: ['Could not determine question format from text structure'],
      metadata
    };
  }

  static _parseMcqFromText(text, metadata) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let promptLines = [];
    const options = [];
    let correctOptionIndex = null;
    let explanation = '';
    let needsReview = false;
    const reviewReasons = [];

    lines.forEach(line => {
      const optMatch = line.match(/^([A-D])\.\s*(.+)$/i);
      if (optMatch) {
        options['ABCD'.indexOf(optMatch[1].toUpperCase())] = optMatch[2].trim();
      } else if (/^Đáp án(?:\s*chính xác)?:\s*([A-D])/i.test(line)) {
        const char = line.match(/^Đáp án(?:\s*chính xác)?:\s*([A-D])/i)[1].toUpperCase();
        correctOptionIndex = 'ABCD'.indexOf(char);
      } else if (/^Hướng dẫn giải:\s*(.+)/i.test(line)) {
        explanation = line.replace(/^Hướng dẫn giải:\s*/i, '').trim();
      } else if (options.length === 0) {
        const cleanLine = line.replace(/^Câu\s+\d+[:.]\s*/i, '');
        promptLines.push(cleanLine);
      }
    });

    const prompt = promptLines.join(' ').trim();
    if (options.length < 2) {
      needsReview = true;
      reviewReasons.push(`MCQ parsed only ${options.length} options`);
    }
    if (correctOptionIndex === null || correctOptionIndex < 0) {
      needsReview = true;
      reviewReasons.push('Could not detect correct answer in MCQ text');
      correctOptionIndex = null;
    }

    const mathCheck = this._verifyMathIntegrity(prompt);
    if (!mathCheck.valid) {
      needsReview = true;
      reviewReasons.push(...mathCheck.errors);
    }

    return {
      format: 'multiple_choice',
      prompt,
      explanation,
      mcqPayload: {
        options,
        correctOptionIndex
      },
      needsReview,
      reviewReasons,
      metadata
    };
  }

  static _parseTfGroupFromText(text, metadata) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let passageLines = [];
    const statements = [];
    let needsReview = false;
    const reviewReasons = [];

    lines.forEach(line => {
      const stmtMatch = line.match(/^([a-d])\)\s*(.+?)(?:\s*[-–:]\s*(Đúng|Sai))?$/i);
      if (stmtMatch) {
        const hasExplicitAnswer = Boolean(stmtMatch[3]);
        if (!hasExplicitAnswer) {
          needsReview = true;
          reviewReasons.push(`Statement ${stmtMatch[1]} missing explicit True/False answer`);
        }
        const isCorrect = stmtMatch[3] ? stmtMatch[3].toLowerCase() === 'đúng' : null;
        statements.push({
          id: `stmt_${stmtMatch[1].toLowerCase()}`,
          statement: stmtMatch[2].trim(),
          correct: isCorrect
        });
      } else if (statements.length === 0) {
        const cleanLine = line.replace(/^Câu\s+\d+[:.]\s*/i, '');
        passageLines.push(cleanLine);
      }
    });

    const passage = passageLines.join(' ').trim();
    if (statements.length === 0) {
      needsReview = true;
      reviewReasons.push('True/False group has no valid statements');
    }

    return {
      format: 'true_false_group',
      prompt: passage,
      tfPayload: {
        passage,
        statements
      },
      needsReview,
      reviewReasons,
      metadata
    };
  }

  static _parseShortAnswerFromText(text, metadata) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let promptLines = [];
    let correctAnswers = [];
    let unit = null;
    let tolerance = null;
    let needsReview = false;
    const reviewReasons = [];

    lines.forEach(line => {
      const ansMatch = line.match(/^(?:đáp án|kết quả):\s*([^\n]+)/i);
      if (ansMatch) {
        const rawAns = ansMatch[1].trim();
        // Check if answer contains unit specified in parentheses, e.g. "50 (m/s)" or "3,14 (tolerance 0.01)"
        const unitMatch = rawAns.match(/^([^\(]+)(?:\(([^)]+)\))?$/);
        if (unitMatch) {
          correctAnswers.push(unitMatch[1].trim());
          if (unitMatch[2]) {
            const extra = unitMatch[2].trim();
            if (/tolerance\s*([0-9.]+)/i.test(extra)) {
              tolerance = parseFloat(extra.match(/tolerance\s*([0-9.]+)/i)[1]);
            } else {
              unit = extra;
            }
          }
        } else {
          correctAnswers.push(rawAns);
        }
      } else {
        const cleanLine = line.replace(/^Câu\s+\d+[:.]\s*/i, '');
        promptLines.push(cleanLine);
      }
    });

    const prompt = promptLines.join(' ').trim();
    if (correctAnswers.length === 0) {
      needsReview = true;
      reviewReasons.push('Short answer question has no answer line');
    }

    return {
      format: 'short_answer',
      prompt,
      shortAnswerPayload: {
        correctAnswers,
        unit,
        tolerance,
        allowUnitStripping: false
      },
      needsReview,
      reviewReasons,
      metadata
    };
  }

  /**
   * Verify integrity of LaTeX delimiters
   */
  static _verifyMathIntegrity(text) {
    const errors = [];
    if (!text) return { valid: true, errors };

    // Balanced $$ (display math)
    const displayMatches = (text.match(/\$\$/g) || []).length;
    if (displayMatches % 2 !== 0) {
      errors.push('Unbalanced display math $$ delimiter');
    }

    // Balanced $ (inline math)
    const cleaned = text.replace(/\$\$/g, '');
    const inlineMatches = (cleaned.match(/\$/g) || []).length;
    if (inlineMatches % 2 !== 0) {
      errors.push('Unbalanced inline math $ delimiter');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = QuestionExtractor;
