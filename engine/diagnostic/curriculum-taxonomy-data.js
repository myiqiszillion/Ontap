/**
 * Curriculum Skill Knowledge Graph Taxonomy Data (GDPT 2018)
 * NTMK Rebuild Phase 03A — Task 1
 *
 * Hierarchy:
 * Subject -> Grade -> Domain -> Topic -> Skill -> Prerequisites
 *
 * Covers:
 * - Toán (Math): Grades 10, 11, 12
 * - Vật lí (Physics): Grades 10, 11, 12
 * - Hóa học (Chemistry): Grades 10, 11, 12
 * - Tiếng Anh (English): Grades 10, 11, 12
 *
 * Strict Pedagogical Principles:
 * - Grounded in MOET General Education Curriculum 2018 (Chương trình GDPT 2018).
 * - Distinguishes curriculum standards from textbook-specific layouts (KNTT, CD, CTST).
 * - Unverified or unaligned topics marked verificationStatus: 'unverified'.
 * - Cross-grade prerequisite dependencies modeled explicitly.
 */

const CURRICULUM_DOMAINS = {
  toan: [
    { id: 'math_algebra_analysis', name: 'Đại số & Một số yếu tố Giải tích', description: 'Hàm số, phương trình, giới hạn, đạo hàm, nguyên hàm và tích phân' },
    { id: 'math_geometry_measurement', name: 'Hình học & Đo lường', description: 'Hệ thức lượng, vectơ, hình học không gian và phương pháp tọa độ Oxyz' },
    { id: 'math_statistics_probability', name: 'Thống kê & Xác suất', description: 'Thống kê mô tả, xác suất cổ điển và xác suất có điều kiện' }
  ],
  vatli: [
    { id: 'phys_mechanics', name: 'Cơ học', description: 'Động học, động lực học, công - năng lượng, động lượng và chuyển động tròn' },
    { id: 'phys_oscillations_waves', name: 'Dao động & Sóng', description: 'Dao động cơ, sóng cơ, sóng âm và sóng điện từ' },
    { id: 'phys_electromagnetism', name: 'Điện & Từ học', description: 'Điện trường, dòng điện không đổi, từ trường và cảm ứng điện từ' },
    { id: 'phys_thermal_nuclear', name: 'Nhiệt học & Vật lí hạt nhân', description: 'Vật lí nhiệt, chất khí, cấu trúc nguyên tử và phản ứng hạt nhân' }
  ],
  hoahoc: [
    { id: 'chem_general_physical', name: 'Hóa học đại cương & Vô cơ cơ sở', description: 'Cấu tạo nguyên tử, bảng tuần hoàn, liên kết hóa học, nhiệt hóa học và tốc độ phản ứng' },
    { id: 'chem_solutions_inorganic', name: 'Dung dịch & Hóa học vô cơ', description: 'Cân bằng hóa học, acid - base, phi kim, kim loại và phức chất' },
    { id: 'chem_organic', name: 'Hóa học hữu cơ', description: 'Hydrocarbon, dẫn xuất, ester - lipid, carbohydrate, hợp chất chứa nitrogen và polymer' }
  ],
  tienganh: [
    { id: 'eng_phonetics_lexicogrammar', name: 'Ngữ âm, Từ vựng & Ngữ pháp', description: 'Trọng âm, phát âm, thì động từ, cấu trúc câu phức và từ vựng học thuật' },
    { id: 'eng_reading_comprehension', name: 'Kỹ năng Đọc hiểu', description: 'Xác định ý chính, suy luận, từ vựng theo ngữ cảnh và tổng hợp thông tin' },
    { id: 'eng_functional_communication', name: 'Giao tiếp & Ngôn ngữ ứng dụng', description: 'Chức năng giao tiếp, viết biến đổi câu và liên kết văn bản' }
  ]
};

