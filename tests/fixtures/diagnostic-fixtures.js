/**
 * Controlled Diagnostic Test Fixtures & Deterministic Personas
 * NTMK Rebuild Phase 03A — Task 10
 *
 * Strict Compliance:
 * - Marked explicitly with isTestFixture: true.
 * - NEVER injected into production question bank.
 * - Simulates 7 realistic student profiles for algorithm verification.
 */

const FIXTURE_DIAGNOSTIC_QUESTIONS = [
  // --- Math Grade 10 Fixtures ---
  {
    id: 'fix_diag_m10_01',
    subjectId: 'toan',
    grade: 10,
    skillId: 'math-10-sets-logic',
    topicId: 'menh_de_tap_hop',
    topic: 'Mệnh đề và Tập hợp',
    format: 'multiple_choice',
    cognitiveLevel: 'recognize',
    prompt: 'Cho tập hợp $A = \\{x \\in \\mathbb{R} \\mid 1 < x \\le 5\\}$. Viết tập hợp $A$ dưới dạng khoảng, đoạn:',
    mcqPayload: {
      options: ['(1; 5]', '[1; 5)', '(1; 5)', '[1; 5]'],
      correctOptionIndex: 0
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },
  {
    id: 'fix_diag_m10_02',
    subjectId: 'toan',
    grade: 10,
    skillId: 'math-10-quad-func',
    topicId: 'ham_so_bac_hai',
    topic: 'Hàm số bậc hai & Đồ thị',
    format: 'multiple_choice',
    cognitiveLevel: 'understand',
    prompt: 'Tọa độ đỉnh $I$ của parabol $y = x^2 - 4x + 3$ là:',
    mcqPayload: {
      options: ['(2; -1)', '(-2; 15)', '(2; 3)', '(-1; 8)'],
      correctOptionIndex: 0
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },
  {
    id: 'fix_diag_m10_03',
    subjectId: 'toan',
    grade: 10,
    skillId: 'math-10-quad-ineq',
    topicId: 'tam_thuc_bac_hai',
    topic: 'Dấu của tam thức bậc hai & Bất phương trình',
    format: 'short_answer',
    cognitiveLevel: 'apply',
    prompt: 'Tập nghiệm của bất phương trình $x^2 - 5x + 6 < 0$ là khoảng $(a; b)$. Tính $a + b$:',
    shortAnswerPayload: {
      acceptedAnswers: ['5', '5.0', '5,0'],
      correctAnswer: '5'
    },
    answerPolicy: { allowCommaDecimal: true, tolerance: 0 },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },

  // --- Math Grade 11 Fixtures ---
  {
    id: 'fix_diag_m11_01',
    subjectId: 'toan',
    grade: 11,
    skillId: 'math-11-limits-continuity',
    topicId: 'gioi_han_ham_so',
    topic: 'Giới hạn dãy số, Giới hạn hàm số & Hàm liên tục',
    format: 'multiple_choice',
    cognitiveLevel: 'understand',
    prompt: 'Tính giới hạn $L = \\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}$:',
    mcqPayload: {
      options: ['4', '2', '0', 'Vô cực'],
      correctOptionIndex: 0
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },
  {
    id: 'fix_diag_m11_02',
    subjectId: 'toan',
    grade: 11,
    skillId: 'math-11-derivatives',
    topicId: 'dao_ham',
    topic: 'Đạo hàm & Ý nghĩa hình học của đạo hàm',
    format: 'short_answer',
    cognitiveLevel: 'apply',
    prompt: 'Cho hàm số $y = x^3 - 3x + 1$. Hệ số góc của tiếp tuyến tại điểm có hoành độ $x_0 = 2$ bằng:',
    shortAnswerPayload: {
      acceptedAnswers: ['9', '9.0'],
      correctAnswer: '9'
    },
    answerPolicy: { tolerance: 0 },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },

  // --- Math Grade 12 Fixtures ---
  {
    id: 'fix_diag_m12_01',
    subjectId: 'toan',
    grade: 12,
    skillId: 'math-12-func-monotonicity',
    topicId: 'ung_dung_dao_ham',
    topic: 'Tính đơn điệu của hàm số',
    format: 'multiple_choice',
    cognitiveLevel: 'understand',
    prompt: 'Hàm số $y = -x^3 + 3x^2 - 2$ đồng biến trên khoảng nào sau đây?',
    mcqPayload: {
      options: ['(0; 2)', '(-\\infty; 0)', '(2; +\\infty)', '(-2; 2)'],
      correctOptionIndex: 0
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },
  {
    id: 'fix_diag_m12_02',
    subjectId: 'toan',
    grade: 12,
    skillId: 'math-12-func-extrema',
    topicId: 'cuc_tri_ham_so',
    topic: 'Cực trị của hàm số & Giá trị lớn nhất, nhỏ nhất',
    format: 'true_false_group',
    cognitiveLevel: 'apply',
    prompt: 'Cho hàm số $y = f(x)$ có đạo hàm $f\'(x) = x(x-1)^2(x+2)$. Các phát biểu sau đúng hay sai?',
    tfPayload: {
      statements: [
        { id: 'stmt_1', text: 'Hàm số có 3 điểm cực trị.', correct: false },
        { id: 'stmt_2', text: 'Điểm $x = 1$ là một điểm cực trị của hàm số.', correct: false },
        { id: 'stmt_3', text: 'Hàm số đạt cực tiểu tại $x = 0$.', correct: true },
        { id: 'stmt_4', text: 'Hàm số đạt cực đại tại $x = -2$.', correct: true }
      ]
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },
  {
    id: 'fix_diag_m12_03',
    subjectId: 'toan',
    grade: 12,
    skillId: 'math-12-func-asymptotes',
    topicId: 'duong_tiem_can',
    topic: 'Đường tiệm cận của đồ thị hàm số',
    format: 'multiple_choice',
    cognitiveLevel: 'recognize',
    prompt: 'Đồ thị hàm số $y = \\frac{2x - 1}{x + 1}$ có tiệm cận đứng là đường thẳng:',
    mcqPayload: {
      options: ['x = -1', 'x = 2', 'y = 2', 'y = -1'],
      correctOptionIndex: 0
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },

  // --- Physics Fixtures ---
  {
    id: 'fix_diag_p10_01',
    subjectId: 'vatli',
    grade: 10,
    skillId: 'phys-10-kinematics',
    topicId: 'chuyen_dong_bien_doi',
    topic: 'Mô tả chuyển động thẳng biến đổi đều',
    format: 'multiple_choice',
    cognitiveLevel: 'understand',
    prompt: 'Một vật chuyển động thẳng biến đổi đều với gia tốc $a = 2\\text{ m/s}^2$ và vận tốc đầu $v_0 = 4\\text{ m/s}$. Vận tốc sau $3\\text{ s}$ là:',
    mcqPayload: {
      options: ['10 m/s', '6 m/s', '12 m/s', '8 m/s'],
      correctOptionIndex: 0
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },
  {
    id: 'fix_diag_p12_01',
    subjectId: 'vatli',
    grade: 12,
    skillId: 'phys-12-thermal-gas',
    topicId: 'vat_li_nhiet',
    topic: 'Vật lí nhiệt & Mô hình động học phân tử chất khí',
    format: 'true_false_group',
    cognitiveLevel: 'understand',
    prompt: 'Xét một khối khí lí tưởng trong một xi lanh kín có pit-tông. Các nhận định sau đúng hay sai?',
    tfPayload: {
      statements: [
        { id: 'p_stmt_1', text: 'Khi nén đẳng nhiệt, áp suất của khối khí tỉ lệ nghịch với thể tích.', correct: true },
        { id: 'p_stmt_2', text: 'Nhiệt độ tuyệt đối T (Kelvin) bằng t (°C) + 273.', correct: true },
        { id: 'p_stmt_3', text: 'Đơn vị của hằng số khí lí tưởng R trong hệ SI là J/(mol.K).', correct: true },
        { id: 'p_stmt_4', text: 'Động năng trung bình của phân tử khí không phụ thuộc vào nhiệt độ.', correct: false }
      ]
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },

  // --- Chemistry Fixtures ---
  {
    id: 'fix_diag_c10_01',
    subjectId: 'hoahoc',
    grade: 10,
    skillId: 'chem-10-redox-reactions',
    topicId: 'phan_ung_oxi_hoa_khu',
    topic: 'Phản ứng oxi hóa - khử',
    format: 'multiple_choice',
    cognitiveLevel: 'understand',
    prompt: 'Trong phản ứng $2\\text{Fe} + 3\\text{Cl}_2 \\to 2\\text{FeCl}_3$, chất khử là:',
    mcqPayload: {
      options: ['Fe', 'Cl2', 'FeCl3', 'Cả Fe và Cl2'],
      correctOptionIndex: 0
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  },

  // --- English Fixtures ---
  {
    id: 'fix_diag_e10_01',
    subjectId: 'tienganh',
    grade: 10,
    skillId: 'eng-10-verb-tenses',
    topicId: 'verb_tenses_10',
    topic: 'Verb Tenses',
    format: 'multiple_choice',
    cognitiveLevel: 'understand',
    prompt: 'She ________ in this school since she moved to the city in 2022.',
    mcqPayload: {
      options: ['has taught', 'taught', 'is teaching', 'teaches'],
      correctOptionIndex: 0
    },
    source: {
      sourceName: 'Diagnostic Algorithm Test Fixture',
      permissionApproved: true,
      licenseEvidence: 'TEST-FIXTURE-LICENSE-03A',
      verificationStatus: 'verified',
      verificationEvidence: 'Fixture Verified for Algorithm Tests'
    },
    status: 'published',
    isTestFixture: true
  }
];

/**
 * 7 Deterministic Student Personas for algorithm & regression tests
 */
const DETERMINISTIC_PERSONAS = {
  // 1. High Achiever: Answers almost everything correctly
  persona_high_achiever: {
    studentId: 'student_persona_high_achiever',
    name: 'Thí sinh Giỏi Toàn diện (Test Fixture)',
    isTestFixture: true,
    answers: {
      fix_diag_m10_01: 0,
      fix_diag_m10_02: 0,
      fix_diag_m10_03: '5',
      fix_diag_m11_01: 0,
      fix_diag_m11_02: '9',
      fix_diag_m12_01: 0,
      fix_diag_m12_02: { stmt_1: false, stmt_2: false, stmt_3: true, stmt_4: true },
      fix_diag_m12_03: 0,
      fix_diag_p10_01: 0,
      fix_diag_p12_01: { p_stmt_1: true, p_stmt_2: true, p_stmt_3: true, p_stmt_4: false },
      fix_diag_c10_01: 0,
      fix_diag_e10_01: 0
    }
  },

  // 2. Weak Foundation: Fails grade 10 foundational algebra
  persona_weak_foundation: {
    studentId: 'student_persona_weak_foundation',
    name: 'Thí sinh Hổng Kiến thức Nền (Test Fixture)',
    isTestFixture: true,
    answers: {
      fix_diag_m10_01: 2, // Wrong
      fix_diag_m10_02: 1, // Wrong
      fix_diag_m10_03: '10', // Wrong
      fix_diag_m11_01: 3, // Wrong
      fix_diag_m11_02: '0', // Wrong
      fix_diag_m12_01: 1, // Wrong
      fix_diag_m12_02: { stmt_1: true, stmt_2: true, stmt_3: false, stmt_4: false }, // 0 correct
      fix_diag_m12_03: 3
    }
  },

  // 3. Inconsistent: Alternating correct and wrong answers (high variance)
  persona_inconsistent: {
    studentId: 'student_persona_inconsistent',
    name: 'Thí sinh Kết quả Dao động (Test Fixture)',
    isTestFixture: true,
    answers: {
      fix_diag_m10_01: 0, // Correct
      fix_diag_m10_02: 2, // Wrong
      fix_diag_m10_03: '5', // Correct
      fix_diag_m11_01: 1, // Wrong
      fix_diag_m11_02: '9', // Correct
      fix_diag_m12_01: 2, // Wrong
      fix_diag_m12_02: { stmt_1: false, stmt_2: true, stmt_3: true, stmt_4: false } // 2 correct
    }
  },

  // 4. Many Unanswered: Leaves 50% blank
  persona_many_unanswered: {
    studentId: 'student_persona_many_unanswered',
    name: 'Thí sinh Bỏ trống nhiều câu (Test Fixture)',
    isTestFixture: true,
    answers: {
      fix_diag_m10_01: 0, // Correct
      fix_diag_m12_01: 0  // Correct, rest left empty
    }
  },

  // 5. New Student: Zero prior history
  persona_new_student: {
    studentId: 'student_persona_new_student',
    name: 'Thí sinh Mới (Zero Prior History)',
    isTestFixture: true,
    answers: {}
  },

  // 6. Weak Prerequisite: Gets Grade 12 question wrong specifically due to Grade 10/11 failure
  persona_weak_prerequisite: {
    studentId: 'student_persona_weak_prereq',
    name: 'Thí sinh Sai do Tiên quyết Yếu (Test Fixture)',
    isTestFixture: true,
    answers: {
      fix_diag_m10_02: 1, // Fails quadratic
      fix_diag_m11_02: '0', // Fails derivative
      fix_diag_m12_01: 2, // Fails Grade 12 monotonicity (derivative application)
      fix_diag_m12_03: 0  // But can answer simple asymptote definition
    }
  },

  // 7. Improving Student: Sequential sessions showing learning curve
  persona_improving_student: {
    studentId: 'student_persona_improving',
    name: 'Thí sinh Tiến bộ qua 3 lần thi (Test Fixture)',
    isTestFixture: true,
    sessions: [
      {
        attempt: 1,
        answers: { fix_diag_m10_01: 1, fix_diag_m10_02: 2, fix_diag_m10_03: '0' } // All wrong
      },
      {
        attempt: 2,
        answers: { fix_diag_m10_01: 0, fix_diag_m10_02: 2, fix_diag_m10_03: '5' } // 2 correct
      },
      {
        attempt: 3,
        answers: { fix_diag_m10_01: 0, fix_diag_m10_02: 0, fix_diag_m10_03: '5', fix_diag_m11_01: 0 } // All correct
      }
    ]
  }
};

module.exports = {
  FIXTURE_DIAGNOSTIC_QUESTIONS,
  DETERMINISTIC_PERSONAS
};
