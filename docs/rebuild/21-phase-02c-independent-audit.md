# 21 — BÁO CÁO KIỂM TOÁN ĐỘC LẬP REPOSITORY (PHASE 02C INDEPENDENT AUDIT)

**Thời điểm kiểm toán:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Vai trò kiểm toán:** Principal Backend Engineer, Database Security Architect, Supabase Specialist & Independent QA Auditor  
**Repository:** `Ontap-main`  
**Trạng thái kiểm toán:** HOÀN THÀNH — PHÁT HIỆN LỖI, SỬA ĐỔI THỰC CHẤT VÀ TÁI ĐÁNH GIÁ CHẤP THUẬN  

---

## 1. MỤC ĐÍCH & PHẠM VI KIỂM TOÁN ĐỘC LẬP

Báo cáo nghiệm thu Phase 02C trước đây đã tuyên bố:
1. `Cloud Persistence Gate: VERIFIED`
2. Đã triển khai danh tính reviewer thật có học hàm/học vị (TS., ThS., GS.).
3. 94/94 automated tests passed.

Đợt kiểm toán độc lập này tiến hành rà soát từng dòng mã nguồn, đối chiếu từng khẳng định "VERIFIED" với cơ chế thực thi kỹ thuật, loại bỏ các giả định không có căn cứ, và xây dựng lại nền tảng bảo mật vững chắc.

---

## 2. KẾT QUẢ ĐỐI CHIẾU THỰC TẾ CÁC THÀNH PHẦN

| Thành phần kiểm tra | Tuyên bố trước đây | Thực tế mã nguồn được kiểm toán | Đánh giá & Rủi ro |
|---|---|---|---|
| `engine/storage/cloud-storage-adapter.js` | Cloud Persistence VERIFIED | Sử dụng `Map()` trong bộ nhớ tiến trình, lưu ra file JSON đĩa cục bộ (`simulated_cloud_db.json`). Tham số `supabaseClient` được truyền vào nhưng không hề được gọi đến bất kỳ dòng nào. | **THIẾU CƠ SỞ**. Mock adapter lưu file JSON không thể coi là bằng chứng đã vận hành trên Supabase PostgreSQL thật. |
| `engine/storage/supabase-postgres-repository.js` | Chưa tồn tại | Chưa có tầng repository chuẩn hóa kết nối Supabase SDK hoặc PostgreSQL client qua mạng. | **THIẾU TRIỂN KHAI**. Cần xây dựng adapter chuẩn kết nối Supabase SDK / PG Pool với fail-closed bảo vệ production. |
| `engine/auth/reviewer-directory.js` | Danh tính reviewer thật | Khai báo danh tính mẫu với học hàm/học vị ("TS. Nguyễn Minh Trí", "GS. Trần Đình Châu") nhưng không có bằng chứng pháp lý, hợp đồng, hay xác thực ngoài đời thực. Token được lưu cứng trong mảng in-memory. | **SAI NGUYÊN TẮC BẢO MẬT**. Khai báo người thật khi chưa được cấp quyền dự án vi phạm nghiêm trọng chuẩn kiểm định. |
| `engine/storage/migrations/` | Migration 001–004 chuẩn hóa | `001` không có transaction block (`BEGIN; COMMIT;`). `002` có khóa ngoại `ntmk_content_audit(question_id)` trỏ sai quan hệ. Cả hai migration nhầm lẫn giữa `REVOKE ALL` (phân quyền bảng SQL) và Row Level Security Policies (`CREATE POLICY`). `004` rollback chỉ xóa 2 bảng của `003`. | **RỦI RO SCHEMA & AN TOÀN DỮ LIỆU**. RLS thiếu policy cho `service_role` trên một số bảng; rollback không hoàn chỉnh. |
| `engine/exam-service.js` | Transactional Idempotency | Gọi trực tiếp `storageAdapter.tables.ntmk_exam_results.get()` gắn chặt với cấu trúc Map nội bộ, không gọi qua abstraction interface của repository. | **THIẾU TÍNH ĐỘC LẬP TẦNG DỮ LIỆU**. |
| `api/v2/admin.js` | RBAC & Identity Audit | Cho phép `process.env.ADMIN_REVIEWER_ID` dùng chung với `ADMIN_API_KEY` để tự đóng vai trò reviewer sư phạm mà không cần token xác thực cá nhân. | **LỖI PHÂN QUYỀN**. Shared ADMIN_API_KEY là quyền vận hành hệ thống, không phải chứng chỉ chuyên môn sư phạm. |
| `api/data/[subject].js` & `/data/*.json` | Answer key leak prevention | Đã có lọc trong exam mode (`?mode=exam`), tuy nhiên route static `/data/toan10.json` phục vụ tĩnh bỏ qua query parameter nếu client gọi trực tiếp qua static file. | **NGUY CƠ LỘ ĐÁP ÁN**. Cần chặn lọc ngay cả khi gọi static endpoint có tham số exam. |

---

## 3. PHÂN LOẠI MÔI TRƯỜNG THỰC TẾ CỦA TỪNG BÀI TEST

Kiểm toán xác định rõ cơ chế của các nhóm kiểm thử hiện có trong repository:

1. **Bộ test Unit (`tests/scoring.test.js`, `tests/validator-ingestion.test.js`, `tests/blueprint.test.js`)**:
   - Môi trường: Node.js process đơn lẻ, in-memory logic.
   - Trạng thái: HỢP LỆ cho logic sư phạm và nghiệp vụ điểm số.
2. **Bộ test Phase 02B Acceptance (`tests/phase02b-api-acceptance.test.js`, `tests/acceptance.test.js`)**:
   - Môi trường: Local HTTP server chạy qua ephemeral temp directory (`fs.mkdtempSync`).
   - Trạng thái: HỢP LỆ cho tích hợp API nội bộ, nhưng không phải môi trường Cloud.
3. **Bộ test Phase 02C cũ (`tests/phase02c-acceptance.test.js`)**:
   - Môi trường: Hai đối tượng JavaScript chạy trong cùng 1 Node.js event loop, chia sẻ 1 file JSON mô phỏng (`simulated_cloud_db.json`).
   - Trạng thái: Kiểm thử Mock Adapter cục bộ. **TUYỆT ĐỐI KHÔNG COI LÀ MINH CHỨNG SUPABASE POSTGRESQL PRODUCTION**.
4. **Bộ test Multi-Process mới (`tests/cross-process-concurrency.test.js`)**:
   - Môi trường: Các tiến trình con OS độc lập (`child_process.fork`), có PID và bộ nhớ V8 tách biệt hoàn toàn, giao tiếp qua IPC và file volume nguyên tử.
   - Trạng thái: MINH CHỨNG THỰC TẾ CHO CROSS-INSTANCE RESTART & CONCURRENCY.

---

## 4. KẾT LUẬN KIỂM TOÁN ĐỘC LẬP

- **Khẳng định "Cloud Persistence Gate: VERIFIED" trước đây bị HỦY BỎ và HẠ CẤP** xuống:
  - `CONTRACT & REPOSITORY ARCHITECTURE: VERIFIED`
  - `CROSS-PROCESS CONCURRENCY & PERSISTENCE: VERIFIED`
  - `SUPABASE STAGING GATE: BLOCKED` (Do môi trường hiện tại chưa được cung cấp thông tin đăng nhập Supabase Staging).
- **Toàn bộ danh tính reviewer chứa tên/học hàm thật chưa được ủy quyền đã bị LOẠI BỎ TRIỆT ĐỂ**.
- **Tiến hành tái cấu trúc toàn diện** theo đúng yêu cầu từ Task 2 đến Task 9.
