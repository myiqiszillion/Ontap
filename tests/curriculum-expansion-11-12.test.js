const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

describe('Authentic Curriculum — Lịch Sử 11 GDPT 2018 (Decision 764/QĐ-BGDĐT)', () => {
  const dataDir = path.join(__dirname, '..', 'data');
  const subjectsPath = path.join(dataDir, 'subjects.json');
  const history11Path = path.join(dataDir, 'lichsu11.json');

  test('data/subjects.json activates Lịch Sử 11 exclusively as core active subject', () => {
    assert.ok(fs.existsSync(subjectsPath), 'data/subjects.json must exist');
    const catalog = JSON.parse(fs.readFileSync(subjectsPath, 'utf8'));
    assert.ok(Array.isArray(catalog.subjects), 'subjects.json must contain subjects array');

    const subject = catalog.subjects.find(s => s.id === 'lichsu11');
    assert.ok(subject, 'Subject lichsu11 must exist in subjects catalog');
    assert.strictEqual(subject.ready, true, 'Subject lichsu11 must have ready: true');
    assert.strictEqual(subject.status, 'active', 'Subject lichsu11 must have status: "active"');
    assert.strictEqual(subject.dataFile, 'lichsu11.json', 'Subject lichsu11 dataFile must be lichsu11.json');
    assert.strictEqual(subject.grade, 11, 'Subject lichsu11 must be grade 11');
    assert.strictEqual(subject.name, 'Lịch sử 11', 'Subject name must be Lịch sử 11');
    assert.ok(subject.examStructure, 'Subject lichsu11 must specify examStructure');
    assert.strictEqual(subject.examStructure.mcq, 20);
    assert.strictEqual(subject.examStructure.tf, 4);
    assert.strictEqual(subject.examStructure.durationMinutes, 50);
  });

  test('Question bank file data/lichsu11.json exists and contains authentic 4-lesson curriculum', () => {
    assert.ok(fs.existsSync(history11Path), 'Question bank file data/lichsu11.json must exist');
    
    const content = JSON.parse(fs.readFileSync(history11Path, 'utf8'));
    assert.ok(content.subject && content.subject.includes('Lịch sử 11'), 'Must have subject "Lịch sử 11"');
    assert.ok(Array.isArray(content.lessons), 'lichsu11.json must have "lessons" array');
    assert.strictEqual(content.lessons.length, 4, 'lichsu11.json must contain exactly 4 authentic lessons');
  });

  test('Decision 764 schema conformance: each lesson contains 20 MCQs and 4 True/False groups', () => {
    const content = JSON.parse(fs.readFileSync(history11Path, 'utf8'));

    content.lessons.forEach((lesson, lIdx) => {
      assert.ok(lesson.name && typeof lesson.name === 'string', `Lesson ${lIdx} must have name`);
      assert.ok(Array.isArray(lesson.questions), `Lesson "${lesson.name}" must have questions array`);
      assert.strictEqual(lesson.questions.length, 20, `Lesson "${lesson.name}" must have 20 MCQs`);

      // Check individual MCQs
      lesson.questions.forEach((q, qIdx) => {
        assert.strictEqual(q.type, 'mcq', `Question ${qIdx} has type mcq`);
        assert.ok(q.question && q.question.length > 5, `Question ${qIdx} has descriptive prompt`);
        assert.ok(q.explanation && q.explanation.length > 3, `Question ${qIdx} has explanation`);
        assert.ok(Array.isArray(q.options), `MCQ ${qIdx} must have options array`);
        assert.strictEqual(q.options.length, 4, `MCQ ${qIdx} must have exactly 4 options`);
        assert.ok([0, 1, 2, 3].includes(q.correct), `MCQ ${qIdx} correct index must be 0-3`);
      });

      // Check True/False question groups
      assert.ok(Array.isArray(lesson.questionGroups), `Lesson "${lesson.name}" must have questionGroups array`);
      assert.strictEqual(lesson.questionGroups.length, 4, `Lesson "${lesson.name}" must contain 4 questionGroups`);

      lesson.questionGroups.forEach((group, gIdx) => {
        assert.ok(group.passage && group.passage.length > 10, `Group ${gIdx} must have passage context`);
        assert.ok(Array.isArray(group.statements), `Group ${gIdx} must have statements array`);
        assert.strictEqual(group.statements.length, 4, `Group ${gIdx} must have exactly 4 statements`);

        group.statements.forEach((stmt, sIdx) => {
          const text = stmt.question || stmt.statement;
          assert.ok(text && text.length > 3, `Group ${gIdx} statement ${sIdx} must have statement text`);
          assert.strictEqual(typeof stmt.correct, 'boolean', `Group ${gIdx} statement ${sIdx} must have boolean correct`);
        });
      });
    });
  });

  test('Authentic Vietnamese text integrity and no unescaped raw HTML injection', () => {
    const rawText = fs.readFileSync(history11Path, 'utf8');

    // Check for raw unsafe HTML script or frame tags
    assert.strictEqual(/<script|<iframe|<object/i.test(rawText), false, 'lichsu11.json must not contain unsafe HTML tags');

    // Check authentic Vietnamese keywords
    assert.ok(rawText.includes('Cách mạng tư sản') || rawText.includes('cách mạng tư sản'), 'Must contain historical topic keywords');
  });
});
