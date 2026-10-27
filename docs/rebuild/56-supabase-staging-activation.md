# NTMK REBUILD — HƯỚNG DẪN KÍCH HOẠT VÀ NGHIỆM THU SUPABASE STAGING (PHASE 04B)

> **Tài liệu:** `docs/rebuild/56-supabase-staging-activation.md`  
> **Phiên bản:** Phase 04B Supabase Staging Activation Runbook  
> **Thời điểm thẩm định:** 12/10/2026  
> **Tác giả:** Supabase Architect, DevOps Engineer & Security Auditor  
> **Trạng thái hiện tại:** `STAGING GATE = BLOCKED (CHỜ CREDENTIALS HỢP LỆ TỪ QUẢN TRỊ VIÊN)`

---

## 1. NGUYÊN TẮC BẢO VỆ MÔI TRƯỜNG CLOUD

1. **Tuyệt đối không dùng Production thay Staging:** Dự án Staging phải là một tổ chức (organization) hoặc project riêng biệt trên Supabase, không chia sẻ database hoặc service keys với bất kỳ hệ thống production nào.
2. **Không tự tạo credentials giả lập:** Không điền các chuỗi ngẫu nhiên vào file `.env` rồi báo cáo "đã kết nối staging".
3. **Bảo mật biến môi trường:** Tuyệt đối không commit credentials, database passwords hoặc `SUPABASE_SERVICE_ROLE_KEY` vào Git.
4. **Bắt buộc kiểm tra chứng chỉ TLS:** Kết nối direct và pooler phải bật kiểm tra chứng chỉ TLS (`sslmode=require`), không sử dụng `rejectUnauthorized: false` làm mặc định ngoài môi trường phát triển cục bộ.

---

## 2. QUY TRÌNH 6 BƯỚC THIẾT LẬP DỰ ÁN SUPABASE STAGING

