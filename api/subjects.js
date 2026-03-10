const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'subjects.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load subjects' });
  }
};
