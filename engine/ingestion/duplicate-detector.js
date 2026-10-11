/**
 * Duplicate Detector (NTMK Rebuild Phase 02B - Task 5)
 * Multi-layer Deduplication: Exact SHA-256 Hash + Normalized Semantic Token Overlap
 */

const crypto = require('crypto');

class DuplicateDetector {
  constructor() {
    this.exactHashes = new Map(); // exactHash -> questionId
    this.promptHashes = new Map(); // promptHash -> questionId
    this.tokenSets = new Map();    // questionId -> Set of normalized tokens
  }

  /**
   * Normalize text for fingerprinting
   */
  normalizeText(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’“”]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Tokenize text into set of meaningful word tokens
   */
  tokenize(text) {
    const norm = this.normalizeText(text);
    return new Set(norm.split(' ').filter(w => w.length > 1));
  }

  /**
   * Compute exact hash of question
   */
  computeExactHash(q) {
    let payloadStr = '';
    if (q.mcqPayload && Array.isArray(q.mcqPayload.options)) {
      payloadStr = q.mcqPayload.options.join('|');
    } else if (q.tfPayload && Array.isArray(q.tfPayload.statements)) {
      payloadStr = q.tfPayload.statements.map(s => s.statement).join('|');
    } else if (q.shortAnswerPayload && Array.isArray(q.shortAnswerPayload.correctAnswers)) {
      payloadStr = q.shortAnswerPayload.correctAnswers.join('|');
    }

    const raw = `${q.subjectId || ''}_${q.grade || ''}_${q.prompt || ''}_${payloadStr}`;
    return crypto.createHash('sha256').update(this.normalizeText(raw)).digest('hex');
  }

  /**
   * Compute prompt-only hash
   */
  computePromptHash(q) {
    const raw = `${q.subjectId || ''}_${q.grade || ''}_${q.prompt || ''}`;
    return crypto.createHash('sha256').update(this.normalizeText(raw)).digest('hex');
  }

  /**
   * Calculate Jaccard similarity coefficient between two token sets
   */
  calculateJaccardSimilarity(setA, setB) {
    if (setA.size === 0 || setB.size === 0) return 0;
    let intersection = 0;
    for (const token of setA) {
      if (setB.has(token)) intersection++;
    }
    const union = setA.size + setB.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Check if question is a duplicate
   * @param {Object} q - Question candidate
   * @param {number} similarityThreshold - Threshold for near-duplicate warning (default 0.85)
   * @returns {{ isDuplicate: boolean, similarity: number, duplicateOfId: string | null, reason: string | null }}
   */
  check(q, similarityThreshold = 0.85) {
    const exactHash = this.computeExactHash(q);
    if (this.exactHashes.has(exactHash)) {
      return {
        isDuplicate: true,
        similarity: 1.0,
        duplicateOfId: this.exactHashes.get(exactHash),
        reason: 'exact_hash_match'
      };
    }

    const promptHash = this.computePromptHash(q);
    if (this.promptHashes.has(promptHash)) {
      return {
        isDuplicate: true,
        similarity: 0.95,
        duplicateOfId: this.promptHashes.get(promptHash),
        reason: 'identical_prompt_match'
      };
    }

    // Near-duplicate fuzzy check using Jaccard similarity
    const candTokens = this.tokenize(q.prompt);
    if (candTokens.size >= 5) {
      for (const [existingId, tokens] of this.tokenSets.entries()) {
        const sim = this.calculateJaccardSimilarity(candTokens, tokens);
        if (sim >= similarityThreshold) {
          return {
            isDuplicate: true,
            similarity: Math.round(sim * 100) / 100,
            duplicateOfId: existingId,
            reason: 'fuzzy_token_similarity_match'
          };
        }
      }
    }

    return {
      isDuplicate: false,
      similarity: 0,
      duplicateOfId: null,
      reason: null
    };
  }

  /**
   * Register a question in the deduplication index
   */
  register(q) {
    if (!q || !q.id) return;
    const exactHash = this.computeExactHash(q);
    const promptHash = this.computePromptHash(q);
    const tokens = this.tokenize(q.prompt);

    this.exactHashes.set(exactHash, q.id);
    this.promptHashes.set(promptHash, q.id);
    this.tokenSets.set(q.id, tokens);
  }

  /**
   * Bulk register an array of questions (e.g. from existing bank)
   */
  bulkRegister(questions = []) {
    questions.forEach(q => this.register(q));
  }

  clear() {
    this.exactHashes.clear();
    this.promptHashes.clear();
    this.tokenSets.clear();
  }
}

module.exports = DuplicateDetector;
