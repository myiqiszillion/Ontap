/**
 * Sync Manager — Automated Question Acquisition Orchestrator
 * NTMK Rebuild Phase 02B — Task 7
 *
 * Responsibilities:
 * - Schedule & execute ingestion runs from all registered connectors
 * - Track sync history with per-source audit logs
 * - Expose sync status & coverage metrics to Admin API
 * - Handle errors gracefully (no crash, partial ingestion OK)
 */

const LocalState = require('../storage/local-state.js');
const SourceRegistry = require('./source-registry.js');
const IngestionPipeline = require('./pipeline.js');
const ReviewQueue = require('./review-queue.js');
const QuestionPublisher = require('./question-publisher.js');
const BankStorage = require('../storage/bank-storage.js');
const MoetReferenceConnector = require('./connectors/moet-reference-connector.js');
const OerOpenStaxConnector = require('./connectors/oer-openstax-connector.js');

class SyncManager {
  constructor(options = {}) {
    this.storageAdapter = options.storageAdapter || null;
    this.bankStorage = options.bankStorage || new BankStorage({ storageAdapter: this.storageAdapter, ...(options.storageOptions || {}) });
    if (!this.storageAdapter && this.bankStorage.storageAdapter) {
      this.storageAdapter = this.bankStorage.storageAdapter;
    }
    this.reviewQueue = options.reviewQueue || new ReviewQueue(
      this.storageAdapter ? null : new LocalState(this.bankStorage.storagePath + '.review.json'),
      { storageAdapter: this.storageAdapter }
    );
    if (!this.storageAdapter) {
      this.jobState = new LocalState(this.bankStorage.storagePath + '.jobs.json');
    }
    this.pipeline = new IngestionPipeline(this.reviewQueue);
    this.publisher = new QuestionPublisher(this.reviewQueue, this.bankStorage);

    // Connector registry
    this.connectors = new Map();
    this._registerDefaultConnectors();

    // Sync history & state
    this.syncHistory = this.storageAdapter && this.storageAdapter.tables ? Array.from(this.storageAdapter.tables.ntmk_sync_jobs.values()) : (this.jobState ? this.jobState.read([]) : []);
    this.isSyncing = false;
    this.lastSyncAt = this.syncHistory.at(-1)?.completedAt || null;

    // Scheduling
    this._intervalHandle = null;
    this.syncIntervalMs = options.syncIntervalMs || 24 * 60 * 60 * 1000; // Default: daily
  }

  _registerDefaultConnectors() {
    this.connectors.set('moet_official_sample_2025', new MoetReferenceConnector());
    this.connectors.set('oer_openstax_science', new OerOpenStaxConnector());
  }

  /**
   * Register a custom connector
   */
  registerConnector(id, connector) {
    if (!id || !connector) throw new Error('Connector ID and instance required');
    this.connectors.set(id, connector);
  }

