/**
 * Persistent Question Bank Storage Layer (NTMK Rebuild Phase 02B - Task 6)
 * Supports Express local file persistence, Vercel Serverless & Supabase PostgreSQL
 */

const fs = require('fs');
const path = require('path');
const LocalState = require('./local-state.js');
const CloudStorageAdapter = require('./cloud-storage-adapter.js');
const QuestionSchemaV2 = require('../schema.js');
const EnvironmentConfig = require('../config/environment-config.js');

class BankStorage {
  constructor(options = {}) {
    this.baseDir = options.baseDir || process.cwd();
    this.storagePath = options.storagePath || process.env.NTMK_BANK_PATH || path.join(this.baseDir, '.ntmk', 'question-bank-v2.json');
    this.storageAdapter = options.storageAdapter || null;
    if (!this.storageAdapter && (options.supabaseClient || options.databaseUrl || process.env.SUPABASE_URL || process.env.DATABASE_URL)) {
      try {
        this.storageAdapter = new CloudStorageAdapter(options);
      } catch (err) {
        if (process.env.VERCEL) throw err;
      }
    }
    
    if (!this.storageAdapter) {
      if (process.env.VERCEL) throw new Error('BLOCKED: durable serverless storage is not configured');
      this.fileState = new LocalState(this.storagePath);
    }
    this.supabaseClient = options.supabaseClient || null;
    this.questionsMap = new Map(); // id -> Question Record
    this.isLoaded = false;

    this._initStorage();
  }

