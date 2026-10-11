const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'subjects.json');
    if (!fs.existsSync(dataPath)) {
      return res.status(200).json({ grades: [10, 11, 12], subjects: [] });
    }
    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    const subjects = (rawData.subjects || []).map(subject => {
      let hasQuestions = false;
      let questionCount = 0;

      if (subject.dataFile) {
        try {
          const filePath = path.join(process.cwd(), 'data', subject.dataFile);
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

    const result = {
      ...rawData,
      subjects: req.query && req.query.active_only === 'true' 
        ? subjects.filter(s => s.ready === true) 
        : subjects
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(result);
  } catch (error) {
    console.error('API Error api/subjects:', error);
    res.status(500).json({ error: 'Failed to load subjects' });
  }
};
