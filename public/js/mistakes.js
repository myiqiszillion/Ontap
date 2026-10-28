/**
 * NTMK Mistake Notebook (Sổ Tay Phục Hồi Câu Sai)
 * Quản lý, phân tích và tổ chức ôn luyện lặp lại các câu hỏi học sinh làm sai
 * Tích hợp hệ thống Leitner Spaced Repetition 4 hộp và thuật toán SM-2 chuẩn GDPT 2018
 * Thiết kế Athenaeum Codex & TypeUI (Zero Raw Emoji, Pure Lucide SVGs, High Contrast Dual-Theme)
 */

const LEITNER_BOXES = [
  { id: 1, name: 'Hộp 1: Hàng ngày', label: 'Hàng ngày', intervalDays: 1, color: '#ef4444', desc: 'Cần ôn lại hàng ngày' },
  { id: 2, name: 'Hộp 2: Sau 3 ngày', label: 'Sau 3 ngày', intervalDays: 3, color: '#f59e0b', desc: 'Đã nhớ sơ khởi' },
  { id: 3, name: 'Hộp 3: Sau 7 ngày', label: 'Sau 7 ngày', intervalDays: 7, color: '#3b82f6', desc: 'Đã ghi nhớ tương đối tốt' },
  { id: 4, name: 'Hộp 4: Đã làm chủ', label: 'Đã làm chủ', intervalDays: 14, color: '#10b981', desc: 'Thành thạo dài hạn' }
];

const ERROR_REASONS = {
  reading_trap: {
    key: 'reading_trap',
    label: 'Bẫy đề bài / Đọc sót',
    color: '#f59e0b',
    icon: 'reading_trap'
  },
  calc_error: {
    key: 'calc_error',
    label: 'Tính toán nhầm',
    color: '#ef4444',
    icon: 'calc_error'
  },
  forgot_formula: {
    key: 'forgot_formula',
    label: 'Quên công thức',
    color: '#8b5cf6',
    icon: 'forgot_formula'
  },
  knowledge_gap: {
    key: 'knowledge_gap',
    label: 'Hổng kiến thức',
    color: '#ec4899',
    icon: 'knowledge_gap'
  }
};

