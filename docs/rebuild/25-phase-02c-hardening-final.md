# 25 — BÁO CÁO TỔNG KẾT PHASE 02C HARDENING (FINAL HARDENING & ACCEPTANCE ASSESSMENT)

**Thời điểm hoàn tất:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Nhóm đánh giá:** Principal Backend Engineer, Database Security Architect, Supabase Specialist & Independent QA Auditor  
**Repository:** `Ontap-main`  
**Git Commit Hash:** `7f9f5b1c358bfe5ac55727c7acea90cd8c965672`  
**Tình trạng Working Tree:** Có thay đổi và tệp mới cho Phase 02B/02C Hardening; sẵn sàng cho review và commit.  

---

## 1. TỔNG QUAN CÁC KHUYẾT TẬT ĐƯỢC PHÁT HIỆN & ĐÃ SỬA THỰC CHẤT

| STT | Khuyết tật phát hiện trong đợt kiểm toán | Tác động & Rủi ro | Giải pháp kỹ thuật đã triển khai thực tế | Trạng thái sau Hardening |
|---|---|---|---|---|
| **1** | Tuyên bố "Cloud Persistence VERIFIED" khi chỉ dùng `Map()` và file JSON đĩa cục bộ | Ngộ nhận về tính sẵn sàng trên Supabase/PostgreSQL | Xây dựng `SupabasePostgresRepository`, tích hợp Supabase SDK + `pg.Pool`, cấu hình fail-closed khi thiếu thông tin đăng nhập production. | `CONTRACT VERIFIED` / `STAGING BLOCKED` |
| **2** | Kiểm thử concurrency chỉ dùng `Promise.all` trong cùng tiến trình Node.js | Không phản ánh đúng môi trường multi-instance serverless | Viết `tests/cross-process-concurrency.test.js` khởi tạo các tiến trình con OS độc lập (`child_process.fork`), kiểm thử cold restart, concurrent submission, và crash recovery (SIGKILL). | `VERIFIED (Cross-Process OS)` |
| **3** | Khai báo danh tính reviewer thật có học hàm/học vị khi chưa được ủy quyền pháp lý | Vi phạm liêm chính khoa học, tạo chứng chỉ giả định | Thanh lọc 100% tên thật/học vị. Thay bằng test fixtures có tiền tố `fixture_`. Xây dựng quy trình `auditAndRectifyUnverifiedApprovals` hạ cấp câu hỏi bị ảnh hưởng về `needs_review` có audit log. | `VERIFIED (Fixture Identities)` |
| **4** | Phân quyền reviewer phụ thuộc `ADMIN_API_KEY` dùng chung | Lẫn lộn quyền vận hành kỹ thuật với chuyên môn sư phạm | Tách biệt hoàn toàn: `ADMIN_API_KEY` chỉ có quyền hạ tầng; thao tác thẩm định bắt buộc có `X-Reviewer-Token`. Triển khai server-side RBAC theo môn học và vai trò Curriculum Lead. | `VERIFIED (Server-side RBAC)` |
| **5** | RLS Migration nhầm lẫn giữa `REVOKE ALL` và Row Level Security Policies | Thiếu các `CREATE POLICY` tường minh cho `service_role` | Chuẩn hóa toàn bộ migrations 001–004 với transaction boundaries (`BEGIN; COMMIT;`), RLS policies tường minh, RPC functions (`acquire_sync_lease`, `submit_exam_result`), và rollback plan an toàn. | `VERIFIED (Hardened Migrations)` |
| **6** | Endpoint static `/data/*.json` có thể bị gọi trực tiếp bỏ qua exam mode sanitization | Thí sinh có thể đọc đáp án legacy bằng request trực tiếp | Bổ sung middleware chặn `/data/:file` nhận diện `?mode=exam` hoặc `x-exam-mode: true` để lọc bỏ đáp án trước khi phục vụ. | `VERIFIED (Full Sanitization)` |
| **7** | Tuyên bố hoàn thành toàn bộ Phase 02C khi chưa có nguồn đề có bản quyền số | Vi phạm quy tắc Acceptance Separation | Tách biệt tuyệt đối: Live Source Gate giữ nguyên trạng thái `BLOCKED`. Không tự chế tạo hợp đồng hay giấy phép. | `VERIFIED (Separation Gate)` |

---

## 2. MA TRẬN PHÂN LOẠI TRẠNG THÁI NGHIỆM THU CHI TIẾT

Tuân thủ nghiêm ngặt chuẩn mực kiểm toán độc lập, các thành phần hệ thống được phân định rõ ràng theo thang trạng thái:

```
IMPLEMENTED ──► UNIT TESTED ──► INTEGRATION TESTED ──► CONTRACT/PG VERIFIED ──► STAGING VERIFIED ──► PRODUCTION
```