### Bước 1: Khởi tạo Project trên Supabase Dashboard
1. Truy cập [database.new](https://database.new) hoặc [app.supabase.com](https://app.supabase.com).
2. Tạo project mới với các thông số:
   - **Tên dự án:** `ntmk-staging-ap-se1`
   - **Database Password:** Khởi tạo mật khẩu ngẫu nhiên tối thiểu 24 ký tự (gồm chữ hoa, chữ thường, chữ số, ký tự đặc biệt).
   - **Region:** `Southeast Asia (Singapore) - ap-southeast-1` (tối ưu hóa độ trễ cho người dùng tại Việt Nam).
   - **Pricing Plan:** Free hoặc Pro (tùy theo chính sách hạ tầng trường học).

### Bước 2: Thu thập Thông tin Kết nối
Truy cập **Project Settings**:
1. **API Settings (`Project Settings -> API`):**
   - `Project URL`: `https://<project-ref>.supabase.co`
   - `anon public key`: Dùng cho client-side (chỉ đọc dữ liệu công khai).
   - `service_role key`: Dùng riêng cho Node.js serverless backend (bảo mật tuyệt đối, không chia sẻ cho client).
2. **Database Settings (`Project Settings -> Database -> Connection String`):**
   - **Direct Connection (Port 5432):** Dùng để chạy migration DDL và backup:
     `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require`
   - **Transaction Pooler (Port 6543):** Dùng cho ứng dụng Vercel Serverless để tránh cạn kiệt connection pool:
     `postgresql://postgres.<project-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`

### Bước 3: Cấu hình File Môi trường `.env.staging`
Tạo file `.env.staging` (nằm trong `.gitignore`):
```bash
NODE_ENV=staging
PORT=3000

SUPABASE_URL=https://<your-staging-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-staging-service-role-key>

DATABASE_URL=postgresql://postgres.<your-staging-ref>:<password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_SSL=true
PG_POOL_MAX=10

ADMIN_API_KEY=<random-32-bytes-admin-key>
```

---

## 3. PHÂN TÍCH TÁC ĐỘNG VÀ THỨ TỰ THI CÔNG MIGRATIONS 001–007

### Cảnh báo Vận hành Đặc biệt:
> [!CAUTION]
> Tệp `004_rollback_phase02c.sql` là **tệp hoàn tác (Rollback script)**, KHÔNG PHẢI migration tiến (Forward migration)!  
> Tuyệt đối không chạy file `004` trong luồng migration tiến vì nó sẽ xóa các đối tượng RPC và bảng của `002` và `003`.

### Bảng Thứ tự Thi công Forward Migrations Chuẩn hóa:

| Thứ tự | Tệp Migration | Mục tiêu Schema | Các bảng & đối tượng tạo mới | Tác động dữ liệu |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `001_init_bank_schema.sql` | Khởi tạo bảng ngân hàng câu hỏi | `question_bank_v2`, RLS policies, unique content hash | An toàn, không xóa bảng cũ |
| **2** | `002_private_ingestion_state.sql` | Quản lý bản nháp và phiên làm bài | `ntmk_source_permissions`, `ntmk_review_candidates`, `ntmk_sync_jobs`, `ntmk_exam_sessions`, `ntmk_exam_results`, `ntmk_content_audit` | Thêm mới 6 bảng và 6 chính sách RLS |
| **3** | `003_cloud_concurrency_and_audit.sql` | Khóa phân tán và hàm RPC | `ntmk_sync_leases`, `ntmk_reviewers`, Functions: `acquire_sync_lease`, `release_sync_lease`, `submit_exam_result` | Bổ sung RPC Functions và RBAC |
| **4** | `005_diagnostic_skill_graph.sql` | Cây kỹ năng và đánh giá chẩn đoán | `ntmk_curriculum_skills`, `ntmk_skill_prerequisites`, `ntmk_diagnostic_sessions`, `ntmk_diagnostic_results`, `ntmk_skill_evidence`, `ntmk_skill_mastery_snapshots` | Khởi tạo Knowledge Graph GDPT 2018 |
| **5** | `006_personalized_learning_planner.sql` | Kế hoạch học tập cá nhân hóa | `ntmk_learning_profiles`, `ntmk_learning_plans`, `ntmk_learning_plan_versions`, `ntmk_learning_tasks`, `ntmk_learning_task_events`, `ntmk_practice_sessions`, `ntmk_review_schedules`, `ntmk_study_progress_snapshots` | Bổ sung Study Planner Engine |
| **6** | `007_student_auth_and_pilot_content.sql` | Xác thực học sinh & Audit nội dung | `ntmk_student_accounts`, `ntmk_student_sessions`, `ntmk_guest_migrations`, `ntmk_pilot_content_audits` | Bổ sung RLS self-isolation cho học sinh |

---

## 4. QUY TRÌNH DIỄN TẬP SAO LƯU VÀ HOÀN TÁC (BACKUP & ROLLBACK REHEARSAL)

Trước khi thực hiện bất kỳ migration nào trên staging:

### 1. Tạo Bản sao lưu An toàn (Pre-Migration Snapshot):
```bash
pg_dump -h db.<staging-ref>.supabase.co -U postgres -d postgres -F c -b -v -f backup_staging_pre_migration_$(date +%Y%m%d_%H%M%S).dump
```

### 2. Chạy Kiểm tra Tĩnh (Dry-run Validation):
```bash
node engine/storage/migration-runner.js --validate
```
*Kết quả bắt buộc:* `valid: true, errors: 0, 6 files verified`.

### 3. Thực thi Forward Migrations:
Sử dụng script Migration Runner đã chuẩn hóa:
```bash
node engine/storage/migration-runner.js --apply
```
Hoặc chạy tuần tự qua `psql`:
```bash
psql "$DATABASE_URL" -f engine/storage/migrations/001_init_bank_schema.sql
psql "$DATABASE_URL" -f engine/storage/migrations/002_private_ingestion_state.sql
psql "$DATABASE_URL" -f engine/storage/migrations/003_cloud_concurrency_and_audit.sql
psql "$DATABASE_URL" -f engine/storage/migrations/005_diagnostic_skill_graph.sql
psql "$DATABASE_URL" -f engine/storage/migrations/006_personalized_learning_planner.sql
psql "$DATABASE_URL" -f engine/storage/migrations/007_student_auth_and_pilot_content.sql
```

### 4. Diễn tập Kịch bản Hoàn tác Khẩn cấp (Rollback Rehearsal):
Nếu xảy ra xung đột schema nghiêm trọng trong giai đoạn kiểm thử:
```bash
psql "$DATABASE_URL" -f engine/storage/migrations/004_rollback_phase02c.sql
```
Xác nhận sau rollback:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ntmk_%';
```

---

## 5. BẢNG CHECKLIST NGHIỆM THU SAU KHI KÍCH HOẠT DATABASE

Quản trị viên cần tích chọn toàn bộ các mục sau khi database staging đã chạy:

- [ ] **Kết nối TLS:** Kết nối thành công với `sslmode=require` và chứng chỉ hợp lệ.
- [ ] **Bảng dữ liệu (27 bảng):** Đủ 27 bảng dữ liệu (`question_bank_v2`, `ntmk_student_accounts`, `ntmk_learning_profiles`, v.v.).
- [ ] **Chính sách RLS (20 policies):** Đã kích hoạt Row-Level Security trên tất cả các bảng dữ liệu học sinh và phiên làm bài.
- [ ] **Hàm RPC (3 functions):** `acquire_sync_lease`, `release_sync_lease`, `submit_exam_result` sẵn sàng thực thi.
- [ ] **Chỉ mục Index (26 indexes):** Tối ưu hóa truy vấn cho email, token, user ID, skill ID và hạn nộp.
- [ ] **Khả năng Bền vững qua Khởi động lại:** Khởi động lại Node server hoặc ngắt kết nối tạm thời; dữ liệu phiên vẫn được bảo toàn trọn vẹn.
- [ ] **Chống Nộp trùng Lặp Đồng thời:** Hai request nộp bài cùng lúc cho 1 session ID chỉ ghi nhận 1 kết quả duy nhất.
- [ ] **Cô lập Dữ liệu Giữa các Học sinh:** Token của Học sinh A không thể đọc bảng `ntmk_student_accounts` hoặc profile của Học sinh B qua RLS.
- [ ] **Không Rò rỉ Đáp án:** View bảo vệ hoặc API không trả về đáp án đúng trong chế độ thi.

Khi toàn bộ checklist trên hoàn thành, chuyển trạng thái `SUPABASE STAGING GATE` sang **`VERIFIED`**.
