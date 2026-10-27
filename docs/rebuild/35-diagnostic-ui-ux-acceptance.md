# 35 — NGHIỆM THU GIAO DIỆN HỌC SINH ĐÁNH GIÁ NĂNG LỰC (DIAGNOSTIC UI/UX ACCEPTANCE)

**Thời điểm:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Tác giả:** UI/UX Designer & Senior Frontend Engineer  
**Repository:** `Ontap-main`  
**File mã nguồn chính:** [`public/css/diagnostic.css`](file:///c:/Users/Administrator/Documents/Ontap-main/public/css/diagnostic.css), [`public/js/diagnostic-view.js`](file:///c:/Users/Administrator/Documents/Ontap-main/public/js/diagnostic-view.js), [`public/js/router.js`](file:///c:/Users/Administrator/Documents/Ontap-main/public/js/router.js), [`public/js/dashboard.js`](file:///c:/Users/Administrator/Documents/Ontap-main/public/js/dashboard.js), [`public/index.html`](file:///c:/Users/Administrator/Documents/Ontap-main/public/index.html)  

---

## 1. TỔNG QUAN HỆ THỐNG GIAO DIỆN (UI/UX DESIGN SYSTEM OVERVIEW)

Giao diện Đánh giá Năng lực Chẩn đoán được xây dựng tuân thủ chuẩn **NTMK EdTech Modern Design System**:
- **Bảng màu Tailored Modern:** Màu chủ đạo xanh tím Indigo/Violet (`--primary-hue: 245`), tương phản cao, hỗ trợ tự nhiên chế độ Sáng/Tối (Dark/Light mode).
- **Khả năng tiếp cận (Accessibility - WCAG 2.2 AA):** Tỷ lệ tương phản văn bản đạt chuẩn $\ge 4.5:1$, hỗ trợ đầy đủ điều hướng bằng bàn phím (`Tab`, `Space`, `Enter`, phím số), và tôn trọng thiết lập giảm chuyển động (`prefers-reduced-motion`).
- **Typography & Toán học:** Phông chữ Inter/Outfit hiện đại, tích hợp công cụ render công thức toán và ký hiệu hóa học [KaTeX](file:///c:/Users/Administrator/Documents/Ontap-main/public/js/formula-renderer.js) mượt mà không giật layout.

---

## 2. NĂM MÀN HÌNH CHỨC NĂNG CHÍNH (5 CORE SCREENS)

### 1. Màn hình Chào mừng (Diagnostic Welcome Screen)
- **Vị trí:** Section `#diagnostic-screen` -> View `.diag-welcome-view`.
- **Thành phần:**
  - Bộ chọn môn học (Toán, Vật lí, Hóa học, Tiếng Anh).
  - Bộ chọn khối lớp (Lớp 10, 11, 12) hoặc chế độ Ôn thi Tốt nghiệp THPT.
  - Hộp thông số ma trận minh bạch: Thời lượng (45–50 phút), Số câu hỏi (15–25 câu), Tỷ lệ nhận biết/thông hiểu/vận dụng.
  - Thẻ thông tin kiểm định: Danh sách các chủ đề chuẩn GDPT 2018 sẽ được kiểm tra.
  - Tuyên bố sư phạm minh bạch: Nhấn mạnh đây là bài lấy mẫu chẩn đoán, không thay thế kỳ thi chính thức.

### 2. Không gian Làm bài Tập trung (Diagnostic Workspace)
- **Vị trí:** View `.diag-workspace-view`.
- **Thành phần:**
  - **Thanh trạng thái đỉnh trang (Workspace Header):** Hiển thị tên bài thi, bộ đếm thời gian động với cảnh báo trực quan khi thời gian dưới 5 phút, chỉ báo tự động lưu (`Đã lưu lúc 22:15`), và nút Nộp bài.
  - **Lưới điều hướng câu hỏi (Question Navigation Matrix):** Lưới các nút số thể hiện trực quan trạng thái: `Đã làm` (màu xanh dương đậm), `Đang làm` (viền nổi bật), `Chưa làm` (màu xám nhạt).
  - **Thân câu hỏi (Question Card):**
    - Huy hiệu nhận diện: Khối lớp, Độ khó, Mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng).
    - Khung đề bài render KaTeX.
    - Hỗ trợ đầy đủ 3 định dạng: **MCQ** (4 lựa chọn dạng radio box kích thước lớn dễ bấm trên mobile), **True/False Group** (bảng 4 phát biểu kèm cặp nút Đúng/Sai tương tác nhanh), và **Short Answer** (ô nhập liệu chuẩn hóa có gợi ý).
  - **Modal cảnh báo nộp bài (Submission Confirmation Modal):** Cảnh báo số câu còn bỏ trống và yêu cầu xác nhận trước khi chốt nộp.

### 3. Màn hình Kết quả Đánh giá (Diagnostic Result Screen)
- **Vị trí:** View `.diag-result-view`.
- **Thành phần:**
  - **Bảng tổng kết điểm số:** Điểm thô đạt được, Tỷ lệ chính xác quan sát được (`observedAccuracy`), Số câu đúng/sai/chưa làm.
  - **Phán quyết Sẵn sàng (Readiness Verdict Badge):** Phân loại rõ ràng (`Vững vàng`, `Cần củng cố sớm`, `Phát hiện lỗ hổng nền tảng`).
  - **Danh sách Kỹ năng đã lấy mẫu:** Bảng chi tiết trạng thái từng kỹ năng (`Thành thạo`, `Đang phát triển`, `Cần củng cố nền tảng`, hoặc `Chưa đủ dữ liệu đánh giá`).
  - **Xem lại chi tiết từng câu:** Học sinh được đối chiếu đáp án của mình với đáp án đúng và lời giải chi tiết sau khi nộp bài.

### 4. Bảng điều khiển Năng lực Kỹ năng (Skill Mastery Dashboard)
- **Vị trí:** View `.diag-mastery-view`.
- **Thành phần:**
  - Cây phân cấp trực quan: **Môn học $\to$ Khối lớp $\to$ Miền kiến thức $\to$ Kỹ năng**.
  - Thanh tiến trình năng lực (Mastery Progress Bar) biểu diễn khoảng tin cậy 80% (không dùng biểu đồ giả lập).
  - Trạng thái rõ ràng kèm giải thích ngôn ngữ tự nhiên: Học sinh bấm vào kỹ năng để xem số câu đã làm, số câu đúng, và khuyến nghị học tập tiếp theo.

### 5. Lịch sử Đánh giá (Diagnostic History Screen)
- **Vị trí:** View `.diag-history-view`.
- **Thành phần:**
  - Danh sách các bài đánh giá đã hoàn thành theo dòng thời gian.
  - Biểu đồ xu hướng tiến bộ: So sánh tỷ lệ chính xác qua các lần làm bài (chỉ hiển thị khi có $\ge 2$ lần làm bài hợp lệ).
  - Danh sách các kỹ năng đã được cải thiện qua thời gian.

---

## 3. TÍCH HỢP HỆ THỐNG ĐIỀU HƯỚNG (ROUTER INTEGRATION)

1. **Hash Routing:** Thêm route `#diagnostic` vào [`public/js/router.js`](file:///c:/Users/Administrator/Documents/Ontap-main/public/js/router.js).
2. **Navigation Bar:** Thêm nút "Đánh giá Năng lực" trên thanh điều hướng Desktop và thanh Mobile Bar (`public/index.html`).
3. **Student Dashboard Hook:** Thêm widget "Chẩn đoán Năng lực Đầu vào" trong bảng điều khiển học sinh [`public/js/dashboard.js`](file:///c:/Users/Administrator/Documents/Ontap-main/public/js/dashboard.js), cho phép học sinh kích hoạt bài đánh giá bằng một cú nhấp chuột.
