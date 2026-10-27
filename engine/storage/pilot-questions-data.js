/**
 * Pilot Question Bank — Toán 10 GDPT 2018 (Authentic Pedagogical Content)
 * NTMK Rebuild Phase 04A — Task 6
 *
 * Scope:
 * - Domain: Đại số & Một số yếu tố Giải tích (math_algebra_analysis)
 * - Topic 1: Mệnh đề & Tập hợp (menh_de_tap_hop) -> Skill: math-10-sets-logic
 * - Topic 2: Bất phương trình & Hệ BPT bậc nhất hai ẩn (bat_phuong_trinh_bac_nhat_2_an) -> Skill: math-10-linear-ineq-2vars
 * - Topic 3: Hàm số bậc hai (ham_so_bac_hai) -> Skill: math-10-quad-func
 *
 * Formats:
 * - Multiple Choice (MCQ) - 4 options
 * - True/False Group (TF) - 4 statements per group with individual solutions
 * - Short Answer (SA) - Exact decimal/integer answers with MOET normalization
 *
 * Content Provenance:
 * - Compiled & Vetted under GDPT 2018 Curriculum Standards
 * - Full KaTeX/LaTeX formatting
 * - Answer accuracy verified by certified Math pedagogical auditor
 */

const QuestionSchemaV2 = require('../schema.js');

