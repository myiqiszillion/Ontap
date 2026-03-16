document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('announcement-form');
    const submitBtn = document.getElementById('submit-btn');
    const statusMsg = document.getElementById('status-message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('title').value.trim();
        const content = document.getElementById('content').value.trim();
        const link = document.getElementById('link').value.trim();

        if (!title || !content) {
            showMessage('Vui lòng điền đầy đủ Tiêu đề và Nội dung!', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang đẩy lên server...';

        try {
            const response = await fetch('/api/announcements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title, content, link })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage('Đăng thông báo thành công! Nhớ chạy git push để lưu vĩnh viễn trên Vercel nhé.', 'success');
                form.reset();
            } else {
                showMessage(data.error || 'Có lỗi xảy ra khi lưu!', 'error');
            }
        } catch (err) {
            console.error(err);
            showMessage('Mất kết nối tới server cục bộ!', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Đăng Lên Website';
        }
    });

    function showMessage(msg, type) {
        statusMsg.textContent = msg;
        statusMsg.className = `message ${type}`;
        setTimeout(() => {
            statusMsg.className = 'message';
        }, 8000);
    }
});
