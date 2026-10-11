/**
 * Multi-Process Worker for Real Cross-Instance Concurrency Testing
 * NTMK Rebuild Phase 02C/02D Hardening & Real Cloud Acceptance
 * Runs in an isolated OS process with zero shared JavaScript memory.
 */

const CloudStorageAdapter = require('../engine/storage/cloud-storage-adapter.js');
const BankStorage = require('../engine/storage/bank-storage.js');
const ExamService = require('../engine/exam-service.js');
const SyncManager = require('../engine/ingestion/sync-manager.js');
const ReviewQueue = require('../engine/ingestion/review-queue.js');
const QuestionPublisher = require('../engine/ingestion/question-publisher.js');

let adapter = null;
let bank = null;
let examService = null;
let syncManager = null;
let reviewQueue = null;
let publisher = null;

process.on('message', async (msg) => {
  try {
    const { command, payload, id } = msg;

    if (command === 'init') {
      const { durableVolume, workerId, databaseUrl, supabaseUrl, supabaseServiceKey, enforceCloud } = payload;
      adapter = new CloudStorageAdapter({
        durableFileBackend: durableVolume,
        databaseUrl: databaseUrl || process.env.DATABASE_URL,
        supabaseUrl: supabaseUrl || process.env.SUPABASE_URL,
        supabaseServiceKey: supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY,
        enforceCloud: Boolean(enforceCloud)
      });
      bank = new BankStorage({ storageAdapter: adapter });
      reviewQueue = new ReviewQueue(null, { storageAdapter: adapter });
      publisher = new QuestionPublisher(reviewQueue, bank);
      examService = new ExamService(bank, null, { storageAdapter: adapter });
      syncManager = new SyncManager({ storageAdapter: adapter });
      process.send({ id, status: 'ok', pid: process.pid, workerId });
      return;
    }

    if (command === 'write_question_and_session') {
      const { question, session } = payload;
      const savedQ = await bank.save(question);
      const savedS = await adapter.saveExamSession(session);
      process.send({ id, status: 'ok', pid: process.pid, savedQ, savedS });
      return;
    }

    if (command === 'write_full_storage_bundle') {
      const { question, candidate, syncJob, session } = payload;
      const savedQ = question ? await bank.save(question) : null;
      const savedC = candidate ? await adapter.saveReviewCandidate(candidate) : null;
      const savedJ = syncJob ? await adapter.saveSyncJob(syncJob) : null;
      const savedS = session ? await adapter.saveExamSession(session) : null;
      process.send({ id, status: 'ok', pid: process.pid, savedQ, savedC, savedJ, savedS });
      return;
    }

    if (command === 'query_question_and_session') {
      const { questionId, sessionId } = payload;
      const q = await bank.getById(questionId);
      const s = await adapter.getExamSession(sessionId);
      process.send({ id, status: 'ok', pid: process.pid, q, s });
      return;
    }

    if (command === 'query_full_storage_bundle') {
      const { questionId, candidateId, sessionId, limitJobs } = payload;
      const q = questionId ? await bank.getById(questionId) : null;
      const c = candidateId ? await adapter.getReviewCandidate(candidateId) : null;
      const s = sessionId ? await adapter.getExamSession(sessionId) : null;
      const jobs = await adapter.getSyncJobs(limitJobs || 10);
      process.send({ id, status: 'ok', pid: process.pid, q, c, s, jobs });
      return;
    }

    if (command === 'submit_exam') {
      const { sessionId, token, userAnswers } = payload;
      const result = await Promise.resolve(examService.submit({ sessionId, token, userAnswers }));
      process.send({ id, status: 'ok', pid: process.pid, result });
      return;
    }

    if (command === 'acquire_lease') {
      const { leaseKey, holderId, ttlMs } = payload;
      const lease = await adapter.acquireSyncLease(leaseKey, holderId, ttlMs);
      process.send({ id, status: 'ok', pid: process.pid, lease });
      return;
    }

    if (command === 'release_lease') {
      const { leaseKey, holderId } = payload;
      const released = await adapter.releaseSyncLease(leaseKey, holderId);
      process.send({ id, status: 'ok', pid: process.pid, released });
      return;
    }

    if (command === 'test_publication') {
      const { candidateId, reviewerActor } = payload;
      try {
        const { defaultDirectory } = require('../engine/auth/reviewer-directory.js');
        if (!defaultDirectory.canPublish(reviewerActor)) {
          throw new Error(`Unauthorized reviewer '${reviewerActor}'. Only curriculum_lead can publish.`);
        }
        const published = await publisher.publish(candidateId, { publishedBy: reviewerActor });
        process.send({ id, status: 'ok', pid: process.pid, published });
      } catch (pubErr) {
        process.send({ id, status: 'rejected', pid: process.pid, reason: pubErr.message });
      }
      return;
    }

    if (command === 'check_rls') {
      const { role, table, action } = payload;
      const rls = adapter.checkRLSAccess(role, table, action);
      process.send({ id, status: 'ok', pid: process.pid, rls });
      return;
    }

    process.send({ id, status: 'error', error: `Unknown command: ${command}` });
  } catch (err) {
    process.send({ id: msg?.id, status: 'error', error: err.message, stack: err.stack });
  }
});
