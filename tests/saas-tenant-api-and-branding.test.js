/**
 * SaaS Multi-Tenant API & Frontend White-Labeling Test Suite
 * Step 3: API /api/v2/tenant & Dynamic Client Branding Verification
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const tenantHandler = require('../api/v2/tenant.js');

describe('SaaS Multi-Tenant API & White-Labeling Integrity (Step 3)', () => {
  function callTenantApi(options = {}) {
    return new Promise((resolve) => {
      const mockReq = {
        method: options.method || 'GET',
        url: options.url || '/api/v2/tenant/config',
        headers: options.headers || {},
        query: options.query || {}
      };

      let statusCode = 200;
      const headers = {};
      const mockRes = {
        setHeader: (k, v) => { headers[k] = v; },
        status: (code) => {
          statusCode = code;
          return {
            json: (data) => resolve({ statusCode, data, headers }),
            end: () => resolve({ statusCode, headers })
          };
        },
        json: (data) => resolve({ statusCode, data, headers })
      };

      tenantHandler(mockReq, mockRes);
    });
  }

  test('3.1 GET /api/v2/tenant/config returns default NTMK branding when no tenant header/query is specified', async () => {
    const res = await callTenantApi({
      url: '/api/v2/tenant/config'
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.tenant.slug, 'ntmk');
    assert.equal(res.data.tenant.name, 'THPT Nguyễn Thị Minh Khai');
    assert.equal(res.data.tenant.primaryColor, '#d97706');
    assert.equal(res.data.tenant.planTier, 'school_enterprise');
  });

  test('3.2 GET /api/v2/tenant/config?slug=public resolves public B2C portal branding and quotas', async () => {
    const res = await callTenantApi({
      url: '/api/v2/tenant/config?slug=public',
      query: { slug: 'public' }
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.equal(res.data.tenant.slug, 'public');
    assert.equal(res.data.tenant.name, 'Học sinh Toàn quốc (B2C Portal)');
    assert.equal(res.data.tenant.planTier, 'free');
    assert.equal(res.data.tenant.maxStudents, 1000000);
  });

  test('3.3 Resolves tenant from X-Tenant-Slug and X-Tenant-ID HTTP headers', async () => {
    // Via X-Tenant-Slug
    const resSlug = await callTenantApi({
      url: '/api/v2/tenant/config',
      headers: { 'x-tenant-slug': 'public' }
    });
    assert.equal(resSlug.data.tenant.slug, 'public');

    // Via X-Tenant-ID
    const resId = await callTenantApi({
      url: '/api/v2/tenant/config',
      headers: { 'x-tenant-id': 'a0000000-0000-0000-0000-000000000001' }
    });
    assert.equal(resId.data.tenant.slug, 'ntmk');
  });

  test('3.4 Resolves tenant from Host subdomain (e.g., ntmk.edusaas.vn)', async () => {
    const resSub = await callTenantApi({
      url: '/api/v2/tenant/config',
      headers: { host: 'ntmk.edusaas.vn' }
    });
    assert.equal(resSub.statusCode, 200);
    assert.equal(resSub.data.tenant.slug, 'ntmk');
  });

  test('3.5 GET /api/v2/tenant/list returns directory of available tenants', async () => {
    const res = await callTenantApi({
      url: '/api/v2/tenant/list',
      query: { action: 'list' }
    });

    assert.equal(res.statusCode, 200);
    assert.ok(res.data.tenants && Array.isArray(res.data.tenants));
    assert.ok(res.data.tenants.length >= 2);
    const slugs = res.data.tenants.map(t => t.slug);
    assert.ok(slugs.includes('ntmk'));
    assert.ok(slugs.includes('public'));
  });

  test('3.6 public/js/tenant-branding.js defines client white-labeling engine without raw emojis', () => {
    const brandingPath = path.join(__dirname, '../public/js/tenant-branding.js');
    assert.ok(fs.existsSync(brandingPath), 'tenant-branding.js must exist');
    const content = fs.readFileSync(brandingPath, 'utf8');

    // Asserts zero raw emojis
    const emojiRegex = /(?:\p{Extended_Pictographic}|[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}])/u;
    assert.equal(emojiRegex.test(content), false, 'tenant-branding.js must have 0 raw emojis');

    // Defines required methods
    assert.ok(content.includes('applyBrandingToDOM'));
    assert.ok(content.includes('getTenant'));
    assert.ok(content.includes('getTenantId'));
    assert.ok(content.includes('window.TenantBranding'));
  });

  test('3.7 public/index.html includes data-tenant annotations and loads tenant-branding.js script', () => {
    const indexPath = path.join(__dirname, '../public/index.html');
    const content = fs.readFileSync(indexPath, 'utf8');

    assert.ok(content.includes('data-tenant="badge"'), 'index.html must have data-tenant="badge"');
    assert.ok(content.includes('data-tenant="name"'), 'index.html must have data-tenant="name"');
    assert.ok(content.includes('data-tenant="logo"'), 'index.html must have data-tenant="logo"');
    assert.ok(content.includes('src="js/tenant-branding.js'), 'index.html must load tenant-branding.js');
  });
});