const MistakeStore = {
  STORAGE_KEY: 'ntmk_mistakes_v2',
  LEGACY_KEY: 'ontap_wrong_questions',
  LEITNER_BOXES,
  ERROR_REASONS,
  listeners: [],

  subscribe(fn) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  },

  notify(event, data) {
    this.listeners.forEach(fn => {
      try { fn(event, data); } catch (e) { console.error('MistakeStore listener error:', e); }
    });
  },

  _load() {
    try {
      let raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        const legacy = localStorage.getItem(this.LEGACY_KEY);
        if (legacy) {
          const legacyData = JSON.parse(legacy);
          const migrated = [];
          Object.keys(legacyData).forEach(subjectId => {
            const list = legacyData[subjectId] || [];
            list.forEach(q => {
              migrated.push({
                id: 'm_' + Math.random().toString(36).substring(2, 9),
                subjectId,
                lessonName: q.lessonTitle || 'Bài học đã lưu',
                question: q.question || q.passage || '',
                rawQuestion: q,
                type: q.type || (q.statements ? 'tf-group' : 'mcq'),
                options: q.options || [],
                statements: q.statements || [],
                correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : q.correct,
                userAnswer: null,
                explanation: q.explanation || null,
                mistakeCount: 1,
                consecutiveCorrect: 0,
                repetition: 0,
                intervalDays: 1,
                leitnerBox: 1,
                easeFactor: 2.5,
                nextReviewDate: new Date(Date.now() + 86400000).toISOString(),
                lastReviewedDate: null,
                reviewHistory: [],
                errorReason: null,
                mastered: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              });
            });
          });
          this._save(migrated);
          return migrated;
        }
        return [];
      }
      return JSON.parse(raw) || [];
    } catch (e) {
      console.warn('Failed to load mistakes:', e);
      return [];
    }
  },

  _save(list) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
      this.notify('mistakes_updated', list);
    } catch (e) {
      console.error('Failed to save mistakes:', e);
    }
  },

  /**
   * Tạo ID duy nhất dựa trên nội dung câu hỏi
   */
  generateKey(question) {
    const text = question.question || question.passage || question.prompt || '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) - hash) + text.charCodeAt(i);
      hash |= 0;
    }
    return 'q_' + Math.abs(hash);
  },

  /**
   * Ghi nhận một câu hỏi bị làm sai
   * Tự động khởi tạo lịch ôn tập lặp lại ngắt quãng Leitner Box 1
   */
  recordMistake({ subjectId, lessonName, question, userAnswer, errorReason = null }) {
    if (!question) return null;
    const list = this._load();
    const key = question.id || this.generateKey(question);

    const existingIdx = list.findIndex(item => item.id === key || (item.question === (question.question || question.passage)));

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000).toISOString();
    let entry;

    if (existingIdx >= 0) {
      entry = list[existingIdx];
      entry.mistakeCount = (entry.mistakeCount || 1) + 1;
      entry.userAnswer = userAnswer !== undefined ? userAnswer : entry.userAnswer;
      entry.consecutiveCorrect = 0;
      entry.repetition = 0;
      entry.intervalDays = 1;
      entry.leitnerBox = 1; // Rơi về Hộp 1 khi làm sai lại
      entry.mastered = false; // Phục hồi thành active nếu làm sai lại
      entry.easeFactor = Math.max(1.3, (entry.easeFactor || 2.5) - 0.2);
      entry.nextReviewDate = tomorrow;
      entry.updatedAt = now.toISOString();
      if (errorReason) entry.errorReason = errorReason;
      if (!Array.isArray(entry.reviewHistory)) entry.reviewHistory = [];
      list[existingIdx] = entry;
    } else {
      entry = {
        id: key,
        subjectId: subjectId || 'general',
        lessonName: lessonName || question.lessonTitle || 'Ôn tập tổng hợp',
        question: question.question || question.passage || '',
        rawQuestion: question,
        type: question.type || (question.statements ? 'tf-group' : (question.options ? 'mcq' : 'shortanswer')),
        options: question.options || [],
        statements: question.statements || [],
        correctAnswer: question.mcqPayload ? question.mcqPayload.correctOptionIndex : (question.correctAnswer !== undefined ? question.correctAnswer : question.correct),
        userAnswer: userAnswer,
        explanation: question.explanation || null,
        mistakeCount: 1,
        consecutiveCorrect: 0,
        repetition: 0,
        intervalDays: 1,
        leitnerBox: 1,
        easeFactor: 2.5,
        nextReviewDate: tomorrow,
        lastReviewedDate: null,
        reviewHistory: [],
        errorReason: errorReason || null,
        mastered: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      list.unshift(entry);
    }

    this._save(list);
    return entry;
  },

  /**
   * Thăng cấp câu hỏi lên Leitner box tiếp theo (1 -> 2 -> 3 -> 4)
   * Tại Hộp 4, câu hỏi được đánh dấu là đã làm chủ (mastered = true)
   */
  promoteMistake(id) {
    const list = this._load();
    const idx = list.findIndex(item => item.id === id || item.question === id);
    if (idx < 0) return null;

    const item = list[idx];
    const currentBox = item.leitnerBox || 1;
    const nextBox = Math.min(4, currentBox + 1);
    const boxMeta = LEITNER_BOXES.find(b => b.id === nextBox) || LEITNER_BOXES[nextBox - 1];
    const intervalDays = boxMeta ? boxMeta.intervalDays : 1;

    const now = new Date();
    item.leitnerBox = nextBox;
    item.intervalDays = intervalDays;
    item.lastReviewedDate = now.toISOString();
    item.lastReviewedAt = now.toISOString();
    item.nextReviewDate = new Date(now.getTime() + (intervalDays * 86400000)).toISOString();
    if (nextBox === 4) {
      item.mastered = true;
    }
    item.consecutiveCorrect = (item.consecutiveCorrect || 0) + 1;
    item.repetition = (item.repetition || 0) + 1;
    item.updatedAt = now.toISOString();

    list[idx] = item;
    this._save(list);
    return item;
  },

  /**
   * Hạ cấp câu hỏi rơi thẳng về Hộp 1 khi làm sai (chuẩn Leitner)
   */
  demoteMistake(id) {
    const list = this._load();
    const idx = list.findIndex(item => item.id === id || item.question === id);
    if (idx < 0) return null;

    const item = list[idx];
    const now = new Date();
    item.leitnerBox = 1;
    item.intervalDays = 1;
    item.mastered = false;
    item.consecutiveCorrect = 0;
    item.repetition = 0;
    item.lastReviewedDate = now.toISOString();
    item.lastReviewedAt = now.toISOString();
    item.nextReviewDate = new Date(now.getTime() + 86400000).toISOString();
    item.updatedAt = now.toISOString();

    list[idx] = item;
    this._save(list);
    return item;
  },

  /**
   * Ghi nhận kết quả ôn luyện cho một câu hỏi (Đúng -> Promote, Sai -> Demote)
   * Lưu trữ lịch sử ôn luyện chi tiết (date, isCorrect, fromBox, toBox)
   */
  recordReview(id, isCorrect) {
    const list = this._load();
    const idx = list.findIndex(item => item.id === id || item.question === id);
    if (idx < 0) return null;

    const item = list[idx];
    const fromBox = item.leitnerBox || 1;
    let updated;

    if (isCorrect) {
      updated = this.promoteMistake(id);
    } else {
      updated = this.demoteMistake(id);
    }

    if (updated) {
      if (!Array.isArray(updated.reviewHistory)) {
        updated.reviewHistory = [];
      }
      updated.reviewHistory.push({
        date: new Date().toISOString(),
        isCorrect: !!isCorrect,
        fromBox,
        toBox: updated.leitnerBox
      });

      // Lưu lại reviewHistory vừa cập nhật
      const freshList = this._load();
      const freshIdx = freshList.findIndex(i => i.id === updated.id);
      if (freshIdx >= 0) {
        freshList[freshIdx].reviewHistory = updated.reviewHistory;
        this._save(freshList);
      }
    }

    return updated;
  },

  /**
   * Gán nhãn nguyên nhân sai sót cho câu hỏi
   */
  setMistakeReason(id, reasonKey) {
    const list = this._load();
    const idx = list.findIndex(item => item.id === id || item.question === id);
    if (idx < 0) return null;

    list[idx].errorReason = reasonKey;
    list[idx].updatedAt = new Date().toISOString();
    this._save(list);
    return list[idx];
  },

  /**
   * Lấy số lượng câu hỏi phân bố theo từng hộp Leitner
   */
  getLeitnerBoxCounts(subjectId = null) {
    const list = this._load();
    const filtered = list.filter(item => !subjectId || subjectId === 'all' || item.subjectId === subjectId);
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    filtered.forEach(item => {
      const box = item.leitnerBox || (item.mastered ? 4 : 1);
      if (counts[box] !== undefined) counts[box]++;
      else counts[1]++;
    });
    return counts;
  },

  /**
   * Tạo đề thi tuỳ chỉnh 1-click từ câu sai
   * Tương thích với App.startCustomExam / App.startLearning
   */
  createMistakeExam(filter = {}) {
    let box = null;
    let subjectId = null;
    if (typeof filter === 'number') {
      box = filter;
    } else if (filter) {
      box = filter.box || filter.leitnerBox || null;
      subjectId = filter.subjectId || null;
    }

    const mistakes = this.getMistakes({
      subjectId: subjectId || 'all',
      box: box || undefined
    });

    const questions = mistakes.map(m => m.rawQuestion || {
      id: m.id,
      question: m.question,
      options: m.options,
      statements: m.statements,
      correctAnswer: m.correctAnswer,
      correct: m.correctAnswer,
      explanation: m.explanation,
      lessonTitle: m.lessonName,
      type: m.type
    });

    const examConfig = {
      subjectId: subjectId && subjectId !== 'all' ? subjectId : (mistakes[0] ? mistakes[0].subjectId : 'lichsu11'),
      questions,
      boxFilter: box,
      durationMinutes: Math.max(10, Math.ceil(questions.length * 1.5)),
      mode: 'mistake-exam'
    };

    // Tự động kết nối với App hoặc app nếu có trong môi trường
    const appTarget = (typeof App !== 'undefined') ? App : ((typeof app !== 'undefined') ? app : (typeof window !== 'undefined' ? (window.App || window.app) : null));
    if (appTarget) {
      if (typeof appTarget.startCustomExam === 'function') {
        appTarget.startCustomExam(examConfig);
      } else if (typeof appTarget.startLearning === 'function') {
        appTarget.currentSubject = examConfig.subjectId;
        appTarget.currentQuestions = questions;
        appTarget.examMode = 'custom';
        appTarget.startLearning(examConfig);
      } else if (typeof appTarget.navigateTo === 'function') {
        appTarget.currentSubject = examConfig.subjectId;
        appTarget.currentQuestions = questions;
        appTarget.examMode = 'practice';
        appTarget.navigateTo('quiz');
      }
    }

    return {
      questions,
      count: questions.length,
      box,
      examConfig
    };
  },

  /**
   * Tạo phiên ôn luyện ngẫu nhiên từ câu sai
   */
  generatePracticeSession(filter = {}) {
    let box = null;
    let subjectId = null;
    if (typeof filter === 'number') {
      box = filter;
    } else if (filter) {
      box = filter.box || filter.leitnerBox || null;
      subjectId = filter.subjectId || null;
    }

    const mistakes = this.getMistakes({
      subjectId: subjectId || 'all',
      box: box || undefined
    });

    const questions = mistakes.map(m => m.rawQuestion || {
      id: m.id,
      question: m.question,
      options: m.options,
      statements: m.statements,
      correctAnswer: m.correctAnswer,
      correct: m.correctAnswer,
      explanation: m.explanation,
      lessonTitle: m.lessonName,
      type: m.type
    });

    const sessionConfig = {
      subjectId: subjectId && subjectId !== 'all' ? subjectId : (mistakes[0] ? mistakes[0].subjectId : 'lichsu11'),
      questions,
      boxFilter: box,
      mode: 'practice'
    };

    const appTarget = (typeof App !== 'undefined') ? App : ((typeof app !== 'undefined') ? app : (typeof window !== 'undefined' ? (window.App || window.app) : null));
    if (appTarget) {
      if (typeof appTarget.startLearning === 'function') {
        appTarget.startLearning(sessionConfig);
      } else if (typeof appTarget.navigateTo === 'function') {
        appTarget.currentSubject = sessionConfig.subjectId;
        appTarget.currentQuestions = questions;
        appTarget.examMode = 'practice';
        appTarget.navigateTo('quiz');
      }
    }

    return {
      questions,
      count: questions.length,
      box,
      sessionConfig
    };
  },

  /**
   * Ghi nhận khi học sinh trả lời đúng câu sai trong lúc ôn luyện (Backward compatibility)
   */
  recordSuccess(keyOrId, quality = 4) {
    const list = this._load();
    const idx = list.findIndex(item => item.id === keyOrId || item.question === keyOrId);
    if (idx < 0) return null;

    const item = list[idx];
    const now = new Date();
    const q = Math.max(0, Math.min(5, quality));

    item.consecutiveCorrect = (item.consecutiveCorrect || 0) + 1;
    item.repetition = (item.repetition || 0) + 1;

    let ef = item.easeFactor || 2.5;
    let interval = item.intervalDays || 1;

    if (q < 3) {
      item.repetition = 0;
      item.intervalDays = 1;
      item.leitnerBox = 1;
      item.mastered = false;
    } else {
      if (item.repetition === 1) {
        item.intervalDays = 1;
      } else if (item.repetition === 2) {
        item.intervalDays = 3;
      } else {
        item.intervalDays = Math.round(interval * ef);
      }
      ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
      item.easeFactor = Math.round(ef * 100) / 100;
      item.leitnerBox = Math.min(4, (item.leitnerBox || 1) + 1);
    }

    item.nextReviewDate = new Date(now.getTime() + (item.intervalDays * 86400000)).toISOString();
    item.lastReviewedDate = now.toISOString();
    item.lastReviewedAt = now.toISOString();
    item.mastered = true; // Đánh dấu đã thành thạo theo contract phase05
    item.updatedAt = now.toISOString();
    list[idx] = item;

    this._save(list);
    return item;
  },

  /**
   * Lấy danh sách câu sai có kèm bộ lọc mở rộng (hộp Leitner, lý do sai sót, môn, trạng thái)
   */
  getMistakes(filter = {}) {
    let list = this._load();

    if (filter.subjectId && filter.subjectId !== 'all') {
      list = list.filter(item => item.subjectId === filter.subjectId);
    }

    if (filter.box !== undefined && filter.box !== null && filter.box !== 'all') {
      const targetBox = Number(filter.box);
      list = list.filter(item => (item.leitnerBox || (item.mastered ? 4 : 1)) === targetBox);
    } else if (filter.leitnerBox !== undefined && filter.leitnerBox !== null && filter.leitnerBox !== 'all') {
      const targetBox = Number(filter.leitnerBox);
      list = list.filter(item => (item.leitnerBox || (item.mastered ? 4 : 1)) === targetBox);
    }

    if (filter.errorReason && filter.errorReason !== 'all') {
      list = list.filter(item => item.errorReason === filter.errorReason);
    } else if (filter.reason && filter.reason !== 'all') {
      list = list.filter(item => item.errorReason === filter.reason);
    }

    if (filter.status === 'active') {
      list = list.filter(item => !item.mastered);
    } else if (filter.status === 'due') {
      const now = new Date().toISOString();
      list = list.filter(item => !item.mastered && (!item.nextReviewDate || item.nextReviewDate <= now));
    } else if (filter.status === 'mastered') {
      list = list.filter(item => item.mastered);
    }

    if (filter.type && filter.type !== 'all') {
      list = list.filter(item => item.type === filter.type);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(item => 
        (item.question && item.question.toLowerCase().includes(q)) ||
        (item.lessonName && item.lessonName.toLowerCase().includes(q))
      );
    }

    return list;
  },

  getActiveCount(subjectId = null) {
    const list = this._load();
    return list.filter(item => !item.mastered && (!subjectId || subjectId === 'all' || item.subjectId === subjectId)).length;
  },

  getDueCount(subjectId = null) {
    const list = this._load();
    const now = new Date().toISOString();
    return list.filter(item => !item.mastered && (!item.nextReviewDate || item.nextReviewDate <= now) && (!subjectId || subjectId === 'all' || item.subjectId === subjectId)).length;
  },

  getTotalCount() {
    return this._load().length;
  },

  getStats(subjectId = null) {
    const list = this._load();
    const filtered = list.filter(item => !subjectId || subjectId === 'all' || item.subjectId === subjectId);
    const total = filtered.length;
    const mastered = filtered.filter(item => item.mastered).length;
    const active = total - mastered;
    const due = this.getDueCount(subjectId);
    const rate = total > 0 ? Math.round((mastered / total) * 100) : 100;
    const leitnerBoxes = this.getLeitnerBoxCounts(subjectId);

    const bySubject = {};
    list.forEach(item => {
      bySubject[item.subjectId] = bySubject[item.subjectId] || { total: 0, active: 0, mastered: 0 };
      bySubject[item.subjectId].total++;
      if (item.mastered) bySubject[item.subjectId].mastered++;
      else bySubject[item.subjectId].active++;
    });

    const byReason = {};
    Object.keys(ERROR_REASONS).forEach(k => { byReason[k] = 0; });
    filtered.forEach(item => {
      if (item.errorReason && byReason[item.errorReason] !== undefined) {
        byReason[item.errorReason]++;
      }
    });

    return { total, active, mastered, due, rate, bySubject, leitnerBoxes, byReason };
  },

  removeMistake(id) {
    let list = this._load();
    list = list.filter(item => item.id !== id);
    this._save(list);
  },

  clearAll(subjectId = null) {
    if (subjectId && subjectId !== 'all') {
      let list = this._load();
      list = list.filter(item => item.subjectId !== subjectId);
      this._save(list);
    } else {
      this._save([]);
    }
  }
};

