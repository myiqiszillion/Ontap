const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'subjects.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Filter out subjects that have no questions
    data.subjects = data.subjects.filter(subject => {
      try {
        const subjectFilePath = path.join(process.cwd(), 'data', subject.dataFile);
        if (!fs.existsSync(subjectFilePath)) return false;
        
        const subjectData = JSON.parse(fs.readFileSync(subjectFilePath, 'utf8'));
        if (!subjectData.lessons || subjectData.lessons.length === 0) return false;

        // Check if at least one lesson has questions or questionGroups
        return subjectData.lessons.some(lesson => 
            (lesson.questions && lesson.questions.length > 0) || 
            (lesson.questionGroups && lesson.questionGroups.length > 0)
        );
      } catch (err) {
        return false;
      }
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load subjects' });
  }
};
