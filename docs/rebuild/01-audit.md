# NTMK REBUILD — BÁO CÁO TOÀN DIỆN AUDIT HỆ THỐNG (PHASE 01)
**Tài liệu:** `docs/rebuild/01-audit.md`  
**Dự án:** NTMK — Nền tảng Ôn Tập Thông Minh  
**Vai trò thẩm định:** Principal Full-Stack Engineer, Software Architect, Senior UI/UX Designer & QA Engineer  
**Thời gian thực hiện:** Tháng 10/2026  
**Môi trường kiểm tra:** Node.js v24.18.0, npm 12.2.0, Windows, Vercel Serverless Platform

---

## 1. TỔNG QUAN HIỆN TRẠNG KHO MÃ NGUỒN (REPOSITORY TOPOLOGY)

Kho mã nguồn `Ontap-main` ban đầu được xây dựng dưới dạng một ứng dụng web nguyên khối đơn giản (Monolithic Static SPA + Lightweight Express / Vercel Serverless API), phục vụ ôn tập trắc nghiệm trường THPT (chủ yếu Lịch sử 10, Sinh học 10, Tin học 10).

```
Ontap-main/
├── .gitignore                    # Bỏ qua node_modules, .env, *.log
├── README.md                     # Tài liệu ban đầu (Quiz Platform)
├── package.json                  # Tên package "lich-su-10-quiz", 4 dependencies
├── package-lock.json             # Khóa phiên bản npm
├── server.js                     # Express server chạy local (cổng 3000)
├── vercel.json                   # Cấu hình deploy Vercel static + rewrites
├── api/                          # Serverless endpoints (cho Vercel)
│   ├── announcements.js          # CRUD thông báo (Supabase)
│   ├── delete-announcement.js    # Xóa thông báo (Supabase)
│   ├── pin-announcement.js       # Ghim thông báo (Supabase)
│   ├── subjects.js               # Đọc và lọc data/subjects.json
│   └── data/
│       └── [subject].js          # Trả về câu hỏi dạng JSON
├── data/                         # Ngân hàng câu hỏi dạng file tĩnh JSON
│   ├── subjects.json             # Danh mục môn và phân lớp (Lớp 10 & 12)
│   ├── su.json                   # 2,998 dòng: Lịch sử 10 (MCQ + True/False)
│   ├── sinh.json                 # ~1,300 dòng: Sinh học 10 (MCQ + True/False)
│   └── tin.json                  # ~1,200 dòng: Tin học 10 (MCQ + True/False)
├── public/                       # Thư mục tĩnh phân phối ra client
│   ├── index.html                # Trang chính (SPA gom 7 màn hình vào 1 file)
│   ├── admin.html                # Trang quản trị đăng/xóa thông báo
│   ├── css/
│   │   ├── style.css             # Style chung (52KB, 2,214 dòng)
│   │   ├── quiz.css              # Style dành cho phòng thi (17KB)
│   │   └── admin.css             # Style trang admin (8.7KB)
│   ├── js/
│   │   ├── api.js                # Module fetch dữ liệu & bộ nhớ đệm Map
│   │   ├── data-loader.js        # Parser câu hỏi, xáo trộn câu, bài học
│   │   ├── timer.js              # Đồng hồ đếm ngược lưu sessionStorage
│   │   ├── quiz.js               # Logic thi trắc nghiệm & chấm điểm
│   │   ├── study.js              # Chế độ Học & Đọc, Flashcard, Luyện tập, WrongTracker
│   │   ├── app.js                # Controller điều hướng DOM và trạng thái UI (32KB, 842 dòng)
│   │   └── admin.js              # Logic giao diện quản trị (10KB)
│   └── assets/                   # Video hero (banner.mp4 4.6MB, avatar.mp4 1.8MB), hình ảnh
├── scripts/
│   └── parse_de_cuong_to_json.py # Script trích xuất câu hỏi từ văn bản Word/txt
└── docs/                         # Đề cương thô Word (.docx) và text (.txt)
```

---

## 2. PHÂN TÍCH KIẾN TRÚC VÀ CÁC LUỒNG DỮ LIỆU HIỆN HỮU

