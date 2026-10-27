# 33 — ĐỘNG CƠ ĐÁNH GIÁ NĂNG LỰC CHẨN ĐOÁN (DIAGNOSTIC ASSESSMENT ENGINE)

**Thời điểm:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Tác giả:** Assessment Scientist & Senior Full-Stack Engineer  
**Repository:** `Ontap-main`  
**File nguồn chính:** [`engine/diagnostic/diagnostic-blueprint-builder.js`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/diagnostic-blueprint-builder.js), [`engine/diagnostic/diagnostic-question-selector.js`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/diagnostic-question-selector.js), [`engine/diagnostic/diagnostic-session-manager.js`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/diagnostic-session-manager.js), [`engine/diagnostic/diagnostic-scoring-adapter.js`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/diagnostic-scoring-adapter.js)  

---

## 1. HAI PHƯƠNG THỨC ĐÁNH GIÁ CHẨN ĐOÁN (ASSESSMENT MODES)

Hệ thống hỗ trợ 2 hướng tiếp cận đánh giá năng lực độc lập:

### A. Grade-Based Diagnostic Assessment (Đánh giá theo khối lớp)
- **Đối tượng:** Học sinh đang học lớp 10, 11 hoặc 12 muốn rà soát kiến thức trong năm học.
- **Thời lượng:** 45 phút.
- **Quy mô:** 15 – 25 câu hỏi trọng tâm.
- **Cấu trúc phân bổ:**
  - Nhận biết (Recognize): ~20%
  - Thông hiểu (Understand): ~35%
  - Vận dụng (Apply): ~35%
  - Vận dụng cao (High Apply): ~10%
- **Mục tiêu:** Quét toàn diện các chương trong năm học để phát hiện sớm các chủ đề chưa nắm chắc.

### B. Graduation Readiness Assessment (Đánh giá Sẵn sàng Thi Tốt nghiệp THPT)
- **Đối tượng:** Học sinh lớp 12 chuẩn bị bước vào giai đoạn ôn thi tốt nghiệp THPT.
- **Thời lượng:** 50 phút.
- **Quy mô:** 20 – 30 câu hỏi lấy mẫu đa khối lớp.
- **Cơ cấu câu hỏi liên khối (Cross-grade distribution):**
  - ~68% Kiến thức trọng tâm Lớp 12.
  - ~20% Kiến thức kỹ năng nền tảng Lớp 11 (Giới hạn, Đạo hàm, Dao động, Điện tích, v.v.).
  - ~12% Kiến thức công cụ cơ sở Lớp 10 (Hàm số bậc hai, Tam thức, Lượng giác tam giác, Vận tốc, v.v.).
- **Tuyên bố pháp lý & sư phạm:** Ma trận bài đánh giá **không tự nhận là đề thi tốt nghiệp chuẩn hóa**; mục đích là chẩn đoán nhanh độ vững vàng của chuỗi tri thức 3 năm THPT.

---

## 2. HÀNG RÀO CHỌN CÂU HỎI & NGẮT MẠCH KHI THIẾU DỮ LIỆU (QUESTION SELECTION GATES)

Module [`DiagnosticQuestionSelector`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/diagnostic-question-selector.js) tuân thủ 5 quy tắc khắt khe trước khi đưa bất kỳ câu hỏi nào vào bài đánh giá:

1. **Trạng thái xuất bản:** Câu hỏi bắt buộc phải có `status === 'published'`.
2. **Kiểm định sư phạm:** Bắt buộc có chữ ký thẩm định `source.verificationStatus === 'verified'` và `source.verificationEvidence`. Bản nháp (`draft`) và câu chưa thẩm định (`unverified`) bị loại bỏ 100%.
3. **Bản quyền giáo dục:** Bắt buộc có `source.permissionApproved === true` và mã giấy phép hợp lệ.
4. **Metadata kỹ năng tin cậy:** Bắt buộc có trường `skillId` map chính xác vào cây GDPT 2018.
5. **Chống trùng lặp câu hỏi (Anti-duplicate tracking):** Mỗi câu hỏi đã chọn trong lượt làm bài gần nhất của học sinh sẽ bị loại khỏi pool để tránh hiện tượng học sinh thuộc lòng đáp án.

