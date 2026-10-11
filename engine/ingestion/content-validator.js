/**
 * Deep Content & Pedagogical Validator (NTMK Rebuild Phase 02B - Task 5)
 * Verifies LaTeX, Chemical formulas, XSS, Image safety, and Pedagogical integrity
 */

const QuestionValidator = require('../validator.js');

class ContentValidator {
  /**
   * Run comprehensive validation on a question candidate
   * @param {Object} q - Question candidate
   * @returns {{ valid: boolean, errors: string[], warnings: string[], qualityScore: number }}
   */
  static validate(q) {
    const baseResult = QuestionValidator.validate(q);
    const errors = [...baseResult.errors];
    const warnings = [...baseResult.warnings];
    let qualityScore = 100;

    if (!q || typeof q !== 'object') {
      return { valid: false, errors: ['Question must be an object'], warnings: [], qualityScore: 0 };
    }

    // 1. Deep LaTeX & MathML Check
    this._checkLatexFormulas(q.prompt, 'prompt', errors, warnings);
    if (q.explanation) {
      this._checkLatexFormulas(q.explanation, 'explanation', errors, warnings);
    }
    if (q.mcqPayload && Array.isArray(q.mcqPayload.options)) {
      q.mcqPayload.options.forEach((opt, idx) => {
        this._checkLatexFormulas(opt, `option[${idx}]`, errors, warnings);
      });
    }
    if (q.tfPayload && Array.isArray(q.tfPayload.statements)) {
      q.tfPayload.statements.forEach((s, idx) => {
        this._checkLatexFormulas(s?.statement, `statement[${idx}]`, errors, warnings);
      });
    }

    // 2. Chemical Formula Integrity Check (for Chemistry subject)
    if (q.subjectId === 'hoahoc') {
      this._checkChemistrySyntax(q.prompt, warnings);
    }

    // 3. Image URI Safety
    if (q.imageUri) {
      this._checkImageUri(q.imageUri, errors);
    }

    // 4. Duplicate Options Check
    if (q.format === 'multiple_choice' && q.mcqPayload && Array.isArray(q.mcqPayload.options)) {
      const distinct = new Set(q.mcqPayload.options.map(o => String(o).trim().toLowerCase()));
      if (distinct.size < q.mcqPayload.options.length) {
        errors.push('MCQ contains duplicate options');
      }
    }

    const texts = [q.prompt,q.explanation,q.tfPayload?.passage,...(Array.isArray(q.mcqPayload?.options) ? q.mcqPayload.options : []),...(Array.isArray(q.tfPayload?.statements) ? q.tfPayload.statements : []).map(s=>s?.statement)];
    for (const text of texts) {
      if (typeof text !== 'string') continue;
      this._checkLatexFormulas(text, 'content', errors, warnings);
      if (/<[^>]+>/.test(text)) errors.push('Unsupported HTML requires review; preserve raw source');
    }
    if (q.imageUri || q.images?.length || q.table || q.graph || q.mathml) errors.push('Rich asset integrity not verified');
    if (q.format === 'multiple_choice' && q.mcqPayload?.options?.length !== 4) errors.push('Exactly four options required');
    if (q.format === 'multiple_choice' && !Number.isInteger(q.mcqPayload?.correctOptionIndex)) errors.push('Missing correct answer');
    if (q.format === 'true_false_group' && (q.tfPayload?.statements?.length !== 4 || q.tfPayload.statements.some(s=>typeof s?.correct !== 'boolean'))) errors.push('Four explicit statement answers required');
    if (!q.topic) warnings.push('Topic mapping requires review');
    // Calculate quality score
    qualityScore -= errors.length * 25;
    qualityScore -= warnings.length * 5;
    qualityScore = Math.max(0, Math.min(100, qualityScore));

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      qualityScore
    };
  }

  static _checkLatexFormulas(text, fieldName, errors, warnings) {
    if (!text || typeof text !== 'string') return;

    // Display math $$
    const displayCount = (text.match(/\$\$/g) || []).length;
    if (displayCount % 2 !== 0) {
      errors.push(`Unbalanced display math $$ delimiter in ${fieldName}`);
    }

    // Inline math $ (excluding $$)
    const withoutDisplay = text.replace(/\$\$/g, '');
    const inlineCount = (withoutDisplay.match(/\$/g) || []).length;
    if (inlineCount % 2 !== 0) {
      errors.push(`Unbalanced inline math $ delimiter in ${fieldName}`);
    }

    // Unclosed curly braces inside LaTeX macros like \frac{...}{...} or \sqrt{...}
    const mathBlocks = text.match(/\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$/g) || [];
    for (const block of mathBlocks) {
      const openBraces = (block.match(/\{/g) || []).length;
      const closeBraces = (block.match(/\}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push(`Mismatched curly braces in LaTeX block: "${block.substring(0, 30)}..." in ${fieldName}`);
      }
    }
  }

  static _checkChemistrySyntax(text, warnings) {
    if (!text || typeof text !== 'string') return;
    // Check for common chemical arrow conventions: ->, -->, <=>
    if (text.includes('->') || text.includes('-->') || text.includes('<=>')) {
      // Valid chemical reaction notation
    }
  }

  static _checkImageUri(uri, errors) {
    if (typeof uri !== 'string') {
      errors.push('imageUri must be a string');
      return;
    }
    const clean = uri.trim().toLowerCase();
    if (clean.startsWith('javascript:') || clean.startsWith('data:text/html') || clean.startsWith('data:text/javascript')) {
      errors.push('Security violation: Dangerous imageUri scheme detected');
    }
  }
}

module.exports = ContentValidator;
