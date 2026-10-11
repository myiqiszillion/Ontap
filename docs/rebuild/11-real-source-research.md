# 11 — Real source research (Phase 02B)

Ngày kiểm tra: 11/10/2026, Asia/Saigon. Kết luận: **BLOCKED cho live ingestion**, không phải không tồn tại học liệu mở. Chưa xác minh được một hợp đồng nguồn phù hợp với việc tự động lấy câu hỏi, lưu đáp án, dịch/chỉnh sửa và tái phân phối trong NTMK hiện tại. Không vượt kiểm soát truy cập.

## Bằng chứng

[evidence/source-access.json](evidence/source-access.json) lưu URL, thời điểm UTC, HTTP status, content type, bytes và robots thực nhận bằng HTTPFetcher của repository. Lượt nghiên cứu diễn ra khoảng 14:10 ngày 11/10/2026 giờ Việt Nam. Đây là truy cập metadata, không phải sync câu hỏi; số câu nhập/xuất bản đều 0. Search/browser đọc được trang không có nghĩa connector có thể truy cập hoặc có quyền lấy lại nội dung.

| Nguồn và URL thực tế | Môn/lớp có thể đối chiếu | Truy cập và định dạng | API / đáp án / công thức | Quyền sử dụng và quyết định |
|---|---|---|---|---|
| [Bộ GDĐT, đề tham khảo từ 2025](https://vqa.moet.gov.vn/vi/news/tin-tuc-su-kien/de-thi-tham-khao-ky-thi-tot-nghiep-thpt-tu-nam-2025-159.html) | 4 môn, trọng tâm tốt nghiệp; không tự gán câu lớp 12 sang 10/11 | HTTP 200 HTML, liên kết tài liệu | Chưa xác minh API công khai; PDF/hình/công thức/đáp án cần parser riêng và kiểm tra bản gốc | Không có bằng chứng giấy phép tái phân phối ngân hàng; BLOCKED, xin quyền từ đơn vị phát hành. Không coi là Public Domain |
| [OpenStax](https://openstax.org/subjects/science), [licensing](https://help.openstax.org/s/article/Licensing-information-of-OpenStax-textbooks) | Toán/Lí/Hóa; cần chuyên gia ánh xạ lớp 10–12; không coi sách tiếng Anh là môn Tiếng Anh GDPT | Licensing HTTP 200 HTML; nội dung sách HTML/PDF | Chưa xác minh API câu hỏi có hợp đồng ổn định; bài tập/đáp án và tài sản khác nhau theo sách | Hướng dẫn hiện tại CC BY-NC-SA. Cần đối chiếu phiên bản sách, attribution, share-alike, mục đích NTMK và tài sản bên thứ ba. BLOCKED; không giữ tuyên bố CC BY của code cũ |
| [Khan Academy usage terms](https://support.khanacademy.org/hc/en-us/articles/42929097425037-What-s-allowed-and-not-allowed-under-Khan-Academy-s-Terms-of-Service) | Toán/Lí/Hóa; học liệu Anh không đồng nghĩa môn Anh GDPT | Direct robots URL trả HTML Client Challenge, HTTP 200; đã dừng | Chưa xác minh API được phép lấy và tái phân phối exercise/answer keys; không dùng API nội bộ | Hướng dẫn nêu personal/non-commercial và prohibited conduct; quyền nội dung từng loại cần kiểm tra. BLOCKED |
| [CK-12 terms](https://help.ck12.org/hc/en-us/articles/51042851054235-CK-12-Terms-of-Use), [materials license](https://help.ck12.org/hc/en-us/articles/50990257420955-CK-12-Curriculum-Materials-License) | Toán/Lí/Hóa, đối chiếu GDPT 10–12 còn thiếu | Direct robots HTTP 403; không thử vượt hạn chế | Không xác minh API phù hợp; câu hỏi/công thức/đáp án cần hợp đồng provider | Điều khoản hiện tại hạn chế content aggregation; cần quyền bằng văn bản cho cách dùng NTMK. BLOCKED; có thể liên hệ legal@ck12.org, chưa gửi liên hệ |
| [VietJack](https://vietjack.com/) | Trang danh mục có 4 môn, 10–12 | Website đọc được qua web research; direct robots 404 | HTML; chưa xác minh API công khai hay quyền lấy answer keys/assets | Chưa tìm được giấy phép phù hợp; đọc miễn phí không cho phép sao chép. BLOCKED; xin API/giấy phép provider |
| [Loigiaihay](https://loigiaihay.com/) | 4 môn, 10–12 | Trang HTML đọc được; robots HTTP 200 text/plain | Chưa xác minh API công khai; parser/đáp án/công thức chưa được thử | Robots cho phép nhiều đường dẫn nhưng không cấp quyền tái phân phối. BLOCKED; xin phép provider |
| NTMK bundled bank, data/*.json | Chỉ 31 câu/nhóm lớp 10 ở 4 môn | JSON local; không có Internet acquisition | MCQ/TF/SA; provenance, hồ sơ kiểm duyệt và ownership còn thiếu | Không tự xác nhận ban biên soạn hoặc chữ ký giáo viên. Local practice được giữ; không tự xuất bản vào V2 |

## Robots, giới hạn và lịch sync

- OpenStax robots thực nhận chặn một số đường dẫn, bao gồm /resources và /apps/archive. Có nhóm GPTBot chặn /books/. Không truy cập sách trong lần nghiên cứu này. Cần xác minh agent và URL tài liệu cụ thể trước khi cấp phép sync; không đổi agent để tránh hạn chế.
- Ministry robots thực nhận chặn các đường dẫn quản trị/hệ thống. Trang thông báo không nằm trong các đường dẫn chặn đã đọc. Điều này không cấp quyền bản quyền.
- Khan robots request nhận challenge HTML: không coi là robots hợp lệ. CK-12 trả 403: dừng. VietJack robots 404: chưa biết policy. Loigiaihay policy thực nhận được lưu trong evidence.
- **Không xác minh được tần suất sync được provider cho phép** cho bất kỳ nguồn ứng viên nào. Rate limit 6/phút của công cụ nghiên cứu chỉ là giới hạn kỹ thuật nội bộ. Không bật scheduler hay sync hàng loạt.

## Blueprint theo năm

[Thông tin quy chế từ 2025](https://vqa.moet.gov.vn/vi/news/tin-tuc-su-kien/ban-hanh-quy-che-thi-tot-nghiep-thpt-tu-nam-2025-167.html) và [thông tin kỳ thi 2026](https://vqa.moet.gov.vn/vi/news/tin-tuc-su-kien/ky-thi-tot-nghiep-thpt-nam-2026-giu-on-dinh-mot-so-dieu-chinh-khong-anh-huong-toi-thi-sinh-226.html) được tìm thấy trên nguồn chính thức. Code giữ cấu trúc 2025 hiện có. Chưa triển khai kho blueprint version theo năm, chưa thẩm định mọi văn bản/đáp án theo năm; không tự tuyên bố chuẩn chính thức 2026.

## Cách mở khóa một nguồn

Có giấy phép/điều khoản phù hợp với mô hình NTMK; xác nhận endpoint, schema, đáp án, tài sản, pagination, quota và lịch. Đăng ký source với permissionApproved và licenseEvidence thực; cấu hình adapter và allowedHosts. Chạy một batch giới hạn, lưu HTTP/item/rejection/record IDs. Reviewer được phân quyền đối soát answer keys và chương trình; publication tách khỏi sync. Không ai đã được giả lập thành giáo viên thật trong lần triển khai này.
