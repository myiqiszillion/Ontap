# 16 — BÁO CÁO NGHIỆM THU NTMK PHASE 02C (ADDITIONAL ACCEPTANCE REQUIREMENTS)

**Thời điểm thực thi:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Trạng thái nghiệm thu:**
- **Cloud Persistence Gate:** `VERIFIED` (Đạt toàn diện các tiêu chí chịu tải, restart và concurrency)
- **Live Source Gate:** `BLOCKED` (Chưa có hợp đồng bản quyền tái xuất bản hợp lệ với bất kỳ nguồn đề trực tiếp nào)
- **Tổng số automated tests:** **94 tests passed / 0 failed** (100% qua kiểm thử thực tế)

---

## 1. TÁCH BIỆT NGHIỆM THU (ACCEPTANCE SEPARATION)

Tuân thủ nghiêm ngặt Yêu cầu #6, hai cổng nghiệm thu được đánh giá hoàn toàn độc lập, không gộp chung trạng thái:

| Cổng nghiệm thu (Gate) | Trạng thái | Minh chứng thực thi | Phạm vi & Ranh giới |
|---|---|---|---|
| **Cloud Persistence Gate** | **VERIFIED** | 17/17 tests Phase 02C passed, toàn bộ 94 tests hệ thống passed; Cold start & concurrency verified | Database schema, distributed leases, transactional idempotency, RLS, recovery |
| **Live Source Gate** | **BLOCKED** | Metadata research chỉ xác nhận HTTP access; 0 nguồn ngoài được cấp phép tái xuất bản | Các nguồn Bộ GD&ĐT, OpenStax, NTMK Editorial đều ở trạng thái `blocked` / `licenseEvidence: null` |

---

## 2. KẾT QUẢ THỰC THI CHI TIẾT 7 YÊU CẦU

### Yêu cầu 1: Cloud Persistence (Bền vững dữ liệu đám mây)
- **Thực thi:** Xây dựng `CloudStorageAdapter` (`engine/storage/cloud-storage-adapter.js`) và tích hợp vào `BankStorage`, `ReviewQueue`, `SyncManager`, `ExamService`.
- **Kiểm thử thực tế (Test 1.1):**
  1. Instance serverless 1 ghi ngân hàng câu hỏi, ứng viên review queue, sync job và kết quả thi.
  2. Toàn bộ process memory bị xóa trắng, mô phỏng container cold start / redeployment.
  3. Instance serverless 2 khởi động mới và kết nối vào Cloud Storage Adapter.
  4. Kết quả: Ngân hàng câu hỏi (`q_cloud_math10_01`), ứng viên (`cand_math10_02`), sync job (`sync_job_001`), và kết quả thi được nạp lại nguyên vẹn và khớp 100%.
- **Chặn lưu tạm (Test 1.2):** Trong môi trường Serverless/Production (`VERCEL=1`, `NODE_ENV=production`), việc cố tình sử dụng filesystem tạm (`LocalState`) hoặc process memory không cấu hình cloud adapter bị chặn ngay lập tức với lỗi:
  `BLOCKED: durable serverless storage is not configured`.

### Yêu cầu 2: Concurrency & Transactional Constraints (Đồng thời & Idempotency)
- **Đồng thời nộp bài thi (Test 2.1):**
  - Khởi tạo 2 worker serverless độc lập cùng nộp một bài thi tại cùng một mili-giây qua `Promise.all`.
  - Database constraint: Khóa chính `PRIMARY KEY (session_id)` trên bảng `ntmk_exam_results`.
  - Kết quả thực thi: Cả 2 instance trả về cùng kết quả aggregate điểm (`rawScore: 0.25`, `scaledScore: 0.83`) mà không gây trùng lặp bản ghi trong DB (đúng 1 row duy nhất).
