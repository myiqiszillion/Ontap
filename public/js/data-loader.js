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
      const allQs = lesson.questions || [];
      const mcqCount = allQs.filter(q => !q.type || q.type === 'mcq').length;
      const saCount = allQs.filter(q => q.type === 'shortanswer').length;
      const tfGroupCount = (lesson.questionGroups || []).length;
      
      return {
        bai: index + 1,
        title: lesson.name,
        mcqCount,
        tfGroupCount,
        saCount,
        totalItems: mcqCount + tfGroupCount + saCount,
        estimatedTime: Math.ceil((mcqCount + tfGroupCount * 4 + saCount * 2) * 1)
      };
    });

    return { subject: subjectId, lessons };
  },

  /**
   * Load quiz data for selected bài numbers
   */
  async loadQuizData(subjectId, selectedBais, examMode = 'exam', mcqLimit = null, tfLimit = null, saLimit = null) {
    const data = await API.getQuestions(subjectId);

    // Filter lessons by selected indices (1-indexed bài)
    const selectedLessons = data.lessons.filter((_, i) => selectedBais.includes(i + 1));

    let mcqQuestions = [];
    let tfGroups = [];
    let saQuestions = [];

    selectedLessons.forEach(lesson => {
      // Questions (MCQ & Short Answer)
      if (lesson.questions) {
        lesson.questions.forEach(q => {
          const type = q.type || 'mcq';
          const processedQ = {
            type,
            question: q.question,
            image: q.image || null,
            lessonTitle: lesson.name
          };

          if (type === 'mcq') {
            processedQ.options = q.options;
            processedQ.correctAnswer = q.correct !== undefined ? q.correct : q.correctAnswer;
            mcqQuestions.push(processedQ);
          } else if (type === 'shortanswer') {
            processedQ.correctAnswer = q.correct !== undefined ? q.correct : q.correctAnswer;
            saQuestions.push(processedQ);
          }
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
      saQuestions = this.shuffle(saQuestions);
    }

    if (mcqLimit !== null) mcqQuestions = mcqQuestions.slice(0, mcqLimit);
    if (tfLimit !== null) tfGroups = tfGroups.slice(0, tfLimit);
    if (saLimit !== null) saQuestions = saQuestions.slice(0, saLimit);

    if (shouldShuffle) {
      questions = this.shuffle([...mcqQuestions, ...tfGroups, ...saQuestions]);
    } else {
      questions = [...mcqQuestions, ...tfGroups, ...saQuestions];
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