  _initStorage() {
    if (this.isLoaded) return;
    try {
      if (this.storageAdapter) {
        // Hydrate from cloud storage adapter
        if (this.storageAdapter.tables && this.storageAdapter.tables.question_bank_v2) {
          for (const [id, q] of this.storageAdapter.tables.question_bank_v2.entries()) {
            this.questionsMap.set(id, q);
          }
        }
        this.isLoaded = true;
        return;
      }

      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(q => this.questionsMap.set(q.id, q));
        } else if (parsed && typeof parsed.questions === 'object') {
          Object.values(parsed.questions).forEach(q => this.questionsMap.set(q.id, q));
        }
      } else {
        // Initialize empty bank storage
        this._persistToFile();
      }
      this.isLoaded = true;
    } catch (err) {
      throw err;
    }
  }

  _persistToFile() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const records = Array.from(this.questionsMap.values());
      this.fileState.write(records);
    } catch (err) {
      throw err;
    }
  }

  /**
   * Save a single question into persistent storage
   */
  async save(question, auditEntry = null) {
    if (!question || !question.id) throw new Error('Question must have a valid ID');

    if (question.fingerprint && Array.from(this.questionsMap.values()).some(q=>q.fingerprint === question.fingerprint && q.id !== question.id)) throw new Error('Duplicate fingerprint');
    const existing = this.questionsMap.get(question.id) || {};
    const auditLog = existing.auditLog || [];
    if (auditEntry) {
      auditLog.push({
        action: auditEntry.action || 'update',
        by: auditEntry.by || 'system',
        timestamp: new Date().toISOString(),
        notes: auditEntry.notes || ''
      });
    }

    const record = {
      ...question,
      auditLog,
      updatedAt: new Date().toISOString()
    };

    if (this.storageAdapter) {
      const saved = await this.storageAdapter.saveQuestion(record, auditEntry);
      this.questionsMap.set(record.id, saved);
      return saved;
    }

    this.questionsMap.set(record.id, record);
    try { this._persistToFile(); } catch (err) { if (existing.id) this.questionsMap.set(record.id,existing); else this.questionsMap.delete(record.id); throw err; }

    // Async sync to Supabase if configured
    if (this.supabaseClient) {
      try {
        await this.supabaseClient.from('question_bank_v2').upsert(record);
      } catch (e) {
        console.warn('Supabase sync warning:', e.message);
      }
    }

    return record;
  }

  /**
   * Save a batch of questions
   */
  async saveBatch(questions = [], auditEntry = null) {
    const saved = [];
    for (const q of questions) {
      const res = await this.save(q, auditEntry);
      saved.push(res);
    }
    return saved;
  }

  getById(id) {
    if (this.questionsMap.has(id)) return this.questionsMap.get(id);
    if (this.storageAdapter && this.storageAdapter.tables && this.storageAdapter.tables.question_bank_v2) {
      const q = this.storageAdapter.tables.question_bank_v2.get(id);
      if (q) {
        this.questionsMap.set(id, q);
        return q;
      }
    }
    return null;
  }

  /**
   * Rollback published question to archived status
   */
  async rollback(questionId, { rolledBackBy = 'Curriculum Lead', reason = '' } = {}) {
    const q = this.getById(questionId);
    if (!q) throw new Error(`Question ${questionId} not found in bank`);

    const updated = {
      ...q,
      status: QuestionSchemaV2.PUBLISH_STATUS.ARCHIVED,
      auditLog: [
        ...(q.auditLog || []),
        {
          action: 'rollback',
          by: rolledBackBy,
          timestamp: new Date().toISOString(),
          notes: reason || 'Publication rolled back'
        }
      ],
      updatedAt: new Date().toISOString()
    };

    return this.save(updated);
  }

  /**
   * Query questions with filter
   */
  query(filter = {}) {
    let list = Array.from(this.questionsMap.values());

    if (filter.subjectId) {
      const cleanSub = String(filter.subjectId).replace(/\d+$/, '').toLowerCase();
      list = list.filter(q => q.subjectId === cleanSub);
    }
    if (filter.grade) {
      list = list.filter(q => Number(q.grade) === Number(filter.grade));
    }
    if (filter.format) {
      list = list.filter(q => q.format === filter.format);
    }
    if (filter.status) {
      list = list.filter(q => q.status === filter.status);
    }
    if (filter.verificationStatus) {
      list = list.filter(q => q.source && q.source.verificationStatus === filter.verificationStatus);
    }

    const total = list.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    return {
      total,
      offset,
      limit,
      questions: list.slice(offset, offset + limit)
    };
  }

  /**
   * Generate comprehensive Coverage Matrix across 12 combinations
   */
  getCoverageMatrix() {
    const subjects = ['toan', 'vatli', 'hoahoc', 'tienganh'];
    const grades = [10, 11, 12];
    const matrix = {};

    subjects.forEach(sub => {
      matrix[sub] = {};
      grades.forEach(gr => {
        const key = `${sub}${gr}`;
        const questions = Array.from(this.questionsMap.values()).filter(q => 
          q.subjectId === sub && Number(q.grade) === Number(gr)
        );

        const published = questions.filter(q => q.status === QuestionSchemaV2.PUBLISH_STATUS.PUBLISHED && q.source?.verificationStatus === 'verified' && q.source?.licenseEvidence && q.source?.permissionApproved === true);
        const verified = questions.filter(q => q.source && q.source.verificationStatus === QuestionSchemaV2.VERIFICATION_STATUS.VERIFIED);
        const mcq = published.filter(q => q.format === 'multiple_choice').length;
        const tf = published.filter(q => q.format === 'true_false_group').length;
        const sa = published.filter(q => q.format === 'short_answer').length;

        // Blueprint targets
        let targetMcq = 12, targetTf = 4, targetSa = 6;
        if (sub === 'vatli' || sub === 'hoahoc') { targetMcq = 18; targetTf = 4; targetSa = 6; }
        if (sub === 'tienganh') { targetMcq = 40; targetTf = 0; targetSa = 0; }

        const totalDraft = questions.filter(q => q.status === QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW || q.status === QuestionSchemaV2.PUBLISH_STATUS.DRAFT).length;
        const isExamReady = mcq >= targetMcq && tf >= targetTf && sa >= targetSa;
        const isPracticeReady = published.length >= 5;
        const isDraftAllowed = EnvironmentConfig.isDemoAllowed();
        const isInternalDemoReady = isDraftAllowed && questions.length >= 5;

        let readinessLevel = 'blocked_insufficient_content';
        if (isExamReady) {
          readinessLevel = 'official_blueprint_ready';
        } else if (isPracticeReady) {
          readinessLevel = 'reviewed_pilot_ready';
        } else if (isInternalDemoReady) {
          readinessLevel = 'internal_demo_ready';
        }

        matrix[sub][gr] = {
          subjectId: sub,
          grade: gr,
          comboKey: key,
          totalDiscovered: questions.length,
          totalNormalized: questions.length,
          totalDraft,
          totalVerified: verified.length,
          totalPublished: published.length,
          topicCount: new Set(published.map(q=>q.topic).filter(Boolean)).size,
          missingCurriculum: 'Curriculum mapping requires authorized subject review',
          mcqCount: mcq,
          tfGroupCount: tf,
          shortAnswerCount: sa,
          blueprintTarget: { mcq: targetMcq, tf: targetTf, sa: targetSa },
          isInternalDemoReady,
          isPracticeReady,
          isOfficialBlueprintReady: isExamReady,
          readinessLevel,
          deficiencies: {
            mcqShortage: Math.max(0, targetMcq - mcq),
            tfShortage: Math.max(0, targetTf - tf),
            saShortage: Math.max(0, targetSa - sa)
          }
        };
      });
    });

    return matrix;
  }

  getCount() {
    return this.questionsMap.size;
  }
}

module.exports = BankStorage;