/**
 * Giao diện hiển thị và tương tác Sổ Tay Câu Sai
 * Thiết kế TypeUI Creative & Athenaeum Codex (Obsidian Glass, Zero Raw Emoji)
 */
const MistakeView = {
  currentSubjectFilter: 'all',
  currentStatusFilter: 'active',
  currentBoxFilter: 'all',
  currentReasonFilter: 'all',
  currentSearch: '',

  SUBJECT_NAMES: {
    toan10: 'Toán học 10',
    vatli10: 'Vật lí 10',
    hoahoc10: 'Hóa học 10',
    tienganh10: 'Tiếng Anh 10',
    toan11: 'Toán học 11',
    vatli11: 'Vật lí 11',
    hoahoc11: 'Hóa học 11',
    tienganh11: 'Tiếng Anh 11',
    toan12: 'Toán học 12',
    vatli12: 'Vật lí 12',
    hoahoc12: 'Hóa học 12',
    tienganh12: 'Tiếng Anh 12',
    lichsu10: 'Lịch sử 10',
    lichsu11: 'Lịch sử 11',
    lichsu12: 'Lịch sử 12'
  },

  init() {
    MistakeStore.subscribe(() => {
      this.render();
      this.updateHeaderBadge();
    });
    this.updateHeaderBadge();
  },

  updateHeaderBadge() {
    const activeCount = MistakeStore.getActiveCount();
    const badge = document.getElementById('header-mistakes-badge');
    if (badge) {
      badge.textContent = activeCount;
      if (activeCount > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  },

  formatFormula(text) {
    if (!text) return '';
    if (typeof FormulaRenderer !== 'undefined' && FormulaRenderer.render) {
      try {
        return FormulaRenderer.render(text);
      } catch (e) {
        return this.escapeHtml(text);
      }
    }
    return this.escapeHtml(text);
  },

  getBoxIconSvg(boxId) {
    switch (boxId) {
      case 1:
        return `<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      case 2:
        return `<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`;
      case 3:
        return `<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
      case 4:
      default:
        return `<svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.45 1-1 1H7"/><path d="M14 14.66V17c0 .55.45 1 1 1h2"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`;
    }
  },

  getReasonIconSvg(reasonKey) {
    switch (reasonKey) {
      case 'reading_trap':
        return `<svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
      case 'calc_error':
        return `<svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>`;
      case 'forgot_formula':
        return `<svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>`;
      case 'knowledge_gap':
      default:
        return `<svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    }
  },

  /**
   * Render 4 thẻ hiển thị thống kê và tương tác theo các Hộp Leitner
   */
  renderLeitnerOverview(customCounts = null) {
    const counts = customCounts || MistakeStore.getLeitnerBoxCounts(this.currentSubjectFilter);

    return `
      <div class="leitner-boxes-grid" role="region" aria-label="Khung 4 hộp Leitner lặp lại ngắt quãng">
        ${LEITNER_BOXES.map(box => {
          const count = counts ? (counts[box.id] || 0) : 0;
          const isSelected = this.currentBoxFilter === box.id;
          return `
            <div class="leitner-box-card box-${box.id} ${isSelected ? 'selected' : ''}" 
                 tabindex="0"
                 role="button"
                 aria-pressed="${isSelected}"
                 aria-label="${box.name}: ${count} câu hỏi"
                 onclick="MistakeView.filterBox(${box.id})">
              <div class="leitner-card-head">
                <span class="leitner-badge">Hộp ${box.id}</span>
                <span class="leitner-icon-box">${this.getBoxIconSvg(box.id)}</span>
              </div>
              <div class="leitner-count">${count}</div>
              <div class="leitner-label">${box.name}</div>
              <div class="leitner-subtext">${box.desc}</div>
              <div class="leitner-card-footer">
                <button class="leitner-exam-btn" 
                        title="Tạo đề thi từ Hộp ${box.id}"
                        onclick="event.stopPropagation(); MistakeView.createMistakeExam({ box: ${box.id} })">
                  <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  Luyện hộp ${box.id}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  render() {
    const container = document.getElementById('screen-mistakes');
    if (!container) return;

    const stats = MistakeStore.getStats(this.currentSubjectFilter);
    const mistakes = MistakeStore.getMistakes({
      subjectId: this.currentSubjectFilter,
      status: this.currentStatusFilter,
      box: this.currentBoxFilter !== 'all' ? this.currentBoxFilter : undefined,
      errorReason: this.currentReasonFilter !== 'all' ? this.currentReasonFilter : undefined,
      search: this.currentSearch
    });

    const subjectKeys = Object.keys(stats.bySubject);

    container.innerHTML = `
      <div class="mistake-notebook-wrapper">
        <!-- HEADER TRANG TRỌNG THEO PHONG CÁCH TYPEUI ATHENAEUM -->
        <div class="mistake-header-banner">
          <div class="mistake-banner-left">
            <div class="mistake-banner-badge">
              <span class="live-dot-pulse"></span>
              THPT NGUYỄN THỊ MINH KHAI • TRÍ TUỆ ÔN TẬP GDPT 2018
            </div>
            <h1 class="mistake-title">
              <span class="title-icon-box">
                <svg class="ui-icon" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
              </span>
              Sổ Tay Phục Hồi Câu Sai
            </h1>
            <p class="mistake-subtitle">
              Động cơ lặp lại ngắt quãng Leitner 4 hộp (Hàng ngày, 3 ngày, 7 ngày, Đã làm chủ) kết hợp phân loại lỗi chi tiết, giúp biến sai sót thành điểm số thực tế.
            </p>
          </div>
          <div class="mistake-stats-cards">
            <div class="mistake-stat-card active-card">
              <span class="stat-num">${stats.active}</span>
              <span class="stat-label">Cần phục hồi</span>
            </div>
            <div class="mistake-stat-card due-card">
              <span class="stat-num">${stats.due}</span>
              <span class="stat-label">Lịch ôn hôm nay</span>
            </div>
            <div class="mistake-stat-card mastered-card">
              <span class="stat-num">${stats.mastered}</span>
              <span class="stat-label">Đã thành thạo</span>
            </div>
            <div class="mistake-stat-card rate-card">
              <span class="stat-num">${stats.rate}%</span>
              <span class="stat-label">Tỷ lệ sạch lỗi</span>
            </div>
          </div>
        </div>

        <!-- 4 HỘP LEITNER SPACED REPETITION ENGINE -->
        ${this.renderLeitnerOverview(stats.leitnerBoxes)}

        <!-- THANH ĐIỀU KHIỂN & BỘ LỌC CHUẨN TYPEUI -->
        <div class="mistake-controls-bar">
          <div class="mistake-filter-group">
            <label for="mistake-subject-select" class="filter-label">Môn học:</label>
            <select id="mistake-subject-select" class="mistake-select" onchange="MistakeView.filterSubject(this.value)">
              <option value="all" ${this.currentSubjectFilter === 'all' ? 'selected' : ''}>Tất cả môn (${stats.total})</option>
              ${subjectKeys.map(k => `
                <option value="${k}" ${this.currentSubjectFilter === k ? 'selected' : ''}>
                  ${this.SUBJECT_NAMES[k] || k} (${stats.bySubject[k].total} câu - ${stats.bySubject[k].active} chưa xong)
                </option>
              `).join('')}
            </select>
          </div>

          <div class="mistake-filter-group">
            <label for="mistake-reason-filter" class="filter-label">Phân loại lỗi:</label>
            <select id="mistake-reason-filter" class="mistake-select" onchange="MistakeView.filterReason(this.value)">
              <option value="all" ${this.currentReasonFilter === 'all' ? 'selected' : ''}>Tất cả nguyên nhân</option>
              ${Object.keys(ERROR_REASONS).map(k => `
                <option value="${k}" ${this.currentReasonFilter === k ? 'selected' : ''}>
                  ${ERROR_REASONS[k].label} (${stats.byReason[k] || 0})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="mistake-tabs" role="tablist">
            <button role="tab" class="mistake-tab-btn ${this.currentStatusFilter === 'active' && this.currentBoxFilter === 'all' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('active')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Cần ôn lại (${stats.active})
            </button>
            <button role="tab" class="mistake-tab-btn ${this.currentStatusFilter === 'due' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('due')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Hôm nay đến hạn (${stats.due})
            </button>
            <button role="tab" class="mistake-tab-btn ${this.currentStatusFilter === 'mastered' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('mastered')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              Đã thành thạo (${stats.mastered})
            </button>
            <button role="tab" class="mistake-tab-btn ${this.currentStatusFilter === 'all' && this.currentBoxFilter === 'all' ? 'active' : ''}" 
                    onclick="MistakeView.filterStatus('all')">
              Toàn bộ (${stats.total})
            </button>
          </div>

          <div class="mistake-search-wrapper">
            <svg class="search-icon-inside ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="text" 
                   class="mistake-search-input" 
                   placeholder="Tìm câu hỏi hoặc bài học..." 
                   aria-label="Tìm kiếm câu hỏi hoặc bài học"
                   value="${this.escapeHtml(this.currentSearch)}"
                   oninput="MistakeView.search(this.value)">
          </div>
        </div>

        <!-- THANH HÀNH ĐỘNG HỌC TẬP TỨC THÌ (1-CLICK CUSTOM EXAM & PRACTICE) -->
        <div class="mistake-actions-strip">
          <div class="actions-left">
            <span class="showing-count">
              Đang hiển thị <strong>${mistakes.length}</strong> câu hỏi
              ${this.currentBoxFilter !== 'all' ? `<span class="filter-tag">Hộp ${this.currentBoxFilter}</span>` : ''}
              ${this.currentReasonFilter !== 'all' ? `<span class="filter-tag">${ERROR_REASONS[this.currentReasonFilter]?.label || ''}</span>` : ''}
            </span>
          </div>
          <div class="actions-right">
            ${mistakes.length > 0 ? `
              <button class="action-btn-exam" onclick="MistakeView.createMistakeExam({ box: MistakeView.currentBoxFilter !== 'all' ? MistakeView.currentBoxFilter : undefined, subjectId: MistakeView.currentSubjectFilter !== 'all' ? MistakeView.currentSubjectFilter : undefined })">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Tạo đề thi từ sổ tay (${mistakes.length})
              </button>
              <button class="action-btn-practice" onclick="MistakeView.startPracticeCurrent()">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                Luyện câu này ngay (${mistakes.length})
              </button>
            ` : ''}
            <button class="action-btn-clear" onclick="MistakeView.confirmClear()">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              Xóa bộ lọc
            </button>
          </div>
        </div>

        <!-- DANH SÁCH CÁC CÂU SAI -->
        <div class="mistake-cards-list">
          ${this.renderList(mistakes)}
        </div>
      </div>
    `;
  },

  renderList(mistakes) {
    if (!mistakes || mistakes.length === 0) {
      return `
        <div class="mistake-empty-state">
          <div class="empty-icon">
            <svg class="ui-icon" viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h3>${this.currentStatusFilter === 'active' ? 'Tuyệt vời! Không còn câu sai nào cần phục hồi.' : 'Chưa có câu hỏi nào trong danh sách này.'}</h3>
          <p>${this.currentStatusFilter === 'active' ? 'Bạn đã làm chủ toàn bộ các câu hỏi đã gặp. Hãy tiếp tục thử sức với các bài thi mới!' : 'Làm thêm các đề thi để hệ thống tự động phát hiện lỗ hổng cho bạn.'}</p>
          <button class="empty-btn" onclick="typeof app !== 'undefined' ? app.navigateTo('subjects') : (typeof App !== 'undefined' ? App.navigateTo('subjects') : null)">Khám phá đề thi mới</button>
        </div>
      `;
    }

    return mistakes.map((item, index) => this.renderCard(item, index)).join('');
  },

  renderCard(item, index) {
    const isMastered = item.mastered;
    const currentBox = item.leitnerBox || (isMastered ? 4 : 1);
    const boxMeta = LEITNER_BOXES.find(b => b.id === currentBox) || LEITNER_BOXES[0];
    const letters = ['A', 'B', 'C', 'D'];

    return `
      <div class="mistake-item-card ${isMastered ? 'card-mastered' : ''}" id="m-card-${item.id}">
        <div class="mistake-card-top">
          <div class="mistake-badges">
            <span class="subject-pill">${this.SUBJECT_NAMES[item.subjectId] || item.subjectId}</span>
            <span class="lesson-pill">${this.escapeHtml(item.lessonName)}</span>
            <span class="format-pill ${item.type}">${item.type === 'tf-group' ? 'Đúng/Sai' : 'Trắc nghiệm'}</span>
            <span class="leitner-pill box-${currentBox}">
              ${this.getBoxIconSvg(currentBox)}
              ${boxMeta.label}
            </span>
            ${item.mistakeCount > 1 ? `<span class="repeat-pill">Sai ${item.mistakeCount} lần</span>` : ''}
          </div>
          <div class="card-status-badge">
            ${isMastered ? 
              '<span class="status-badge-ok"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Đã làm chủ (Hộp 4)</span>' : 
              `<span class="status-badge-need"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Cần ôn (${boxMeta.label})</span>`}
          </div>
        </div>

        <div class="mistake-question-content">
          <span class="q-index-badge">#${index + 1}</span>
          <div class="q-main-text">${this.formatFormula(item.question)}</div>
        </div>

        <!-- SO SÁNH ĐỐI CHIẾU ĐÁP ÁN -->
        <div class="mistake-compare-box">
          <div class="compare-title">ĐỐI CHIẾU PHƯƠNG ÁN:</div>
          
          ${item.type === 'tf-group' ? `
            <div class="tf-compare-list">
              ${(item.statements || []).map((stmt, sIdx) => {
                const sLetter = ['a', 'b', 'c', 'd'][sIdx];
                return `
                  <div class="tf-compare-row">
                    <span class="tf-stmt-letter">${sLetter})</span>
                    <span class="tf-stmt-text">${this.formatFormula(stmt.text || stmt)}</span>
                    <span class="tf-stmt-correct ${stmt.correct ? 'is-true' : 'is-false'}">
                      Chuẩn: <strong>${stmt.correct ? 'ĐÚNG' : 'SAI'}</strong>
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="mcq-compare-options">
              ${(item.options || []).map((opt, oIdx) => {
                const isCorrect = oIdx === item.correctAnswer;
                const isUserPick = oIdx === item.userAnswer;
                let optClass = '';
                if (isCorrect) optClass = 'opt-is-correct';
                if (isUserPick && !isCorrect) optClass = 'opt-user-wrong';

                return `
                  <div class="compare-opt-row ${optClass}">
                    <span class="opt-letter">${letters[oIdx]}</span>
                    <span class="opt-text">${this.formatFormula(opt)}</span>
                    ${isCorrect ? '<span class="opt-tag tag-correct"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg> Đáp án chuẩn</span>' : ''}
                    ${isUserPick && !isCorrect ? '<span class="opt-tag tag-wrong"><svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg> Lựa chọn của bạn</span>' : ''}
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        ${item.explanation ? `
          <div class="mistake-explanation-box">
            <div class="exp-title">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
              Lời giải & Phân tích phương pháp:
            </div>
            <div class="exp-content">${this.formatFormula(item.explanation)}</div>
          </div>
        ` : ''}

        <!-- PHÂN LOẠI NGUYÊN NHÂN LỖI SAI (ERROR CATEGORIZATION) -->
        <div class="mistake-reason-bar">
          <div class="reason-selector-group">
            <label class="reason-label" for="reason-select-${item.id}">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              Phân loại lỗi:
            </label>
            <select id="reason-select-${item.id}" 
                    class="reason-select" 
                    onchange="MistakeView.changeReason('${item.id}', this.value)" 
                    aria-label="Phân loại nguyên nhân sai cho câu hỏi">
              <option value="">-- Chưa gắn lý do --</option>
              ${Object.keys(ERROR_REASONS).map(k => `
                <option value="${k}" ${item.errorReason === k ? 'selected' : ''}>
                  ${ERROR_REASONS[k].label}
                </option>
              `).join('')}
            </select>
          </div>
          ${item.errorReason && ERROR_REASONS[item.errorReason] ? `
            <span class="reason-pill reason-${item.errorReason}">
              ${this.getReasonIconSvg(item.errorReason)}
              ${ERROR_REASONS[item.errorReason].label}
            </span>
          ` : ''}
        </div>

        <div class="mistake-card-footer">
          <div class="footer-left">
            <span class="created-time">
              Ghi nhận: ${new Date(item.createdAt).toLocaleDateString('vi-VN')}
              ${item.lastReviewedDate ? ` • Ôn gần nhất: ${new Date(item.lastReviewedDate).toLocaleDateString('vi-VN')}` : ''}
            </span>
          </div>
          <div class="footer-actions">
            <!-- LEITNER REVIEW BUTTONS -->
            <button class="review-promote-btn" 
                    title="Trả lời đúng: thăng cấp lên hộp tiếp theo" 
                    onclick="MistakeView.review('${item.id}', true)">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              Đúng (+1 Hộp)
            </button>
            <button class="review-demote-btn" 
                    title="Trả lời sai: quay lại Hộp 1 để ôn hàng ngày" 
                    onclick="MistakeView.review('${item.id}', false)">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              Sai (Về Hộp 1)
            </button>
            <button class="retry-single-btn" onclick="MistakeView.retrySingle('${item.id}')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Luyện ngay
            </button>
            <button class="remove-btn" title="Xóa câu này khỏi sổ tay" onclick="MistakeView.deleteMistake('${item.id}')">
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  },

  renderMistakeCard(item, index) {
    return this.renderCard(item, index);
  },

  filterSubject(subjectId) {
    this.currentSubjectFilter = subjectId;
    this.render();
  },

  filterStatus(status) {
    this.currentStatusFilter = status;
    this.currentBoxFilter = 'all';
    this.render();
  },

  filterBox(boxId) {
    this.currentBoxFilter = this.currentBoxFilter === boxId ? 'all' : boxId;
    this.render();
  },

  filterReason(reason) {
    this.currentReasonFilter = reason;
    this.render();
  },

  search(val) {
    this.currentSearch = val;
    this.render();
  },

  changeReason(id, reasonKey) {
    MistakeStore.setMistakeReason(id, reasonKey || null);
    this.render();
  },

  review(id, isCorrect) {
    MistakeStore.recordReview(id, isCorrect);
    if (typeof SoundFX !== 'undefined' && SoundFX) {
      if (isCorrect && SoundFX.playCorrect) SoundFX.playCorrect();
      else if (!isCorrect && SoundFX.playWrong) SoundFX.playWrong();
    }
    this.render();
  },

  promote(id) {
    MistakeStore.promoteMistake(id);
    if (typeof SoundFX !== 'undefined' && SoundFX && SoundFX.playCorrect) SoundFX.playCorrect();
    this.render();
  },

  demote(id) {
    MistakeStore.demoteMistake(id);
    if (typeof SoundFX !== 'undefined' && SoundFX && SoundFX.playWrong) SoundFX.playWrong();
    this.render();
  },

  markMastered(id) {
    MistakeStore.recordSuccess(id);
    if (typeof SoundFX !== 'undefined' && SoundFX && SoundFX.playCorrect) SoundFX.playCorrect();
    this.render();
  },

  deleteMistake(id) {
    if (confirm('Bạn có chắc muốn xóa câu hỏi này khỏi sổ tay không?')) {
      MistakeStore.removeMistake(id);
      this.render();
    }
  },

  confirmClear() {
    if (confirm('Bạn có chắc muốn làm sạch danh sách câu sai này không?')) {
      MistakeStore.clearAll(this.currentSubjectFilter);
      this.render();
    }
  },

  retrySingle(id) {
    const list = MistakeStore._load();
    const item = list.find(q => q.id === id);
    if (!item) return;

    const quizQuestion = item.rawQuestion || {
      id: item.id,
      question: item.question,
      options: item.options,
      correct: item.correctAnswer,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation,
      lessonTitle: item.lessonName
    };

    const appTarget = (typeof App !== 'undefined') ? App : ((typeof app !== 'undefined') ? app : (typeof window !== 'undefined' ? (window.App || window.app) : null));
    if (appTarget) {
      appTarget.currentSubject = item.subjectId;
      appTarget.currentQuestions = [quizQuestion];
      appTarget.examMode = 'practice';
      if (typeof appTarget.navigateTo === 'function') {
        appTarget.navigateTo('quiz');
      }
    }
  },

  createMistakeExam(filter) {
    return MistakeStore.createMistakeExam(filter || {
      box: this.currentBoxFilter !== 'all' ? this.currentBoxFilter : undefined,
      subjectId: this.currentSubjectFilter !== 'all' ? this.currentSubjectFilter : undefined
    });
  },

  generatePracticeSession(filter) {
    return MistakeStore.generatePracticeSession(filter || {
      box: this.currentBoxFilter !== 'all' ? this.currentBoxFilter : undefined,
      subjectId: this.currentSubjectFilter !== 'all' ? this.currentSubjectFilter : undefined
    });
  },

  startPracticeCurrent() {
    return this.generatePracticeSession({
      box: this.currentBoxFilter !== 'all' ? this.currentBoxFilter : undefined,
      subjectId: this.currentSubjectFilter !== 'all' ? this.currentSubjectFilter : undefined
    });
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MistakeStore, MistakeView, LEITNER_BOXES, ERROR_REASONS };
}
