const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { app } = require('../server.js');

describe('Hidden Bonus Points Site (/diem-cong)', () => {
  const filePath = path.join(__dirname, '..', 'public', 'diem-cong.html');

  test('public/diem-cong.html exists and is accessible', () => {
    assert.ok(fs.existsSync(filePath), 'diem-cong.html must exist');
  });

  test('contains all 45 students accurately transcribed', () => {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.match(content, /2503892386/); // Nguyễn Ngọc Quỳnh An
    assert.match(content, /2503892506/); // Đặng Thế Doanh
    assert.match(content, /2503893006/); // Lê Viết Hồng Sơn
    assert.match(content, /2603481986/); // Vũ Thị Quỳnh Anh (STT 45)
    assert.match(content, /stat-total-students.*45/);
  });

  test('no raw emojis used in diem-cong.html', () => {
    const content = fs.readFileSync(filePath, 'utf8');
    const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}])/u;
    assert.strictEqual(EMOJI_REGEX.test(content), false, 'Must not contain raw emojis');
  });

  test('express serves /diem-cong route correctly', async () => {
    const server = app.listen(0);
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/diem-cong`);
      assert.strictEqual(res.status, 200);
      const text = await res.text();
      assert.match(text, /Sổ Điểm Cộng Học Sinh/);
    } finally {
      server.close();
    }
  });
});
