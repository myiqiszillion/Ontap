/**
 * Question Bank Loader & V2 Normalizer (NTMK Rebuild Phase 02)
 * Loads data/*.json files and normalizes them into Schema V2 format
 */

const fs = require('fs');
const path = require('path');
const QuestionSchemaV2 = require('./schema.js');

const BankLoader = {
  loadNormalizedQuestions(subjectKey, baseDir = process.cwd()) {
    if (!/^[a-z0-9_]+$/.test(subjectKey)) throw new Error('Invalid subject key');
    const fileName = `${subjectKey}.json`;
    const filePath = path.join(baseDir, 'data', fileName);

    if (!fs.existsSync(filePath)) {
      return [];
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const questions = [];

    const gradeMatch = subjectKey.match(/\d+$/);
    const grade = gradeMatch ? parseInt(gradeMatch[0]) : 10;
    const cleanSubject = subjectKey.replace(/\d+$/, '');

    (raw.lessons || []).forEach((lesson, lIdx) => {
      const lessonTitle = lesson.name || `Bài ${lIdx + 1}`;

      // 1. MCQ and Short Answer from questions array
      (lesson.questions || []).forEach((q, qIdx) => {
        const type = q.type || 'mcq';
        const id = `${cleanSubject}${grade}_l${lIdx + 1}_q${qIdx + 1}`;

        if (type === 'mcq') {
          questions.push(QuestionSchemaV2.createQuestion({
            id,
            format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
            subjectId: cleanSubject,
            grade,
            chapter: lessonTitle,
            topic: lessonTitle,
            cognitiveLevel: q.cognitiveLevel || QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
            prompt: q.question,
            imageUri: q.image || null,
            explanation: q.explanation || '',
            mcqPayload: {
              options: q.options || [],
              correctOptionIndex: q.correct !== undefined ? q.correct : (q.correctAnswer !== undefined ? q.correctAnswer : null)
            },
            source: {
              sourceName: 'NTMK Grade 10 Question Bank',
              license: QuestionSchemaV2.LICENSES.EDUCATIONAL_USE,
              verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED
            },
            status: QuestionSchemaV2.PUBLISH_STATUS.REVIEW
          }));
        } else if (type === 'shortanswer') {
          const ans = q.correct !== undefined ? q.correct : q.correctAnswer;
          questions.push(QuestionSchemaV2.createQuestion({
            id,
            format: QuestionSchemaV2.FORMATS.SHORT_ANSWER,
            subjectId: cleanSubject,
            grade,
            chapter: lessonTitle,
            topic: lessonTitle,
            cognitiveLevel: q.cognitiveLevel || QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,
            prompt: q.question,
            explanation: q.explanation || '',
            shortAnswerPayload: {
              correctAnswers: ans === undefined ? [] : [String(ans)]
            },
            source: {
              sourceName: 'NTMK Grade 10 Question Bank',
              license: QuestionSchemaV2.LICENSES.EDUCATIONAL_USE,
              verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED
            },
            status: QuestionSchemaV2.PUBLISH_STATUS.REVIEW
          }));
        }
      });

      // 2. TF Groups from questionGroups array
      (lesson.questionGroups || []).forEach((group, gIdx) => {
        const id = `${cleanSubject}${grade}_l${lIdx + 1}_tf${gIdx + 1}`;
        questions.push(QuestionSchemaV2.createQuestion({
          id,
          format: QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP,
          subjectId: cleanSubject,
          grade,
          chapter: lessonTitle,
          topic: lessonTitle,
          cognitiveLevel: group.cognitiveLevel || QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,
          prompt: group.passage || '',
          tfPayload: {
            passage: group.passage || '',
            statements: (group.statements || []).map((s, sIdx) => ({
              id: `stmt_${String.fromCharCode(97 + sIdx)}`,
              statement: s.question,
              correct: typeof s.correct === 'boolean' ? s.correct : null
            }))
          },
          source: {
            sourceName: 'NTMK Grade 10 Question Bank',
            license: QuestionSchemaV2.LICENSES.EDUCATIONAL_USE,
            verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.UNVERIFIED
          },
          status: QuestionSchemaV2.PUBLISH_STATUS.REVIEW
        }));
      });
    });

    return questions;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BankLoader;
}
