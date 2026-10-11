# 26 — HƯỚNG DẪN CẤU HÌNH SUPABASE STAGING & KIỂM TRA MÔI TRƯỜNG CLOUD (PHASE 02D STAGING SETUP)

**Thời điểm ban hành:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Nhóm phụ trách:** Principal Backend Engineer, PostgreSQL Database Engineer, DevOps Engineer & Cloud Security Architect  
**Repository:** `Ontap-main`  
**Git Commit Hash:** `7f9f5b1c358bfe5ac55727c7acea90cd8c965672`  
**Trạng thái Cloud Gate:** `STAGING CREDENTIALS PENDING` / `GATE STATUS: BLOCKED`

---

## 1. NGUYÊN TẮC CỐT LÕI VỀ AN TOÀN MÔI TRƯỜNG CLOUD

Tuân thủ nghiêm ngặt chuẩn mực DevOps và Cloud Acceptance Gate:
1. **Tách biệt 100% giữa Production và Staging:** Tuyệt đối không dùng chung database, schema, hoặc Supabase Project giữa môi trường staging và production.
2. **Nguyên tắc Không Tạo Dữ Liệu Giả:** Không tạo URL hoặc Service Key giả định để tuyên bố đã vượt qua cổng Staging. Khi chưa có credentials thực tế, cổng kiểm thử Staging giữ trạng thái `BLOCKED`.
3. **Bảo mật Bí mật (Secret Zero Leakage):** Không commit khóa bí mật (`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`) vào Git, tài liệu markdown, test snapshot hay log hệ thống.
4. **Phân quyền Tối thiểu (Principle of Least Privilege):** Client web chỉ nhận `anon` key (nếu cần cho static asset). Toàn bộ thao tác cơ sở dữ liệu nhạy cảm được thực thi phía server thông qua backend API sử dụng `service_role` key được bảo vệ.

---

## 2. MA TRẬN CÁC BIẾN MÔI TRƯỜNG SỬ DỤNG (ENVIRONMENT MATRIX)

Hệ thống `Ontap-main` sử dụng các biến môi trường sau cho tầng lưu trữ đám mây và bảo mật:

| Tên biến môi trường | Loại | Mục đích & Ranh giới | Môi trường bắt buộc | Giá trị mẫu an toàn (Masked) |
|---|---|---|---|---|
| `SUPABASE_URL` | Public / Server | Địa chỉ endpoint HTTPS của Supabase Project Staging | Staging / Production | `https://[staging-project-ref].supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Bí mật Tối cao (Server-only)** | Khóa PostgREST bypass RLS dành riêng cho Backend Server | Staging / Production | `eyJhbGciOiJIUzI1NiIsInR5c...` (Không bao giờ lộ ra client) |
| `DATABASE_URL` | **Bí mật Tối cao (Server-only)** | Chuỗi kết nối PostgreSQL TCP trực tiếp (kèm Pooler hoặc Direct) | Staging / Production | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` |
| `DATABASE_SSL` | Cấu hình | Bật/tắt SSL khi kết nối PostgreSQL (mặc định: `true`) | Mọi môi trường | `true` (Supabase yêu cầu TLS/SSL) |
| `PG_POOL_MAX` | Cấu hình | Số lượng kết nối tối đa trong Connection Pool | Staging / Production | `10` (server thông thường), `5` (serverless worker) |
| `ADMIN_API_KEY` | **Bí mật Server-only** | Khóa xác thực quyền hạ tầng & vận hành kỹ thuật (System Operator) | Tất cả | Khóa bí mật sinh ngẫu nhiên 32 bytes |
| `ADMIN_REVIEWER_ID` | Cấu hình Test | Tùy chọn chỉ định reviewer fixture khi chạy test nội bộ | Test / Dev | `fixture_lead_curriculum_01` |
| `NODE_ENV` | Cấu hình | Xác định môi trường thực thi (`development`, `test`, `production`) | Tất cả | `staging` hoặc `production` |

---

## 3. HƯỚNG DẪN THIẾT LẬP DỰ ÁN SUPABASE STAGING MỚI

Người quản trị hạ tầng (DevOps / Supabase Admin) thực hiện các bước sau để thiết lập môi trường Staging:

