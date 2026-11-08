/**
 * Learning Storage Repository & Local Adapter
 * NTMK Rebuild Phase 03B & SaaS Multi-Tenant Evolution
 *
 * Responsibilities:
 * - Abstract persistence layer for Learning Profiles, Plans, Tasks, Versions, and Review Schedules.
 * - Supports multi-tenant isolation via tenantId scoping.
 * - Supports in-memory & local file persistence (LocalState) for development & testing.
 * - Fully compatible with PostgreSQL / Supabase repository bridge.
 * - Enforces data integrity: avoids overwriting historical records.
 */

const path = require('path');
const LocalState = require('../storage/local-state.js');

const DEFAULT_TENANT_ID = 'a0000000-0000-0000-0000-000000000001';

class LearningStorage {
  constructor(options = {}) {
    this.storageAdapter = options.storageAdapter || null;
    this.defaultTenantId = options.defaultTenantId || DEFAULT_TENANT_ID;
    this.baseDir = options.baseDir || path.join(process.cwd(), '.ntmk');

    this.memory = {
      profiles: new Map(),
      plans: new Map(),
      tasks: new Map(),
      versions: [],
      reviews: new Map(),
      events: []
    };

    if (!this.storageAdapter) {
      this.profilesStore = new LocalState(path.join(this.baseDir, 'learning-profiles.json'));
      this.plansStore = new LocalState(path.join(this.baseDir, 'learning-plans.json'));
      this.tasksStore = new LocalState(path.join(this.baseDir, 'learning-tasks.json'));
      this.versionsStore = new LocalState(path.join(this.baseDir, 'learning-plan-versions.json'));
      this.reviewsStore = new LocalState(path.join(this.baseDir, 'learning-review-schedules.json'));
      this.eventsStore = new LocalState(path.join(this.baseDir, 'learning-task-events.json'));
    }
  }

  // --- Internal Store Accessors ---
  _readProfiles() {
    if (this.storageAdapter) {
      const map = this.storageAdapter.tables?.ntmk_learning_profiles || this.memory.profiles;
      const obj = {};
      for (const [k, v] of map.entries()) obj[k] = v;
      return obj;
    }
    return this.profilesStore.read({});
  }

  _writeProfiles(data) {
    if (this.storageAdapter) {
      const map = this.storageAdapter.tables?.ntmk_learning_profiles || this.memory.profiles;
      map.clear();
      for (const [k, v] of Object.entries(data)) map.set(k, v);
      return;
    }
    this.profilesStore.write(data);
  }

  _readPlans() {
    if (this.storageAdapter) {
      const map = this.storageAdapter.tables?.ntmk_learning_plans || this.memory.plans;
      const obj = {};
      for (const [k, v] of map.entries()) obj[k] = v;
      return obj;
    }
    return this.plansStore.read({});
  }

  _writePlans(data) {
    if (this.storageAdapter) {
      const map = this.storageAdapter.tables?.ntmk_learning_plans || this.memory.plans;
      map.clear();
      for (const [k, v] of Object.entries(data)) map.set(k, v);
      return;
    }
    this.plansStore.write(data);
  }

  _readTasks() {
    if (this.storageAdapter) {
      const map = this.storageAdapter.tables?.ntmk_learning_tasks || this.memory.tasks;
      const obj = {};
      for (const [k, v] of map.entries()) obj[k] = v;
      return obj;
    }
    return this.tasksStore.read({});
  }

  _writeTasks(data) {
    if (this.storageAdapter) {
      const map = this.storageAdapter.tables?.ntmk_learning_tasks || this.memory.tasks;
      map.clear();
      for (const [k, v] of Object.entries(data)) map.set(k, v);
      return;
    }
    this.tasksStore.write(data);
  }

  _readVersions() {
    if (this.storageAdapter) {
      return [...this.memory.versions];
    }
    return this.versionsStore.read([]);
  }

  _writeVersions(data) {
    if (this.storageAdapter) {
      this.memory.versions = [...data];
      return;
    }
    this.versionsStore.write(data);
  }

  _readReviews() {
    if (this.storageAdapter) {
      const map = this.storageAdapter.tables?.ntmk_learning_review_schedules || this.memory.reviews;
      const obj = {};
      for (const [k, v] of map.entries()) obj[k] = v;
      return obj;
    }
    return this.reviewsStore.read({});
  }

  _writeReviews(data) {
    if (this.storageAdapter) {
      const map = this.storageAdapter.tables?.ntmk_learning_review_schedules || this.memory.reviews;
      map.clear();
      for (const [k, v] of Object.entries(data)) map.set(k, v);
      return;
    }
    this.reviewsStore.write(data);
  }

  _readEvents() {
    if (this.storageAdapter) {
      return [...this.memory.events];
    }
    return this.eventsStore.read([]);
  }

  _writeEvents(data) {
    if (this.storageAdapter) {
      this.memory.events = [...data];
      return;
    }
    this.eventsStore.write(data);
  }

  // --- Profiles ---
  saveProfile(profile) {
    if (!profile || !profile.userId) throw new Error('Valid profile with userId required');
    const all = this._readProfiles();
    const key = profile.profileId || profile.userId;
    all[key] = {
      ...profile,
      tenantId: profile.tenantId || this.defaultTenantId,
      updatedAt: new Date().toISOString()
    };
    this._writeProfiles(all);
    return all[key];
  }

  getProfile(userId, options = {}) {
    const all = this._readProfiles();
    const targetTenantId = typeof options === 'string' ? options : (options && options.tenantId);
    // Search by profileId or userId
    if (all[userId]) {
      const p = all[userId];
      if (targetTenantId && p.tenantId && p.tenantId !== targetTenantId) return null;
      return p;
    }
    for (const k of Object.keys(all)) {
      if (all[k].userId === userId) {
        const p = all[k];
        if (targetTenantId && p.tenantId && p.tenantId !== targetTenantId) continue;
        return p;
      }
    }
    return null;
  }