### 2.1. Luồng chạy Local (Express Server)
1. Khi chạy `node server.js` (hoặc `npm start`):
   - Server khởi tạo Express tại cổng 3000.
   - Nạp biến môi trường bằng `dotenv.config()`.
   - Khởi tạo Supabase client thông qua `createClient(supabaseUrl, supabaseKey)`.
   - Phục vụ tĩnh `public/` tại `/` và `data/` tại `/data`.
   - Đăng ký các route:
     - `GET /api/subjects`: Đọc `data/subjects.json`, kiểm tra xem file tương ứng (`dataFile`) có tồn tại và có câu hỏi không rồi lọc trả về.
     - `GET /api/data/:subject`: Regex validation tên môn và trả file JSON tương ứng từ thư mục `data/`.
     - `GET/POST /api/announcements`, `PATCH /api/pin-announcement`, `DELETE /api/delete-announcement`: Tương tác với bảng `announcements` trong Supabase.

### 2.2. Luồng chạy Production (Vercel Platform)
1. Cấu hình tại `vercel.json`:
   ```json
   {
     "buildCommand": "",
     "outputDirectory": "public",
     "rewrites": [
       { "source": "/admin", "destination": "/admin.html" }
     ]
   }
   ```
2. Vercel tự động triển khai:
   - Các file trong `public/` trở thành static assets trên Edge CDN.
   - Các file trong `api/` trở thành Node.js Serverless Functions (`api/subjects.js`, `api/announcements.js`, `api/data/[subject].js`).
   - `data/` nằm ngoài `public/`, do đó request tĩnh `/data/subjects.json` từ client sẽ thất bại nếu không qua serverless function hoặc nếu hàm API bị lỗi. Trong `public/js/api.js`, tác giả có fallback: `fetch('/api/subjects')` nếu lỗi thì fallback sang `fetch('/data/subjects.json')`. Cơ chế fallback này chỉ hoạt động khi chạy Express cục bộ (vì Express có `app.use('/data', express.static(...))`), còn trên Vercel Edge CDN thư mục `data/` không được copy vào `outputDirectory` (`public`).

---

## 3. ĐÁNH GIÁ CHI TIẾT CÁC MODULE CODE

| Module | Tệp tin | Đánh giá hiện trạng | Tiềm năng tái sử dụng / Định hướng xử lý |
| :--- | :--- | :--- | :--- |
| **API Client** | `public/js/api.js` | Đơn giản, dùng `Map` làm in-memory cache. Có fallback tĩnh. | **Tái sử dụng & Mở rộng**: Cần bổ sung kiểu dữ liệu, abort controller, xử lý retry và error handling chuẩn hóa. |
| **Data Loader** | `public/js/data-loader.js` | Hỗ trợ trích xuất bài học, xáo trộn câu (Fisher-Yates), xử lý MCQ, Short Answer và TF-group. | **Tái sử dụng lõi**: Giữ lại giải thuật parse định dạng bài thi GDPT 2018; trừu tượng hóa để hỗ trợ thêm các môn Toán, Lý, Hóa, Anh. |
| **Timer** | `public/js/timer.js` | Countdown chính xác theo giây, lưu trạng thái vào `sessionStorage` để chống mất khi bấm F5 reload. | **Tái sử dụng hoàn toàn**: Viết lại bao bọc hướng module hóa, tương thích cả SPA và standalone test runner. |
| **Quiz Engine** | `public/js/quiz.js` | Render trắc nghiệm MCQ, bảng True/False 4 ý và Short Answer. Có thanh điều hướng dot indicators, chấm điểm tự động. | **Tái sử dụng**: Tách biệt tầng trình diễn (View) khỏi Engine chấm điểm (Scoring Core). Giữ tính tương thích ngược cho ngân hàng câu hỏi cũ. |
| **Study & Flashcard** | `public/js/study.js` | Hỗ trợ 4 chế độ: Học & Đọc, Flashcard có lật thẻ, Luyện tập tự động, Theo dõi câu sai (`WrongTracker`). Hỗ trợ Web Speech API TTS tiếng Việt. | **Tái sử dụng logic nghiệp vụ**: Logic `WrongTracker` và lặp lại câu sai là nền tảng tốt cho Adaptive Learning Phase 02. |
| **App Controller** | `public/js/app.js` | File "God Object" nặng 32KB gom toàn bộ logic chuyển màn hình, DOM manipulation, gọi Discord API, lắng nghe DOM events. | **Refactor từng bước**: Phân rã thành các controller chuyên biệt: Navigation Router, Theme Manager, Onboarding Store, Dashboard View. |
| **Admin System** | `public/admin.html` + `admin.js` | Giao diện đăng bài thông báo, upload ảnh base64/URL, xóa bài. | **Bảo lưu tính tương thích**: Không làm gián đoạn luồng admin hiện có; cô lập bảo mật. |

