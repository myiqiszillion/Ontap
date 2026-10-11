/**
 * Automatic Question Ingestion Pipeline MVP (NTMK Rebuild Phase 02)
 * Orchestrates: Adapter -> Parser -> Normalizer -> Quality Validator -> Deduplicator -> Review Queue
 */

const crypto = require('crypto');
const QuestionSchemaV2 = require('../schema.js');
const QuestionValidator = require('./content-validator.js');
const SourceRegistry = require('./source-registry.js');

class IngestionPipeline {
  constructor(reviewQueue) {
    this.reviewQueue = reviewQueue;
    this.seenHashes = new Set(Array.from(reviewQueue?.items.values() || []).map(q=>q.provenance?.rawHash).filter(Boolean));
  }

  /**
   * Compute normalized content hash for deduplication
   */
  computeHash(text) {
    const clean = String(text)
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    return crypto.createHash('sha256').update(clean).digest('hex');
  }

  /**
   * Parse structured Markdown or plain text block into candidate questions
   * @param {string} text - Raw text block
   * @param {Object} metadata - Subject, Grade, SourceId
   */
  parseMarkdownBlock(text, metadata = {}) {
    const candidates = [];
    // Split by "Câu [0-9]+" or double newline separators
    const blocks = text.split(/(?=^Câu\s+\d+[:.])/mi).filter(b => b.trim().length > 10);

    blocks.forEach((block, idx) => {
      const trimmed = block.trim();

      // Check if it's a True/False statement group
      if (/[a-d]\)\s+/i.test(trimmed) && /(đúng|sai)/i.test(trimmed)) {
        const tfQuestion = this._parseTfGroup(trimmed, idx, metadata);
        if (tfQuestion) candidates.push(tfQuestion);
      }
      // Check if it's Short Answer (has "Đáp án:" or "Kết quả:")
      else if (/(?:đáp án|kết quả):\s*([^\n]+)/i.test(trimmed) && !/[A-D]\.\s+/i.test(trimmed)) {
        const saQuestion = this._parseShortAnswer(trimmed, idx, metadata);
        if (saQuestion) candidates.push(saQuestion);
      }
      // Default / MCQ: has A., B., C., D.
      else if (/[A-D]\.\s+/i.test(trimmed)) {
        const mcqQuestion = this._parseMcq(trimmed, idx, metadata);
        if (mcqQuestion) candidates.push(mcqQuestion);
      }
    });

