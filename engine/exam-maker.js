/**
 * ExamMaker — MOET Decision 764/QĐ-BGDĐT Auto Exam Maker Engine
 * Generates 4 balanced exam variant codes (101, 102, 103, 104) with
 * deterministic shuffling, option permutation, and institutional branding:
 * THPT Nguyễn Thị Minh Khai — TP. Dĩ An, Tỉnh Bình Dương.
 */

const QuestionSchemaV2 = require('./schema.js');
const BlueprintGenerator = require('./blueprint-generator.js');

class ExamMaker {
  /**
   * Deterministic Pseudo-Random Number Generator (PRNG) based on seed
   */
  static _createPrng(seedStr) {
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = (hash << 5) - hash + seedStr.charCodeAt(i);
      hash |= 0;
    }
    let state = Math.abs(hash) || 123456789;
    return function next() {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Deterministic Fisher-Yates shuffle using seeded PRNG
   */
  static _deterministicShuffle(array, prng) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(prng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Permute options of an MCQ and compute new correctOptionIndex
   */
  static _permuteMcqOptions(question, prng) {
    if (!question.mcqPayload || !Array.isArray(question.mcqPayload.options)) {
      return question;
    }

    const originalOpts = question.mcqPayload.options;
    const origCorrectIdx = question.mcqPayload.correctOptionIndex;

    // Pair options with their original index
    const paired = originalOpts.map((opt, idx) => ({
      text: opt,
      originalIdx: idx
    }));

    const shuffled = this._deterministicShuffle(paired, prng);
    const newOptions = shuffled.map(p => p.text);
    const newCorrectIdx = origCorrectIdx !== null && origCorrectIdx !== undefined
      ? shuffled.findIndex(p => p.originalIdx === origCorrectIdx)
      : null;

    return {
      ...question,
      mcqPayload: {
        ...question.mcqPayload,
        options: newOptions,
        correctOptionIndex: newCorrectIdx >= 0 ? newCorrectIdx : null
      }
    };
  }

  /**
   * Build complete 4-variant exam package from parsed exam or question bank
   * @param {Object} examData - Parsed exam object from FullExamParser or question list
   * @param {Object} options - Custom options (school, year, variantCodes)
   */
  static makeExamVariants(examData, options = {}) {
    if (!examData) {
      throw new Error('examData is required to make exam variants');
    }

    const variantCodes = options.variantCodes || ['101', '102', '103', '104'];
    const subjectId = examData.metadata?.subjectId || options.subjectId || 'toan';
    const grade = examData.metadata?.grade || options.grade || 12;
    const durationMinutes = examData.metadata?.durationMinutes || (subjectId === 'toan' ? 90 : 50);

    const institution = {
      authority: options.authority || 'SỞ GIÁO DỤC VÀ ĐÀO TẠO BÌNH DƯƠNG',
      school: options.school || 'TRƯỜNG THPT NGUYỄN THỊ MINH KHAI',
      location: 'TP. Dĩ An, Tỉnh Bình Dương',
      examTitle: examData.metadata?.title || `KỲ THI KHẢO SÁT CHẤT LƯỢNG — GDPT 2018`,
      academicYear: options.academicYear || 'NĂM HỌC 2024 - 2025',
      subjectName: examData.metadata?.subjectName || (subjectId === 'toan' ? 'Toán học' : subjectId === 'vatli' ? 'Vật lí' : subjectId === 'hoahoc' ? 'Hóa học' : 'Tiếng Anh'),
      grade,
      durationMinutes,
      standard: 'Quyết định 764/QĐ-BGDĐT'
    };

    // Extract questions by section from input
    let p1Questions = [];
    let p2Questions = [];
    let p3Questions = [];

    if (Array.isArray(examData.sections)) {
      const s1 = examData.sections.find(s => s.sectionId === 'part_1');
      const s2 = examData.sections.find(s => s.sectionId === 'part_2');
      const s3 = examData.sections.find(s => s.sectionId === 'part_3');
      if (s1) p1Questions = s1.questions || [];
      if (s2) p2Questions = s2.questions || [];
      if (s3) p3Questions = s3.questions || [];
    } else if (Array.isArray(examData.questions)) {
      p1Questions = examData.questions.filter(q => q.format === QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE || q.sectionId === 'part_1');
      p2Questions = examData.questions.filter(q => q.format === QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP || q.sectionId === 'part_2');
      p3Questions = examData.questions.filter(q => q.format === QuestionSchemaV2.FORMATS.SHORT_ANSWER || q.sectionId === 'part_3');
    }

    const variants = {};
    const answerMatrices = {};

    variantCodes.forEach((code, vIdx) => {
      const prng = this._createPrng(`NTMK_${subjectId}_${grade}_${code}`);

      // Variant 101 is baseline; others are deterministically permuted
      let varP1 = [...p1Questions];
      let varP2 = [...p2Questions];
      let varP3 = [...p3Questions];

      if (vIdx > 0) {
        varP1 = this._deterministicShuffle(varP1, prng);
        varP2 = this._deterministicShuffle(varP2, prng);
        varP3 = this._deterministicShuffle(varP3, prng);

        // Permute options for MCQ in variants 102, 103, 104
        varP1 = varP1.map(q => this._permuteMcqOptions(q, prng));
      }

      // Re-number questions sequentially within each section
      const numberedP1 = varP1.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
      const numberedP2 = varP2.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));
      const numberedP3 = varP3.map((q, idx) => ({ ...q, questionNumber: idx + 1 }));

      const allVariantQuestions = [...numberedP1, ...numberedP2, ...numberedP3];

      // Extract answer key for this variant code
      const codeAnswers = {
        code,
        part1: numberedP1.map((q, idx) => {
          const optIdx = q.mcqPayload?.correctOptionIndex;
          const letter = optIdx !== null && optIdx !== undefined && optIdx >= 0 && optIdx < 4 ? 'ABCD'[optIdx] : '?';
          return { questionNumber: idx + 1, answer: letter };
        }),
        part2: numberedP2.map((q, idx) => {
          const stmts = q.tfPayload?.statements || [];
          const stmtMap = {};
          stmts.forEach((s, sIdx) => {
            const letter = 'abcd'[sIdx];
            stmtMap[letter] = s.correct === true ? 'Đ' : s.correct === false ? 'S' : '?';
          });
          return { questionNumber: idx + 1, answers: stmtMap };
        }),
        part3: numberedP3.map((q, idx) => {
          const ans = q.shortAnswerPayload?.correctAnswers?.[0] || '?';
          return { questionNumber: idx + 1, answer: ans };
        })
      };

      answerMatrices[code] = codeAnswers;

      variants[code] = {
        code,
        institution,
        sections: [
          {
            sectionId: 'part_1',
            title: 'Phần I: Câu trắc nghiệm nhiều phương án lựa chọn',
            format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
            instructions: 'Thí sinh trả lời từ câu 1 đến câu ' + numberedP1.length + '. Mỗi câu hỏi thí sinh chỉ chọn một phương án.',
            questions: numberedP1
          },
          {
            sectionId: 'part_2',
            title: 'Phần II: Câu trắc nghiệm đúng sai',
            format: QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP,
            instructions: 'Thí sinh trả lời từ câu 1 đến câu ' + numberedP2.length + '. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.',
            questions: numberedP2
          },
          {
            sectionId: 'part_3',
            title: 'Phần III: Câu trắc nghiệm trả lời ngắn',
            format: QuestionSchemaV2.FORMATS.SHORT_ANSWER,
            instructions: 'Thí sinh trả lời từ câu 1 đến câu ' + numberedP3.length + '.',
            questions: numberedP3
          }
        ],
        totalQuestions: allVariantQuestions.length,
        answers: codeAnswers
      };
    });

    return {
      success: true,
      institution,
      variantCodes,
      variants,
      answerMatrices,
      masterQuestionsCount: {
        part1: p1Questions.length,
        part2: p2Questions.length,
        part3: p3Questions.length,
        total: p1Questions.length + p2Questions.length + p3Questions.length
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Helper: Generate exam directly from Question Bank pool using blueprint
   */
  static makeExamFromPool(pool, subjectId, grade, options = {}) {
    const assembled = BlueprintGenerator.assembleExam(pool, subjectId, options);
    return this.makeExamVariants(assembled, {
      ...options,
      subjectId,
      grade
    });
  }
}

module.exports = ExamMaker;
