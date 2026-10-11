# Quiz Platform - Nền Tảng Thi Trắc Nghiệm Đa Môn Học

Nền tảng ôn tập trắc nghiệm đa môn học hiện đại với HTML5, CSS3, Vanilla JS và Node.js/Express.

## Tính Năng

- **Kiến trúc Modular**: Tách biệt HTML, CSS, JS riêng biệt
- **Đa môn học**: Dễ dàng thêm môn mới qua JSON
- **Timer Persistence**: Không bị reset khi F5 (dùng sessionStorage)
- **Auto-submit**: Nộp bài tự động khi hết giờ
- **Shuffle**: Trộn câu hỏi và đáp án mỗi lần thi
- **UI/UX**: Premium Dark Theme với Glassmorphism
- **SPA**: Chuyển màn hình mượt mà

## Cấu Trúc Dự Án

```
d-Ontap/
├── data/
│   ├── subjects.json      # Danh sách môn học
│   └── history.json       # Câu hỏi Lịch sử 10
├── public/
│   ├── index.html        # DOM skeleton (SPA)
│   ├── css/
│   │   ├── style.css     # CSS Variables
│   │   └── Global styles + quiz.css      # Quiz-specific styles
│   └── js/
│       ├── api.js        # Data loading + caching
│       ├── timer.js      # Timer with localStorage persistence
│       ├── quiz.js       # Quiz rendering & scoring
│       └── main.js       # Core app logic
├── server.js             # Express API server
├── package.json          # Dependencies
└── README.md            # This file
```

## Cài Đặt

```bash
npm install
```

## Chạy Ứng Dụng

```bash
npm start
```

Server chạy tại: http://localhost:3000

## API Endpoints

- `GET /api/subjects` - Lấy danh sách môn học
- `GET /api/data/:subject` - Lấy câu hỏi theo môn (vd: history, math)

## Thêm Môn Mới

1. Thêm vào `data/subjects.json`:

```json
{
  "id": "physics",
  "name": "Vật Lý",
  "icon": "⚡",
  "description": "Vật lý lớp 10",
  "color": "#fbbf24",
  "questionCount": 120,
  "dataFile": "physics.json"
}
```

2. Tạo file `data/physics.json` với format:

```json
{
  "subject": "Vật Lý 10",
  "lessons": [
    {
      "id": 1,
      "title": "Bài 1: Chuyển động cơ",
      "questions": [
        {
          "id": 1,
          "question": "Câu hỏi...",
          "options": ["A", "B", "C", "D"],
          "correct": 0,
          "explanation": "Giải thích..."
        }
      ]
    }
  ]
}
```

## Edge Cases Đã Xử Lý

| Scenario | Xử lý |
|----------|--------|
| User F5 giữa chừng | Restore timer từ sessionStorage |
| User chọn môn khác | Reset toàn bộ state |
| Hết giờ khi đang thi | Auto-submit |
| Không có câu hỏi | Show error message |
| API load fail | Show retry button |
| Browser back button | Intercept & confirm |

## Công Nghệ

- HTML5
- CSS3 (Variables, Grid, Flexbox, Animations)
- Vanilla JavaScript (ES6+)
- Node.js + Express

## Giấy Phép

ISC
