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
    const response = await fetch(`data/${subjectId}.json`);
    if (!response.ok) throw new Error(`Failed to load ${subjectId}.json`);
    const data = await response.json();

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
        // Extract clean title (remove " (Trắc nghiệm)" etc.)
        baiMap[bai].title = lesson.title.replace(/\s*\(Trắc nghiệm\)\s*/i, '').replace(/\s*\(Đúng\/Sai\)\s*/i, '');
      } else if (lesson.type === 'truefalse') {
        baiMap[bai].tfGroupCount = lesson.questionGroups ? lesson.questionGroups.length : 0;
        if (!baiMap[bai].title) {
          baiMap[bai].title = lesson.title.replace(/\s*\(Trắc nghiệm\)\s*/i, '').replace(/\s*\(Đúng\/Sai\)\s*/i, '');
        }
      }
    });

    // Convert to sorted array
    const mergedLessons = Object.values(baiMap).sort((a, b) => a.bai - b.bai).map(b => ({
      bai: b.bai,
      lessonIds: b.lessonIds,
      title: b.title,
      mcqCount: b.mcqCount,
      tfGroupCount: b.tfGroupCount,
      totalItems: b.mcqCount + b.tfGroupCount,
      estimatedTime: Math.ceil((b.mcqCount + b.tfGroupCount * 4) * 1)
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
  async loadQuizData(subjectId, selectedBais, examMode = 'all', mcqLimit = null, tfLimit = null) {
    const response = await fetch(`data/${subjectId}.json`);
    if (!response.ok) throw new Error(`Failed to load ${subjectId}.json`);
    const data = await response.json();

    // Filter lessons by selected bài
    const selectedLessons = data.lessons.filter(l => selectedBais.includes(l.bai));

    // Separate MCQ questions and TF groups
    let mcqQuestions = [];
    let tfGroups = [];

    selectedLessons.forEach(lesson => {
      if (lesson.type === 'multiple' || lesson.type === 'mcq') {
        if (lesson.questions) {
          lesson.questions.forEach(q => {
            mcqQuestions.push({
              type: 'mcq',
              question: q.question,
              options: q.options,
              correctAnswer: q.correct,
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
      }
    });

    // Apply exam mode filtering
    let questions = [];

    if (examMode === 'exam') {
      // Exam format: 12 MCQ + 4 TF groups
      mcqQuestions = this.shuffle(mcqQuestions).slice(0, mcqLimit || 12);
      tfGroups = this.shuffle(tfGroups).slice(0, tfLimit || 4);

      // Shuffle MCQ options
      mcqQuestions = mcqQuestions.map(q => this._shuffleMcqOptions(q));

      questions = [...mcqQuestions, ...tfGroups];
    } else if (examMode === 'mcq') {
      mcqQuestions = this.shuffle(mcqQuestions);
      if (mcqLimit) mcqQuestions = mcqQuestions.slice(0, mcqLimit);
      questions = mcqQuestions.map(q => this._shuffleMcqOptions(q));
    } else if (examMode === 'tf') {
      tfGroups = this.shuffle(tfGroups);
      if (tfLimit) tfGroups = tfGroups.slice(0, tfLimit);
      questions = tfGroups;
    } else {
      // All: mix everything
      mcqQuestions = this.shuffle(mcqQuestions);
      tfGroups = this.shuffle(tfGroups);
      if (mcqLimit) mcqQuestions = mcqQuestions.slice(0, mcqLimit);
      if (tfLimit) tfGroups = tfGroups.slice(0, tfLimit);
      mcqQuestions = mcqQuestions.map(q => this._shuffleMcqOptions(q));
      questions = this.shuffle([...mcqQuestions, ...tfGroups]);
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
    const correctOption = q.options[q.correctAnswer];
    const shuffledOptions = this.shuffle(q.options);
    return {
      ...q,
      options: shuffledOptions,
      correctAnswer: shuffledOptions.indexOf(correctOption)
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLoader;
}