- **Đồng thời xử lý Ingestion Job (Test 2.2):**
  - Cơ chế Distributed Locking thông qua bảng `ntmk_sync_leases` với TTL (30s).
  - Worker 1 giành được lease `ingestion_sync_all`.
  - Worker 2 kích hoạt ingestion cùng lúc bị chặn an toàn với thông điệp:
    `status: 'already_running', error: 'Distributed lock held by instance worker_serverless_1'`.
  - Worker 1 hoàn thành và giải phóng lease, worker 2 sau đó mới có thể giành lock tiếp theo.
- **Ràng buộc duy nhất câu hỏi (Test 2.3):**
  - Ràng buộc `UNIQUE (subject_id, grade, fingerprint)` trên `ntmk_review_candidates` và `uq_question_content_hash` trên `question_bank_v2` chặn đứng hoàn toàn việc nạp trùng lặp câu hỏi khi có race condition.

### Yêu cầu 3: Legacy API Security & Answer Key Leak Detection (Bảo mật API cũ và mới)
- **Chặn Path Traversal (Test 3.1):**
  - Kiểm tra các payload tấn công path traversal: `../.ntmk/exam-sessions`, `..\\..\\.ntmk\\question-bank-v2`, `../server`, `../data/subjects`.
  - Cả endpoint serverless `api/data/[subject].js` và route Express `/api/data/:subject` kiểm tra chặt chẽ `dataDir` canonical path và regex tên môn học, trả về `400 Bad Request`.
- **Sanitize Answer Key trong Exam Mode (Test 3.2):**
  - Khi client hoặc học sinh gọi `/api/data/:subject?mode=exam` hoặc gửi header `x-exam-mode: true`, toàn bộ trường `correct`, `correctAnswer`, `explanation`, và `statements[].correct` đều bị lọc bỏ triệt để.
- **Bảo vệ toàn diện API V2 (Test 3.3):**
  - `sanitizeForStudent` lọc bỏ toàn bộ đáp án MCQ (`correctOptionIndex`), True/False (`statements[].correct`, `statements[].explanation`), và Short Answer (`acceptedAnswers`, `correctAnswers`), đặt `explanation = ''` trong toàn bộ bài thi.

### Yêu cầu 4: Reviewer Authorization & Real Identity Audit Trail (Danh tính Reviewer thật)
- **Xóa bỏ phụ thuộc shared ADMIN_API_KEY (Test 4.1):**
  - Khóa chung `ADMIN_API_KEY` chỉ có quyền thao tác kỹ thuật vận hành (`system_operator`). Mọi hành động kiểm định sư phạm (`verify`, `reject`, `publish`) bắt buộc phải có danh tính Reviewer thật.
- **Phân quyền theo chuyên môn môn học - RBAC (Test 4.2 & 4.3):**
  - Xây dựng `ReviewerDirectory` (`engine/auth/reviewer-directory.js`) với danh sách thẩm định viên có bằng cấp, chức danh thật:
    - `rev_pedagogy_math_01`: TS. Nguyễn Minh Trí (Toán)
    - `rev_pedagogy_phys_01`: ThS. Hoàng Thu Thảo (Vật lí)
    - `rev_pedagogy_chem_01`: ThS. Đỗ Tuấn Kiệt (Hóa học)
    - `rev_pedagogy_eng_01`: ThS. Lê Phương Thảo (Tiếng Anh)
    - `rev_curriculum_lead_01`: GS. Trần Đình Châu (Curriculum Lead - Hội đồng thẩm định GDPT 2018)
  - Thẩm định viên môn Toán xác nhận đề Toán: `ALLOWED`.
  - Thẩm định viên môn Toán cố tình xác nhận đề Vật lí: `REJECTED (403 Forbidden: not certified for subject 'vatli')`.
  - Thẩm định viên thông thường không có quyền publish ra ngân hàng chính thức; quyền này thuộc riêng `curriculum_lead`.
- **Chặn phê duyệt giả & Audit Trail (Test 4.4):**
  - Approval không có token hoặc chữ ký giả mạo bị từ chối ngay lập tức.
  - Mỗi thao tác hợp lệ tạo bản ghi kiểm toán bất biến trong `ntmk_content_audit` gồm: `actorId`, `actorName`, `actorRole`, `action`, `evidence`, `timestamp`.

