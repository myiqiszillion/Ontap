# 34 — MÔ HÌNH ƯỚC LƯỢNG NĂNG LỰC & PHÂN TÍCH LỖ HỔNG TRI THỨC (MASTERY ESTIMATION & GAP ANALYZER)

**Thời điểm:** 11 Tháng 10, 2026 (Asia/Saigon)  
**Tác giả:** Assessment Scientist & Learning Analytics Engineer  
**Repository:** `Ontap-main`  
**File nguồn chính:** [`engine/diagnostic/skill-mastery-estimator.js`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/skill-mastery-estimator.js), [`engine/diagnostic/skill-evidence-aggregator.js`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/skill-evidence-aggregator.js), [`engine/diagnostic/knowledge-gap-analyzer.js`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/knowledge-gap-analyzer.js)  

---

## 1. NỀN TẢNG KHOA HỌC: MÔ HÌNH BAYES BETA-BINOMIAL

### Vì sao từ chối IRT/CAT chưa chuẩn hóa và Black-Box AI?
- **Item Response Theory (IRT / CAT):** Yêu cầu hàng chục nghìn lượt làm bài thực tế để chuẩn hóa tham số độ khó ($b$), độ phân biệt ($a$), và hệ số đoán mò ($c$). Khi dữ liệu trường học thực tế chưa có, việc gán thông số IRT giả định là hành vi ngụy tạo khoa học.
- **AI Ngôn ngữ Tự sinh (LLM Prompt-based Mastery):** Các prompt yêu cầu LLM "chấm mức độ thành thạo của học sinh từ 0 đến 100%" tạo ra những con số vô căn cứ, không có tính tất định, không thể tái lập và vi phạm đạo đức EdTech.
- **Lựa chọn của NTMK:** Áp dụng mô hình **Bayesian Beta-Binomial với trọng số nhận thức**, minh bạch 100%, giải thích được và kiểm thử toán học chính xác.

---

## 2. CÔNG THỨC TOÁN HỌC & CẬP NHẬT HẬU NGHIỆM (BAYESIAN FORMULATION)

### 1. Phân phối Tiền nghiệm (Prior Distribution)
Mỗi kỹ năng được khởi tạo với một tiền nghiệm thông tin yếu (weakly informative prior):
$$\theta \sim \text{Beta}(\alpha_0 = 1.5, \beta_0 = 1.5)$$
Kỳ vọng tiền nghiệm ban đầu nằm tại trung vị $E[\theta] = \frac{1.5}{1.5 + 1.5} = 0.50$ (mức độ trung tính, không thiên vị).

### 2. Trọng số Mức độ Nhận thức (Cognitive Weights)
Các câu hỏi ở mức độ tư duy cao hơn cung cấp bằng chứng mạnh hơn về năng lực học sinh:
- **Nhận biết (Recognize):** Trọng số $w = 1.0$
- **Thông hiểu (Understand):** Trọng số $w = 1.1$
- **Vận dụng (Apply):** Trọng số $w = 1.25$
- **Vận dụng cao (High Apply):** Trọng số $w = 1.4$

### 3. Cập nhật Hậu nghiệm theo từng Bằng chứng (Posterior Update)
Với mỗi câu hỏi thứ $k$ có mức độ nhận thức với trọng số $w_k$:
- **Nếu trả lời đúng hoàn toàn ($s_k = 1.0$):**
  $$\alpha \leftarrow \alpha + w_k \cdot 1.0$$
- **Nếu trả lời đúng một phần (True/False group partial credit $0 < s_k < 1.0$):**
  $$\alpha \leftarrow \alpha + w_k \cdot s_k, \quad \beta \leftarrow \beta + w_k \cdot (1 - s_k)$$
- **Nếu trả lời sai ($s_k = 0$):**
  $$\beta \leftarrow \beta + w_k \cdot 1.0$$
- **Nếu bỏ trống (Unanswered):**
  $$\beta \leftarrow \beta + w_k \cdot 0.75 \quad \text{(phạt tính bất định & khoảng trống tri thức)}$$

### 4. Kỳ vọng Hậu nghiệm & Khoảng Tin cậy 80% (Credible Interval)
Kỳ vọng năng lực ước lượng:
$$\hat{\theta} = \frac{\alpha}{\alpha + \beta}$$
Phương sai hậu nghiệm:
$$\sigma^2 = \frac{\alpha \beta}{(\alpha + \beta)^2 (\alpha + \beta + 1)}$$
Khoảng tin cậy hậu nghiệm 80% (xấp xỉ Gauss):
$$[\text{Lower}, \text{Upper}] = \left[ \max(0, \hat{\theta} - 1.28 \sigma), \; \min(1, \hat{\theta} + 1.28 \sigma) \right]$$

