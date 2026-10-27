# NTMK REBUILD — KIỂM THỬ HÀNH TRÌNH HỌC SINH VÀ NGHIỆM THU AN NINH CLOUD (PHASE 04B)

> **Tài liệu:** `docs/rebuild/59-reviewed-pilot-e2e-acceptance.md`  
> **Phiên bản:** Phase 04B Reviewed Pilot E2E & Cloud Security Acceptance  
> **Thời điểm thẩm định:** 12/10/2026  
> **Tác giả:** QA Lead, Principal Full-Stack Engineer, Security Auditor & UX Specialist  
> **Trạng thái:** `DEMO E2E VERIFIED` | `REAL STUDENT PILOT BLOCKED`

---

## 1. ĐỊNH NGHĨA PHẠM VI PILOT VÀ GIỚI HẠN NĂNG LỰC HỆ THỐNG

NTMK tuân thủ nguyên tắc trung thực sư phạm: **Không tuyên bố độ phủ toàn diện khi mới chỉ có 14 câu hỏi nháp thuộc 3 kỹ năng**. Hệ thống phân định rạch ròi 4 cấp độ:

### Cấp độ 1 — Internal Engineering Demo (Thử nghiệm Kỹ thuật Nội bộ)
- **Mục tiêu:** Kiểm chứng toàn bộ luồng công nghệ: hiển thị KaTeX, xác thực HMAC, điều hướng SPA, tính toán Bayesian Mastery, lưu trữ phiên.
- **Học liệu:** Cho phép sử dụng bản nháp kỹ thuật (`ai_assisted_draft`) và test fixtures trong môi trường cô lập.
- **Yêu cầu giao diện:** Bắt buộc hiển thị nhãn cảnh báo:  
  `INTERNAL DEMO ONLY — BẢN THỬ NGHIỆM KỸ THUẬT NỘI BỘ (KHÔNG DÙNG ĐÁNH GIÁ CHÍNH THỨC)`.
- **Trạng thái:** ✅ **`READY (INTERNAL DEMO VERIFIED)`**.

### Cấp độ 2 — Reviewed Topic Practice Pilot (Luyện tập Theo Chủ đề Đã Duyệt)
- **Mục tiêu:** Cho phép học sinh thật luyện tập theo từng chủ đề cụ thể:
  1. *Mệnh đề & Tập hợp* (`math-10-sets-logic`)
  2. *Bất phương trình & Hệ BPT bậc nhất hai ẩn* (`math-10-linear-ineq-2vars`)
  3. *Hàm số bậc hai* (`math-10-quad-func`)
- **Điều kiện mở:** 100% câu hỏi trong chủ đề đó phải có chữ ký thẩm định của giáo viên bộ môn Toán ngoài đời thực.
- **Trạng thái:** ❌ **`BLOCKED (Chờ chữ ký giáo viên thực tế)`**.

### Cấp độ 3 — Diagnostic Assessment Pilot (Đánh giá Năng lực Đầu vào)
- **Mục tiêu:** Chẩn đoán lỗ hổng kiến thức toán học và thiết lập lộ trình học tập cá nhân hóa.
- **Điều kiện:** Đòi hỏi ngân hàng chuẩn hóa tối thiểu 20–30 câu hỏi đã qua kiểm định, cân đối 4 mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
- **Trạng thái:** ❌ **`BLOCKED (Số lượng câu hỏi đã duyệt hiện tại: 0/14)`**.

### Cấp độ 4 — Graduation Mock Exam (Thi Thử Tốt Nghiệp THPT)
- **Mục tiêu:** Mô phỏng kỳ thi tốt nghiệp THPT chuẩn QĐ 764/BGDĐT.
- **Điều kiện:** Đủ cấu trúc đề thi chính thức: 12 MCQ + 4 True/False Group + 6 Short Answer (cho môn Toán).
- **Trạng thái:** ❌ **`BLOCKED (11/12 tổ hợp môn/lớp chưa có câu hỏi)`**.

---

## 2. KẾT QUẢ KIỂM THỬ 16 BƯỚC HÀNH TRÌNH HỌC SINH (DEMO E2E FLOW)

Toàn bộ 16 bước trải nghiệm học sinh đã được kiểm thử tự động trên môi trường cô lập:

