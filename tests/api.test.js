/**
 * Automated Acceptance Test Suite for NTMK Rebuild Express Server APIs
 * Uses Node.js built-in test runner (node --test)
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app } = require('../server.js');

let server;
let port;

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}${path}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    }).on('error', reject);
  });
}

describe('Express Server API Integration (GDPT 2018 - Grade 11 Core Subjects)', () => {
  before(() => {
    return new Promise((resolve) => {
      // Find an available port
      server = app.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(() => {
    return new Promise((resolve) => {
      if (server) {
        server.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  test('GET / serves index.html', async () => {
    const res = await httpGet('/');
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.ok(res.body.includes('<!DOCTYPE html>'));
  });

  test('GET /admin serves admin.html', async () => {
    const res = await httpGet('/admin');
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.ok(res.body.includes('<!DOCTYPE html>'));
  });

  test('GET /api/subjects returns 5 core target subjects for grade 11', async () => {
    const res = await httpGet('/api/subjects');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.deepEqual(json.grades, [11]);
    assert.ok(Array.isArray(json.subjects));
    assert.equal(json.subjects.length, 5);

    // Check that legacy subjects are NOT present
    const hasLegacy = json.subjects.some(s => ['su', 'sinh', 'tin', 'toan10', 'vatli10'].includes(s.subjectKey || s.id));
    assert.equal(hasLegacy, false, 'No redundant subjects in API response');
  });

  test('GET /api/subjects?active_only=true returns active ready subjects', async () => {
    const res = await httpGet('/api/subjects?active_only=true');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.subjects.length >= 5, 'All 5 core subjects are active and ready');
    assert.ok(json.subjects.every(s => s.ready === true), 'All returned subjects must be ready');
    assert.ok(json.subjects.some(s => s.id === 'toan11'), 'Must include toan11');
    assert.ok(json.subjects.some(s => s.id === 'lichsu11'), 'Must include lichsu11');
  });

  test('GET /api/data/toan11 returns toan11.json questions', async () => {
    const res = await httpGet('/api/data/toan11');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.lessons));
    assert.ok(json.lessons.length > 0);
    assert.equal(json.subject, 'Toán học 11');
  });

  test('GET /api/data/vatli11 returns vatli11.json questions', async () => {
    const res = await httpGet('/api/data/vatli11');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.lessons));
    assert.equal(json.subject, 'Vật lí 11');
  });

  test('GET /api/data/hoahoc11 returns hoahoc11.json questions', async () => {
    const res = await httpGet('/api/data/hoahoc11');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.lessons));
    assert.equal(json.subject, 'Hóa học 11');
  });

  test('GET /api/data/tienganh11 returns tienganh11.json questions', async () => {
    const res = await httpGet('/api/data/tienganh11');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.lessons));
    assert.equal(json.subject, 'Tiếng Anh 11');
  });

  test('GET /api/data/lichsu11 returns lichsu11.json questions', async () => {
    const res = await httpGet('/api/data/lichsu11');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.lessons));
    assert.equal(json.lessons.length, 4);
    assert.equal(json.subject, 'Lịch sử 11');
  });

  test('GET /api/data/toan10 returns 404 for removed subject file', async () => {
    const res = await httpGet('/api/data/toan10');
    assert.equal(res.statusCode, 404);
  });

  test('GET /api/data/su returns 404 for removed legacy subject file', async () => {
    const res = await httpGet('/api/data/su');
    assert.equal(res.statusCode, 404);
  });

  test('GET /api/data/notfound_subject returns 404 for non-existent subject', async () => {
    const res = await httpGet('/api/data/notfound_subject');
    assert.equal(res.statusCode, 404);
  });

  test('GET /api/data/invalid@name returns 400 Bad Request', async () => {
    const res = await httpGet('/api/data/invalid@name');
    assert.equal(res.statusCode, 400);
  });

  test('GET /api/announcements returns JSON without crashing', async () => {
    const res = await httpGet('/api/announcements');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json));
  });
});
