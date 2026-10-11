# 24 — KIỂM TOÁN CHỐNG LỘ ĐÁP ÁN TOÀN DIỆN (ANSWER-KEY EXPOSURE AUDIT)

**Thời điểm thực thi:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Phạm vi:** Tất cả các endpoint API và đường dẫn tĩnh có khả năng trả về dữ liệu câu hỏi trong hệ thống.  

---

## 1. PHÂN ĐỊNH RANH GIỚI BẢO MẬT NỘI DUNG

Một trong những yêu cầu kiến trúc cốt lõi của Task 5 là **phân tách rõ ràng giữa hai loại nội dung**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       NỘI DUNG HỌC TẬP & ÔN TẬP CÔNG KHAI                   │
│                         (PUBLIC LEARNING CONTENT)                           │
│                                                                             │
│ • Mục đích: Học sinh tự học, xem đáp án tức thì và đọc lời giải chi tiết.    │
│ • Endpoint: `/api/data/:subject` (chế độ thường), `/data/:subject.json`     │
│ • Chính sách: ĐƯỢC PHÉP chứa `correct`, `explanation` khi ở Chế độ Ôn tập. │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                 TÁCH BIỆT 100%
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NỘI DUNG KỲ THI ĐƯỢC BẢO VỆ                        │
│                           (PROTECTED EXAM CONTENT)                          │
│                                                                             │
│ • Mục đích: Đánh giá năng lực, thi thử có giám sát, thi phân loại chuẩn hóa. │
│ • Endpoint: `/api/v2/exam/start`, `/api/v2/questions`, `/api/data/?mode=exam`│
│ • Chính sách: CHỈ SERVER được nắm đáp án gốc. Browser chỉ nhận câu hỏi đã   │
│   sanitize hoàn toàn (`correctOptionIndex`, `acceptedAnswers`, `explanation`│
│   bị xóa bỏ hoàn toàn trước khi rời khỏi server).                           │
│ • NGUYÊN TẮC VÀNG: Không bao giờ sử dụng câu hỏi công khai từ legacy         │
│   làm câu hỏi bí mật trong protected exam.                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. MA TRẬN KIỂM THỬ TRUY VẤN LỘ ĐÁP ÁN (TEST MATRIX)

Kiểm toán đã thực hiện kiểm tra thực nghiệm trên toàn bộ 9 kịch bản truy vấn:

| # | Endpoint & Phương thức | Điều kiện truy vấn / Headers | Kết quả kiểm tra đáp án | Trạng thái bảo mật |
|---|---|---|---|---|
| **1** | `/api/data/toan10` | Có tham số `?mode=exam` | `correct`, `correctAnswer`, `explanation` bị xóa bỏ 100% | `SECURE` (Sanitized) |
| **2** | `/api/data/toan10` | Header `x-exam-mode: true` | Toàn bộ đáp án và lời giải bị loại bỏ | `SECURE` (Sanitized) |
| **3** | `/api/data/toan10` | Không có `mode` (Study Mode) | Giữ nguyên đáp án & lời giải phục vụ học sinh ôn tập | `SECURE` (Phục vụ học tập) |
| **4** | `/data/toan10.json` (Static file) | Truy cập trực tiếp tĩnh không có `mode` | Trả về file ôn tập gốc của hệ thống legacy | `SECURE` (Legacy Study) |
| **5** | `/data/toan10.json` (Static file) | Có `?mode=exam` hoặc `x-exam-mode: true` | Middleware chặn bắt và sanitize trước khi gửi | `SECURE` (Sanitized) |
| **6** | `/api/v2/questions` (Catalog) | Truy vấn phân trang `limit=20&offset=0` | Áp dụng `QuestionSchemaV2.sanitizeForStudent`: không lộ đáp án MCQ/TF/SA | `SECURE` (Sanitized) |
| **7** | `/api/v2/questions?id=q_01` | Truy vấn theo ID câu hỏi | Câu hỏi được sanitize trước khi gửi ra response JSON | `SECURE` (Sanitized) |
| **8** | `/api/v2/exam/start` (POST) | Khởi tạo phiên thi mới (Guest / Student) | Trả về `token`, `sessionId` và danh sách câu hỏi đã xóa 100% đáp án | `SECURE` (Sanitized) |
| **9** | `/api/v2/exam/submit` (POST) | Nộp bài thi | Trả về kết quả tổng hợp (`rawScore`, `scaledScore`), không lộ bảng đáp án gốc | `SECURE` (Aggregated) |

---

## 3. CƠ CHẾ SANITIZATION ĐA ĐỊNH DẠNG (MCQ, TRUE/FALSE, SHORT ANSWER)

Hàm [`QuestionSchemaV2.sanitizeForStudent(question, { isExamMode: true })`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/schema.js) xử lý triệt để từng định dạng câu hỏi GDPT 2018:

1. **Phần I — Trắc nghiệm nhiều phương án (Multiple Choice):**
   - Xóa `mcqPayload.correctOptionIndex`.
   - Xóa `correct`, `correctAnswer`.
   - Đặt `explanation = ''`.
2. **Phần II — Trắc nghiệm Đúng/Sai (True/False Group):**
   - Duyệt mảng `statements`: Xóa thuộc tính `correct` của từng mệnh đề `a), b), c), d)`.
   - Xóa `explanation` của từng mệnh đề.
   - Đặt `explanation = ''` của nhóm câu hỏi.
3. **Phần III — Trắc nghiệm trả lời ngắn (Short Answer):**
   - Xóa mảng đáp án chấp nhận: `shortAnswerPayload.acceptedAnswers`.
   - Xóa `shortAnswerPayload.correctAnswers`, `correctAnswer`.
   - Đặt `explanation = ''`.
4. **Bảo mật siêu dữ liệu xuất xứ:**
   - Xóa các trường nội bộ server: `rawSource`, `provenance`, `auditTrail`, `auditLog`, `reviewNotes`, `verificationEvidence`.

---

## 4. KẾT LUẬN KIỂM TOÁN BẢO MẬT ĐÁP ÁN

- Không tìm thấy bất kỳ kịch bản nào cho phép thí sinh khai thác answer key từ browser devtools hoặc network inspect trước thời điểm nộp bài trong Protected Exam Mode.
- Hệ thống Legacy ôn tập tự do không bị phá vỡ cấu trúc và vẫn phục vụ học sinh ôn tập bình thường khi không bật chế độ thi.
