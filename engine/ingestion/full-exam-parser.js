/**
 * FullExamParser — Automated Whole-Exam Parser conforming to MOET Decision 764/QĐ-BGDĐT
 * NTMK Rebuild Phase GDPT 2018
 *
 * Automatically parses complete Vietnamese high-school exam documents:
 * - Metadata (Subject, Grade, Title, Duration, School)
 * - PHẦN I: Trắc nghiệm 4 phương án (Multiple Choice, Câu 1 -> 12 hoặc 18)
 * - PHẦN II: Trắc nghiệm Đúng/Sai (True/False Groups, 4 lệnh hỏi a, b, c, d)
 * - PHẦN III: Trắc nghiệm trả lời ngắn (Short Answer, Câu 1 -> 6)
 * - Bảng đáp án tách rời (Answer Key Tables paired to questions)
 * - Lời giải chi tiết & Sư phạm (Pedagogical Solutions, Phương pháp, Cạm bẫy)
 * - KaTeX/LaTeX math formula preservation
 */

const QuestionSchemaV2 = require('../schema.js');

class FullExamParser {
  /**
   * Main entry point: Parse full exam text or markdown into structured exam
   * @param {string} rawContent - Raw text or markdown of the exam paper
   * @param {Object} fallbackMetadata - Optional defaults for subjectId, grade, etc.
   */
  static parse(rawContent, fallbackMetadata = {}) {
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Nội dung đề thi không hợp lệ hoặc để trống');
    }

    const text = rawContent.replace(/\r\n/g, '\n').trim();
    const metadata = this.extractMetadata(text, fallbackMetadata);
    const splitSections = this.splitSections(text);

    // Parse Answer Key Table (Bảng đáp án) if present
    const answerKeyMap = this.parseAnswerKeySection(splitSections.answersSectionText);

    // Parse Pedagogical Solutions if present
    const solutionsMap = this.parseSolutionsSection(splitSections.solutionsSectionText);

    // Parse Section I (Multiple Choice)
    const part1Questions = this.parsePart1(
      splitSections.part1Text,
      metadata,
      answerKeyMap.part1,
      solutionsMap.part1
    );

    // Parse Section II (True/False Groups)
    const part2Questions = this.parsePart2(
      splitSections.part2Text,
      metadata,
      answerKeyMap.part2,
      solutionsMap.part2
    );

    // Parse Section III (Short Answer)
    const part3Questions = this.parsePart3(
      splitSections.part3Text,
      metadata,
      answerKeyMap.part3,
      solutionsMap.part3
    );

    const allQuestions = [...part1Questions, ...part2Questions, ...part3Questions];

    // Compute statistics
    const stats = {
      totalQuestions: allQuestions.length,
      part1Count: part1Questions.length,
      part2Count: part2Questions.length,
      part3Count: part3Questions.length,
      hasAnswersCount: allQuestions.filter(q => this._hasValidAnswer(q)).length,
      hasExplanationCount: allQuestions.filter(q => q.explanation && q.explanation.length > 5).length,
      isBlueprintConforming: this._checkBlueprintConformity(metadata.subjectId, part1Questions.length, part2Questions.length, part3Questions.length)
    };

