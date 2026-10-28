/**
 * Crawler & Auto Exam Maker API Handler
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

    const targetSub = subjectId || 'toan';
    const targetGrade = grade || 12;
    const fileName = `${targetSub}${targetGrade}.json`;
    const filePath = path.join(__dirname, '..', '..', 'data', fileName);

    let dataObj = { subjectId: targetSub, grade: targetGrade, lessons: [] };
    if (fs.existsSync(filePath)) {
      try {
        dataObj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (e) {
        // use default
      }
    }

    const title = lessonTitle || `Đề Tự Động Sinh (${new Date().toLocaleDateString('vi-VN')})`;
    const newLessonId = `auto_${Date.now()}`;

    // Separate MCQs and True/False question groups
    const mcqs = questions.filter(q => q.format === 'multiple_choice' || q.format === 'mcq');
    const tfGroups = questions.filter(q => q.format === 'true_false_group');
    const saQuestions = questions.filter(q => q.format === 'short_answer');

    const formattedQuestions = [
      ...mcqs.map((q, idx) => ({
        id: q.id || `${newLessonId}_q${idx + 1}`,
        question: q.prompt,
        options: q.mcqPayload?.options || [],
        correct: q.mcqPayload?.correctOptionIndex ?? 0,
        explanation: q.explanation || ''
      })),
      ...saQuestions.map((q, idx) => ({
        id: q.id || `${newLessonId}_sa${idx + 1}`,
        question: q.prompt,
        options: [],
        correctAnswer: q.shortAnswerPayload?.correctAnswers?.[0] || '',
        explanation: q.explanation || ''
      }))
    ];

    const formattedTfGroups = tfGroups.map((g, idx) => ({
      id: g.id || `${newLessonId}_tf${idx + 1}`,
      passage: g.tfPayload?.passage || g.prompt,
      statements: (g.tfPayload?.statements || []).map((s, sIdx) => ({
        id: s.id || `stmt_${String.fromCharCode(97 + sIdx)}`,
        statement: s.statement,
        correct: s.correct === true
      })),
      explanation: g.explanation || ''
    }));

    dataObj.lessons.push({
      id: newLessonId,
      title,
      questions: formattedQuestions,
      questionGroups: formattedTfGroups
    });

    fs.writeFileSync(filePath, JSON.stringify(dataObj, null, 2), 'utf8');

    return res.status(200).json({
      success: true,
      message: `Đã lưu thành công ${questions.length} câu hỏi vào bài học "${title}" (${fileName})`,
      lessonId: newLessonId,
      savedQuestionsCount: formattedQuestions.length + formattedTfGroups.length
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Lỗi khi lưu vào ngân hàng câu hỏi: ' + err.message
    });
  }
});

module.exports = router;
