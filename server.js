require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());


// ═════════════════════════════════════════════════════════════
// API ROUTES
// ═════════════════════════════════════════════════════════════

// API: Get subjects
app.get('/api/subjects', (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'data', 'subjects.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Filter out subjects that have no questions
    data.subjects = data.subjects.filter(subject => {
      try {
        const subjectFilePath = path.join(__dirname, 'data', subject.dataFile);
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
    const { title, content, link, image_url } = req.body;
    const { data, error } = await supabase
      .from('announcements')
      .insert([{ title, content, link, image_url, timestamp: new Date().toISOString() }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    console.error('POST Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/pin-announcement', async (req, res) => {
  try {
    const { id } = req.query;
    const { pinned } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required' });
    
    const { data, error } = await supabase
      .from('announcements')
      .update({ pinned })
      .eq('id', id)
      .select();
      
    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('PATCH Error:', error);
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
    
    // Security check: only allow alphanumeric and underscores
    if (!/^[a-z0-9_]+$/.test(subject)) {
      return res.status(400).json({ error: 'Invalid subject name' });
    }

    const dataPath = path.join(__dirname, 'data', `${subject}.json`);
    if (!fs.existsSync(dataPath)) return res.status(404).json({ error: 'Not found' });
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load data' });
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
