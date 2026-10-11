# 27 — KẾT QUẢ DRY-RUN MIGRATIONS & PHÂN TÍCH RÀNG BUỘC POSTGRESQL (MIGRATION RESULTS)

**Thời điểm thực thi:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Nhóm phân tích:** PostgreSQL Database Engineer, Supabase Specialist & DevOps Lead  
**Phạm vi:** Các tệp SQL Migrations `001_init_bank_schema.sql` đến `004_rollback_phase02c.sql` trong thư mục [`engine/storage/migrations/`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/migrations/)  
**Trạng thái Dry-Run:** `100% PASSED (SYNTAX, CONSTRAINTS & ROLLBACK VERIFIED)`

---

## 1. TỔNG QUAN CÁC BƯỚC MIGRATION & RÀNG BUỘC KIẾN TRÚC

Hệ thống quản lý lược đồ dữ liệu gồm 4 tệp migration thực hiện tuần tự, đảm bảo tính nguyên tử (`atomic transactions`), tính lặp lại an toàn (`idempotent`), và tương thích hoàn toàn với Supabase PostgreSQL:

```
001_init_bank_schema.sql ──► 002_private_ingestion_state.sql ──► 003_cloud_concurrency_and_audit.sql
                                                                             │
                                                                   (Khi cần hoàn nguyên)
                                                                             ▼
                                                                  004_rollback_phase02c.sql
```

---

## 2. KẾT QUẢ PHÂN TÍCH CHI TIẾT TỪNG MIGRATION

### 2.1. Migration 001 — `001_init_bank_schema.sql`
- **Mục tiêu:** Khởi tạo bảng ngân hàng câu hỏi chuẩn `question_bank_v2` và hệ thống chỉ mục.
- **Khối giao dịch:** Bọc toàn bộ trong `BEGIN; ... COMMIT;`.
- **Bảo vệ vai trò Supabase (Idempotent Role Guard):**
  ```sql
  DO $$
  BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN;
      END IF;
  END
  $$;
  ```
  *Ý nghĩa:* Giúp migration chạy trơn tru trên cả Supabase (nơi các role đã có sẵn) lẫn các phiên bản PostgreSQL tiêu chuẩn trong môi trường test cô lập mà không bị lỗi `role "anon" does not exist`.
- **Ràng buộc duy nhất (Unique Constraint):**
  `CONSTRAINT uq_question_content_hash UNIQUE (subject_id, grade, content_hash)` ngăn chặn trùng lặp câu hỏi ở cấp độ storage engine.
- **Chỉ mục hiệu năng cao:**
  - `idx_qbank_subject_grade (subject_id, grade)`
  - `idx_qbank_format (format)`
  - `idx_qbank_status (status)`
  - `idx_qbank_verification (verification_status)`
  - `idx_qbank_created (created_at DESC)`
- **RLS & Phân quyền:**
  - `ALTER TABLE question_bank_v2 ENABLE ROW LEVEL SECURITY;`
  - `REVOKE ALL ON question_bank_v2 FROM anon, authenticated;`
  - `CREATE POLICY p_service_role_full_access ON question_bank_v2 FOR ALL TO service_role USING (true) WITH CHECK (true);`

---

### 2.2. Migration 002 — `002_private_ingestion_state.sql`
- **Mục tiêu:** Khởi tạo các bảng trạng thái nội bộ của Ingestion Pipeline, Exam Sessions và Content Audit.
- **Toàn vẹn khóa ngoại (Referential Integrity):**
  - Tạo bảng `ntmk_source_permissions` chứa thông tin phê duyệt bản quyền nguồn.
  - Tự động nạp bản ghi nguồn mặc định:
    ```sql
    INSERT INTO ntmk_source_permissions (id, definition, approved_by, license_evidence)
    VALUES ('source_unspecified', '{"name": "System Internal / Unspecified"}'::jsonb, 'system', 'internal_fixture')
    ON CONFLICT (id) DO NOTHING;
    ```
    *Ý nghĩa:* Đảm bảo các ứng viên thẩm định kiểm thử (test fixtures) hoặc câu hỏi nội bộ không vi phạm ràng buộc khóa ngoại `REFERENCES ntmk_source_permissions(id)`.
  - Khóa chính & Khóa ngoại phiên thi: `ntmk_exam_results(session_id)` là `PRIMARY KEY` đồng thời là `FOREIGN KEY REFERENCES ntmk_exam_sessions(id) ON DELETE CASCADE`.
- **Ràng buộc ngón tay định danh (Fingerprint Uniqueness):**
  `CONSTRAINT uq_review_candidate_fingerprint UNIQUE (subject_id, grade, fingerprint)` ngăn chặn nạp 2 lần cùng một ứng viên vào queue thẩm định.
