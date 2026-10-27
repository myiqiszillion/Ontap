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
              <div class="hero-tag-row">
                <span class="hero-tag">THPT NTMK BÌNH DƯƠNG • LỚP ${profile.grade}</span>
                <span class="hero-status-pill">${metrics.hasActivity ? '⚡ Đang ôn luyện tích cực' : '🌱 Bắt đầu lộ trình'}</span>
              </div>
              <h1 class="hero-title">Xin chào! Sẵn sàng chinh phục mục tiêu hôm nay?</h1>
              <p class="hero-subtitle">Mục tiêu hiện tại: <strong>${goalMeta.icon} ${goalMeta.title}</strong></p>
            </div>
            <div class="hero-target-subjects">
              <span class="label-text">Môn trọng tâm:</span>
              ${targetSubjectBadges}
            </div>
          </div>
          <div class="hero-actions">
            <button class="btn btn-primary hero-main-cta" onclick="app.navigateTo('planner')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              <span>Kế hoạch học tập</span>
            </button>
            <button class="btn btn-outline" onclick="app.navigateTo('diagnostic')">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              <span>Đánh giá năng lực</span>
            </button>
            <button class="btn btn-outline" onclick="app.startOnboarding(true)" title="Thay đổi khối lớp hoặc mục tiêu">
              <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              <span>Đổi mục tiêu</span>
            </button>
          </div>
        </div>

        <!-- Smart Tool Suite Section (Unified 4-Card Neo-EdTech Layout) -->
        <div class="dashboard-section tools-section">
          <div class="section-header">
            <h2 class="section-title">Bộ công cụ ôn luyện thông minh GDPT 2018</h2>
            <span class="section-hint">Hệ thống khảo thí cá nhân hóa cho học sinh THPT NTMK</span>
          </div>
          <div class="smart-tools-grid">
            <div class="smart-tool-card" onclick="app.navigateTo('custom-exam')">
              <div class="tool-icon-wrapper tool-primary">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div class="tool-content">
                <h3 class="tool-title">Tự tạo đề thi</h3>
                <p class="tool-desc">Tùy biến bài học, số lượng câu trắc nghiệm & thời gian làm bài theo ý muốn.</p>
              </div>
              <span class="tool-action-arrow">Vào tạo đề →</span>
            </div>

            <div class="smart-tool-card" onclick="app.navigateTo('checker')">
              <div class="tool-icon-wrapper tool-emerald">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <div class="tool-content">
                <h3 class="tool-title">Dò trắc nghiệm nhanh</h3>
                <p class="tool-desc">Nhập đáp án để so khớp kết quả ngay lập tức và tra cứu hướng dẫn giải chi tiết.</p>
              </div>
              <span class="tool-action-arrow">Vào dò đáp án →</span>
            </div>

            <div class="smart-tool-card" onclick="app.navigateTo('mistakes')">
              <div class="tool-icon-wrapper tool-amber">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
              </div>
              <div class="tool-content">
                <div class="tool-header-row">
                  <h3 class="tool-title">Sổ tay câu sai</h3>
                  <span class="badge ${MistakeStore.getActiveCount() > 0 ? 'badge-danger' : 'badge-subtle'}">${MistakeStore.getActiveCount()} câu</span>
                </div>
                <p class="tool-desc">Tự động lưu các câu làm sai để ôn tập lại ngắt quãng, bồi đắp kiến thức rỗng.</p>
              </div>
              <span class="tool-action-arrow">Xem sổ câu sai →</span>
            </div>

            <div class="smart-tool-card" onclick="app.navigateTo('importer')">
              <div class="tool-icon-wrapper tool-violet">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </div>
              <div class="tool-content">
                <h3 class="tool-title">Nhập đề thông minh</h3>
                <p class="tool-desc">Bóc tách file Word đề thi sang chuẩn GDPT 2018 với trình soạn thảo trực quan.</p>
              </div>
              <span class="tool-action-arrow">Nhập đề thi →</span>
            </div>
          </div>
        </div>

        <!-- Real Metrics Section (Balanced 4-Card Grid) -->
        <div class="dashboard-section">
          <div class="section-header">
            <h2 class="section-title">Chỉ số ôn tập thực tế</h2>
            <span class="section-hint">Dữ liệu thực tế từ các bài luyện tập trên thiết bị của bạn</span>
          </div>
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
