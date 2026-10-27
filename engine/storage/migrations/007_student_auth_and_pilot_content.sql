-- ========================================================================
-- MIGRATION: 007_student_auth_and_pilot_content.sql
-- NTMK Rebuild Phase 04A: Student Identity, RLS Isolation & Pilot Content Audit
-- Compatible with Supabase PostgreSQL & Standard PostgreSQL 14+
-- Transactional & Idempotent
-- ========================================================================

BEGIN;

-- 1. Student Accounts Table
CREATE TABLE IF NOT EXISTS ntmk_student_accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    grade SMALLINT NOT NULL CHECK (grade IN (10, 11, 12)),
    role VARCHAR(32) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'guest', 'reviewer', 'admin')),
    supabase_uid UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast authenticated email lookups
CREATE INDEX IF NOT EXISTS idx_ntmk_student_accounts_email ON ntmk_student_accounts(email);
CREATE INDEX IF NOT EXISTS idx_ntmk_student_accounts_supabase_uid ON ntmk_student_accounts(supabase_uid) WHERE supabase_uid IS NOT NULL;

-- 2. Student & Guest Active Sessions Table
CREATE TABLE IF NOT EXISTS ntmk_student_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'student',
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ntmk_student_sessions_user ON ntmk_student_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ntmk_student_sessions_exp ON ntmk_student_sessions(expires_at);

-- 3. Guest Data Migration Audit Trail
CREATE TABLE IF NOT EXISTS ntmk_guest_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id TEXT NOT NULL,
    student_id TEXT NOT NULL REFERENCES ntmk_student_accounts(id) ON DELETE CASCADE,
    migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    meta JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ntmk_guest_migrations_student ON ntmk_guest_migrations(student_id);

-- 4. Pilot Content Pedagogical Audit Trail
CREATE TABLE IF NOT EXISTS ntmk_pilot_content_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id TEXT NOT NULL,
    subject_id VARCHAR(32) NOT NULL,
    grade SMALLINT NOT NULL CHECK (grade IN (10, 11, 12)),
    skill_id VARCHAR(64) NOT NULL,
    reviewer_id TEXT NOT NULL,
    verification_status VARCHAR(32) NOT NULL CHECK (verification_status IN ('verified', 'rejected', 'revision_requested')),
    license_type VARCHAR(64) NOT NULL,
    curriculum_source TEXT NOT NULL,
    audit_notes TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ntmk_pilot_audits_skill ON ntmk_pilot_content_audits(skill_id);
CREATE INDEX IF NOT EXISTS idx_ntmk_pilot_audits_reviewer ON ntmk_pilot_content_audits(reviewer_id);

-- 5. Row-Level Security (RLS) Configuration
ALTER TABLE ntmk_student_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_guest_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_pilot_content_audits ENABLE ROW LEVEL SECURITY;

-- Students can only view and update their own account
DROP POLICY IF EXISTS student_account_self_isolation ON ntmk_student_accounts;
CREATE POLICY student_account_self_isolation ON ntmk_student_accounts
    FOR ALL
    USING (id = current_setting('request.jwt.claims', true)::jsonb->>'sub' OR current_setting('ntmk.actor_role', true) = 'admin');

-- Sessions self isolation
DROP POLICY IF EXISTS student_sessions_self_isolation ON ntmk_student_sessions;
CREATE POLICY student_sessions_self_isolation ON ntmk_student_sessions
    FOR ALL
    USING (user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub' OR current_setting('ntmk.actor_role', true) = 'admin');

-- Content audits readable by authenticated reviewers/admins, append-only
DROP POLICY IF EXISTS pilot_audits_reviewer_access ON ntmk_pilot_content_audits;
CREATE POLICY pilot_audits_reviewer_access ON ntmk_pilot_content_audits
    FOR SELECT
    USING (current_setting('ntmk.actor_role', true) IN ('reviewer', 'admin', 'curriculum_lead'));

COMMIT;