    return {
      metadata,
      sections: [
        {
          sectionId: 'part_1',
          title: 'Phần I: Câu trắc nghiệm nhiều phương án lựa chọn',
          format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
          count: part1Questions.length,
          questions: part1Questions
        },
        {
          sectionId: 'part_2',
          title: 'Phần II: Câu trắc nghiệm đúng sai',
          format: QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP,
          count: part2Questions.length,
          questions: part2Questions
        },
        {
          sectionId: 'part_3',
          title: 'Phần III: Câu trắc nghiệm trả lời ngắn',
          format: QuestionSchemaV2.FORMATS.SHORT_ANSWER,
          count: part3Questions.length,
          questions: part3Questions
        }
      ],
      questions: allQuestions,
      answerKeySummary: answerKeyMap,
      statistics: stats
    };
  }

  /**
   * Extract exam header metadata
   */
  static extractMetadata(text, fallback = {}) {
    const rawLines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const headerLines = rawLines.slice(0, 15);
    const headerBlock = headerLines.join(' ');

    // Subject
    let subjectId = fallback.subjectId || null;
    let subjectName = 'Toán';
    if (/hóa\s*học|hoahoc/i.test(headerBlock)) {
      subjectId = 'hoahoc';
      subjectName = 'Hóa học';
    } else if (/vật\s*l[íy]|vatli/i.test(headerBlock)) {
      subjectId = 'vatli';
      subjectName = 'Vật lí';
    } else if (/tiếng\s*anh|tienganh|english/i.test(headerBlock)) {
      subjectId = 'tienganh';
      subjectName = 'Tiếng Anh';
    } else if (/toán|toan/i.test(headerBlock)) {
      subjectId = 'toan';
      subjectName = 'Toán';
    } else {
      subjectId = fallback.subjectId || 'toan';
      subjectName = subjectId === 'vatli' ? 'Vật lí' : subjectId === 'hoahoc' ? 'Hóa học' : subjectId === 'tienganh' ? 'Tiếng Anh' : 'Toán';
    }

    // Grade
    let grade = fallback.grade ? Number(fallback.grade) : null;
    if (!grade) {
      const gradeMatch = headerBlock.match(/lớp\s*(10|11|12)|khối\s*(10|11|12)/i);
      if (gradeMatch) {
        grade = Number(gradeMatch[1] || gradeMatch[2]);
      } else {
        grade = 12; // Default graduation exam grade
      }
    }

    // Duration
    let durationMinutes = fallback.durationMinutes || null;
    if (!durationMinutes) {
      const durMatch = headerBlock.match(/thời gian(?:\s*làm bài)?:\s*(\d+)\s*phút/i);
      if (durMatch) {
        durationMinutes = Number(durMatch[1]);
      } else {
        durationMinutes = subjectId === 'toan' ? 90 : 50;
      }
    }

    // School / Authority (combines Department and School when present)
    let school = fallback.school || 'TRƯỜNG THPT NGUYỄN THỊ MINH KHAI — TP. DĨ AN, BÌNH DƯƠNG';
    const soGdLine = headerLines.find(l => /SỞ\s*GD&ĐT/i.test(l));
    const thptLine = headerLines.find(l => /TRƯỜNG\s*THPT/i.test(l));
    if (soGdLine && thptLine) {
      school = `${soGdLine} — ${thptLine}`;
    } else if (thptLine) {
      school = thptLine;
    } else if (soGdLine) {
      school = soGdLine;
    }

    // Title
    let title = fallback.title || `Đề Khảo Sát Chất Lượng Môn ${subjectName} ${grade} — GDPT 2018`;
    const titleMatch = headerBlock.match(/(?:KỲ THI|ĐỀ THI|ĐỀ KIỂM TRA)[^–—\n]+/i);
    if (titleMatch) {
      title = titleMatch[0].trim();
    }

    return {
      title,
      school,
      subjectId,
      subjectName,
      grade,
      durationMinutes,
      curriculum: 'GDPT2018',
      standard: 'MOET_764'
    };
  }

  /**
   * Split document into parts (Part I, Part II, Part III, Answer Table, Solutions)
   */
  static splitSections(text) {
    // Markers for parts (must start on a new line to avoid matching inline text like "Đáp án: B")
    const p1Pattern = /(?:^|\n)\s*(?:PHẦN\s+(?:I|1)\b|I\.\s*PHẦN\s*I\b|PHẦN\s*THỨ\s*NHẤT)[^\n]*/i;
    const p2Pattern = /(?:^|\n)\s*(?:PHẦN\s+(?:II|2)\b|II\.\s*PHẦN\s*II\b|PHẦN\s*THỨ\s*HAI)[^\n]*/i;
    const p3Pattern = /(?:^|\n)\s*(?:PHẦN\s+(?:III|3)\b|III\.\s*PHẦN\s*III\b|PHẦN\s*THỨ\s*BA)[^\n]*/i;
    const ansPattern = /(?:^|\n)\s*(?:BẢNG\s+ĐÁP\s+ÁN|ĐÁP\s+ÁN\s+VÀ\s+HƯỚNG\s+DẪN|ĐÁP\s+ÁN\s+CÁC\s+CÂU|ĐÁP\s+ÁN\s+CHI\s+TIẾT|ĐÁP\s+ÁN\s*$)[^\n]*/i;
    const solPattern = /(?:^|\n)\s*(?:HƯỚNG\s+DẪN\s+GIẢI\s+CHI\s+TIẾT|LỜI\s+GIẢI\s+CHI\s+TIẾT|HƯỚNG\s+DẪN\s+GIẢI\s*$)[^\n]*/i;

    let part1Text = '';
    let part2Text = '';
    let part3Text = '';
    let answersSectionText = '';
    let solutionsSectionText = '';

    const p1Match = text.match(p1Pattern);
    const p2Match = text.match(p2Pattern);
    const p3Match = text.match(p3Pattern);
    const ansMatch = text.match(ansPattern);
    const solMatch = text.match(solPattern);

    // Segmenting positions
    const bounds = [];
    if (p1Match && p1Match.index !== undefined) bounds.push({ type: 'part1', idx: p1Match.index });
    if (p2Match && p2Match.index !== undefined) bounds.push({ type: 'part2', idx: p2Match.index });
    if (p3Match && p3Match.index !== undefined) bounds.push({ type: 'part3', idx: p3Match.index });
    if (ansMatch && ansMatch.index !== undefined) bounds.push({ type: 'ans', idx: ansMatch.index });
    if (solMatch && solMatch.index !== undefined) bounds.push({ type: 'sol', idx: solMatch.index });

    bounds.sort((a, b) => a.idx - b.idx);

    for (let i = 0; i < bounds.length; i++) {
      const curr = bounds[i];
      const start = curr.idx;
      const end = i + 1 < bounds.length ? bounds[i + 1].idx : text.length;
      const content = text.slice(start, end).trim();

      if (curr.type === 'part1') part1Text = content;
      else if (curr.type === 'part2') part2Text = content;
      else if (curr.type === 'part3') part3Text = content;
      else if (curr.type === 'ans') answersSectionText = content;
      else if (curr.type === 'sol') solutionsSectionText = content;
    }

    // Fallback: If no explicit PHẦN headings found, treat whole text as Part 1
    if (!part1Text && !part2Text && !part3Text) {
      part1Text = text;
    }

    return {
      part1Text,
      part2Text,
      part3Text,
      answersSectionText,
      solutionsSectionText
    };
  }

  /**
   * Parse detached Answer Key Table (Bảng đáp án)
   */
  static parseAnswerKeySection(ansText) {
    const result = {
      part1: {}, // { 1: 0, 2: 1, ... } (0 for A, 1 for B, 2 for C, 3 for D)
      part2: {}, // { 1: { a: true, b: false, c: true, d: false }, ... }
      part3: {}  // { 1: '1,73', 2: '27', ... }
    };

    if (!ansText) return result;

    const lines = ansText.split('\n').map(l => l.trim()).filter(Boolean);
    let currentPart = 'part1';

    for (const line of lines) {
      if (/phần\s*(?:i|1)\b/i.test(line)) {
        currentPart = 'part1';
        continue;
      }
      if (/phần\s*(?:ii|2)\b/i.test(line)) {
        currentPart = 'part2';
        continue;
      }
      if (/phần\s*(?:iii|3)\b/i.test(line)) {
        currentPart = 'part3';
        continue;
      }

      // Check Part 1 answers: "1. A", "1-A", "Câu 1: A", "1.A | 2.B"
      if (currentPart === 'part1') {
        const mcqMatches = line.matchAll(/(?:câu\s*)?(\d+)[\s.:\-–]+([A-D])\b/gi);
        for (const m of mcqMatches) {
          const qNum = parseInt(m[1], 10);
          const optChar = m[2].toUpperCase();
          result.part1[qNum] = 'ABCD'.indexOf(optChar);
        }
      }

      // Check Part 2 answers: "Câu 1: a-Đ, b-S, c-Đ, d-Đ" or "1: a-Đ, b-S..." or "1: Đ-S-Đ-S"
      if (currentPart === 'part2') {
        const qNumMatch = line.match(/(?:câu\s*)?(\d+)[:.\-–]\s*(.+)/i);
        if (qNumMatch) {
          const qNum = parseInt(qNumMatch[1], 10);
          const rest = qNumMatch[2];
          const tfMap = {};

          // Format: a-Đ, b-S or a: Đúng, b: Sai
          const stmtMatches = rest.matchAll(/([a-d])[\s:\-–]+(Đúng|Sai|Đ|S|True|False|T|F)/gi);
          for (const sm of stmtMatches) {
            const letter = sm[1].toLowerCase();
            const val = sm[2].toUpperCase();
            tfMap[letter] = ['ĐÚNG', 'Đ', 'TRUE', 'T'].includes(val);
          }

          // Format: Đ - S - Đ - S (4 values in sequence)
          if (Object.keys(tfMap).length === 0) {
            const seq = rest.split(/[\s,–-]+/).map(s => s.trim().toUpperCase()).filter(s => ['Đ', 'S', 'ĐÚNG', 'SAI', 'T', 'F'].includes(s));
            if (seq.length >= 4) {
              ['a', 'b', 'c', 'd'].forEach((letter, idx) => {
                tfMap[letter] = ['Đ', 'ĐÚNG', 'T'].includes(seq[idx]);
              });
            }
          }

          if (Object.keys(tfMap).length > 0) {
            result.part2[qNum] = tfMap;
          }
        }
      }

      // Check Part 3 answers: "Câu 1: 1,73", "1. 1,73 | 2. 27", "1: -3,5"
      if (currentPart === 'part3') {
        const saMatches = line.matchAll(/(?:câu\s*)?(\d+)[\s.:\-–]+([^\s|;]+)/gi);
        for (const sm of saMatches) {
          const qNum = parseInt(sm[1], 10);
          const val = sm[2].trim();
          if (val && !/^(câu|phần|đáp)$/i.test(val)) {
            result.part3[qNum] = val;
          }
        }
      }
    }

    return result;
  }

  /**
   * Parse Pedagogical Solutions / Hướng dẫn giải chi tiết
   */
  static parseSolutionsSection(solText) {
    const result = {
      part1: {},
      part2: {},
      part3: {}
    };

    if (!solText) return result;

    const lines = solText.split('\n');
    let currentPart = 'part1';
    let currentQ = null;
    let buffer = [];

    const flush = () => {
      if (currentQ && buffer.length > 0) {
        result[currentPart][currentQ] = buffer.join('\n').trim();
      }
      buffer = [];
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      if (/phần\s*(?:i|1)\b/i.test(line)) {
        flush();
        currentPart = 'part1';
        currentQ = null;
        continue;
      }
      if (/phần\s*(?:ii|2)\b/i.test(line)) {
        flush();
        currentPart = 'part2';
        currentQ = null;
        continue;
      }
      if (/phần\s*(?:iii|3)\b/i.test(line)) {
        flush();
        currentPart = 'part3';
        currentQ = null;
        continue;
      }

      // Match question start in solution: "Câu 1:", "Phần I - Câu 1:", "1."
      const qMatch = line.match(/^(?:phần\s*(?:[iI]{1,3}|[1-3])\s*[-–]\s*)?câu\s*(\d+)[:.]\s*(.*)/i);
      if (qMatch) {
        flush();
        currentQ = parseInt(qMatch[1], 10);
        if (qMatch[2]) buffer.push(qMatch[2]);
      } else if (currentQ) {
        buffer.push(line);
      }
    }
    flush();

    return result;
  }

  /**
   * Split a section text block into individual question blocks (starts with "Câu X:")
   */
  static splitQuestionBlocks(sectionText) {
    const lines = sectionText.split('\n');
    const blocks = [];
    let currentLines = [];
    let questionNumber = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      const qMatch = line.match(/^câu\s*(\d+)[:.]\s*(.*)/i);
      if (qMatch) {
        if (currentLines.length > 0) {
          blocks.push({
            number: questionNumber,
            rawText: currentLines.join('\n').trim()
          });
        }
        questionNumber = parseInt(qMatch[1], 10);
        currentLines = [line];
      } else if (currentLines.length > 0) {
        currentLines.push(rawLine);
      }
    }

    if (currentLines.length > 0) {
      blocks.push({
        number: questionNumber,
        rawText: currentLines.join('\n').trim()
      });
    }

    return blocks;
  }

  /**
   * Parse Phần I: Multiple Choice Questions (4 options A, B, C, D)
   */
  static parsePart1(text, metadata, tableAnswers = {}, tableSolutions = {}) {
    const blocks = this.splitQuestionBlocks(text);
    const questions = [];

    blocks.forEach((block, idx) => {
      const qNum = block.number || (idx + 1);
      const lines = block.rawText.split('\n').map(l => l.trim()).filter(Boolean);

      let promptLines = [];
      const options = [];
      let inlineAnswer = null;
      let inlineExplanation = '';

      lines.forEach(line => {
        // Detect option A., B., C., D.
        const optMatch = line.match(/^([A-D])\.\s*(.+)$/i);
        if (optMatch) {
          const index = 'ABCD'.indexOf(optMatch[1].toUpperCase());
          options[index] = optMatch[2].trim();
          return;
        }

        // Inline answers: "Đáp án: A", "Chọn A", "Đáp án chính xác: B"
        const ansMatch = line.match(/^(?:đáp án(?:\s*chính xác)?|chọn):\s*([A-D])\b/i);
        if (ansMatch) {
          inlineAnswer = 'ABCD'.indexOf(ansMatch[1].toUpperCase());
          return;
        }

        // Inline solution: "Hướng dẫn giải: ..."
        const solMatch = line.match(/^(?:hướng dẫn giải|lời giải):\s*(.+)/i);
        if (solMatch) {
          inlineExplanation = solMatch[1].trim();
          return;
        }

        // If no options yet, it's prompt line
        if (options.length === 0) {
          const cleanLine = line.replace(/^câu\s*\d+[:.]\s*/i, '');
          if (cleanLine) promptLines.push(cleanLine);
        }
      });

      // Handle multi-column inline options if single line contained A. ... B. ...
      if (options.length < 2) {
        const fullBlock = block.rawText;
        const inlineOpts = [...fullBlock.matchAll(/([A-D])\.\s*([^A-D\n]+)/g)];
        if (inlineOpts.length >= 2) {
          inlineOpts.forEach(match => {
            const idx = 'ABCD'.indexOf(match[1].toUpperCase());
            options[idx] = match[2].trim();
          });
        }
      }

      // Determine correct option: inline > table
      let correctOptionIndex = inlineAnswer;
      if ((correctOptionIndex === null || correctOptionIndex === undefined) && tableAnswers[qNum] !== undefined) {
        correctOptionIndex = tableAnswers[qNum];
      }

      const explanation = inlineExplanation || tableSolutions[qNum] || '';
      const prompt = promptLines.join(' ').trim();

      const qId = `${metadata.subjectId}${metadata.grade}_p1_c${String(qNum).padStart(2, '0')}`;

      questions.push({
        id: qId,
        questionNumber: qNum,
        sectionId: 'part_1',
        format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
        prompt: prompt || `Câu hỏi trắc nghiệm số ${qNum}`,
        mcqPayload: {
          options: options.map(o => (o ? String(o).trim() : '')),
          correctOptionIndex: correctOptionIndex !== null && correctOptionIndex >= 0 ? correctOptionIndex : null
        },
        explanation,
        cognitiveLevel: idx < 6 ? QuestionSchemaV2.COGNITIVE_LEVELS.RECOGNIZE : QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
        metadata: {
          ...metadata,
          sourceSection: 'PHẦN I',
          originalNumber: qNum
        }
      });
    });

    return questions;
  }

  /**
   * Parse Phần II: True/False Question Groups (Statements a, b, c, d)
   */
  static parsePart2(text, metadata, tableAnswers = {}, tableSolutions = {}) {
    const blocks = this.splitQuestionBlocks(text);
    const questions = [];

    blocks.forEach((block, idx) => {
      const qNum = block.number || (idx + 1);
      const lines = block.rawText.split('\n').map(l => l.trim()).filter(Boolean);

      let passageLines = [];
      const statements = [];
      let inlineExplanation = '';

      lines.forEach(line => {
        // Detect statement line: "a) ... [-: Đúng/Sai]", "a. ..."
        const stmtMatch = line.match(/^([a-d])[\)\.]\s*(.+?)(?:\s*[-–:]\s*(đúng|sai|đ|s))?$/i);
        if (stmtMatch) {
          const letter = stmtMatch[1].toLowerCase();
          const stmtText = stmtMatch[2].trim();
          let isCorrect = null;

          if (stmtMatch[3]) {
            const rawVal = stmtMatch[3].toUpperCase();
            isCorrect = ['ĐÚNG', 'Đ'].includes(rawVal);
          } else if (tableAnswers[qNum] && tableAnswers[qNum][letter] !== undefined) {
            isCorrect = tableAnswers[qNum][letter];
          }

          statements.push({
            id: `stmt_${letter}`,
            letter,
            statement: stmtText,
            correct: isCorrect
          });
          return;
        }

        // Inline explanation
        const solMatch = line.match(/^(?:hướng dẫn giải|lời giải):\s*(.+)/i);
        if (solMatch) {
          inlineExplanation = solMatch[1].trim();
          return;
        }

        // Prompt/Passage
        if (statements.length === 0) {
          const cleanLine = line.replace(/^câu\s*\d+[:.]\s*/i, '');
          if (cleanLine) passageLines.push(cleanLine);
        }
      });

      // Ensure all 4 statements (a, b, c, d) exist
      ['a', 'b', 'c', 'd'].forEach(letter => {
        if (!statements.some(s => s.letter === letter)) {
          let isCorrect = null;
          if (tableAnswers[qNum] && tableAnswers[qNum][letter] !== undefined) {
            isCorrect = tableAnswers[qNum][letter];
          }
          statements.push({
            id: `stmt_${letter}`,
            letter,
            statement: `Mệnh đề ${letter}`,
            correct: isCorrect
          });
        }
      });

      statements.sort((a, b) => a.letter.localeCompare(b.letter));

      const passage = passageLines.join(' ').trim();
      const explanation = inlineExplanation || tableSolutions[qNum] || '';
      const qId = `${metadata.subjectId}${metadata.grade}_p2_c${String(qNum).padStart(2, '0')}`;

      questions.push({
        id: qId,
        questionNumber: qNum,
        sectionId: 'part_2',
        format: QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP,
        prompt: passage || `Câu hỏi đúng sai số ${qNum}`,
        tfPayload: {
          passage: passage || `Câu hỏi đúng sai số ${qNum}`,
          statements: statements.map(s => ({
            id: s.id,
            statement: s.statement,
            correct: s.correct
          }))
        },
        explanation,
        cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,
        metadata: {
          ...metadata,
          sourceSection: 'PHẦN II',
          originalNumber: qNum
        }
      });
    });

    return questions;
  }

  /**
   * Parse Phần III: Short Answer Questions (Numerical / exact value)
   */
  static parsePart3(text, metadata, tableAnswers = {}, tableSolutions = {}) {
    const blocks = this.splitQuestionBlocks(text);
    const questions = [];

    blocks.forEach((block, idx) => {
      const qNum = block.number || (idx + 1);
      const lines = block.rawText.split('\n').map(l => l.trim()).filter(Boolean);

      let promptLines = [];
      let inlineAnswer = null;
      let inlineExplanation = '';

      lines.forEach(line => {
        // Detect answer line: "Đáp án: 1,73", "Kết quả: 27"
        const ansMatch = line.match(/^(?:đáp án(?:\s*chính xác)?|kết quả):\s*([^\n]+)/i);
        if (ansMatch) {
          inlineAnswer = ansMatch[1].trim();
          return;
        }

        // Inline explanation
        const solMatch = line.match(/^(?:hướng dẫn giải|lời giải):\s*(.+)/i);
        if (solMatch) {
          inlineExplanation = solMatch[1].trim();
          return;
        }

        // Prompt lines
        const cleanLine = line.replace(/^câu\s*\d+[:.]\s*/i, '');
        if (cleanLine) promptLines.push(cleanLine);
      });

      // Determine correct answer
      let finalAnswer = inlineAnswer;
      if (!finalAnswer && tableAnswers[qNum] !== undefined) {
        finalAnswer = tableAnswers[qNum];
      }

      const prompt = promptLines.join(' ').trim();
      const explanation = inlineExplanation || tableSolutions[qNum] || '';
      const qId = `${metadata.subjectId}${metadata.grade}_p3_c${String(qNum).padStart(2, '0')}`;

      questions.push({
        id: qId,
        questionNumber: qNum,
        sectionId: 'part_3',
        format: QuestionSchemaV2.FORMATS.SHORT_ANSWER,
        prompt: prompt || `Câu hỏi trả lời ngắn số ${qNum}`,
        shortAnswerPayload: {
          correctAnswers: finalAnswer ? [String(finalAnswer).trim()] : [],
          allowUnitStripping: true
        },
        explanation,
        cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.HIGH_APPLY,
        metadata: {
          ...metadata,
          sourceSection: 'PHẦN III',
          originalNumber: qNum
        }
      });
    });

    return questions;
  }

  static _hasValidAnswer(q) {
    if (q.format === QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE) {
      return q.mcqPayload && q.mcqPayload.correctOptionIndex !== null && q.mcqPayload.correctOptionIndex !== undefined;
    }
    if (q.format === QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP) {
      return q.tfPayload && Array.isArray(q.tfPayload.statements) && q.tfPayload.statements.every(s => typeof s.correct === 'boolean');
    }
    if (q.format === QuestionSchemaV2.FORMATS.SHORT_ANSWER) {
      return q.shortAnswerPayload && Array.isArray(q.shortAnswerPayload.correctAnswers) && q.shortAnswerPayload.correctAnswers.length > 0;
    }
    return false;
  }

  static _checkBlueprintConformity(subjectId, p1Count, p2Count, p3Count) {
    if (subjectId === 'toan') {
      return p1Count === 12 && p2Count === 4 && p3Count === 6;
    }
    if (subjectId === 'vatli' || subjectId === 'hoahoc') {
      return p1Count === 18 && p2Count === 4 && p3Count === 6;
    }
    if (subjectId === 'tienganh') {
      return p1Count === 40;
    }
    return false;
  }
}

module.exports = FullExamParser;