const CURRICULUM_SKILLS = [
  // ═════════════════════════════════════════════════════════════════════════
  // TOÁN HỌC (MATH)
  // ═════════════════════════════════════════════════════════════════════════

  // --- Grade 10 Math ---
  {
    skillId: 'math-10-sets-logic',
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topicId: 'menh_de_tap_hop',
    topicTitle: 'Mệnh đề và Tập hợp',
    title: 'Xác định mệnh đề toán học và thực hiện các phép toán tập hợp',
    description: 'Nhận biết mệnh đề, mệnh đề phủ định; tìm giao, hợp, hiệu của hai tập hợp số.',
    learningObjectives: ['Phân biệt mệnh đề toán học', 'Thực hiện phép giao, hợp, hiệu tập hợp'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018 (Thông tư 32/2018/TT-BGDĐT)',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-10-linear-ineq-2vars',
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topicId: 'bat_phuong_trinh_bac_nhat_2_an',
    topicTitle: 'Bất phương trình & Hệ BPT bậc nhất hai ẩn',
    title: 'Biểu diễn miền nghiệm của hệ bất phương trình bậc nhất hai ẩn',
    description: 'Xác định miền nghiệm trên mặt phẳng tọa độ và giải bài toán tối ưu thực tế đơn giản.',
    learningObjectives: ['Biểu diễn miền nghiệm', 'Tìm giá trị lớn nhất/nhỏ nhất của biểu thức bậc nhất trên miền đa giác'],
    prerequisiteSkillIds: ['math-10-sets-logic'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-10-quad-func',
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topicId: 'ham_so_bac_hai',
    topicTitle: 'Hàm số bậc hai & Đồ thị',
    title: 'Khảo sát và vẽ đồ thị hàm số bậc hai y = ax^2 + bx + c',
    description: 'Xác định đỉnh, trục đối xứng, khoảng đồng biến/nghịch biến và giá trị cực trị của parabol.',
    learningObjectives: ['Tìm tọa độ đỉnh parabol', 'Xét chiều biến thiên của hàm số bậc hai'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-10-quad-ineq',
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topicId: 'tam_thuc_bac_hai',
    topicTitle: 'Dấu của tam thức bậc hai & Bất phương trình',
    title: 'Xét dấu tam thức bậc hai và giải bất phương trình bậc hai một ẩn',
    description: 'Áp dụng định lí về dấu của tam thức bậc hai để giải bất phương trình và bài toán chứa tham số.',
    learningObjectives: ['Xét dấu tam thức ax^2 + bx + c', 'Giải bất phương trình ax^2 + bx + c > 0'],
    prerequisiteSkillIds: ['math-10-quad-func'],
    cognitiveLevels: ['understand', 'apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-10-trig-triangle',
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_geometry_measurement',
    topicId: 'he_thuc_luong_tam_giac',
    topicTitle: 'Hệ thức lượng trong tam giác',
    title: 'Áp dụng định lí côsin, định lí sin và công thức diện tích tam giác',
    description: 'Tính cạnh, góc, bán kính đường tròn ngoại tiếp/nội tiếp và diện tích tam giác.',
    learningObjectives: ['Vận dụng định lí cosin', 'Vận dụng định lí sin', 'Giải bài toán đo đạc thực tế'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-10-vectors',
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_geometry_measurement',
    topicId: 'vecto_toa_do',
    topicTitle: 'Vectơ & Phương pháp tọa độ phẳng',
    title: 'Tính tích vô hướng của hai vectơ và ứng dụng tọa độ trong mặt phẳng Oxy',
    description: 'Thực hiện các phép cộng, trừ, tích vô hướng của hai vectơ; góc giữa hai vectơ.',
    learningObjectives: ['Tính tích vô hướng', 'Tính góc giữa hai vectơ', 'Viết phương trình đường thẳng Oxy'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-10-descriptive-stats',
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_statistics_probability',
    topicId: 'thong_ke_mo_ta',
    topicTitle: 'Các số đặc trưng đo xu thế trung tâm và độ phân tán',
    title: 'Tính số trung bình, trung vị, tứ phân vị, phương sai và độ lệch chuẩn',
    description: 'Đánh giá mức độ đồng đều và nhận diện giá trị bất thường trong mẫu số liệu.',
    learningObjectives: ['Tính số trung vị, tứ phân vị', 'Tính phương sai và độ lệch chuẩn'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-10-combinatorics',
    subjectId: 'toan',
    grade: 10,
    domainId: 'math_algebra_analysis',
    topicId: 'dai_so_to_hop',
    topicTitle: 'Đại số tổ hợp & Nhị thức Newton',
    title: 'Vận dụng quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp và khai triển nhị thức Newton',
    description: 'Giải các bài toán đếm sắp xếp, chọn nhóm và khai triển (a + b)^4, (a + b)^5.',
    learningObjectives: ['Phân biệt chỉnh hợp và tổ hợp', 'Khai triển nhị thức Newton bậc 4 và 5'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },

  // --- Grade 11 Math ---
  {
    skillId: 'math-11-trig-functions',
    subjectId: 'toan',
    grade: 11,
    domainId: 'math_algebra_analysis',
    topicId: 'ham_so_luong_giac',
    topicTitle: 'Hàm số lượng giác & Phương trình lượng giác cơ bản',
    title: 'Giải phương trình lượng giác cơ bản và tìm tập giá trị hàm số lượng giác',
    description: 'Xác định chu kì, tính chẵn lẻ của sin/cos/tan và giải sin x = m, cos x = m.',
    learningObjectives: ['Giải phương trình lượng giác cơ bản', 'Tìm tập giá trị hàm lượng giác'],
    prerequisiteSkillIds: ['math-10-trig-triangle'],
    cognitiveLevels: ['recognize', 'understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-11-sequences-progressions',
    subjectId: 'toan',
    grade: 11,
    domainId: 'math_algebra_analysis',
    topicId: 'day_so_cap_so',
    topicTitle: 'Dãy số, Cấp số cộng & Cấp số nhân',
    title: 'Xác định số hạng tổng quát và tổng n số hạng đầu của cấp số cộng, cấp số nhân',
    description: 'Vận dụng công thức un = u1 + (n-1)d, un = u1 * q^(n-1) và các bài toán tăng trưởng.',
    learningObjectives: ['Tìm công sai d và công bội q', 'Tính tổng Sn của cấp số cộng/nhân'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-11-limits-continuity',
    subjectId: 'toan',
    grade: 11,
    domainId: 'math_algebra_analysis',
    topicId: 'gioi_han_ham_so',
    topicTitle: 'Giới hạn dãy số, Giới hạn hàm số & Hàm liên tục',
    title: 'Tính giới hạn hàm số dạng vô định (0/0, vô cùng/vô cùng) và xét tính liên tục',
    description: 'Nền tảng trực tiếp để tiếp cận khái niệm đạo hàm trong giải tích.',
    learningObjectives: ['Khử dạng vô định 0/0', 'Xét tính liên tục tại một điểm'],
    prerequisiteSkillIds: ['math-10-quad-func'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-11-derivatives',
    subjectId: 'toan',
    grade: 11,
    domainId: 'math_algebra_analysis',
    topicId: 'dao_ham',
    topicTitle: 'Đạo hàm & Ý nghĩa hình học của đạo hàm',
    title: 'Tính đạo hàm bằng quy tắc và viết phương trình tiếp tuyến của đồ thị hàm số',
    description: 'Vận dụng quy tắc đạo hàm của tổng, tích, thương, hàm hợp; viết PTTT y - y0 = f\'(x0)(x - x0).',
    learningObjectives: ['Tính đạo hàm hàm hợp', 'Viết phương trình tiếp tuyến tại một điểm'],
    prerequisiteSkillIds: ['math-11-limits-continuity'],
    cognitiveLevels: ['understand', 'apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-11-spatial-geometry',
    subjectId: 'toan',
    grade: 11,
    domainId: 'math_geometry_measurement',
    topicId: 'hinh_hoc_khong_gian_11',
    topicTitle: 'Quan hệ vuông góc & Khoảng cách trong không gian',
    title: 'Xác định góc và khoảng cách giữa đường thẳng và mặt phẳng, giữa hai mặt phẳng',
    description: 'Tính góc giữa hai đường thẳng, đường thẳng và mặt phẳng, góc nhị diện, khoảng cách từ điểm đến mp.',
    learningObjectives: ['Chứng minh đường thẳng vuông góc mặt phẳng', 'Tính khoảng cách từ điểm đến mặt phẳng'],
    prerequisiteSkillIds: ['math-10-trig-triangle'],
    cognitiveLevels: ['understand', 'apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-11-probability',
    subjectId: 'toan',
    grade: 11,
    domainId: 'math_statistics_probability',
    topicId: 'xac_suat_co_dien',
    topicTitle: 'Biến cố hợp, giao & Xác suất có điều kiện cơ bản',
    title: 'Tính xác suất của biến cố bằng định nghĩa cổ điển và quy tắc cộng, nhân xác suất',
    description: 'Xác định không gian mẫu, biến cố độc lập, biến cố xung khắc.',
    learningObjectives: ['Áp dụng quy tắc cộng xác suất', 'Áp dụng quy tắc nhân xác suất biến cố độc lập'],
    prerequisiteSkillIds: ['math-10-combinatorics'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },

  // --- Grade 12 Math ---
  {
    skillId: 'math-12-func-monotonicity',
    subjectId: 'toan',
    grade: 12,
    domainId: 'math_algebra_analysis',
    topicId: 'ung_dung_dao_ham',
    topicTitle: 'Tính đơn điệu của hàm số',
    title: 'Xét tính đồng biến, nghịch biến của hàm số bằng dấu của đạo hàm cấp một',
    description: 'Xác định khoảng đơn điệu và tìm tham số m để hàm số đơn điệu trên khoảng.',
    learningObjectives: ['Lập bảng biến thiên', 'Tìm tham số m để hàm số đơn điệu'],
    prerequisiteSkillIds: ['math-11-derivatives', 'math-10-quad-ineq'],
    cognitiveLevels: ['understand', 'apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-12-func-extrema',
    subjectId: 'toan',
    grade: 12,
    domainId: 'math_algebra_analysis',
    topicId: 'cuc_tri_ham_so',
    topicTitle: 'Cực trị của hàm số & Giá trị lớn nhất, nhỏ nhất',
    title: 'Tìm điểm cực trị và GTLN/GTNN của hàm số trên đoạn hoặc khoảng',
    description: 'Vận dụng định lí Fermat, điều kiện đủ cực trị và giải bài toán tối ưu thực tiễn.',
    learningObjectives: ['Tìm điểm cực đại, cực tiểu', 'Tìm min/max trên đoạn', 'Mô hình hóa bài toán tối ưu'],
    prerequisiteSkillIds: ['math-12-func-monotonicity'],
    cognitiveLevels: ['understand', 'apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-12-func-asymptotes',
    subjectId: 'toan',
    grade: 12,
    domainId: 'math_algebra_analysis',
    topicId: 'duong_tiem_can',
    topicTitle: 'Đường tiệm cận của đồ thị hàm số',
    title: 'Xác định tiệm cận đứng, tiệm cận ngang và tiệm cận xiên của đồ thị hàm số',
    description: 'Sử dụng giới hạn lim f(x) khi x -> vô cùng và x -> x0 để tìm các đường tiệm cận.',
    learningObjectives: ['Tìm tiệm cận đứng và ngang của phân thức', 'Tìm tiệm cận xiên (GDPT 2018)'],
    prerequisiteSkillIds: ['math-11-limits-continuity'],
    cognitiveLevels: ['recognize', 'understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-12-primitives-integrals',
    subjectId: 'toan',
    grade: 12,
    domainId: 'math_algebra_analysis',
    topicId: 'nguyen_ham_tich_phan',
    topicTitle: 'Nguyên hàm & Tích phân',
    title: 'Tìm nguyên hàm và tính tích phân bằng phương pháp đổi biến, từng phần',
    description: 'Vận dụng bảng nguyên hàm cơ bản, tích phân từng phần và tính diện tích hình phẳng.',
    learningObjectives: ['Tính tích phân hàm đa thức, lượng giác, mũ', 'Áp dụng công thức Newton-Leibniz'],
    prerequisiteSkillIds: ['math-11-derivatives'],
    cognitiveLevels: ['understand', 'apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-12-oxyz-geometry',
    subjectId: 'toan',
    grade: 12,
    domainId: 'math_geometry_measurement',
    topicId: 'toa_do_khong_gian_oxyz',
    topicTitle: 'Phương pháp tọa độ trong không gian Oxyz',
    title: 'Viết phương trình mặt phẳng, đường thẳng và mặt cầu trong hệ tọa độ Oxyz',
    description: 'Sử dụng vectơ chỉ phương, vectơ pháp tuyến, tích có hướng để giải bài toán hình không gian.',
    learningObjectives: ['Viết phương trình mặt phẳng', 'Viết phương trình chính tắc/tham số đường thẳng', 'Tìm tâm và bán kính mặt cầu'],
    prerequisiteSkillIds: ['math-10-vectors', 'math-11-spatial-geometry'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'math-12-conditional-probability',
    subjectId: 'toan',
    grade: 12,
    domainId: 'math_statistics_probability',
    topicId: 'xac_suat_co_dieu_kien',
    topicTitle: 'Xác suất có điều kiện & Công thức Bayes',
    title: 'Tính xác suất có điều kiện P(A|B) và áp dụng công thức xác suất toàn phần, công thức Bayes',
    description: 'Giải quyết các bài toán xét nghiệm y khoa, chuẩn đoán kỹ thuật và dự báo rủi ro.',
    learningObjectives: ['Tính xác suất có điều kiện P(A|B)', 'Vận dụng công thức Bayes giải bài toán thực tế'],
    prerequisiteSkillIds: ['math-11-probability'],
    cognitiveLevels: ['understand', 'apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Toán GDPT 2018',
    verificationStatus: 'verified'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // VẬT LÍ (PHYSICS)
  // ═════════════════════════════════════════════════════════════
  // Grade 10 Physics
  {
    skillId: 'phys-10-kinematics',
    subjectId: 'vatli',
    grade: 10,
    domainId: 'phys_mechanics',
    topicId: 'chuyen_dong_bien_doi',
    topicTitle: 'Mô tả chuyển động thẳng biến đổi đều',
    title: 'Vận dụng công thức vận tốc, độ dịch chuyển và gia tốc trong chuyển động thẳng',
    description: 'Phân biệt quãng đường và độ dịch chuyển; đồ thị vận tốc - thời gian.',
    learningObjectives: ['Tính gia tốc a = dv/dt', 'Áp dụng v^2 - v0^2 = 2as'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Vật lí GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'phys-10-dynamics-newton',
    subjectId: 'vatli',
    grade: 10,
    domainId: 'phys_mechanics',
    topicId: 'dinh_luat_newton',
    topicTitle: 'Ba định luật Newton & Các lực cơ bản',
    title: 'Phân tích lực và áp dụng định luật II Newton F = ma cho vật chuyển động',
    description: 'Nhận diện trọng lực, lực ma sát, lực cản và viết phương trình động lực học.',
    learningObjectives: ['Vẽ giản đồ lực tự do', 'Áp dụng định luật II Newton'],
    prerequisiteSkillIds: ['phys-10-kinematics'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Vật lí GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'phys-10-work-energy',
    subjectId: 'vatli',
    grade: 10,
    domainId: 'phys_mechanics',
    topicId: 'nang_luong_cong',
    topicTitle: 'Công, Công suất & Định luật bảo toàn cơ năng',
    title: 'Tính công A = F.s.cos(alpha) và áp dụng bảo toàn cơ năng W = Wd + Wt',
    description: 'Phân tích chuyển hóa năng lượng, công của lực thế và lực không thế.',
    learningObjectives: ['Tính công suất P = A/t', 'Áp dụng bảo toàn cơ năng khi bỏ qua ma sát'],
    prerequisiteSkillIds: ['phys-10-dynamics-newton'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Vật lí GDPT 2018',
    verificationStatus: 'verified'
  },

  // Grade 11 Physics
  {
    skillId: 'phys-11-oscillations',
    subjectId: 'vatli',
    grade: 11,
    domainId: 'phys_oscillations_waves',
    topicId: 'dao_dong_dieu_hoa',
    topicTitle: 'Dao động điều hòa',
    title: 'Phân tích phương trình li độ, vận tốc, gia tốc và năng lượng dao động điều hòa',
    description: 'Vận dụng x = A cos(omega t + phi), mối quan hệ pha giữa x, v, a.',
    learningObjectives: ['Tìm biên độ, tần số góc, pha ban đầu', 'Tính động năng và thế năng dao động'],
    prerequisiteSkillIds: ['phys-10-work-energy'],
    cognitiveLevels: ['recognize', 'understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Vật lí GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'phys-11-waves',
    subjectId: 'vatli',
    grade: 11,
    domainId: 'phys_oscillations_waves',
    topicId: 'song_co_song_anh_sang',
    topicTitle: 'Sóng cơ, Giao thoa sóng & Sóng ánh sáng',
    title: 'Vận dụng công thức bước sóng lambda = v.T và điều kiện cực đại giao thoa d2 - d1 = k lambda',
    description: 'Mô tả hiện tượng sóng dừng và giao thoa ánh sáng qua khe Young.',
    learningObjectives: ['Tính khoảng vân giao thoa', 'Xác định vị trí vân sáng, vân tối'],
    prerequisiteSkillIds: ['phys-11-oscillations'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Vật lí GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'phys-11-electric-field',
    subjectId: 'vatli',
    grade: 11,
    domainId: 'phys_electromagnetism',
    topicId: 'dien_truong',
    topicTitle: 'Điện trường & Thế năng điện',
    title: 'Tính cường độ điện trường E = F/q và điện thế, hiệu điện thế U = E.d',
    description: 'Vận dụng lực Coulomb, đường sức điện và sự chuyển động của điện tích trong điện trường đều.',
    learningObjectives: ['Tính lực điện trường tác dụng lên điện tích', 'Tính công của lực điện A = qEd'],
    prerequisiteSkillIds: ['phys-10-work-energy'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Vật lí GDPT 2018',
    verificationStatus: 'verified'
  },

  // Grade 12 Physics
  {
    skillId: 'phys-12-thermal-gas',
    subjectId: 'vatli',
    grade: 12,
    domainId: 'phys_thermal_nuclear',
    topicId: 'vat_li_nhiet',
    topicTitle: 'Vật lí nhiệt & Mô hình động học phân tử chất khí',
    title: 'Vận dụng định luật I nhiệt động lực học Delta U = A + Q và phương trình Clapeyron pV = nRT',
    description: 'Nội dung cốt lõi của chương trình Vật lí 12 mới (GDPT 2018): mô hình phân tử chất khí, nhiệt dung riêng, nhiệt nóng chảy.',
    learningObjectives: ['Tính nhiệt lượng truyền và công trao đổi', 'Vận dụng phương trình trạng thái khí lý tưởng pV = nRT'],
    prerequisiteSkillIds: ['phys-10-work-energy'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Vật lí GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'phys-12-magnetic-induction',
    subjectId: 'vatli',
    grade: 12,
    domainId: 'phys_electromagnetism',
    topicId: 'tu_truong_cam_ung',
    topicTitle: 'Từ trường & Cảm ứng điện từ',
    title: 'Tính lực từ tác dụng lên đoạn dây dẫn và suất điện động cảm ứng e_c = - dPhi/dt',
    description: 'Quy tắc bàn tay trái, định luật Faraday và định luật Lenz xác định chiều dòng điện cảm ứng.',
    learningObjectives: ['Tính lực từ F = B.I.L.sin(alpha)', 'Áp dụng định luật cảm ứng điện từ Faraday'],
    prerequisiteSkillIds: ['phys-11-electric-field'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Vật lí GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'phys-12-nuclear-physics',
    subjectId: 'vatli',
    grade: 12,
    domainId: 'phys_thermal_nuclear',
    topicId: 'vat_li_hat_nhan',
    topicTitle: 'Vật lí hạt nhân & Phóng xạ',
    title: 'Tính độ hụt khối, năng lượng liên kết E = mc^2 và áp dụng định luật phóng xạ',
    description: 'Phân biệt phân rã alpha, beta, gamma; bảo toàn số khối và bảo toàn điện tích trong phản ứng hạt nhân.',
    learningObjectives: ['Tính năng lượng liên kết riêng', 'Vận dụng công thức chu kì bán rã N(t) = N0 * 2^(-t/T)'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Vật lí GDPT 2018',
    verificationStatus: 'verified'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // HÓA HỌC (CHEMISTRY)
  // ═════════════════════════════════════════════════════════════
  // Grade 10 Chemistry
  {
    skillId: 'chem-10-atomic-periodic',
    subjectId: 'hoahoc',
    grade: 10,
    domainId: 'chem_general_physical',
    topicId: 'nguyen_tu_bang_tuan_hoan',
    topicTitle: 'Cấu tạo nguyên tử & Bảng tuần hoàn các nguyên tố',
    title: 'Viết cấu hình electron và suy ra vị trí, tính chất của nguyên tố trong bảng tuần hoàn',
    description: 'Xác định số hạt p, n, e; electron hóa trị; quy luật biến đổi bán kính nguyên tử và độ âm điện.',
    learningObjectives: ['Viết cấu hình e nguyên tử (Z <= 30)', 'Dự đoán tính kim loại/phi kim theo bảng tuần hoàn'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'chem-10-redox-reactions',
    subjectId: 'hoahoc',
    grade: 10,
    domainId: 'chem_general_physical',
    topicId: 'phan_ung_oxi_hoa_khu',
    topicTitle: 'Phản ứng oxi hóa - khử',
    title: 'Cân bằng phản ứng oxi hóa - khử bằng phương pháp thăng bằng electron',
    description: 'Xác định số oxi hóa, chất oxi hóa, chất khử, quá trình oxi hóa và quá trình khử.',
    learningObjectives: ['Xác định số oxi hóa nguyên tố', 'Cân bằng phản ứng oxi hóa khử'],
    prerequisiteSkillIds: ['chem-10-atomic-periodic'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'chem-10-thermochemistry',
    subjectId: 'hoahoc',
    grade: 10,
    domainId: 'chem_general_physical',
    topicId: 'nhiet_hoa_hoc',
    topicTitle: 'Năng lượng hóa học & Enthalpy tạo thành',
    title: 'Tính biến thiên enthalpy phản ứng Delta_r_H từ nhiệt tạo thành hoặc năng lượng liên kết',
    description: 'Phân biệt phản ứng tỏa nhiệt (Delta H < 0) và thu nhiệt (Delta H > 0).',
    learningObjectives: ['Tính Delta_r_H_298 từ enthalpy tạo thành', 'Tính Delta_r_H_298 từ năng lượng liên kết Eb'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },

  // Grade 11 Chemistry
  {
    skillId: 'chem-11-equilibrium',
    subjectId: 'hoahoc',
    grade: 11,
    domainId: 'chem_solutions_inorganic',
    topicId: 'can_bang_hoa_hoc',
    topicTitle: 'Cân bằng hóa học & Thuyết Brønsted-Lowry',
    title: 'Vận dụng nguyên lí Le Chatelier chuyển dịch cân bằng và tính pH của dung dịch acid/base',
    description: 'Biểu thức hằng số cân bằng Kc, ảnh hưởng của nhiệt độ, nồng độ, áp suất.',
    learningObjectives: ['Dự đoán chiều chuyển dịch cân bằng theo Le Chatelier', 'Tính pH dung dịch acid mạnh và base mạnh'],
    prerequisiteSkillIds: ['chem-10-thermochemistry'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'chem-11-hydrocarbons',
    subjectId: 'hoahoc',
    grade: 11,
    domainId: 'chem_organic',
    topicId: 'hydrocarbon',
    topicTitle: 'Alkane, Alkene, Alkyne & Arene',
    title: 'Viết công thức cấu tạo, gọi tên và phân tích phản ứng thế, cộng của hydrocarbon',
    description: 'Đồng phân cấu tạo, quy tắc Markovnikov, phản ứng brom hóa và trùng hợp alkene.',
    learningObjectives: ['Áp dụng quy tắc cộng Markovnikov', 'Phân biệt alkane, alkene, alkyne bằng thuốc thử'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'chem-11-derivatives-alcohols',
    subjectId: 'hoahoc',
    grade: 11,
    domainId: 'chem_organic',
    topicId: 'dan_xuat_alcohol_phenol',
    topicTitle: 'Dẫn xuất halogen, Alcohol & Phenol',
    title: 'Dự đoán tính chất hóa học của nhóm chức -OH alcohol và vòng benzene phenol',
    description: 'Phản ứng thế H linh động của alcohol với Na, phản ứng tách nước tạo ether hoặc alkene, tính acid yếu của phenol.',
    learningObjectives: ['Viết phương trình alcohol tác dụng Na, Cu(OH)2', 'So sánh tính acid của phenol và alcohol'],
    prerequisiteSkillIds: ['chem-11-hydrocarbons'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },

  // Grade 12 Chemistry
  {
    skillId: 'chem-12-esters-lipids',
    subjectId: 'hoahoc',
    grade: 12,
    domainId: 'chem_organic',
    topicId: 'ester_lipid',
    topicTitle: 'Ester & Chất béo (Lipid)',
    title: 'Viết phản ứng thủy phân ester, xà phòng hóa triglyceride và bài toán tính khối lượng xà phòng',
    description: 'Cấu tạo nhóm ester -COO-, phản ứng thuận nghịch trong acid, phản ứng một chiều trong kiềm.',
    learningObjectives: ['Viết phản ứng xà phòng hóa chất béo', 'Tính chỉ số xà phòng hóa và khối lượng muối tạo thành'],
    prerequisiteSkillIds: ['chem-11-derivatives-alcohols'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'chem-12-carbohydrates',
    subjectId: 'hoahoc',
    grade: 12,
    domainId: 'chem_organic',
    topicId: 'carbohydrate',
    topicTitle: 'Carbohydrate (Glucose, Fructose, Saccharose, Tinh bột, Cellulose)',
    title: 'Phân loại carbohydrate và giải thích các phản ứng tráng bạc, thủy phân, tác dụng Cu(OH)2',
    description: 'Cấu tạo mạch hở/mạch vòng của monosaccharide; tính chất của disaccharide và polysaccharide.',
    learningObjectives: ['Phân biệt glucose và fructose', 'Viết phản ứng thủy phân tinh bột và cellulose'],
    prerequisiteSkillIds: ['chem-12-esters-lipids'],
    cognitiveLevels: ['recognize', 'understand'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'chem-12-amines-proteins',
    subjectId: 'hoahoc',
    grade: 12,
    domainId: 'chem_organic',
    topicId: 'amine_amino_acid',
    topicTitle: 'Amine, Amino acid, Peptide & Protein',
    title: 'Phân tích tính lưỡng tính của amino acid và phản ứng màu biuret của peptide',
    description: 'Bậc của amine, tính base của amine, điểm đẳng điện, liên kết peptide -CO-NH-.',
    learningObjectives: ['Chứng minh tính lưỡng tính của amino acid', 'Đếm số liên kết peptide trong chuỗi oligopeptide'],
    prerequisiteSkillIds: ['chem-11-derivatives-alcohols'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'chem-12-metals-complexes',
    subjectId: 'hoahoc',
    grade: 12,
    domainId: 'chem_solutions_inorganic',
    topicId: 'kim_loai_phuc_chat',
    topicTitle: 'Đại cương kim loại, Dãy thế điện cực chuẩn & Phức chất',
    title: 'So sánh tính khử của kim loại theo thế điện cực chuẩn E0 và gọi tên phức chất cơ bản',
    description: 'Quy tắc alpha, phản ứng của kim loại với ion kim loại khác, cấu tạo phối tử và nguyên tử trung tâm.',
    learningObjectives: ['Vận dụng dãy thế điện cực chuẩn E0(M^n+/M)', 'Nhận diện nguyên tử trung tâm và phối tử trong phức chất'],
    prerequisiteSkillIds: ['chem-10-redox-reactions'],
    cognitiveLevels: ['understand', 'apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Hóa học GDPT 2018',
    verificationStatus: 'verified'
  },

  // ═════════════════════════════════════════════════════════════════════════
  // TIẾNG ANH (ENGLISH)
  // ═════════════════════════════════════════════════════════════
  // Grade 10 English
  {
    skillId: 'eng-10-phonetics',
    subjectId: 'tienganh',
    grade: 10,
    domainId: 'eng_phonetics_lexicogrammar',
    topicId: 'phonetics_10',
    topicTitle: 'Phonetics: Stress Patterns & Pronunciation',
    title: 'Identify two-syllable word stress patterns and vowel sound contrasts',
    description: 'Phát hiện quy tắc trọng âm từ 2 âm tiết (danh từ/động từ) và phân biệt nguyên âm đơn/đôi.',
    learningObjectives: ['Identify stress on nouns vs verbs', 'Recognize silent consonants and vowel contrasts'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['recognize', 'understand'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Tiếng Anh GDPT 2018 (Thông tư 32/2018/TT-BGDĐT)',
    verificationStatus: 'verified'
  },
  {
    skillId: 'eng-10-verb-tenses',
    subjectId: 'tienganh',
    grade: 10,
    domainId: 'eng_phonetics_lexicogrammar',
    topicId: 'verb_tenses_10',
    topicTitle: 'Verb Tenses: Past Simple, Present Perfect & Continuous Aspects',
    title: 'Apply correct verb tenses with contextual time markers',
    description: 'Sử dụng chuẩn xác thì Quá khứ đơn, Hiện tại hoàn thành và Hiện tại tiếp diễn.',
    learningObjectives: ['Contrast Past Simple vs Present Perfect', 'Use since/for and time clauses'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Tiếng Anh GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'eng-10-relative-clauses',
    subjectId: 'tienganh',
    grade: 10,
    domainId: 'eng_phonetics_lexicogrammar',
    topicId: 'relative_clauses_10',
    topicTitle: 'Defining & Non-defining Relative Clauses',
    title: 'Combine sentences using relative pronouns who, whom, which, that, whose',
    description: 'Phân biệt mệnh đề quan hệ xác định và không xác định, giản lược mệnh đề quan hệ.',
    learningObjectives: ['Choose correct relative pronoun', 'Punctuate non-defining relative clauses correctly'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Tiếng Anh GDPT 2018',
    verificationStatus: 'verified'
  },

  // Grade 11 English
  {
    skillId: 'eng-11-modals-gerunds',
    subjectId: 'tienganh',
    grade: 11,
    domainId: 'eng_phonetics_lexicogrammar',
    topicId: 'modals_gerunds_11',
    topicTitle: 'Modal Verbs, Gerunds & Infinitives',
    title: 'Use modal verbs for deduction and distinguish gerunds vs to-infinitives',
    description: 'Sử dụng must/can\'t have V3/ed cho suy đoán quá khứ; động từ theo sau bởi V-ing hoặc to V.',
    learningObjectives: ['Express past deduction with modal perfect', 'Identify verbs followed by gerund vs to-infinitive'],
    prerequisiteSkillIds: ['eng-10-verb-tenses'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Tiếng Anh GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'eng-11-reading-inference',
    subjectId: 'tienganh',
    grade: 11,
    domainId: 'eng_reading_comprehension',
    topicId: 'reading_inference_11',
    topicTitle: 'Reading Comprehension: Inference & Reference',
    title: 'Infer author attitude, implied meaning and resolve pronoun references in text',
    description: 'Kỹ năng đọc hiểu mức độ thông hiểu và vận dụng: suy luận ngụ ý, xác định từ đồng nghĩa/trái nghĩa.',
    learningObjectives: ['Determine contextual meaning of unfamiliar words', 'Draw valid inferences from expository texts'],
    prerequisiteSkillIds: [],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Tiếng Anh GDPT 2018',
    verificationStatus: 'verified'
  },

  // Grade 12 English
  {
    skillId: 'eng-12-conditionals-inversion',
    subjectId: 'tienganh',
    grade: 12,
    domainId: 'eng_phonetics_lexicogrammar',
    topicId: 'conditionals_inversion_12',
    topicTitle: 'Conditionals, Mixed Conditionals & Inversions',
    title: 'Construct conditional sentences and apply grammatical inversion for emphasis',
    description: 'Câu điều kiện loại 1, 2, 3, điều kiện hỗn hợp; đảo ngữ với Not only, Hardly, Rarely, Under no circumstances.',
    learningObjectives: ['Formulate mixed conditional sentences', 'Apply inversion rules after negative adverbials'],
    prerequisiteSkillIds: ['eng-10-verb-tenses', 'eng-11-modals-gerunds'],
    cognitiveLevels: ['understand', 'apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Tiếng Anh GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'eng-12-discourse-cloze',
    subjectId: 'tienganh',
    grade: 12,
    domainId: 'eng_functional_communication',
    topicId: 'cloze_discourse_12',
    topicTitle: 'Discourse Markers & Guided Cloze Passage',
    title: 'Select appropriate transitional connectors and collocations in passage cloze tests',
    description: 'Điền từ đoạn văn học thuật: liên từ nối (conjunctions), giới từ cố định, cụm từ cố định (collocations).',
    learningObjectives: ['Select logical transition words (however, moreover, on the contrary)', 'Identify high-frequency academic collocations'],
    prerequisiteSkillIds: ['eng-11-reading-inference'],
    cognitiveLevels: ['understand', 'apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Tiếng Anh GDPT 2018',
    verificationStatus: 'verified'
  },
  {
    skillId: 'eng-12-reading-synthesis',
    subjectId: 'tienganh',
    grade: 12,
    domainId: 'eng_reading_comprehension',
    topicId: 'reading_synthesis_12',
    topicTitle: 'Academic Reading Synthesis & Global Main Idea',
    title: 'Synthesize complex information and evaluate author argumentative purpose in academic passages',
    description: 'Dạng bài đọc hiểu 7-8 câu của đề thi tốt nghiệp THPT: tiêu đề bài đọc, chi tiết không được đề cập, suy luận tổng quát.',
    learningObjectives: ['Synthesize multi-paragraph arguments', 'Identify statements NOT true according to text'],
    prerequisiteSkillIds: ['eng-11-reading-inference'],
    cognitiveLevels: ['apply', 'high_apply'],
    curriculumVersion: 'GDPT2018',
    curriculumSource: 'Chương trình môn Tiếng Anh GDPT 2018',
    verificationStatus: 'verified'
  }
];

module.exports = {
  CURRICULUM_DOMAINS,
  CURRICULUM_SKILLS
};
