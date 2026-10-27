/**
 * Personalized Learning Planner & Adaptive Practice API Router (V2)
 * NTMK Rebuild Phase 03B — Task 9
 *
 * Endpoints:
 * - GET  /api/v2/learning/profile               (Get student learning profile)
 * - PUT/POST /api/v2/learning/profile          (Update profile goals, minutes, days)
 * - GET  /api/v2/learning/plan                  (Get current active study plan)
 * - POST /api/v2/learning/plan/generate         (Generate new 7/14/30-day study plan)
 * - POST /api/v2/learning/plan/replan           (Trigger adaptive plan readjustment)
 * - GET  /api/v2/learning/tasks                 (Get tasks in active plan)
 * - POST /api/v2/learning/tasks/start           (Start a task -> creates adaptive session)
 * - POST /api/v2/learning/tasks/complete        (Complete task with authentic practice answers)
 * - POST /api/v2/learning/tasks/postpone        (Postpone task to another date)
 * - GET  /api/v2/learning/progress              (Get study progress summary)
 * - GET  /api/v2/learning/reviews               (Get spaced repetition review schedule)
 *
 * Security & Integrity:
 * - Anti-spoofing: Rejects arbitrary `completed: true` without valid submission token.
 * - Test Fixture Isolation: `allowFixtures` parameter ignored in production mode.
 * - Client cannot directly tamper with mastery scores or authoritative exam evaluations.
 */

const LearningServiceFacade = require('../../engine/planner/learning-service-facade.js');
const BankStorage = require('../../engine/storage/bank-storage.js');
const CloudStorageAdapter = require('../../engine/storage/cloud-storage-adapter.js');
const SkillGraph = require('../../engine/diagnostic/skill-graph.js');
const { defaultStudentAuth } = require('../../engine/auth/student-auth.js');

let facadeInstance = null;

function getLearningFacade() {
  if (!facadeInstance) {
    let adapter = null;
    try {
      adapter = new CloudStorageAdapter();
    } catch (e) {
      // Local fallback
    }
    const bank = new BankStorage({ storageAdapter: adapter });
    const skillGraph = new SkillGraph();
    facadeInstance = new LearningServiceFacade({
      bankStorage: bank,
      skillGraph
    });
  }
  return facadeInstance;
}

