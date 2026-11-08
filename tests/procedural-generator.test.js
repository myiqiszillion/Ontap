const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const ProceduralGenerator = require('../engine/procedural-generator.js');
const QuestionValidator = require('../engine/validator.js');
const QuestionSchemaV2 = require('../engine/schema.js');
const ExamService = require('../engine/exam-service.js');
const questionsHandler = require('../api/v2/questions.js');

describe('Autonomous Procedural Question Generation & Zero-Download Core Engine', () => {
  const CORE_SUBJECTS = ['toan', 'vatli', 'hoahoc', 'sinhhoc', 'lichsu', 'tienganh'];

  describe('1. Multi-Subject Procedural Synthesis', () => {
    CORE_SUBJECTS.forEach(subjectId => {
      it(`1.1 Procedurally synthesizes valid Multiple Choice Question for ${subjectId}`, () => {
        const q = ProceduralGenerator.generateQuestion(subjectId, 11, QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE);
        assert.ok(q, 'Question must be generated');
        assert.equal(q.subjectId, subjectId);
        assert.equal(q.grade, 11);
        assert.equal(q.format, QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE);
        assert.ok(q.mcqPayload, 'MCQ payload must be present');
        assert.equal(q.mcqPayload.options.length, 4, 'Must have 4 options');
        assert.ok(Number.isInteger(q.mcqPayload.correctOptionIndex));

        const val = QuestionValidator.validate(q);
        assert.equal(val.valid, true, `Validation failed: ${val.errors.join('; ')}`);
      });
    });

    const TF_SUBJECTS = ['toan', 'vatli', 'hoahoc', 'sinhhoc', 'lichsu'];
    TF_SUBJECTS.forEach(subjectId => {
      it(`1.2 Procedurally synthesizes valid True/False Group Question for ${subjectId}`, () => {
        const q = ProceduralGenerator.generateQuestion(subjectId, 11, QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP);
        assert.ok(q);
        assert.equal(q.format, QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP);
        assert.ok(q.tfPayload, 'TF payload must be present');
        assert.equal(q.tfPayload.statements.length, 4, 'Must have 4 statements (a, b, c, d)');
        q.tfPayload.statements.forEach(stmt => {
          assert.equal(typeof stmt.correct, 'boolean');
          assert.ok(stmt.statement && stmt.statement.length > 0);
        });

        const val = QuestionValidator.validate(q);
        assert.equal(val.valid, true, `Validation failed: ${val.errors.join('; ')}`);
      });
    });

    const SHORT_ANSWER_SUBJECTS = ['toan', 'vatli', 'hoahoc', 'sinhhoc'];
    SHORT_ANSWER_SUBJECTS.forEach(subjectId => {
      it(`1.3 Procedurally synthesizes valid Short Answer Question for ${subjectId}`, () => {
        const q = ProceduralGenerator.generateQuestion(subjectId, 11, QuestionSchemaV2.FORMATS.SHORT_ANSWER);
        assert.ok(q);
        assert.equal(q.format, QuestionSchemaV2.FORMATS.SHORT_ANSWER);
        assert.ok(q.shortAnswerPayload, 'Short answer payload must be present');
        assert.ok(Array.isArray(q.shortAnswerPayload.correctAnswers));
        assert.ok(q.shortAnswerPayload.correctAnswers.length > 0);

        const val = QuestionValidator.validate(q);
        assert.equal(val.valid, true, `Validation failed: ${val.errors.join('; ')}`);
      });
    });
  });

  describe('2. MOET Decision 764/QD-BGDDT Complete Exam Assembly', () => {
    it('2.1 Synthesizes complete Toan 11 exam (22 questions, 3 parts, 90 mins)', () => {
      const exam = ProceduralGenerator.generateExam('toan', 11);
      assert.equal(exam.subjectId, 'toan');
      assert.equal(exam.durationMinutes, 90);
      assert.equal(exam.totalQuestions, 22);
      assert.equal(exam.sections.length, 3);
      assert.equal(exam.sections[0].questions.length, 12); // Part I
      assert.equal(exam.sections[1].questions.length, 4);  // Part II
      assert.equal(exam.sections[2].questions.length, 6);  // Part III
      assert.equal(exam.isFullySaturated, true);
    });

    it('2.2 Synthesizes complete Vat li 11 exam (28 questions, 3 parts, 50 mins)', () => {
      const exam = ProceduralGenerator.generateExam('vatli', 11);
      assert.equal(exam.subjectId, 'vatli');
      assert.equal(exam.durationMinutes, 50);
      assert.equal(exam.totalQuestions, 28);
      assert.equal(exam.sections.length, 3);
      assert.equal(exam.sections[0].questions.length, 18);
      assert.equal(exam.sections[1].questions.length, 4);
      assert.equal(exam.sections[2].questions.length, 6);
    });

    it('2.3 Synthesizes complete Sinh hoc 11 exam (28 questions, 3 parts, 50 mins)', () => {
      const exam = ProceduralGenerator.generateExam('sinhhoc', 11);
      assert.equal(exam.subjectId, 'sinhhoc');
      assert.equal(exam.durationMinutes, 50);
      assert.equal(exam.totalQuestions, 28);
    });

    it('2.4 Synthesizes complete Lich su 11 exam (24 questions, 2 parts, 50 mins)', () => {
      const exam = ProceduralGenerator.generateExam('lichsu', 11);
      assert.equal(exam.subjectId, 'lichsu');
      assert.equal(exam.durationMinutes, 50);
      assert.equal(exam.totalQuestions, 24);
      assert.equal(exam.sections.length, 2);
      assert.equal(exam.sections[0].questions.length, 20); // 20 CHTN
      assert.equal(exam.sections[1].questions.length, 4);  // 4 Dung/Sai
    });

    it('2.5 Synthesizes complete Tieng Anh 11 exam (40 questions, 50 mins)', () => {
      const exam = ProceduralGenerator.generateExam('tienganh', 11);
      assert.equal(exam.subjectId, 'tienganh');
      assert.equal(exam.durationMinutes, 50);
      assert.equal(exam.totalQuestions, 40);
    });
  });

  describe('3. ExamService Procedural Integration', () => {
    it('3.1 ExamService.startProcedural initiates active exam session without disk data', () => {
      const dummyBank = { query: () => ({ questions: [] }) };
      const examService = new ExamService(dummyBank);
      const session = examService.startProcedural('toan', 11);

      assert.ok(session.sessionId);
      assert.ok(session.token);
      assert.ok(session.expiresAt > Date.now());
      assert.equal(session.questions.length, 22);

      // Verify answers are stripped for student safety
      session.questions.forEach(q => {
        if (q.mcqPayload) {
          assert.equal(q.mcqPayload.correctOptionIndex, undefined);
        }
        if (q.tfPayload && q.tfPayload.statements) {
          q.tfPayload.statements.forEach(stmt => {
            assert.equal(stmt.correct, undefined);
          });
        }
        if (q.shortAnswerPayload) {
          assert.equal(q.shortAnswerPayload.correctAnswers, undefined);
        }
      });
    });

    it('3.2 ExamService.start with options.mode = "procedural" delegates to startProcedural', () => {
      const dummyBank = { query: () => ({ questions: [] }) };
      const examService = new ExamService(dummyBank);
      const session = examService.start('vatli', 11, { mode: 'procedural' });
      assert.ok(session.sessionId);
      assert.equal(session.questions.length, 28);
    });
  });

  describe('4. API V2 Integration Endpoints', () => {
    it('4.1 GET /api/v2/questions?action=generate returns batch of procedural questions', () => {
      let resJson = null;
      let resStatus = null;
      const req = {
        method: 'GET',
        url: '/api/v2/questions?action=generate&subject=toan&grade=11&count=5',
        query: { action: 'generate', subject: 'toan', grade: '11', count: '5' }
      };
      const res = {
        setHeader: () => {},
        status: (code) => {
          resStatus = code;
          return { json: (data) => { resJson = data; } };
        }
      };

      questionsHandler(req, res);
      assert.equal(resStatus, 200);
      assert.equal(resJson.total, 5);
      assert.equal(resJson.subjectId, 'toan');
      assert.equal(resJson.questions.length, 5);
    });

    it('4.2 GET /api/v2/questions?action=generate_exam returns complete Decision 764 exam package', () => {
      let resJson = null;
      let resStatus = null;
      const req = {
        method: 'GET',
        url: '/api/v2/questions?action=generate_exam&subject=hoahoc&grade=11',
        query: { action: 'generate_exam', subject: 'hoahoc', grade: '11' }
      };
      const res = {
        setHeader: () => {},
        status: (code) => {
          resStatus = code;
          return { json: (data) => { resJson = data; } };
        }
      };

      questionsHandler(req, res);
      assert.equal(resStatus, 200);
      assert.equal(resJson.subjectId, 'hoahoc');
      assert.equal(resJson.totalQuestions, 28);
      assert.ok(resJson.sections);
    });
  });
});
