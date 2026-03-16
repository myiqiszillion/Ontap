/**
 * Admin Portal Controller
 * Handles posting and deleting announcements
 */
const Admin = {
  supabase: null,

  async init() {
    // Basic Supabase Init for Storage (Public bucket only needs URL and Anon Key)
    // In a real app, we'd use environment variables, but for demo/frontend we can fetch them if available or hardcode
    // Since we are serverless, we'll fetch the config if needed or assume defaults
    const SUPABASE_URL = "https://bjcgwophobdkjrscilni.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY2d3b3Bob2Jka2pyc2NpbG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTM5MDAsImV4cCI6MjA4OTIyOTkwMH0.ZTprDdGsQIuIgGkjOI0UgBu7cpJWpm78-W3Uvr9Lur4";
    
    // Check if supabase is available globally (from script tag)
    if (typeof supabase !== 'undefined') {
        this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    
    this.setupEventListeners();
    this.loadAnnouncements();
  },

  setupEventListeners() {
    const form = document.getElementById('announcement-form');
    form.addEventListener('submit', (e) => this.handleSubmit(e));

    const imageInput = document.getElementById('image');
    if (imageInput) {
        imageInput.addEventListener('change', (e) => this.handleImagePreview(e));
    }
  },

  handleImagePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            previewImg.src = event.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        preview.style.display = 'none';
        previewImg.src = '';
    }
  },

  async handleSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const statusMsg = document.getElementById('status-message');
    
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;
    const link = document.getElementById('link').value;
    const imageFile = document.getElementById('image').files[0];

    submitBtn.disabled = true;
    submitBtn.innerText = 'Đang xử lý...';

    try {
      let image_url = null;

      // Handle Image Upload if file exists
      if (imageFile && this.supabase) {
        submitBtn.innerText = 'Đang tải ảnh...';
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { data: uploadData, error: uploadError } = await this.supabase.storage
            .from('announcements')
            .upload(filePath, imageFile);

        if (uploadError) throw new Error('Lỗi tải ảnh: ' + uploadError.message);

        // Get Public URL
        const { data: { publicUrl } } = this.supabase.storage
            .from('announcements')
            .getPublicUrl(filePath);
        
        image_url = publicUrl;
      }

      submitBtn.innerText = 'Đang đăng...';
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, link, image_url })
      });

      if (!res.ok) throw new Error('Đăng bài thất bại');

      statusMsg.innerText = 'Đã đăng thông báo thành công! 🎉';
      statusMsg.className = 'message success';
      e.target.reset();
      document.getElementById('image-preview').style.display = 'none';
      this.loadAnnouncements(); // Refresh list
    } catch (err) {
      statusMsg.innerText = 'Lỗi: ' + err.message;
      statusMsg.className = 'message error';
    } finally {
      statusMsg.style.display = 'block';
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
