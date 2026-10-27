/**
 * NTMK Achievement Card Generator
 * Renders high-resolution 1200x675 shareable PNG card with canvas graphics
 */

const ResultCard = {
  generate(data) {
    if (typeof document === 'undefined') return;

    const {
      subjectName = 'Bài thi trắc nghiệm',
      score = 0,
      total = 10,
      timeUsed = '0:00',
      percentage = 0,
      studentName = 'Học sinh NTMK'
    } = data;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 675;
    const ctx = canvas.getContext('2d');

    // 1. Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 675);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.5, '#111827');
    bgGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 675);

    // Decorative geometric circles in background
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1050, 100, 280, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(150, 550, 220, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Gold Heritage Frame / Border
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1140, 615);

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, 1120, 595);

    // Corner decorative accents
    this.drawCorner(ctx, 30, 30);
    this.drawCorner(ctx, 1170, 30);
    this.drawCorner(ctx, 30, 645);
    this.drawCorner(ctx, 1170, 645);

    // 3. School Header Banner
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('TRƯỜNG THPT NGUYỄN THỊ MINH KHAI (EST. 1913)', 70, 85);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 15px Inter, sans-serif';
    ctx.fillText('VIỆN HÀN LÂM SỐ • CHỨNG NHẬN NĂNG LỰC KHẢO THÍ GDPT 2018', 70, 112);

    // Header Right: Badge
    ctx.fillStyle = 'rgba(217, 119, 6, 0.2)';
    this.roundRect(ctx, 920, 65, 210, 44, 22, true, false);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, 920, 65, 210, 44, 22, false, true);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CHỨNG CHỈ DANH DỰ', 1025, 93);

    // Divider Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, 140);
    ctx.lineTo(1130, 140);
    ctx.stroke();

    // 4. Middle Left: Subject & Student Info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 38px Inter, sans-serif';
    ctx.fillText(subjectName, 70, 210);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 20px Inter, sans-serif';
    ctx.fillText(`Thí sinh: ${studentName}`, 70, 255);

    // Title / Rank Badge
    let rankBadge = '🎖️ HOÀN THÀNH TỐT';
    let badgeBg = '#3b82f6';
    if (percentage >= 90) { rankBadge = '👑 THỦ KHOA XUẤT SẮC'; badgeBg = '#d97706'; }
    else if (percentage >= 75) { rankBadge = '🌟 THÀNH TÍCH GIỎI'; badgeBg = '#10b981'; }

    ctx.fillStyle = badgeBg;
    this.roundRect(ctx, 70, 280, 260, 42, 10, true, false);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(rankBadge, 85, 307);

    // Metric Chips (Grid)
    const metricsY = 360;
    this.drawMetricCard(ctx, 70, metricsY, 150, 95, 'Điểm số', `${score} / ${total}`, '#f59e0b');
    this.drawMetricCard(ctx, 240, metricsY, 150, 95, 'Độ chính xác', `${percentage}%`, '#10b981');
    this.drawMetricCard(ctx, 410, metricsY, 150, 95, 'Thời gian', timeUsed, '#38bdf8');

    // 5. Middle Right: Giant Score Dial
    const circleX = 890;
    const circleY = 360;
    const radius = 135;

    // Outer glow
    const dialGlow = ctx.createRadialGradient(circleX, circleY, radius * 0.7, circleX, circleY, radius * 1.3);
    dialGlow.addColorStop(0, 'rgba(217, 119, 6, 0.25)');
    dialGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = dialGlow;
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius * 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Background circle
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Progress circle
    const endAngle = -Math.PI / 2 + (percentage / 100) * (Math.PI * 2);
    const scoreGrad = ctx.createLinearGradient(circleX - radius, circleY, circleX + radius, circleY);
    scoreGrad.addColorStop(0, '#f59e0b');
    scoreGrad.addColorStop(1, '#10b981');
    ctx.strokeStyle = scoreGrad;
    ctx.lineCap = 'round';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, -Math.PI / 2, endAngle, false);
    ctx.stroke();

    // Score Text in center
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 68px Inter, sans-serif';
    ctx.fillText(score, circleX, circleY + 12);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 20px Inter, sans-serif';
    ctx.fillText(`THANG ĐIỂM ${total}.0`, circleX, circleY + 50);

    // 6. Bottom Strip: Watermark & QR/Verification
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '500 14px Inter, sans-serif';
    const nowStr = new Date().toLocaleString('vi-VN');
    ctx.fillText(`Xác thực: ${nowStr} • https://ntmk.edu.vn • Chuẩn khảo thí QĐ 764/QĐ-BGDĐT`, 70, 605);

    // 7. Trigger download
    const dataUrl = canvas.toDataURL('image/png');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataUrl);
    downloadAnchor.setAttribute('download', `NTMK_KetQua_${Date.now()}.png`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  drawMetricCard(ctx, x, y, w, h, label, val, color) {
    ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
    this.roundRect(ctx, x, y, w, h, 10, true, false);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, x, y, w, h, 10, false, true);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 13px Inter, sans-serif';
    ctx.fillText(label, x + 14, y + 30);

    ctx.fillStyle = color;
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillText(val, x + 14, y + 68);
  },

  drawCorner(ctx, x, y) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  },

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResultCard;
}