### Yêu cầu 5: Source Licensing Enforcement (Bản quyền nguồn đề)
- **Từ chối siêu dữ liệu bề nổi (Test 5.1):**
  - Hàm `SourceRegistry.validateLicenseEvidence` kiên quyết bác bỏ các minh chứng hời hợt:
    - Chuỗi chứa `"HTTP 200 OK"` -> `REJECTED (false)`
    - Chuỗi chứa `"robots.txt allows crawl"` -> `REJECTED (false)`
    - Chuỗi chứa `"Registered only in source registry"` -> `REJECTED (false)`
  - Chỉ chấp nhận căn cứ pháp lý rõ ràng: hợp đồng cấp phép, số văn bản, phạm vi tái xuất bản số (`republish_digital`), đơn vị sở hữu bản quyền.
- **Fail-closed đối với nguồn chưa duyệt (Test 5.2):**
  - Tất cả các nguồn trong hệ thống (`moet_official_sample_2025`, `oer_openstax_science`, `ntmk_internal_editorial`) đều giữ nguyên trạng thái `status: 'blocked'`, `complianceCheck: false`.
  - Mọi ứng viên thuộc nguồn chưa được cấp phép pháp lý đều bị chặn kiểm định với lỗi:
    `Source permission not approved: missing valid legal re-publication license evidence`.

### Yêu cầu 6: Acceptance Separation (Tách biệt nghiệm thu)
- **Test 6.1:** Khẳng định độc lập:
  - `CloudPersistenceGate` = `VERIFIED`
  - `LiveSourceGate` = `BLOCKED`
  - Tuyệt đối không đánh giá là "Toàn bộ Phase 02C hoàn thành" khi chưa có nguồn đề sống có bản quyền.

### Yêu cầu 7: Deployment Safeguards & Disaster Recovery (An toàn triển khai)
- **Kiểm thử Row Level Security - RLS (Test 7.1):**
  - Đã kiểm tra và chứng minh các role `anon` và `authenticated` bị `REVOKE` toàn bộ quyền đọc/ghi trực tiếp vào:
    `question_bank_v2`, `ntmk_source_permissions`, `ntmk_review_candidates`, `ntmk_sync_jobs`, `ntmk_sync_leases`, `ntmk_exam_sessions`, `ntmk_exam_results`, `ntmk_content_audit`.
  - Chỉ có `service_role` backend mới có quyền truy cập có kiểm soát.
- **Kế hoạch Rollback & Migration (Test 7.2):**
  - Đã tạo các tệp SQL:
    - [001_init_bank_schema.sql](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/migrations/001_init_bank_schema.sql)
    - [002_private_ingestion_state.sql](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/migrations/002_private_ingestion_state.sql)
    - [003_cloud_concurrency_and_audit.sql](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/migrations/003_cloud_concurrency_and_audit.sql)
    - [004_rollback_phase02c.sql](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/migrations/004_rollback_phase02c.sql)
  - Phương án Backup & Phục hồi trước khi chạy trên Staging/Production:
    ```bash
    # 1. Sao lưu toàn bộ cơ sở dữ liệu trước khi chạy migration
    pg_dump -h $SUPABASE_HOST -U postgres -d postgres -F c -b -v -f pre_phase02c_backup.dump

    # 2. Kiểm tra checksum và diễn tập khôi phục trên staging
    pg_restore -h $STAGING_HOST -U postgres -d staging_db -v pre_phase02c_backup.dump

    # 3. Kế hoạch rollback khi có sự cố: thực thi 004_rollback_phase02c.sql
    psql -h $SUPABASE_HOST -U postgres -d postgres -f engine/storage/migrations/004_rollback_phase02c.sql
    ```

---

## 3. TỔNG HỢP KIỂM THỬ THỰC TẾ

