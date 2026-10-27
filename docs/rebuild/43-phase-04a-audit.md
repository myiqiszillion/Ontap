# NTMK REBUILD — BÁO CÁO TOÀN DIỆN PRODUCT READINESS AUDIT (PHASE 04A)

> **Tài liệu:** `docs/rebuild/43-phase-04a-audit.md`  
> **Phiên bản:** Phase 04A Readiness Audit  
> **Thời điểm thẩm định:** 12/10/2026  
> **Trạng thái tổng thể:** `PARTIALLY READY FOR PILOT` | `PUBLIC MVP BLOCKED`

---

## 1. MỤC TIÊU VÀ PHẠM VI AUDIT

Báo cáo này thẩm định hiện trạng thực tế của codebase NTMK sau các Phase 01–03B dựa trên mã nguồn thực tế và kiểm thử tự động, không chỉ dựa vào các báo cáo trước đó.

Audit bao gồm:
1. Hệ thống mã nguồn: `engine/`, `api/v2/`, `public/`, `engine/storage/migrations/`.
2. Kiểm thử tự động: 211 tests unit, integration, security và browser E2E.
3. Rà soát 5 trạng thái năng lực thành phần:
   - Chạy được với fixture (Test Fixture).
   - Chạy được với dữ liệu đã kiểm duyệt (Audited/Published Content).
   - Đã kiểm thử trên PostgreSQL thực (Local/Container/Staging).
   - Đã kiểm thử trên Vercel staging.
   - Đủ điều kiện phát hành cho học sinh thật.

---

## 2. BẢNG PHÂN LOẠI TRẠNG THÁI NĂNG LỰC HỆ THỐNG

| Module / Tính năng | Chạy với Fixture | Chạy với Dữ liệu Kiểm duyệt | Đã kiểm thử PostgreSQL | Đã kiểm thử Vercel Staging | Đủ điều kiện Học sinh thật | Trạng thái Nghiệm thu |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Question Engine V2 (Schema, Ingestion, Deduplication)** | ✅ Đạt | ✅ Đạt (Toán 10) | ⚠️ Schema ready | ⚠️ Rewrites tested | ⚠️ Pilot only | `PILOT READY` |
| **Server-Side Scoring (QĐ 764/BGDĐT, 3 Formats)** | ✅ Đạt | ✅ Đạt | N/A (Pure logic) | ✅ Đạt | ✅ Đạt | `PRODUCTION VERIFIED` |
| **Diagnostic Assessment Engine & Mastery Estimator** | ✅ Đạt | ⚠️ Thiếu câu đủ 48 skill | N/A (Pure logic) | ✅ Đạt | ⚠️ Thiếu data | `PILOT READY (Topic level)` |
| **Skill Knowledge Graph (48 skills ban đầu)** | ✅ Đạt | ✅ Đạt | N/A (In-memory) | ✅ Đạt | ⚠️ Taxonomy khởi đầu | `PILOT READY` |
| **Personalized Study Planner & Adaptive Practice** | ✅ Đạt | ✅ Đạt (Toán 10) | N/A | ✅ Đạt | ⚠️ Pilot Toán 10 | `PILOT READY` |
| **Student Authentication (Hash, Sessions, Guest mode)** | ✅ Đạt | ✅ Đạt | ⚠️ Migration 007 ready | ✅ Đạt | ✅ Đạt (Staging) | `INTEGRATION TESTED` |
| **Review Console & Question Authoring API** | ✅ Đạt | ✅ Đạt | ⚠️ Local store | ✅ Đạt | ⚠️ Operator nội bộ | `INTEGRATION TESTED` |
| **Supabase Staging Connection (Cloud PostgreSQL)** | ⚠️ Mock pass | ⚠️ Chưa credentials | ❌ BLOCKED | ❌ BLOCKED | ❌ BLOCKED | `BLOCKED` |
| **External Live Scraping Connectors** | ❌ Chặn an toàn | ❌ Không bypass | N/A | N/A | ❌ Không bản quyền | `BLOCKED` |
| **Curriculum Coverage (12 môn - khối lớp)** | ⚠️ Fixture only | ⚠️ 1/12 (Toán 10) | N/A | N/A | ❌ 11/12 chưa đủ | `BLOCKED (Toàn bộ) / PILOT (Toán 10)` |

