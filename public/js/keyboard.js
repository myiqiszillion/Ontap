/**
 * Keyboard Shortcuts Manager for Ultra-Fast Drilling
 * [1-4] or [A-D] for MCQ
 * [D/S] or [T/F] for True/False
 * [Enter]/[Space] for Next
 * [Left]/[Right] for Navigation
 */

const KeyboardDrill = {
  enabled: true,

  init() {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  },

  handleKeyDown(e) {
    if (!this.enabled) return;

    // Ignore if user is currently typing in an input or textarea or select
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      return;
    }

    const currentScreen = AppRouter.currentRoute;
    const key = e.key.toUpperCase();

    // ═══════════════════════════════════════
    // 1. QUIZ (EXAM) MODE
    // ═══════════════════════════════════════
    if (currentScreen === 'quiz' && typeof Quiz !== 'undefined') {
      const q = Quiz.questions[Quiz.currentQuestionIndex];
      if (!q) return;

      const isGroup = q.type === 'tf-group' || q.format === 'true_false_group';

      if (!isGroup) {
        // MCQ Options
        const optMap = { '1': 0, '2': 1, '3': 2, '4': 3, 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        if (optMap[key] !== undefined) {
          e.preventDefault();
          Quiz.selectOption(optMap[key]);
          if (window.SoundFX) SoundFX.playClick();
          return;
        }
      }

      // Navigation
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        Quiz.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        Quiz.prev();
      }
    }

    // ═══════════════════════════════════════
    // 2. PRACTICE MODE
    // ═══════════════════════════════════════
    if (currentScreen === 'practice' && typeof Study !== 'undefined') {
      const q = Study.currentPracticeQuestion;
      if (!q) return;

      // If next button is visible, Space or Enter triggers next
      const nextBtn = document.getElementById('practice-next-btn');
      if (nextBtn && !nextBtn.classList.contains('hidden')) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          Study.practiceNext();
          return;
        }
      }

      if (q.type === 'mcq') {
        const optMap = { '1': 0, '2': 1, '3': 2, '4': 3, 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        if (optMap[key] !== undefined) {
          e.preventDefault();
          Study.practiceSelectMCQ(optMap[key]);
          return;
        }
      } else if (q.type === 'tf-group') {
        // Find first unanswered statement
        const currAnswered = Study.currentTfState ? Study.currentTfState.answered : 0;
        if (currAnswered < (q.statements || []).length) {
          if (key === 'D' || key === 'T' || key === '1') {
            e.preventDefault();
            Study.practiceSelectTF(currAnswered, true);
          } else if (key === 'S' || key === 'F' || key === '0' || key === '2') {
            e.preventDefault();
            Study.practiceSelectTF(currAnswered, false);
          }
        }
      }
    }

    // ═══════════════════════════════════════
    // 3. FLASHCARD MODE
    // ═══════════════════════════════════════
    if (currentScreen === 'flashcard' && typeof Study !== 'undefined') {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        Study.flipCard();
      } else if (e.key === '1' || key === 'N' || key === 'S' || e.key === 'ArrowLeft') {
        e.preventDefault();
        Study.markUnknown();
      } else if (e.key === '2' || key === 'Y' || key === 'D' || e.key === 'ArrowRight') {
        e.preventDefault();
        Study.markKnown();
      }
    }
  }
};

if (typeof window !== 'undefined') {
  window.KeyboardDrill = KeyboardDrill;
  document.addEventListener('DOMContentLoaded', () => KeyboardDrill.init());
}
