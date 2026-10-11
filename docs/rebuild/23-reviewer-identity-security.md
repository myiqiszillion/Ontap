# 23 — BẢO MẬT DANH TÍNH REVIEWER & KIỂM ĐỊNH SƯ PHẠM (REVIEWER IDENTITY SECURITY)

**Thời điểm thực thi:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Phạm vi:** `ReviewerDirectory`, `api/v2/admin.js`, Review Queue RBAC, Quy trình thu hồi phê duyệt chưa xác minh  

---

## 1. THỰC TRẠNG TRƯỚC KIỂM TOÁN & NGUYÊN TẮC XỬ LÝ

Trước đợt Hardening, module `engine/auth/reviewer-directory.js` khai báo các chuyên gia có tên tuổi, học vị và chức vụ ngoài đời thực:
- `TS. Nguyễn Minh Trí` (Tổ trưởng Bộ môn Toán)
- `ThS. Hoàng Thu Thảo` (Giáo viên Vật lí Chuyên)
- `ThS. Đỗ Tuấn Kiệt` (Giáo viên Hóa học)
- `ThS. Lê Phương Thảo` (Khảo thí GDPT 2018)
- `GS. Trần Đình Châu` (Chủ tịch Hội đồng Thẩm định GDPT 2018)

**Kết luận kiểm toán:** Các nhân sự trên chưa từng ký văn bản thỏa thuận, chưa được cấp tài khoản định danh chính thức trong hạ tầng dự án, và chưa từng trực tiếp kiểm định các câu hỏi trong repository. Việc gắn danh tính và học vị của họ vào mã nguồn vi phạm quy chuẩn liêm chính khoa học, tạo ra niềm tin sai lệch về chất lượng đề thi.

---

## 2. CÁC BIỆN PHÁP HARDENING ĐÃ THỰC HIỆN

### 2.1. Loại bỏ toàn bộ danh tính chưa xác minh
Tất cả các tên người thật, học hàm, học vị và chức danh xã hội đã bị **xóa bỏ 100%** khỏi mã nguồn và cơ sở dữ liệu.

### 2.2. Chuẩn hóa Test Fixture Identities
Thay thế bằng các định danh kiểm thử kỹ thuật rõ ràng, có tiền tố `fixture_`:
- `fixture_math_reviewer_01` (Chuyên môn: `['toan']`, Vai trò: `pedagogical_auditor`)
- `fixture_phys_reviewer_01` (Chuyên môn: `['vatli']`, Vai trò: `pedagogical_auditor`)
- `fixture_chem_reviewer_01` (Chuyên môn: `['hoahoc']`, Vai trò: `pedagogical_auditor`)
- `fixture_eng_reviewer_01` (Chuyên môn: `['tienganh']`, Vai trò: `pedagogical_auditor`)
- `fixture_lead_curriculum_01` (Chuyên môn: `['toan', 'vatli', 'hoahoc', 'tienganh']`, Vai trò: `curriculum_lead`)

Các fixture này:
- Được gán cờ tường minh `isFixture: true`.
- Tuyệt đối không gắn học hàm, học vị, trường đại học giả định.
- Không thể được sử dụng để hợp thức hóa việc xuất bản ra ngân hàng câu hỏi chính thức cho kỳ thi quốc gia.

### 2.3. Quy trình Thẩm định lại (Rectify Unverified Approvals)
Hàm `auditAndRectifyUnverifiedApprovals(candidates)` trong `ReviewerDirectory` đã được xây dựng để rà soát toàn bộ lịch sử:
1. Phát hiện các câu hỏi đã từng bị gán phê duyệt bởi tên unverified ("TS. Nguyễn Minh Trí", "GS. Trần Đình Châu", v.v.).
2. **Hạ cấp trạng thái ngay lập tức:** Đưa từ `verified` hoặc `published` trở về `needs_review` và `review`.
3. Thu hồi `verifiedBy` và `verifiedAt`.
4. **Bảo tồn Audit Trail:** Ghi nhận sự kiện kiểm toán bất biến:
   `"Prior approval by unverified identity '...' revoked during Phase 02C audit. Re-vetting required."`
5. Endpoint quản trị `POST /api/admin/reviewers/rectify-unverified` cho phép chạy rà soát định kỳ.

---

## 3. CƠ CHẾ AUTHENTICATION & RBAC REVIEWER THỰC TẾ

Hệ thống phân quyền sư phạm đã được tái cấu trúc chặt chẽ trên server-side:

```
[Client / Auditor]
       │
       ├── Gửi Bearer Token qua Header: `X-Reviewer-Token`
       ▼
[Server Authentication]
       │
       ├── defaultDirectory.authenticateByToken(token)
       ├── Kiểm tra trạng thái hoạt động: reviewer.active === true
       ▼
[Server-side RBAC Authorization]
       │
       ├── Hành động 'verify' / 'reject':
       │     ├── Quyền: pedagogical_auditor HOẶC curriculum_lead
       │     └── Chuyên môn: subjectId PHẢI NẰM TRONG reviewer.subjectSpecialties
       │
       ├── Hành động 'publish' ra Ngân hàng:
       │     └── Quyền: CHỈ DUY NHẤT curriculum_lead
       │
       └── Hành động 'approve_source' bản quyền:
             └── Quyền: CHỈ DUY NHẤT curriculum_lead
```

### Điểm chốt chặn quan trọng:
1. **Không đồng nhất `ADMIN_API_KEY` với thẩm quyền học thuật:**
   - Người nắm giữ `ADMIN_API_KEY` chỉ có quyền thao tác kỹ thuật hạ tầng (`system_operator`).
   - Nếu gọi endpoint kiểm định (`/api/admin/review/:id/verify`) mà không kèm `X-Reviewer-Token` hợp lệ, hệ thống trả về `403 Forbidden`:
     `"Pedagogical verification requires a certified reviewer identity. Shared ADMIN_API_KEY does not grant academic vetting authority."`
2. **Onboarding & Revocation động:**
   - Thẩm định viên mới được mời qua `onboardReviewer({ id, displayName, email, role, subjectSpecialties, invitedBy })`.
   - Khi có dấu hiệu vi phạm hoặc chấm dứt hợp đồng, gọi `revokeReviewer(id, { revokedBy, reason })`. Token của reviewer bị vô hiệu hóa ngay lập tức. Mọi quyền truy cập sau thời điểm thu hồi đều bị từ chối `403 Forbidden`.
3. **Audit Trail bất biến:**
   - Mỗi hành động kiểm định tạo một đối tượng audit có mã hash duy nhất, lưu lại thời điểm `ISO 8601`, `actorId`, `actorRole`, `evidence`, và ghi vào bảng `ntmk_content_audit`.
