/**
 * Crawler & Auto Exam Maker API Handler (Universal Express & Vercel Serverless)
 * NTMK Rebuild Phase GDPT 2018 / Decision 764/QĐ-BGDĐT
 *
 * Exposes endpoints:
 * - GET  /api/v2/crawler/sources       - List supported educational sources
 * - POST /api/v2/crawler/crawl         - Crawl raw content from URL or source
 * - POST /api/v2/crawler/parse         - Parse raw text into Decision 764 exam
 * - POST /api/v2/crawler/auto-make-exam- End-to-end crawl/parse + 4 exam codes
 * - POST /api/v2/crawler/save-to-bank  - Save questions into question bank / data
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const AutoCrawlerService = require('../../engine/ingestion/auto-crawler-service.js');
const FullExamParser = require('../../engine/ingestion/full-exam-parser.js');
const ExamMaker = require('../../engine/exam-maker.js');

const crawlerService = new AutoCrawlerService();

/**
 * GET /api/v2/crawler/sources
 * List supported educational repositories
 */
router.get('/sources', (req, res) => {
  try {
    const sources = AutoCrawlerService.getSources();
    return res.status(200).json({
      success: true,
      sources,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Không thể tải danh sách nguồn đề thi: ' + err.message
    });
  }
});

/**
 * POST /api/v2/crawler/crawl
 * Crawl content from URL or preset source
 */
router.post('/crawl', async (req, res) => {
  try {
    const { sourceId, url, rawText, rawHtml, subjectId, grade } = req.body || {};
    const result = await crawlerService.crawl({
      sourceId,
      url,
      rawText,
      rawHtml,
      subjectId,
      grade
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * POST /api/v2/crawler/parse
 * Parse whole exam text or HTML into structured Decision 764 format
 */
router.post('/parse', (req, res) => {
  try {
    const { rawText, rawHtml, subjectId, grade, title, durationMinutes } = req.body || {};
    let textToParse = rawText;
    if (!textToParse && rawHtml) {
      textToParse = AutoCrawlerService.cleanHtml(rawHtml);
    }
    if (!textToParse || typeof textToParse !== 'string' || textToParse.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Nội dung đề thi quá ngắn hoặc không có nội dung để phân tích'
      });
    }

    const parsed = FullExamParser.parse(textToParse, {
      subjectId,
      grade,
      title,
      durationMinutes
    });

    return res.status(200).json({
      success: true,
      exam: parsed,
      parsedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Lỗi khi phân tích đề thi: ' + err.message
    });
  }
});

/**
 * POST /api/v2/crawler/auto-make-exam
 * Complete pipeline: crawl (or receive text) -> parse -> generate 4 variant codes
 */
router.post('/auto-make-exam', async (req, res) => {
  try {
    const {
      sourceId = 'custom',
      url,
      rawText,
      rawHtml,
      subjectId,
      grade,
      variantCodes = ['101', '102', '103', '104'],
      school,
      authority,
      academicYear
    } = req.body || {};

    let contentToParse = rawText;

    if (!contentToParse) {
      const crawlRes = await crawlerService.crawl({
        sourceId,
        url,
        rawText,
        rawHtml,
        subjectId,
        grade
      });
      contentToParse = crawlRes.rawText;
    }

    const parsed = FullExamParser.parse(contentToParse, {
      subjectId,
      grade
    });

    const madeExam = ExamMaker.makeExamVariants(parsed, {
      variantCodes,
      subjectId: parsed.metadata.subjectId,
      grade: parsed.metadata.grade,
      school,
      authority,
      academicYear
    });

    return res.status(200).json({
      success: true,
      parsedExam: parsed,
      examPackage: madeExam,
      generatedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Lỗi khi tự động tạo mã đề: ' + err.message
    });
  }
});

/**
 * POST /api/v2/crawler/save-to-bank
 * Optionally save generated questions into local data folder for direct practice
 */
router.post('/save-to-bank', (req, res) => {
  try {
    const { questions, subjectId, grade, lessonTitle } = req.body || {};
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, error: 'Danh sách câu hỏi trống' });
    }

    const saveRes = AutoCrawlerService.saveQuestionsToDisk({
      questions,
      subjectId,
      grade,
      lessonTitle
    });

    return res.status(200).json({
      success: true,
      message: `Đã lưu thành công ${questions.length} câu hỏi vào bài học "${lessonTitle || 'Đề mới'}" (${saveRes.fileName})`,
      lessonId: saveRes.lessonId,
      savedQuestionsCount: saveRes.savedQuestionsCount
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Lỗi khi lưu vào ngân hàng câu hỏi: ' + err.message
    });
  }
});

/**
 * POST /api/v2/crawler/auto-sync-all
 * Autonomous crawler endpoint: crawls all registered sources for all subjects & grades.
 * NO ADMIN PRIVILEGES REQUIRED.
 */
router.post('/auto-sync-all', async (req, res) => {
  try {
    const { subjects, grades, sourceIds, dataDir } = req.body || {};
    const summary = await crawlerService.crawlAllSourcesAndSave({ subjects, grades, sourceIds, dataDir });
    return res.status(200).json({
      success: true,
      message: `Tự động thu thập hoàn tất: đã cập nhật ${summary.totalSavedQuestions} câu hỏi từ các nguồn học liệu`,
      summary
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Lỗi khi tự động cào toàn bộ nguồn: ' + err.message
    });
  }
});

/**
 * GET /api/v2/crawler/scheduler-status
 * Check current background crawler scheduler state
 */
router.get('/scheduler-status', (req, res) => {
  return res.status(200).json({
    success: true,
    scheduler: crawlerService.getSchedulerStatus()
  });
});

/**
 * POST /api/v2/crawler/scheduler-toggle
 * Start or stop the automated background crawler
 */
router.post('/scheduler-toggle', (req, res) => {
  try {
    const { enable, intervalMs } = req.body || {};
    if (enable === false) {
      const status = crawlerService.stopBackgroundScheduler();
      return res.status(200).json({ success: true, message: 'Đã tạm dừng tự động cào ngầm', status });
    } else {
      const status = crawlerService.startBackgroundScheduler(intervalMs || 12 * 60 * 60 * 1000, { runImmediate: false });
      return res.status(200).json({ success: true, message: 'Đã kích hoạt tự động cào ngầm định kỳ', status });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Universal Handler for Express & Vercel Serverless Functions
 */
function crawlerHandler(req, res, next) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle Vercel rewrite parameter (?action=...)
  if (req.query?.action) {
    req.url = '/' + req.query.action;
  }

  return router(req, res, next || (() => {
    return res.status(404).json({ success: false, error: 'Endpoint not found' });
  }));
}

Object.setPrototypeOf(crawlerHandler, router);
module.exports = crawlerHandler;
