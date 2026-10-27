# NTMK REBUILD — SUPABASE STAGING, STUDENT IDENTITY & SECURITY HARDENING (PHASE 04A)

> **Tài liệu:** `docs/rebuild/44-staging-and-auth-security.md`  
> **Phiên bản:** Phase 04A Security & Staging Architecture  
> **Thời điểm thẩm định:** 12/10/2026  
> **Trạng thái:** `SECURITY HARDENED` | `SUPABASE STAGING = BLOCKED (NO CLOUD CREDENTIALS)`

---

## 1. MỤC TIÊU & NGUYÊN TẮC BẢO MẬT

Hệ thống xác thực và kiểm soát truy cập của NTMK trong Phase 04A được thiết kế theo các nguyên tắc Zero-Trust và Defense-in-Depth:
1. **Server-Side Authoritative Identity:** Không bao giờ tin cậy `userId` do phía client gửi lên trong request body hoặc query parameters. Mọi quyền sở hữu dữ liệu phải được suy ra từ token phiên đã xác thực (`req.headers.authorization`).
2. **Nguyên tắc giảm thiểu dữ liệu (PII Minimization):** Không bắt buộc thu thập thông tin cá nhân nhạy cảm (số điện thoại, địa chỉ nhà, CMND/CCCD). Học sinh chỉ cần tên định danh/biệt danh và mật khẩu hoặc dùng chế độ Khách ẩn danh.
3. **Mật mã tiêu chuẩn công nghiệp:**
   - Hash mật khẩu bằng `crypto.scrypt` (Salt ngẫu nhiên 16 bytes, N=16384, r=8, p=1, keylen=64).
   - So sánh hash bằng thời gian hằng số `crypto.timingSafeEqual` nhằm triệt tiêu tấn công Timing Attack.
   - Session tokens ký số bằng HMAC-SHA256 với secret key server-side.
4. **Cô lập dữ liệu người dùng (Cross-User Isolation):** Học sinh A tuyệt đối không thể đọc, sửa hoặc xóa hồ sơ, lộ trình học và bài thi của Học sinh B.

---

## 2. KIẾN TRÚC XÁC THỰC VÀ PHÂN QUYỀN

### 2.1. Quản lý Phiên (Session Management)
Hệ thống hỗ trợ 3 trạng thái phiên:
- **Học sinh đã đăng ký (`student`):**
  - Định danh duy nhất: `stu_<uuid>`
  - Phiên có hiệu lực 30 ngày.
  - Được lưu trữ đầy đủ hồ sơ học tập, lịch sử bài làm, mastery estimates.
- **Khách ẩn danh (`guest`):**
  - Định danh duy nhất: `gst_<uuid>`
  - Phiên có hiệu lực 7 ngày.
  - Phục vụ học thử nhanh không cần đăng ký. Dữ liệu được lưu trong phạm vi phiên khách.
- **Quản trị viên / Thẩm định viên (`reviewer`, `admin`):**
  - Được kiểm soát bằng token chứng chỉ sư phạm riêng biệt (`pedagogicalReviewerToken`).
  - Học sinh bình thường hoặc khách không thể tự leo thang đặc quyền (Privilege Escalation).

### 2.2. Nâng cấp và Chuyển giao dữ liệu (Guest to Student Migration)
Khi học sinh trải nghiệm ở chế độ Khách và quyết định đăng ký tài khoản chính thức:
- Endpoint `POST /api/v2/auth/migrate` tiếp nhận `guestToken`.
- Toàn bộ hồ sơ học tập (`learning_profiles`), kế hoạch học tập (`learning_plans`), và kết quả thi tác vụ được chuyển giao an toàn sang tài khoản học sinh mới.
- Khóa phiên khách cũ bị vô hiệu hóa ngay sau khi di chuyển thành công.

### 2.3. Quyền được quên (Right to be Forgotten)
- Endpoint `DELETE /api/v2/auth/account`:
  - Yêu cầu xác thực chính chủ kèm mật khẩu.
  - Tẩy sạch dữ liệu cá nhân (`displayName`, `email`, `passwordHash`).
  - Hủy bỏ tức thời toàn bộ token phiên (`revokedTokens`).

---

## 3. CƠ SỞ DỮ LIỆU & POSTGRESQL MIGRATION 007

Migration `engine/storage/migrations/007_student_auth_and_pilot_content.sql` bổ sung:
- Bảng `ntmk_student_accounts`: Lưu trữ tài khoản học sinh, hash mật khẩu và trạng thái xóa.
- Bảng `ntmk_student_sessions`: Quản lý phiên hoạt động, thời hạn và trạng thái thu hồi.
- Bảng `ntmk_guest_migrations`: Lịch sử kiểm toán chuyển đổi tài khoản khách.
- Bảng `ntmk_pilot_content_audits`: Lịch sử kiểm toán biên soạn và xuất bản câu hỏi pilot.
- **Chính sách Row Level Security (RLS):**
  - Học sinh chỉ có quyền SELECT và UPDATE trên chính `student_id = auth.uid()`.
  - Mọi thao tác sửa đổi `mastery_score` trực tiếp bị chặn ở cấp database.
  - Khách chỉ truy cập dữ liệu liên kết với session token của chính mình.

---

## 4. KẾT QUẢ KIỂM THỬ BẢO MẬT TỰ ĐỘNG

Bộ kiểm thử `tests/student-auth-and-security.test.js` xác nhận 7/7 tiêu chí an ninh:
1. `3.1 Password security`: Hash với salt và xác minh bằng constant-time so sánh thành công (251ms).
2. `3.2 Student registration & login`: Phát hành token có chữ ký mật mã hợp lệ (156ms).
3. `3.3 Token tampering prevention`: Từ chối dứt khoát token bị sửa đổi chữ ký hoặc payload (1.1ms).
4. `3.4 Anonymous Guest Sessions`: Khởi tạo phiên khách bảo mật, không đòi hỏi PII (0.5ms).
5. `3.5 Guest-to-Student upgrade`: Di chuyển an toàn hồ sơ học tập mà không làm mất tiến độ (100ms).
6. `3.6 Cross-User Isolation`: Học sinh A truy cập tài nguyên của Học sinh B bị chặn với HTTP 403 Forbidden (133ms).
7. `3.7 Account Deletion`: Tẩy sạch tài khoản và vô hiệu hóa tức thời mọi phiên truy cập (56ms).

---

## 5. TÌNH TRẠNG SUPABASE STAGING THỰC TẾ

| Tiêu chí | Kết quả Kiểm tra | Ghi chú kỹ thuật |
| :--- | :---: | :--- |
| **PostgreSQL Migration Compatibility** | ✅ Đạt | Migrations 001–007 cú pháp chuẩn PostgreSQL 15+ |
| **Local / Memory Session Storage** | ✅ Đạt | Hoạt động tin cậy trong môi trường phát triển và test runner |
| **TLS Certificate Enforcement** | ✅ Đạt | Không dùng `rejectUnauthorized: false` làm mặc định |
| **Supabase Cloud Staging Project** | ❌ BLOCKED | Chưa cung cấp `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` staging trong `.env` |
| **Cloud RLS & Remote Test Run** | ❌ BLOCKED | Cần credentials staging thực tế để chạy kiểm thử database trên đám mây |

> **Khuyến nghị:** Khi có tài khoản Supabase staging riêng biệt, chỉ cần điền biến môi trường vào `.env` và chạy script migration. Tuyệt đối không chạy migration này trên môi trường Production đang hoạt động.
