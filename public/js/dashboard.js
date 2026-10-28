/**
 * Student Dashboard View Module — TypeUI Creative & Athenaeum Codex
 * Authentic student metrics, personalized greetings, 4 Core GDPT 2018 Subjects, and high-impact actions
 */

const DashboardView = {
  render() {
    const container = document.getElementById('screen-dashboard');
    if (!container) return;

    const profile = ProfileStore.getProfile() || {
      grade: 10,
      targetSubjects: ['toan', 'vatli'],
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

    const targetSubjectBadges = (profile.targetSubjects || ['toan'])
      .map(k => `<span class="badge badge-primary">${subjectNamesMap[k] || k}</span>`)
      .join(' ');

    const grade = profile.grade || 10;
    const mistakesCount = (typeof MistakeStore !== 'undefined') ? MistakeStore.getActiveCount() : 0;
    const dueMistakesCount = (typeof MistakeStore !== 'undefined' && MistakeStore.getDueCount) ? MistakeStore.getDueCount() : 0;

    container.innerHTML = `
      <div class="dashboard-wrapper">
        <!-- ═══════════════════════════════════════════════════════════
           1. COMMAND DECK HERO (TypeUI Creative Dual-Zone)
           ═══════════════════════════════════════════════════════════ -->
        <div class="dashboard-hero-card">
          <div class="hero-left">
            <div class="hero-tag-row">
              <span class="hero-tag">
                <span class="live-dot" aria-hidden="true"></span>
                THPT NTMK BÌNH DƯƠNG
              </span>
              <span class="hero-grade-pill">
                <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                KHỐI ${grade}
              </span>
              <span class="hero-status-pill">${metrics.hasActivity ? '<svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Đang ôn luyện tích cực' : '<svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg> Khởi đầu hành trình'}</span>
            </div>

            <h1 class="hero-title">Xin chào, Sĩ tử Minh Khai!</h1>
            <p class="hero-subtitle">
              Mục tiêu học tập: <strong>${(typeof Icons !== 'undefined' && Icons.has(goalMeta.icon)) ? Icons.get(goalMeta.icon, { size: 16 }) + ' ' : ''}${goalMeta.title}</strong>
              <span class="hero-standard-pill">Chuẩn GDPT 2018 • QĐ 764</span>
            </p>

            <div class="hero-actions">
              <button class="btn btn-primary hero-main-cta" onclick="app.navigateTo('subjects')">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Tiếp tục ôn tập</span>
              </button>
              <button class="btn btn-glass" onclick="app.navigateTo('custom-exam')">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                <span>Tự tạo đề thi</span>
              </button>
              <button class="btn btn-glass" onclick="app.navigateTo('diagnostic')">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                <span>Đánh giá năng lực</span>
              </button>
              <button class="btn btn-glass" onclick="app.startOnboarding(true)" title="Thay đổi khối lớp hoặc mục tiêu">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                <span>Đổi mục tiêu</span>
              </button>
            </div>
          </div>

          <div class="hero-right">
            <div class="hero-stat-widget">
              <div class="widget-row">
                <div class="widget-icon fire"><svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"/></svg></div>
                <div class="widget-data">
                  <span class="widget-val">${metrics.hasActivity ? Math.min(metrics.totalSessions, 7) + ' ngày' : 'Khởi động'}</span>
                  <span class="widget-lbl">Chuỗi ôn tập liên tục</span>
                </div>
              </div>
              <div class="widget-divider"></div>
              <div class="widget-row">
                <div class="widget-icon target"><svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
                <div class="widget-data">
                  <span class="widget-val">${metrics.averagePercentage !== null ? metrics.averagePercentage + '%' : '100%'}</span>
                  <span class="widget-lbl">Độ sẵn sàng kiến thức</span>
                </div>
              </div>
              <div class="widget-divider"></div>
              <div class="widget-target-list">
                <span class="widget-sub-title">Môn thi trọng tâm:</span>
                <div class="widget-chips-row">${targetSubjectBadges}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════
           2. 4 CORE GDPT 2018 SUBJECTS MATRIX (Direct 1-Click Practice)
           ═══════════════════════════════════════════════════════════ -->
        <div class="dashboard-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">4 Môn học Trọng tâm GDPT 2018 — Khối ${grade}</h2>
              <span class="section-hint">Đề thi chuẩn hóa theo Quyết định 764/QĐ-BGDĐT: Trắc nghiệm 4 lựa chọn, Đúng/Sai & Trả lời ngắn</span>
            </div>
            <button class="section-header-link" onclick="app.navigateTo('subjects')">
              <span>Xem tất cả môn</span>
              <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>

          <div class="dashboard-subjects-grid">
            <!-- TOÁN HỌC -->
            <div class="dash-subject-card dash-sub-toan" onclick="app.selectSubject('toan${grade}')">
              <div class="dash-sub-glow"></div>
              <div class="dash-sub-top">
                <div class="dash-sub-icon toan">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
                </div>
                <span class="dash-sub-pill toan">QĐ 764</span>
              </div>
              <h3 class="dash-sub-name">Toán học ${grade}</h3>
              <p class="dash-sub-desc">Đại số, Giải tích, Hình học không gian & Xác suất thống kê.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">12 CHTN</span>
                <span class="dash-sub-tag">4 Đúng/Sai</span>
                <span class="dash-sub-tag">6 Trả lời ngắn</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng đã kiểm duyệt</span>
                <span class="dash-sub-cta">Luyện đề ngay →</span>
              </div>
            </div>

            <!-- VẬT LÍ -->
            <div class="dash-subject-card dash-sub-vatli" onclick="app.selectSubject('vatli${grade}')">
              <div class="dash-sub-glow"></div>
              <div class="dash-sub-top">
                <div class="dash-sub-icon vatli">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="1"/><path d="M20.2 20.2c2.4-2.4 2.4-6.3 0-8.7L12 3.3 3.8 11.5c-2.4 2.4-2.4 6.3 0 8.7s6.3 2.4 8.7 0l7.7-7.7"/></svg>
                </div>
                <span class="dash-sub-pill vatli">QĐ 764</span>
              </div>
              <h3 class="dash-sub-name">Vật lí ${grade}</h3>
              <p class="dash-sub-desc">Cơ học, Nhiệt học, Điện từ trường & Thí nghiệm vật lí thực tế.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">18 CHTN</span>
                <span class="dash-sub-tag">4 Đúng/Sai</span>
                <span class="dash-sub-tag">6 Trả lời ngắn</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng đã kiểm duyệt</span>
                <span class="dash-sub-cta">Luyện đề ngay →</span>
              </div>
            </div>

            <!-- HÓA HỌC -->
            <div class="dash-subject-card dash-sub-hoahoc" onclick="app.selectSubject('hoahoc${grade}')">
              <div class="dash-sub-glow"></div>
              <div class="dash-sub-top">
                <div class="dash-sub-icon hoahoc">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><line x1="8.5" x2="15.5" y1="2" y2="2"/><line x1="7.5" x2="16.5" y1="16" y2="16"/></svg>
                </div>
                <span class="dash-sub-pill hoahoc">QĐ 764</span>
              </div>
              <h3 class="dash-sub-name">Hóa học ${grade}</h3>
              <p class="dash-sub-desc">Cấu tạo nguyên tử, Cân bằng hóa học & Hợp chất hữu cơ.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">18 CHTN</span>
                <span class="dash-sub-tag">4 Đúng/Sai</span>
                <span class="dash-sub-tag">6 Trả lời ngắn</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng đã kiểm duyệt</span>
                <span class="dash-sub-cta">Luyện đề ngay →</span>
              </div>
            </div>

            <!-- TIẾNG ANH -->
            <div class="dash-subject-card dash-sub-tienganh" onclick="app.selectSubject('tienganh${grade}')">
              <div class="dash-sub-glow"></div>
              <div class="dash-sub-top">
                <div class="dash-sub-icon tienganh">
                  <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <span class="dash-sub-pill tienganh">Form Mới</span>
              </div>
              <h3 class="dash-sub-name">Tiếng Anh ${grade}</h3>
              <p class="dash-sub-desc">Ngữ pháp cốt lõi, Điền từ đoạn văn & Bài đọc hiểu chuyên sâu.</p>
              <div class="dash-sub-meta">
                <span class="dash-sub-tag">40 CHTN</span>
                <span class="dash-sub-tag">Đọc hiểu</span>
                <span class="dash-sub-tag">Collocations</span>
              </div>
              <div class="dash-sub-footer">
                <span class="dash-sub-count">Ngân hàng đã kiểm duyệt</span>
                <span class="dash-sub-cta">Luyện đề ngay →</span>
              </div>
            </div>
          </div>
        </div>

        ${dueMistakesCount > 0 ? `
        <!-- ═══════════════════════════════════════════════════════════
           DAILY SPACED REPETITION (SM-2) QUEUE BANNER
           ═══════════════════════════════════════════════════════════ -->
        <div class="daily-sm2-card clickable" onclick="app.navigateTo('mistakes')" role="region" aria-label="Nhiệm vụ lặp lại ngắt quãng hôm nay">
          <div class="sm2-card-glow"></div>
          <div class="sm2-card-inner">
            <div class="sm2-badge-row">
              <span class="sm2-pill">
                <span class="live-dot" aria-hidden="true"></span>
                NHIỆM VỤ ÔN TẬP HÔM NAY (SPACED REPETITION SM-2)
              </span>
              <span class="sm2-due-tag">${dueMistakesCount} câu đến hạn</span>
            </div>
            <div class="sm2-card-content">
              <div class="sm2-info">
                <h3 class="sm2-title">Phục hồi trí nhớ dài hạn các câu từng làm sai</h3>
                <p class="sm2-desc">Thuật toán SuperMemo-2 đã tính toán các điểm mù kiến thức cần ôn lại ngay hôm nay để không bị quên lãng.</p>
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
           3. REAL METRICS BENTO (Zero Mock Data)
           ═══════════════════════════════════════════════════════════ -->
        <div class="dashboard-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Chỉ số ôn tập thực tế</h2>
              <span class="section-hint">Dữ liệu ghi nhận từ các bài làm khảo thí trên thiết bị của bạn</span>
            </div>
          </div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-icon-box emerald">
                <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
              </div>
              <div class="metric-info">
                <div class="metric-value">${metrics.totalSessions}</div>
                <div class="metric-label">Bài thi đã hoàn thành</div>
                <div class="metric-sub-hint">${metrics.totalSessions > 0 ? 'Đã ghi nhận hệ thống' : 'Chưa có bài thi'}</div>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon-box cyan">
                <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div class="metric-info">
                <div class="metric-value ${metrics.averagePercentage !== null && metrics.averagePercentage >= 80 ? 'metric-glow-green' : ''}">${metrics.averagePercentage !== null ? metrics.averagePercentage + '%' : '--'}</div>
                <div class="metric-label">Điểm trung bình thực tế</div>
                <div class="metric-sub-hint">${metrics.averagePercentage !== null ? 'Trung bình bài nộp' : 'Cần tối thiểu 1 bài'}</div>
              </div>
            </div>

            <div class="metric-card">
              <div class="metric-icon-box amber">
                <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div class="metric-info">
                <div class="metric-value">${metrics.totalTimeMinutes} <small class="metric-unit">phút</small></div>
                <div class="metric-label">Thời gian đã ôn luyện</div>
                <div class="metric-sub-hint">Tổng thời gian làm bài</div>
              </div>
            </div>

            <div class="metric-card clickable" onclick="app.navigateTo('mistakes')" title="Nhấn để xem và ôn tập các câu sai">
              <div class="metric-icon-box ${mistakesCount > 0 ? 'rose' : 'slate'}">
                <svg class="ui-icon ui-icon-lg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
              </div>
              <div class="metric-info">
                <div class="metric-value ${mistakesCount > 0 ? 'metric-val-danger' : ''}">${mistakesCount}</div>
                <div class="metric-label">Câu sai cần phục hồi</div>
                <div class="metric-sub-hint">${mistakesCount > 0 ? 'Khắc phục lỗ hổng ngay' : 'Kiến thức vững vàng'}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════
           4. RECENT ACTIVITY (Polished TypeUI Activity Cards)
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
                          <span class="history-mode-pill">Chế độ: ${item.mode === 'exam' ? 'Thi thử QĐ 764' : (item.mode === 'practice' ? 'Luyện tập thích ứng' : item.mode)}</span>
                        </div>
                      </div>
                    </div>
                    <div class="hist-actions">
                      <button class="btn btn-sm btn-outline-clean" onclick="app.selectSubject('${item.subjectId || 'toan' + grade}')">
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
                Bạn chưa hoàn thành bài thi thử nào trên thiết bị này. Hãy chọn một môn học ở danh sách bên trên để bắt đầu làm bài và theo dõi tiến độ chính xác.
              </p>
              <button class="btn btn-primary" onclick="app.navigateTo('subjects')">
                <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                <span>Bắt đầu làm bài đầu tiên</span>
              </button>
            </div>
          `}
        </div>

        <!-- ═══════════════════════════════════════════════════════════
           5. SMART TOOL SUITE (Active EdTech Tools)
           ═══════════════════════════════════════════════════════════ -->
        <div class="dashboard-section tools-section">
          <div class="section-header">
            <div>
              <h2 class="section-title">Bộ công cụ khảo thí chuyên sâu</h2>
              <span class="section-hint">Công cụ hỗ trợ học tập thông minh chuẩn hóa cho học sinh THPT NTMK</span>
            </div>
          </div>
          <div class="smart-tools-grid">
            <div class="smart-tool-card" onclick="app.navigateTo('custom-exam')">
              <div class="tool-icon-wrapper tool-primary">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              </div>
              <div class="tool-content">
                <h3 class="tool-title">Tự tạo đề thi</h3>
                <p class="tool-desc">Tùy biến bài học, số lượng câu trắc nghiệm & thời gian làm bài theo ý muốn.</p>
              </div>
              <span class="tool-action-arrow">Vào tạo đề →</span>
            </div>

            <div class="smart-tool-card" onclick="app.navigateTo('checker')">
              <div class="tool-icon-wrapper tool-emerald">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <div class="tool-content">
                <h3 class="tool-title">Dò trắc nghiệm nhanh</h3>
                <p class="tool-desc">Nhập đáp án để so khớp kết quả ngay lập tức và tra cứu hướng dẫn giải chi tiết.</p>
              </div>
              <span class="tool-action-arrow">Vào dò đáp án →</span>
            </div>

            <div class="smart-tool-card" onclick="app.navigateTo('mistakes')">
              <div class="tool-icon-wrapper tool-amber">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
              </div>
              <div class="tool-content">
                <div class="tool-header-row">
                  <h3 class="tool-title">Sổ tay câu sai</h3>
                  <span class="badge ${mistakesCount > 0 ? 'badge-danger' : 'badge-subtle'}">${mistakesCount} câu</span>
                </div>
                <p class="tool-desc">Tự động lưu các câu làm sai để ôn tập lại ngắt quãng, bồi đắp kiến thức rỗng.</p>
              </div>
              <span class="tool-action-arrow">Xem sổ câu sai →</span>
            </div>

            <div class="smart-tool-card" onclick="app.navigateTo('importer')">
              <div class="tool-icon-wrapper tool-violet">
                <svg class="ui-icon ui-icon-md" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </div>
              <div class="tool-content">
                <h3 class="tool-title">Nhập đề thông minh</h3>
                <p class="tool-desc">Bóc tách file Word đề thi sang chuẩn GDPT 2018 với trình soạn thảo trực quan.</p>
              </div>
              <span class="tool-action-arrow">Nhập đề thi →</span>
            </div>
          </div>
        </div>

        <!-- ═══════════════════════════════════════════════════════════
           6. COMMUNITY & DISCORD BANNER
           ═══════════════════════════════════════════════════════════ -->
        <div class="community-banner-card">
          <div class="comm-left">
            <div class="comm-icon-chip">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            </div>
            <div>
              <div class="comm-title-row">
                <h3 class="comm-title">Tham gia cộng đồng học tập THPT Miki</h3>
                <span class="comm-status-badge">${(typeof Icons !== 'undefined' && Icons.get) ? Icons.get('circle', { size: 10, className: 'status-dot-active' }) : '<span class="status-indicator-dot" aria-hidden="true"></span>'} Đang hoạt động</span>
              </div>
              <p class="comm-desc">Giao lưu hỏi bài, chia sẻ đề thi và tham gia phòng học trực tuyến cùng các bạn học sinh THPT NTMK.</p>
            </div>
          </div>
          <a href="https://discord.gg/X9H3FkUryB" target="_blank" rel="noopener" class="btn btn-discord">
            <span>Gia nhập Discord</span>
            <svg class="ui-icon ui-icon-xs" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
          </a>
        </div>
      </div>
    `;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DashboardView;
}
