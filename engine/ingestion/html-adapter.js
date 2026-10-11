/**
 * HTMLAdapter: Connector for Permitted HTML Educational Sources
 * NTMK Rebuild Phase 02B
 */

const SourceConnector = require('./source-connector.js');

class HTMLAdapter extends SourceConnector {
  constructor(config = {}, httpFetcher = null) {
    super(config, httpFetcher);
    this.targetUrl = config.targetUrl || '';
  }

  async connect() {
    if (!this.httpFetcher) {
      throw new Error('HTTPFetcher instance is required for HTMLAdapter');
    }
    if (this.targetUrl) {
      try {
        const res = await this.httpFetcher.fetch(this.targetUrl, {
          method: 'HEAD',
          rateLimitPerMin: this.config.rateLimitPerMinute || 30
        });
        return { connected: res.statusCode === 200 || res.statusCode === 304 };
      } catch (err) {
        return { connected: false, error: err.message };
      }
    }
    return { connected: true };
  }

  async fetchData(params = {}) {
    if (!this.targetUrl) {
      throw new Error(`targetUrl is not configured for HTMLAdapter ${this.sourceId}`);
    }

    const res = await this.httpFetcher.fetch(this.targetUrl, {
      accept: 'text/html,application/xhtml+xml',
      contentTypes: ['text/html', 'application/xhtml+xml'],
      rateLimitPerMin: this.config.rateLimitPerMinute || 30
    });

    return {
      rawData: res.body,
      metadata: {
        sourceId: this.sourceId,
        url: res.url,
        retrievedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Safe HTML Question Extraction
   */
  async extractQuestions(htmlString) {
    if (typeof htmlString !== 'string') throw new Error('Invalid HTML response');
    // Explicit interchange contract; never guess answers from arbitrary page markup.
    const match = htmlString.match(/<script\s+type="application\/json"\s+id="ntmk-questions"\s*>([\s\S]*?)<\/script>/i);
    if (!match) throw new Error('Unsupported HTML structure: needs_review');
    let questions;
    try { questions = JSON.parse(match[1]); } catch { throw new Error('Invalid HTML question JSON'); }
    if (!Array.isArray(questions)) throw new Error('HTML schema changed: array required');
    return questions;
  }

  normalizeQuestion(candidate) {
    return require('./question-normalizer.js').normalize(require('./question-extractor.js').extract(candidate, this.config), this.config);
  }
}

module.exports = HTMLAdapter;
