/**
 * SaaS Tenant Identification & White-Label Configuration API Router (V2)
 *
 * Endpoints:
 * - GET /api/v2/tenant/config   (Get active tenant branding & white-label metadata)
 * - GET /api/v2/tenant/list     (List available educational tenants)
 * - GET /api/v2/tenant/:slug    (Get tenant metadata by slug)
 */

const { defaultTenantRepository } = require('../../engine/storage/tenant-repository.js');

function resolveTenantFromRequest(req) {
  const query = req.query || {};
  const headers = req.headers || {};

  // 1. Explicit query parameter ?slug= or ?tenant_id= or ?tenant=
  if (query.tenant_id || query.tenantId || query.id) {
    return { type: 'id', value: query.tenant_id || query.tenantId || query.id };
  }
  if (query.slug || query.tenant) {
    return { type: 'slug', value: query.slug || query.tenant };
  }

  // 2. Explicit HTTP Headers
  if (headers['x-tenant-id']) {
    return { type: 'id', value: headers['x-tenant-id'] };
  }
  if (headers['x-tenant-slug']) {
    return { type: 'slug', value: headers['x-tenant-slug'] };
  }

  // 3. Subdomain extraction from Host header (e.g., 'lequydon.edusaas.vn' -> 'lequydon')
  const host = headers.host || '';
  const hostname = host.split(':')[0].toLowerCase();
  const hostParts = hostname.split('.');

  // If host is a subdomain of a multi-tenant domain (e.g., ntmk.edusaas.vn or demo.localhost)
  if (hostParts.length >= 3) {
    const subdomain = hostParts[0];
    if (subdomain !== 'www' && subdomain !== 'app' && subdomain !== 'api') {
      return { type: 'slug', value: subdomain };
    }
  }

  // Check if entire domain matches a registered custom CNAME
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return { type: 'domain', value: hostname };
  }

  // 4. Default fallback: 'ntmk'
  return { type: 'slug', value: 'ntmk' };
}

module.exports = async function tenantHandler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-ID, X-Tenant-Slug');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const urlPath = (req.originalUrl || req.url || '').split('?')[0];
  const query = req.query || {};
  const action = query.action || (urlPath.split('/').filter(Boolean).pop());

  try {
    // 1. GET /list
    if (req.method === 'GET' && (action === 'list' || urlPath.endsWith('/list'))) {
      const tenants = await defaultTenantRepository.listTenants();
      return res.status(200).json({
        success: true,
        count: tenants.length,
        tenants: tenants.map(t => ({
          id: t.id,
          slug: t.slug,
          name: t.name,
          domain: t.domain,
          logoUrl: t.logoUrl,
          primaryColor: t.primaryColor,
          tagline: t.tagline,
          planTier: t.planTier
        }))
      });
    }

    // 2. GET /config or root /tenant
    const target = resolveTenantFromRequest(req);
    let tenant = null;

    if (target.type === 'id') {
      tenant = await defaultTenantRepository.getTenantById(target.value);
    } else if (target.type === 'domain') {
      tenant = await defaultTenantRepository.getTenantByDomain(target.value);
    } else {
      tenant = await defaultTenantRepository.getTenantBySlug(target.value);
    }

    // Fallback if tenant not found: default to 'ntmk'
    if (!tenant) {
      tenant = await defaultTenantRepository.getTenantBySlug('ntmk');
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant không tồn tại hoặc đã bị khóa.'
      });
    }

    return res.status(200).json({
      success: true,
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        domain: tenant.domain,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        tagline: tenant.tagline,
        status: tenant.status,
        planTier: tenant.planTier,
        maxStudents: tenant.maxStudents,
        maxTeachers: tenant.maxTeachers,
        settings: tenant.settings
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Lỗi xử lý yêu cầu tenant: ' + error.message
    });
  }
};