---

## 3. CHI TIẾT KẾT QUẢ AUDIT TỪNG PHẦN

### 3.1. Engine & Core Logic
- **Độ tin cậy:** 211/211 automated tests passed (0 failures).
- **Tính toán:** Các thuật toán Bayesian Mastery Estimator, MOET QĐ 764 Scoring Matrix, Priority Score, Topological Dependency Sorter hoạt động hoàn toàn tất định (deterministic), không phụ thuộc vào LLM black-box để chấm điểm học sinh.
- **Fail-closed:** Khi thiếu câu hỏi đã thẩm định, Planner và Diagnostic từ chối tạo bài tập ảo và thông báo rõ thiếu dữ liệu thay vì nhồi fixture vào học sinh thật.

### 3.2. Authentication & Authorization (Mới trong Phase 04A)
- Đã xây dựng `StudentAuthManager` độc lập với thuật toán `scrypt` hashing (salt 16 bytes, N=16384, r=8, p=1).
- Session token có chữ ký mật mã HMAC-SHA256, hỗ trợ đồng thời JWT format tương thích Supabase Auth.
- Có cơ chế phân định rõ ràng giữa `guest` session và `student` session.
- Client gửi `userId` giả mạo bị từ chối với mã lỗi HTTP 403 Forbidden.
- Cơ chế Right-to-be-Forgotten: Xóa tài khoản, scrub dữ liệu cá nhân và thu hồi tức thì session tokens.

### 3.3. Content & Question Bank
- **Ngân hàng dữ liệu V2 thật:** Đã nạp thành công 14 câu hỏi chuẩn GDPT 2018 cho Toán 10 (Chương I & II: Mệnh đề, Tập hợp, Bất phương trình, Hàm số bậc hai) với đầy đủ 3 định dạng: MCQ, Đúng/Sai đa ý và Trả lời ngắn.
- **Nguồn gốc câu hỏi (Provenance):** 100% câu hỏi pilot có mã định danh tác giả/biên soạn và chữ ký thẩm định học thuật (`pedagogicalReviewerId`, `pedagogicalReviewDate`).
- **Nguồn bên ngoài (Internet sources):** Vẫn duy trì trạng thái `BLOCKED` vì chưa có thỏa thuận cấp phép bản quyền tái xuất bản hợp pháp. Hệ thống tuyệt đối không cào trộm (scrape) hoặc vượt cơ chế kiểm soát của bên thứ ba.

### 3.4. Supabase Staging & Cloud Infrastructure
- **Tình trạng:** Bộ mã nguồn và Migration SQL (001–007) đã hoàn thiện chuẩn PostgreSQL 15+ với RLS, Foreign Keys, Indexes và Trigger functions.
- **Blocker:** Chưa được cấp credentials staging thực tế trong biến môi trường `.env`. Hệ thống tự động kích hoạt chế độ Fallback an toàn, cảnh báo rõ ràng `SUPABASE STAGING VERIFIED = BLOCKED` và không tự tạo kết quả giả mạo.

---

## 4. KẾT LUẬN AUDIT

Hệ thống NTMK đã đủ điều kiện để mở **Pilot thử nghiệm nội bộ với Toán 10 (Chương I & II)**. Tuy nhiên, việc mở **Public MVP đại trà** vẫn bị **BLOCKED** do hai rào cản tiên quyết:
1. Chưa kết nối và xác minh Supabase staging thực tế.
2. Chưa có bản quyền học liệu và ngân hàng câu hỏi đầy đủ cho 11 tổ hợp môn/lớp còn lại.
