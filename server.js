const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve data folder for JSON files
app.use('/data', express.static(path.join(__dirname, 'data')));

// API: Get list of subjects
app.get('/api/subjects', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'subjects.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading subjects:', error);
    res.status(500).json({ error: 'Failed to load subjects' });
  }
});

// API: Get questions for a specific subject
app.get('/api/data/:subject', (req, res) => {
  try {
    const { subject } = req.params;
    const dataPath = path.join(__dirname, 'data', `${subject}.json`);

    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// Legacy API: Get all lessons (for backward compatibility)
app.get('/api/lessons', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
