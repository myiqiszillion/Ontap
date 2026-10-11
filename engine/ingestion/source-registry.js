/**
 * Question Source Registry (NTMK Rebuild Phase 02)
 * Manages legal, open educational sources, licensing, and compliance policies
 */

const QuestionSchemaV2 = require('../schema.js');

const REGISTERED_SOURCES = [
  {
    id: 'moet_official_sample_2025',
    name: 'Bộ GD&ĐT — Đề minh họa tốt nghiệp THPT 2025',
    authority: 'Bộ Giáo dục và Đào tạo',
    license: QuestionSchemaV2.LICENSES.OFFICIAL_EDUCATIONAL_REFERENCE,
    curriculum: 'GDPT2018',
    allowedGrades: [10, 11, 12],
    status: 'blocked',
    rateLimitPerMinute: 60,
    terms: 'Tài liệu đề thi tham khảo công khai phục vụ giáo dục toàn quốc theo Quyết định 764/QĐ-BGDĐT',
    complianceCheck: false
  },
  {
    id: 'oer_openstax_science',
    licenseEvidence: null,
    permissionApproved: false,
    sourceUrl: 'https://openstax.org/subjects/science',
    name: 'OpenStax — permission pending',
    authority: 'Rice University',
    license: 'cc_by_nc_sa',
    curriculum: 'GDPT2018',
    allowedGrades: [10],
    status: 'blocked',
    rateLimitPerMinute: 30,
    terms: 'Book-specific terms and non-commercial/share-alike compatibility must be approved',
    complianceCheck: false
  },
  {
    id: 'ntmk_internal_editorial',
    name: 'NTMK Editorial Board — Ban Chuyên Môn GDPT 2018',
    authority: 'NTMK Education Team',
    license: QuestionSchemaV2.LICENSES.INTERNAL,
    curriculum: 'GDPT2018',
    allowedGrades: [10, 11, 12],
    status: 'blocked',
    rateLimitPerMinute: 1000,
    terms: 'Ownership and reviewer evidence not yet established',
    complianceCheck: false
  }
];

const SourceRegistry = {
  sources: new Map(REGISTERED_SOURCES.map(s => [s.id, s])),

  getSource(sourceId) {
    return this.sources.get(sourceId) || null;
  },

  getAllSources() {
    return Array.from(this.sources.values());
  },

  registerSource(sourceDef) {
    if (!sourceDef || !sourceDef.id || !sourceDef.license) {
      throw new Error('Source definition must contain id and license');
    }
    this.sources.set(sourceDef.id, {
      status: 'pending_review',
      rateLimitPerMinute: 30,
      complianceCheck: false,
      ...sourceDef
    });
    return this.sources.get(sourceDef.id);
  },

  /**
   * Strictly validate that license evidence constitutes a legally binding re-publication permit,
   * NOT mere HTTP 200 status, robots.txt permission, or registry presence.
   */
  validateLicenseEvidence(evidence) {
    if (!evidence) return false;
    if (typeof evidence === 'string') {
      const lower = evidence.toLowerCase();
      // Explicitly reject superficial HTTP/crawler metadata
      if (lower.includes('http 200') || lower.includes('robots.txt') || lower.includes('registry entry') || lower.includes('registered only')) {
        return false;
      }
      return evidence.trim().length >= 15;
    }
    if (typeof evidence === 'object') {
      // Must have valid legal contract/license fields
      const hasAgreement = Boolean(evidence.contractId || evidence.licenseAgreementUrl || evidence.legalBasis || evidence.documentId);
      const hasLicensor = Boolean(evidence.licensor || evidence.authority);
      const hasScope = Boolean(evidence.permittedScope?.includes('republish_digital') || evidence.allowRepublication === true);
      const isNotJustCrawl = !evidence.httpStatus && !evidence.robotsAllowOnly;
      return hasAgreement && hasLicensor && hasScope && isNotJustCrawl;
    }
    return false;
  },

  isCompliant(sourceId) {
    const src = this.getSource(sourceId);
    if (!src) return false;
    const hasValidEvidence = this.validateLicenseEvidence(src.licenseEvidence);
    return src.status === 'active' && src.complianceCheck === true && src.permissionApproved === true && hasValidEvidence;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SourceRegistry;
}
