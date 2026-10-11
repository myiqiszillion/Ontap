/**
 * Cloud Storage Repository Adapter (Phase 02C Hardening)
 * Manages cloud persistence, concurrency controls, distributed locking, and transactional idempotency.
 * Compatible with Supabase PostgreSQL, Node PostgreSQL Pool, and Cross-Process Durable Volumes.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const SupabasePostgresRepository = require('./supabase-postgres-repository.js');

class CloudStorageAdapter {
  constructor(options = {}) {
    this.options = options;
    this.isProduction = Boolean(
      options.isProduction ||
      process.env.NODE_ENV === 'production' ||
      (process.env.VERCEL && process.env.VERCEL !== 'undefined' && process.env.VERCEL !== 'false' && process.env.VERCEL !== '0')
    );
    this.durableFileBackend = options.durableFileBackend || null;
    this.realRepo = null;

    // Check if Supabase or Postgres credentials provided
    const hasSupabase = Boolean(options.supabaseClient || process.env.SUPABASE_URL);
    const hasPostgres = Boolean(options.pgPool || options.databaseUrl || process.env.DATABASE_URL);

    if (hasSupabase || hasPostgres) {
      try {
        this.realRepo = new SupabasePostgresRepository(options);
      } catch (err) {
        if (this.isProduction && options.enforceCloud) throw err;
      }
    }

    if (!this.realRepo && (options.isProduction || (this.isProduction && options.enforceCloud)) && !this.durableFileBackend) {
      throw new Error('BLOCKED: durable serverless storage is not configured. Missing Supabase/PostgreSQL connection.');
    }

    // In-memory tables with cross-process hydration support
    this.tables = {
      question_bank_v2: new Map(),        // id -> row
      ntmk_review_candidates: new Map(),  // id -> row
      ntmk_sync_jobs: new Map(),          // id -> row
      ntmk_sync_leases: new Map(),        // lease_key -> { holder_id, expires_at }
      ntmk_exam_sessions: new Map(),      // id -> row
      ntmk_exam_results: new Map(),       // session_id -> row
      ntmk_content_audit: new Map(),      // id -> row
      ntmk_reviewers: new Map()           // id -> row
    };

    this.uniqueIndexes = {
      question_bank_hash: new Set(),
      candidate_fingerprint: new Set(),
      exam_result_session: new Set()
    };

    this._lastMtime = 0;
    if (this.durableFileBackend && fs.existsSync(this.durableFileBackend)) {
      this._hydrateFromDurableVolume();
    }
  }

  _checkVolumeFreshness() {
    if (!this.durableFileBackend || !fs.existsSync(this.durableFileBackend)) return;
    try {
      const stat = fs.statSync(this.durableFileBackend);
      if (stat.mtimeMs > this._lastMtime) {
        this._hydrateFromDurableVolume();
      }
    } catch (e) {
      // Ignore transient read errors during atomic replace
    }
  }

  _hydrateFromDurableVolume() {
    if (!this.durableFileBackend || !fs.existsSync(this.durableFileBackend)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.durableFileBackend, 'utf8'));
      if (raw.tables) {
        for (const [tName, rows] of Object.entries(raw.tables)) {
          if (this.tables[tName]) {
            this.tables[tName].clear();
            for (const [k, v] of Object.entries(rows)) {
              this.tables[tName].set(k, v);
            }
          }
        }
      }
      this._rebuildIndexes();
      const stat = fs.statSync(this.durableFileBackend);
      this._lastMtime = stat.mtimeMs;
    } catch (e) {
      console.warn('Failed to hydrate cloud storage from durable volume:', e.message);
    }
  }

  _flushToDurableVolume() {
    if (!this.durableFileBackend) return;
    try {
      const serialized = { tables: {} };
      for (const [tName, map] of Object.entries(this.tables)) {
        serialized.tables[tName] = Object.fromEntries(map.entries());
      }
      const dir = path.dirname(this.durableFileBackend);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmp = `${this.durableFileBackend}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}`;
      fs.writeFileSync(tmp, JSON.stringify(serialized, null, 2), { mode: 0o600 });
      try {
        if (fs.existsSync(this.durableFileBackend)) {
          fs.unlinkSync(this.durableFileBackend);
        }
        fs.renameSync(tmp, this.durableFileBackend);
      } catch (err) {
        fs.copyFileSync(tmp, this.durableFileBackend);
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      }
      this._lastMtime = fs.statSync(this.durableFileBackend).mtimeMs;
    } catch (e) {
      console.warn('Failed to flush cloud storage to durable volume:', e.message);
    }
  }

  _rebuildIndexes() {
    this.uniqueIndexes.question_bank_hash.clear();
    for (const q of this.tables.question_bank_v2.values()) {
      if (q.content_hash || q.fingerprint) {
        this.uniqueIndexes.question_bank_hash.add(`${q.subject_id || q.subjectId}:${q.grade}:${q.content_hash || q.fingerprint}`);
      }
    }
    this.uniqueIndexes.candidate_fingerprint.clear();
    for (const c of this.tables.ntmk_review_candidates.values()) {
      if (c.fingerprint) {
        this.uniqueIndexes.candidate_fingerprint.add(`${c.subject_id || c.subjectId}:${c.grade}:${c.fingerprint}`);
      }
    }
    this.uniqueIndexes.exam_result_session.clear();
    for (const r of this.tables.ntmk_exam_results.values()) {
      this.uniqueIndexes.exam_result_session.add(String(r.session_id || r.sessionId));
    }
  }

  // ═════════════════════════════════════════════════════════════
  // 1. QUESTION BANK CLOUD PERSISTENCE
  // ═════════════════════════════════════════════════════════════
  async saveQuestion(question, auditEntry = null) {
    if (this.realRepo) {
      return await this.realRepo.saveQuestion(question, auditEntry);
    }

    if (!question || !question.id) throw new Error('Question must have valid ID');
    this._checkVolumeFreshness();
    const hash = question.content_hash || question.fingerprint;
    const sub = question.subject_id || question.subjectId;
    const gr = question.grade;
    const hashKey = `${sub}:${gr}:${hash}`;

    const existing = this.tables.question_bank_v2.get(question.id);
    if (!existing && hash && this.uniqueIndexes.question_bank_hash.has(hashKey)) {
      const err = new Error(`duplicate key value violates unique constraint "uq_question_content_hash"`);
      err.code = '23505';
      throw err;
    }

    const row = {
      ...question,
      subject_id: sub,
      grade: Number(gr),
      content_hash: hash,
      updated_at: new Date().toISOString()
    };

    if (auditEntry) {
      await this.recordAudit({
        questionId: question.id,
        actorId: auditEntry.by || 'system',
        action: auditEntry.action || 'update',
        evidence: auditEntry.notes || ''
      });
    }

    this.tables.question_bank_v2.set(question.id, row);
    if (hash) this.uniqueIndexes.question_bank_hash.add(hashKey);
    this._flushToDurableVolume();
    return row;
  }

  async getQuestionById(id) {
    if (this.realRepo) return await this.realRepo.getQuestionById(id);
    this._checkVolumeFreshness();
    return this.tables.question_bank_v2.get(id) || null;
  }

  async queryQuestions(filter = {}) {
    if (this.realRepo) return await this.realRepo.queryQuestions(filter);
    this._checkVolumeFreshness();
    let rows = Array.from(this.tables.question_bank_v2.values());
    if (filter.subjectId) {
      const cleanSub = String(filter.subjectId).replace(/\d+$/, '').toLowerCase();
      rows = rows.filter(r => (r.subject_id || r.subjectId) === cleanSub);
    }
    if (filter.grade) {
      rows = rows.filter(r => Number(r.grade) === Number(filter.grade));
    }
    if (filter.status) {
      rows = rows.filter(r => r.status === filter.status);
    }
    if (filter.verificationStatus) {
      rows = rows.filter(r => (r.source?.verificationStatus || r.verification_status) === filter.verificationStatus);
    }
    const total = rows.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    return {
      total,
      offset,
      limit,
      questions: rows.slice(offset, offset + limit)
    };
  }

  // ═════════════════════════════════════════════════════════════
  // 2. REVIEW CANDIDATES CLOUD PERSISTENCE
  // ═════════════════════════════════════════════════════════════
  async saveReviewCandidate(candidate) {
    if (this.realRepo) return await this.realRepo.saveReviewCandidate(candidate);
    if (!candidate || !candidate.id) throw new Error('Candidate must have valid ID');
    this._checkVolumeFreshness();
    const sub = candidate.subject_id || candidate.subjectId;
    const gr = candidate.grade;
    const fp = candidate.fingerprint;
    const fpKey = `${sub}:${gr}:${fp}`;

    const existing = this.tables.ntmk_review_candidates.get(candidate.id);
    if (!existing && fp && this.uniqueIndexes.candidate_fingerprint.has(fpKey)) {
      const err = new Error(`duplicate key value violates unique constraint "uq_review_candidate_fingerprint"`);
      err.code = '23505';
      throw err;
    }

    const row = {
      ...candidate,
      subject_id: sub,
      grade: Number(gr),
      fingerprint: fp,
      updated_at: new Date().toISOString()
    };

    this.tables.ntmk_review_candidates.set(candidate.id, row);
    if (fp) this.uniqueIndexes.candidate_fingerprint.add(fpKey);
    this._flushToDurableVolume();
    return row;
  }

  async getReviewCandidate(id) {
    if (this.realRepo) return await this.realRepo.getReviewCandidate(id);
    this._checkVolumeFreshness();
    return this.tables.ntmk_review_candidates.get(id) || null;
  }

  async queryReviewCandidates(filter = {}) {
    this._checkVolumeFreshness();
    let rows = Array.from(this.tables.ntmk_review_candidates.values());
    if (filter.subjectId) rows = rows.filter(r => (r.subject_id || r.subjectId) === filter.subjectId);
    if (filter.grade) rows = rows.filter(r => Number(r.grade) === Number(filter.grade));
    if (filter.reviewStatus) rows = rows.filter(r => r.reviewStatus === filter.reviewStatus);
    return rows;
  }

  // ═════════════════════════════════════════════════════════════
  // 3. INGESTION JOBS & DISTRIBUTED LOCKING
  // ═════════════════════════════════════════════════════════════
  async acquireSyncLease(leaseKey, holderId, ttlMs = 30000) {
    if (this.realRepo) return await this.realRepo.acquireSyncLease(leaseKey, holderId, ttlMs);
    this._checkVolumeFreshness();
    const now = Date.now();
    const existing = this.tables.ntmk_sync_leases.get(leaseKey);

    if (existing && existing.expiresAt > now) {
      if (existing.holderId === holderId) {
        existing.expiresAt = now + ttlMs;
        this.tables.ntmk_sync_leases.set(leaseKey, existing);
        this._flushToDurableVolume();
        return { acquired: true, leaseKey, holderId, expiresAt: existing.expiresAt };
      }
      return {
        acquired: false,
        leaseKey,
        heldBy: existing.holderId,
        expiresAt: existing.expiresAt,
        message: `Distributed lock held by instance '${existing.holderId}' until ${new Date(existing.expiresAt).toISOString()}`
      };
    }

    const lease = {
      leaseKey,
      holderId,
      acquiredAt: now,
      expiresAt: now + ttlMs
    };
    this.tables.ntmk_sync_leases.set(leaseKey, lease);
    this._flushToDurableVolume();
    return { acquired: true, leaseKey, holderId, expiresAt: lease.expiresAt };
  }

  async releaseSyncLease(leaseKey, holderId) {
    if (this.realRepo) return await this.realRepo.releaseSyncLease(leaseKey, holderId);
    this._checkVolumeFreshness();
    const existing = this.tables.ntmk_sync_leases.get(leaseKey);
    if (existing && existing.holderId === holderId) {
      this.tables.ntmk_sync_leases.delete(leaseKey);
      this._flushToDurableVolume();
      return true;
    }
    return false;
  }

  async saveSyncJob(job) {
    if (this.realRepo) return await this.realRepo.saveSyncJob(job);
    this._checkVolumeFreshness();
    const id = job.syncId || job.id || crypto.randomUUID();
    const row = {
      ...job,
      id,
      completedAt: job.completedAt || new Date().toISOString()
    };
    this.tables.ntmk_sync_jobs.set(id, row);
    this._flushToDurableVolume();
    return row;
  }

  async getSyncJobs(limit = 10) {
    if (this.realRepo) return await this.realRepo.getSyncJobs(limit);
    this._checkVolumeFreshness();
    const rows = Array.from(this.tables.ntmk_sync_jobs.values());
    rows.sort((a, b) => new Date(b.completedAt || b.startedAt) - new Date(a.completedAt || a.startedAt));
    return rows.slice(0, limit);
  }

  // ═════════════════════════════════════════════════════════════
  // 4. EXAM SESSIONS & TRANSACTIONAL IDEMPOTENCY
  // ═════════════════════════════════════════════════════════════
  async saveExamSession(session) {
    if (this.realRepo) return await this.realRepo.saveExamSession(session);
    if (!session || !session.id) throw new Error('Exam session requires ID');
    this._checkVolumeFreshness();
    const row = {
      ...session,
      created_at: session.created_at || new Date().toISOString()
    };
    this.tables.ntmk_exam_sessions.set(session.id, row);
    this._flushToDurableVolume();
    return row;
  }

  async getExamSession(sessionId) {
    if (this.realRepo) return await this.realRepo.getExamSession(sessionId);
    this._checkVolumeFreshness();
    return this.tables.ntmk_exam_sessions.get(sessionId) || null;
  }

  async saveExamResult(sessionId, result) {
    if (this.realRepo) return await this.realRepo.saveExamResult(sessionId, result);
    if (!sessionId) throw new Error('Session ID required');
    this._checkVolumeFreshness();

    const existing = this.tables.ntmk_exam_results.get(sessionId);
    if (existing) {
      return existing;
    }

    if (this.uniqueIndexes.exam_result_session.has(sessionId)) {
      return this.tables.ntmk_exam_results.get(sessionId);
    }

    const row = {
      session_id: sessionId,
      sessionId,
      result,
      ...result,
      submitted_at: result.submittedAt || new Date().toISOString()
    };

    this.tables.ntmk_exam_results.set(sessionId, row);
    this.uniqueIndexes.exam_result_session.add(sessionId);

    const session = this.tables.ntmk_exam_sessions.get(sessionId);
    if (session) {
      session.result = row;
      this.tables.ntmk_exam_sessions.set(sessionId, session);
    }

    this._flushToDurableVolume();
    return row;
  }

  async getExamResult(sessionId) {
    if (this.realRepo) return await this.realRepo.getExamResult(sessionId);
    this._checkVolumeFreshness();
    return this.tables.ntmk_exam_results.get(sessionId) || null;
  }

  // ═════════════════════════════════════════════════════════════
  // 5. AUDIT TRAIL PERSISTENCE
  // ═════════════════════════════════════════════════════════════
  async recordAudit(entry) {
    if (this.realRepo) return await this.realRepo.recordAudit(entry);
    this._checkVolumeFreshness();
    const id = entry.id || `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const row = {
      id,
      question_id: entry.questionId,
      actor_id: entry.actorId,
      actor_name: entry.actorName || entry.actorId,
      actor_role: entry.actorRole || 'unknown',
      action: entry.action,
      evidence: entry.evidence || null,
      notes: entry.notes || '',
      created_at: new Date().toISOString()
    };
    this.tables.ntmk_content_audit.set(id, row);
    this._flushToDurableVolume();
    return row;
  }

  async getAuditLog(questionId = null) {
    if (this.realRepo) return await this.realRepo.getAuditLog(questionId);
    this._checkVolumeFreshness();
    let rows = Array.from(this.tables.ntmk_content_audit.values());
    if (questionId) rows = rows.filter(r => r.question_id === questionId);
    return rows;
  }

  // ═════════════════════════════════════════════════════════════
  // 6. RLS ACCESS VERIFICATION
  // ═════════════════════════════════════════════════════════════
  checkRLSAccess(role, table, action) {
    if (this.realRepo) return this.realRepo.checkRLSAccess(role, table, action);

    const privateTables = [
      'question_bank_v2',
      'ntmk_source_permissions',
      'ntmk_review_candidates',
      'ntmk_sync_jobs',
      'ntmk_sync_leases',
      'ntmk_exam_sessions',
      'ntmk_exam_results',
      'ntmk_content_audit',
      'ntmk_reviewers'
    ];

    if (role === 'service_role') {
      return { allowed: true, reason: 'Service role has backend admin access' };
    }

    if (role === 'anon' || role === 'authenticated') {
      if (privateTables.includes(table)) {
        return {
          allowed: false,
          reason: `RLS REVOKE: Role '${role}' is forbidden from direct access to '${table}'. Public clients must query server-side sanitized projections.`
        };
      }
    }

    return { allowed: false, reason: `Unknown role or unauthorized action: ${role} on ${table}` };
  }
}

module.exports = CloudStorageAdapter;
