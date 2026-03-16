require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(express.json());

// Serve admin.html for /admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Analytics tracking middleware
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    try {
      const visitorsPath = path.join(__dirname, 'data', 'visitors.json');
      let visitors = [];
      if (fs.existsSync(visitorsPath)) {
        const fileContent = fs.readFileSync(visitorsPath, 'utf8');
        if (fileContent.trim()) {
          visitors = JSON.parse(fileContent);
        }
      }
      
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown IP';
      const userAgent = req.headers['user-agent'] || 'Unknown Device';
      const timestamp = new Date().toISOString();
      
      visitors.push({ ip, userAgent, timestamp });
      
      if (visitors.length > 2000) visitors = visitors.slice(-2000); // Keep last 2000
      
      fs.writeFileSync(visitorsPath, JSON.stringify(visitors, null, 2));
    } catch (e) {
      console.error('Error logging visitor:', e);
    }
  }
  next();
});

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

// API: Get announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error reading announcements:', error);
    res.status(500).json({ error: 'Failed to load announcements' });
  }
});

// API: Post new announcement (Admin only, Supabase save)
app.post('/api/announcements', async (req, res) => {
  try {
    const { title, content, link } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const newAnnouncement = {
      title,
      content,
      link: link || null,
      timestamp: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('announcements')
      .insert([newAnnouncement])
      .select();

    if (error) throw error;

    res.status(201).json({ success: true, announcement: data[0] });
  } catch (error) {
    console.error('Error saving announcement:', error);
    res.status(500).json({ error: 'Failed to save announcement' });
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
