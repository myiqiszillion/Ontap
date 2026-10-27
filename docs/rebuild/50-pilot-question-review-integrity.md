# NTMK REBUILD — KIỂM ĐỊNH TÍNH TOÀN VẸN VÀ THẨM ĐỊNH SƯ PHẠM 14 CÂU HỎI THÍ ĐIỂM (PHASE 04A)

> **Tài liệu:** `docs/rebuild/50-pilot-question-review-integrity.md`  
> **Phiên bản:** Phase 04A Pilot Content Review Integrity  
> **Thời điểm thẩm định:** 12/10/2026  
> **Trạng thái:** `ALL 14 QUESTIONS MOVED TO NEEDS_REVIEW` | `PUBLICATION REVOKED` | `DEMO ONLY`

---

## 1. NGUYÊN TẮC QUẢN TRỊ NỘI DUNG SƯ PHẠM

Để đảm bảo tính trung thực tuyệt đối trong giáo dục:
1. **Không ngụy tạo chữ ký chuyên gia:** Tuyệt đối không sử dụng tên thật giả định hay chức danh học thuật khi chuyên gia đó chưa trực tiếp thẩm định và ký biên bản.
2. **Minh bạch nguồn gốc (Provenance Transparency):** Mọi câu hỏi do kỹ sư/AI hỗ trợ khởi tạo phải được gắn nhãn `originType: 'ai_assisted_draft'` và `isAiAssisted: true`.
3. **Chính sách Thu hồi Xuất bản (Publication Revocation):** Bất kỳ câu hỏi nào được gán nhãn `published` mà thiếu bằng chứng thẩm định độc lập phải được lập tức thu hồi về trạng thái `needs_review`.
4. **Giới hạn phạm vi sử dụng:** Các câu hỏi nháp chưa qua thẩm định sư phạm chỉ được phép sử dụng trong môi trường thử nghiệm kỹ thuật nội bộ (`Internal Engineering Demo`), không được dùng để đánh giá năng lực chính thức của học sinh.

---

## 2. BẢNG KIỂM KÊ TOÀN DIỆN 14 CÂU HỎI TOÁN 10

| Mã Câu hỏi | Dạng thức | Kỹ năng GDPT 2018 | Nguồn gốc thực tế | Bằng chứng duyệt thật | Trạng thái DB cũ | Trạng thái DB mới | Phạm vi sử dụng cho phép |
| :--- | :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| `toan10_pilot_set_mcq_01` | MCQ | `math-10-sets-logic` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_set_mcq_02` | MCQ | `math-10-sets-logic` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_set_mcq_03` | MCQ | `math-10-sets-logic` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_set_tf_01`  | Đúng/Sai | `math-10-sets-logic` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_set_sa_01`  | Trả lời ngắn | `math-10-sets-logic` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_set_sa_02`  | Trả lời ngắn | `math-10-sets-logic` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_ineq_mcq_01`| MCQ | `math-10-linear-ineq-2vars` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_ineq_mcq_02`| MCQ | `math-10-linear-ineq-2vars` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_ineq_tf_01` | Đúng/Sai | `math-10-linear-ineq-2vars` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_ineq_sa_01` | Trả lời ngắn | `math-10-linear-ineq-2vars` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_quad_mcq_01`| MCQ | `math-10-quad-func` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_quad_mcq_02`| MCQ | `math-10-quad-func` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_quad_tf_01` | Đúng/Sai | `math-10-quad-func` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |
| `toan10_pilot_quad_sa_01` | Trả lời ngắn | `math-10-quad-func` | AI-assisted draft | Chưa có | `published` | `needs_review` | Internal Demo Only |

---

## 3. KẾT QUẢ ĐÁNH GIÁ CHẤT LƯỢNG KỸ THUẬT VÀ TOÁN HỌC

Mặc dù chưa có chữ ký sư phạm ngoài đời thực, quá trình audit kỹ thuật xác nhận các câu hỏi đạt chuẩn kỹ thuật cao:
1. **Tính chính xác của đáp án:**
   - Cả 6 câu MCQ có duy nhất 1 phương án đúng, phương án nhiễu hợp lý.
   - Cả 4 cụm Đúng/Sai (16 mệnh đề nhỏ) có lời giải chi tiết cho từng mệnh đề và barem điểm tương thích QĐ 764/BGDĐT.
   - Cả 4 câu trả lời ngắn có quy tắc làm tròn rõ ràng, chấp nhận chuẩn hóa dấu phẩy thập phân kiểu Việt Nam (ví dụ: `1,8` hoặc `1.8`).
2. **Định dạng KaTeX/LaTeX:**
   - 100% công thức toán học đặt trong cặp dấu `$...$`.
   - Không chứa bất kỳ thẻ HTML thô nào (`<...>` regex check: 0 match).
3. **Độ khó & Phân loại nhận thức:**
   - Nhận biết (Recognize): 3 câu.
   - Thông hiểu (Understand): 5 câu.
   - Vận dụng (Apply): 4 câu.
   - Vận dụng cao (High Apply): 2 câu.

---

## 4. QUY TRÌNH MỜI VÀ DUYỆT THẨM ĐỊNH VIÊN THẬT (PHASE 04B GATE)

Để chuyển 14 câu hỏi này từ `needs_review` sang `published`, hệ thống đã chuẩn bị quy trình 4 bước:
1. **Tạo tài khoản thẩm định viên:** Quản trị viên gọi `ReviewerDirectory.onboardReviewer` với email và thông tin công tác thực tế của giáo viên.
2. **Cấp phát Token an toàn:** Thẩm định viên nhận token cá nhân qua kênh bảo mật.
3. **Thẩm định trên Review Console:** Thẩm định viên đăng nhập, đọc bản nháp LaTeX, kiểm tra tính đúng đắn sư phạm, chọn `Approve` hoặc `Request Revision`.
4. **Xuất bản Authoritative:** Hệ thống chỉ gán `status: published` khi có chữ ký số hợp lệ của thẩm định viên chuyên môn.
