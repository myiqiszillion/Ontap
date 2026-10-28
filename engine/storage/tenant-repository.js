/**
 * SaaS Multi-Tenant Repository
 * Handles Tenant metadata, White-labeling configuration, and Organization Isolation
 */

const DEFAULT_TENANTS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    slug: 'ntmk',
    name: 'THPT Nguyễn Thị Minh Khai',
    domain: 'thptminhkhai.ntmk.vn',
    logoUrl: '/assets/logo.png',
    primaryColor: '#d97706',
    secondaryColor: '#b45309',
    tagline: 'Nền tảng ôn tập thông minh THPT Nguyễn Thị Minh Khai',
    status: 'active',
    planTier: 'school_enterprise',
    maxStudents: 3000,
    maxTeachers: 150,
    settings: {
      allowGuestPractice: true,
      showLeaderboard: true,
      watermarkPrint: false,
      customOmrLogo: true
    }
  },
  {
    id: 'a0000000-0000-0000-0000-000000000000',
    slug: 'public',
    name: 'Học sinh Toàn quốc (B2C Portal)',
    domain: 'app.edusaas.vn',
    logoUrl: '/assets/logo.png',
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    tagline: 'Nền tảng luyện thi trực tuyến THPT toàn quốc',
    status: 'active',
    planTier: 'free',
    maxStudents: 1000000,
    maxTeachers: 0,
    settings: {
      allowGuestPractice: true,
      showLeaderboard: true,
      watermarkPrint: true,
      customOmrLogo: false
    }
  }
];

class TenantRepository {
  constructor(options = {}) {
    this.storageAdapter = options.storageAdapter || null;
    this.inMemoryTenants = new Map();

    // Initialize with default seeded tenants
    DEFAULT_TENANTS.forEach(tenant => {
      this.inMemoryTenants.set(tenant.id, tenant);
    });
  }

  /**
   * Find tenant by unique ID
   */
  async getTenantById(tenantId) {
    if (!tenantId) return null;
    if (this.storageAdapter && typeof this.storageAdapter.query === 'function') {
      try {
        const rows = await this.storageAdapter.query('SELECT * FROM saas_tenants WHERE id = $1', [tenantId]);
        if (rows && rows.length > 0) return this._mapRow(rows[0]);
      } catch (e) {
        // Fall back to memory
      }
    }
    return this.inMemoryTenants.get(tenantId) || null;
  }

  /**
   * Find tenant by subdomain slug (e.g., 'ntmk', 'lequydon')
   */
  async getTenantBySlug(slug) {
    if (!slug) return null;
    const normalized = slug.trim().toLowerCase();

    if (this.storageAdapter && typeof this.storageAdapter.query === 'function') {
      try {
        const rows = await this.storageAdapter.query('SELECT * FROM saas_tenants WHERE slug = $1', [normalized]);
        if (rows && rows.length > 0) return this._mapRow(rows[0]);
      } catch (e) {
        // Fall back to memory
      }
    }

    for (const tenant of this.inMemoryTenants.values()) {
      if (tenant.slug === normalized) return tenant;
    }
    return null;
  }

  /**
   * Find tenant by custom CNAME domain (e.g., 'on-tap.thptminhkhai.edu.vn')
   */
  async getTenantByDomain(domain) {
    if (!domain) return null;
    const normalized = domain.trim().toLowerCase();

    if (this.storageAdapter && typeof this.storageAdapter.query === 'function') {
      try {
        const rows = await this.storageAdapter.query('SELECT * FROM saas_tenants WHERE domain = $1', [normalized]);
        if (rows && rows.length > 0) return this._mapRow(rows[0]);
      } catch (e) {
        // Fall back to memory
      }
    }

    for (const tenant of this.inMemoryTenants.values()) {
      if (tenant.domain === normalized) return tenant;
    }
    return null;
  }

  /**
   * List all active tenants (for directory or super-admin)
   */
  async listTenants() {
    if (this.storageAdapter && typeof this.storageAdapter.query === 'function') {
      try {
        const rows = await this.storageAdapter.query('SELECT * FROM saas_tenants ORDER BY name ASC');
        if (rows && rows.length > 0) return rows.map(r => this._mapRow(r));
      } catch (e) {
        // Fall back to memory
      }
    }
    return Array.from(this.inMemoryTenants.values());
  }

  _mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      domain: row.domain,
      logoUrl: row.logo_url || row.logoUrl,
      primaryColor: row.primary_color || row.primaryColor || '#d97706',
      secondaryColor: row.secondary_color || row.secondaryColor || '#b45309',
      tagline: row.tagline,
      status: row.status,
      planTier: row.plan_tier || row.planTier || 'free',
      maxStudents: row.max_students || row.maxStudents || 100,
      maxTeachers: row.max_teachers || row.maxTeachers || 10,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : (row.settings || {})
    };
  }
}

const defaultTenantRepository = new TenantRepository();

module.exports = {
  TenantRepository,
  defaultTenantRepository,
  DEFAULT_TENANTS
};