---

## 3. NGUYÊN TẮC NGƯỠNG TỐI THIỂU BẰNG CHỨNG (INSUFFICIENT EVIDENCE THRESHOLD)

Đây là quy tắc đạo đức sư phạm cốt lõi của Phase 03A:

> **Quy tắc:** Nếu một kỹ năng chỉ mới được kiểm tra ít hơn 2 câu hỏi (`testedCount < 2`), hệ thống **tuyệt đối không hiển thị tỷ lệ phần trăm thành thạo giả định**.
> Trạng thái bắt buộc phải hiển thị là: `insufficient_evidence` ("Chưa đủ dữ liệu đánh giá").

### Phân cấp 6 Trạng thái Năng lực (Mastery States):

| Trạng thái | Điều kiện định lượng | Nhãn hiển thị | Ý nghĩa sư phạm |
|---|---|---|---|
| `not_assessed` | `testedCount === 0` | Chưa đánh giá | Học sinh chưa làm câu hỏi nào thuộc chủ đề này. |
| `insufficient_evidence` | `testedCount < 2` | Chưa đủ dữ liệu đánh giá | Số lượng câu hỏi lấy mẫu chưa đủ để đưa ra kết luận tin cậy. |
| `needs_foundation` | $\hat{\theta} < 0.45$ | Cần củng cố nền tảng | Học sinh gặp khó khăn ngay ở mức nhận biết và thông hiểu; cần xem lại lý thuyết. |
| `developing` | $0.45 \le \hat{\theta} < 0.65$ | Đang phát triển | Đã giải được các bài cơ bản nhưng kết quả còn dao động ở mức vận dụng. |
| `proficient` | $0.65 \le \hat{\theta} < 0.85$ | Thành thạo | Nắm vững kiến thức trọng tâm; giải tốt các bài toán thông hiểu và vận dụng. |
| `strong` | $\hat{\theta} \ge 0.85 \land \text{Conf} \ge 0.60$ | Vững vàng | Kiến thức rất sâu sắc và ổn định trên tất cả các mức độ nhận thức. |

---

## 4. BỘ PHÂN TÍCH LỖ HỔNG TRI THỨC (KNOWLEDGE GAP ANALYZER)

Module [`KnowledgeGapAnalyzer`](file:///c:/Users/Administrator/Documents/Ontap-main/engine/diagnostic/knowledge-gap-analyzer.js) thực hiện nhiệm vụ tổng hợp hồ sơ năng lực và lập danh mục ưu tiên ôn luyện:

### Công thức Xếp hạng Ưu tiên Ôn tập (Gap Priority Formula):
$$\text{PriorityScore} = (1 - \hat{\theta}) \times 40 + \text{Confidence} \times 20 + \min(25, N_{\text{dependents}} \times 8) + \text{Bonus}_{\text{target}}$$

Trong đó:
1. $(1 - \hat{\theta}) \times 40$: Mức độ nghiêm trọng của sự thiếu hụt quan sát được.
2. $\text{Confidence} \times 20$: Độ tin cậy của dữ liệu bài thi.
3. $\min(25, N_{\text{dependents}} \times 8)$: **Trọng số cản trở nền tảng**. Nếu kỹ năng này là tiên quyết của nhiều kỹ năng phía sau ($N_{\text{dependents}} > 0$), nó sẽ được đẩy lên vị trí **ƯU TIÊN SỐ 1** để giải phóng tắc nghẽn học tập.
4. $\text{Bonus}_{\text{target}}$: Điểm ưu tiên nếu kỹ năng thuộc khối lớp mục tiêu của học sinh (+15 điểm).

### Phán quyết Mức độ Sẵn sàng (Readiness Verdict):
- `good_foundation`: Không có lỗ hổng lớn, năng lực vững vàng, sẵn sàng chuyển sang luyện đề nâng cao.
- `moderate_gaps`: Nắm được đa số kiến thức cơ bản nhưng có 1–2 chủ đề cần củng cố sớm.
- `critical_foundational_gaps`: Xuất hiện nhiều lỗ hổng nền tảng trọng tâm (đặc biệt là các kỹ năng liên khối); cần giải quyết triệt để trước khi tiếp tục học chương mới.
