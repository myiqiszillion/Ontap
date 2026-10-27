/**
 * 14-Question Human Review Dossier Generator & Export Module
 * NTMK Rebuild Phase 04B — Task 5
 *
 * Responsibilities:
 * - Generate complete pedagogical review dossiers for 14 Grade 10 Math pilot questions.
 * - Enforce default 'needs_review' status and null reviewer signature.
 * - Zero artificial/forged endorsements or academic degrees.
 * - Provide actionable inspection checklists for real certified mathematics educators.
 */

const fs = require('fs');
const path = require('path');
const { PILOT_QUESTIONS } = require('../storage/pilot-questions-data.js');

const PEDAGOGICAL_CHECKLIST_TEMPLATE = [
  'Độ chính xác toán học: Định nghĩa, giả thiết, lập luận và kết luận không có sai sót khoa học.',
  'Cú pháp KaTeX/LaTeX: 100% công thức hiển thị chuẩn xác, không lỗi parsing, không lẫn HTML.',
  'Chất lượng phương án nhiễu (MCQ): Các phương án sai phản ánh đúng các lỗi tư duy phổ biến của học sinh.',
  'Chuẩn hóa nhóm Đúng/Sai (TF): 4 phát biểu độc lập, có lời giải chi tiết cho từng phát biểu theo barem QĐ 764.',
  'Chuẩn hóa câu Trả lời ngắn (SA): Kết quả duy nhất, quy tắc làm tròn rõ ràng, tương thích dấu phẩy/chấm thập phân.',
  'Chuẩn chương trình GDPT 2018: Phù hợp mục tiêu cần đạt của kỹ năng và khối lớp 10.',
  'Độ phân hóa & mức nhận thức: Gán đúng mức độ (Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao).',
  'Tính pháp lý & Bản quyền: Thuộc quyền sử dụng hoặc biên soạn hợp pháp của dự án.'
];

function generateReviewDossier() {
  const dossier = {
    title: 'HỒ SƠ KIỂM DUYỆT SƯ PHẠM — 14 CÂU HỎI THÍ ĐIỂM TOÁN 10 GDPT 2018',
    generatedAt: new Date().toISOString(),
    totalQuestions: PILOT_QUESTIONS.length,
    defaultStatus: 'needs_review',
    humanVerificationGate: 'BLOCKED (Chờ thẩm định viên có chứng chỉ sư phạm thực tế ký duyệt)',
    curriculumStandards: 'Chương trình Giáo dục Phổ thông 2018 — Bộ Giáo dục và Đào tạo',
    scoringBlueprint: 'Quyết định 764/QĐ-BGDĐT',
    questions: PILOT_QUESTIONS.map((q, idx) => {
      let answerSummary = '';
      if (q.format === 'multiple_choice') {
        const optLetter = ['A', 'B', 'C', 'D'][q.mcqPayload.correctOptionIndex];
        answerSummary = `Đáp án đúng: **${optLetter}** (${q.mcqPayload.options[q.mcqPayload.correctOptionIndex]})`;
      } else if (q.format === 'true_false_group') {
        answerSummary = q.tfPayload.statements
          .map((s, i) => `${['a', 'b', 'c', 'd'][i]}) ${s.correct ? 'ĐÚNG' : 'SAI'}`)
          .join(' | ');
      } else if (q.format === 'short_answer') {
        answerSummary = `Đáp án số học: **${q.shortAnswerPayload.canonicalAnswer}** (Dung sai: ±${q.answerPolicy?.tolerance || 0})`;
      }

      return {
        itemNumber: idx + 1,
        id: q.id,
        format: q.format,
        grade: q.grade,
        subjectId: q.subjectId,
        domainId: q.domainId,
        topic: q.topic,
        skillId: q.skillId,
        cognitiveLevel: q.cognitiveLevel,
        difficultyEstimate: q.cognitiveLevel === 'recognize' ? 0.25 : (q.cognitiveLevel === 'understand' ? 0.45 : (q.cognitiveLevel === 'apply' ? 0.70 : 0.90)),
        prompt: q.prompt,
        optionsOrDetails: q.mcqPayload?.options || q.tfPayload?.statements || q.shortAnswerPayload,
        answerSummary,
        explanation: q.explanation,
        provenance: {
          sourceId: q.source.sourceId,
          sourceName: q.source.sourceName,
          license: q.source.license,
          licenseEvidence: q.source.licenseEvidence,
          isAiAssisted: q.source.isAiAssisted,
          originType: q.source.originType
        },
        reviewStatus: q.status,
        verifiedBy: q.source.verifiedBy,
        verifiedAt: q.source.verifiedAt,
        checklist: PEDAGOGICAL_CHECKLIST_TEMPLATE,
        reviewNotes: q.source.reviewNotes || '',
        decision: 'AWAITING_HUMAN_REVIEWER'
      };
    })
  };

  return dossier;
}

