/**
 * API Module - Data Loading & Caching
 * Works with both Express server (local) and static hosting (Vercel)
 */
const API = {
  cache: new Map(),

  /**
   * Get list of subjects
   */
  async getSubjects() {
    const cached = this.cache.get('subjects');
    if (cached) return cached;

    try {
      // Try API first (Express server), fallback to static JSON
      let response = await fetch('/api/subjects');
      if (!response.ok) {
        response = await fetch('/data/subjects.json');
      }
      if (!response.ok) throw new Error('Failed to fetch subjects');
      const data = await response.json();
      this.cache.set('subjects', data.subjects);
      return data.subjects;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Get questions for a specific subject
   * @param {string} subjectId - Subject ID (e.g., 'history', 'biology')
   */
  async getQuestions(subjectId) {
    const cacheKey = `questions_${subjectId}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      // Try API first (Express server), fallback to static JSON
      let response = await fetch(`/api/data/${subjectId}`);
      if (!response.ok) {
        response = await fetch(`/data/${subjectId}.json`);
      }
      if (!response.ok) throw new Error(`Failed to fetch ${subjectId} data`);
      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = API;
}