| Hạng mục / Cổng nghiệm thu (Gate) | Trạng thái thẩm định | Minh chứng kỹ thuật & Ranh giới an toàn |
|---|---|---|
| **Question Bank Schema V2 & Validation** | `INTEGRATION TESTED` | Kiểm thử thành công trên MCQ, True/False, Short Answer theo QĐ 764/QĐ-BGDĐT. |
| **Scoring Engine (MOET Matrix & Decimal)** | `INTEGRATION TESTED` | 6/6 tests tính điểm chính xác, dung sai và dấu phẩy thập phân hoạt động chuẩn mực. |
| **Reviewer Directory & RBAC Engine** | `INTEGRATION TESTED` | Phân quyền môn học chặt chẽ, từ chối token giả, thu hồi token tức thì, audit trail bất biến. |
| **Answer-Key Exposure Protection** | `INTEGRATION TESTED` | Toàn bộ 9/9 kịch bản truy vấn đều sanitize đáp án trong exam mode; study mode hoạt động bình thường. |
| **PostgreSQL / Supabase Storage Contract** | `CONTRACT VERIFIED` | `SupabasePostgresRepository` đã hoàn thiện đầy đủ giao tiếp Supabase SDK và PG Pool, migrations 001–004 chuẩn hóa. |
| **Cross-Process Concurrency & Cold Restart** | `VERIFIED` | 3/3 kịch bản đa tiến trình OS (`tests/cross-process-concurrency.test.js`) chạy thực tế thành công. |
| **Supabase Staging Gate** | `BLOCKED` | **Chưa có biến môi trường credentials Supabase Staging**. Không tự ý giả lập kết quả staging. |
| **Live Source Ingestion Gate** | `BLOCKED` | **0 nguồn bên ngoài có hợp đồng bản quyền tái xuất bản số**. Fails closed an toàn. |
| **Production Deployment Gate** | `BLOCKED` | Tuyệt đối không deploy hoặc chạy migration lên production khi Staging Gate và Live Source Gate đang BLOCKED. |

---

## 3. BẢNG MA TRẬN PHÂN QUYỀN RLS TRÊN CƠ SỞ DỮ LIỆU

| Vai trò (Role) | Đọc câu hỏi published | Đọc answer keys | Đọc exam sessions | Ghi kết quả thi | Xem review candidates | Approve câu hỏi | Publish câu hỏi | Chạy Ingestion | Xem Audit Logs |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `anon` (Khách / Chưa đăng nhập) | Sanitized Only | ❌ DENY | ❌ DENY | ❌ Direct SQL | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY |
| `authenticated student` (Học sinh) | Sanitized Only | ❌ DENY | Session của mình | Qua API Server | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY | ❌ DENY |
| `pedagogical auditor` (Thẩm định viên) | ✅ ALLOW | ✅ ALLOW (Môn mình) | ❌ DENY | ❌ DENY | ✅ Môn mình | ✅ Môn mình | ❌ DENY | ❌ DENY | ✅ Môn mình |
| `curriculum_lead` (Chủ tịch hội đồng) | ✅ ALLOW | ✅ ALLOW (Tất cả) | ❌ DENY | ❌ DENY | ✅ Tất cả | ✅ Tất cả | ✅ ALLOW | ❌ DENY | ✅ Tất cả |
| `system_operator` (Vận hành hạ tầng) | Sanitized Only | ❌ Không xem key | ❌ Không xem key | Qua API | ✅ Trạng thái queue | ❌ DENY | ❌ DENY | ✅ ALLOW | ✅ System log |
| `service_role` (Backend server backend) | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full |

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN (AUTOMATED TEST RESULTS)

Toàn bộ **112 / 112 automated tests** trong repository đều vượt qua kiểm tra thực tế, không có bài test nào bị skipped hay giả lập kết quả:

```
ℹ tests 112
ℹ suites 27
ℹ pass 112
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 2176.637
```

### Chi tiết các bộ test chính:
1. `tests/cross-process-concurrency.test.js`: 3 tests đa tiến trình OS độc lập (Cold restart, Concurrent submit, Lock crash recovery).
2. `tests/phase02c-hardening-acceptance.test.js`: 15 tests thẩm định chuyên sâu cho 15 yêu cầu kỹ thuật của Task 9.
3. `tests/phase02c-acceptance.test.js`: 17 tests Phase 02C đã được tinh chỉnh loại bỏ biến giả định.
4. `tests/phase02b-api-acceptance.test.js`: 1 test tích hợp E2E đầy đủ.
5. `tests/scoring.test.js`: 6 tests thuật toán tính điểm QĐ 764.
6. `tests/session-manager.test.js`: 4 tests khả năng chống duplicate submit và reload recovery.
7. `tests/validator-ingestion.test.js`: 6 tests kiểm tra Schema V2, deduplication và pipeline.
8. Các bộ test API, Formula renderer, Blueprint: 58 tests.

---

## 5. CÁC BLOCKER CÒN TỒN TẠI & HƯỚNG DẪN BƯỚC TIẾP THEO

1. **Supabase Staging Credentials:**
   - Cần cấu hình biến môi trường `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` trong môi trường CI/CD hoặc `.env.staging` để thực hiện chạy dry-run migration và mở cổng `Supabase Staging Gate`.
2. **Hợp đồng bản quyền số (Digital Re-publication Licensing):**
   - Live Source Gate tiếp tục giữ ở trạng thái `BLOCKED` cho đến khi có văn bản thỏa thuận pháp lý với chủ sở hữu nguồn đề.
3. **Quy tắc chuyển tiếp:**
   - **Tuyệt đối không triển khai Phase 03** trước khi hai cổng Staging và Live Source được mở với đầy đủ minh chứng độc lập.
