/**
 * Formula Renderer Module (NTMK Rebuild Phase 02)
 * High-performance KaTeX math & chemistry rendering with offline fallback
 */

const FormulaRenderer = {
  isKatexAvailable() {
    return typeof window !== 'undefined' && typeof window.katex !== 'undefined';
  },

  /**
   * Escape HTML to prevent XSS outside math formulas
   */
  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  /**
   * Safe offline fallback parser for common math & chem symbols
   */
  fallbackRenderMath(mathText, isDisplay = false) {
    let output = this.escapeHtml(mathText);

    // Common LaTeX replacements
    output = output
      .replace(/\\times/g, '×')
      .replace(/\\cdot/g, '·')
      .replace(/\\pm/g, '±')
      .replace(/\\leq/g, '≤')
      .replace(/\\geq/g, '≥')
      .replace(/\\neq/g, '≠')
      .replace(/\\approx/g, '≈')
      .replace(/\\infty/g, '∞')
      .replace(/\\alpha/g, 'α')
      .replace(/\\beta/g, 'β')
      .replace(/\\Delta/g, 'Δ')
      .replace(/\\delta/g, 'δ')
      .replace(/\\pi/g, 'π')
      .replace(/\\in/g, '∈')
      .replace(/\\notin/g, '∉')
      .replace(/\\subset/g, '⊂')
      .replace(/\\cup/g, '∪')
      .replace(/\\cap/g, '∩')
      .replace(/\\emptyset/g, '∅')
      .replace(/\\mathbb{R}/g, 'ℝ')
      .replace(/\\mathbb{N}/g, 'ℕ')
      .replace(/\\mathbb{Z}/g, 'ℤ')
      .replace(/\\mathbb{Q}/g, 'ℚ')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1 / $2)')
      .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
      .replace(/\^([0-9a-zA-Z+-])/g, '<sup>$1</sup>')
      .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
      .replace(/_([0-9a-zA-Z+-])/g, '<sub>$1</sub>');

    const wrapperClass = isDisplay ? 'formula-display fallback' : 'formula-inline fallback';
    return `<span class="${wrapperClass}">${output}</span>`;
  },

  /**
   * Render math formula string using KaTeX if present, or fallback
   */
  renderMath(latex, isDisplay = false) {
    if (this.isKatexAvailable()) {
      try {
        return window.katex.renderToString(latex, {
          displayMode: isDisplay,
          throwOnError: false
        });
      } catch (e) {
        console.warn('KaTeX render error:', e);
        return this.fallbackRenderMath(latex, isDisplay);
      }
    }
    return this.fallbackRenderMath(latex, isDisplay);
  },

  /**
   * Parse a text containing math delimiters ($$..$$ and $..$)
   * @param {string} text
   * @returns {string} Safe HTML string with rendered formulas
   */
  render(text) {
    if (typeof text !== 'string') return '';
    if (!text.includes('$')) {
      return this.escapeHtml(text);
    }

    // Step 1: Extract and replace display math ($$...$$)
    const displayTokens = [];
    let parsed = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => {
      const idx = displayTokens.length;
      displayTokens.push(this.renderMath(latex.trim(), true));
      return `___DISPLAY_MATH_${idx}___`;
    });

    // Step 2: Extract and replace inline math ($...$)
    const inlineTokens = [];
    parsed = parsed.replace(/\$([^\$\n]+?)\$/g, (_, latex) => {
      const idx = inlineTokens.length;
      inlineTokens.push(this.renderMath(latex.trim(), false));
      return `___INLINE_MATH_${idx}___`;
    });

    // Step 3: Escape plain text around tokens
    parsed = this.escapeHtml(parsed);

    // Step 4: Re-inject rendered math tokens
    inlineTokens.forEach((tokenHtml, idx) => {
      parsed = parsed.replace(`___INLINE_MATH_${idx}___`, tokenHtml);
    });

    displayTokens.forEach((tokenHtml, idx) => {
      parsed = parsed.replace(`___DISPLAY_MATH_${idx}___`, tokenHtml);
    });

    return parsed;
  },

  /**
   * Automatically process and render an entire DOM element's formulas
   */
  renderElement(el) {
    if (!el) return;
    const raw = el.getAttribute('data-raw-content') || el.textContent;
    if (raw && raw.includes('$')) {
      el.setAttribute('data-raw-content', raw);
      el.innerHTML = this.render(raw);
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FormulaRenderer;
}
