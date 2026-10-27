# NTMK REBUILD — THIẾT KẾ KIẾN TRÚC XÁC THỰC VÀ BẢO MẬT DỮ LIỆU HỌC SINH (PHASE 04B)

> **Tài liệu:** `docs/rebuild/57-student-auth-production-design.md`  
> **Phiên bản:** Phase 04B Student Auth & Session Security Architecture  
> **Thời điểm thẩm định:** 12/10/2026  
> **Tác giả:** Security Auditor, Principal Full-Stack Engineer & Supabase Architect  
> **Trạng thái:** `CUSTOM HMAC HARDENED` | `SUPABASE AUTH MIGRATION BLUEPRINT READY`

---

## 1. AUDIT ĐỘC LẬP HỆ THỐNG XÁC THỰC HIỆN TẠI (CUSTOM HMAC-SHA256)

### 1.1. Hiện trạng Mã nguồn
Hiện tại, NTMK sử dụng cơ chế xác thực nội bộ do `StudentAuthManager` (`engine/auth/student-auth.js`) điều khiển:
- **Cấu trúc Token:** Opaque Token có định dạng `ntmk_tok_<base64payload>.<hmacSignature>`.
- **Chữ ký:** HMAC-SHA256 tính toán trên payload sử dụng khóa bí mật server-side (`SESSION_SECRET`).
- **Thuật toán Băm Mật khẩu:** `crypto.scryptSync` (Salt 16 bytes ngẫu nhiên, N=16384, r=8, p=1, keylen=64 bytes) kết hợp so sánh hằng thời gian (`crypto.timingSafeEqual`) chống timing attack.
- **Bảo vệ Brute-Force:** Khóa tài khoản tạm thời 15 phút sau 5 lần nhập sai liên tiếp trên mỗi email.

### 1.2. Phân loại Nguồn Lưu trữ Dữ liệu Xác thực

| Thực thể dữ liệu | Nguồn lưu trữ hiện tại (Local / Dev) | Hạn chế trên Vercel Serverless | Nguồn lưu trữ Thiết kế (Staging / Production) |
| :--- | :--- | :--- | :--- |
| **Users (Tài khoản học sinh)** | `Map<id, User>` trong RAM + `.ntmk/student-auth-state.json` | Mất đồng bộ giữa các lambda instances khi scale | Bảng `ntmk_student_accounts` (Supabase Postgres) |
| **Password Hashes** | Chuỗi `salt:derivedKeyHex` trong đối tượng User | Không bền vững khi worker restart | Cột `password_hash` trong `ntmk_student_accounts` |
| **Active Sessions** | `Map<token, SessionInfo>` trong RAM | Không chia sẻ phiên giữa các edge/serverless nodes | Bảng `ntmk_student_sessions` + Redis/Postgres |
| **Revoked Sessions** | `Set<token>` trong RAM + file durable state | Rủi ro token đã logout vẫn dùng được ở node khác | Cột `is_revoked` hoặc blacklist trong database trung tâm |
| **Guest Sessions** | Scoped session `role: 'guest'`, ID `gst_<uuid>` | Mất trạng thái khi học sinh đổi thiết bị | Bảng `ntmk_student_sessions(is_guest=true)` |
| **Deleted Accounts** | `Set<userId>` và scrub thông tin cá nhân | Chỉ xóa trong instance cục bộ | Xóa cứng hoặc soft-delete `is_active=false` qua RLS |
| **Guest-to-Student State** | Chuyển giao trực tiếp qua `migrateGuestData` | Cần transaction nguyên tử trên database | Bảng kiểm toán `ntmk_guest_migrations` |

> [!WARNING]
> Trên môi trường Vercel Serverless, hệ thống tệp cục bộ (`/tmp` hoặc thư mục dự án) là tạm thời (ephemeral) và không được chia sẻ giữa các instance đồng thời. Do đó, việc lưu danh sách thu hồi (`revokedTokens`) trong file local chỉ hợp lệ cho môi trường Node.js đơn tiến trình hoặc kiểm thử. Để đảm bảo an toàn tuyệt đối trên production, việc thu hồi phiên bắt buộc phải được lưu trữ trên PostgreSQL staging hoặc Supabase.

---