| Bước | Hành động của Học sinh | Kết quả Kỹ thuật Thực tế | Trạng thái |
| :---: | :--- | :--- | :---: |
| **1** | Đăng nhập tài khoản test (`alice@student.ntmk.internal`) | Cấp phát token HMAC-SHA256, kiểm tra băm mật khẩu `scrypt`. | ✅ ĐẠT |
| **2** | Onboarding thiết lập mục tiêu học tập | Tạo profile không chứa PII: Mục tiêu, ngân sách 30 phút/ngày, 6 ngày/tuần. | ✅ ĐẠT |
| **3** | Lựa chọn môn học Toán lớp 10 | Router điều hướng tới danh mục kỹ năng Toán 10 GDPT 2018. | ✅ ĐẠT |
| **4** | Xem danh mục chủ đề sẵn sàng | Hệ thống hiển thị rõ nhãn Demo Mode và danh mục 3 chủ đề. | ✅ ĐẠT |
| **5** | Bắt đầu bài luyện tập | Khởi tạo phiên luyện tập, cấp token phiên an toàn. | ✅ ĐẠT |
| **6** | Trả lời câu hỏi (MCQ, Đúng/Sai, Trả lời ngắn) | Giao diện ghi nhận câu trả lời tức thời, không rò rỉ đáp án đúng. | ✅ ĐẠT |
| **7** | Nộp bài kiểm tra | Gửi payload kèm idempotency key chống nộp trùng lặp. | ✅ ĐẠT |
| **8** | Chấm điểm phía server | Tính điểm theo chuẩn QĐ 764/BGDĐT (MCQ 0.25đ, Đúng/Sai lũy tiến, SA 0.25đ). | ✅ ĐẠT |
| **9** | Xem bảng kết quả tổng quan | Hiển thị điểm số, tỷ lệ chính xác, và thời gian làm bài. | ✅ ĐẠT |
| **10** | Xem lại lời giải và phân tích lỗi sai | Hiển thị lời giải chi tiết KaTeX sau khi đã nộp bài thành công. | ✅ ĐẠT |
| **11** | Tạo kế hoạch học tập cá nhân hóa | Planner sinh nhiệm vụ học tập dựa trên lỗ hổng kiến thức thực tế. | ✅ ĐẠT |
| **12** | Hoàn thành một nhiệm vụ luyện tập | Cập nhật tiến độ, lên lịch ôn tập ngắt quãng (Spaced Repetition). | ✅ ĐẠT |
| **13** | Lưu trữ tiến trình học tập | Trạng thái được ghi vào kho lưu trữ bền vững. | ✅ ĐẠT |
| **14** | Đăng xuất và đăng nhập lại | Token cũ bị thu hồi khi đăng xuất; đăng nhập mới cấp phiên mới. | ✅ ĐẠT |
| **15** | Khôi phục dữ liệu trên instance khác | Worker B đọc chính xác dữ liệu do Worker A đã ghi (Durable state). | ✅ ĐẠT |
| **16** | Xác minh cô lập dữ liệu (Student Isolation) | Học sinh A truy cập tài nguyên của Học sinh B bị chặn với HTTP 403 Forbidden. | ✅ ĐẠT |

*Ghi chú Nghiệm thu:* Do 14 câu hỏi chưa có chữ ký duyệt của giáo viên thực tế và chưa kết nối Supabase Cloud Staging, bài kiểm thử này được nghiệm thu là **`DEMO E2E VERIFIED`**, không báo cáo là *Real Student Pilot Verified*.

---

## 3. BẢNG NGHIỆM THU AN NINH ĐÁM MÂY VÀ XÁC THỰC (SECURITY ACCEPTANCE)

| Tiêu chí An ninh Bắt buộc | Phương pháp Kiểm chứng | Kết quả Đạt được | Đánh giá |
| :--- | :--- | :--- | :---: |
| **1. Xác thực Danh tính Phía Server** | Kiểm tra HMAC signature và expiration | Chặn mọi token giả mạo chữ ký hoặc sửa đổi payload. | **PASS** |
| **2. Cô lập Dữ liệu Giữa Người Dùng** | `assertOwnership` và HTTP test | Học sinh A tuyệt đối không truy cập được dữ liệu Học sinh B. | **PASS** |
| **3. Giới hạn Quyền Tài khoản Khách** | Role-based check `role: 'guest'` | Khách không thể thực hiện các thao tác quản trị hoặc ghi đè tài khoản khác. | **PASS** |
| **4. Thu hồi Phiên Bền vững** | Kiểm thử đa worker (Worker A logout -> Worker B từ chối) | Token bị thu hồi không thể tái sử dụng trên bất kỳ worker nào. | **PASS** |
| **5. Tính Nhất quán khi Xóa Tài khoản** | Right to be Forgotten test | Xóa thông tin định danh và thu hồi tức thì toàn bộ phiên active. | **PASS** |
| **6. Khóa Tài khoản Chống Brute-Force** | 5 lần nhập sai liên tiếp | Tự động khóa đăng nhập 15 phút, giải phóng sau thời hạn. | **PASS** |
| **7. Bảo vệ Đáp án Đề thi (Zero Key Leak)** | Sanitize public catalog & exam mode | Tước bỏ 100% đáp án đúng và giải thích trước khi gửi cho học sinh làm bài. | **PASS** |
| **8. Phân quyền Thẩm định viên Sư phạm** | Subject certification check | Reviewer Toán không thể duyệt đề Vật lí; Operator không thể xuất bản đề. | **PASS** |
| **9. Cô lập Dữ liệu Demo/Fixtures** | `EnvironmentConfig.isDemoAllowed` | Test fixtures và reviewer giả định bị từ chối 100% ngoài môi trường test/dev. | **PASS** |
| **10. Chống Nộp Đề thi Trùng lặp** | Idempotent exam submission test | Gửi 2 request đồng thời chỉ ghi nhận duy nhất 1 bản ghi điểm chính thức. | **PASS** |
| **11. Quy trình Thu hồi Nội dung Lỗi** | API `/api/admin/review/:id/rollback` | Thu hồi câu hỏi sai, đánh dấu kiểm toán các bài làm bị ảnh hưởng để xử lý. | **PASS** |
| **12. Kiểm thử Tĩnh SQL Migrations** | `MigrationRunner.validateStaticAll` | 6 migration tiến có transaction block, loại bỏ file rollback 004 khỏi luồng tiến. | **PASS** |
| **13. Xử lý Lỗi Cơ sở Dữ liệu An toàn** | Test connection failure & fallback | Hệ thống không bị crash, in cảnh báo an toàn và fail closed trong production. | **PASS** |
| **14. Chặn Câu hỏi Chưa Duyệt ra Công cộng** | Public question bank query test | Ngân hàng công khai chỉ trả về câu hỏi `status: published` và `verified: true`. | **PASS** |
| **15. Bảo mật Secret Key trên Trình duyệt** | Rà soát bundle script & static files | Không có `SUPABASE_SERVICE_ROLE_KEY` hay database password trong code client. | **PASS** |