  // --- Plans ---
  savePlan(plan) {
    if (!plan || !plan.planId) throw new Error('Valid plan with planId required');
    const all = this._readPlans();
    all[plan.planId] = {
      ...plan,
      tenantId: plan.tenantId || this.defaultTenantId,
      updatedAt: new Date().toISOString()
    };
    this._writePlans(all);

    // Also persist tasks into tasks store
    if (Array.isArray(plan.tasks)) {
      const allTasks = this._readTasks();
      for (const t of plan.tasks) {
        allTasks[t.taskId] = {
          ...t,
          tenantId: t.tenantId || plan.tenantId || this.defaultTenantId
        };
      }
      this._writeTasks(allTasks);
    }

    return all[plan.planId];
  }

  getPlan(planId) {
    const all = this._readPlans();
    return all[planId] || null;
  }

  getActivePlan(userId, options = {}) {
    const all = this._readPlans();
    const targetTenantId = typeof options === 'string' ? options : (options && options.tenantId);
    const userPlans = Object.values(all)
      .filter(p => {
        const matchesUser = p.userId === userId || p.profileId === userId || p.profileId === `prof-${userId}` || p.studentId === userId;
        if (!matchesUser) return false;
        if (targetTenantId && p.tenantId && p.tenantId !== targetTenantId) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return userPlans.length > 0 ? userPlans[0] : null;
  }

  // --- Plan Versions ---
  savePlanVersion(planId, versionData) {
    const all = this._readVersions();
    const record = {
      versionId: `ver-${Date.now()}`,
      planId,
      ...versionData,
      createdAt: new Date().toISOString()
    };
    all.push(record);
    this._writeVersions(all);
    return record;
  }

  getPlanVersions(planId) {
    const all = this._readVersions();
    return all.filter(v => v.planId === planId);
  }

  // --- Tasks ---
  getTask(taskId) {
    const all = this._readTasks();
    return all[taskId] || null;
  }

  updateTask(taskId, updates) {
    const all = this._readTasks();
    if (!all[taskId]) return null;
    all[taskId] = {
      ...all[taskId],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this._writeTasks(all);

    // Synchronize into plan tasks as well
    const planId = all[taskId].planId;
    if (planId) {
      const allPlans = this._readPlans();
      if (allPlans[planId] && Array.isArray(allPlans[planId].tasks)) {
        const idx = allPlans[planId].tasks.findIndex(t => t.taskId === taskId);
        if (idx !== -1) {
          allPlans[planId].tasks[idx] = all[taskId];
          this._writePlans(allPlans);
        }
      }
    }

    return all[taskId];
  }

  getTasks(planId, filter = {}) {
    const all = this._readTasks();
    let tasks = Object.values(all).filter(t => t.planId === planId);
    if (filter.status) {
      tasks = tasks.filter(t => t.status === filter.status);
    }
    if (filter.scheduledDate) {
      tasks = tasks.filter(t => t.scheduledDate === filter.scheduledDate);
    }
    return tasks;
  }

  // --- Reviews ---
  saveReviewSchedule(record) {
    const all = this._readReviews();
    const key = `${record.userId || 'anon'}_${record.skillId}`;
    all[key] = {
      ...record,
      updatedAt: new Date().toISOString()
    };
    this._writeReviews(all);
    return all[key];
  }

  getReviewSchedule(userId, skillId) {
    const all = this._readReviews();
    const key = `${userId}_${skillId}`;
    return all[key] || null;
  }

  getReviewSchedules(userId) {
    const all = this._readReviews();
    return Object.values(all).filter(r => (r.userId || 'anon') === userId);
  }

  // --- Task Events ---
  recordTaskEvent(taskId, eventType, eventData = {}) {
    const all = this._readEvents();
    const event = {
      eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId,
      eventType,
      eventData,
      createdAt: new Date().toISOString()
    };
    all.push(event);
    this._writeEvents(all);
    return event;
  }

  // --- Question Rollback & Impact Remediation Marking ---
  flagQuestionAffectedSessions(questionId, reason = '') {
    const flagged = [];
    // 1. Scan tasks
    const allTasks = this._readTasks();
    let tasksUpdated = false;
    for (const [taskId, task] of Object.entries(allTasks)) {
      const usesQuestion = task.questionId === questionId || 
        (Array.isArray(task.questionIds) && task.questionIds.includes(questionId)) ||
        (Array.isArray(task.practiceItems) && task.practiceItems.some(item => item.id === questionId || item.questionId === questionId));
      if (usesQuestion) {
        task.flaggedForRemediation = true;
        task.remediationReason = reason || `Referenced question ${questionId} was rolled back`;
        task.flaggedAt = new Date().toISOString();
        flagged.push({ type: 'task', id: taskId, planId: task.planId });
        tasksUpdated = true;
      }
    }
    if (tasksUpdated) {
      this._writeTasks(allTasks);
    }

    // 2. Scan task events
    const allEvents = this._readEvents();
    let eventsUpdated = false;
    for (const evt of allEvents) {
      if (evt.eventData && (evt.eventData.questionId === questionId || evt.eventData.id === questionId)) {
        evt.flaggedQuestionRollback = true;
        evt.remediationNote = reason || `Question ${questionId} unpublishing notification`;
        flagged.push({ type: 'event', id: evt.eventId, taskId: evt.taskId });
        eventsUpdated = true;
      }
    }
    if (eventsUpdated) {
      this._writeEvents(allEvents);
    }

    return flagged;
  }
}

module.exports = LearningStorage;
