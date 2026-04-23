/**
 * Data Loader Module
 * Load and process quiz data from JSON files
 * Works with unified format: { lessons: [{ name, questions?, questionGroups? }] }
 */

const DataLoader = {
  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },

  /**
   * Get lessons list from unified format
   */
  async getLessons(subjectId) {
    const data = await API.getQuestions(subjectId);

    const lessons = data.lessons.map((lesson, index) => {
      const mcqCount = (lesson.questions || []).length;
      const tfGroupCount = (lesson.questionGroups || []).length;
      return {
        bai: index + 1,
        title: lesson.name,
        mcqCount,
        tfGroupCount,
        saCount: 0,
        totalItems: mcqCount + tfGroupCount,
        estimatedTime: Math.ceil((mcqCount + tfGroupCount * 4) * 1)
      };
    });

    return { subject: subjectId, lessons };
  },

  /**
   * Load quiz data for selected bài numbers
   * @param {string} subjectId
   * @param {number[]} selectedBais - Array of bài numbers (1-indexed)
   * @param {string} examMode - 'exam', 'mcq', 'tf', 'all'
   * @param {number|null} mcqLimit
   * @param {number|null} tfLimit
   */
  async loadQuizData(subjectId, selectedBais, examMode = 'exam', mcqLimit = null, tfLimit = null, saLimit = null) {
    const data = await API.getQuestions(subjectId);

    // Filter lessons by selected indices (1-indexed bài)
    const selectedLessons = data.lessons.filter((_, i) => selectedBais.includes(i + 1));

    let mcqQuestions = [];
    let tfGroups = [];

    selectedLessons.forEach(lesson => {
      // MCQ questions
      if (lesson.questions) {
        lesson.questions.forEach(q => {
          mcqQuestions.push({
            type: 'mcq',
            question: q.question,
            options: q.options,
            correctAnswer: q.correct !== undefined ? q.correct : q.correctAnswer,
            image: q.image || null,
            lessonTitle: lesson.name
          });
        });
      }

      // TF question groups
      if (lesson.questionGroups) {
        lesson.questionGroups.forEach(group => {
          tfGroups.push({
            type: 'tf-group',
            passage: group.passage || '',
            statements: (group.statements || []).map(s => ({
              question: s.question,
              correct: s.correct === true
            })),
            image: group.image || null,
            lessonTitle: lesson.name
          });
        });
      }
    });

    let questions = [];
    const shouldShuffle = examMode === 'exam';

    if (shouldShuffle) {
      mcqQuestions = this.shuffle(mcqQuestions);
      tfGroups = this.shuffle(tfGroups);
    }

    if (mcqLimit !== null) mcqQuestions = mcqQuestions.slice(0, mcqLimit);
    if (tfLimit !== null) tfGroups = tfGroups.slice(0, tfLimit);

    if (shouldShuffle) {
      questions = this.shuffle([...mcqQuestions, ...tfGroups]);
    } else {
      questions = [...mcqQuestions, ...tfGroups];
    }

    return {
      subject: subjectId,
      questions,
      totalQuestions: questions.length,
      examMode
    };
  },

  /**
   * Shuffle MCQ options while tracking correct answer
   */
  _shuffleMcqOptions(q) {
    return { ...q };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLoader;
}
