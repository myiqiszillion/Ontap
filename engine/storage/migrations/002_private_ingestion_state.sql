-- ========================================================================
-- MIGRATION: 002_private_ingestion_state.sql
-- NTMK Rebuild Phase 02B/02C: Ingestion Pipeline & Exam Session Private Tables
-- Compatible with Supabase PostgreSQL & Standard PostgreSQL 14+
-- Transactional & Idempotent
-- ========================================================================

BEGIN;

-- 1. Source Permissions & Legal Licensing Registry
CREATE TABLE IF NOT EXISTS ntmk_source_permissions (
    id TEXT PRIMARY KEY,
    definition JSONB NOT NULL,
    approved_by TEXT,
    license_evidence TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default internal source permission for test fixtures and unassigned candidates
INSERT INTO ntmk_source_permissions (id, definition, approved_by, license_evidence)
VALUES ('source_unspecified', '{"name": "System Internal / Unspecified"}'::jsonb, 'system', 'internal_fixture')
ON CONFLICT (id) DO NOTHING;

-- 2. Review Candidates (Pedagogical Verification Queue)
CREATE TABLE IF NOT EXISTS ntmk_review_candidates (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES ntmk_source_permissions(id) ON DELETE RESTRICT,
    subject_id TEXT NOT NULL CHECK (subject_id IN ('toan', 'vatli', 'hoahoc', 'tienganh')),
    grade SMALLINT NOT NULL CHECK (grade IN (10, 11, 12)),
    fingerprint TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL CHECK (status IN ('discovered', 'extracted', 'normalized', 'needs_review', 'verified', 'rejected', 'published')),
    private_record JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_review_candidate_fingerprint UNIQUE (subject_id, grade, fingerprint)
);

-- 3. Ingestion Sync Jobs (Audit History)
CREATE TABLE IF NOT EXISTS ntmk_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT REFERENCES ntmk_source_permissions(id) ON DELETE SET NULL,
    report JSONB NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Protected Exam Sessions (Unsanitized Server State with Expiration)
CREATE TABLE IF NOT EXISTS ntmk_exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    grade SMALLINT NOT NULL,
    private_questions JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Immutable Exam Results (Strict Primary Key Uniqueness on session_id)
CREATE TABLE IF NOT EXISTS ntmk_exam_results (
    session_id UUID PRIMARY KEY REFERENCES ntmk_exam_sessions(id) ON DELETE CASCADE,
    result JSONB NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Content Audit Trail (Tamper-evident log)
CREATE TABLE IF NOT EXISTS ntmk_content_audit (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT,
    actor_role TEXT,
    action TEXT NOT NULL,
    evidence JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_ntmk_candidate_query ON ntmk_review_candidates(subject_id, grade, status);
CREATE INDEX IF NOT EXISTS idx_ntmk_job_history ON ntmk_sync_jobs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ntmk_audit_question ON ntmk_content_audit(question_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ntmk_session_token ON ntmk_exam_sessions(token_hash);

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE ntmk_source_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_review_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_content_audit ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth: Revoke SQL privileges from anon and authenticated roles
REVOKE ALL ON ntmk_source_permissions, ntmk_review_candidates, ntmk_sync_jobs,
  ntmk_exam_sessions, ntmk_exam_results, ntmk_content_audit FROM anon, authenticated;

-- Explicit service_role RLS Policies
DROP POLICY IF EXISTS p_service_role_source_permissions ON ntmk_source_permissions;
CREATE POLICY p_service_role_source_permissions ON ntmk_source_permissions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_review_candidates ON ntmk_review_candidates;
CREATE POLICY p_service_role_review_candidates ON ntmk_review_candidates
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_sync_jobs ON ntmk_sync_jobs;
CREATE POLICY p_service_role_sync_jobs ON ntmk_sync_jobs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_exam_sessions ON ntmk_exam_sessions;
CREATE POLICY p_service_role_exam_sessions ON ntmk_exam_sessions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_exam_results ON ntmk_exam_results;
CREATE POLICY p_service_role_exam_results ON ntmk_exam_results
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_content_audit ON ntmk_content_audit;
CREATE POLICY p_service_role_content_audit ON ntmk_content_audit
    FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
