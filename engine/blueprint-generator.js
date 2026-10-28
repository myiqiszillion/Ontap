/**
 * Exam Blueprint Generator (NTMK Rebuild Phase 02)
 * Generates exam structures and matrices conforming to MOET Decision 764/QĐ-BGDĐT
 */

const QuestionSchemaV2 = require('./schema.js');

const EXAM_BLUEPRINTS = {
  lichsu: {
    subjectId: 'lichsu',
    subjectName: 'Lịch sử',
    durationMinutes: 50,
    sections: [
      { sectionId: 'part_1', title: 'Phần I: Câu trắc nghiệm nhiều phương án lựa chọn', format: 'multiple_choice', targetCount: 20, pointsPerItem: 0.3, maxPoints: 6.0 },
      { sectionId: 'part_2', title: 'Phần II: Câu trắc nghiệm đúng sai', format: 'true_false_group', targetCount: 4, pointsPerItem: 1.0, maxPoints: 4.0 }
    ],
    totalQuestions: 24,
    totalCommands: 36,
    totalPoints: 10.0,
    cognitiveDistribution: { recognize: 0.4, understand: 0.3, apply: 0.2, high_apply: 0.1 }
  },

  toan: {
    subjectId: 'toan',
    subjectName: 'Toán học',
    durationMinutes: 90,
    sections: [
      { sectionId: 'part_1', title: 'Phần I: Câu trắc nghiệm nhiều phương án lựa chọn', format: 'multiple_choice', targetCount: 12, pointsPerItem: 0.25, maxPoints: 3.0 },
      { sectionId: 'part_2', title: 'Phần II: Câu trắc nghiệm đúng sai', format: 'true_false_group', targetCount: 4, pointsPerItem: 1.0, maxPoints: 4.0 },
      { sectionId: 'part_3', title: 'Phần III: Câu trắc nghiệm trả lời ngắn', format: 'short_answer', targetCount: 6, pointsPerItem: 0.5, maxPoints: 3.0 }
    ],
    totalQuestions: 22,
    totalCommands: 34,
    totalPoints: 10.0,
    cognitiveDistribution: { recognize: 0.4, understand: 0.3, apply: 0.2, high_apply: 0.1 }
  },
  vatli: {
    subjectId: 'vatli',
    subjectName: 'Vật lí',
    durationMinutes: 50,
    sections: [
      { sectionId: 'part_1', title: 'Phần I: Câu trắc nghiệm nhiều phương án lựa chọn', format: 'multiple_choice', targetCount: 18, pointsPerItem: 0.25, maxPoints: 4.5 },
      { sectionId: 'part_2', title: 'Phần II: Câu trắc nghiệm đúng sai', format: 'true_false_group', targetCount: 4, pointsPerItem: 1.0, maxPoints: 4.0 },
      { sectionId: 'part_3', title: 'Phần III: Câu trắc nghiệm trả lời ngắn', format: 'short_answer', targetCount: 6, pointsPerItem: 0.25, maxPoints: 1.5 }
    ],
    totalQuestions: 28,
    totalCommands: 40,
    totalPoints: 10.0,
    cognitiveDistribution: { recognize: 0.4, understand: 0.3, apply: 0.2, high_apply: 0.1 }
  },
  hoahoc: {
    subjectId: 'hoahoc',
    subjectName: 'Hóa học',
    durationMinutes: 50,
    sections: [
      { sectionId: 'part_1', title: 'Phần I: Câu trắc nghiệm nhiều phương án lựa chọn', format: 'multiple_choice', targetCount: 18, pointsPerItem: 0.25, maxPoints: 4.5 },
      { sectionId: 'part_2', title: 'Phần II: Câu trắc nghiệm đúng sai', format: 'true_false_group', targetCount: 4, pointsPerItem: 1.0, maxPoints: 4.0 },
      { sectionId: 'part_3', title: 'Phần III: Câu trắc nghiệm trả lời ngắn', format: 'short_answer', targetCount: 6, pointsPerItem: 0.25, maxPoints: 1.5 }
    ],
    totalQuestions: 28,
    totalCommands: 40,
    totalPoints: 10.0,
    cognitiveDistribution: { recognize: 0.4, understand: 0.3, apply: 0.2, high_apply: 0.1 }
  },
  tienganh: {
    subjectId: 'tienganh',
    subjectName: 'Tiếng Anh',
    durationMinutes: 50,
    sections: [
      { sectionId: 'part_1', title: 'Phần I: Câu trắc nghiệm nhiều phương án lựa chọn', format: 'multiple_choice', targetCount: 40, pointsPerItem: 0.25, maxPoints: 10.0 }
    ],
    totalQuestions: 40,
    totalCommands: 40,
    totalPoints: 10.0,
    cognitiveDistribution: { recognize: 0.4, understand: 0.3, apply: 0.2, high_apply: 0.1 }
  }
};

const BlueprintGenerator = {
  EXAM_BLUEPRINTS,

  /**
   * Get blueprint definition by subject key
   */
  getBlueprint(subjectKey) {
    if (!subjectKey) return null;
    const clean = String(subjectKey).replace(/\d+$/, '').toLowerCase();
    return EXAM_BLUEPRINTS[clean] || null;
  },

  /**
   * Shuffle helper (Fisher-Yates)
   */
  _shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * Assemble an exam from a pool of questions following blueprint specifications
   * @param {Array} pool - Available questions in bank
   * @param {string} subjectKey - Subject key (e.g. 'toan10')
   * @param {Object} options - Options (shuffle, scaleDown)
   */
  assembleExam(pool, subjectKey, options = {}) {
    const blueprint = this.getBlueprint(subjectKey);
    if (!blueprint) {
      throw new Error(`No blueprint registered for subject "${subjectKey}"`);
    }

    pool = Array.from(new Map(pool.filter(q=>q && q.id).map(q=>[q.id,q])).values());
    const assembledSections = [];
    const shortages = [];
    let allQuestions = [];

    blueprint.sections.forEach(secSpec => {
      // Filter questions matching section format
      let candidates = pool.filter(q => {
        const fmt = q.format || q.type;
        if (secSpec.format === 'multiple_choice') return fmt === 'multiple_choice' || fmt === 'mcq';
        if (secSpec.format === 'true_false_group') return fmt === 'true_false_group' || fmt === 'tf-group';
        if (secSpec.format === 'short_answer') return fmt === 'short_answer' || fmt === 'shortanswer';
        return false;
      });

      if (options.shuffle !== false) {
        candidates = this._shuffle(candidates);
      }

      const availableCount = candidates.length;
      const targetCount = secSpec.targetCount;
      const selected = candidates.slice(0, targetCount);

      if (availableCount < targetCount) {
        shortages.push({
          sectionId: secSpec.sectionId,
          format: secSpec.format,
          targetCount,
          availableCount,
          shortage: targetCount - availableCount
        });
      }

      assembledSections.push({
        sectionId: secSpec.sectionId,
        title: secSpec.title,
        format: secSpec.format,
        questions: selected,
        targetCount,
        selectedCount: selected.length
      });

      allQuestions.push(...selected);
    });

    return {
      subjectId: blueprint.subjectId,
      subjectName: blueprint.subjectName,
      durationMinutes: blueprint.durationMinutes,
      sections: assembledSections,
      questions: allQuestions,
      totalQuestions: allQuestions.length,
      blueprintTarget: blueprint.totalQuestions,
      hasShortage: shortages.length > 0,
      shortages,
      isFullySaturated: shortages.length === 0
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlueprintGenerator;
}