module.exports = async function learningHandler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Student-Id, X-Diagnostic-Token, X-Session-Token');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const facade = getLearningFacade();
  const urlPath = (req.originalUrl || req.url || '').split('?')[0];
  const query = req.query || {};
  const action = query.action || (urlPath.split('/').filter(Boolean).pop());

  // Environment fixture safety guard
  const isTestServerEnv = process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_FIXTURES === 'true' || process.argv.some(a => a.includes('test'));
  const isProduction = process.env.NODE_ENV === 'production';
  const allowFixtureFallback = Boolean((query.allowFixtures === 'true' || req.body?.allowFixtures) && isTestServerEnv && !isProduction);

  // Authenticate request and enforce identity & ownership
  const authUser = defaultStudentAuth.authenticateRequest(req);
  let studentId = authUser ? authUser.id : null;

  // In test environment, allow header fallback for existing automated tests
  if (!studentId && isTestServerEnv && req.headers['x-student-id']) {
    studentId = req.headers['x-student-id'];
  }

  // Cross-user access check: if a client tries to specify a different userId in query/body, enforce authorization
  const requestedUserId = query.userId || req.body?.userId;
  if (requestedUserId && studentId && requestedUserId !== studentId && authUser?.role !== 'admin') {
    return res.status(403).json({ error: 'Bạn không có quyền truy cập dữ liệu của học sinh khác.' });
  }

  if (!studentId) {
    studentId = requestedUserId || 'student_guest';
  }

  try {
    // 1. Profile: GET & PUT
    if (action === 'profile' || urlPath.includes('/profile')) {
      if (req.method === 'GET') {
        const profile = facade.getProfile(studentId);
        return res.status(200).json({ success: true, profile });
      }
      if (req.method === 'POST' || req.method === 'PUT') {
        const updated = facade.updateProfile(studentId, req.body || {});
        return res.status(200).json({ success: true, profile: updated });
      }
    }

    // 2. Plan Generation: POST /plan/generate
    if ((req.method === 'POST' && (action === 'generate' || action === 'plan-generate' || urlPath.includes('/plan/generate')))) {
      const { requestedDays } = req.body || {};
      const plan = facade.generatePlan({
        userId: studentId,
        requestedDays,
        allowFixtureFallback
      });
      return res.status(201).json({ success: true, plan });
    }

    // 3. Plan Replan: POST /plan/replan
    if ((req.method === 'POST' && (action === 'replan' || action === 'plan-replan' || urlPath.includes('/plan/replan')))) {
      const { triggerEvent, eventData } = req.body || {};
      const updatedPlan = facade.replanPlan({
        userId: studentId,
        triggerEvent: triggerEvent || 'manual_replan',
        eventData: eventData || {}
      });
      return res.status(200).json({ success: true, plan: updatedPlan });
    }

    // 4. Current Active Plan: GET /plan
    if (req.method === 'GET' && (action === 'plan' || urlPath.endsWith('/plan'))) {
      const plan = facade.getActivePlan(studentId);
      if (!plan) {
        return res.status(200).json({ success: true, plan: null, message: 'Chưa có kế hoạch học tập nào được tạo.' });
      }
      return res.status(200).json({ success: true, plan });
    }

    // 5. Tasks List: GET /tasks
    if (req.method === 'GET' && (action === 'tasks' || urlPath.includes('/tasks'))) {
      const plan = facade.getActivePlan(studentId);
      if (!plan) {
        return res.status(200).json({ success: true, tasks: [] });
      }
      const tasks = facade.storage.getTasks(plan.planId, {
        status: query.status,
        scheduledDate: query.date
      });
      return res.status(200).json({ success: true, tasks });
    }

    // 6. Start Task: POST /tasks/:id/start or /tasks/start
    if (req.method === 'POST' && (action === 'task-start' || action === 'start' || urlPath.includes('/tasks/start') || urlPath.endsWith('/start'))) {
      const taskId = req.body?.taskId || query.taskId || query.id;
      if (!taskId) {
        return res.status(400).json({ success: false, error: 'taskId required' });
      }
      const startResult = facade.startTask({
        userId: studentId,
        taskId,
        allowFixtureFallback
      });
      return res.status(200).json({ success: true, ...startResult });
    }

    // 7. Complete Task: POST /tasks/:id/complete or /tasks/complete
    if (req.method === 'POST' && (action === 'task-complete' || action === 'complete' || urlPath.includes('/tasks/complete') || urlPath.endsWith('/complete'))) {
      const taskId = req.body?.taskId || query.taskId || query.id;
      const { sessionId, token, answers, timeSpentSeconds } = req.body || {};

      // Security check: client cannot simply pass completed: true
      if (!sessionId || !token) {
        return res.status(400).json({
          success: false,
          error: 'SUBMISSION_EVIDENCE_REQUIRED',
          message: 'Không thể đánh dấu hoàn thành nhiệm vụ mà không nộp kết quả làm bài hợp lệ.'
        });
      }

      const completeResult = facade.completeTask({
        userId: studentId,
        taskId,
        sessionId,
        token,
        answers: answers || {},
        timeSpentSeconds: timeSpentSeconds || 0
      });
      return res.status(200).json({ success: true, ...completeResult });
    }

    // 8. Postpone Task: POST /tasks/postpone
    if (req.method === 'POST' && (action === 'task-postpone' || action === 'postpone' || urlPath.includes('/tasks/postpone') || urlPath.endsWith('/postpone'))) {
      const taskId = req.body?.taskId || query.taskId || query.id;
      const { newDate, reason } = req.body || {};
      const updatedTask = facade.postponeTask({
        userId: studentId,
        taskId,
        newDate,
        reason
      });
      return res.status(200).json({ success: true, task: updatedTask });
    }

    // 9. Overall Progress: GET /progress
    if (req.method === 'GET' && (action === 'progress' || urlPath.includes('/progress'))) {
      const progress = facade.getProgress(studentId);
      return res.status(200).json({ success: true, progress });
    }

    // 10. Spaced Repetition Reviews: GET /reviews
    if (req.method === 'GET' && (action === 'reviews' || urlPath.includes('/reviews'))) {
      const reviews = facade.getReviews(studentId);
      return res.status(200).json({ success: true, reviews });
    }

    return res.status(404).json({
      success: false,
      error: 'ENDPOINT_NOT_FOUND',
      message: `Unknown learning endpoint: ${req.method} ${urlPath}`
    });
  } catch (err) {
    const statusCode = err.code === 'UNAUTHORIZED' ? 401
      : err.code === 'SESSION_NOT_FOUND' || err.code === 'TASK_NOT_FOUND' ? 404
      : err.code === 'INSUFFICIENT_VERIFIED_QUESTIONS' || err.code === 'TASK_BLOCKED' ? 422
      : 400;

    return res.status(statusCode).json({
      success: false,
      error: err.code || 'LEARNING_SERVICE_ERROR',
      message: err.message
    });
  }
};
