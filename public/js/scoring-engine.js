/**
 * Subject-specific Scoring Engine (NTMK Rebuild Phase 02)
 * Implements official MOET Decision 764/QĐ-BGDĐT scoring rules & subject blueprints
 */



const SUBJECT_PROFILES = {
  toan: {
    name: 'Toán học',
    mcqPoints: 0.25,     // 12 questions * 0.25 = 3.0 pts
    tfGroupPoints: 1.0,  // 4 groups * 1.0 = 4.0 pts
    saPoints: 0.5,       // 6 questions * 0.5 = 3.0 pts
    totalPoints: 10.0
  },
  vatli: {
    name: 'Vật lí',
    mcqPoints: 0.25,     // 18 questions * 0.25 = 4.5 pts
    tfGroupPoints: 1.0,  // 4 groups * 1.0 = 4.0 pts
    saPoints: 0.25,      // 6 questions * 0.25 = 1.5 pts
    totalPoints: 10.0
  },
  hoahoc: {
    name: 'Hóa học',
    mcqPoints: 0.25,     // 18 questions * 0.25 = 4.5 pts
    tfGroupPoints: 1.0,  // 4 groups * 1.0 = 4.0 pts
    saPoints: 0.25,      // 6 questions * 0.25 = 1.5 pts
    totalPoints: 10.0
  },
  tienganh: {
    name: 'Tiếng Anh',
    mcqPoints: 0.25,     // 40 questions * 0.25 = 10.0 pts
    tfGroupPoints: 0,
    saPoints: 0,
    totalPoints: 10.0
  },
  default: {
    name: 'Mặc định',
    mcqPoints: 0.25,
    tfGroupPoints: 1.0,
    saPoints: 0.5,
    totalPoints: 10.0
  }
};

