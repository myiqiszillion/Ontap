/**
 * Student Dashboard View Module — Modern Friendly EdTech Design
 * Student-Centric, Warm, Inspiring, 6 Core GDPT 2018 Subjects, and High-Impact Learning Actions
 */

const DashboardView = {
  render() {
    const container = document.getElementById('screen-dashboard');
    if (!container) return;

    const profile = ProfileStore.getProfile() || {
      grade: 11,
      targetSubjects: ['toan', 'vatli', 'hoahoc', 'tienganh', 'lichsu', 'sinhhoc'],
      goal: 'score_8_plus'
    };

    const metrics = ProfileStore.getMetrics();
    const history = ProfileStore.getHistory();
    const grade = profile.grade || 11;
    const mistakesCount = (typeof MistakeStore !== 'undefined') ? MistakeStore.getActiveCount() : 0;
    const dueMistakesCount = (typeof MistakeStore !== 'undefined' && MistakeStore.getDueCount) ? MistakeStore.getDueCount() : 0;

    container.innerHTML = `
      <div class="dashboard-wrapper">
        <!-- ═══════════════════════════════════════════════════════════
           1. HERO CHÀO HỎI THÂN THIỆN & 1 NÚT THI THỬ DUY NHẤT
           ═══════════════════════════════════════════════════════════ -->
        <div class="dashboard-hero-card">
          <div class="hero-main-content">
            <div class="hero-badge-row">
              <span class="hero-school-badge">THPT NGUYỄN THỊ MINH KHAI</span>
              <span class="hero-grade-badge">KHỐI ${grade}</span>
              <span class="hero-moet-badge">Chuẩn cấu trúc 2025</span>
            </div>

            <h1 class="hero-title">Chào bạn, hôm nay cùng luyện thi nhé!</h1>
            <p class="hero-subtitle">
              Ngân hàng đề thi trắc nghiệm GDPT 2018 với 3 phần thi chuẩn hóa: Nhiều lựa chọn, Đúng/Sai và Điền khuyết.
            </p>

            <div class="hero-actions">
              <button class="btn btn-hero-primary" onclick="app.startProceduralExam('toan11')" title="Luyện đề tự sinh chuẩn cấu trúc Bộ Giáo dục và Đào tạo">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Thi thử ngay đề chuẩn Bộ GD&ĐT (50 phút)</span>
              </button>
              ${mistakesCount > 0 ? `
              <button class="btn btn-hero-secondary" onclick="app.navigateTo('mistakes')" title="Xem lại các câu bạn đã làm sai để ôn tập">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
                <span>Sổ câu sai (${mistakesCount} câu)</span>
              </button>
              ` : ''}
            </div>
          </div>

          <div class="hero-student-stats">
            <div class="student-stat-item">
              <div class="stat-icon-wrap streak">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-num">${metrics.hasActivity ? Math.min(metrics.totalSessions, 7) + ' ngày' : '1 ngày'}</span>
                <span class="stat-label">Chuỗi ôn luyện</span>
              </div>
            </div>

            <div class="stat-divider"></div>

            <div class="student-stat-item">
              <div class="stat-icon-wrap exams">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-num">${metrics.totalSessions} đề</span>
                <span class="stat-label">Đã hoàn thành</span>
              </div>
            </div>

            <div class="stat-divider"></div>

            <div class="student-stat-item">
              <div class="stat-icon-wrap accuracy">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div class="stat-info">
                <span class="stat-num">${metrics.averagePercentage !== null ? metrics.averagePercentage + '%' : '--'}</span>
                <span class="stat-label">Tỉ lệ chính xác</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════
           2. TÂM ĐIỂM: 6 MÔN HỌC KHỐI 11 (BẤM VÀO LÀ HỌC NGAY)
           ═══════════════════════════════════════════════════════════ -->
        <div class="dashboard-section subjects-focus-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">6 Môn học trọng tâm Khối 11</h2>
              <span class="section-hint">Chọn môn học để vào làm bài hoặc luyện đề ngay lập tức</span>
            </div>
            <button class="section-header-link" onclick="app.navigateTo('subjects')">
              <span>Tất cả môn</span>
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <div class="dashboard-subjects-grid">
            <!-- TOÁN HỌC -->
            <div class="dash-subject-card dash-sub-toan" style="--card-index: 0" onclick="if (window.SoundFX) SoundFX.playClick(); app.selectSubject('toan11')" role="button" tabindex="0">
              <div class="dash-sub-top">
                <div class="dash-sub-icon toan">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 7V4H6l6 8-6 8h12v-3"/></svg>
                </div>
                <span class="dash-sub-pill toan">Cấu trúc 2025</span>
              </div>
              <h3 class="dash-sub-name">Toán học 11</h3>
              <p class="dash-sub-desc">Hàm số lượng giác, Dãy số, Cấp số cộng/nhân, Giới hạn và Hình không gian.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">12 Nhiều lựa chọn</span>
                <span class="dash-sub-tag">4 Đúng/Sai</span>
                <span class="dash-sub-tag">6 Trả lời ngắn</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng đề chuẩn</span>
                <span class="dash-sub-cta">Vào học ngay →</span>
              </div>
            </div>

            <!-- VẬT LÍ -->
            <div class="dash-subject-card dash-sub-vatli" style="--card-index: 1" onclick="if (window.SoundFX) SoundFX.playClick(); app.selectSubject('vatli11')" role="button" tabindex="0">
              <div class="dash-sub-top">
                <div class="dash-sub-icon vatli">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="2.5" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/></svg>
                </div>
                <span class="dash-sub-pill vatli">Cấu trúc 2025</span>
              </div>
              <h3 class="dash-sub-name">Vật lí 11</h3>
              <p class="dash-sub-desc">Dao động cơ điều hòa, Sóng cơ, Giao thoa sóng và Điện trường thế năng.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">18 Nhiều lựa chọn</span>
                <span class="dash-sub-tag">4 Đúng/Sai</span>
                <span class="dash-sub-tag">6 Trả lời ngắn</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng đề chuẩn</span>
                <span class="dash-sub-cta">Vào học ngay →</span>
              </div>
            </div>

            <!-- HÓA HỌC -->
            <div class="dash-subject-card dash-sub-hoahoc" style="--card-index: 2" onclick="if (window.SoundFX) SoundFX.playClick(); app.selectSubject('hoahoc11')" role="button" tabindex="0">
              <div class="dash-sub-top">
                <div class="dash-sub-icon hoahoc">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 2v7.5a2 2 0 0 1-.2.9L4.7 20.5a1 1 0 0 0 .9 1.5h12.8a1 1 0 0 0 .9-1.5L14.2 10.4a2 2 0 0 1-.2-.9V2"/><path d="M8.5 2h7"/><circle cx="10" cy="17" r="1" fill="currentColor"/><circle cx="14" cy="15" r="1.5" fill="currentColor"/></svg>
                </div>
                <span class="dash-sub-pill hoahoc">Cấu trúc 2025</span>
              </div>
              <h3 class="dash-sub-name">Hóa học 11</h3>
              <p class="dash-sub-desc">Cân bằng hóa học, Sự điện li, Nitrogen - Sulfur và Hợp chất hữu cơ.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">18 Nhiều lựa chọn</span>
                <span class="dash-sub-tag">4 Đúng/Sai</span>
                <span class="dash-sub-tag">6 Trả lời ngắn</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng đề chuẩn</span>
                <span class="dash-sub-cta">Vào học ngay →</span>
              </div>
            </div>

            <!-- SINH HỌC -->
            <div class="dash-subject-card dash-sub-sinhhoc" style="--card-index: 3" onclick="if (window.SoundFX) SoundFX.playClick(); app.selectSubject('sinhhoc11')" role="button" tabindex="0">
              <div class="dash-sub-top">
                <div class="dash-sub-icon sinhhoc">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 15c6.6-6 13.4 0 20-6" stroke-linecap="round"/><path d="M2 9c6.6 6 13.4 0 20 6" stroke-linecap="round"/><line x1="5.5" y1="11" x2="5.5" y2="13"/><line x1="9.5" y1="8" x2="9.5" y2="16"/><line x1="14.5" y1="8" x2="14.5" y2="16"/><line x1="18.5" y1="11" x2="18.5" y2="13"/></svg>
                </div>
                <span class="dash-sub-pill sinhhoc">Cấu trúc 2025</span>
              </div>
              <h3 class="dash-sub-name">Sinh học 11</h3>
              <p class="dash-sub-desc">Trao đổi chất và chuyển hóa năng lượng, Quang hợp, Hô hấp và Tiêu hóa.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">18 Nhiều lựa chọn</span>
                <span class="dash-sub-tag">4 Đúng/Sai</span>
                <span class="dash-sub-tag">6 Trả lời ngắn</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng đề chuẩn</span>
                <span class="dash-sub-cta">Vào học ngay →</span>
              </div>
            </div>

            <!-- LỊCH SỬ -->
            <div class="dash-subject-card dash-sub-lichsu" style="--card-index: 4" onclick="if (window.SoundFX) SoundFX.playClick(); app.selectSubject('lichsu11')" role="button" tabindex="0">
              <div class="dash-sub-top">
                <div class="dash-sub-icon lichsu">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M4 18h16M4 7h16M2 7l10-4 10 4M6 18V7M10 18V7M14 18V7M18 18V7"/></svg>
                </div>
                <span class="dash-sub-pill lichsu">Đặc sắc NTMK</span>
              </div>
              <h3 class="dash-sub-name">Lịch sử 11</h3>
              <p class="dash-sub-desc">Cách mạng tư sản, Sự phát triển của CNTB và CNXH từ sau CTTG II.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">24 Nhiều lựa chọn</span>
                <span class="dash-sub-tag">4 Đúng/Sai</span>
                <span class="dash-sub-tag">NTMK Chuẩn</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng Đề NTMK</span>
                <span class="dash-sub-cta">Vào học ngay →</span>
              </div>
            </div>

            <!-- TIẾNG ANH -->
            <div class="dash-subject-card dash-sub-tienganh" style="--card-index: 5" onclick="if (window.SoundFX) SoundFX.playClick(); app.selectSubject('tienganh11')" role="button" tabindex="0">
              <div class="dash-sub-top">
                <div class="dash-sub-icon tienganh">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <span class="dash-sub-pill tienganh">Global Success</span>
              </div>
              <h3 class="dash-sub-name">Tiếng Anh 11</h3>
              <p class="dash-sub-desc">Ngữ âm, Trọng âm, Từ vựng chuyên đề, Đọc hiểu và Ngữ pháp liên kết câu.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">40 Nhiều lựa chọn</span>
                <span class="dash-sub-tag">Đọc hiểu</span>
                <span class="dash-sub-tag">Từ vựng</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng đề chuẩn</span>
                <span class="dash-sub-cta">Vào học ngay →</span>
              </div>
            </div>
          </div>
        </div>

        ${dueMistakesCount > 0 ? `
        <!-- ═══════════════════════════════════════════════════════════
           NHẮC NHỞ ÔN TẬP CÂU SAI HÔM NAY
           ═══════════════════════════════════════════════════════════ -->
        <div class="daily-sm2-card clickable" onclick="app.navigateTo('mistakes')" role="region" aria-label="Nhiệm vụ ôn tập câu sai hôm nay">
          <div class="sm2-card-inner">
            <div class="sm2-badge-row">
              <span class="sm2-pill">
                <span class="live-dot" aria-hidden="true"></span>
                NHẮC NHỞ ÔN TẬP HÔM NAY
              </span>
              <span class="sm2-due-tag">${dueMistakesCount} câu cần củng cố</span>
            </div>
            <div class="sm2-card-content">
              <div class="sm2-info">
                <h3 class="sm2-title">Khắc phục các câu đã từng làm sai</h3>
                <p class="sm2-desc">Hệ thống đã chọn lọc các điểm kiến thức cần ôn lại hôm nay để bạn ghi nhớ dài hạn.</p>
              </div>
              <button class="sm2-btn-cta" onclick="event.stopPropagation(); app.navigateTo('mistakes');">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
                <span>Vào ôn lại ngay</span>
              </button>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- ═══════════════════════════════════════════════════════════
           3. CÔNG CỤ HỌC TẬP THÔNG MINH
           ═══════════════════════════════════════════════════════════ -->
        <div class="dashboard-section tools-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Công cụ học tập thông minh</h2>
              <span class="section-hint">Hỗ trợ tự tạo đề thi, dò nhanh kết quả và khảo sát năng lực</span>
            </div>
          </div>
          <div class="smart-tools-grid">
            <div class="smart-tool-card" style="--tool-index: 0" onclick="if (window.SoundFX) SoundFX.playClick(); app.navigateTo('custom-exam')" role="button" tabindex="0">
              <div class="tool-icon-wrapper tool-primary">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div class="tool-content">
                <h3 class="tool-title">Tự tạo đề thi</h3>
                <p class="tool-desc">Tự chọn chuyên đề, số lượng câu trắc nghiệm & thời gian làm bài theo ý muốn.</p>
              </div>
              <span class="tool-action-arrow">Vào tạo đề →</span>
            </div>

            <div class="smart-tool-card" style="--tool-index: 1" onclick="if (window.SoundFX) SoundFX.playClick(); app.navigateTo('checker')" role="button" tabindex="0">
              <div class="tool-icon-wrapper tool-emerald">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <div class="tool-content">
                <h3 class="tool-title">Dò trắc nghiệm nhanh</h3>
                <p class="tool-desc">Nhập đáp án để so khớp kết quả ngay lập tức và tra cứu hướng dẫn giải chi tiết.</p>
              </div>
              <span class="tool-action-arrow">Vào dò đáp án →</span>
            </div>

            <div class="smart-tool-card" style="--tool-index: 2" onclick="if (window.SoundFX) SoundFX.playClick(); app.navigateTo('mistakes')" role="button" tabindex="0">
              <div class="tool-icon-wrapper tool-amber">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
              </div>
              <div class="tool-content">
                <div class="tool-header-row">
                  <h3 class="tool-title">Sổ tay câu sai</h3>
                  <span class="badge ${mistakesCount > 0 ? 'badge-danger' : 'badge-subtle'}">${mistakesCount} câu</span>
                </div>
                <p class="tool-desc">Tự động ghi nhớ các câu làm sai để bạn ôn lại ngắt quãng, bồi đắp lỗ hổng kiến thức.</p>
              </div>
              <span class="tool-action-arrow">Xem sổ câu sai →</span>
            </div>

            <div class="smart-tool-card" style="--tool-index: 3" onclick="if (window.SoundFX) SoundFX.playClick(); app.navigateTo('diagnostic')" role="button" tabindex="0">
              <div class="tool-icon-wrapper tool-violet">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              </div>
              <div class="tool-content">
                <h3 class="tool-title">Đánh giá năng lực</h3>
                <p class="tool-desc">Làm bài khảo sát nhanh để xác định các chuyên đề bạn đã vững và phần cần bổ sung.</p>
              </div>
              <span class="tool-action-arrow">Đánh giá ngay →</span>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════
           4. NHẬT KÝ LÀM BÀI GẦN ĐÂY
           ═══════════════════════════════════════════════════════════ -->
        <div class="dashboard-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Nhật ký làm bài gần đây</h2>
              <span class="section-hint">Lịch sử các phiên làm đề thi thử và luyện tập cá nhân</span>
            </div>
            ${metrics.hasActivity ? `
              <span class="history-count-badge">${history.length} bài đã nộp</span>
            ` : ''}
          </div>

          ${metrics.hasActivity ? `
            <div class="history-list">
              ${history.slice(0, 5).map(item => {
                const dateStr = new Date(item.timestamp).toLocaleDateString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit'
                });
                const isPass = item.percentage >= 50;
                const isHigh = item.percentage >= 80;
                const badgeClass = isHigh ? 'score-high' : (isPass ? 'score-mid' : 'score-low');
                const ratingLabel = isHigh ? 'Xuất sắc' : (isPass ? 'Đạt' : 'Cần củng cố');

                return `
                  <div class="history-item-card">
                    <div class="hist-left">
                      <div class="history-badge ${badgeClass}">
                        <span class="hist-percentage">${item.percentage}%</span>
                        <span class="hist-rating">${ratingLabel}</span>
                      </div>
                      <div class="history-info">
                        <div class="history-title-row">
                          <h4 class="history-title">${item.subjectName}</h4>
                          <span class="history-score-detail">${item.score}/${item.total} câu</span>
                        </div>
                        <div class="history-meta-row">
                          <span class="history-date">
                            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            ${dateStr}
                          </span>
                          <span class="history-mode-pill">Chế độ: ${item.mode === 'exam' ? 'Thi thử cấu trúc 2025' : (item.mode === 'practice' ? 'Luyện tập' : item.mode)}</span>
                        </div>
                      </div>
                    </div>
                    <div class="hist-actions">
                      <button class="btn btn-sm btn-outline-clean" onclick="app.selectSubject('${item.subjectId || 'toan11'}')">
                        <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                        <span>Luyện lại</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div class="empty-state-card">
              <div class="empty-state-icon"><svg class="ui-icon ui-icon-xl" viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg></div>
              <h3 class="empty-state-title">Chưa có bài thi nào được ghi nhận</h3>
              <p class="empty-state-desc">
                Bạn chưa làm bài thi thử nào trên thiết bị này. Hãy chọn một môn học ở danh sách bên trên để bắt đầu làm bài nhé!
              </p>
              <button class="btn btn-primary" onclick="app.startProceduralExam('toan11')">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Bắt đầu làm bài thi thử đầu tiên</span>
              </button>
            </div>
          `}
        </div>

        <!-- ═══════════════════════════════════════════════════════════
           5. FOOTER THPT NGUYỄN THỊ MINH KHAI
           ═══════════════════════════════════════════════════════════ -->
        <div class="saas-institutional-footer">
          <div class="footer-top-row">
            <div class="footer-brand">
              <img src="assets/logo.svg" alt="Logo NTMK" class="footer-logo-img" width="34" height="34">
              <div>
                <div class="footer-brand-title">TRƯỜNG THPT NGUYỄN THỊ MINH KHAI — TỈNH BÌNH DƯƠNG</div>
                <div class="footer-brand-sub">Nền tảng Ôn tập & Khảo thí Trực tuyến GDPT 2018 theo Cấu trúc Mới</div>
              </div>
            </div>
            <div class="footer-status-badge">
              <span class="live-dot" aria-hidden="true"></span>
              <span>Dành riêng cho học sinh THPT NTMK</span>
            </div>
          </div>
          <div class="footer-divider"></div>
          <div class="footer-bottom-row">
            <p class="footer-copyright">
              Hệ thống học tập phi lợi nhuận hỗ trợ học sinh ôn tập và chuẩn bị tốt nhất cho kỳ thi THPT.
            </p>
            <div class="footer-links">
              <button class="footer-link-btn" onclick="CommandPalette.open()">Tìm kiếm (Ctrl+K)</button>
              <button class="footer-link-btn" onclick="app.navigateTo('subjects')">Khám phá môn học</button>
              <button class="footer-link-btn" onclick="app.navigateTo('custom-exam')">Tự tạo đề</button>
              <button class="footer-link-btn" onclick="app.navigateTo('mistakes')">Sổ câu sai</button>
            </div>
          </div>
        </div>
      </div>
    `;
    if (typeof Tilt3D !== 'undefined') {
      Tilt3D.init();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardView;
}
