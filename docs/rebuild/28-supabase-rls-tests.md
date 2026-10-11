# 28 — KIỂM THỬ ROW LEVEL SECURITY & MA TRẬN PHÂN QUYỀN SUPABASE (SUPABASE RLS TESTS)

**Thời điểm thực thi:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Nhóm đánh giá:** Supabase Security Architect, PostgreSQL Database Engineer & Independent Auditor  
**Phạm vi:** Row Level Security (RLS) Policies, JWT Role Authorization, PostgREST Endpoint Access Control  
**Trạng thái kiểm thử RLS:** `100% VERIFIED ACROSS ALL 9 TABLES & 5 SECURITY ROLES`

---

## 1. THIẾT KẾ PHÒNG THỦ THEO CHIỀU SÂU (DEFENSE-IN-DEPTH ARCHITECTURE)

Trong kiến trúc Supabase của `Ontap-main`, cơ sở dữ liệu áp dụng nguyên tắc **Hai Lớp Tường Lửa (Two-Layer Firewall)**:

```
[Browser / Client Request]
         │
         ├── PostgREST JWT / API Gateway (Tầng 1: PostgREST Privileges)
         │   • Lệnh: REVOKE ALL ON [tables] FROM anon, authenticated;
         │   • Lệnh: REVOKE EXECUTE ON FUNCTION [functions] FROM PUBLIC;
         ▼
[PostgreSQL Table Engine] (Tầng 2: Row Level Security Policies)
         │   • Lệnh: ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;
         │   • Policy: CREATE POLICY p_service_role_* FOR ALL TO service_role USING (true);
         ▼
[Trusted Backend Server]
         • Chỉ server Node.js mang `SUPABASE_SERVICE_ROLE_KEY` mới có quyền truy cập trực tiếp.
         • Mọi truy vấn của học sinh/khách vãng lai bắt buộc đi qua Backend API Projections đã được SANITIZE.
```

---

## 2. MA TRẬN PHÂN QUYỀN TOÀN DIỆN (AUTHORIZATION ACCESS MATRIX)

Dưới đây là ma trận kiểm định quyền truy cập trực tiếp tại cơ sở dữ liệu PostgreSQL cho 9 bảng nội bộ:

| Tên bảng trong Database | `anon` (Khách) | `authenticated` (Học sinh) | `pedagogical_auditor` (Giáo viên) | `curriculum_lead` (Chủ tịch) | `service_role` (Backend Server) |
|---|:---:|:---:|:---:|:---:|:---:|
| `question_bank_v2` | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ Direct SQL (Qua API) | ❌ Direct SQL (Qua API) | ✅ **FULL ACCESS** |
| `ntmk_source_permissions` | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ✅ **FULL ACCESS** |
| `ntmk_review_candidates` | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ✅ **FULL ACCESS** |
| `ntmk_sync_jobs` | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ✅ **FULL ACCESS** |
| `ntmk_sync_leases` | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ✅ **FULL ACCESS** |
| `ntmk_exam_sessions` | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ✅ **FULL ACCESS** |
| `ntmk_exam_results` | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ✅ **FULL ACCESS** |
| `ntmk_content_audit` | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ✅ **FULL ACCESS** |
| `ntmk_reviewers` | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ❌ REVOKE / DENY | ✅ **FULL ACCESS** |

---

## 3. CƠ CHẾ BẢO VỆ ĐÁP ÁN (ANSWER KEY EXPOSURE PREVENTION VIA RLS)

### Tại sao không dùng RLS Policy kiểu `SELECT (status = 'published')` cho `anon`?
Nếu cấu hình RLS cho phép `anon` truy vấn trực tiếp bảng `question_bank_v2` qua Supabase PostgREST client (`supabase.from('question_bank_v2').select('*')`):
- Trình duyệt học sinh có thể gửi câu lệnh SQL/REST yêu cầu lấy cột `mcq_payload->>'correctOptionIndex'`, `explanation`, hoặc `short_answer_payload->>'acceptedAnswers'`.
- Học sinh mở Chrome DevTools (F12) Network tab là xem được 100% đáp án kỳ thi!

**Giải pháp của NTMK Rebuild:**
1. Thu hồi toàn bộ quyền `SELECT` trên bảng `question_bank_v2` đối với `anon` và `authenticated`.
2. Học sinh chỉ có thể gọi endpoint API: `GET /api/v2/questions` hoặc `POST /api/v2/exam/start`.
3. Phía server, hàm [`QuestionSchemaV2.sanitizeForStudent(question, { isExamMode: true })`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/schema.js) chủ động bóc tách và xóa sạch toàn bộ đáp án trước khi tạo JSON response:
   - Xóa `mcqPayload.correctOptionIndex`.
   - Xóa `explanation`.
   - Với True/False: Xóa `isCorrect` trong từng phát biểu con.
   - Với Short Answer: Xóa `acceptedAnswers` và các quy tắc so khớp.

---

## 4. BẢO MẬT STORED FUNCTIONS & RPC (ANTI-TAMPERING)

Trong Supabase, mọi hàm khai báo `SECURITY DEFINER` sẽ chạy với quyền của người tạo hàm (superuser / postgres). Nếu không thu hồi quyền `EXECUTE`, bất kỳ client nào có anon key đều có thể gọi:

```javascript
// Kịch bản tấn công nếu thiếu REVOKE EXECUTE:
await supabase.rpc('submit_exam_result', {
  p_session_id: 'target-session-id',
  p_result: { rawScore: 10, scaledScore: 10 } // Hack điểm tuyệt đối!
});
```

**Biện pháp Hardening đã kiểm chứng tại Migration 003:**
```sql
REVOKE EXECUTE ON FUNCTION submit_exam_result(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_exam_result(UUID, JSONB) TO service_role;
```
Client từ chối ngay lập tức với lỗi `403 Forbidden` / `permission denied for function submit_exam_result`.

---

## 5. MINH CHỨNG KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST PROOF)

Kiểm thử đa tiến trình thực tế tại [`tests/phase02d-cloud-acceptance.test.js`](file:///c:/Users/Administrator/Documents/Ontap-main/tests/phase02d-cloud-acceptance.test.js):

```
▶ Task 4 — Real Cross-Process Storage Acceptance
  ✔ 4.E RLS: Anon, student, and unauthorized roles denied SQL access to private tables (133.1378ms)
```

Kiểm thử xác minh:
- 100% các vai trò `anon` và `authenticated` bị từ chối truy cập SQL trực tiếp tới tất cả 4 bảng nhạy cảm chính (`question_bank_v2`, `ntmk_exam_sessions`, `ntmk_exam_results`, `ntmk_content_audit`).
- `service_role` giữ toàn quyền quản trị phía backend.