  /**
   * Run a full sync across all connectors for all subjects and grades
   */
  async syncAll(options = {}) {
    if (this.isSyncing) {
      return { status: 'already_running', message: 'A sync is already in progress' };
    }

    const workerId = options.workerId || `worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`;
    let leaseAcquired = false;
    if (this.storageAdapter && typeof this.storageAdapter.acquireSyncLease === 'function') {
      const lease = await this.storageAdapter.acquireSyncLease('ingestion_sync_all', workerId, 30000);
      if (!lease.acquired) {
        return { status: 'already_running', error: lease.message || 'Distributed lock contention: sync in progress by another worker' };
      }
      leaseAcquired = true;
    }

    if (options.subjects && (!Array.isArray(options.subjects) || options.subjects.some(s=>!['toan','vatli','hoahoc','tienganh'].includes(s)))) throw new Error('Invalid subjects');
    if (options.grades && (!Array.isArray(options.grades) || options.grades.some(g=>![10,11,12].includes(g)))) throw new Error('Invalid grades');
    this.isSyncing = true;
    try {
    const syncId = require('crypto').randomUUID();
    const startTime = Date.now();
    const subjects = options.subjects || ['toan', 'vatli', 'hoahoc', 'tienganh'];
    const grades = options.grades || [10, 11, 12];
    if (options.autoVerify || options.autoPublish) { this.isSyncing = false; throw new Error('Automatic verification/publication is forbidden'); }

    const report = {
      syncId,
      startedAt: new Date().toISOString(),
      connectors: [],
      totalDiscovered: 0,
      totalIngested: 0,
      totalDuplicates: 0,
      totalInvalid: 0,
      totalVerified: 0,
      totalPublished: 0,
      errors: []
    };

    for (const [connectorId, connector] of this.connectors) {
      const connectorReport = {
        connectorId,
        connectorName: connector.sourceName || connectorId,
        subjects: [],
        totalFromConnector: 0,
        ingestedFromConnector: 0,
        errors: []
      };

      try {
        if (connector.config.enabled === false || !SourceRegistry.isCompliant(connectorId)) throw new Error('BLOCKED: source disabled or permission unapproved');
        const connection = await connector.connect();
        if (!connection.connected) throw new Error('Source unavailable');

        for (const subject of subjects) {
          for (const grade of grades) {
            try {
              const fetchResult = await connector.fetchData({ subject, grade });
              const rawData = fetchResult.rawData;
              if (!rawData) throw new Error('Empty source response');

              if (Array.isArray(rawData) && rawData.length === 0) continue;

              // Extract
              const extracted = await connector.extractQuestions(rawData);
              const normalized = extracted.map(q => connector.normalizeQuestion(q));
              if (normalized.some(q=>q.subjectId !== subject || Number(q.grade) !== Number(grade))) throw new Error('Incorrect source subject/grade metadata');

              // Ingest through pipeline
              const ingestResult = this.pipeline.ingest(normalized, {
                sourceId: connectorId,
                sourceName: connector.sourceName || connectorId,
                ...SourceRegistry.getSource(connectorId),
                sourceId: connectorId,
                sourceUrl: fetchResult.metadata?.url || connector.config.sourceUrl,
                rawSource: fetchResult.rawData
              });

              connectorReport.subjects.push({
                subject,
                grade,
                discovered: extracted.length,
                ingested: ingestResult.ingested,
                duplicates: ingestResult.duplicates,
                invalid: ingestResult.invalid
              });

              connectorReport.totalFromConnector += extracted.length;
              connectorReport.ingestedFromConnector += ingestResult.ingested;
              report.totalDiscovered += extracted.length;
              report.totalIngested += ingestResult.ingested;
              report.totalDuplicates += ingestResult.duplicates;
              report.totalInvalid += ingestResult.invalid;

              if (ingestResult.errors.length > 0) {
                connectorReport.errors.push(...ingestResult.errors);
              }
            } catch (err) {
              const errorMsg = `Connector ${connectorId} failed for ${subject}/${grade}: ${err.message}`;
              connectorReport.errors.push(errorMsg);
              report.errors.push(errorMsg);
            }
          }
        }
      } catch (err) {
        const errorMsg = `Connector ${connectorId} connection failed: ${err.message}`;
        connectorReport.errors.push(errorMsg);
        report.errors.push(errorMsg);
      }

      report.connectors.push(connectorReport);
    }

    report.completedAt = new Date().toISOString();
    report.durationMs = Date.now() - startTime;
    report.status = report.errors.length === 0 ? 'success' : 'partial_success';

    this.reviewQueue.persist();
    this.syncHistory.push(report);
    if (this.storageAdapter && typeof this.storageAdapter.saveSyncJob === 'function') {
      await this.storageAdapter.saveSyncJob(report);
    }
    if (this.jobState) {
      this.jobState.write(this.syncHistory);
    }
    this.lastSyncAt = report.completedAt;
    this.isSyncing = false;

    return report;
    } finally {
      if (leaseAcquired && this.storageAdapter && typeof this.storageAdapter.releaseSyncLease === 'function') {
        await this.storageAdapter.releaseSyncLease('ingestion_sync_all', workerId);
      }
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single connector by ID
   */
  async syncConnector(connectorId, options = {}) {
    const connector = this.connectors.get(connectorId);
    if (!connector) throw new Error(`Connector ${connectorId} not found`);

    const saved = this.connectors;
    this.connectors = new Map([[connectorId, connector]]);
    try { return await this.syncAll(options); } finally { this.connectors = saved; }
  }

  /**
   * Start periodic auto-sync (non-blocking)
   */
  startSchedule() {
    throw new Error('Use authenticated external scheduler; background intervals are disabled');
  }

  stopSchedule() {
    if (this._intervalHandle) {
      clearInterval(this._intervalHandle);
      this._intervalHandle = null;
    }
    return { scheduled: false };
  }

  /**
   * Get sync status summary
   */
  getStatus() {
    return {
      isSyncing: this.isSyncing,
      isScheduled: Boolean(this._intervalHandle),
      syncIntervalMs: this.syncIntervalMs,
      lastSyncAt: this.lastSyncAt,
      totalSyncs: this.syncHistory.length,
      connectorCount: this.connectors.size,
      connectors: Array.from(this.connectors.entries()).map(([id, c]) => ({
        id,
        name: c.sourceName || id,
        license: c.license || 'unknown'
      })),
      reviewQueueStats: this.reviewQueue.getStats(),
      bankStats: {
        totalQuestions: this.bankStorage.getCount()
      },
      recentSyncs: this.syncHistory.slice(-5).map(s => ({
        syncId: s.syncId,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        status: s.status,
        totalDiscovered: s.totalDiscovered,
        totalIngested: s.totalIngested,
        totalPublished: s.totalPublished,
        errorCount: s.errors.length
      }))
    };
  }

  /**
   * Get full coverage matrix from bank storage
   */
  getCoverageMatrix() {
    const storage = Object.create(this.bankStorage);
    storage.questionsMap = new Map([...this.reviewQueue.items, ...this.bankStorage.questionsMap]);
    return storage.getCoverageMatrix();
  }

  /**
   * Get last N sync history entries
   */
  getSyncHistory(limit = 10) {
    return this.syncHistory.slice(-limit);
  }
}

module.exports = SyncManager;
