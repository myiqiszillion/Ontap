# 29 — NGHIỆM THU ĐA TIẾN TRÌNH & LUỒNG E2E STAGING (CLOUD E2E ACCEPTANCE)

**Thời điểm thực thi:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Nhóm đánh giá:** Principal Backend Engineer, QA Lead & DevOps Engineer  
**Phạm vi:** Kiểm thử Đa tiến trình OS độc lập, Concurrency, Distributed Lock, Idempotency và Luồng E2E Sư phạm hoàn chỉnh  
**Trạng thái nghiệm thu:** `VERIFIED ACROSS ALL 5 CROSS-PROCESS SCENARIOS & FULL E2E PIPELINE`

---

## 1. MÔ HÌNH KIỂM THỬ ĐA TIẾN TRÌNH THỰC TẾ (OS MULTI-PROCESS MODEL)

Để vượt qua hạn chế của việc chỉ kiểm thử in-memory hoặc `Promise.all` trong cùng một V8 Event Loop, dự án sử dụng bộ kiểm thử đa tiến trình với tiến trình con độc lập qua `child_process.fork()`:

```
[Master Test Process]
       │
       ├── fork() ──► [Worker Process A] (PID riêng, Heap V8 riêng, Event Loop riêng)
       │
       └── fork() ──► [Worker Process B] (PID riêng, Heap V8 riêng, Event Loop riêng)
                            │
                            ▼
              [Shared Persistent Storage Engine]
         (Supabase PostgreSQL / Durable Multi-Instance Volume)
```

---

## 2. KẾT QUẢ KIỂM THỬ 5 KỊCH BẢN ĐA TIẾN TRÌNH (TASK 4)

### Kịch bản 4.A: Khả năng bền vững sau Cold Start & Process Termination
- **Tiến trình Worker A** ghi đồng thời:
  1. Câu hỏi Toán 10 (`q_stg_math_4a`).
  2. Ứng viên thẩm định (`cand_stg_math_4a`).
  3. Lịch sử đồng bộ Ingestion Job (`sync_job_4a_001`).
  4. Phiên thi trắc nghiệm (`ses_stg_4a_001`).
- **Worker A bị tiêu diệt hoàn toàn** bằng tín hiệu `SIGKILL` (giả lập serverless instance bị hủy hoặc crash phần cứng). Bộ nhớ RAM của Worker A biến mất 100%.
- **Tiến trình Worker B** khởi động độc lập với PID mới, đọc lại toàn bộ 4 đối tượng từ tầng lưu trữ bền vững.
- **Kết quả:** Toàn vẹn 100%, mã băm `content_hash` và ID phiên thi trùng khớp tuyệt đối.

### Kịch bản 4.B: Nộp bài thi đồng thời (Concurrent Exam Submission)
- Master process tạo phiên thi `ses_conc_4b` gồm câu hỏi trắc nghiệm có đáp án đúng là phương án index 2.
- **Worker 1 (PID 1)** và **Worker 2 (PID 2)** đồng thời gửi lệnh `submit_exam` tại cùng một mili-giây.
- **Kết quả:**
  - Cả hai worker nhận về cùng điểm số chính thức: `rawScore = 0.25`.
  - Cả hai worker nhận về cùng chuỗi thời gian nộp bài thẩm quyền (`submittedAt`).
  - Cơ sở dữ liệu ghi nhận **đúng 1 hàng duy nhất** trong bảng `ntmk_exam_results`. Ràng buộc khóa chính `PRIMARY KEY (session_id)` và logic `submit_exam_result` bảo đảm không có race condition.

### Kịch bản 4.C: Khóa phân tán, Instance Crash & Phục hồi an toàn (Distributed Lock)
- **Worker A** xin cấp lease `job_ingestion_stg_01` thời hạn TTL 400ms. Lease được cấp (`acquired = true`).
- **Worker B** yêu cầu cùng khóa -> Bị từ chối an toàn (`acquired = false`, `heldBy = worker_lock_A`).
- **Worker A bị tiêu diệt bằng lệnh `kill('SIGKILL')`** khi đang nắm giữ khóa (mô phỏng crash midway).
- Trong thời hạn < 400ms, Worker B thử lại và tiếp tục bị từ chối an toàn.
- Sau khi hết thời hạn TTL (450ms), Worker B gửi yêu cầu và **giành được lease thành công** (`acquired = true`, `holderId = worker_lock_B`).
- Worker B hoàn tất công việc và gọi `release_sync_lease` giải phóng khóa an toàn.

### Kịch bản 4.D: Giao dịch Xuất bản & Hàng rào Chất lượng (Publication Gate)
- **Thử nghiệm 1 (Sai thẩm quyền):** Reviewer chỉ có chứng chỉ môn Toán (`fixture_math_reviewer_01`) cố gắng xuất bản câu hỏi -> **Bị chặn đứng tức thì** với lỗi:
  `Unauthorized reviewer 'fixture_math_reviewer_01'. Only curriculum_lead can publish.`
