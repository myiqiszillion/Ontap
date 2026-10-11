const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  try {
    const { subject } = req.query;
    const dataPath = path.join(process.cwd(), 'data', `${subject}.json`);

    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load data' });
  }
};
