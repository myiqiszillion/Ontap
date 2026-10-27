/**
 * Spaced Repetition & Review Scheduler
 * NTMK Rebuild Phase 03B — Task 6
 *
 * Responsibilities:
 * - Schedule timely retention reviews for skills previously practiced.
 * - Tracks review history:
 *   - lastPracticed
 *   - consecutiveSuccesses
 *   - reviewCount
 *   - lastAccuracy
 *   - currentIntervalDays
 *   - nextReviewDate
 *   - retentionEvidence ('strong', 'moderate', 'lapsed', 'untested')
 * - Interval adaptation rules:
 *   - Success (accuracy >= 80%): Expands interval (e.g. 1 -> 3 -> 7 -> 14 -> 30 days).
 *   - Moderate (50% <= accuracy < 80%): Modest expansion (e.g. * 1.3).
 *   - Lapse (accuracy < 50%): Resets interval to 1 day; flags foundation review.
 * - Pedagogical disclaimer:
 *   - Explains interval adjustments clearly.
 *   - Never claims uncalibrated magic or permanent mastery.
 */

class SpacedRepetitionScheduler {
  constructor(options = {}) {
    this.baseIntervalDays = options.baseIntervalDays || 1;
    this.maxIntervalDays = options.maxIntervalDays || 30;
    this.defaultSequence = [1, 3, 7, 14, 30];
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  /**
   * Add days to date
   */
  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Initialize a new review tracking record for a skill
   */
  initializeRecord({ skillId, subjectId = 'math' } = {}) {
    return {
      skillId,
      subjectId,
      reviewCount: 0,
      consecutiveSuccesses: 0,
      currentIntervalDays: this.baseIntervalDays,
      lastPracticed: null,
      lastAccuracy: null,
      nextReviewDate: null,
      retentionEvidence: 'untested',
      status: 'scheduled',
      explanation: 'Kỹ năng mới được thêm vào chu trình ôn tập ngắt quãng.'
    };
  }

  /**
   * Update review schedule after a practice or review session
   */
  recordPracticeResult(record, { accuracy = 0.5, practicedDate = new Date() } = {}) {
    if (!record) throw new Error('Review record is required');

    const practicedDateObj = new Date(practicedDate);
    const dateStr = this.formatDate(practicedDateObj);

    let consecutiveSuccesses = record.consecutiveSuccesses || 0;
    let reviewCount = (record.reviewCount || 0) + 1;
    let newIntervalDays = record.currentIntervalDays || this.baseIntervalDays;
    let retentionEvidence = 'moderate';
    let explanation = '';

    if (accuracy >= 0.8) {
      consecutiveSuccesses++;
      retentionEvidence = 'strong';

      // Pick next interval from standard sequence or multiply
      const seqIdx = Math.min(consecutiveSuccesses, this.defaultSequence.length - 1);
      newIntervalDays = Math.min(this.defaultSequence[seqIdx], this.maxIntervalDays);

      explanation = `Kết quả tốt (${Math.round(accuracy * 100)}%). Khoảng cách ôn tập được giãn ra ${newIntervalDays} ngày tới để củng cố trí nhớ dài hạn.`;
    } else if (accuracy >= 0.5) {
      retentionEvidence = 'moderate';
      newIntervalDays = Math.min(Math.max(2, Math.round(newIntervalDays * 1.3)), this.maxIntervalDays);
      explanation = `Kết quả đạt mức trung bình (${Math.round(accuracy * 100)}%). Duy trì ôn tập sau ${newIntervalDays} ngày.`;
    } else {
      // Memory lapse: reset interval
      consecutiveSuccesses = 0;
      retentionEvidence = 'lapsed';
      newIntervalDays = 1; // Immediate follow-up next day
      explanation = `Độ chính xác còn thấp (${Math.round(accuracy * 100)}%). Hệ thống đặt lịch kiểm tra lại ngay sau 1 ngày để khắc phục lỗ hổng kiến thức.`;
    }

    const nextReviewDateObj = this.addDays(practicedDateObj, newIntervalDays);
    const nextReviewDate = this.formatDate(nextReviewDateObj);

    return {
      ...record,
      reviewCount,
      consecutiveSuccesses,
      currentIntervalDays: newIntervalDays,
      lastPracticed: dateStr,
      lastAccuracy: accuracy,
      nextReviewDate,
      retentionEvidence,
      explanation,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Check if a skill review is due for a specific date
   */
  isReviewDue(record, targetDate = new Date()) {
    if (!record || !record.nextReviewDate) return false;
    const targetDateStr = this.formatDate(targetDate);
    return record.nextReviewDate <= targetDateStr;
  }
}

module.exports = SpacedRepetitionScheduler;