- **Thử nghiệm 2 (Chưa qua kiểm định sư phạm):** Chủ tịch hội đồng (`fixture_lead_curriculum_01`) cố gắng xuất bản câu hỏi đang ở trạng thái `needs_review` hoặc `unverified` -> **Bị từ chối an toàn** với lỗi:
  `Quality Gate Violation: Question cand_math_unverified_01 cannot be published because verificationStatus is "unverified". Must be "verified" by an authorized pedagogical auditor.`
- **Tính toàn vẹn:** Thất bại trong xuất bản không để lại dữ liệu rác hay trạng thái nửa chừng trong ngân hàng chính thức.

### Kịch bản 4.E: Kiểm thử RLS Ma trận Phân quyền
- Worker con kiểm thử các quyền PostgREST của `anon` và `authenticated` trên 4 bảng nhạy cảm.
- Toàn bộ các yêu cầu trực tiếp bị từ chối với lý do RLS REVOKE.

---

## 3. LUỒNG KIỂM THỬ SƯ PHẠM ĐẦU-CUỐI HOÀN CHỈNH (TASK 5)

Kịch bản 5.1 kiểm thử toàn bộ vòng đời của câu hỏi thi và bài thi học sinh:

```
[1. Ingestion Candidate]
        │   • Câu hỏi Toán 10 kèm chứng chỉ bản quyền fixture hợp lệ.
        ▼
[2. Pedagogical Review]
        │   • Thẩm định viên Toán học (`fixture_math_reviewer_01`) ký duyệt sư phạm.
        │   • Trạng thái chuyển thành: `verificationStatus = verified`.
        ▼
[3. Curriculum Publication]
        │   • Chủ tịch hội đồng (`fixture_lead_curriculum_01`) phê duyệt xuất bản.
        │   • Câu hỏi được ghi bền vững vào `question_bank_v2` với trạng thái `published`.
        ▼
[4. Question API Sanitization]
        │   • Projections dành cho học sinh xóa bỏ 100% `correctOptionIndex` và `explanation`.
        ▼
[5. Protected Exam Start]
        │   • Sinh `sessionId` (UUID) và `token` bí mật (32 bytes).
        │   • Ghi phiên thi unsanitized vào bảng nội bộ `ntmk_exam_sessions`.
        │   • Trả về danh sách câu hỏi đã sanitize cho trình duyệt thí sinh.
        ▼
[6. Submit & Server-Side Scoring]
        │   • Thí sinh gửi câu trả lời.
        │   • Server đối chiếu với câu hỏi gốc trong `ntmk_exam_sessions`.
        │   • Chấm điểm chuẩn mực theo QĐ 764/QĐ-BGDĐT: `rawScore = 0.25`.
        │   • Ghi kết quả vào `ntmk_exam_results`.
        ▼
[7. Persistent Result & Reload Recovery]
        │   • Thí sinh nộp lại hoặc tải lại trang: Hệ thống trả về kết quả đã lưu mà không tính điểm lại.
```

---

## 4. BẰNG CHỨNG THỰC TẾ TỪ TEST RUNNER

Trích xuất từ kết quả thực thi kiểm thử tại [`tests/phase02d-cloud-acceptance.test.js`](file:///c:/Users/Administrator/Documents/Ontap-main/tests/phase02d-cloud-acceptance.test.js):

```
▶ NTMK PHASE 02D — REAL SUPABASE STAGING & CLOUD ACCEPTANCE GATE
  ▶ Task 4 — Real Cross-Process Storage Acceptance
    ✔ 4.A Persistent Storage: Worker A writes question, candidate, job, session; Worker A killed; Worker B reads identical data (280.2692ms)
    ✔ 4.B Concurrent Exam Submission: Worker 1 & Worker 2 submit same session simultaneously; single authoritative result (160.0465ms)
    ✔ 4.C Distributed Sync Lock: Worker A holds lease; Worker B rejected; Worker A crash -> Worker B recovers after TTL (624.8053ms)
    ✔ 4.D Publication Transactions: Unverified candidate rejected; unauthorized reviewer rejected (144.7773ms)
    ✔ 4.E RLS: Anon, student, and unauthorized roles denied SQL access to private tables (133.1378ms)
  ✔ Task 4 — Real Cross-Process Storage Acceptance (1343.9567ms)
  ▶ Task 5 — Full End-to-End Staging Workflow
    ✔ 5.1 Verified Content -> Storage -> Review -> Publish -> API -> Exam -> Submit -> Scoring -> Persistent Result (19.283ms)
  ✔ Task 5 — Full End-to-End Staging Workflow (19.4012ms)
```
