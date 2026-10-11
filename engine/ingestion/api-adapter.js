/**
 * APIAdapter: Connector for REST/JSON API Question Sources
 * NTMK Rebuild Phase 02B
 */

const SourceConnector = require('./source-connector.js');

class APIAdapter extends SourceConnector {
  constructor(config = {}, httpFetcher = null) {
    super(config, httpFetcher);
    this.endpointUrl = config.endpointUrl || '';
    this.apiKey = config.apiKey || null;
  }

  async connect() {
    if (!this.httpFetcher) {
      throw new Error('HTTPFetcher instance is required for APIAdapter');
    }
    // Perform initial ping / health check if endpointUrl is set
    if (this.endpointUrl) {
      try {
        const res = await this.httpFetcher.fetch(this.endpointUrl, {
          method: 'GET',
          rateLimitPerMin: this.config.rateLimitPerMinute || 30
        });
        return { connected: res.statusCode === 200 || res.statusCode === 304, statusCode: res.statusCode };
      } catch (err) {
        return { connected: false, error: err.message };
      }
    }
    return { connected: true };
  }

  async fetchData(params = {}) {
    const pagination = this.config.pagination;
    if (!pagination) return this._fetchPage(params);
    const questions = [];
    const maxPages = Math.max(1, Math.min(pagination.maxPages || 3, 10));
    let last;
    for (let page = 1; page <= maxPages; page++) {
      last = await this._fetchPage({ ...params, [pagination.pageParameter || 'page']: page });
      questions.push(...await this.extractQuestions(last.rawData));
      const more = last.rawData.hasMore === true || Boolean(last.rawData.next);
      if (!more) return { rawData: questions, metadata: { ...last.metadata, pages: page } };
    }
    throw new Error('Pagination limit reached: incomplete source response requires review');
  }

  async _fetchPage(params = {}) {
    if (!this.endpointUrl) {
      throw new Error(`endpointUrl is not configured for APIAdapter ${this.sourceId}`);
    }

    const url = new URL(this.endpointUrl);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });

    const headers = {};
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await this.httpFetcher.fetch(url.toString(), {
      contentTypes: ['application/json'],
      headers,
      rateLimitPerMin: this.config.rateLimitPerMinute || 60
    });

    if (res.statusCode !== 200 && res.statusCode !== 304) {
      throw new Error(`APIAdapter ${this.sourceId} returned HTTP ${res.statusCode}`);
    }

    let parsed = [];
    try {
      parsed = JSON.parse(res.body);
    } catch (err) {
      throw new Error(`Failed to parse JSON response from ${this.sourceId}: invalid JSON`);
    }

    return {
      rawData: parsed,
      metadata: {
        sourceId: this.sourceId,
        url: res.url,
        retrievedAt: new Date().toISOString()
      }
    };
  }

  async extractQuestions(rawData) {
    // If rawData is an array, return it directly; if nested under questions or items
    if (Array.isArray(rawData)) return rawData;
    if (rawData && Array.isArray(rawData.questions)) return rawData.questions;
    if (rawData && Array.isArray(rawData.items)) return rawData.items;
    throw new Error('API schema changed: questions/items array required');
  }

  normalizeQuestion(candidate) {
    // Default passthrough if already Schema V2 compliant, or delegate to QuestionNormalizer
    const extracted = require('./question-extractor.js').extract(candidate, this.config);
    return require('./question-normalizer.js').normalize(extracted, this.config);
  }
}

module.exports = APIAdapter;