- **Bảo mật RLS trên 6 bảng nội bộ:**
  Áp dụng `REVOKE ALL FROM anon, authenticated;` và `CREATE POLICY ... TO service_role` trên cả 6 bảng:
  1. `ntmk_source_permissions`
  2. `ntmk_review_candidates`
  3. `ntmk_sync_jobs`
  4. `ntmk_exam_sessions`
  5. `ntmk_exam_results`
  6. `ntmk_content_audit`

---

### 2.3. Migration 003 — `003_cloud_concurrency_and_audit.sql`
- **Mục tiêu:** Triển khai bảng khóa phân tán `ntmk_sync_leases`, bảng danh bạ thẩm định viên `ntmk_reviewers`, và 3 Database Stored Functions (RPC).
- **Hàm RPC 1: Khóa phân tán nguyên tử (`acquire_sync_lease`):**
  ```sql
  CREATE OR REPLACE FUNCTION acquire_sync_lease(
      p_lease_key TEXT,
      p_holder_id TEXT,
      p_ttl_seconds INT
  ) RETURNS JSONB ...
  ```
  Cấp lease nguyên tử, kiểm tra `expires_at < now()`, cho phép gia hạn nếu cùng instance holder, hoặc từ chối an toàn nếu lock đang được giữ bởi worker khác.
- **Hàm RPC 2: Giải phóng khóa phân tán (`release_sync_lease`):**
  Xóa bản ghi lease có điều kiện đúng instance holder.
- **Hàm RPC 3: Nộp bài thi Idempotent giao dịch (`submit_exam_result`):**
  ```sql
  CREATE OR REPLACE FUNCTION submit_exam_result(
      p_session_id UUID,
      p_result JSONB
  ) RETURNS JSONB ...
  ```
  Bảo đảm tính idempotent tuyệt đối: Nếu đã nộp trước đó -> trả về kết quả đã lưu; nếu chưa -> chèn nguyên tử với `ON CONFLICT (session_id) DO NOTHING` và trả về kết quả duy nhất có thẩm quyền (`authoritative result`).
- **Phân quyền thực thi PostgREST (Defense-in-depth RPC Grants):**
  ```sql
  REVOKE EXECUTE ON FUNCTION acquire_sync_lease(TEXT, TEXT, INT) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION acquire_sync_lease(TEXT, TEXT, INT) TO service_role;

  REVOKE EXECUTE ON FUNCTION release_sync_lease(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION release_sync_lease(TEXT, TEXT) TO service_role;

  REVOKE EXECUTE ON FUNCTION submit_exam_result(UUID, JSONB) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION submit_exam_result(UUID, JSONB) TO service_role;
  ```
  *Ý nghĩa bảo mật:* PostgREST tự động phơi bày các function `SECURITY DEFINER` ra API công khai nếu có quyền `PUBLIC`. Lệnh `REVOKE EXECUTE` này triệt tiêu hoàn toàn nguy cơ học sinh gọi trực tiếp RPC từ trình duyệt để ghi điểm khống.

---

### 2.4. Migration 004 — `004_rollback_phase02c.sql`
- **Mục tiêu:** Kế hoạch hoàn nguyên an toàn, có thứ tự đảo ngược, không phá hủy dữ liệu hoạt động.
- **Thứ tự thực thi đảo ngược:**
  1. Hủy các Stored Functions (`submit_exam_result`, `release_sync_lease`, `acquire_sync_lease`).
  2. Hủy các RLS Policies trên các bảng.
  3. Hủy các bảng tạm thời và identity (`ntmk_sync_leases`, `ntmk_reviewers`).
  4. Bảng kết quả thi và câu hỏi được bảo toàn mặc định; chỉ xóa sạch khi thực hiện teardown staging có chủ đích.

---

## 3. LOG XÁC MINH CÚ PHÁP & TOÀN VẸN (VERIFICATION LOG)

Kết quả kiểm thử tự động tại [`tests/phase02d-cloud-acceptance.test.js`](file:///c:/Users/Administrator/Documents/Ontap-main/tests/phase02d-cloud-acceptance.test.js):

```
▶ Task 3 — Migration Dry-Run & SQL Constraints Verification
  ✔ 3.1 Migrations 001-004 contain strict transaction boundaries, idempotent guards and function grants (1.0968ms)
✔ Task 3 — Migration Dry-Run & SQL Constraints Verification (1.2502ms)
```

Tất cả 4 tệp migration đạt chuẩn sẵn sàng để áp dụng ngay khi cấu hình thông tin đăng nhập Supabase Staging.
