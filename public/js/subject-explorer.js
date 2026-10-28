/**
 * Subject Explorer Module (4 Core GDPT 2018 Subjects)
 * Toán học, Vật lí, Hóa học, Tiếng Anh across Grades 10, 11, 12
 */

const SubjectExplorer = {
  currentGrade: 10,

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

  render() {
    const container = document.getElementById('screen-subjects');
    if (!container) return;

    const subjectsData = app.subjectsData || { subjects: [], grades: [10, 11, 12] };
    const allSubjects = subjectsData.subjects || [];

    // Filter by selected grade
    const gradeSubjects = allSubjects.filter(s => s.grade === this.currentGrade);

    container.innerHTML = `
      <div class="explorer-wrapper">
        <div class="explorer-header">
          <div>
            <h1 class="explorer-title">Khám phá Môn Học GDPT 2018</h1>
            <p class="explorer-subtitle">
              Hệ thống môn học bám sát cấu trúc đề thi Quyết định 764/QĐ-BGDĐT: Toán học, Vật lí, Hóa học, Tiếng Anh và Lịch sử.
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

        <div class="subject-section-label">
          <span>DANH SÁCH MÔN HỌC — KHỐI LỚP ${this.currentGrade}</span>
        </div>

        <div class="subjects-cards-grid">
          ${gradeSubjects.map(s => this.renderSubjectCard(s)).join('')}
        </div>
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
            ${(typeof Icons !== 'undefined') ? (subject.id?.includes('vatli') ? Icons.get('zap', { size: 24 }) : subject.id?.includes('hoahoc') ? Icons.get('flask-conical', { size: 24 }) : subject.id?.includes('anh') ? Icons.get('globe', { size: 24 }) : subject.id?.includes('toan') ? Icons.get('ruler', { size: 24 }) : Icons.get('book-open', { size: 24 })) : ''}
          </div>
          <div class="card-status-badge">
            ${isReady ? `
              <span class="badge badge-success">● Sẵn sàng luyện tập</span>
            ` : `
              <span class="badge badge-warning">${typeof Icons !== 'undefined' ? Icons.get('clock', { size: 14 }) + ' ' : ''}Đang biên soạn</span>
            `}
          </div>
        </div>

        <div class="card-content">
          <h3 class="sub-card-title">${subject.name}</h3>
          <p class="sub-card-desc">${subject.description}</p>
        </div>

        <div class="card-meta">
          <div class="meta-row">
            <span class="meta-label">Định dạng QĐ 764:</span>
            <span class="meta-value">${formatTags.join(' • ') || 'Chuẩn GDPT 2018'}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Thời gian làm bài:</span>
            <span class="meta-value font-medium">${structure.durationMinutes || 50} phút</span>
          </div>
          ${isReady ? `
            <div class="meta-row">
              <span class="meta-label">Ngân hàng câu hỏi:</span>
              <span class="meta-value font-medium" style="color: var(--brand-primary);">${subject.questionCount || 0} câu hỏi</span>
            </div>
          ` : ''}
        </div>

        <div class="card-footer">
          ${isReady ? `
            <button class="btn btn-primary btn-block" onclick="app.selectSubject('${subject.id}')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Vào phòng ôn tập
            </button>
          ` : `
            <button class="btn btn-outline btn-block" onclick="SubjectExplorer.showPendingSubjectInfo('${subject.id}')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg> Xem lộ trình &amp; Cấu trúc đề
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
- Phần I: ${str.mcq || 12} câu trắc nghiệm nhiều lựa chọn
- Phần II: ${str.tf || 4} câu trắc nghiệm Đúng/Sai
- Phần III: ${str.sa || 6} câu trắc nghiệm trả lời ngắn
- Thời gian làm bài: ${str.durationMinutes || 50} phút

Trạng thái:
Ngân hàng câu hỏi cho ${sub.name} đang được ban chuyên môn biên soạn. Bạn có thể trải nghiệm các môn Lớp 10 đã sẵn sàng (Toán học 10, Vật lí 10, Hóa học 10, Tiếng Anh 10)!
    `.trim();

    alert(infoText);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubjectExplorer;
}
