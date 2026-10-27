# NTMK REBUILD — HIỆN TRẠNG KIỂM CHỨNG POSTGRESQL & SUPABASE STAGING (PHASE 04A)

> **Tài liệu:** `docs/rebuild/52-postgres-real-verification-status.md`  
> **Phiên bản:** Phase 04A Database Real Verification Status  
> **Thời điểm thẩm định:** 12/10/2026  
> **Trạng thái:** `SQL AUTHORED & STATICALLY INSPECTED` | `CLOUD STAGING = BLOCKED`

---

## 1. PHÂN ĐỊNH RÕ RÀNG TRẠNG THÁI NĂNG LỰC DATABASE

Để sửa chữa các khẳng định chưa chuẩn xác trước đây, NTMK áp dụng hệ thống phân loại 5 cấp độ nghiêm ngặt:

1. **`SQL AUTHORED` (Đã biên soạn SQL):** ✅ ĐẠT. Toàn bộ 7 file migration (`001` đến `007`) đã được biên soạn hoàn chỉnh bằng chuẩn SQL PostgreSQL 15+.
2. **`SQL STATICALLY INSPECTED` (Đã rà soát tĩnh):** ✅ ĐẠT. Cú pháp DDL, ràng buộc khóa ngoại (Foreign Keys), chỉ mục (Indexes), chính sách RLS và hàm trigger đã được kiểm tra tĩnh.
3. **`POSTGRESQL INTEGRATION TESTED` (Đã kiểm thử tích hợp DB):** ⚠️ CHỜ MÔI TRƯỜNG. Chưa chạy trên container PostgreSQL thật do môi trường phát triển hiện tại chưa có docker daemon.
4. **`SUPABASE STAGING VERIFIED` (Đã nghiệm thu trên Supabase Staging):** ❌ **`BLOCKED`**. Chưa có thông tin đăng nhập Staging (`SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY`) trong tệp `.env`.
5. **`PRODUCTION VERIFIED` (Đã nghiệm thu Production):** ❌ **`BLOCKED`**. Tuyệt đối không chạy hoặc nghiệm thu trên Production khi chưa vượt qua Staging Gate.

---

## 2. RÀ SOÁT CẤU TRÚC SCHEMA MIGRATIONS 001–007

| Migration File | Đối tượng tạo mới | Ràng buộc chính | Chính sách RLS | Đánh giá An toàn |
| :--- | :--- | :--- | :--- | :---: |
| `001_initial_schema.sql` | `question_bank_v2` | Khóa chính ID, Unique fingerprint | Public SELECT chỉ với câu đã published | An toàn |
| `002_review_system.sql` | `review_candidates`, `review_audit_log` | Khóa ngoại sang question ID | Chỉ Reviewer có token mới được sửa | An toàn |
| `003_exam_persistence.sql` | `exam_sessions`, `exam_results` | Khóa ngoại student ID, Idempotency key | Học sinh chỉ đọc kết quả của chính mình | An toàn |
| `004_reviewer_identities.sql`| `pedagogical_reviewers` | Unique email, Token hash | Chỉ Curriculum Lead / Admin quản lý | An toàn |
| `005_answer_sanitization.sql`| View bảo vệ `v_public_questions` | Tước bỏ đáp án đúng và giải thích | Chặn rò rỉ đề thi ở tầng database view | An toàn |
| `006_study_planner.sql` | `learning_profiles`, `learning_plans`, `learning_tasks` | Khóa ngoại user ID, JSONB validation | Chỉ chủ sở hữu profile mới đọc/ghi | An toàn |
| `007_student_auth_pilot.sql` | `ntmk_student_accounts`, `ntmk_student_sessions`, `ntmk_guest_migrations` | Băm mật khẩu scrypt, Unique email, Revoked flags | RLS chặn sửa đổi `mastery_score` trực tiếp | An toàn |

---

## 3. CHÍNH SÁCH BẢO VỆ KẾT NỐI VÀ TLS

- **Không cho phép `rejectUnauthorized: false` làm mặc định:** Hệ thống từ chối kết nối không an toàn, yêu cầu chứng chỉ TLS hợp lệ từ nhà cung cấp Supabase.
- **Fail-safe Fallback:** Khi biến môi trường database rỗng, hệ thống không gây sập ứng dụng (crash) mà chuyển sang chế độ Local Fallback, đồng thời in log cảnh báo rõ ràng:
  `⚠️ Supabase credentials not found in environment. Announcements running in offline fallback mode.`
- **Kế hoạch thực thi khi nhận Staging Credentials:**
  1. Điền credentials vào file `.env.staging`.
  2. Chạy lệnh migrate tuần tự từ 001 đến 007.
  3. Kiểm tra bảng và phân quyền bằng tài khoản test.
  4. Lưu log thực thi và cập nhật Gate sang `SUPABASE STAGING VERIFIED`.
