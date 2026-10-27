# NTMK REBUILD — BÁO CÁO AUDIT ĐIỀU CHỈNH ĐỘC LẬP (PHASE 04A CORRECTIVE AUDIT)

> **Tài liệu:** `docs/rebuild/49-phase-04a-corrective-audit.md`  
> **Phiên bản:** Phase 04A Corrective Audit Report  
> **Thời điểm thẩm định:** 12/10/2026  
> **Đơn vị thẩm định:** Independent Security Auditor, Principal Backend Engineer, EdTech Content Quality Auditor, Supabase Architect và QA Lead.  
> **Trạng thái tổng thể:** `INTERNAL DEMO READY` | `REVIEWED PILOT BLOCKED` | `PUBLIC MVP BLOCKED`

---

## 1. MỤC TIÊU VÀ BỐI CẢNH AUDIT ĐIỀU CHỈNH

Sau đợt thẩm định ban đầu của Phase 04A, quy trình QA phát hiện một số khẳng định kỹ thuật chưa chuẩn xác hoặc thiếu bằng chứng thực nghiệm:
1. **Khẳng định phê duyệt sư phạm:** Ngân hàng 14 câu hỏi Toán 10 được đánh dấu là "đã có chữ ký thẩm định sư phạm" từ `ThS. Trần Hoàng Nam` / `fixture_math_reviewer_01`, nhưng thực chất đây là danh tính giả định (fixture identity) và câu hỏi là bản nháp kỹ thuật (AI-assisted drafts) chứ chưa có thẩm định viên con người ngoài đời thực ký duyệt.
2. **Khẳng định tương thích Supabase Auth:** Hệ thống xác thực thực tế đang dùng custom token HMAC-SHA256 (`ntmk_tok_...`) với thuật toán `scrypt` hashing, chứ không phải Supabase GoTrue Auth hay Supabase JWT chuẩn.
3. **Khẳng định trạng thái PostgreSQL & Cloud Staging:** Mặc dù Cloud Staging đang `BLOCKED` (chưa có credentials), một số tài liệu trước đó vẫn ghi `POSTGRES VERIFIED` hoặc `PRODUCTION VERIFIED`.
4. **Cô lập Test Fixtures:** Reviewer fixtures chưa được cô lập triệt để ở môi trường production.
5. **Độ bền phiên và thu hồi (Session Durability & Revocation):** Việc thu hồi token chỉ nằm trong bộ nhớ RAM, sẽ mất hiệu lực khi chạy đa worker (multi-instance) hoặc khi serverless instance khởi động lại.

Audit điều chỉnh này tiến hành rà soát trung thực, tái cấu trúc mã nguồn để khắc phục toàn bộ các lỗ hổng trên và cập nhật trạng thái nghiệm thu chính xác.

---

## 2. BẢNG ĐỐI CHIẾU CÁC KHẲNG ĐỊNH ĐÃ ĐƯỢC ĐIỀU CHỈNH

| Hạng mục đánh giá | Khẳng định ban đầu (Chưa chính xác) | Trạng thái điều chỉnh trung thực (Sự thật kỹ thuật) | Hành động khắc phục |
| :--- | :--- | :--- | :--- |
| **Thẩm định 14 câu hỏi Toán 10** | "Đã được phê duyệt bởi ThS. Trần Hoàng Nam" | **Bản nháp kỹ thuật (AI-assisted drafts)**; chưa có thẩm định viên sư phạm thật ngoài đời ký duyệt. | Toàn bộ 14 câu được chuyển về `status: 'needs_review'`, `verifiedBy: null`, thu hồi cờ xuất bản giả định. |
| **Kiến trúc Xác thực** | "Custom token tương thích Supabase Auth JWT" | **Custom HMAC-SHA256 Session Token** chạy trên engine Node.js; không phải native Supabase GoTrue JWT. | Bổ sung endpoint `/api/v2/auth/info` công khai kiến trúc thực; lập kế hoạch migration sang Supabase Auth. |
| **Thu hồi Phiên & Đa Worker** | Thu hồi phiên lưu trong RAM Map/Set | **Đã bổ sung cơ chế Durable State Persistence** lưu danh sách `revokedTokens` & `revokedUserIds`. | Worker B đọc được trạng thái thu hồi của Worker A; thêm 7 kịch bản test multi-instance. |
| **Reviewer Fixtures** | Fixture reviewer có thể nạp trong mọi môi trường | **Cô lập 100% trong Production:** Khi `NODE_ENV === 'production'`, từ chối mọi token fixture. | Cập nhật `ReviewerDirectory` loại bỏ fixture và chặn xác thực fixture ở chế độ production. |
| **Trạng thái PostgreSQL** | "POSTGRES VERIFIED" | **`SQL AUTHORED / STATICALLY INSPECTED`**; chưa chạy trên PostgreSQL staging thực do thiếu credentials. | Đính chính trạng thái; giữ Cloud Gate `BLOCKED` một cách minh bạch. |
| **Cấp độ sẵn sàng Pilot** | "PILOT READY (Học sinh thật)" | **`INTERNAL DEMO READY`**; chỉ phục vụ kiểm thử luồng kỹ thuật nội bộ, chưa mở cho học sinh thật. | Cập nhật `readinessLevel: 'internal_demo_ready'` trong `BankStorage.getCoverageMatrix()`. |

---

## 3. TỔNG KẾT KẾT QUẢ KIỂM THỬ SAU ĐIỀU CHỈNH

- **Tổng số automated tests:** **222/222 passed (0 failure)**.
- **Tập test bảo mật xác thực:** 11/11 tests pass (bao gồm rate limiting brute-force, logout revocation, password change revocation, Right-to-be-Forgotten).
- **Tập test đa worker (Multi-Instance):** 7/7 tests pass (kiểm tra Worker A logout / delete account / change password -> Worker B từ chối token).
- **Tập test độ phủ & nội dung:** 6/6 tests pass (kiểm tra trạng thái `needs_review`, 0 câu published giả, độ phủ Toán 10 ở mức `internal_demo_ready`).
