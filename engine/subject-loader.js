/**
 * Centralized Subject & Question Data Loader
 * NTMK Rebuild Phase 02 & Hardening
 *
 * Provides single source of truth for:
 * - Loading and annotating subject catalog with live question counts
 * - Sanitizing questions to prevent answer key leaks (MCQ, Short Answer, True/False)
 * - Validating subject keys and grades against GDPT 2018 specifications
 */

const fs = require('fs');
const path = require('path');

const CORE_SUBJECTS = Object.freeze(['toan', 'vatli', 'hoahoc', 'tienganh', 'lichsu', 'sinhhoc']);
const CORE_GRADES = Object.freeze([10, 11, 12]);

/**
 * Load and annotate subjects data from data/subjects.json
 * @param {string} [baseDir]
 * @returns {Object}
 */
function loadSubjectsData(baseDir = process.cwd()) {
  const dataPath = path.join(baseDir, 'data', 'subjects.json');
  if (!fs.existsSync(dataPath)) {
    return { grades: [10, 11, 12], subjects: [] };
  }

  let rawData;
  try {
    rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {
    return { grades: [10, 11, 12], subjects: [] };
  }

  const subjects = (rawData.subjects || []).map(subject => {
    let hasQuestions = false;
    let questionCount = 0;

    if (subject.dataFile) {
      try {
        const filePath = path.join(baseDir, 'data', subject.dataFile);
        if (fs.existsSync(filePath)) {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (content.lessons && Array.isArray(content.lessons)) {
            content.lessons.forEach(lesson => {
              if (lesson.questions && Array.isArray(lesson.questions)) {
                questionCount += lesson.questions.length;
              }
              if (lesson.questionGroups && Array.isArray(lesson.questionGroups)) {
                questionCount += lesson.questionGroups.length;
              }
            });
            hasQuestions = questionCount > 0;
          }
        }
      } catch (err) {
        hasQuestions = false;
      }
    }

    return {
      ...subject,
      ready: hasQuestions,
      questionCount,
      status: hasQuestions ? 'active' : (subject.status || 'in_development')
    };
  });

  return {
    ...rawData,
    subjects
  };
}

/**
 * Sanitize legacy lesson questions to strip answer keys and explanations
 * @param {Object} data
 * @returns {Object}
 */
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

/**
 * Validate subject key
 * @param {string} subjectKey
 * @returns {boolean}
 */
function isValidSubjectKey(subjectKey) {
  if (!subjectKey || typeof subjectKey !== 'string') return false;
  const clean = subjectKey.replace(/\d+$/, '').toLowerCase();
  return CORE_SUBJECTS.includes(clean);
}

/**
 * Validate grade
 * @param {number|string} grade
 * @returns {boolean}
 */
function isValidGrade(grade) {
  const g = Number(grade);
  return CORE_GRADES.includes(g);
}

module.exports = {
  CORE_SUBJECTS,
  CORE_GRADES,
  loadSubjectsData,
  sanitizeLegacyLessonQuestions,
  isValidSubjectKey,
  isValidGrade
};
