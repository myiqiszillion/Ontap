# NTMK REBUILD — BÁO CÁO NGHIỆM THU ĐIỀU CHỈNH CHÍNH THỨC (PHASE 04A FINAL)

> **Tài liệu:** `docs/rebuild/54-phase-04a-corrective-final.md`  
> **Phiên bản:** Phase 04A Corrective Final Acceptance Report  
> **Thời điểm nghiệm thu:** 12/10/2026  
> **Hội đồng Thẩm định:** Independent Security Auditor, Principal Backend Engineer, EdTech Content Quality Auditor, Supabase Architect và QA Lead.  
> **Quyết định Release Gate:**  
> - **Cấp độ 1 — Internal Engineering Demo:** **`ACCEPTED (INTERNAL DEMO READY)`**  
> - **Cấp độ 2 — Reviewed Topic Practice Pilot:** **`BLOCKED (CHỜ PHÊ DUYỆT SƯ PHẠM THẬT)`**  
> - **Cấp độ 3–5 — Diagnostic, Full Grade & Graduation Exam:** **`BLOCKED`**  
> - **Môi trường Cloud Staging & Public MVP:** **`BLOCKED (CHỜ CREDENTIALS)`**

---

## 1. TỔNG KẾT KHẮC PHỤC CÁC SAI LỆCH VÀ BẰNG CHỨNG THỰC NGHIỆM