---

## 4. API CONTRACTS BẮT BUỘC BẢO ĐẢM TƯƠNG THÍCH

Để không làm hỏng tính năng của nền tảng và các client liên quan:
1. `GET /api/subjects`:
   - Response contract:
     ```json
     {
       "grades": [10, 11, 12],
       "subjects": [
         {
           "id": "su",
           "grade": 10,
           "name": "Lịch Sử 10",
           "icon": "📜",
           "description": "...",
           "color": "#7c6aef",
           "dataFile": "su.json"
         }
       ]
     }
     ```
2. `GET /api/data/:subject` (hoặc `api/data/[subject].js`):
   - Response contract:
     ```json
     {
       "lessons": [
         {
           "name": "BÀI 1",
           "questions": [
             {
               "type": "mcq",
               "question": "...",
               "options": ["A", "B", "C", "D"],
               "correct": 0
             }
           ],
           "questionGroups": [
             {
               "passage": "...",
               "statements": [
                 { "question": "...", "correct": true }
               ]
             }
           ]
         }
       ]
     }
     ```
3. `GET /api/announcements`, `POST /api/announcements`, `PATCH /api/pin-announcement`, `DELETE /api/delete-announcement`.

---

## 5. PHÂN TÍCH RỦI RO, LỖ HỔNG VÀ VẤN ĐỀ KỸ THUẬT NGHIÊM TRỌNG

### 5.1. Vấn đề Server Crash cục bộ khi thiếu biến môi trường Supabase
- **Vị trí**: `server.js` dòng 11-13:
  ```javascript
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  ```
- **Hiện tượng**: Khi lập trình viên mới clone repo hoặc chạy local mà chưa có file `.env`, thư viện `@supabase/supabase-js` ném lỗi `Error: supabaseUrl is required.` làm tiến trình Node.js crash ngay lập tức!
- **Giải pháp**: Bổ sung cơ chế fallback/lazy-init Supabase an toàn. Nếu thiếu URL/Key thì thông báo warning và trả về mock/empty array thay vì làm chết toàn bộ web server.

### 5.2. Lộ Supabase Anon Key ở Client-side Admin Script
- **Vị trí**: `public/js/admin.js` dòng 6-7 chứa trực tiếp chuỗi URL và JWT anon key của project Supabase thật:
  ```javascript
  const SUPABASE_URL = "https://bjcgwophobdkjrscilni.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
  ```
- **Rủi ro**: Bất kỳ người dùng nào mở trang `admin.html` đều có thể lấy khóa này. Dù là anon key, nếu Row Level Security (RLS) của bảng Supabase chưa được cấu hình chặt chẽ, người ngoài có thể xóa toàn bộ thông báo của cộng đồng.
- **Giải pháp**: Ủy quyền toàn bộ thao tác ghi/xóa thông báo qua backend API endpoints (`/api/announcements`, `/api/delete-announcement`), không hardcode trong mã nguồn client.

### 5.3. Trình diễn dữ liệu giả (Mock Metrics) trên Dashboard
- **Vị trí**: `public/js/app.js` dòng 264:
  ```javascript
  statQuestions.textContent = this.subjects.length * 150;
  ```
  Và hàm `getSubjectProgress` trả về giá trị giả lập.