const ScoringEngine = {
  SUBJECT_PROFILES,

  /**
   * MOET standard Part II True/False group partial scoring table
   * 1 correct -> 0.1
   * 2 correct -> 0.25
   * 3 correct -> 0.50
   * 4 correct -> 1.00
   */
  TF_SCORE_TABLE: {
    0: 0.0,
    1: 0.1,
    2: 0.25,
    3: 0.5,
    4: 1.0
  },

  /**
   * Normalize subject key (e.g. 'toan10' -> 'toan')
   */
  getSubjectProfile(subjectKey) {
    if (!subjectKey) return SUBJECT_PROFILES.default;
    const clean = String(subjectKey).replace(/\d+$/, '').toLowerCase();
    return SUBJECT_PROFILES[clean] || SUBJECT_PROFILES.default;
  },

  /**
   * Normalize user text for short answer evaluation
   */
  normalizeText(input) {
    if (input === undefined || input === null) return '';
    return String(input)
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  },

  /**
   * Check if short answer matches expected answer
   * Enforces question-specific answer policy:
   * - No default tolerance unless explicitly configured in payload.tolerance or answerPolicy.tolerance
   * - No automatic unit stripping unless explicitly permitted by question payload/policy
   * - Comma decimal normalization (1,5 == 1.5) if allowed
   */
  evaluateShortAnswer(userResponse, question) {
    const policy = question.answerPolicy || {};
    const normalize = value => { let s = String(value ?? ''); if (policy.normalizeSpaces !== false) s = s.trim().replace(/\s+/g, ' '); if (policy.caseSensitive !== true) s = s.toLowerCase(); return s; };
    const rawUser = normalize(userResponse);
    if (!rawUser) {
      return { isCorrect: false, scoreRatio: 0, normalizedUser: '' };
    }

    const payload = question.shortAnswerPayload || {};
    let acceptableAnswers = [];

    if (Array.isArray(payload.correctAnswers)) {
      acceptableAnswers = payload.correctAnswers.map(a => normalize(a));
    } else if (payload.correctAnswer !== undefined) {
      acceptableAnswers = [normalize(payload.correctAnswer)];
    } else if (question.correctAnswer !== undefined) {
      acceptableAnswers = [normalize(question.correctAnswer)];
    } else if (question.correct !== undefined) {
      acceptableAnswers = [normalize(question.correct)];
    }

    // 1. Direct exact text match
    if (acceptableAnswers.includes(rawUser)) {
      return { isCorrect: true, scoreRatio: 1.0, normalizedUser: rawUser };
    }

    // 2. Comma decimal conversion: 3,14 <-> 3.14 (only if allowCommaDecimal is not false)
    const allowComma = policy.allowCommaDecimal !== false;
    const userWithDot = allowComma ? rawUser.replace(/,/g, '.') : rawUser;

    // Helper: Verify string is purely numeric so parseFloat doesn't inadvertently strip units like "50 kg"
    const isPureNumber = (s) => typeof s === 'string' && /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(s.trim());
    const isUserPureNumeric = isPureNumber(userWithDot);
    const userNumeric = isUserPureNumeric ? parseFloat(userWithDot) : NaN;

    // Tolerance policy: ONLY if explicitly specified in payload.tolerance or question.answerPolicy.tolerance (> 0)
    // Default is strictly 0: không tự động nới lỏng dung sai khi chưa được quy định
    let tolerance = 0;
    if (typeof payload.tolerance === 'number' && payload.tolerance >= 0) {
      tolerance = payload.tolerance;
    } else if (typeof policy.tolerance === 'number' && policy.tolerance > 0) {
      tolerance = policy.tolerance;
    }

    // Unit stripping policy: ONLY if explicitly allowed by question
    const allowUnitStripping = payload.allowUnitStripping === true || 
                               policy.allowUnitStripping === true;
    const targetUnit = (allowUnitStripping && payload.unit) ? normalize(payload.unit) : '';

    for (const ans of acceptableAnswers) {
      const ansWithDot = allowComma ? ans.replace(/,/g, '.') : ans;

      // Direct string match after decimal normalize
      if (userWithDot === ansWithDot) {
        return { isCorrect: true, scoreRatio: 1.0, normalizedUser: userWithDot };
      }

      // 3. Numeric comparison within tolerance (ONLY for pure numbers; never when trailing unit exists without stripping)
      const isAnsPureNumeric = isPureNumber(ansWithDot);
      if (isUserPureNumeric && isAnsPureNumeric) {
        const ansNumeric = parseFloat(ansWithDot);
        if (tolerance > 0 && Math.abs(userNumeric - ansNumeric) <= tolerance) {
          return { isCorrect: true, scoreRatio: 1.0, normalizedUser: String(userNumeric) };
        } else if (tolerance === 0 && userNumeric === ansNumeric) {
          return { isCorrect: true, scoreRatio: 1.0, normalizedUser: String(userNumeric) };
        }
      }

      // 4. Unit stripping comparison: ONLY when allowed
      if (targetUnit) {
        const strippedUser = rawUser.endsWith(targetUnit) ? rawUser.slice(0, -targetUnit.length).trim() : rawUser;
        const strippedAns = ans.endsWith(targetUnit) ? ans.slice(0, -targetUnit.length).trim() : ans;
        if (strippedUser === strippedAns || (allowComma && strippedUser.replace(/,/g, '.') === strippedAns.replace(/,/g, '.'))) {
          return { isCorrect: true, scoreRatio: 1.0, normalizedUser: strippedUser };
        }

        // Numeric check on stripped strings
        const strippedUserDot = allowComma ? strippedUser.replace(/,/g, '.') : strippedUser;
        const strippedAnsDot = allowComma ? strippedAns.replace(/,/g, '.') : strippedAns;
        if (isPureNumber(strippedUserDot) && isPureNumber(strippedAnsDot)) {
          const sUserNum = parseFloat(strippedUserDot);
          const sAnsNum = parseFloat(strippedAnsDot);
          if (tolerance > 0 && Math.abs(sUserNum - sAnsNum) <= tolerance) {
            return { isCorrect: true, scoreRatio: 1.0, normalizedUser: String(sUserNum) };
          } else if (tolerance === 0 && sUserNum === sAnsNum) {
            return { isCorrect: true, scoreRatio: 1.0, normalizedUser: String(sUserNum) };
          }
        }
      }
    }

    return { isCorrect: false, scoreRatio: 0, normalizedUser: rawUser };
  },

  /**
   * Score an entire exam submission
   * @param {Array} questions - Array of question objects
   * @param {Object} userAnswers - Map of questionIndex or questionId to user answers
   * @param {string} subjectId - Subject key (e.g. 'toan10')
   * @param {Object} options - Custom scoring options
   */
  scoreExam(questions, userAnswers = {}, subjectId = 'default', options = {}) {
    const profile = this.getSubjectProfile(subjectId);
    const useMOETWeights = options.useMOETWeights !== false; // Default true

    let rawScore = 0;
    let maxScore = 0;
    let sectionSummary = {
      mcq: { earned: 0, max: 0, correctCount: 0, totalCount: 0 },
      tf: { earned: 0, max: 0, correctStatements: 0, totalStatements: 0, totalGroups: 0 },
      sa: { earned: 0, max: 0, correctCount: 0, totalCount: 0 }
    };

    const itemBreakdown = [];

    questions.forEach((q, idx) => {
      // User response may be keyed by index or question ID
      const userAns = userAnswers[idx] !== undefined ? userAnswers[idx] : userAnswers[q.id];
      const type = q.format || q.type || 'multiple_choice';

      let qResult = {
        index: idx,
        id: q.id || `q_${idx}`,
        type,
        scoreAwarded: 0,
        maxScore: 0,
        isCorrect: false,
        details: null
      };

      if (type === 'multiple_choice' || type === 'mcq') {
        const weight = useMOETWeights ? profile.mcqPoints : 1.0;
        qResult.maxScore = weight;
        maxScore += weight;
        sectionSummary.mcq.max += weight;
        sectionSummary.mcq.totalCount++;

        const correctOpt = q.mcqPayload 
          ? q.mcqPayload.correctOptionIndex 
          : (q.correctAnswer !== undefined ? q.correctAnswer : q.correct);

        const isCorrect = userAns !== undefined && userAns !== null && Number(userAns) === Number(correctOpt);
        if (isCorrect) {
          qResult.scoreAwarded = weight;
          qResult.isCorrect = true;
          rawScore += weight;
          sectionSummary.mcq.earned += weight;
          sectionSummary.mcq.correctCount++;
        }
        qResult.details = { userChoice: userAns, correctChoice: correctOpt };

      } else if (type === 'true_false_group' || type === 'tf-group') {
        const weight = useMOETWeights ? profile.tfGroupPoints : 1.0;
        qResult.maxScore = weight;
        maxScore += weight;
        sectionSummary.tf.max += weight;
        sectionSummary.tf.totalGroups++;

        const statements = (q.tfPayload && q.tfPayload.statements) || q.statements || [];
        const groupAnswers = userAns && typeof userAns === 'object' ? userAns : {};

        let correctCount = 0;
        const stmtBreakdown = [];

        statements.forEach((stmt, sIdx) => {
          sectionSummary.tf.totalStatements++;
          const userVal = groupAnswers[sIdx];
          const isStmtCorrect = userVal !== undefined && userVal === stmt.correct;

          if (isStmtCorrect) {
            correctCount++;
            sectionSummary.tf.correctStatements++;
          }

          stmtBreakdown.push({
            statementIndex: sIdx,
            userChoice: userVal,
            correctChoice: stmt.correct,
            isCorrect: isStmtCorrect
          });
        });

        // Apply MOET partial scoring table
        const partialRatio = this.TF_SCORE_TABLE[correctCount] || 0.0;
        const groupScore = weight * partialRatio;

        qResult.scoreAwarded = groupScore;
        qResult.isCorrect = correctCount === statements.length;
        rawScore += groupScore;
        sectionSummary.tf.earned += groupScore;
        qResult.details = {
          correctStatements: correctCount,
          totalStatements: statements.length,
          partialRatio,
          statementResults: stmtBreakdown
        };

      } else if (type === 'short_answer' || type === 'shortanswer') {
        const weight = useMOETWeights ? profile.saPoints : 1.0;
        qResult.maxScore = weight;
        maxScore += weight;
        sectionSummary.sa.max += weight;
        sectionSummary.sa.totalCount++;

        const evalResult = this.evaluateShortAnswer(userAns, q);
        const saScore = weight * evalResult.scoreRatio;

        qResult.scoreAwarded = saScore;
        qResult.isCorrect = evalResult.isCorrect;
        rawScore += saScore;
        sectionSummary.sa.earned += saScore;
        if (evalResult.isCorrect) sectionSummary.sa.correctCount++;

        qResult.details = {
          userText: userAns,
          normalizedUser: evalResult.normalizedUser,
          expectedAnswers: (q.shortAnswerPayload && q.shortAnswerPayload.correctAnswers) || [q.correctAnswer || q.correct]
        };
      }

      itemBreakdown.push(qResult);
    });

    // Round scores cleanly to 2 decimal places to prevent 0.30000000000000004 floating errors
    const cleanRawScore = Math.round(rawScore * 100) / 100;
    const cleanMaxScore = Math.round(maxScore * 100) / 100;

    // Scale to standard 10-point scale
    const scaledScore = cleanMaxScore > 0 
      ? Math.round((cleanRawScore / cleanMaxScore) * 10 * 100) / 100 
      : 0;

    const percentage = cleanMaxScore > 0 
      ? Math.round((cleanRawScore / cleanMaxScore) * 100) 
      : 0;

    // Check if exam meets official MOET Decision 764 blueprint criteria
    const cleanSub = String(subjectId).replace(/\d+$/, '').toLowerCase();
    const mcqCnt = sectionSummary.mcq.totalCount;
    const tfCnt = sectionSummary.tf.totalGroups;
    const saCnt = sectionSummary.sa.totalCount;

    let isOfficialBlueprint = false;
    if (cleanSub === 'toan' && mcqCnt === 12 && tfCnt === 4 && saCnt === 6 && cleanMaxScore === 10.0) {
      isOfficialBlueprint = true;
    } else if ((cleanSub === 'vatli' || cleanSub === 'hoahoc') && mcqCnt === 18 && tfCnt === 4 && saCnt === 6 && cleanMaxScore === 10.0) {
      isOfficialBlueprint = true;
    } else if (cleanSub === 'tienganh' && mcqCnt === 40 && cleanMaxScore === 10.0) {
      isOfficialBlueprint = true;
    }

    const examType = isOfficialBlueprint ? 'official_blueprint' : 'practice_quiz';
    const scaleDescription = isOfficialBlueprint
      ? 'Thang điểm 10 chuẩn cấu trúc đề tốt nghiệp THPT (QĐ 764/QĐ-BGDĐT)'
      : 'Điểm quy đổi tương đối thang 10 (Đề luyện tập rút gọn)';
    const blueprintNotice = isOfficialBlueprint
      ? 'Bài thi đạt đầy đủ định dạng và ma trận điểm chuẩn của Bộ GD&ĐT.'
      : 'Bài luyện tập rút gọn — Điểm số quy đổi mang tính tham khảo rèn luyện, không thay thế đề thi tốt nghiệp chính thức.';

    return {
      rawScore: cleanRawScore,
      maxScore: cleanMaxScore,
      scaledScore,
      percentage,
      examType,
      isOfficialBlueprint,
      scaleDescription,
      blueprintNotice,
      sectionSummary: {
        mcq: { earned: Math.round(sectionSummary.mcq.earned * 100) / 100, max: Math.round(sectionSummary.mcq.max * 100) / 100, correctCount: sectionSummary.mcq.correctCount, totalCount: sectionSummary.mcq.totalCount },
        tf: { earned: Math.round(sectionSummary.tf.earned * 100) / 100, max: Math.round(sectionSummary.tf.max * 100) / 100, correctStatements: sectionSummary.tf.correctStatements, totalStatements: sectionSummary.tf.totalStatements, totalGroups: sectionSummary.tf.totalGroups },
        sa: { earned: Math.round(sectionSummary.sa.earned * 100) / 100, max: Math.round(sectionSummary.sa.max * 100) / 100, correctCount: sectionSummary.sa.correctCount, totalCount: sectionSummary.sa.totalCount }
      },
      itemBreakdown,
      subjectId
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScoringEngine;
}
