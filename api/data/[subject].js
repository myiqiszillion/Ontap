const fs = require('fs');
const path = require('path');

function sanitizeLegacyLessonQuestions(data) {
  if (!data || !Array.isArray(data.lessons)) return data;
  return {
    ...data,
    lessons: data.lessons.map(lesson => ({
      ...lesson,
      questions: Array.isArray(lesson.questions) ? lesson.questions.map(q => {
        const { correct, correctAnswer, explanation, ...safeQ } = q;
        return safeQ;
      }) : [],
      questionGroups: Array.isArray(lesson.questionGroups) ? lesson.questionGroups.map(g => ({
        ...g,
        statements: Array.isArray(g.statements) ? g.statements.map(s => {
          const { correct, explanation, ...safeS } = s;
          return safeS;
        }) : []
      })) : []
    }))
  };
}

module.exports = (req, res) => {
  try {
    const { subject, mode } = req.query || {};

    if (!subject || typeof subject !== 'string' || !/^[a-z0-9_]+$/.test(subject)) {
      return res.status(400).json({ error: 'Invalid subject name' });
    }

    const dataDir = path.resolve(process.cwd(), 'data');
    const targetFile = path.resolve(dataDir, `${subject}.json`);

    // Guard against path traversal
    if (!targetFile.startsWith(dataDir) || path.dirname(targetFile) !== dataDir) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    if (!fs.existsSync(targetFile)) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    let data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

    // If requested in exam mode, sanitize to prevent answer key leakage
    if (mode === 'exam' || req.headers['x-exam-mode'] === 'true') {
      data = sanitizeLegacyLessonQuestions(data);
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load data' });
  }
};

