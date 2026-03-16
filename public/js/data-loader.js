/**
 * Data Loader Module
 * Load and process quiz data from JSON files
 * Supports merging MCQ + TF lessons by bài, and keeping TF as group questions
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
   * Get merged lessons list (group by bài number)
   * Each bài shows combined MCQ + TF info
   */
  async getLessons(subjectId) {
    const data = await API.getQuestions(subjectId);

    // Group lessons by bài number
    const baiMap = {};
    data.lessons.forEach(lesson => {
      const bai = lesson.bai;
      if (!baiMap[bai]) {
        baiMap[bai] = { bai, lessonIds: [], mcqCount: 0, tfGroupCount: 0, title: '' };
      }
      baiMap[bai].lessonIds.push(lesson.id);

      if (lesson.type === 'multiple' || lesson.type === 'mcq') {
        baiMap[bai].mcqCount = lesson.questions ? lesson.questions.length : 0;
        baiMap[bai].mcqCount = lesson.questions ? lesson.questions.length : 0;
        // Extract clean title (remove " (Trắc nghiệm)" etc.)
        baiMap[bai].title = lesson.title.replace(/\s*\(Trắc nghiệm\)\s*/i, '').replace(/\s*\(Đúng\/Sai\)\s*/i, '').replace(/\s*\(Trả lời ngắn\)\s*/i, '');
      } else if (lesson.type === 'truefalse') {
        baiMap[bai].tfGroupCount = lesson.questionGroups ? lesson.questionGroups.length : 0;
        if (!baiMap[bai].title) {
          baiMap[bai].title = lesson.title.replace(/\s*\(Trắc nghiệm\)\s*/i, '').replace(/\s*\(Đúng\/Sai\)\s*/i, '').replace(/\s*\(Trả lời ngắn\)\s*/i, '');
        }
      } else if (lesson.type === 'shortanswer') {
        baiMap[bai].saCount = lesson.questions ? lesson.questions.length : 0;
        if (!baiMap[bai].title) {
          baiMap[bai].title = lesson.title.replace(/\s*\(Trắc nghiệm\)\s*/i, '').replace(/\s*\(Đúng\/Sai\)\s*/i, '').replace(/\s*\(Trả lời ngắn\)\s*/i, '');
        }
      }
    });

    // Convert to sorted array
    const mergedLessons = Object.values(baiMap).sort((a, b) => a.bai - b.bai).map(b => ({
      bai: b.bai,
      lessonIds: b.lessonIds,
      title: b.title,
      mcqCount: b.mcqCount || 0,
      tfGroupCount: b.tfGroupCount || 0,
      saCount: b.saCount || 0,
      totalItems: (b.mcqCount || 0) + (b.tfGroupCount || 0) + (b.saCount || 0),
      estimatedTime: Math.ceil(((b.mcqCount || 0) + (b.tfGroupCount || 0) * 4 + (b.saCount || 0) * 2) * 1)
    }));

    return { subject: subjectId, lessons: mergedLessons };
  },

  /**
   * Load quiz data for selected bài numbers
   * @param {string} subjectId
   * @param {number[]} selectedBais - Array of bài numbers
   * @param {string} examMode - 'exam' (12TN+4ĐS), 'mcq', 'tf', 'all'
   * @param {number|null} mcqLimit - Max MCQ questions
   * @param {number|null} tfLimit - Max TF groups
   */
  async loadQuizData(subjectId, selectedBais, examMode = 'exam', mcqLimit = null, tfLimit = null, saLimit = null) {
    const data = await API.getQuestions(subjectId);

    // Filter lessons by selected bài
    const selectedLessons = data.lessons.filter(l => selectedBais.includes(l.bai));

    // Separate MCQ questions, TF groups, and Short Answers
    let mcqQuestions = [];
    let tfGroups = [];
    let shortAnswers = [];

    selectedLessons.forEach(lesson => {
      if (lesson.type === 'multiple' || lesson.type === 'mcq') {
        if (lesson.questions) {
          lesson.questions.forEach(q => {
            mcqQuestions.push({
              type: 'mcq',
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.correct, // Handle both correct and correctAnswer
              lessonBai: lesson.bai,
              lessonTitle: lesson.title
            });
          });
        }
      } else if (lesson.type === 'truefalse') {
        if (lesson.questionGroups) {
          lesson.questionGroups.forEach(group => {
            tfGroups.push({
              type: 'tf-group',
              passage: group.passage || '',
              statements: (group.statements || []).map(s => ({
                question: s.question,
                correct: s.correct === true
              })),
              lessonBai: lesson.bai,
              lessonTitle: lesson.title
            });
          });
        }
      } else if (lesson.type === 'shortanswer') {
        if (lesson.questions) {
          lesson.questions.forEach(q => {
            shortAnswers.push({
              type: 'shortanswer',
              question: q.question,
              correctAnswer: String(q.correct).trim(),
              lessonBai: lesson.bai,
              lessonTitle: lesson.title
            });
          });
        }
      }
    });

    // Apply exam mode limits
    let questions = [];
    const shouldShuffle = examMode === 'exam';

    if (shouldShuffle) {
      mcqQuestions = this.shuffle(mcqQuestions);
      tfGroups = this.shuffle(tfGroups);
      shortAnswers = this.shuffle(shortAnswers);
    }

    if (mcqLimit !== null) mcqQuestions = mcqQuestions.slice(0, mcqLimit);
    if (tfLimit !== null) tfGroups = tfGroups.slice(0, tfLimit);
    if (saLimit !== null) shortAnswers = shortAnswers.slice(0, saLimit);

    mcqQuestions = mcqQuestions.map(q => this._shuffleMcqOptions(q));
    
    // Mix everything
    if (shouldShuffle) {
      questions = this.shuffle([...mcqQuestions, ...tfGroups, ...shortAnswers]);
    } else {
      questions = [...mcqQuestions, ...tfGroups, ...shortAnswers];
      questions.sort((a, b) => {
        const baiA = parseInt(a.lessonBai) || 0;
        const baiB = parseInt(b.lessonBai) || 0;
        return baiA - baiB;
      });
    }

    return {
      subject: subjectId,
      questions: questions,
      totalQuestions: questions.length,
      examMode: examMode
    };
  },

  /**
   * Shuffle MCQ options while tracking correct answer
   */
  _shuffleMcqOptions(q) {
    return {
      ...q,
      options: q.options,
      correctAnswer: q.correctAnswer
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLoader;
}
