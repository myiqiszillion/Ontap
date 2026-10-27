/**
 * Student Authentication View Controller
 * NTMK Rebuild Phase 04A — Task 3 & 8
 *
 * Provides:
 * - Login / Registration / Guest Modal
 * - Seamless Guest-to-Student upgrade
 * - Secure Session Token persistence via AuthStore
 * - Accessible keyboard navigation & mobile responsiveness
 */

const AuthView = {
  activeTab: 'login', // 'login' | 'register' | 'guest' | 'profile'

  init() {
    this.renderModal();
    this.updateHeaderAuthStatus();

    if (typeof AuthStore !== 'undefined') {
      AuthStore.subscribe((event) => {
        this.updateHeaderAuthStatus();
      });
    }
  },

  updateHeaderAuthStatus() {
    const authBtn = document.getElementById('header-auth-btn');
    if (!authBtn) return;

    if (typeof AuthStore !== 'undefined' && AuthStore.isLoggedIn()) {
      const user = AuthStore.getUser();
      authBtn.innerHTML = `<span class="auth-icon" aria-hidden="true">👤</span> <span class="auth-text auth-user-name">${user.displayName || 'Học sinh'}</span>`;
      authBtn.title = `Đã đăng nhập: ${user.email || user.displayName}`;
      authBtn.classList.add('logged-in');
    } else if (typeof AuthStore !== 'undefined' && AuthStore.isGuest()) {
      const user = AuthStore.getUser();
      authBtn.innerHTML = `<span class="auth-icon" aria-hidden="true">👤</span> <span class="auth-text">Khách</span>`;
      authBtn.title = 'Đang sử dụng chế độ Khách';
      authBtn.classList.remove('logged-in');
    } else {
      authBtn.innerHTML = `<span class="auth-icon" aria-hidden="true">👤</span> <span class="auth-text">Đăng nhập</span>`;
      authBtn.title = 'Đăng nhập hoặc đăng ký tài khoản';
      authBtn.classList.remove('logged-in');
    }
  },

  showModal(initialTab = 'login') {
    this.activeTab = initialTab;
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    this.renderTabs();
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
  },

  hideModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
  },

  renderModal() {
    let modal = document.getElementById('auth-modal');
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');

    modal.innerHTML = `
      <div class="auth-modal-card">
        <button class="auth-modal-close" onclick="AuthView.hideModal()" aria-label="Đóng">&times;</button>
        <div class="auth-modal-header">
          <div class="auth-brand-badge">NTMK GDPT 2018</div>
          <h2 id="auth-modal-title" class="auth-modal-title">Tài Khoản Học Sinh</h2>
          <p class="auth-modal-subtitle">Lưu trữ lộ trình, lịch sử ôn tập và bảo vệ tiến độ học tập của bạn</p>
        </div>

        <div class="auth-tabs-nav" role="tablist">
          <button class="auth-tab-btn active" id="tab-login" onclick="AuthView.switchTab('login')" role="tab">Đăng nhập</button>
          <button class="auth-tab-btn" id="tab-register" onclick="AuthView.switchTab('register')" role="tab">Đăng ký</button>
          <button class="auth-tab-btn" id="tab-guest" onclick="AuthView.switchTab('guest')" role="tab">Khách</button>
        </div>

        <div id="auth-modal-body" class="auth-modal-body">
          <!-- Dynamic content inserted by renderTabs() -->
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on click outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.hideModal();
    });
  },

  switchTab(tab) {
    this.activeTab = tab;
    this.renderTabs();
  },

  renderTabs() {
    const body = document.getElementById('auth-modal-body');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabGuest = document.getElementById('tab-guest');
    if (!body) return;

    [tabLogin, tabRegister, tabGuest].forEach(t => t?.classList.remove('active'));

    const isLoggedIn = typeof AuthStore !== 'undefined' && AuthStore.isLoggedIn();
    const user = typeof AuthStore !== 'undefined' ? AuthStore.getUser() : null;

    if (isLoggedIn && (this.activeTab === 'profile' || this.activeTab === 'login')) {
      tabLogin?.classList.add('active');
      body.innerHTML = `
        <div class="auth-profile-box">
          <div class="auth-profile-avatar">🎓</div>
          <h3>${user.displayName || 'Học sinh'}</h3>
          <p class="auth-profile-email">${user.email || 'Tài khoản học sinh'}</p>
          <div class="auth-profile-meta">
            <span>Khối lớp: <strong>Lớp ${user.grade || 10}</strong></span>
            <span>Vai trò: <strong>Học sinh</strong></span>
          </div>

          <div class="auth-profile-actions">
            <button class="btn btn-outline" onclick="AuthView.handleLogout()">Đăng xuất</button>
            <button class="btn btn-danger-outline" onclick="AuthView.handleDeleteAccount()">Xóa tài khoản</button>
          </div>
        </div>
      `;
      return;
    }

    if (this.activeTab === 'register') {
      tabRegister?.classList.add('active');
      const isGuest = typeof AuthStore !== 'undefined' && AuthStore.isGuest();
      body.innerHTML = `
        <form id="auth-register-form" onsubmit="AuthView.handleRegister(event)" class="auth-form">
          ${isGuest ? `<div class="auth-alert-info">💡 Bạn đang có bài làm ở chế độ Khách. Khi đăng ký, toàn bộ kết quả sẽ được tự động chuyển vào tài khoản mới của bạn!</div>` : ''}
          <div class="form-group">
            <label for="reg-email">Email học tập</label>
            <input type="email" id="reg-email" required placeholder="vidu: hocsinh@gmail.com" autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="reg-name">Họ và tên hoặc Biệt danh</label>
            <input type="text" id="reg-name" required placeholder="Họ và tên" />
          </div>
          <div class="form-group">
            <label for="reg-grade">Khối lớp hiện tại</label>
            <select id="reg-grade">
              <option value="10" selected>Lớp 10 (GDPT 2018)</option>
              <option value="11">Lớp 11 (GDPT 2018)</option>
              <option value="12">Lớp 12 (Ôn thi tốt nghiệp THPT)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="reg-password">Mật khẩu (tối thiểu 8 ký tự)</label>
            <input type="password" id="reg-password" required minlength="8" placeholder="••••••••" autocomplete="new-password" />
          </div>
          <div id="auth-error-msg" class="auth-error-text" style="display:none;"></div>
          <button type="submit" class="btn btn-primary btn-block">Tạo tài khoản học sinh</button>
        </form>
      `;
    } else if (this.activeTab === 'guest') {
      tabGuest?.classList.add('active');
      body.innerHTML = `
        <div class="auth-guest-box">
          <div class="auth-guest-icon">⚡</div>
          <h3>Chế độ Khách (Ẩn danh)</h3>
          <p>Bạn có thể trải nghiệm đầy đủ các tính năng kiểm tra năng lực, lập kế hoạch học tập và luyện tập thích ứng mà không cần cung cấp email.</p>
          <div class="form-group" style="text-align:left; margin-top:1rem;">
            <label for="guest-grade">Chọn khối lớp ôn tập:</label>
            <select id="guest-grade">
              <option value="10" selected>Lớp 10</option>
              <option value="11">Lớp 11</option>
              <option value="12">Lớp 12</option>
            </select>
          </div>
          <button class="btn btn-primary btn-block" onclick="AuthView.handleGuestAccess()">Tiếp tục làm bài với tư cách Khách</button>
          <p class="auth-disclaimer">Lưu ý: Dữ liệu ở chế độ khách được lưu trên trình duyệt này. Bạn có thể nâng cấp thành tài khoản bất kỳ lúc nào.</p>
        </div>
      `;
    } else {
      tabLogin?.classList.add('active');
      body.innerHTML = `
        <form id="auth-login-form" onsubmit="AuthView.handleLogin(event)" class="auth-form">
          <div class="form-group">
            <label for="login-email">Email học tập</label>
            <input type="email" id="login-email" required placeholder="vidu: hocsinh@gmail.com" autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="login-password">Mật khẩu</label>
            <input type="password" id="login-password" required placeholder="••••••••" autocomplete="current-password" />
          </div>
          <div id="auth-error-msg" class="auth-error-text" style="display:none;"></div>
          <button type="submit" class="btn btn-primary btn-block">Đăng nhập</button>
          <div class="auth-form-footer">
            <span>Chưa có tài khoản? <a href="javascript:void(0)" onclick="AuthView.switchTab('register')">Đăng ký miễn phí</a></span>
          </div>
        </form>
      `;
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email')?.value?.trim();
    const password = document.getElementById('login-password')?.value;
    const errEl = document.getElementById('auth-error-msg');

    if (!email || !password) return;

    try {
      if (errEl) errEl.style.display = 'none';
      const guestToken = typeof AuthStore !== 'undefined' && AuthStore.isGuest() ? AuthStore.getToken() : null;

      const res = await fetch('/api/v2/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, guestTokenToMigrate: guestToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đăng nhập thất bại.');

      if (typeof AuthStore !== 'undefined') {
        AuthStore.setSession(data.session);
      }
      this.hideModal();
      this.showToast('✅ Đăng nhập thành công! Chào mừng bạn quay trở lại.');
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email')?.value?.trim();
    const displayName = document.getElementById('reg-name')?.value?.trim();
    const grade = Number(document.getElementById('reg-grade')?.value || 10);
    const password = document.getElementById('reg-password')?.value;
    const errEl = document.getElementById('auth-error-msg');

    try {
      if (errEl) errEl.style.display = 'none';
      const guestToken = typeof AuthStore !== 'undefined' && AuthStore.isGuest() ? AuthStore.getToken() : null;

      const res = await fetch('/api/v2/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, grade, password, guestTokenToMigrate: guestToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Đăng ký thất bại.');

      if (typeof AuthStore !== 'undefined') {
        AuthStore.setSession(data.session);
      }
      this.hideModal();
      this.showToast('🎉 Đăng ký tài khoản thành công!');
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    }
  },

  async handleGuestAccess() {
    const grade = Number(document.getElementById('guest-grade')?.value || 10);
    try {
      const res = await fetch('/api/v2/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Không thể tạo phiên khách.');

      if (typeof AuthStore !== 'undefined') {
        AuthStore.setSession(data.session);
      }
      this.hideModal();
      this.showToast('⚡ Bạn đang tham gia học tập ở chế độ Khách.');
    } catch (err) {
      alert(err.message);
    }
  },

  handleLogout() {
    if (typeof AuthStore !== 'undefined') {
      AuthStore.clearSession();
    }
    this.hideModal();
    this.showToast('Đã đăng xuất tài khoản.');
  },

  async handleDeleteAccount() {
    if (!confirm('Bạn có chắc chắn muốn xóa tài khoản? Toàn bộ lộ trình và điểm số học tập sẽ bị xóa vĩnh viễn.')) return;
    try {
      const headers = typeof AuthStore !== 'undefined' ? AuthStore.getAuthHeaders() : {};
      const res = await fetch('/api/v2/auth/account', {
        method: 'DELETE',
        headers
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Xóa tài khoản thất bại.');
      }
      if (typeof AuthStore !== 'undefined') {
        AuthStore.clearSession();
      }
      this.hideModal();
      this.showToast('Tài khoản đã được xóa thành công.');
    } catch (err) {
      alert(err.message);
    }
  },

  showToast(msg) {
    let toast = document.getElementById('ntmk-toast-alert');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'ntmk-toast-alert';
      toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--card-bg,#1e293b);color:var(--text-main,#f8fafc);border:1px solid var(--border-color,#334155);padding:12px 20px;border-radius:10px;box-shadow:0 10px 25px rgba(0,0,0,0.3);z-index:9999;font-weight:500;transition:opacity 0.3s;';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3500);
  }
};

if (typeof window !== 'undefined') {
  window.AuthView = AuthView;
}