    return candidates;
  }

  _parseMcq(block, index, metadata) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let promptLines = [];
    const options = [];
    let correctOptionIndex = null;
    let explanation = '';

    lines.forEach(line => {
      const optMatch = line.match(/^([A-D])\.\s*(.+)$/i);
      if (optMatch) {
        options['ABCD'.indexOf(optMatch[1].toUpperCase())] = optMatch[2].trim();
      } else if (/^Đáp án(?:\s*chính xác)?:\s*([A-D])/i.test(line)) {
        const ansChar = line.match(/^Đáp án(?:\s*chính xác)?:\s*([A-D])/i)[1].toUpperCase();
        correctOptionIndex = 'ABCD'.indexOf(ansChar);
      } else if (/^Hướng dẫn giải:\s*(.+)/i.test(line)) {
        explanation = line.replace(/^Hướng dẫn giải:\s*/i, '').trim();
      } else if (options.length === 0) {
        // Strip leading "Câu X:"
        const cleanLine = line.replace(/^Câu\s+\d+[:.]\s*/i, '');
        promptLines.push(cleanLine);
      }
    });

    if (options.length < 2) return null;

    const prompt = promptLines.join(' ');
    const hash = this.computeHash(prompt + options.join(''));
    const id = `${metadata.subjectId || 'q'}_${metadata.grade || 10}_mcq_${hash.substring(0, 8)}`;

    return QuestionSchemaV2.createQuestion({
      id,
      format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
      subjectId: metadata.subjectId || 'toan',
      grade: metadata.grade || 10,
      prompt,
      explanation,
      mcqPayload: {
        options,
        correctOptionIndex
      },
      source: {
        sourceName: metadata.sourceName || 'Ingestion Pipeline',
        sourceUrl: metadata.sourceUrl || null,
        license: metadata.license || QuestionSchemaV2.LICENSES.EDUCATIONAL_USE,
        verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED
      }
    });
  }

  _parseTfGroup(block, index, metadata) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let passageLines = [];
    const statements = [];

    lines.forEach(line => {
      const stmtMatch = line.match(/^([a-d])\)\s*(.+?)(?:\s*[-–]\s*(Đúng|Sai))?$/i);
      if (stmtMatch) {
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

    if (statements.length === 0) return null;

    const passage = passageLines.join(' ');
    const hash = this.computeHash(passage + statements.map(s => s.statement).join(''));
    const id = `${metadata.subjectId || 'q'}_${metadata.grade || 10}_tf_${hash.substring(0, 8)}`;

    return QuestionSchemaV2.createQuestion({
      id,
      format: QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP,
      subjectId: metadata.subjectId || 'toan',
      grade: metadata.grade || 10,
      prompt: passage,
      tfPayload: {
        passage,
        statements
      },
      source: {
        sourceName: metadata.sourceName || 'Ingestion Pipeline',
        sourceUrl: metadata.sourceUrl || null,
        license: metadata.license || QuestionSchemaV2.LICENSES.EDUCATIONAL_USE,
        verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED
      }
    });
  }

  _parseShortAnswer(block, index, metadata) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    let promptLines = [];
    let correctAnswers = [];

    lines.forEach(line => {
      const ansMatch = line.match(/^(?:đáp án|kết quả):\s*([^\n]+)/i);
      if (ansMatch) {
        correctAnswers.push(ansMatch[1].trim());
      } else {
        const cleanLine = line.replace(/^Câu\s+\d+[:.]\s*/i, '');
        promptLines.push(cleanLine);
      }
    });

    if (correctAnswers.length === 0) return null;

    const prompt = promptLines.join(' ');
    const hash = this.computeHash(prompt + correctAnswers.join(''));
    const id = `${metadata.subjectId || 'q'}_${metadata.grade || 10}_sa_${hash.substring(0, 8)}`;

    return QuestionSchemaV2.createQuestion({
      id,
      format: QuestionSchemaV2.FORMATS.SHORT_ANSWER,
      subjectId: metadata.subjectId || 'toan',
      grade: metadata.grade || 10,
      prompt,
      shortAnswerPayload: {
        correctAnswers
      },
      source: {
        sourceName: metadata.sourceName || 'Ingestion Pipeline',
        sourceUrl: metadata.sourceUrl || null,
        license: metadata.license || QuestionSchemaV2.LICENSES.EDUCATIONAL_USE,
        verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED
      }
    });
  }

  /**
   * Process and ingest candidate questions
   * @param {Array<Object>} candidates - Normalized or parsed questions
   * @param {Object} sourceInfo - Source metadata
   */
  ingest(candidates, sourceInfo = {}) {
    const results = {
      totalInput: candidates.length,
      ingested: 0,
      duplicates: 0,
      invalid: 0,
      errors: []
    };

    if (!SourceRegistry.isCompliant(sourceInfo.sourceId)) { results.invalid = candidates.length; results.errors.push({errors:['Source permission not approved']}); return results; }
    candidates.forEach((cand, idx) => {
      // 1. Quality Validation
      const validation = QuestionValidator.validate(cand);
      if (!validation.valid) {
        results.invalid++;
        results.errors.push({ id: cand?.id || `candidate_${idx}`, errors: validation.errors });
        return;
      }

      // 2. Deduplication check
      const hash = this.computeHash(JSON.stringify([cand.subjectId,cand.grade,cand.format,cand.prompt.trim().replace(/\s+/g,' '),cand.mcqPayload?.options,cand.tfPayload?.statements?.map(s=>s.statement)]));
      if (this.seenHashes.has(hash)) {
        results.duplicates++;
        return;
      }
      this.seenHashes.add(hash);

      // 3. Enqueue to review queue with provenance info
      if (this.reviewQueue) {
        this.reviewQueue.enqueue(cand, {
          ...sourceInfo,
          sourceId: sourceInfo.sourceId || 'custom_source',
          sourceName: sourceInfo.sourceName || 'Import Source',
          rawHash: hash
        });
      }

      results.ingested++;
    });

    return results;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = IngestionPipeline;
}