### Bước 1: Khởi tạo Project trên Supabase Console
1. Truy cập [Supabase Dashboard](https://supabase.com/dashboard).
2. Tạo dự án mới với tên: `ntmk-staging-gdpt2018`.
3. Chọn Region phù hợp (khuyến nghị: `Singapore (ap-southeast-1)` để giảm độ trễ về Việt Nam).
4. Thiết lập mật khẩu database an toàn (tối thiểu 16 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt).

### Bước 2: Lấy thông tin kết nối an toàn
Vào mục **Project Settings -> Database**:
- **Connection String (Transaction Pooler - Port 6543):** Dành cho môi trường Serverless (Vercel Functions).
- **Connection String (Direct - Port 5432):** Dành cho migration scripts hoặc persistent node worker.
Vào mục **Project Settings -> API**:
- **Project URL:** Lưu vào `SUPABASE_URL`.
- **service_role (secret):** Lưu vào `SUPABASE_SERVICE_ROLE_KEY`.

### Bước 3: Tạo tệp cấu hình `.env.staging` (Không commit vào Git)
Tạo file `.env.staging` trên máy chủ CI/CD runner hoặc server staging:

```bash
# =========================================================================
# NTMK STAGING ENVIRONMENT CONFIGURATION (STRICTLY PRIVATE)
# DO NOT COMMIT THIS FILE TO REPOSITORY
# =========================================================================
NODE_ENV=staging
PORT=3000

# 1. Supabase Staging API Endpoint & Service Role Key
SUPABASE_URL=https://<your-staging-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-staging-service-role-key>

# 2. PostgreSQL Direct / Pooler Connection
DATABASE_URL=postgresql://postgres.<your-ref>:<your-db-password>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_SSL=true
PG_POOL_MAX=10

# 3. Administrative Key for Technical Operations
ADMIN_API_KEY=ntmk_staging_adm_sec_2026_x89a1c4b2e
```

---

## 4. CẤU HÌNH CONNECTION POOL & TLS/SSL TRONG MÃ NGUỒN

Module [`engine/storage/supabase-postgres-repository.js`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/storage/supabase-postgres-repository.js) đã được trang bị cơ chế kết nối an toàn đáp ứng chuẩn Supabase:

```javascript
const poolConfig = {
  connectionString: this.databaseUrl,
  connectionTimeoutMillis: this.options.connectionTimeoutMillis || 10000, // Timeout 10s
  idleTimeoutMillis: this.options.idleTimeoutMillis || 30000,             // Hủy kết nối rỗi sau 30s
  max: this.options.poolMax || 10,                                       // Giới hạn pool tối đa 10
  min: this.options.poolMin || 0,                                        // Cho phép hạ về 0 trong serverless
};

// Cấu hình SSL phù hợp với Supabase Transaction Pooler
if (this.options.ssl !== undefined) {
  poolConfig.ssl = this.options.ssl;
} else if (process.env.DATABASE_SSL === 'false') {
  poolConfig.ssl = false;
} else {
  poolConfig.ssl = { rejectUnauthorized: false }; // Bắt buộc cho cloud pooler
}

this.pgPool = new pg.Pool(poolConfig);
this.pgPool.on('error', (err) => {
  // Ngăn unhandled idle client error làm sập Node.js process
  console.error('⚠️ [Postgres Pool] Unexpected error on idle client:', SupabasePostgresRepository.sanitizeError(err));
});
```

---

## 5. CƠ CHẾ SANITIZATION & CHE GIẤU BÍ MẬT (SECRET ZERO LEAKAGE)

Hệ thống tích hợp 2 tầng bảo vệ:
1. **Credential Masking:** Hàm `validateEnvironment()` che giấu toàn bộ mật khẩu và JWT token:
   - `maskedDatabaseUrl`: Chuyển `postgresql://user:pass@host` thành `postgresql://user:***@host`.
   - `maskedSupabaseServiceKey`: Rút gọn chuỗi thành định dạng `eyJh...890`.
2. **Error String Sanitization:** Hàm tĩnh `SupabasePostgresRepository.sanitizeError(err)` tự động bóc tách và thay thế thông tin đăng nhập trong mọi exception message trước khi trả về client hoặc in log.

---

## 6. ENDPOINT KIỂM TRA SỨC KHỎE ĐƯỢC BẢO VỆ (PROTECTED HEALTH CHECK)

- **Đường dẫn:** `GET /api/admin/health`
- **Bảo mật:** Bắt buộc Header `X-Admin-Key: <ADMIN_API_KEY>` (Từ chối 401 Unauthorized nếu không có key hợp lệ).
- **Phản hồi mẫu khi Staging sẵn sàng:**
  ```json
  {
    "status": "OK",
    "phase": "02D-Staging-Acceptance",
    "database": {
      "configured": true,
      "status": "VERIFIED",
      "backend": "postgres_pool",
      "connected": true,
      "poolConfig": {
        "connectionTimeoutMillis": 10000,
        "idleTimeoutMillis": 30000,
        "poolMax": 10,
        "sslEnabled": true
      },
      "error": null
    },
    "uptime": 124.5,
    "timestamp": "2026-10-11T12:00:00.000Z"
  }
  ```
- **Phản hồi khi chưa có credentials (Fail-closed an toàn):**
  ```json
  {
    "status": "DEGRADED",
    "phase": "02D-Staging-Acceptance",
    "database": {
      "configured": false,
      "status": "BLOCKED",
      "backend": "unconfigured",
      "connected": false,
      "error": "Supabase credentials not configured in environment. Staging/Production connection BLOCKED."
    },
    "uptime": 2.1,
    "timestamp": "2026-10-11T12:00:00.000Z"
  }
  ```
- **Mã HTTP:** Trả về `200 OK` khi kết nối thành công; trả về `503 Service Unavailable` khi cơ sở dữ liệu ngắt kết nối.
