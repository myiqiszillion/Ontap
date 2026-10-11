/**
 * Subject Explorer Module
 * Explores 4 core subjects (Math, Physics, Chemistry, English) across Grades 10, 11, 12
 * and preserves legacy active subjects with honest readiness status
 */

const SubjectExplorer = {
  currentGrade: 10,
  activeFilter: 'all', // 'all' | 'target' | 'legacy'

  init() {
    const profile = ProfileStore.getProfile();
    if (profile && profile.grade) {
      this.currentGrade = profile.grade;
    }
  },

  setGrade(grade) {
    this.currentGrade = grade;
    this.render();
  },

  setFilter(filter) {
    this.activeFilter = filter;
    this.render();
  },

  render() {
    const container = document.getElementById('screen-subjects');
    if (!container) return;

    const subjectsData = app.subjectsData || { subjects: [], grades: [10, 11, 12] };
    const allSubjects = subjectsData.subjects || [];

    // Filter by selected grade
    let gradeSubjects = allSubjects.filter(s => s.grade === this.currentGrade);

    if (this.activeFilter === 'target') {
      gradeSubjects = gradeSubjects.filter(s => !s.isLegacy);
    } else if (this.activeFilter === 'legacy') {
      gradeSubjects = gradeSubjects.filter(s => s.isLegacy);
    }

    // Separate target core subjects vs active legacy
    const targetCore = gradeSubjects.filter(s => !s.isLegacy);
    const legacyActive = gradeSubjects.filter(s => s.isLegacy);

    container.innerHTML = `
      <div class="explorer-wrapper">
        <div class="explorer-header">
          <div>
            <h1 class="explorer-title">Khám phá Môn học GDPT 2018</h1>
            <p class="explorer-subtitle">
              Trọng tâm 4 môn Toán, Vật lí, Hóa học, Tiếng Anh và các ngân hàng câu hỏi Lịch sử, Sinh học, Tin học đang hoạt động.
            </p>
          </div>
          <div class="grade-pill-group" role="tablist" aria-label="Chọn khối lớp">
            ${[10, 11, 12].map(g => `
              <button class="grade-pill ${g === this.currentGrade ? 'active' : ''}"
                      role="tab"
                      aria-selected="${g === this.currentGrade}"
                      onclick="SubjectExplorer.setGrade(${g})">
                Lớp ${g}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Filter Sub-tabs -->
        <div class="explorer-subtabs">
          <button class="subtab ${this.activeFilter === 'all' ? 'active' : ''}" onclick="SubjectExplorer.setFilter('all')">
            Tất cả môn (${gradeSubjects.length})
          </button>
          <button class="subtab ${this.activeFilter === 'target' ? 'active' : ''}" onclick="SubjectExplorer.setFilter('target')">
            4 Môn trọng tâm mới (${targetCore.length})
          </button>
          ${legacyActive.length > 0 ? `
            <button class="subtab ${this.activeFilter === 'legacy' ? 'active' : ''}" onclick="SubjectExplorer.setFilter('legacy')">
              Ngân hàng sẵn sàng (${legacyActive.length})
            </button>
          ` : ''}
        </div>

        <!-- Core 4 Targets Grid -->
        <div class="subject-section-label">
          <span>4 MÔN TRỌNG TÂM — CHƯƠNG TRÌNH GDPT 2018</span>
        </div>

        <div class="subjects-cards-grid">
          ${targetCore.map(s => this.renderSubjectCard(s)).join('')}
        </div>

        ${legacyActive.length > 0 ? `
          <div class="subject-section-label legacy-label" style="margin-top: 36px;">
            <span>NGÂN HÀNG CÂU HỎI ĐANG HOẠT ĐỘNG (LỚP ${this.currentGrade})</span>
          </div>
          <div class="subjects-cards-grid">
            ${legacyActive.map(s => this.renderSubjectCard(s)).join('')}
          </div>
        ` : ''}
      </div>
    `;
  },

  renderSubjectCard(subject) {
    const isReady = subject.ready === true;
    const structure = subject.examStructure || {};
    const formatTags = [];
    if (structure.mcq) formatTags.push(`${structure.mcq} Trắc nghiệm`);
    if (structure.tf) formatTags.push(`${structure.tf} Đúng/Sai`);
    if (structure.sa) formatTags.push(`${structure.sa} Trả lời ngắn`);

    return `
      <div class="subject-card-item ${isReady ? 'is-ready' : 'is-pending'}"
           style="--sub-color: ${subject.color || '#3b82f6'};">
        <div class="card-top">
          <div class="sub-icon-box" style="background: ${subject.color}15; color: ${subject.color};">
            ${subject.icon || '📖'}
          </div>
          <div class="card-status-badge">
            ${isReady ? `
              <span class="badge badge-success">● Sẵn sàng luyện tập</span>
            ` : `
              <span class="badge badge-warning">⏳ Đang biên soạn</span>
            `}
          </div>
        </div>

        <div class="card-content">
          <h3 class="sub-card-title">${subject.name}</h3>
          <p class="sub-card-desc">${subject.description}</p>
        </div>

        <div class="card-meta">
          ${isReady ? `
            <div class="meta-row">
              <span class="meta-label">Ngân hàng câu hỏi:</span>
              <span class="meta-value font-medium">${subject.questionCount || 100}+ câu</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Chế độ thi:</span>
              <span class="meta-value">Thi thử, Học & Đọc, Flashcard, Luyện tập</span>
            </div>
          ` : `
            <div class="meta-row">
              <span class="meta-label">Định dạng QĐ 764:</span>
              <span class="meta-value">${formatTags.join(' • ') || 'Chuẩn GDPT 2018'}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Thời gian làm bài:</span>
              <span class="meta-value font-medium">${structure.durationMinutes || 50} phút</span>
            </div>
          `}
        </div>

        <div class="card-footer">
          ${isReady ? `
            <button class="btn btn-primary btn-block" onclick="app.selectSubject('${subject.id}')">
              🚀 Vào phòng ôn tập
            </button>
          ` : `
            <button class="btn btn-outline btn-block" onclick="SubjectExplorer.showPendingSubjectInfo('${subject.id}')">
              ℹ️ Xem lộ trình & Cấu trúc đề
            </button>
          `}
        </div>
      </div>
    `;
  },

  showPendingSubjectInfo(subjectId) {
    const subjectsData = app.subjectsData || { subjects: [] };
    const sub = (subjectsData.subjects || []).find(s => s.id === subjectId);
    if (!sub) return;

    const str = sub.examStructure || {};
    const infoText = `
Môn: ${sub.name} (Chương trình GDPT 2018)
Khối lớp: Lớp ${sub.grade}

Định dạng đề thi chuẩn theo Quyết định 764/QĐ-BGDĐT:
- Phần I: ${str.mcq || 12} câu trắc nghiệm nhiều lựa chọn (4 phương án)
- Phần II: ${str.tf || 4} câu trắc nghiệm Đúng/Sai (mỗi câu 4 ý a, b, c, d)
- Phần III: ${str.sa || 6} câu trắc nghiệm trả lời ngắn (điền kết quả)
- Thời gian làm bài: ${str.durationMinutes || 50} phút

Trạng thái hiện tại:
Ngân hàng câu hỏi của môn này đang được rà soát và chuẩn hóa dữ liệu. Để đảm bảo tính chính xác sư phạm, NTMK không ghép dữ liệu của môn khác vào môn này. Bạn có thể ôn luyện các môn Lịch sử 10, Sinh học 10, Tin học 10 đang có sẵn trong hệ thống!
    `.trim();

    alert(infoText);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubjectExplorer;
}
