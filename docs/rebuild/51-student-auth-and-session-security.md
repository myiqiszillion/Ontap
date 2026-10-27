# NTMK REBUILD — KIỂM ĐỊNH AN NINH XÁC THỰC VÀ BẢO VỆ PHIÊN HỌC SINH (PHASE 04A)

> **Tài liệu:** `docs/rebuild/51-student-auth-and-session-security.md`  
> **Phiên bản:** Phase 04A Student Auth & Session Security Audit  
> **Thời điểm thẩm định:** 12/10/2026  
> **Trạng thái:** `SECURITY HARDENED` | `MULTI-INSTANCE TESTED` | `CUSTOM HMAC TOKEN DISCLOSED`

---

## 1. TỔNG QUAN KIẾN TRÚC XÁC THỰC THỰC TẾ

| Tiêu chí | Trạng thái Thực tế trong Codebase | Đánh giá & Rủi ro |
| :--- | :--- | :--- |
| **Giao thức Xác thực** | **Custom HMAC-SHA256 Session Token** (`ntmk_tok_...`) | Không phải native Supabase GoTrue Auth. Hoạt động trên môi trường Node.js. |
| **Mã hóa Mật khẩu** | `crypto.scryptSync` (Salt 16B, N=16384, r=8, p=1, keylen=64) | Chuẩn công nghiệp; an toàn trước brute-force phần cứng; so sánh bằng `timingSafeEqual`. |
| **Chống Brute-force Login** | Khóa tạm thời 15 phút sau 5 lần nhập sai liên tiếp | Đã triển khai và có test kiểm chứng tự động (`test 3.10`). |
| **Thời hạn Phiên (TTL)** | 7 ngày (có thể cấu hình) | Token chứa trường `exp` dạng timestamp mili-giây. |
| **Độ bền Thu hồi (Revocation)** | **Durable State Store** (`revokedTokens`, `revokedUserIds`) | Khắc phục rủi ro mất phiên khi restart worker hoặc chạy đa node serverless. |
| **Quyền được quên** | Xóa sạch định danh, băm mật khẩu và vô hiệu hóa tức thì toàn bộ token phiên | Tuân thủ triệt để GDPR / PDPA nguyên tắc bảo vệ dữ liệu học sinh. |

---

## 2. KẾT QUẢ KIỂM THỬ ĐA WORKER (MULTI-INSTANCE TESTING)

Bộ kiểm thử `tests/multi-instance-auth-and-sessions.test.js` đã chứng minh tính an toàn khi triển khai trên nhiều worker instances cùng chia sẻ durable state:

1. **Kịch bản A (Cross-User Isolation):** Học sinh A không thể đọc/sửa tài nguyên của Học sinh B (chặn bằng HTTP 403 Forbidden).
2. **Kịch bản B (Đăng xuất trên Worker A, gửi token đến Worker B):** Khi Worker A gọi `logout(token)`, Worker B đồng bộ durable store và lập tức từ chối token cũ.
3. **Kịch bản C (Xóa tài khoản trên Worker A):** Worker B từ chối mọi request tiếp theo từ token của tài khoản đã xóa.
4. **Kịch bản D (Nâng cấp tài khoản Khách):** Chuyển giao hồ sơ học tập và kế hoạch sang tài khoản học sinh an toàn, không trùng lặp.
5. **Kịch bản E (Đổi mật khẩu trên Worker A):** Mọi phiên đăng nhập cũ trên Worker B đều bị thu hồi tức thì, buộc người dùng phải đăng nhập lại với mật khẩu mới.
6. **Kịch bản F (Cô lập Reviewer Fixture trong Production):** Khi `NODE_ENV === 'production'`, toàn bộ reviewer fixture (`tok_fixture_...`) bị vô hiệu hóa hoàn toàn.
7. **Kịch bản G (Chống Giả mạo Client):** Client tự ý sửa `userId` hoặc `role: 'admin'` trong payload base64 sẽ bị từ chối do chữ ký HMAC không khớp.

---

## 3. ĐỐI CHIẾU VỚI SUPABASE AUTH VÀ KẾ HOẠCH CHUYỂN ĐỔI (MIGRATION PLAN)

### 3.1. Điểm khác biệt giữa Custom Token và Native Supabase Auth
- **Supabase Auth JWT:** Do dịch vụ GoTrue của Supabase phát hành, mang chữ ký RS256 hoặc HS256 với các claim chuẩn: `aud: 'authenticated'`, `role: 'authenticated'`, `app_metadata`, `user_metadata`. Supabase RLS trong PostgreSQL trực tiếp đọc `auth.uid()` từ claim `sub`.
- **Custom Token hiện tại:** Do server Node.js phát hành với prefix `ntmk_tok_`. Mặc dù server-side có thể kiểm soát và chuyển tiếp thông tin định danh, đây chưa phải là native Supabase Auth.

### 3.2. Lộ trình Chuyển đổi khi có Supabase Staging Credentials
1. **Bước 1 (Đấu nối GoTrue):** Cấu hình `@supabase/supabase-js` trong `engine/auth/supabase-auth-adapter.js`.
2. **Bước 2 (Chuyển đổi Tài khoản Khách):** Sử dụng tính năng Supabase Anonymous Sign-ins để duy trì trải nghiệm Guest mode không cần email.
3. **Bước 3 (Liên kết Tài khoản Học sinh):** Đồng bộ `auth.users` của Supabase với bảng `ntmk_student_accounts` mà không làm mất lịch sử học tập hiện có.
4. **Bước 4 (Kích hoạt Cloud RLS):** Chuyển việc kiểm soát quyền sở hữu từ middleware Node.js sang các chính sách RLS trong PostgreSQL dựa trên `auth.uid() = student_id`.
