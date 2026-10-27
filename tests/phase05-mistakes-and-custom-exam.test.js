const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// Mock localStorage for node environment
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};

const { MistakeStore } = require('../public/js/mistakes.js');
const CustomExam = require('../public/js/custom-exam.js');

describe('Phase 05 — MistakeStore & Recovery Workflow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('records new mistake correctly and assigns metadata', () => {
    const q = {
      id: 'q_test_1',
      question: 'Ai là người lãnh đạo cuộc khởi nghĩa Lam Sơn?',
      options: ['Lê Lợi', 'Nguyễn Trãi', 'Trần Hưng Đạo', 'Quang Trung'],
      correctAnswer: 0,
      explanation: 'Lê Lợi là người khởi xướng và lãnh đạo cuộc khởi nghĩa Lam Sơn (1418 - 1427).'
    };

    const entry = MistakeStore.recordMistake({
      subjectId: 'lichsu10',
      lessonName: 'Bài 15: Khởi nghĩa Lam Sơn',
      question: q,
      userAnswer: 2
    });

    assert.ok(entry, 'Entry should be created');
    assert.strictEqual(entry.subjectId, 'lichsu10');
    assert.strictEqual(entry.mistakeCount, 1);
    assert.strictEqual(entry.mastered, false);
    assert.strictEqual(entry.userAnswer, 2);

    const activeList = MistakeStore.getMistakes({ status: 'active' });
    assert.strictEqual(activeList.length, 1);
    assert.strictEqual(activeList[0].id, 'q_test_1');
  });

  it('increments mistakeCount on repeated failure', () => {
    const q = {
      id: 'q_repeat_1',
      question: 'Tuyên ngôn Độc lập Mỹ được công bố năm nào?',
      options: ['1776', '1789', '1799', '1804'],
      correctAnswer: 0
    };

    MistakeStore.recordMistake({ subjectId: 'lichsu11', lessonName: 'Bài 1', question: q, userAnswer: 1 });
    MistakeStore.recordMistake({ subjectId: 'lichsu11', lessonName: 'Bài 1', question: q, userAnswer: 2 });

    const list = MistakeStore.getMistakes({ subjectId: 'lichsu11' });
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].mistakeCount, 2);
    assert.strictEqual(list[0].mastered, false);
  });

  it('marks question as mastered when successfully recovered', () => {
    const q = {
      id: 'q_resolve_1',
      question: 'Thủ đô của Liên bang Xô Viết đặt tại đâu?',
      options: ['Mát-xcơ-va', 'Lê-nin-grát', 'Ki-ép', 'Minsk'],
      correctAnswer: 0
    };

    MistakeStore.recordMistake({ subjectId: 'lichsu11', question: q, userAnswer: 1 });
    assert.strictEqual(MistakeStore.getActiveCount('lichsu11'), 1);

    const resolved = MistakeStore.recordSuccess('q_resolve_1');
    assert.ok(resolved);
    assert.strictEqual(resolved.mastered, true);
    assert.strictEqual(resolved.consecutiveCorrect, 1);

    // Active count drops to 0, mastered increases
    assert.strictEqual(MistakeStore.getActiveCount('lichsu11'), 0);
    const stats = MistakeStore.getStats();
    assert.strictEqual(stats.mastered, 1);
    assert.strictEqual(stats.rate, 100);
  });

  it('filters mistakes by subject, status and search query', () => {
    MistakeStore.recordMistake({
      subjectId: 'lichsu10',
      lessonName: 'Bài 12',
      question: { id: 'ls10_1', question: 'Văn minh Văn Lang - Âu Lạc', correctAnswer: 0 }
    });
    MistakeStore.recordMistake({
      subjectId: 'lichsu11',
      lessonName: 'Bài 1',
      question: { id: 'ls11_1', question: 'Cách mạng tư sản Anh thế kỷ XVII', correctAnswer: 1 }
    });

    const onlyLs10 = MistakeStore.getMistakes({ subjectId: 'lichsu10' });
    assert.strictEqual(onlyLs10.length, 1);
    assert.strictEqual(onlyLs10[0].id, 'ls10_1');

    const searchResult = MistakeStore.getMistakes({ search: 'Anh thế kỷ' });
    assert.strictEqual(searchResult.length, 1);
    assert.strictEqual(searchResult[0].id, 'ls11_1');
  });
});

describe('Phase 05 — Custom Exam Generator Algorithms', () => {
  it('shuffleArray preserves all elements without loss', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled = CustomExam.shuffleArray(original);

    assert.strictEqual(shuffled.length, original.length);
    assert.deepStrictEqual([...shuffled].sort(), [...original].sort());
  });

  it('shuffling options correctly updates correctAnswer index', () => {
    const q = {
      id: 'q_shuffle_opt',
      question: 'Thủ đô của Việt Nam là?',
      options: ['Hà Nội', 'Huế', 'Đà Nẵng', 'TP. Hồ Chí Minh'],
      correctAnswer: 0
    };

    // Simulate option shuffling
    const originalCorrectText = q.options[q.correctAnswer]; // "Hà Nội"
    const shuffledOpts = CustomExam.shuffleArray(q.options);
    const newCorrectIndex = shuffledOpts.indexOf(originalCorrectText);

    assert.ok(newCorrectIndex >= 0 && newCorrectIndex < 4);
    assert.strictEqual(shuffledOpts[newCorrectIndex], 'Hà Nội');
  });

  it('presets set valid question and duration configurations', () => {
    CustomExam.applyPreset('quick15');
    assert.strictEqual(CustomExam.settings.mcqCount, 10);
    assert.strictEqual(CustomExam.settings.tfCount, 1);
    assert.strictEqual(CustomExam.settings.durationMinutes, 15);

    CustomExam.applyPreset('standard50');
    assert.strictEqual(CustomExam.settings.mcqCount, 24);
    assert.strictEqual(CustomExam.settings.tfCount, 4);
    assert.strictEqual(CustomExam.settings.durationMinutes, 50);
  });
});
