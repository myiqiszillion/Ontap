const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const CORE_SUBJECT_IDS = [
  'toan11', 'vatli11', 'hoahoc11', 'tienganh11',
  'toan12', 'vatli12', 'hoahoc12', 'tienganh12'
];

describe('Curriculum Expansion — Grade 11 & 12 Question Banks (Decision 764/QĐ-BGDĐT)', () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const subjectsPath = path.join(dataDir, 'subjects.json');

  test('data/subjects.json activates all 8 core subjects for Grades 11 and 12', () => {
    assert.ok(fs.existsSync(subjectsPath), 'data/subjects.json must exist');
    const catalog = JSON.parse(fs.readFileSync(subjectsPath, 'utf8'));
    assert.ok(Array.isArray(catalog.subjects), 'subjects.json must contain subjects array');

    CORE_SUBJECT_IDS.forEach(id => {
      const subject = catalog.subjects.find(s => s.id === id);
      assert.ok(subject, `Subject ${id} must exist in subjects catalog`);
      assert.strictEqual(subject.ready, true, `Subject ${id} must have ready: true`);
      assert.strictEqual(subject.status, 'active', `Subject ${id} must have status: "active"`);
      assert.strictEqual(subject.dataFile, `${id}.json`, `Subject ${id} dataFile must be ${id}.json`);
      assert.ok(subject.grade === 11 || subject.grade === 12, `Subject ${id} must be grade 11 or 12`);
      assert.ok(subject.name && subject.name.length > 0, `Subject ${id} must have a name`);
      assert.ok(subject.examStructure, `Subject ${id} must specify examStructure`);
    });
  });

  test('All 8 question bank files exist and contain valid JSON with correct top-level schema', () => {
    CORE_SUBJECT_IDS.forEach(id => {
      const filePath = path.join(dataDir, `${id}.json`);
      assert.ok(fs.existsSync(filePath), `Question bank file data/${id}.json must exist`);
      
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      assert.ok(content.subject && typeof content.subject === 'string', `${id}.json must have "subject" string`);
      assert.ok(Array.isArray(content.lessons), `${id}.json must have "lessons" array`);
      assert.ok(content.lessons.length >= 2, `${id}.json must contain at least 2 lessons`);
    });
  });

  test('Decision 764 schema conformance: MCQ, True/False groups, and Short Answer structures', () => {
    CORE_SUBJECT_IDS.forEach(id => {
      const filePath = path.join(dataDir, `${id}.json`);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      content.lessons.forEach((lesson, lIdx) => {
        assert.ok(lesson.name && typeof lesson.name === 'string', `${id} lesson ${lIdx} must have name`);
        assert.ok(Array.isArray(lesson.questions), `${id} lesson "${lesson.name}" must have questions array`);
        assert.ok(lesson.questions.length > 0, `${id} lesson "${lesson.name}" must have questions`);

        // Check individual questions
        lesson.questions.forEach((q, qIdx) => {
          assert.ok(['mcq', 'shortanswer'].includes(q.type), `${id} question ${qIdx} has valid type`);
          assert.ok(q.question && q.question.length > 5, `${id} question ${qIdx} has descriptive prompt`);
          assert.ok(q.explanation && q.explanation.length > 5, `${id} question ${qIdx} has explanation`);

          if (q.type === 'mcq') {
            assert.ok(Array.isArray(q.options), `${id} MCQ ${qIdx} must have options array`);
            assert.strictEqual(q.options.length, 4, `${id} MCQ ${qIdx} must have exactly 4 options`);
            assert.ok([0, 1, 2, 3].includes(q.correct), `${id} MCQ ${qIdx} correct index must be 0-3`);
          } else if (q.type === 'shortanswer') {
            assert.ok(q.correct !== undefined && q.correct !== null, `${id} shortanswer ${qIdx} must define correct`);
          }
        });

        // Check True/False question groups for STEM subjects
        if (id.startsWith('toan') || id.startsWith('vatli') || id.startsWith('hoahoc')) {
          assert.ok(Array.isArray(lesson.questionGroups), `${id} lesson "${lesson.name}" must have questionGroups array`);
          assert.ok(lesson.questionGroups.length > 0, `${id} lesson "${lesson.name}" must contain at least 1 questionGroup`);

          lesson.questionGroups.forEach((group, gIdx) => {
            assert.ok(group.passage && group.passage.length > 10, `${id} group ${gIdx} must have passage context`);
            assert.ok(Array.isArray(group.statements), `${id} group ${gIdx} must have statements array`);
            assert.strictEqual(group.statements.length, 4, `${id} group ${gIdx} must have exactly 4 statements`);

            group.statements.forEach((stmt, sIdx) => {
              const text = stmt.question || stmt.statement;
              assert.ok(text && text.length > 3, `${id} group ${gIdx} statement ${sIdx} must have statement text`);
              assert.strictEqual(typeof stmt.correct, 'boolean', `${id} group ${gIdx} statement ${sIdx} must have boolean correct`);
            });
          });
        }
      });
    });
  });

  test('LaTeX typesetting integrity and no unescaped raw HTML injection', () => {
    CORE_SUBJECT_IDS.forEach(id => {
      const filePath = path.join(dataDir, `${id}.json`);
      const rawText = fs.readFileSync(filePath, 'utf8');

      // Check for raw unsafe HTML script or frame tags
      assert.strictEqual(/<script|<iframe|<object/i.test(rawText), false, `${id}.json must not contain unsafe HTML tags`);

      // STEM subjects must contain LaTeX math symbols
      if (id.startsWith('toan') || id.startsWith('vatli') || id.startsWith('hoahoc')) {
        const hasLatex = /\$|\\frac|\\sqrt|\\alpha|\\beta|\\omega|\\pi|\\lim|\\int|\^|\\Delta|\\to/i.test(rawText);
        assert.ok(hasLatex, `${id}.json STEM subject must use LaTeX mathematical formatting`);
      }
    });
  });
});