### Cổng ngắt mạch an toàn (Fail-Closed Shortage Gate)
Nếu số lượng câu hỏi verified trong ngân hàng không đủ để lấp đầy toàn bộ các slot của ma trận đánh giá:
- Hệ thống trả về `ready: false`.
- Cung cấp danh sách cụ thể từng vị trí bị thiếu (`shortages` kèm `skillId` và `grade`).
- **Từ chối mở bài đánh giá chính thức** để bảo vệ tính chính xác khoa học của kết quả.

---

## 3. TÍCH HỢP CHẤM ĐIỂM CHUẨN BGDĐT (SCORING INTEGRATION)

Module [`DiagnosticScoringAdapter`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/diagnostic-scoring-adapter.js) tái sử dụng [`ScoringEngine`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/scoring.js) tuân thủ Quyết định 764/QĐ-BGDĐT:

### 1. Trắc nghiệm Nhiều lựa chọn (Multiple Choice - Part I)
- 4 phương án (A, B, C, D), duy nhất 1 phương án đúng.
- Đúng được tối đa số điểm quy định theo môn (0.25 điểm). Trả lời sai hoặc bỏ trống nhận 0 điểm.

### 2. Trắc nghiệm Đúng/Sai Cụm (True/False Group - Part II)
- Mỗi câu gồm 4 ý lệnh độc lập (a, b, c, d).
- Áp dụng bảng điểm chuẩn lũy tiến của Bộ GD&ĐT:
  - Đúng 1 ý: **0.1 điểm**
  - Đúng 2 ý: **0.25 điểm**
  - Đúng 3 ý: **0.50 điểm**
  - Đúng 4 ý: **1.00 điểm**
- Trả lời sai hoặc bỏ trống không bị trừ điểm âm.

### 3. Trắc nghiệm Trả lời ngắn (Short Answer - Part III)
- Học sinh nhập số thực hoặc chuỗi kết quả.
- Áp dụng chính sách chuẩn hóa: hỗ trợ dấu phẩy thập phân (`1,5` tương đương `1.5`), chuẩn hóa khoảng trắng và chữ hoa/thường.
- Áp dụng nghiêm ngặt `answerPolicy.tolerance`: không tự tiện nới lỏng sai số nếu câu hỏi không cấu hình cho phép sai số.

### Phân biệt Bỏ trống và Trả lời sai (Unanswered vs Wrong)
- Trả lời sai: Học sinh có quan niệm sai lệch hoặc tính toán nhầm.
- Bỏ trống (`unanswered`): Học sinh không biết làm hoặc không kịp thời gian. Hệ thống lưu riêng trạng thái này để phạt mức độ bất định trong mô hình ước lượng năng lực.

---

## 4. QUẢN LÝ PHIÊN LÀM BÀI & BẢO MẬT PHÍA SERVER (SESSION MANAGEMENT)

Module [`DiagnosticSessionManager`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/diagnostic-session-manager.js) bảo đảm trải nghiệm thi trực tuyến mượt mà và an toàn:

- **Bóc tách đáp án (Answer Sanitization):** Khi khởi tạo phiên, toàn bộ đáp án đúng, lời giải và giải thích bị xóa sạch khỏi payload JSON gửi về trình duyệt.
- **Tự động lưu câu trả lời (Auto-Save):** Client tự động gửi đáp án ngầm sau mỗi thao tác chọn câu.
- **Khôi phục trạng thái khi Reload (Session Resilience):** Khi tải lại trang, hệ thống tính toán chính xác số giây còn lại (`remainingTimeSeconds = expiresAt - now`), khôi phục danh sách đáp án đã lưu và vị trí câu đang làm.
- **Chống gian lận nộp bài (Idempotent Server-Side Scoring):** Server tự tính điểm dựa trên ngân hàng câu hỏi gốc được lưu an toàn. Điểm do Client gửi lên bị phớt lờ hoàn toàn. Nếu nộp bài nhiều lần, server trả về đúng kết quả tính toán lần đầu.
