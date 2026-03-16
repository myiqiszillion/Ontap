/**
 * Admin Portal Controller
 * Handles posting and deleting announcements
 */
const Admin = {
  async init() {
    this.setupEventListeners();
    this.loadAnnouncements();
  },

  setupEventListeners() {
    const form = document.getElementById('announcement-form');
    form.addEventListener('submit', (e) => this.handleSubmit(e));
  },

  async handleSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const statusMsg = document.getElementById('status-message');
    
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;
    const link = document.getElementById('link').value;

    submitBtn.disabled = true;
    submitBtn.innerText = 'Đang đăng...';

    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, link })
      });

      if (!res.ok) throw new Error('Đăng bài thất bại');

      statusMsg.innerText = 'Đã đăng thông báo thành công! 🎉';
      statusMsg.className = 'message success';
      e.target.reset();
      this.loadAnnouncements(); // Refresh list
    } catch (err) {
      statusMsg.innerText = 'Lỗi: ' + err.message;
      statusMsg.className = 'message error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Đăng Lên Website';
      setTimeout(() => {
        statusMsg.style.display = 'none';
      }, 5000);
    }
  },

  async loadAnnouncements() {
    const list = document.getElementById('announcements-list');
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) throw new Error('Không thể tải danh sách');
      const data = await res.json();

      if (data.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Chưa có thông báo nào.</p>';
        return;
      }

      list.innerHTML = data.map(ann => {
        const date = new Date(ann.timestamp).toLocaleString('vi-VN');
        return `
          <div class="admin-ann-item" id="ann-${ann.id}">
            <div class="admin-ann-info">
              <div class="admin-ann-title">${ann.title}</div>
              <div class="admin-ann-time">${date}</div>
            </div>
            <button class="delete-btn" onclick="Admin.deleteAnnouncement('${ann.id}')">Xóa</button>
          </div>
        `;
      }).join('');
    } catch (err) {
      list.innerHTML = `<p style="color: var(--red); text-align: center;">Lỗi: ${err.message}</p>`;
    }
  },

  async deleteAnnouncement(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;

    try {
      const res = await fetch(`/api/delete-announcement?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Xóa thất bại');

      document.getElementById(`ann-${id}`).remove();
      // If list empty after remove
      if (document.getElementById('announcements-list').children.length === 0) {
        this.loadAnnouncements();
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  }
};

window.Admin = Admin;
document.addEventListener('DOMContentLoaded', () => Admin.init());
