/**
 * Integration Test for Express API Server Routes
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { app } = require('../server.js');

let server;
let baseUrl;

before((_, done) => {
  server = app.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    done();
  });
});

after((_, done) => {
  if (server) server.close(done);
  else done();
});

function httpGet(path) {
  return new Promise((resolve, reject) => {
    http.get(`${baseUrl}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', reject);
  });
}

describe('Express Server API Integration', () => {
  test('GET / serves index.html', async () => {
    const res = await httpGet('/');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('NTMK'));
    assert.ok(res.body.includes('screen-onboarding'));
    assert.ok(res.body.includes('screen-dashboard'));
  });

  test('GET /admin serves admin.html', async () => {
    const res = await httpGet('/admin');
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('Admin Panel'));
  });

  test('GET /api/subjects returns subjects with grades [10, 11, 12]', async () => {
    const res = await httpGet('/api/subjects');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.deepEqual(json.grades, [10, 11, 12]);
    assert.ok(Array.isArray(json.subjects));
    assert.ok(json.subjects.length >= 10);
  });

  test('GET /api/subjects?active_only=true returns only ready subjects', async () => {
    const res = await httpGet('/api/subjects?active_only=true');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(json.subjects.every(s => s.ready === true), 'All returned subjects must be ready');
  });

  test('GET /api/data/su returns su.json questions', async () => {
    const res = await httpGet('/api/data/su');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json.lessons));
  });

  test('GET /api/data/invalid@name returns 400 Bad Request', async () => {
    const res = await httpGet('/api/data/invalid@name');
    assert.equal(res.statusCode, 400);
  });

  test('GET /api/data/notfound_subject returns 404', async () => {
    const res = await httpGet('/api/data/notfound_subject');
    assert.equal(res.statusCode, 404);
  });

  test('GET /api/announcements returns JSON without crashing', async () => {
    const res = await httpGet('/api/announcements');
    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.body);
    assert.ok(Array.isArray(json));
  });
});