## 2. ĐÁNH GIÁ VÀ LỘ TRÌNH CHUYỂN ĐỔI SANG SUPABASE AUTH (GOTRUE)

### 2.1. Lợi thế khi chuyển sang Native Supabase Auth
1. **Quản lý phiên tập trung:** GoTrue quản lý refresh tokens, access tokens (JWT), thu hồi phiên và MFA mà không cần tự duy trì session store.
2. **Tích hợp sâu với Row-Level Security (RLS):** Supabase RLS trực tiếp đọc `auth.uid()` từ claim JWT chuẩn, cho phép khóa chặt quyền truy cập bảng ở tầng database kernel.
3. **Bảo mật chuẩn OIDC/OAuth2:** Tự động hỗ trợ đăng nhập qua Google Workspace nhà trường, Magic Link, và Anonymous Users.

### 2.2. So sánh Kỹ thuật: Custom Token vs Supabase Auth

```text
Custom HMAC Token (Hiện tại):
[Header: None] . [Payload: sub, role, isGuest, email, exp, iat] . [Signature: HMAC-SHA256(secret)]
Prefix: ntmk_tok_...
RLS: Server Node.js phải truyền context 'ntmk.actor_role' và 'request.jwt.claims' vào connection.

Supabase Auth JWT (Mục tiêu):
[Header: alg=RS256/HS256, typ=JWT] . [Payload: iss, sub, aud='authenticated', role, email, exp] . [Signature]
Prefix: eyJhbGci...
RLS: PostgreSQL tự động đọc thông qua hàm nội vi auth.uid() và auth.role().
```

### 2.3. Kế hoạch Di chuyển (4 Giai đoạn):
1. **Giai đoạn 1 (Dual-Verification):** Server Node.js hỗ trợ song song cả token `ntmk_tok_` (cho khách và demo) và JWT của Supabase (`Bearer eyJ...`).
2. **Giai đoạn 2 (Anonymous Sign-ins):** Thay thế `createGuestSession` cục bộ bằng `supabase.auth.signInAnonymously()`.
3. **Giai đoạn 3 (Student Account Linking):** Khi học sinh đăng ký hoặc đăng nhập, gọi `supabase.auth.signUp()` hoặc `signInWithPassword()`. Liên kết `supabase_uid` với bản ghi `ntmk_student_accounts`.
4. **Giai đoạn 4 (Full RLS Cutover):** Chuyển giao toàn bộ việc kiểm soát quyền truy cập sang chính sách PostgreSQL RLS trên Staging.

---

## 3. CÁC NGUYÊN TẮC BẢO MẬT DỮ LIỆU HỌC SINH ĐÃ ĐƯỢC THI HÀNH

1. **Server-Side Authoritative Identity:** Server **tuyệt đối không tin cậy** `userId`, `role` hay `studentId` gửi trong URL query hoặc request body. Mọi định danh được giải mã và kiểm tra chữ ký nghiêm ngặt từ session token.
2. **Cô lập Dữ liệu Giữa các Tài khoản (Cross-User Isolation):** Hàm `assertOwnership(authUser, targetOwnerId)` ném mã lỗi HTTP 403 Forbidden nếu Học sinh A cố gắng đọc hoặc chỉnh sửa kế hoạch học tập của Học sinh B.
3. **Giới hạn Quyền Tài khoản Khách (Guest Permissions Scoping):** Phiên khách chỉ có quyền thực hiện bài kiểm tra chẩn đoán và xem lộ trình cơ bản; không thể truy cập các tài nguyên quản trị hoặc xuất dữ liệu.
4. **Quyền Được Quên (Right to be Forgotten):** API `DELETE /api/v2/auth/account` xóa sạch email, display name, băm mật khẩu, đồng thời lập tức thu hồi toàn bộ phiên đăng nhập đang hoạt động.
5. **Không Rò rỉ Thông tin Nhạy cảm:**
   - Không in mật khẩu hoặc JWT vào server logs (đã có bộ lọc sanitization).
   - Không để lộ `SUPABASE_SERVICE_ROLE_KEY` ra trình duyệt (chỉ dùng `anon key` ở client).
   - Không trả về đáp án đúng và lời giải trong chế độ thi trực tuyến.
