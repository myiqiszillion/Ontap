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

app.use(express.json({ limit: '256kb' }));
const { requireAdmin } = require('./engine/admin-auth.js');
app.use('/api', (req,res,next) => {
 if (['POST','PATCH','DELETE'].includes(req.method) && ['announcements','pin-announcement','delete-announcement'].some(p=>req.path==='/' + p) && !requireAdmin(req,res)) return;
 next();
});

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

function sanitizeLegacyLessonQuestions(data) {
  if (!data || !Array.isArray(data.lessons)) return data;
  return {
    ...data,
    lessons: data.lessons.map(lesson => ({
      ...lesson,
      questions: Array.isArray(lesson.questions) ? lesson.questions.map(q => {
        const { correct, correctAnswer, explanation, ...safeQ } = q;
        return safeQ;
      }) : [],
      questionGroups: Array.isArray(lesson.questionGroups) ? lesson.questionGroups.map(g => ({
        ...g,
        statements: Array.isArray(g.statements) ? g.statements.map(s => {
          const { correct, explanation, ...safeS } = s;
          return safeS;
        }) : []
      })) : []
    }))
  };
}

// API: Subject question data
app.get('/api/data/:subject', (req, res) => {
  try {
    const { subject } = req.params;

    // Security check: only allow alphanumeric and underscores
    if (!/^[a-z0-9_]+$/.test(subject)) {
      return res.status(400).json({ error: 'Invalid subject name' });
    }

    const dataDir = path.resolve(__dirname, 'data');
    const dataPath = path.resolve(dataDir, `${subject}.json`);

    // Guard against path traversal
    if (!dataPath.startsWith(dataDir) || path.dirname(dataPath) !== dataDir) {
      return res.status(400).json({ error: 'Invalid subject name' });
    }

    if (!fs.existsSync(dataPath)) {
      return res.status(404).json({ error: 'Subject data file not found' });
    }
    let data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Prevent indirect leak of answer keys when exam mode requested
    if (req.query.mode === 'exam' || req.headers['x-exam-mode'] === 'true') {
      data = sanitizeLegacyLessonQuestions(data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// ═════════════════════════════════════════════════════════════
// PHASE 02 API ROUTES (Question Engine V2 & Blueprint API)
// ═════════════════════════════════════════════════════════════
const questionsV2Handler = require('./api/v2/questions.js');

app.post('/api/v2/questions', (req,res)=>questionsV2Handler(req,res));
app.get('/api/v2/questions', (req, res) => questionsV2Handler(req, res));
app.get('/api/v2/questions/:id', (req, res) => {
  req.query = { ...req.query, id: req.params.id };
  questionsV2Handler(req, res);
});
app.post('/api/v2/questions/validate', (req, res) => {
  req.query = { ...req.query, action: 'validate' };
  questionsV2Handler(req, res);
});
app.get('/api/v2/exam-blueprint', (req, res) => {
  req.query = { ...req.query, action: 'blueprint' };
  questionsV2Handler(req, res);
});
app.get('/api/v2/sources', (req, res) => {
  req.query = { ...req.query, action: 'sources' };
  questionsV2Handler(req, res);
});
app.post('/api/v2/exam/start', (req,res) => { req.query = { ...req.query, action: 'start' }; questionsV2Handler(req,res); });
app.post('/api/v2/exam/submit', (req, res) => {
  req.query = { ...req.query, action: 'submit' };
  questionsV2Handler(req, res);
});
app.post('/api/v2/questions/submit', (req, res) => {
  req.query = { ...req.query, action: 'submit' };
  questionsV2Handler(req, res);
});

// ═════════════════════════════════════════════════════════════
// PHASE 03A DIAGNOSTIC ASSESSMENT ROUTES
// ═════════════════════════════════════════════════════════════
const diagnosticV2Handler = require('./api/v2/diagnostic.js');
app.all('/api/v2/diagnostic/:action', (req, res) => {
  req.query = { ...req.query, action: req.params.action };
  diagnosticV2Handler(req, res);
});
app.all('/api/v2/diagnostic', (req, res) => diagnosticV2Handler(req, res));

// ═════════════════════════════════════════════════════════════
// ADMIN API ROUTES (Sync Manager, Review Queue, Coverage Matrix)
// ═════════════════════════════════════════════════════════════
const { adminHandlers } = require('./api/v2/admin.js');

app.get('/api/admin/status', (req, res) => adminHandlers.status(req, res));
app.get('/api/admin/health', (req, res) => adminHandlers.health(req, res));
app.post('/api/admin/sync', (req, res) => adminHandlers.sync(req, res));
app.get('/api/admin/sync/history', (req, res) => adminHandlers.syncHistory(req, res));
app.get('/api/admin/review', (req, res) => adminHandlers.reviewList(req, res));
app.post('/api/admin/review/:id/verify', (req, res) => adminHandlers.verifyQuestion(req, res));
app.post('/api/admin/review/:id/reject', (req, res) => adminHandlers.rejectQuestion(req, res));
app.post('/api/admin/review/:id/publish', (req, res) => adminHandlers.publishQuestion(req, res));
app.get('/api/admin/coverage', (req, res) => adminHandlers.coverage(req, res));
app.get('/api/admin/bank', (req, res) => adminHandlers.bankQuery(req, res));
app.get('/api/admin/reviewers', (req, res) => adminHandlers.listReviewers(req, res));
app.post('/api/admin/reviewers/onboard', (req, res) => adminHandlers.onboardReviewer(req, res));
app.post('/api/admin/reviewers/:id/revoke', (req, res) => adminHandlers.revokeReviewer(req, res));
app.post('/api/admin/reviewers/rectify-unverified', (req, res) => adminHandlers.rectifyUnverifiedApprovals(req, res));

// ═════════════════════════════════════════════════════════════
// STATIC & PAGE ROUTES
// ═════════════════════════════════════════════════════════════

app.all('/api/v2/manage', require('./api/v2/manage.js'));
app.all('/api/v2/sync', require('./api/v2/sync.js'));
// Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Static files (public and data)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/data', (req, res, next) => {
  const match = req.path.match(/^\/([a-z]+(?:10|11|12)?)\.json$/);
  if (!match) return res.status(404).json({ error: 'Not found' });
  if (req.query.mode === 'exam' || req.headers['x-exam-mode'] === 'true') {
    const filePath = path.join(__dirname, 'data', `${match[1]}.json`);
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return res.json(sanitizeLegacyLessonQuestions(raw));
    }
  }
  next();
}, express.static(path.join(__dirname, 'data')));

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