- **Vi phạm Product Vision**: Yêu cầu III & VII chỉ rõ không được trình bày dữ liệu mẫu như kết quả thật của học sinh. Nếu học sinh chưa làm bài, tiến độ phải hiển thị rõ ràng là 0% hoặc trạng thái "Chưa bắt đầu".

### 5.4. Gánh nặng hiệu năng đồ họa (Heavy Decorative Assets)
- **Vị trí**: `public/index.html` dòng 52 và 55 nạp trực tiếp hai tệp video `banner.mp4` (4.65 MB) và `avatar.mp4` (1.85 MB) chạy autoplay vòng lặp vô tận chỉ để hiển thị banner Discord.
- **Hậu quả**: Tiêu tốn 6.5 MB băng thông di động ngay khi vào trang chủ, gây nghẽn băng thông, giật lag trên thiết bị di động phổ thông và vi phạm nguyên tắc Mobile-First.

### 5.5. Trải nghiệm Responsive và Accessibility (A11y)
- Thiếu các thuộc tính ARIA quan trọng (`role="tablist"`, `aria-selected`, `aria-expanded`).
- Focus outline bị xóa bỏ ở nhiều selector CSS mà không có focus-visible thay thế.
- Thiếu cơ chế hỗ trợ `prefers-reduced-motion` cho người dùng nhạy cảm với chuyển động.

---

## 6. PHÂN TÍCH KHẢ NĂNG MIGRATION SANG REACT + TYPESCRIPT + VITE

### 6.1. Đánh giá tính khả thi nếu Rewrite hoàn toàn trong Phase 01
Nếu thực hiện chuyển đổi toàn bộ frontend sang React + TypeScript + Vite ngay trong Phase 01:
- **Xung đột Vercel Deployment**: `vercel.json` hiện tại được cấu hình cho static serving trực tiếp từ `public/` với `"buildCommand": ""`. Việc chuyển sang Vite yêu cầu thay đổi build script thành `vite build`, đổi output directory thành `dist`, thay đổi toàn bộ cơ chế rewrite của Vercel và cấu trúc serverless function.
- **Rủi ro phá vỡ tính năng cũ**: Hàng trăm bài trắc nghiệm Lịch sử, Sinh, Tin đang hoạt động ổn định trên các module `quiz.js`, `study.js`, `data-loader.js`. Một cuộc rewrite vội vã trong Phase 01 sẽ khiến học sinh không thể truy cập các phòng thi thử hiện hữu.
- **Nguy cơ gián đoạn trang Admin**: Trang `admin.html` tách rời phụ thuộc vào script Vanilla; nếu chuyển đổi Vite MPA (Multi-Page App) không khéo léo sẽ làm mất khả năng quản trị.

### 6.2. Kết luận và Phương án Chuyển đổi Từng Bước (Stepwise Migration)
- **Quyết định**: Áp dụng mô hình **Strangler Fig Pattern / Progressive Hybrid Architecture**:
  1. **Phase 01**:
     - Xây dựng hệ thống Design Tokens và App Shell chuẩn mực bằng HTML5/CSS3 mô-đun hóa, hỗ trợ Dark/Light mode và Mobile-first hoàn chỉnh.
     - Triển khai luồng Onboarding lưu trữ thực tế, Student Dashboard thực tế (không số liệu giả), và Subject Explorer cho 4 môn (Toán, Vật lí, Hóa học, Tiếng Anh) trên 3 khối lớp (10, 11, 12).
     - Xây dựng hệ thống Type Definitions (TypeScript contracts `.d.ts` / schemas) cho toàn bộ domain model: UserProfile, Curriculum, Question, Assessment.
     - Giữ nguyên độ tương thích 100% cho các module quiz/study/admin hiện hữu.
     - Khắc phục triệt để lỗi server crash do thiếu Supabase credentials và các lỗ hổng rò rỉ secret.
  2. **Phase 02**: Tích hợp Vite và chuyển đổi các component tương tác sâu (Adaptive Practice, Exam Workspace, Analytics Dashboard) sang React component islands mà không gây gián đoạn nền tảng.

---
*Báo cáo Audit được lưu chính thức tại `docs/rebuild/01-audit.md` làm cơ sở pháp lý và kỹ thuật cho giai đoạn tái cấu trúc.*
