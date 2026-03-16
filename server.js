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

// Legacy Analytics / Logging
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
      if (visitors.length > 2000) visitors = visitors.slice(-2000);
      fs.writeFileSync(visitorsPath, JSON.stringify(visitors, null, 2));
    } catch (e) {
      console.error('Error logging visitor:', e);
    }
  }
  next();
});

// ═════════════════════════════════════════════════════════════
// API ROUTES
// ═════════════════════════════════════════════════════════════

// API: Get subjects
app.get('/api/subjects', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'subjects.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load subjects' });
  }
});

// API: Announcements
app.get('/api/announcements', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load announcements' });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const { title, content, link } = req.body;
    const { data, error } = await supabase
      .from('announcements')
      .insert([{ title, content, link, timestamp: new Date().toISOString() }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('POST Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/delete-announcement', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'ID is required' });
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('DELETE Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API: Subject data
app.get('/api/data/:subject', (req, res) => {
  try {
    const { subject } = req.params;
    const dataPath = path.join(__dirname, 'data', `${subject}.json`);
    if (!fs.existsSync(dataPath)) return res.status(404).json({ error: 'Not found' });
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// Legacy API
app.get('/api/lessons', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ═════════════════════════════════════════════════════════════
// STATIC & PAGE ROUTES
// ═════════════════════════════════════════════════════════════

// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Static files (public and data)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