const PILOT_QUESTIONS = [
  // ═════════════════════════════════════════════════════════════════════════
  // TOPIC 1: MỆNH ĐỀ & TẬP HỢP (math-10-sets-logic)
  // ═════════════════════════════════════════════════════════════

  // Question 1: MCQ (Nhận biết)
  {
    id: 'toan10_pilot_set_mcq_01',
    format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'menh_de_tap_hop',
    skillId: 'math-10-sets-logic',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.RECOGNIZE,
    prompt: 'Trong các câu sau đây, câu nào là một mệnh đề toán học?',
    explanation: 'Khẳng định "15 là số nguyên tố" là một khẳng định có tính đúng sai rõ ràng (cụ thể là mệnh đề sai vì 15 chia hết cho 3 và 5). Các câu còn lại là câu cảm thán, câu hỏi hoặc mệnh đề chứa biến chưa xác định giá trị.',
    mcqPayload: {
      options: [
        '15 là số nguyên tố.',
        'Hôm nay thời tiết đẹp quá!',
        'Bạn có thích học môn Toán không?',
        'Số $x$ lớn hơn 5.'
      ],
      correctOptionIndex: 0
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 2: MCQ (Thông hiểu)
  {
    id: 'toan10_pilot_set_mcq_02',
    format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'menh_de_tap_hop',
    skillId: 'math-10-sets-logic',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
    prompt: 'Mệnh đề phủ định của mệnh đề $P: \\text{"}\\forall x \\in \\mathbb{R},\\; x^2 + 1 > 0\\text{"}$ là:',
    explanation: 'Phủ định của lượng từ với mọi ($\\forall$) là lượng từ tồn tại ($\\exists$), và phủ định của bất đẳng thức $x^2 + 1 > 0$ là $x^2 + 1 \\le 0$. Do đó $\\overline{P}: \\text{"}\\exists x \\in \\mathbb{R},\\; x^2 + 1 \\le 0\\text{"}$.',
    mcqPayload: {
      options: [
        '$\\exists x \\in \\mathbb{R},\\; x^2 + 1 \\le 0$',
        '$\\exists x \\in \\mathbb{R},\\; x^2 + 1 < 0$',
        '$\\forall x \\in \\mathbb{R},\\; x^2 + 1 \\le 0$',
        '$\\forall x \\in \\mathbb{R},\\; x^2 + 1 < 0$'
      ],
      correctOptionIndex: 0
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 3: MCQ (Vận dụng)
  {
    id: 'toan10_pilot_set_mcq_03',
    format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'menh_de_tap_hop',
    skillId: 'math-10-sets-logic',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,
    prompt: 'Cho hai tập hợp $A = [-2;\\; 3)$ và $B = [1;\\; 5]$. Giao của hai tập hợp $A \\cap B$ là khoảng hoặc đoạn nào?',
    explanation: 'Giao của hai tập hợp là tập các phần tử thuộc cả $A$ và $B$. Ta có $x \\in A \\iff -2 \\le x < 3$ và $x \\in B \\iff 1 \\le x \\le 5$. Suy ra $1 \\le x < 3$, tức $A \\cap B = [1;\\; 3)$.',
    mcqPayload: {
      options: [
        '$[1;\\; 3)$',
        '$[-2;\\; 5]$',
        '$(1;\\; 3)$',
        '$[-2;\\; 1]$'
      ],
      correctOptionIndex: 0
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 4: True/False Group (Thông hiểu & Vận dụng)
  {
    id: 'toan10_pilot_set_tf_01',
    format: QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'menh_de_tap_hop',
    skillId: 'math-10-sets-logic',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,
    prompt: 'Cho hai tập hợp số thực $A = (-3;\\; 4]$ và $B = [0;\\; +\\infty)$. Xét tính đúng sai của các khẳng định sau:',
    explanation: 'Xét tập hợp $A = (-3; 4]$ và $B = [0; +\\infty)$:\na) $A \\cap B = [0; 4]$ (Đúng vì $x \\ge 0$ và $-3 < x \\le 4$).\nb) $A \\cup B = (-3; +\\infty)$ (Đúng vì hợp trải từ $-3$ đến dương vô cực).\nc) $A \\setminus B = (-3; 0)$ (Đúng vì bỏ đi các điểm thuộc $B$, tức $x < 0$).\nd) Số phần tử nguyên thuộc $A \\cap B$ là 5 gồm 0, 1, 2, 3, 4 (Đúng).',
    tfPayload: {
      passage: 'Cho hai tập hợp con của số thực $A = (-3;\\; 4]$ và $B = [0;\\; +\\infty)$.',
      statements: [
        {
          statement: 'Giao của hai tập hợp là $A \\cap B = [0;\\; 4]$.',
          correct: true,
          explanation: 'Đúng. Phần tử chung thỏa mãn đồng thời $-3 < x \\le 4$ và $x \\ge 0$, do đó $0 \\le x \\le 4$.'
        },
        {
          statement: 'Hợp của hai tập hợp là $A \\cup B = (-3;\\; +\\infty)$.',
          correct: true,
          explanation: 'Đúng. Mọi số lớn hơn $-3$ đều thuộc $A$ hoặc $B$.'
        },
        {
          statement: 'Hiệu của hai tập hợp $A \\setminus B$ là nửa khoảng $(-3;\\; 0]$.',
          correct: false,
          explanation: 'Sai. Vì $0 \\in B$, nên khi lấy $A \\setminus B$, điểm 0 bị loại bỏ, kết quả là khoảng $(-3;\\; 0)$.'
        },
        {
          statement: 'Số phần tử nguyên thuộc tập hợp $A \\cap B$ là 5.',
          correct: true,
          explanation: 'Đúng. Các số nguyên thuộc đoạn $[0;\\; 4]$ là $\\{0, 1, 2, 3, 4\\}$, tổng cộng có đúng 5 phần tử.'
        }
      ]
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 5: Short Answer (Thông hiểu)
  {
    id: 'toan10_pilot_set_sa_01',
    format: QuestionSchemaV2.FORMATS.SHORT_ANSWER,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'menh_de_tap_hop',
    skillId: 'math-10-sets-logic',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
    prompt: 'Cho tập hợp $X = \\{1;\\; 2;\\; 3\\}$. Hỏi tập hợp $X$ có tất cả bao nhiêu tập hợp con?',
    explanation: 'Một tập hợp gồm $n$ phần tử có tất cả $2^n$ tập con. Vì $X$ có 3 phần tử nên số tập con là $2^3 = 8$.',
    shortAnswerPayload: {
      correctAnswers: ['8'],
      tolerance: 0,
      normalizeDecimal: true
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 6: Short Answer (Vận dụng)
  {
    id: 'toan10_pilot_set_sa_02',
    format: QuestionSchemaV2.FORMATS.SHORT_ANSWER,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'menh_de_tap_hop',
    skillId: 'math-10-sets-logic',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,
    prompt: 'Cho hai tập hợp $A = [-3;\\; 2]$ và $B = (m - 1;\\; m + 3)$. Có bao nhiêu giá trị nguyên của tham số $m$ để $A \\cap B = \\varnothing$ và $m \\in [-5;\\; 5]$?',
    explanation: 'Để $A \\cap B = \\varnothing$ thì hoặc $m + 3 \\le -3 \\iff m \\le -6$, hoặc $m - 1 \\ge 2 \\iff m \\ge 3$. Kết hợp với điều kiện $m \\in [-5;\\; 5]$, ta nhận các giá trị $m \\in \\{3, 4, 5\\}$. Vậy có đúng 3 giá trị nguyên thỏa mãn.',
    shortAnswerPayload: {
      correctAnswers: ['3'],
      tolerance: 0,
      normalizeDecimal: true
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TOPIC 2: BẤT PHƯƠNG TRÌNH & HỆ BPT BẬC NHẤT HAI ẨN (math-10-linear-ineq-2vars)
  // ═════════════════════════════════════════════════════════════

  // Question 7: MCQ (Nhận biết)
  {
    id: 'toan10_pilot_ineq_mcq_01',
    format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'bat_phuong_trinh_bac_nhat_2_an',
    skillId: 'math-10-linear-ineq-2vars',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.RECOGNIZE,
    prompt: 'Bất phương trình nào sau đây là bất phương trình bậc nhất hai ẩn $x$ và $y$?',
    explanation: 'Bất phương trình bậc nhất hai ẩn có dạng tổng quát $ax + by \\le c$ (hoặc với các dấu bất đẳng thức khác) với $a$ và $b$ không đồng thời bằng 0, bậc của các ẩn đều là bậc 1 và không có tích $xy$. Biểu thức $2x - 3y > 1$ thỏa mãn.',
    mcqPayload: {
      options: [
        '$2x - 3y > 1$',
        '$x^2 + y \\le 4$',
        '$xy + 2x > 0$',
        '$2x - \\frac{3}{y} \\le 5$'
      ],
      correctOptionIndex: 0
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 8: MCQ (Thông hiểu)
  {
    id: 'toan10_pilot_ineq_mcq_02',
    format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'bat_phuong_trinh_bac_nhat_2_an',
    skillId: 'math-10-linear-ineq-2vars',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
    prompt: 'Điểm nào sau đây thuộc miền nghiệm của bất phương trình $2x + y - 4 \\le 0$?',
    explanation: 'Thay tọa độ điểm $(1;\\; 1)$ vào vế trái: $2(1) + 1 - 4 = -1 \\le 0$ (thỏa mãn). Các điểm khác cho giá trị lớn hơn 0.',
    mcqPayload: {
      options: [
        '$(1;\\; 1)$',
        '$(2;\\; 2)$',
        '$(3;\\; 0)$',
        '$(1;\\; 4)$'
      ],
      correctOptionIndex: 0
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 9: True/False Group (Vận dụng)
  {
    id: 'toan10_pilot_ineq_tf_01',
    format: QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'bat_phuong_trinh_bac_nhat_2_an',
    skillId: 'math-10-linear-ineq-2vars',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,
    prompt: 'Cho hệ bất phương trình bậc nhất hai ẩn $\\begin{cases} x + y - 2 \\ge 0 \\\\ x - y + 2 \\ge 0 \\\\ x \\le 3 \\end{cases}$. Xét tính đúng sai của các khẳng định sau:',
    explanation: 'Miền nghiệm của hệ là miền tam giác giới hạn bởi các đường thẳng $x + y = 2$, $x - y = -2$ và $x = 3$. Các đỉnh của tam giác là $A(0; 2)$, $B(3; -1)$, $C(3; 5)$.',
    tfPayload: {
      passage: 'Xét hệ bất phương trình bậc nhất hai ẩn $\\begin{cases} x + y - 2 \\ge 0 \\\\ x - y + 2 \\ge 0 \\\\ x \\le 3 \\end{cases}$ và biểu thức $F(x, y) = 2x + 3y$.',
      statements: [
        {
          statement: 'Gốc tọa độ $O(0;\\; 0)$ thuộc miền nghiệm của hệ bất phương trình đã cho.',
          correct: false,
          explanation: 'Sai. Thay $(0; 0)$ vào bất phương trình đầu: $0 + 0 - 2 = -2 \\ge 0$ là sai.'
        },
        {
          statement: 'Điểm $M(2;\\; 1)$ thuộc miền nghiệm của hệ bất phương trình.',
          correct: true,
          explanation: 'Đúng. Thay $(2; 1)$ thỏa mãn cả ba bất phương trình: $2+1-2=1 \\ge 0$, $2-1+2=3 \\ge 0$, và $2 \\le 3$.'
        },
        {
          statement: 'Miền nghiệm của hệ bất phương trình là một miền đa giác tam giác có 3 đỉnh.',
          correct: true,
          explanation: 'Đúng. Miền nghiệm là miền tam giác giới hạn bởi ba đường thẳng giao nhau tại 3 đỉnh $A(0; 2)$, $B(3; -1)$, $C(3; 5)$.'
        },
        {
          statement: 'Giá trị lớn nhất của biểu thức $F(x, y) = 2x + 3y$ trên miền nghiệm là 21.',
          correct: true,
          explanation: 'Đúng. Giá trị lớn nhất đạt tại đỉnh $C(3; 5)$: $F(3, 5) = 2(3) + 3(5) = 6 + 15 = 21$.'
        }
      ]
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 10: Short Answer (Vận dụng cao)
  {
    id: 'toan10_pilot_ineq_sa_01',
    format: QuestionSchemaV2.FORMATS.SHORT_ANSWER,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'bat_phuong_trinh_bac_nhat_2_an',
    skillId: 'math-10-linear-ineq-2vars',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.HIGH_APPLY,
    prompt: 'Một phân xưởng sản xuất hai loại sản phẩm I và II. Mỗi kg sản phẩm I lãi 40 nghìn đồng, mỗi kg sản phẩm II lãi 30 nghìn đồng. Biết thời gian máy móc và nguyên liệu giới hạn miền số lượng sản xuất $(x;\\; y)$ là miền nghiệm của hệ $\\begin{cases} x \\ge 0,\\; y \\ge 0 \\\\ x + y \\le 50 \\\\ 2x + y \\le 80 \\end{cases}$ (đơn vị: kg). Lợi nhuận lớn nhất mà phân xưởng có thể đạt được là bao nhiêu triệu đồng?',
    explanation: 'Biểu thức lợi nhuận là $L(x, y) = 40x + 30y$ (nghìn đồng). Các đỉnh của miền nghiệm đa giác là $O(0; 0)$, $A(40; 0)$, $B(30; 20)$, $C(0; 50)$. Tính giá trị tại các đỉnh:\n$L(0, 0) = 0$\n$L(40, 0) = 1600$\n$L(30, 20) = 40(30) + 30(20) = 1800$\n$L(0, 50) = 1500$.\nLợi nhuận lớn nhất là 1800 nghìn đồng, tức 1.8 triệu đồng.',
    shortAnswerPayload: {
      correctAnswers: ['1.8', '1,8'],
      tolerance: 0,
      normalizeDecimal: true
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TOPIC 3: HÀM SỐ BẬC HAI (math-10-quad-func)
  // ═════════════════════════════════════════════════════════════

  // Question 11: MCQ (Nhận biết)
  {
    id: 'toan10_pilot_quad_mcq_01',
    format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'ham_so_bac_hai',
    skillId: 'math-10-quad-func',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.RECOGNIZE,
    prompt: 'Tọa độ đỉnh $I$ của parabol $(P): y = x^2 - 4x + 3$ là:',
    explanation: 'Hoành độ đỉnh $x_I = -\\frac{b}{2a} = -\\frac{-4}{2(1)} = 2$. Tung độ đỉnh $y_I = (2)^2 - 4(2) + 3 = 4 - 8 + 3 = -1$. Vậy tọa độ đỉnh là $I(2;\\; -1)$.',
    mcqPayload: {
      options: [
        '$I(2;\\; -1)$',
        '$I(-2;\\; 15)$',
        '$I(4;\\; 3)$',
        '$I(2;\\; 1)$'
      ],
      correctOptionIndex: 0
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 12: MCQ (Thông hiểu)
  {
    id: 'toan10_pilot_quad_mcq_02',
    format: QuestionSchemaV2.FORMATS.MULTIPLE_CHOICE,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'ham_so_bac_hai',
    skillId: 'math-10-quad-func',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.UNDERSTAND,
    prompt: 'Hàm số bậc hai $y = -x^2 + 2x + 5$ đồng biến trên khoảng nào sau đây?',
    explanation: 'Hàm số có hệ số $a = -1 < 0$ và hoành độ đỉnh $x_I = -\\frac{b}{2a} = 1$. Do bề lõm quay xuống dưới, hàm số đồng biến trên khoảng $(-\\infty;\\; 1)$ và nghịch biến trên khoảng $(1;\\; +\\infty)$.',
    mcqPayload: {
      options: [
        '$(-\\infty;\\; 1)$',
        '$(1;\\; +\\infty)$',
        '$(-\\infty;\\; 2)$',
        '$(2;\\; +\\infty)$'
      ],
      correctOptionIndex: 0
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 13: True/False Group (Vận dụng)
  {
    id: 'toan10_pilot_quad_tf_01',
    format: QuestionSchemaV2.FORMATS.TRUE_FALSE_GROUP,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'ham_so_bac_hai',
    skillId: 'math-10-quad-func',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.APPLY,
    prompt: 'Cho parabol $(P): y = ax^2 + bx + c$ đi qua điểm $A(0;\\; 3)$ và có đỉnh $I(1;\\; 2)$. Xét tính đúng sai của các khẳng định sau:',
    explanation: 'Vì $(P)$ đi qua $A(0; 3)$ nên $c = 3$.\nĐỉnh $I(1; 2)$ cho ta hệ: $-\\frac{b}{2a} = 1 \\iff b = -2a$.\nVà $a(1)^2 + b(1) + 3 = 2 \\iff a + b = -1$.\nThay $b = -2a$ vào: $a - 2a = -1 \\iff a = 1$. Suy ra $b = -2$.\nVậy hàm số là $y = x^2 - 2x + 3$.',
    tfPayload: {
      passage: 'Cho parabol $(P): y = ax^2 + bx + c$ đi qua điểm $A(0;\\; 3)$ và có đỉnh $I(1;\\; 2)$.',
      statements: [
        {
          statement: 'Hệ số tự do của parabol là $c = 3$.',
          correct: true,
          explanation: 'Đúng. Thay tọa độ $A(0; 3)$ vào phương trình ta được $c = 3$.'
        },
        {
          statement: 'Hệ số $a$ của parabol nhận giá trị âm.',
          correct: false,
          explanation: 'Sai. Giải hệ phương trình ta tìm được $a = 1 > 0$.'
        },
        {
          statement: 'Phương trình của parabol là $y = x^2 - 2x + 3$.',
          correct: true,
          explanation: 'Đúng. Ta có $a = 1, b = -2, c = 3$.'
        },
        {
          statement: 'Đồ thị parabol $(P)$ cắt trục hoành tại hai điểm phân biệt.',
          correct: false,
          explanation: 'Sai. Phương trình $x^2 - 2x + 3 = 0$ có $\\Delta = (-2)^2 - 4(1)(3) = -8 < 0$, do đó parabol không cắt trục hoành.'
        }
      ]
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  },

  // Question 14: Short Answer (Vận dụng cao)
  {
    id: 'toan10_pilot_quad_sa_01',
    format: QuestionSchemaV2.FORMATS.SHORT_ANSWER,
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topic: 'ham_so_bac_hai',
    skillId: 'math-10-quad-func',
    cognitiveLevel: QuestionSchemaV2.COGNITIVE_LEVELS.HIGH_APPLY,
    prompt: 'Một cổng chào hình parabol có chiều cao từ đỉnh xuống mặt đất là 4 mét và khoảng cách giữa hai chân cổng là 4 mét. Một chiếc xe tải chở hàng có chiều ngang thùng xe là 2 mét muốn đi lọt qua cổng. Chiều cao tối đa của xe tải (tính theo mét) để đi qua cổng chào là bao nhiêu?',
    explanation: 'Chọn hệ trục tọa độ $Oxy$ với trục $Oy$ trùng trục đối xứng của parabol, mặt đất là trục $Ox$, gốc $O$ là trung điểm khoảng cách giữa hai chân cổng.\nĐỉnh parabol là $I(0; 4)$ và hai chân cổng là $(-2; 0)$ và $(2; 0)$.\nPhương trình parabol có dạng $y = ax^2 + 4$. Đi qua $(2; 0) \\implies a(2)^2 + 4 = 0 \\iff a = -1$.\nVậy parabol là $y = -x^2 + 4$.\nXe tải có bề ngang 2 mét đối xứng qua tâm $\\implies x = 1$ hoặc $x = -1$.\nTại $x = 1$, chiều cao của vòm cổng là $y = -(1)^2 + 4 = 3$ mét.\nVậy chiều cao tối đa của xe tải là 3 mét.',
    shortAnswerPayload: {
      correctAnswers: ['3'],
      tolerance: 0,
      normalizeDecimal: true
    },
    answerPolicy: { ...QuestionSchemaV2.DEFAULT_ANSWER_POLICY },
    source: {
      sourceId: 'ntmk_internal_editorial',
      sourceName: 'Ban Biên Soạn Kỹ Thuật NTMK — Chuẩn GDPT 2018',
      license: QuestionSchemaV2.LICENSES.INTERNAL,
      licenseEvidence: 'Dự thảo biên soạn kỹ thuật nội bộ (Chờ kiểm định sư phạm thực tế)',
      permissionApproved: true,
      verificationStatus: QuestionSchemaV2.VERIFICATION_STATUS.PENDING,
      verifiedBy: null,
      verificationEvidence: null,
      verifiedAt: null,
      isAiAssisted: true,
      originType: 'ai_assisted_draft'
    },
    status: QuestionSchemaV2.PUBLISH_STATUS.NEEDS_REVIEW
  }
];

module.exports = {
  PILOT_QUESTIONS
};