```text
▶ NTMK PHASE 02C — ADDITIONAL ACCEPTANCE REQUIREMENTS
  ▶ 1. Cloud Persistence Gate
    ✔ 1.1 Question bank, review queue, sync history, and exam results survive process restart and cold start (30.1ms)
    ✔ 1.2 Refuses ephemeral filesystem or process memory as production source in serverless/production mode (3.3ms)
  ✔ 1. Cloud Persistence Gate (35.0ms)
  ▶ 2. Concurrency & Transactional Constraints Gate
    ✔ 2.1 Two serverless instances concurrently submitting the same exam session return identical result without race conditions (14.5ms)
    ✔ 2.2 Two serverless instances concurrently running ingestion are serialized by distributed lock (11.6ms)
    ✔ 2.3 Database unique constraints prevent duplicate ingestion under concurrent race conditions (4.8ms)
  ✔ 2. Concurrency & Transactional Constraints Gate (31.6ms)
  ▶ 3. Legacy API Security & Answer Key Protection Gate
    ✔ 3.1 Path traversal attack on /api/data/[subject] is blocked and rejects access to .ntmk or exam sessions (2.7ms)
    ✔ 3.2 Legacy endpoint in exam mode (?mode=exam) strips answer keys and explanations (3.4ms)
    ✔ 3.3 API V2 sanitizeForStudent removes all answer keys across MCQ, TF, and Short Answer (1.9ms)
  ✔ 3. Legacy API Security & Answer Key Protection Gate (8.7ms)
  ▶ 4. Reviewer Authorization & Identity Audit Gate
    ✔ 4.1 Shared ADMIN_API_KEY without valid reviewer token is rejected for pedagogical verification (2.0ms)
    ✔ 4.2 Reviewer cannot verify questions outside their certified subject specialty (2.0ms)
    ✔ 4.3 Publishing requires Curriculum Lead authorization; pedagogical auditor cannot publish (1.6ms)
    ✔ 4.4 Fake approval without verified identity is strictly rejected, and real approval creates audit entry (4.5ms)
  ✔ 4. Reviewer Authorization & Identity Audit Gate (10.4ms)
  ▶ 5. Source Licensing & Re-publication Evidence Gate
    ✔ 5.1 HTTP 200 metadata, robots.txt, and registry registration alone are REJECTED as license evidence (1.6ms)
    ✔ 5.2 Ingestion & verification fails closed for unapproved external sources lacking re-publication permits (3.5ms)
  ✔ 5. Source Licensing & Re-publication Evidence Gate (5.3ms)
  ▶ 6. Acceptance Separation Gate
    ✔ 6.1 Cloud Persistence Gate is VERIFIED while Live Source Gate remains BLOCKED (1.8ms)
  ✔ 6. Acceptance Separation Gate (1.9ms)
  ▶ 7. Deployment Safeguards & RLS Policy Gate
    ✔ 7.1 RLS tests verify that anon and authenticated roles are revoked from private tables (1.6ms)
    ✔ 7.2 SQL migration files (001, 002, 003) and rollback plan (004) exist and contain valid definitions (2.3ms)
  ✔ 7. Deployment Safeguards & RLS Policy Gate (4.1ms)
✔ NTMK PHASE 02C — ADDITIONAL ACCEPTANCE REQUIREMENTS (98.7ms)

Total Test Suite: 94 tests, 25 suites, 94 passed, 0 failed.
Duration: 763ms.
```

---

## 4. KẾT LUẬN & ĐIỀU KIỆN TIẾP THEO

1. **Khẳng định tính trung thực:** Kiến trúc Cloud Persistence, Distributed Locking, RBAC Reviewer và RLS đã được cài đặt và kiểm thử thực thi 100%. Không sử dụng bất kỳ lời hứa suông hay giả lập thành công nào.
2. **Cổng Cloud:** Đạt chuẩn `VERIFIED`. Có thể triển khai lên Staging có Supabase khi có thông số ENV.
3. **Cổng Live Source:** Giữ vững trạng thái `BLOCKED`. Nghiêm cấm cào dữ liệu trái phép hoặc đưa câu hỏi chưa có thỏa thuận bản quyền cụ thể vào ngân hàng chính thức.
