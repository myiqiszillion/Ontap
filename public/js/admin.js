const Admin = {
  supabase: null,
  selectedFiles: [], // Array to hold File objects

  async init() {
    const SUPABASE_URL = "https://bjcgwophobdkjrscilni.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqY2d3b3Bob2Jka2pyc2NpbG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NTM5MDAsImV4cCI6MjA4OTIyOTkwMH0.ZTprDdGsQIuIgGkjOI0UgBu7cpJWpm78-W3Uvr9Lur4";
    
    if (typeof supabase !== 'undefined') {
        this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    
    this.setupEventListeners();
    this.loadAnnouncements();
  },

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Add icon based on type
    const icon = type === 'success' 
      ? `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
      : `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;

    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  setupEventListeners() {
    const form = document.getElementById('announcement-form');
    form.addEventListener('submit', (e) => this.handleSubmit(e));

    const imageInput = document.getElementById('image');
    const dropZone = document.getElementById('drop-zone');

    if (imageInput && dropZone) {
        dropZone.addEventListener('click', () => imageInput.click());

        imageInput.addEventListener('change', (e) => {
            this.addFiles(e.target.files);
            imageInput.value = ''; // reset so same file can be selected again
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.addFiles(e.dataTransfer.files);
        });

        document.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            const pastedFiles = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    pastedFiles.push(items[i].getAsFile());
                }
            }
            if (pastedFiles.length > 0) this.addFiles(pastedFiles);
        });
    }
  },

  addFiles(files) {
      for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
              this.selectedFiles.push(files[i]);
          }
      }
      this.renderPreviews();
  },

  removeFile(index) {
      this.selectedFiles.splice(index, 1);
      this.renderPreviews();
  },

  renderPreviews() {
      const previewContainer = document.getElementById('image-preview');
      const dropZone = document.getElementById('drop-zone');
      
      previewContainer.innerHTML = '';

      if (this.selectedFiles.length === 0) {
          previewContainer.style.display = 'none';
          dropZone.style.display = 'block';
          return;
      }

      previewContainer.style.display = 'grid'; // .admin-image-grid is already display: grid but we toggle it
      dropZone.style.display = 'none';

      this.selectedFiles.forEach((file, index) => {
          const item = document.createElement('div');
          item.className = 'admin-preview-item';
          
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          
          const removeBtn = document.createElement('button');
          removeBtn.type = 'button';
          removeBtn.className = 'remove-image-btn';
          removeBtn.innerHTML = '×';
          removeBtn.onclick = (e) => {
              e.stopPropagation();
              this.removeFile(index);
          };

          item.appendChild(img);
          item.appendChild(removeBtn);
          previewContainer.appendChild(item);
      });
  },

  async handleSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;
    const link = document.getElementById('link').value;

    submitBtn.disabled = true;
    submitBtn.innerText = 'Đang xử lý...';

    try {
      let image_url = null;
      let uploadedUrls = [];

      if (this.selectedFiles.length > 0 && this.supabase) {
        submitBtn.innerText = `Đang tải lên ${this.selectedFiles.length} ảnh...`;
        
        const uploadPromises = this.selectedFiles.map(async (file) => {
            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { error: uploadError } = await this.supabase.storage
                .from('announcements')
                .upload(filePath, file);

            if (uploadError) throw new Error('Lỗi tải ảnh: ' + uploadError.message);

            const { data: { publicUrl } } = this.supabase.storage
                .from('announcements')
                .getPublicUrl(filePath);
            
            return publicUrl;
        });

        uploadedUrls = await Promise.all(uploadPromises);
        image_url = JSON.stringify(uploadedUrls);
      }

      submitBtn.innerText = 'Đang đăng...';
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, link, image_url })
      });

      if (!res.ok) throw new Error('Đăng bài thất bại');

      this.showToast('Đã đăng thông báo thành công! 🎉', 'success');
      e.target.reset();
      
      this.selectedFiles = [];
      this.renderPreviews();
      
      this.loadAnnouncements();
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Đăng Lên Website';
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
        const isPinned = ann.pinned === true;
        const pinClass = isPinned ? ' pinned' : '';
        const pinIcon = isPinned
          ? `<svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>`
          : `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>`;
        const pinLabel = isPinned ? 'Bỏ ghim' : 'Ghim';
        return `
          <div class="admin-ann-item${pinClass}" id="ann-${ann.id}">
            <div class="admin-ann-info">
              <div class="admin-ann-header">
                <img src="assets/avatar.jpg" alt="Admin Avatar" class="admin-ann-avatar">
                <div class="admin-ann-title">${isPinned ? '📌 ' : ''}${ann.title}</div>
              </div>
              <div class="admin-ann-time">${date}</div>
            </div>
            <div class="admin-ann-actions">
              <button class="pin-btn${pinClass}" onclick="Admin.togglePin('${ann.id}', ${!isPinned})">
                ${pinIcon}
                ${pinLabel}
              </button>
              <button class="delete-btn" onclick="Admin.deleteAnnouncement('${ann.id}')">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                Xóa
              </button>
            </div>
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

      this.showToast('Đã xóa thông báo!', 'success');
      
      document.getElementById(`ann-${id}`).remove();
      if (document.getElementById('announcements-list').children.length === 0) {
        this.loadAnnouncements();
      }
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    }
  },

  async togglePin(id, pinned) {
    try {
      const res = await fetch(`/api/pin-announcement?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned })
      });

      if (!res.ok) throw new Error('Thao tác thất bại');

      this.showToast(pinned ? 'Đã ghim thông báo! 📌' : 'Đã bỏ ghim thông báo.', 'success');
      this.loadAnnouncements();
    } catch (err) {
      this.showToast('Lỗi: ' + err.message, 'error');
    }
  }
};

window.Admin = Admin;
document.addEventListener('DOMContentLoaded', () => Admin.init());
