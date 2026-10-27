/**
 * Student Dashboard View Module
 * Renders authentic student metrics, personalized greetings, and learning status
 */

const DashboardView = {
  render() {
    const container = document.getElementById('screen-dashboard');
    if (!container) return;

    const profile = ProfileStore.getProfile() || {
      grade: 10,
      targetSubjects: ['toan'],
      goal: 'score_8_plus'
    };

    const metrics = ProfileStore.getMetrics();
    const history = ProfileStore.getHistory();
    const goalMeta = ProfileStore.GOAL_META[profile.goal] || ProfileStore.GOAL_META.score_8_plus;

    const subjectNamesMap = {
      toan: 'Toán học',
      vatli: 'Vật lí',
      hoahoc: 'Hóa học',
      tienganh: 'Tiếng Anh',
      lichsu: 'Lịch sử'
    };

    const targetSubjectBadges = (profile.targetSubjects || [])
      .map(k => `<span class="badge badge-primary">${subjectNamesMap[k] || k}</span>`)
      .join(' ');

    container.innerHTML = `
      <div class="dashboard-wrapper">
        <!-- Personalized Welcome Banner -->
        <div class="dashboard-hero-card">
          <div class="hero-left">
            <div class="hero-greeting">
              <span class="hero-tag">Học sinh Lớp ${profile.grade}</span>
              <h1 class="hero-title">Xin chào! Sẵn sàng chinh phục mục tiêu hôm nay?</h1>
              <p class="hero-subtitle">Mục tiêu hiện tại: <strong>${goalMeta.icon} ${goalMeta.title}</strong></p>
            </div>
            <div class="hero-target-subjects">
              <span class="label-text">Môn trọng tâm:</span>
              ${targetSubjectBadges}
            </div>
          </div>
          <div class="hero-actions">
            <button class="btn btn-primary" onclick="app.navigateTo('planner')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span>Kế hoạch học tập</span>
            </button>
            <button class="btn btn-outline" onclick="app.navigateTo('diagnostic')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              <span>Đánh giá năng lực</span>
            </button>
            <button class="btn btn-outline" onclick="app.navigateTo('subjects')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span>Chọn môn học</span>
            </button>
            <button class="btn btn-outline" style="border-color: #f59e0b; color: #f59e0b;" onclick="app.navigateTo('checker')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span>Dò trắc nghiệm</span>
            </button>
            <button class="btn btn-outline" style="border-color: #d97706; color: #d97706;" onclick="app.navigateTo('custom-exam')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              <span>Tự tạo đề thi</span>
            </button>
            <button class="btn btn-outline" style="border-color: #dc2626; color: #dc2626;" onclick="app.navigateTo('mistakes')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
              <span>Sổ tay câu sai</span>
            </button>
            <button class="btn btn-outline" onclick="app.startOnboarding(true)">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/></svg>
              <span>Đổi mục tiêu</span>
            </button>
          </div>

        </div>

        <!-- History & GDPT 2018 Featured Banner -->
        <div class="history-feature-banner" style="background: linear-gradient(135deg, rgba(225,29,72,0.1), rgba(245,158,11,0.1)); border: 1.5px solid rgba(245,158,11,0.3); border-radius: var(--radius); padding: 22px 26px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;">
          <div style="flex: 1; min-width: 280px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
              <span style="background: #e11d48; color: #fff; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">Mới cập nhật</span>
              <span style="color: #f59e0b; font-weight: 700; font-size: 0.85rem;">Trọn bộ Đề Ôn Lịch Sử GDPT 2018</span>
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">Lịch sử 11 &amp; Lịch sử 10 — Trắc nghiệm nhiều lựa chọn &amp; Đúng/Sai</h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">Đầy đủ 4 bài Lịch sử 11 (80 câu TN + 16 bài Đ/S) &amp; 6 bài Lịch sử 10 (183 câu TN + 36 bài Đ/S) kèm lời giải chi tiết và công cụ dò đáp án nhanh.</p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="app.selectSubject('lichsu11')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
              <span>Ôn Lịch sử 11</span>
            </button>
            <button class="btn btn-outline" onclick="app.selectSubject('lichsu10')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
              <span>Ôn Lịch sử 10</span>
            </button>
            <button class="btn btn-outline" style="border-color: #f59e0b; color: #f59e0b;" onclick="Checker.init('lichsu11'); app.navigateTo('checker');">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span>Dò đáp án</span>
            </button>
          </div>
        </div>

        <!-- Real Metrics Section (No Fake Data) -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">
              <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
            </div>
            <div class="metric-info">
              <div class="metric-value">${metrics.totalSessions}</div>
              <div class="metric-label">Bài thi đã hoàn thành</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">
              <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
            </div>
            <div class="metric-info">
              <div class="metric-value">${metrics.averagePercentage !== null ? metrics.averagePercentage + '%' : '--'}</div>
              <div class="metric-label">Điểm trung bình thực tế</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">
              <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="metric-info">
              <div class="metric-value">${metrics.totalTimeMinutes} <small>phút</small></div>
              <div class="metric-label">Thời gian đã ôn luyện</div>
            </div>
          </div>

          <div class="metric-card" onclick="app.navigateTo('mistakes')" style="cursor: pointer;" title="Xem chi tiết các câu sai cần phục hồi">
            <div class="metric-icon">
              <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
            </div>
            <div class="metric-info">
              <div class="metric-value" style="color: #dc2626;">${typeof MistakeStore !== 'undefined' ? MistakeStore.getActiveCount() : 0}</div>
              <div class="metric-label">Câu sai cần phục hồi</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">
              <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            </div>
            <div class="metric-info">
              <div class="metric-value">${metrics.hasActivity ? 'Đang kích hoạt' : 'Khởi động'}</div>
              <div class="metric-label">Trạng thái học tập</div>
            </div>
          </div>
        </div>

        <!-- Recent Activity or Clean Empty State -->
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">Nhật ký làm bài gần đây</h2>
            <span class="section-hint">Dữ liệu thực tế từ các phiên ôn tập trên thiết bị của bạn</span>
          </div>

          ${metrics.hasActivity ? `
            <div class="history-list">
              ${history.slice(0, 5).map(item => {
                const dateStr = new Date(item.timestamp).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                });
                const isPass = item.percentage >= 50;
                return `
                  <div class="history-item">
                    <div class="history-badge ${isPass ? 'pass' : 'fail'}">${item.percentage}%</div>
                    <div class="history-info">
                      <div class="history-title">${item.subjectName} (${item.score}/${item.total} câu)</div>
                      <div class="history-date">${dateStr} • Chế độ: ${item.mode}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="empty-state-card">
              <div class="empty-state-icon">🌱</div>
              <h3 class="empty-state-title">Chưa có bài thi nào được ghi nhận</h3>
              <p class="empty-state-desc">
                Bạn chưa hoàn thành bài thi nào. Hãy bắt đầu ôn tập một môn học bên dưới để hệ thống ghi nhận kết quả và xây dựng biểu đồ năng lực chính xác.
              </p>
              <button class="btn btn-primary" onclick="app.navigateTo('subjects')">
                Khám phá môn học ngay
              </button>
            </div>
          `}
        </div>

        <!-- Intelligent Learning Journey / Future Roadmaps (Honest Status) -->
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">Lộ trình học tập thông minh (Adaptive Roadmap)</h2>
            <span class="section-hint">Hệ thống đang được nâng cấp theo lộ trình chuẩn EdTech GDPT 2018</span>
          </div>

          <div class="roadmap-grid">
            <div class="roadmap-card" onclick="DashboardView.showRoadmapModal('diagnostic')">
              <div class="roadmap-status">
                <span class="badge badge-warning">Giai đoạn 2 • Sắp ra mắt</span>
              </div>
              <div class="roadmap-icon">🧭</div>
              <h3 class="roadmap-title">Diagnostic Assessment</h3>
              <p class="roadmap-desc">Bài đánh giá năng lực đầu vào 15 câu giúp chẩn đoán chính xác lỗ hổng kiến thức.</p>
            </div>

            <div class="roadmap-card" onclick="DashboardView.showRoadmapModal('analytics')">
              <div class="roadmap-status">
                <span class="badge badge-warning">Giai đoạn 2 • Sắp ra mắt</span>
              </div>
              <div class="roadmap-icon">📊</div>
              <h3 class="roadmap-title">Skill Knowledge Graph</h3>
              <p class="roadmap-desc">Bản đồ cây kỹ năng và tỷ lệ thành thạo từng chuyên đề theo chuẩn GDPT 2018.</p>
            </div>

            <div class="roadmap-card" onclick="DashboardView.showRoadmapModal('plan')">
              <div class="roadmap-status">
                <span class="badge badge-subtle">Giai đoạn 3 • Dự kiến</span>
              </div>
              <div class="roadmap-icon">📅</div>
              <h3 class="roadmap-title">Personalized Study Plan</h3>
              <p class="roadmap-desc">Kế hoạch ôn tập cá nhân hóa tự động điều chỉnh nhiệm vụ mỗi ngày bám sát mục tiêu.</p>
            </div>

            <div class="roadmap-card" onclick="DashboardView.showRoadmapModal('adaptive')">
              <div class="roadmap-status">
                <span class="badge badge-subtle">Giai đoạn 3 • Dự kiến</span>
              </div>
              <div class="roadmap-icon">⚡</div>
              <h3 class="roadmap-title">Adaptive Practice</h3>
              <p class="roadmap-desc">Luyện tập thích ứng với thuật toán Spaced Repetition tự động lặp lại dạng bài hay sai.</p>
            </div>
          </div>
        </div>

        <!-- Community Section -->
        <div class="community-banner-card">
          <div class="comm-left">
            <div class="comm-icon">💬</div>
            <div>
              <h3 class="comm-title">Tham gia cộng đồng học tập THPT Miki</h3>
              <p class="comm-desc">Giao lưu hỏi bài, chia sẻ đề thi và tham gia phòng học tập trực tuyến cùng bạn bè.</p>
            </div>
          </div>
          <a href="https://discord.gg/X9H3FkUryB" target="_blank" rel="noopener" class="btn btn-teal">
            Gia nhập Discord
          </a>
        </div>
      </div>
    `;
  },

  showRoadmapModal(featureKey) {
    const details = {
      diagnostic: {
        title: 'Diagnostic Assessment (Đánh giá chẩn đoán năng lực)',
        phase: 'Giai đoạn 02 (Phase 02)',
        desc: 'Hệ thống đánh giá chẩn đoán đầu vào gồm 15-20 câu hỏi đa tầng bậc nhận thức. Khi hoàn thành, nền tảng sẽ tự động phát hiện những phần kiến thức bạn còn yếu để gợi ý ôn bù.',
        status: 'Đang xây dựng ma trận câu hỏi chẩn đoán cho 4 môn Toán, Lí, Hóa, Anh.'
      },
      analytics: {
        title: 'Skill Knowledge Graph (Bản đồ kỹ năng)',
        phase: 'Giai đoạn 02 (Phase 02)',
        desc: 'Hiển thị trực quan cây kỹ năng của từng môn học. Từng chuyên đề sẽ có chỉ số thành thạo (0% - 100%) dựa trên bài làm thực tế thay vì dự đoán cảm tính.',
        status: 'Đang chuẩn hóa phân cấp kỹ năng theo Chương trình GDPT 2018.'
      },
      plan: {
        title: 'Personalized Study Plan (Lộ trình học cá nhân)',
        phase: 'Giai đoạn 03 (Phase 03)',
        desc: 'Tự động phân bổ lịch học từ nay đến ngày thi tốt nghiệp hoặc thi học kỳ. Mỗi ngày cung cấp nhiệm vụ rõ ràng: ôn 10 câu trắc nghiệm, củng cố 2 dạng bài sai.',
        status: 'Dự kiến tích hợp thuật toán sinh lịch thích ứng.'
      },
      adaptive: {
        title: 'Adaptive Practice (Luyện tập thích ứng lặp lại ngắt quãng)',
        phase: 'Giai đoạn 03 (Phase 03)',
        desc: 'Áp dụng giải thuật lặp lại ngắt quãng (Spaced Repetition SM-2). Những câu học sinh trả lời sai sẽ được hệ thống tự động đưa vào danh sách ôn tập sau 1 ngày, 3 ngày và 7 ngày.',
        status: 'Đang hoàn thiện module WrongTracker mở rộng.'
      }
    };

    const item = details[featureKey] || {
      title: 'Tính năng đang phát triển',
      phase: 'Lộ trình phát triển NTMK',
      desc: 'Tính năng này nằm trong kế hoạch phát triển nền tảng thông minh.',
      status: 'Đang triển khai.'
    };

    alert(`[${item.phase}] ${item.title}\n\n${item.desc}\n\nTrạng thái: ${item.status}`);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardView;
}
