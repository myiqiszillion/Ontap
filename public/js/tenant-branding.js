/**
 * SaaS Tenant White-Labeling & Dynamic School Branding Engine
 * Responsible for applying real-time school theme, colors, and logos from Tenant API
 */

(function (window) {
  'use strict';

  var STORAGE_KEY = 'ntmk_tenant_info';
  var DEFAULT_TENANT = {
    id: 'a0000000-0000-0000-0000-000000000001',
    slug: 'ntmk',
    name: 'THPT Nguyễn Thị Minh Khai',
    brandTitle: 'NTMK',
    tagline: 'THPT NTMK • BÌNH DƯƠNG',
    logoUrl: 'assets/logo.png',
    primaryColor: '#d97706',
    secondaryColor: '#b45309',
    planTier: 'school_enterprise',
    settings: {
      watermarkPrint: false,
      customOmrLogo: true
    }
  };

  var currentTenant = null;

  var TenantBranding = {
    /**
     * Get active cached or memory tenant
     */
    getTenant: function () {
      if (currentTenant) return currentTenant;
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          currentTenant = JSON.parse(raw);
          return currentTenant;
        }
      } catch (e) {
        // LocalStorage unavailable
      }
      return DEFAULT_TENANT;
    },

    getTenantId: function () {
      return (this.getTenant() && this.getTenant().id) || DEFAULT_TENANT.id;
    },

    /**
     * Initialize tenant branding: fetch from API and apply DOM changes
     */
    init: function () {
      var self = this;
      var cached = self.getTenant();
      self.applyBrandingToDOM(cached);

      // Fetch fresh configuration from API
      var urlParams = new URLSearchParams(window.location.search);
      var querySlug = urlParams.get('tenant') || urlParams.get('slug');
      var endpoint = '/api/v2/tenant/config' + (querySlug ? '?slug=' + encodeURIComponent(querySlug) : '');

      return fetch(endpoint)
        .then(function (res) {
          if (!res.ok) throw new Error('Failed to load tenant configuration');
          return res.json();
        })
        .then(function (data) {
          if (data && data.success && data.tenant) {
            currentTenant = data.tenant;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(currentTenant));
            } catch (e) {
              // Non-fatal
            }
            self.applyBrandingToDOM(currentTenant);
            return currentTenant;
          }
          return cached;
        })
        .catch(function () {
          // Graceful fallback to default tenant
          return cached;
        });
    },

    /**
     * Apply tenant theme colors and text to DOM elements
     */
    applyBrandingToDOM: function (tenant) {
      if (!tenant) return;

      // 1. Update brand titles & badges with data-tenant attributes
      var badges = document.querySelectorAll('[data-tenant="badge"]');
      badges.forEach(function (el) {
        el.textContent = tenant.tagline || (tenant.name + ' • GDPT 2018');
      });

      var names = document.querySelectorAll('[data-tenant="name"]');
      names.forEach(function (el) {
        el.textContent = tenant.brandTitle || tenant.slug.toUpperCase();
      });

      var fullNames = document.querySelectorAll('[data-tenant="full-name"]');
      fullNames.forEach(function (el) {
        el.textContent = tenant.name;
      });

      var logos = document.querySelectorAll('[data-tenant="logo"]');
      logos.forEach(function (img) {
        if (tenant.logoUrl) {
          img.src = tenant.logoUrl;
        }
      });

      // 2. Dynamic document title
      if (document.title && !document.title.includes(tenant.name)) {
        var baseTitle = 'Nền Tảng Ôn Tập Thông Minh | GDPT 2018';
        document.title = (tenant.brandTitle || tenant.name) + ' — ' + baseTitle;
      }

      // 3. Inject CSS branding variables
      if (tenant.primaryColor && document.documentElement) {
        document.documentElement.style.setProperty('--tenant-primary', tenant.primaryColor);
        if (tenant.secondaryColor) {
          document.documentElement.style.setProperty('--tenant-secondary', tenant.secondaryColor);
        }
      }
    }
  };

  window.TenantBranding = TenantBranding;
})(typeof window !== 'undefined' ? window : this);
