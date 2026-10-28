const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const AutoCrawlerService = require('../engine/ingestion/auto-crawler-service.js');
const FullExamParser = require('../engine/ingestion/full-exam-parser.js');
const ExamMaker = require('../engine/exam-maker.js');
const QuestionSchemaV2 = require('../engine/schema.js');
const { app } = require('../server.js');

describe('Automated Crawler, Multi-Part Parser & Auto Exam Maker Engine', () => {

  describe('1. AutoCrawlerService & Source Harvester', () => {
    it('provides registered educational sources (TOANMATH, THUVIENHOCLIEU, VIETJACK, CUSTOM)', () => {
      const sources = AutoCrawlerService.getSources();
      assert.ok(Array.isArray(sources));
      assert.ok(sources.length >= 4);

      const sourceIds = sources.map(s => s.id);
      assert.ok(sourceIds.includes('toanmath'));
      assert.ok(sourceIds.includes('thuvienhoclieu'));
      assert.ok(sourceIds.includes('vietjack'));
      assert.ok(sourceIds.includes('custom'));

      const tm = AutoCrawlerService.getSource('toanmath');
      assert.equal(tm.name, 'TOANMATH.com');
      assert.ok(tm.grades.includes(12));
    });

    it('enforces strict SSRF protection against internal/private IPs and loopbacks', () => {
      assert.equal(AutoCrawlerService.isDisallowedHost('localhost'), true);
      assert.equal(AutoCrawlerService.isDisallowedHost('127.0.0.1'), true);
      assert.equal(AutoCrawlerService.isDisallowedHost('10.0.0.1'), true);
      assert.equal(AutoCrawlerService.isDisallowedHost('192.168.1.1'), true);
      assert.equal(AutoCrawlerService.isDisallowedHost('169.254.169.254'), true);
      assert.equal(AutoCrawlerService.isDisallowedHost('172.16.0.5'), true);
      assert.equal(AutoCrawlerService.isDisallowedHost('my-server.local'), true);
      assert.equal(AutoCrawlerService.isDisallowedHost('my-server.internal'), true);

      // Permitted external host
      assert.equal(AutoCrawlerService.isDisallowedHost('toanmath.com'), false);
      assert.equal(AutoCrawlerService.isDisallowedHost('thuvienhoclieu.com'), false);
    });

    it('cleanHtml strips scripts, navigations and normalizes HTML entities and line breaks', () => {
      const rawHtml = `
        <html>
          <head><style>.ad{color:red}</style></head>
          <body>
            <header><nav>Home | Contact</nav></header>
            <p>Câu 1: Hàm số &alpha; + &beta; &le; 10</p>
            <div>A. Đúng &amp; Hợp lệ<br/>B. Sai</div>
            <footer>Footer copyright</footer>
            <script>alert(1)</script>
          </body>
        </html>
      `;
      const cleaned = AutoCrawlerService.cleanHtml(rawHtml);
      assert.ok(!cleaned.includes('Home | Contact'));
      assert.ok(!cleaned.includes('Footer copyright'));
      assert.ok(!cleaned.includes('alert(1)'));
      assert.ok(cleaned.includes('Câu 1: Hàm số α + β ≤ 10'));
      assert.ok(cleaned.includes('A. Đúng & Hợp lệ'));
      assert.ok(cleaned.includes('B. Sai'));
    });

    it('crawls sample fixture reliably when requesting known sources', async () => {
      const crawler = new AutoCrawlerService();
      const res = await crawler.crawl({
        sourceId: 'toanmath',
        subjectId: 'toan',
        grade: 12
      });

      assert.equal(res.success, true);
      assert.equal(res.subjectId, 'toan');
      assert.equal(res.grade, 12);
      assert.ok(res.rawText.includes('PHẦN I'));
      assert.ok(res.rawText.includes('PHẦN II'));
      assert.ok(res.rawText.includes('PHẦN III'));
      assert.ok(res.rawText.includes('BẢNG ĐÁP ÁN'));
    });

    it('crawlAllSourcesAndSave autonomously crawls across sources and saves to dataDir', async () => {
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ntmk-crawler-test-'));

      const crawler = new AutoCrawlerService();
      const summary = await crawler.crawlAllSourcesAndSave({
        subjects: ['vatli'],
        grades: [12],
        sourceIds: ['thuvienhoclieu'],
        dataDir: tmpDir
      });

      assert.equal(summary.crawled.length, 1);
      assert.ok(summary.totalSavedQuestions > 0);
      assert.ok(fs.existsSync(path.join(tmpDir, 'vatli12.json')));

      // Clean up tmpDir
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('startBackgroundScheduler and stopBackgroundScheduler manage scheduler lifecycle', () => {
      const crawler = new AutoCrawlerService();
      const started = crawler.startBackgroundScheduler(60000, { runImmediate: false });
      assert.equal(started.active, true);
      assert.equal(crawler.getSchedulerStatus().active, true);

      const stopped = crawler.stopBackgroundScheduler();
      assert.equal(stopped.active, false);
      assert.equal(crawler.getSchedulerStatus().active, false);
    });
  });

  describe('2. FullExamParser (MOET Decision 764/QĐ-BGDĐT)', () => {
    it('correctly extracts exam header metadata (School, Subject, Grade, Duration)', () => {
      const sampleText = `
        SỞ GD&ĐT BÌNH DƯƠNG
        TRƯỜNG THPT NGUYỄN THỊ MINH KHAI
        ĐỀ THI KHẢO SÁT CHẤT LƯỢNG MÔN VẬT LÍ — LỚP 12
        Thời gian làm bài: 50 phút
        PHẦN I. Câu 1: Cho...
      `;
      const meta = FullExamParser.extractMetadata(sampleText);
      assert.equal(meta.subjectId, 'vatli');
      assert.equal(meta.grade, 12);
      assert.equal(meta.durationMinutes, 50);
      assert.ok(meta.school.includes('NGUYỄN THỊ MINH KHAI'));
    });

    it('parses tripartite papers with Parts I, II, III and detached Answer Key Tables', () => {
      const crawler = new AutoCrawlerService();
      const fixture = crawler.getSampleExamFixture('toanmath', 'toan', 12);

      const parsed = FullExamParser.parse(fixture.text);
      assert.ok(parsed.metadata);
      assert.equal(parsed.metadata.subjectId, 'toan');
      assert.equal(parsed.metadata.grade, 12);

      // Verify Part I (Multiple Choice)
      const part1 = parsed.sections.find(s => s.sectionId === 'part_1');
      assert.ok(part1);
      assert.ok(part1.questions.length >= 4);
      const q1 = part1.questions[0];
      assert.equal(q1.format, QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE);
      assert.equal(q1.mcqPayload.options.length, 4);
      assert.equal(q1.mcqPayload.correctOptionIndex, 1); // Option B

      // Verify Part II (True / False Groups)
      const part2 = parsed.sections.find(s => s.sectionId === 'part_2');
      assert.ok(part2);
      assert.ok(part2.questions.length >= 2);
      const tf1 = part2.questions[0];
      assert.equal(tf1.format, QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP);
      assert.equal(tf1.tfPayload.statements.length, 4);
      // All 4 statements have parsed boolean answers
      assert.ok(tf1.tfPayload.statements.every(s => typeof s.correct === 'boolean'));

      // Verify Part III (Short Answer)
      const part3 = parsed.sections.find(s => s.sectionId === 'part_3');
      assert.ok(part3);
      assert.ok(part3.questions.length >= 3);
      const sa1 = part3.questions[0];
      assert.equal(sa1.format, QuestionSchemaV2.FORMATS.SHORT_ANSWER);
      assert.ok(sa1.shortAnswerPayload.correctAnswers.length > 0);
      assert.equal(sa1.shortAnswerPayload.correctAnswers[0], '1,73');

      // Verify statistics
      assert.ok(parsed.statistics.totalQuestions >= 9);
      assert.equal(parsed.statistics.hasAnswersCount, parsed.statistics.totalQuestions);
    });

    it('pairs detached answer key tables to questions lacking inline answers', () => {
      const examText = `
        PHẦN I. Câu trắc nghiệm nhiều phương án.
        Câu 1: Hàm số đồng biến khi nào?
        A. y' > 0
        B. y' < 0
        C. y' = 0
        D. y' <= 0

        Câu 2: Nguyên hàm của e^x là?
        A. e^x + C
        B. xe^x + C
        C. e^(2x) + C
        D. ln(x) + C

        PHẦN II. Câu trắc nghiệm đúng sai.
        Câu 1: Cho hàm số y = f(x).
        a) f(x) liên tục trên R.
        b) f(x) có 2 cực trị.
        c) f(0) = 1.
        d) Đồ thị đi qua gốc tọa độ.

        PHẦN III. Trả lời ngắn.
        Câu 1: Tính diện tích hình phẳng giới hạn bởi y = x và y = 0 từ x = 0 đến x = 2.

        BẢNG ĐÁP ÁN
        Phần I:
        Câu 1: A | Câu 2: A

        Phần II:
        Câu 1: a-Đ, b-Đ, c-S, d-S

        Phần III:
        Câu 1: 2
      `;

      const parsed = FullExamParser.parse(examText, { subjectId: 'toan', grade: 12 });
      assert.equal(parsed.sections[0].questions[0].mcqPayload.correctOptionIndex, 0); // A
      assert.equal(parsed.sections[0].questions[1].mcqPayload.correctOptionIndex, 0); // A

      const stmts = parsed.sections[1].questions[0].tfPayload.statements;
      assert.equal(stmts[0].correct, true);  // a-Đ
      assert.equal(stmts[1].correct, true);  // b-Đ
      assert.equal(stmts[2].correct, false); // c-S
      assert.equal(stmts[3].correct, false); // d-S

      assert.equal(parsed.sections[2].questions[0].shortAnswerPayload.correctAnswers[0], '2');
    });

    it('preserves KaTeX/LaTeX formulas and extracts pedagogical solutions', () => {
      const examText = `
        PHẦN I.
        Câu 1: Cho tích phân $I = \\int_{0}^{1} \\frac{x}{x^2 + 1} dx$. Khẳng định nào sau đây đúng?
        A. $I = \\frac{1}{2} \\ln 2$
        B. $I = \\ln 2$
        C. $I = 2\\ln 2$
        D. $I = \\frac{1}{4} \\ln 2$
        Đáp án: A

        HƯỚNG DẪN GIẢI CHI TIẾT
        Câu 1: Đặt $t = x^2 + 1 \\Rightarrow dt = 2x dx$. Khi $x = 0 \\Rightarrow t = 1$, $x = 1 \\Rightarrow t = 2$.
        Suy ra $I = \\frac{1}{2} \\int_{1}^{2} \\frac{dt}{t} = \\frac{1}{2} \\ln 2$.
      `;

      const parsed = FullExamParser.parse(examText, { subjectId: 'toan', grade: 12 });
      const q = parsed.sections[0].questions[0];

      assert.ok(q.prompt.includes('\\int_{0}^{1}'));
      assert.ok(q.mcqPayload.options[0].includes('\\frac{1}{2} \\ln 2'));
      assert.ok(q.explanation.includes('Đặt $t = x^2 + 1'));
    });
  });

  describe('3. ExamMaker (Variant Generation & OMR Matrix)', () => {
    it('generates 4 variant codes (101, 102, 103, 104) with official NTMK credentials', () => {
      const crawler = new AutoCrawlerService();
      const fixture = crawler.getSampleExamFixture('toanmath', 'toan', 12);
      const parsed = FullExamParser.parse(fixture.text);

      const examPackage = ExamMaker.makeExamVariants(parsed);
      assert.equal(examPackage.success, true);
      assert.deepEqual(examPackage.variantCodes, ['101', '102', '103', '104']);

      // Institutional branding check
      assert.equal(examPackage.institution.school, 'TRƯỜNG THPT NGUYỄN THỊ MINH KHAI');
      assert.equal(examPackage.institution.location, 'TP. Dĩ An, Tỉnh Bình Dương');
      assert.equal(examPackage.institution.authority, 'SỞ GIÁO DỤC VÀ ĐÀO TẠO BÌNH DƯƠNG');

      // Verify each variant
      ['101', '102', '103', '104'].forEach(code => {
        const v = examPackage.variants[code];
        assert.ok(v);
        assert.equal(v.code, code);
        assert.equal(v.sections.length, 3);
        assert.equal(v.totalQuestions, parsed.questions.length);
        assert.ok(v.answers.part1.length > 0);
        assert.ok(v.answers.part2.length > 0);
        assert.ok(v.answers.part3.length > 0);
      });
    });

    it('shuffles MCQ options while recalculating the correct option index accurately', () => {
      const question = {
        format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
        prompt: 'Đạo hàm của sin(x) là?',
        mcqPayload: {
          options: ['cos(x)', '-cos(x)', 'tan(x)', '-sin(x)'],
          correctOptionIndex: 0 // 'cos(x)'
        }
      };

      const exam = {
        metadata: { subjectId: 'toan', grade: 12 },
        questions: [question],
        sections: [{ sectionId: 'part_1', questions: [question] }]
      };

      const examPackage = ExamMaker.makeExamVariants(exam);
      const v102 = examPackage.variants['102'];
      const v102Q = v102.sections[0].questions[0];

      // Correct option text must still be 'cos(x)'
      const correctTextIn102 = v102Q.mcqPayload.options[v102Q.mcqPayload.correctOptionIndex];
      assert.equal(correctTextIn102, 'cos(x)');
    });

    it('produces comparative answer matrices across all 4 variant codes', () => {
      const crawler = new AutoCrawlerService();
      const fixture = crawler.getSampleExamFixture('toanmath', 'toan', 12);
      const parsed = FullExamParser.parse(fixture.text);
      const examPackage = ExamMaker.makeExamVariants(parsed);

      const matrices = examPackage.answerMatrices;
      assert.ok(matrices['101']);
      assert.ok(matrices['102']);
      assert.ok(matrices['103']);
      assert.ok(matrices['104']);

      // Verify Part I has letter answers for all variants
      assert.ok(matrices['101'].part1.every(a => ['A', 'B', 'C', 'D'].includes(a.answer)));
      assert.ok(matrices['102'].part1.every(a => ['A', 'B', 'C', 'D'].includes(a.answer)));
    });
  });

  describe('4. API Endpoints (/api/v2/crawler/*)', () => {
    let server;
    let baseUrl;

    beforeEach(async () => {
      await new Promise(resolve => {
        server = app.listen(0, () => {
          const port = server.address().port;
          baseUrl = `http://127.0.0.1:${port}`;
          resolve();
        });
      });
    });

    afterEach(async () => {
      if (server) {
        await new Promise(resolve => server.close(resolve));
      }
    });

    it('GET /api/v2/crawler/sources returns registered sources', async () => {
      const res = await fetch(`${baseUrl}/api/v2/crawler/sources`);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(Array.isArray(body.sources));
      assert.ok(body.sources.some(s => s.id === 'toanmath'));
    });

    it('POST /api/v2/crawler/crawl fetches fixture or parses input', async () => {
      const res = await fetch(`${baseUrl}/api/v2/crawler/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 'vatli', subjectId: 'vatli', grade: 12 })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.rawText.includes('VẬT LÍ'));
    });

    it('POST /api/v2/crawler/parse parses raw text into Decision 764 exam', async () => {
      const sample = `
        PHẦN I.
        Câu 1: Đơn vị của lực trong hệ SI là:
        A. Newton (N)
        B. Joule (J)
        C. Watt (W)
        D. Pascal (Pa)
        Đáp án: A
      `;
      const res = await fetch(`${baseUrl}/api/v2/crawler/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: sample, subjectId: 'vatli', grade: 10 })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.exam.sections[0].questions.length, 1);
      assert.equal(body.exam.sections[0].questions[0].mcqPayload.correctOptionIndex, 0);
    });

    it('POST /api/v2/crawler/auto-make-exam executes complete pipeline and returns 4 variants', async () => {
      const res = await fetch(`${baseUrl}/api/v2/crawler/auto-make-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: 'toanmath',
          subjectId: 'toan',
          grade: 12
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.examPackage.variants['101']);
      assert.ok(body.examPackage.variants['104']);
      assert.equal(body.examPackage.institution.school, 'TRƯỜNG THPT NGUYỄN THỊ MINH KHAI');
    });

    it('POST /api/v2/crawler/auto-sync-all runs autonomous crawl across sources without admin', async () => {
      const fs = require('fs');
      const os = require('os');
      const path = require('path');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ntmk-auto-sync-test-'));

      try {
        const res = await fetch(`${baseUrl}/api/v2/crawler/auto-sync-all`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjects: ['toan'],
            grades: [12],
            sourceIds: ['toanmath'],
            dataDir: tmpDir
          })
        });
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.ok(body.summary);
        assert.ok(Array.isArray(body.summary.crawled));
        assert.ok(body.summary.crawled.length >= 1);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('GET /api/v2/crawler/scheduler-status and POST toggle control autonomous scheduler', async () => {
      const resGet = await fetch(`${baseUrl}/api/v2/crawler/scheduler-status`);
      assert.equal(resGet.status, 200);
      const bodyGet = await resGet.json();
      assert.equal(bodyGet.success, true);
      assert.ok('scheduler' in bodyGet);

      const resToggle = await fetch(`${baseUrl}/api/v2/crawler/scheduler-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: false })
      });
      assert.equal(resToggle.status, 200);
      const bodyToggle = await resToggle.json();
      assert.equal(bodyToggle.success, true);
      assert.equal(bodyToggle.status.active, false);
    });
  });

});
