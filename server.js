require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase safely with fallback (No-crash architecture)
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client successfully initialized.');
  } catch (err) {
    console.warn('⚠️ Supabase client failed to initialize:', err.message);
  }
} else {
  console.warn('⚠️ Supabase credentials not found in environment. Announcements running in offline fallback mode.');
}

app.use(express.json());

// ═════════════════════════════════════════════════════════════
// HELPER: Load and Annotate Subjects Data
// ═════════════════════════════════════════════════════════════
function loadSubjectsData(baseDir = __dirname) {
  const dataPath = path.join(baseDir, 'data', 'subjects.json');
  if (!fs.existsSync(dataPath)) {
    return { grades: [10, 11, 12], subjects: [] };
  }
  const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const subjects = (rawData.subjects || []).map(subject => {
    let hasQuestions = false;
    let questionCount = 0;

    if (subject.dataFile) {
      try {
        const filePath = path.join(baseDir, 'data', subject.dataFile);
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

  return {
    ...rawData,
    subjects
  };
}

// ═════════════════════════════════════════════════════════════
// API ROUTES
// ═════════════════════════════════════════════════════════════

// API: Get subjects (Supports ?active_only=true or full catalog)
app.get('/api/subjects', (req, res) => {
  try {
    const data = loadSubjectsData(__dirname);
    if (req.query.active_only === 'true') {
      data.subjects = data.subjects.filter(s => s.ready === true);
    }
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (error) {
    console.error('API Error /api/subjects:', error);
    res.status(500).json({ error: 'Failed to load subjects' });
  }
});

// API: Announcements (Graceful offline fallback if Supabase not configured)
app.get('/api/announcements', async (req, res) => {
  try {
    if (!supabase) {
      return res.json([
        {
          id: 'system-offline-announcement',
          title: 'Chào mừng bạn đến với NTMK Rebuild Phase 01',
          content: 'Nền tảng đang hoạt động ở chế độ Local / Khách. Tất cả các tính năng ôn tập, chọn môn học và thi thử đều sẵn sàng!',
          pinned: true,
          timestamp: new Date().toISOString()
        }
      ]);
    }

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.warn('Announcements error:', error.message);
    res.json([]);
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable in offline mode' });
    }
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
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
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
    if (!supabase) {
      return res.status(503).json({ error: 'Database service unavailable' });
    }
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

// API: Subject question data
app.get('/api/data/:subject', (req, res) => {
  try {
    const { subject } = req.params;

    // Security check: only allow alphanumeric and underscores
    if (!/^[a-z0-9_]+$/.test(subject)) {
      return res.status(400).json({ error: 'Invalid subject name' });
    }

    const dataPath = path.join(__dirname, 'data', `${subject}.json`);
    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: 'Subject data file not found' });
    }
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
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 NTMK Server is running at http://localhost:${PORT}`);
  });
}

module.exports = { app, loadSubjectsData };
