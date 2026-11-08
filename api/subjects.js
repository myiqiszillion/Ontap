const { loadSubjectsData } = require('../engine/subject-loader.js');

module.exports = (req, res) => {
  try {
    const rawData = loadSubjectsData(process.cwd());
    const result = {
      ...rawData,
      subjects: req.query && req.query.active_only === 'true'
        ? (rawData.subjects || []).filter(s => s.ready === true)
        : (rawData.subjects || [])
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(result);
  } catch (error) {
    console.error('API Error api/subjects:', error);
    res.status(500).json({ error: 'Failed to load subjects' });
  }
};
