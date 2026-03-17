const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'subjects.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    // Filter subjects to only include those that have actual questions
    const filteredSubjects = data.subjects.filter(subject => {
      try {
        const subjectDataPath = path.join(process.cwd(), 'data', subject.dataFile);
        if (!fs.existsSync(subjectDataPath)) return false;
        
        const subjectData = JSON.parse(fs.readFileSync(subjectDataPath, 'utf8'));
        // Check if any lesson has questions
        if (subjectData.lessons && Array.isArray(subjectData.lessons)) {
          return subjectData.lessons.some(lesson => lesson.questions && lesson.questions.length > 0);
        }
        return false;
      } catch (e) {
        return false;
      }
    });

    data.subjects = filteredSubjects;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load subjects' });
  }
};
