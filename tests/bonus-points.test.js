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

  test('vercel.json rewrites /diem-cong to /diem-cong.html', () => {
    const vercelConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
    const rewrite = vercelConfig.rewrites.find(r => r.source === '/diem-cong');
    assert.ok(rewrite, 'rewrite for /diem-cong must exist');
    assert.strictEqual(rewrite.destination, '/diem-cong.html');
  });

  test('api/bonus-points GET and POST sync endpoints work correctly', async () => {
    const server = app.listen(0);
    const port = server.address().port;
    try {
      // 1. POST save
      const postRes = await fetch(`http://127.0.0.1:${port}/api/bonus-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: [
            { stt: 1, id: "2503892386", fullName: "Nguyễn Ngọc Quỳnh An", points: 3 }
          ]
        })
      });
      assert.strictEqual(postRes.status, 200);
      const postJson = await postRes.json();
      assert.strictEqual(postJson.success, true);

      // 2. GET retrieve
      const getRes = await fetch(`http://127.0.0.1:${port}/api/bonus-points`);
      assert.strictEqual(getRes.status, 200);
      const getJson = await getRes.json();
      assert.ok(Array.isArray(getJson.data), 'data must be an array');
    } finally {
      server.close();
    }
  });
});
