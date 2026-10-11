/**
 * SourceConnector Abstract Base Class (NTMK Rebuild Phase 02B)
 * Defines the contract for all educational source adapters
 */

class SourceConnector {
  /**
   * @param {Object} config - Source configuration from SourceRegistry
   * @param {Object} httpFetcher - Shared HTTPFetcher instance
   */
  constructor(config = {}, httpFetcher = null) {
    if (new.target === SourceConnector) {
      throw new TypeError('Cannot construct SourceConnector instances directly. Please subclass.');
    }
    this.sourceId = config.id || 'unknown_source';
    this.sourceName = config.name || 'Unknown Source';
    this.license = config.license || 'educational_use';
    this.config = config;
    this.httpFetcher = httpFetcher;
    this.enabled = config.status === 'active';
  }

  /**
   * Establish initial connection or verify API availability
   */
  async connect() {
    throw new Error('Method connect() must be implemented by subclass.');
  }

  /**
   * Fetch raw content from the source
   * @param {Object} params - Query/pagination parameters
   * @returns {Promise<{ rawData: any, metadata: Object }>}
   */
  async fetchData(params = {}) {
    throw new Error('Method fetchData() must be implemented by subclass.');
  }

  /**
   * Extract question structures from raw response
   * @param {any} rawData
   * @returns {Promise<Array<Object>>}
   */
  async extractQuestions(rawData) {
    throw new Error('Method extractQuestions() must be implemented by subclass.');
  }

  /**
   * Normalize an extracted candidate question into Schema V2 format
   * @param {Object} candidate
   * @returns {Object} Valid QuestionSchemaV2 object
   */
  normalizeQuestion(candidate) {
    throw new Error('Method normalizeQuestion() must be implemented by subclass.');
  }

  /**
   * Health check hook
   */
  async healthCheck() {
    return {
      sourceId: this.sourceId,
      status: this.enabled ? 'healthy' : 'disabled',
      timestamp: new Date().toISOString()
    };
  }

  getMetadata() {
    return {
      id: this.sourceId,
      name: this.sourceName,
      license: this.license,
      curriculum: this.config.curriculum || 'GDPT2018',
      allowedGrades: this.config.allowedGrades || [10, 11, 12],
      rateLimitPerMinute: this.config.rateLimitPerMinute || 60,
      enabled: this.enabled
    };
  }
}

module.exports = SourceConnector;
