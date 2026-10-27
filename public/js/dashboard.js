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
              📅 Kế hoạch học tập cá nhân
            </button>
            <button class="btn btn-outline" onclick="app.navigateTo('diagnostic')">
              🎯 Đánh giá năng lực đầu vào
            </button>
            <button class="btn btn-outline" onclick="app.navigateTo('subjects')">
              📚 Chọn môn luyện tập
            </button>
            <button class="btn btn-outline" style="border-color: #f59e0b; color: #f59e0b;" onclick="app.navigateTo('checker')">
              🔍 Dò trắc nghiệm
            </button>
            <button class="btn btn-outline" onclick="app.startOnboarding(true)">
              ⚙️ Đổi mục tiêu
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
              📜 Ôn Lịch sử 11
            </button>
            <button class="btn btn-outline" onclick="app.selectSubject('lichsu10')">
              🏛️ Ôn Lịch sử 10
            </button>
            <button class="btn btn-outline" style="border-color: #f59e0b; color: #f59e0b;" onclick="Checker.init('lichsu11'); app.navigateTo('checker');">
              🔍 Dò đáp án
            </button>
          </div>
        </div>

        <!-- Real Metrics Section (No Fake Data) -->
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-icon">📝</div>
            <div class="metric-info">
              <div class="metric-value">${metrics.totalSessions}</div>
              <div class="metric-label">Bài thi đã hoàn thành</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🎯</div>
            <div class="metric-info">
              <div class="metric-value">${metrics.averagePercentage !== null ? metrics.averagePercentage + '%' : '--'}</div>
              <div class="metric-label">Điểm trung bình thực tế</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">⏱️</div>
            <div class="metric-info">
              <div class="metric-value">${metrics.totalTimeMinutes} <small>phút</small></div>
              <div class="metric-label">Thời gian đã ôn luyện</div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-icon">🏆</div>
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
