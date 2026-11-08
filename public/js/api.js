/**
 * API Module - Data Loading & Caching
 * Works with both Express server (local) and static hosting (Vercel)
 */
const API = {
  cache: new Map(),

  /**
   * Get list of subjects
   */
  async getSubjects(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this.cache.get('subjects');
      if (cached && Array.isArray(cached.subjects) && cached.subjects.length >= 5) return cached;
    }

    try {
      // Try API first (Express server), fallback to static JSON
      let response = await fetch('/api/subjects');
      if (!response.ok) {
        response = await fetch(`/data/subjects.json?_t=${Date.now()}`);
      }
      if (!response.ok) throw new Error('Failed to fetch subjects');
      const data = await response.json();
      // Ensure we cache and return the entire data object (grades + subjects)
      this.cache.set('subjects', data);
      return data;
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
   * Start a procedural exam session (autonomous procedural question generation)
   */
  async startProceduralExam(subjectId, grade = 11) {
    const rawSub = (subjectId || 'toan').replace(/\d+$/, '');
    try {
      const res = await fetch('/api/v2/questions?action=start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'procedural', subjectId: rawSub, grade: Number(grade) })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('API procedural start failed, falling back to generate_exam endpoint:', e);
    }

    const fallbackRes = await fetch(`/api/v2/questions?action=generate_exam&subject=${rawSub}&grade=${grade}`);
    if (!fallbackRes.ok) throw new Error('Khong the tao de thi tu dong');
    return await fallbackRes.json();
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