| Vấn đề được Auditor chỉ ra | Kết quả Sau khi Khắc phục & Kiểm chứng | Bằng chứng Code & Test |
| :--- | :--- | :--- |
| **1. Chưa có chữ ký thẩm định sư phạm thật cho 14 câu** | Đã thu hồi toàn bộ cờ `published`, chuyển cả 14 câu sang `status: 'needs_review'` với `verifiedBy: null`. Không ngụy tạo tên chuyên gia. | [pilot-questions-data.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/pilot-questions-data.js), [pilot-content-loader.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/ingestion/pilot-content-loader.js), `tests/pilot-content-and-coverage.test.js` |
| **2. Tuyên bố tương thích Supabase Auth chưa chứng minh** | Đã minh bạch hóa kiến trúc: NTMK đang dùng **Custom HMAC-SHA256 Session Token** với mã hóa mật khẩu `scrypt`. Khởi tạo endpoint `/api/v2/auth/info` trả về trạng thái chuẩn xác. | [student-auth.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/auth/student-auth.js), [api/v2/auth.js](file:///c:/Users/Administrator/Documents/Ontap-main/api/v2/auth.js) |
| **3. Thu hồi phiên mất hiệu lực khi chạy đa worker** | Bổ sung cơ chế **Durable State Store** lưu danh sách `revokedTokens` và `revokedUserIds`. Khi Worker A thu hồi phiên hoặc xóa tài khoản, Worker B ngay lập tức từ chối token cũ. | `tests/multi-instance-auth-and-sessions.test.js` (Scenarios B, C, E) |
| **4. Fixture Reviewers có nguy cơ lọt vào production** | Đã thiết lập cơ chế **Production Fixture Isolation**: Khi `NODE_ENV === 'production'`, hệ thống từ chối tải hoặc xác thực mọi reviewer có cờ `isFixture: true`. | [reviewer-directory.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/auth/reviewer-directory.js), `tests/multi-instance-auth-and-sessions.test.js` (Scenario F) |
| **5. Khẳng định PostgreSQL Verified khi chưa có DB thực** | Đính chính trạng thái thành **`SQL AUTHORED & STATICALLY INSPECTED`**. Giữ nguyên Cloud Staging là **`BLOCKED`** cho đến khi có credentials thực tế. | [52-postgres-real-verification-status.md](file:///c:/Users/Administrator/Documents/Ontap-main/docs/rebuild/52-postgres-real-verification-status.md) |
| **6. Gán nhãn Pilot Ready cho học sinh thật khi thiếu bài** | Phân tầng rõ ràng 5 cấp độ sẵn sàng. Hệ thống chỉ công nhận **`INTERNAL DEMO READY`** cho việc kiểm thử kỹ thuật; chặn toàn bộ việc mở đề thi chính thức cho học sinh thật. | [53-pilot-readiness-matrix.md](file:///c:/Users/Administrator/Documents/Ontap-main/docs/rebuild/53-pilot-readiness-matrix.md), [bank-storage.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/bank-storage.js) |

---

## 2. KẾT QUẢ AUTOMATED TESTS SAU KHẮC PHỤC

```text
✔ NTMK PHASE 02D — REAL SUPABASE STAGING & CLOUD ACCEPTANCE GATE (2506ms)
✔ Task 5 & 6 — Pilot Question Bank & Curriculum Coverage (39ms)
✔ Task 9 & 11 — Learning Planner API Contracts & Security Gates (577ms)
✔ Task 1 — Personalized Learning Profile (51ms)
✔ Task 2 — Learning Priority Engine (10ms)
✔ Phase 02B Priority Fixes — Task 1 Verification (61ms)
✔ Scoring Engine — MOET QĐ 764 & Assessment Accuracy (12ms)
✔ Exam Session Manager & Reload Resilience (11ms)
✔ Task 3 & 9 — Student Authentication & Security Gates (1592ms)
✔ Task 3 & 4 — Personalized Study Planner & Schedule Optimizer (50ms)
✔ Task 6 — Multi-Instance Identity & Session Testing (420ms)
✔ Fixture E2E: fetch -> extract -> normalize -> validate -> review -> publish -> exam (84ms)
✔ Question Validator & Schema V2 Integrity (12ms)
✔ Ingestion Pipeline & Review Queue Workflow (11ms)

ℹ tests 222 | suites 50 | pass 222 | fail 0 | cancelled 0 | skipped 0
```

---

## 3. DANH MỤC TÀI LIỆU VÀ BẰNG CHỨNG AUDIT ĐIỀU CHỈNH

1. **Bộ tài liệu Điều chỉnh Nghiệm thu (Phase 04A Corrective Documents):**
   - [docs/rebuild/49-phase-04a-corrective-audit.md](file:///c:/Users/Administrator/Documents/Ontap-main/docs/rebuild/49-phase-04a-corrective-audit.md): Báo cáo audit điều chỉnh toàn diện, phân tích các khẳng định chưa đúng và giải pháp sửa chữa.
   - [docs/rebuild/50-pilot-question-review-integrity.md](file:///c:/Users/Administrator/Documents/Ontap-main/docs/rebuild/50-pilot-question-review-integrity.md): Bảng kiểm kê 14 câu hỏi pilot, lý do thu hồi xuất bản và chuyển về `needs_review`.
   - [docs/rebuild/51-student-auth-and-session-security.md](file:///c:/Users/Administrator/Documents/Ontap-main/docs/rebuild/51-student-auth-and-session-security.md): Báo cáo an ninh xác thực, kiểm thử đa worker, chống brute-force và kế hoạch chuyển đổi Supabase Auth.
   - [docs/rebuild/52-postgres-real-verification-status.md](file:///c:/Users/Administrator/Documents/Ontap-main/docs/rebuild/52-postgres-real-verification-status.md): Đính chính hiện trạng cơ sở dữ liệu PostgreSQL (SQL Authored, Cloud Staging Blocked).
   - [docs/rebuild/53-pilot-readiness-matrix.md](file:///c:/Users/Administrator/Documents/Ontap-main/docs/rebuild/53-pilot-readiness-matrix.md): Ma trận phân cấp 5 tầng sẵn sàng pilot theo phạm vi học tập và độ phủ 12 tổ hợp môn/lớp.
   - [docs/rebuild/54-phase-04a-corrective-final.md](file:///c:/Users/Administrator/Documents/Ontap-main/docs/rebuild/54-phase-04a-corrective-final.md): Biên bản nghiệm thu điều chỉnh chính thức.
2. **File mã nguồn cốt lõi đã gia cố:**
   - [engine/storage/pilot-questions-data.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/pilot-questions-data.js) (Reset 14 câu về `needs_review`, `verifiedBy: null`)
   - [engine/ingestion/pilot-content-loader.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/ingestion/pilot-content-loader.js) (Nạp bản nháp kiểm duyệt minh bạch)
   - [engine/auth/student-auth.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/auth/student-auth.js) (Durable revocation, brute-force rate limit, architecture disclosure)
   - [engine/auth/reviewer-directory.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/auth/reviewer-directory.js) (Cô lập 100% fixture reviewers trong production)
   - [engine/storage/bank-storage.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/bank-storage.js) (Phân tầng `readinessLevel: 'internal_demo_ready'`)
   - [engine/storage/local-state.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/local-state.js) (Khắc phục lỗi EPERM khi ghi file trên Windows)
   - [engine/schema.js](file:///c:/Users/Administrator/Documents/Ontap-main/engine/schema.js) (Bổ sung enum `PENDING` và `NEEDS_REVIEW`)
   - [api/v2/auth.js](file:///c:/Users/Administrator/Documents/Ontap-main/api/v2/auth.js) (Bổ sung thu hồi token khi logout, đổi mật khẩu và xem info)
   - [tests/multi-instance-auth-and-sessions.test.js](file:///c:/Users/Administrator/Documents/Ontap-main/tests/multi-instance-auth-and-sessions.test.js) (7 bài kiểm thử đa worker)
   - [tests/pilot-content-and-coverage.test.js](file:///c:/Users/Administrator/Documents/Ontap-main/tests/pilot-content-and-coverage.test.js) (Kiểm tra độ phủ trung thực)
   - [tests/student-auth-and-security.test.js](file:///c:/Users/Administrator/Documents/Ontap-main/tests/student-auth-and-security.test.js) (11 bài kiểm thử an ninh xác thực)

---

## 4. KẾ HOẠCH BÀN GIAO CHO PHASE 04B

1. **Bước 1 — Mời thẩm định viên sư phạm thực tế:** Kích hoạt tài khoản và mời giáo viên Toán có chứng chỉ sư phạm sử dụng Review Console để thẩm định chính thức 14 câu hỏi pilot Toán 10.
2. **Bước 2 — Cung cấp Supabase Staging Credentials:** Cung cấp biến môi trường `.env` cho staging project, chạy migration script `001` đến `007`, và kích hoạt kiểm thử PostgreSQL cloud.
3. **Bước 3 — Mở Cấp độ 2 (Reviewed Topic Practice Pilot):** Khi 14 câu hỏi có chữ ký thẩm định thực tế và Cloud Staging đã verified, mở cổng luyện tập pilot Toán 10 cho học sinh.
