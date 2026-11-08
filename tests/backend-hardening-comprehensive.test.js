/**
 * Backend Hardening & GDPT 2018 Completeness Acceptance Tests
 * NTMK Comprehensive Backend Audit Verification
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const http = require('http');

const BlueprintGenerator = require('../engine/blueprint-generator.js');
const ScoringEngine = require('../engine/scoring.js');
const ExamService = require('../engine/exam-service.js');
const SyncManager = require('../engine/ingestion/sync-manager.js');
const AutoCrawlerService = require('../engine/ingestion/auto-crawler-service.js');
const { loadSubjectsData, sanitizeLegacyLessonQuestions, isValidSubjectKey, isValidGrade } = require('../engine/subject-loader.js');
const CloudStorageAdapter = require('../engine/storage/cloud-storage-adapter.js');
const { TenantRepository, defaultTenantRepository } = require('../engine/storage/tenant-repository.js');
const LearningStorage = require('../engine/planner/learning-storage.js');
const { app } = require('../server.js');

describe('Backend Hardening & GDPT 2018 Completeness Suite', () => {

  describe('1. GDPT 2018 / Decision 764 Completeness for Sinh học & Lịch sử', () => {
    it('1.1 BlueprintGenerator provides valid Decision 764 blueprint for sinhhoc', () => {
      const bp = BlueprintGenerator.getBlueprint('sinhhoc');
      assert.ok(bp, 'Blueprint for sinhhoc must exist');
      assert.equal(bp.subjectId, 'sinhhoc');
      assert.equal(bp.subjectName, 'Sinh học');
      assert.equal(bp.durationMinutes, 50);
      assert.equal(bp.totalQuestions, 28);
      assert.equal(bp.totalCommands, 40);
      assert.equal(bp.totalPoints, 10.0);
      assert.equal(bp.sections.length, 3);

      // Part 1: 18 MCQ * 0.25 = 4.5
      assert.equal(bp.sections[0].format, 'multiple_choice');
      assert.equal(bp.sections[0].targetCount, 18);
      assert.equal(bp.sections[0].maxPoints, 4.5);

      // Part 2: 4 TF * 1.0 = 4.0
      assert.equal(bp.sections[1].format, 'true_false_group');
      assert.equal(bp.sections[1].targetCount, 4);
      assert.equal(bp.sections[1].maxPoints, 4.0);

      // Part 3: 6 SA * 0.25 = 1.5
      assert.equal(bp.sections[2].format, 'short_answer');
      assert.equal(bp.sections[2].targetCount, 6);
      assert.equal(bp.sections[2].maxPoints, 1.5);
    });

    it('1.2 ScoringEngine provides verified profiles for sinhhoc and lichsu', () => {
      const bio = ScoringEngine.getSubjectProfile('sinhhoc');
      assert.equal(bio.name, 'Sinh học');
      assert.equal(bio.mcqPoints, 0.25);
      assert.equal(bio.tfGroupPoints, 1.0);
      assert.equal(bio.saPoints, 0.25);
      assert.equal(bio.totalPoints, 10.0);

      const hist = ScoringEngine.getSubjectProfile('lichsu');
      assert.equal(hist.name, 'Lịch sử');
      assert.equal(hist.mcqPoints, 0.3);
      assert.equal(hist.tfGroupPoints, 1.0);
      assert.equal(hist.saPoints, 0);
      assert.equal(hist.totalPoints, 10.0);
    });

    it('1.3 ExamService permits exam start for sinhhoc and lichsu', () => {
      const mockBank = {
        query: () => ({ questions: [] }),
        storageAdapter: { saveExamSession: () => {} }
      };
      const examService = new ExamService(mockBank, null, { storageAdapter: mockBank.storageAdapter });

      // If subject is invalid it throws 'Invalid subject or grade', but for sinhhoc / lichsu it proceeds to pool check
      assert.throws(
        () => examService.start('unknown_subject', 11),
        /Invalid subject or grade/
      );

      assert.throws(
        () => examService.start('sinhhoc', 11),
        /Insufficient verified published data/
      );

      assert.throws(
        () => examService.start('lichsu', 11),
        /Insufficient verified published data/
      );
    });

    it('1.4 SyncManager accepts sinhhoc and lichsu in subject filter', async () => {
      const sm = new SyncManager();
      // Should not throw 'Invalid subjects'
      try {
        await sm.syncAll({ subjects: ['sinhhoc', 'lichsu'], grades: [11] });
      } catch (err) {
        assert.notEqual(err.message, 'Invalid subjects');
      }
    });
  });

  describe('2. Security Hardening & Crawler Protection', () => {
    it('2.1 AutoCrawlerService.saveQuestionsToDisk validates subjectId whitelist', () => {
      assert.throws(
        () => AutoCrawlerService.saveQuestionsToDisk({
          questions: [{ id: 'q1', prompt: 'test' }],
          subjectId: 'hacked_subject',
          grade: 11
        }),
        /Môn học không hợp lệ/
      );
    });

    it('2.2 AutoCrawlerService.saveQuestionsToDisk validates grade whitelist', () => {
      assert.throws(
        () => AutoCrawlerService.saveQuestionsToDisk({
          questions: [{ id: 'q1', prompt: 'test' }],
          subjectId: 'toan',
          grade: 99
        }),
        /Khối lớp không hợp lệ/
      );
    });

    it('2.3 AutoCrawlerService.saveQuestionsToDisk rejects empty question array', () => {
      assert.throws(
        () => AutoCrawlerService.saveQuestionsToDisk({
          questions: [],
          subjectId: 'toan',
          grade: 11
        }),
        /Danh sách câu hỏi trống/
      );
    });
  });

  describe('3. Centralized Subject Loader & Code Deduplication', () => {
    it('3.1 loadSubjectsData returns valid catalog with ready indicators', () => {
      const data = loadSubjectsData();
      assert.ok(data.subjects);
      assert.ok(Array.isArray(data.subjects));

      const sinhhoc = data.subjects.find(s => s.id === 'sinhhoc11');
      assert.ok(sinhhoc, 'sinhhoc11 must be in catalog');
      assert.equal(sinhhoc.ready, true);
      assert.ok(sinhhoc.questionCount > 0);

      const lichsu = data.subjects.find(s => s.id === 'lichsu11');
      assert.ok(lichsu, 'lichsu11 must be in catalog');
      assert.equal(lichsu.ready, true);
      assert.ok(lichsu.questionCount > 0);
    });

    it('3.2 sanitizeLegacyLessonQuestions strips all answers and explanations', () => {
      const raw = {
        subject: 'Toán',
        lessons: [
          {
            title: 'Bài 1',
            questions: [
              { id: 'q1', question: '1+1=?', options: ['2', '3'], correct: 0, correctAnswer: '2', explanation: 'Lời giải chi tiết' }
            ],
            questionGroups: [
              {
                id: 'g1',
                statements: [
                  { statement: 'Hàm số đồng biến', correct: true, explanation: 'Vì đạo hàm > 0' }
                ]
              }
            ]
          }
        ]
      };

      const sanitized = sanitizeLegacyLessonQuestions(raw);
      const q = sanitized.lessons[0].questions[0];
      assert.equal(q.correct, undefined);
      assert.equal(q.correctAnswer, undefined);
      assert.equal(q.explanation, undefined);
      assert.equal(q.question, '1+1=?');

      const s = sanitized.lessons[0].questionGroups[0].statements[0];
      assert.equal(s.correct, undefined);
      assert.equal(s.explanation, undefined);
      assert.equal(s.statement, 'Hàm số đồng biến');
    });

    it('3.3 isValidSubjectKey and isValidGrade identify valid GDPT 2018 parameters', () => {
      assert.equal(isValidSubjectKey('toan'), true);
      assert.equal(isValidSubjectKey('sinhhoc'), true);
      assert.equal(isValidSubjectKey('sinhhoc11'), true);
      assert.equal(isValidSubjectKey('malicious_key'), false);

      assert.equal(isValidGrade(10), true);
      assert.equal(isValidGrade(11), true);
      assert.equal(isValidGrade(12), true);
      assert.equal(isValidGrade(9), false);
    });
  });

  describe('4. Server Security Headers & Admin Route Gate', () => {
    let server;
    let baseUrl;

    beforeEach(async () => {
      server = http.createServer(app);
      await new Promise(resolve => server.listen(0, resolve));
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
    });

    afterEach(async () => {
      await new Promise(resolve => server.close(resolve));
    });

    it('4.1 Server sets security headers on responses', async () => {
      const res = await fetch(`${baseUrl}/api/subjects`);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    });

    it('4.2 Trailing slash on admin routes is intercepted by auth gate', async () => {
      const res = await fetch(`${baseUrl}/api/announcements/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'test', content: 'test' })
      });
      // Should be 401 Unauthorized because requireAdmin is enforced even with trailing slash
      assert.equal(res.status, 401);
    });
  });

  describe('5. SaaS Multi-Tenant & Cloud Adapter Query Integration', () => {
    it('5.1 CloudStorageAdapter exposes query method', async () => {
      const adapter = new CloudStorageAdapter();
      assert.equal(typeof adapter.query, 'function');
      const res = await adapter.query('SELECT 1');
      assert.ok(Array.isArray(res));
    });

    it('5.2 TenantRepository resolves default tenants gracefully', async () => {
      const repo = new TenantRepository();
      const ntmk = await repo.getTenantBySlug('ntmk');
      assert.ok(ntmk);
      assert.equal(ntmk.slug, 'ntmk');
      assert.equal(ntmk.name, 'THPT Nguyễn Thị Minh Khai');

      const publicPortal = await repo.getTenantBySlug('public');
      assert.ok(publicPortal);
      assert.equal(publicPortal.slug, 'public');
    });
  });

  describe('6. Serverless LearningStorage Resilience', () => {
    it('6.1 LearningStorage with storageAdapter works smoothly without local file dependency', () => {
      const adapter = new CloudStorageAdapter();
      const storage = new LearningStorage({ storageAdapter: adapter });

      const profile = storage.saveProfile({
        userId: 'student_serverless_test',
        grade: 11,
        prioritySubjects: ['toan', 'sinhhoc']
      });

      assert.ok(profile);
      assert.equal(profile.userId, 'student_serverless_test');

      const retrieved = storage.getProfile('student_serverless_test');
      assert.equal(retrieved.userId, 'student_serverless_test');
    });
  });

});