function renderDossierToMarkdown(dossier) {
  let md = `# ${dossier.title}\n\n`;
  md += `> **Thời điểm xuất hồ sơ:** ${dossier.generatedAt}  \n`;
  md += `> **Quy chuẩn chương trình:** ${dossier.curriculumStandards}  \n`;
  md += `> **Cấu trúc đánh giá:** ${dossier.scoringBlueprint}  \n`;
  md += `> **Trạng thái cổng nội dung (Content Gate):** **\`${dossier.humanVerificationGate}\`**  \n`;
  md += `> **Tổng số câu hỏi trong hồ sơ:** **${dossier.totalQuestions} câu**  \n\n`;
  md += `---\n\n`;

  md += `## 1. NGUYÊN TẮC QUẢN TRỊ KIỂM DUYỆT (REVIEW GOVERNANCE)\n\n`;
  md += `1. **Mặc định \`needs_review\`:** 100% câu hỏi ban đầu là bản nháp kỹ thuật hỗ trợ bởi AI (\`ai_assisted_draft\`), chưa có phê duyệt sư phạm con người.\n`;
  md += `2. **Không tự động công nhận (Zero Auto-Approval):** Việc vượt qua các bộ kiểm tra kỹ thuật (QuestionValidator, KaTeX Parser, HTML Sanitizer) là điều kiện cần, KHÔNG THAY THẾ chữ ký con người.\n`;
  md += `3. **Bảo mật và Danh tính thật:** Thẩm định viên phải là giáo viên bộ môn Toán có chứng chỉ hành nghề, được cấp token riêng qua hệ thống quản trị, trực tiếp đối soát nội dung và ký số thẩm định.\n`;
  md += `4. **Cổng xuất bản an toàn:** Chỉ khi 100% câu hỏi của một chủ đề được duyệt bởi thẩm định viên thật, chủ đề đó mới được mở cho học sinh luyện tập thí điểm (\`Reviewed Topic Practice Pilot\`).\n\n`;
  md += `---\n\n`;

  md += `## 2. BẢNG TỔNG HỢP 14 CÂU HỎI CHỜ KIỂM DUYỆT\n\n`;
  md += `| STT | Mã Câu hỏi | Dạng thức | Chủ đề | Kỹ năng GDPT 2018 | Mức nhận thức | Nguồn gốc | Trạng thái |\n`;
  md += `| :-: | :--- | :-: | :--- | :--- | :-: | :---: | :-: |\n`;
  dossier.questions.forEach(q => {
    md += `| ${q.itemNumber} | \`${q.id}\` | ${q.format.toUpperCase()} | ${q.topic} | \`${q.skillId}\` | ${q.cognitiveLevel} | ${q.provenance.originType} | **\`${q.reviewStatus}\`** |\n`;
  });
  md += `\n---\n\n`;

  md += `## 3. HỒ SƠ CHI TIẾT TỪNG CÂU HỎI\n\n`;

  dossier.questions.forEach(q => {
    md += `### Câu ${q.itemNumber} — Mã: \`${q.id}\`\n\n`;
    md += `- **Dạng thức:** \`${q.format}\`  \n`;
    md += `- **Môn học & Khối:** Toán 10 (\`${q.subjectId}\`, Khối ${q.grade})  \n`;
    md += `- **Chủ đề:** \`${q.topic}\` — Kỹ năng: \`${q.skillId}\`  \n`;
    md += `- **Mức nhận thức:** \`${q.cognitiveLevel}\` (Độ khó ước tính: ${q.difficultyEstimate})  \n`;
    md += `- **Nguồn biên soạn:** ${q.provenance.sourceName} (\`${q.provenance.originType}\`, AI-assisted: ${q.provenance.isAiAssisted})  \n`;
    md += `- **Bằng chứng bản quyền:** ${q.provenance.licenseEvidence}  \n\n`;

    md += `#### Đề bài:\n> ${q.prompt}\n\n`;

    if (q.format === 'multiple_choice') {
      md += `#### Các phương án lựa chọn:\n`;
      const labels = ['A', 'B', 'C', 'D'];
      q.optionsOrDetails.forEach((opt, idx) => {
        md += `- **${labels[idx]}.** ${opt}\n`;
      });
      md += `\n`;
    } else if (q.format === 'true_false_group') {
      md += `#### Các phát biểu nhỏ (4 ý):\n`;
      const labels = ['a', 'b', 'c', 'd'];
      q.optionsOrDetails.forEach((stmt, idx) => {
        md += `- **${labels[idx]})** ${stmt.statement} → *Dự kiến: ${stmt.correct ? 'ĐÚNG' : 'SAI'}*  \n  *Giải thích:* ${stmt.explanation}\n`;
      });
      md += `\n`;
    } else if (q.format === 'short_answer') {
      md += `#### Dữ liệu trả lời ngắn:\n`;
      md += `- Đáp án chuẩn: \`${q.optionsOrDetails.canonicalAnswer}\`  \n`;
      md += `- Kiểu dữ liệu: \`${q.optionsOrDetails.answerType}\`  \n`;
      md += `- Quy ước làm tròn: ${q.optionsOrDetails.roundingInstruction || 'Không có'}  \n\n`;
    }

    md += `#### ${q.answerSummary}\n\n`;
    md += `#### Lời giải chi tiết:\n\`\`\`text\n${q.explanation}\n\`\`\`\n\n`;

    md += `#### Tiêu chí thẩm định bắt buộc cho Giáo viên:\n`;
    q.checklist.forEach(chk => {
      md += `- [ ] ${chk}\n`;
    });
    md += `\n`;

    md += `#### Phiếu ký duyệt của Thẩm định viên:\n`;
    md += `- **Người thẩm định (Reviewer ID):** \`${q.verifiedBy || 'CHƯA CÓ — CHỜ GIÁO VIÊN THỰC TẾ'}\`\n`;
    md += `- **Thời điểm thẩm định:** \`${q.verifiedAt || 'CHƯA CÓ'}\`\n`;
    md += `- **Ghi chú chuyên môn:** \`${q.reviewNotes || 'Chưa ghi nhận'}\`\n`;
    md += `- **Quyết định:** **\`${q.decision}\`**\n\n`;
    md += `---\n\n`;
  });

  return md;
}

function exportDossierToFile(targetPath = null) {
  const dossier = generateReviewDossier();
  const md = renderDossierToMarkdown(dossier);
  const outputPath = targetPath || path.join(process.cwd(), 'docs', 'rebuild', '58-toan10-human-review-package.md');
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, md, 'utf8');
  return { outputPath, totalQuestions: dossier.totalQuestions };
}

if (require.main === module) {
  const result = exportDossierToFile();
  console.log(`✅ Xuất hồ sơ kiểm duyệt thành công: ${result.outputPath} (${result.totalQuestions} câu hỏi)`);
}

module.exports = {
  generateReviewDossier,
  renderDossierToMarkdown,
  exportDossierToFile,
  PEDAGOGICAL_CHECKLIST_TEMPLATE
};
