-- ========================================================================
-- MIGRATION: 001_init_bank_schema.sql
-- NTMK Rebuild Phase 02B: Question Bank Schema & Indexes
-- Compatible with Supabase PostgreSQL & Standard PostgreSQL 14+
-- Transactional & Idempotent
-- ========================================================================

BEGIN;

-- Ensure standard Supabase roles exist (no-op on Supabase, prevents failure on plain PostgreSQL)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
    END IF;
END
$$;

-- 1. Create Question Bank V2 Table
CREATE TABLE IF NOT EXISTS question_bank_v2 (
    id VARCHAR(64) PRIMARY KEY,
    format VARCHAR(32) NOT NULL CHECK (format IN ('multiple_choice', 'true_false_group', 'short_answer')),
    subject_id VARCHAR(32) NOT NULL CHECK (subject_id IN ('toan', 'vatli', 'hoahoc', 'tienganh')),
    grade SMALLINT NOT NULL CHECK (grade IN (10, 11, 12)),
    curriculum_version VARCHAR(32) DEFAULT 'GDPT2018',
    chapter VARCHAR(255) DEFAULT '',
    topic VARCHAR(255) DEFAULT '',
    cognitive_level VARCHAR(32) DEFAULT 'understand' CHECK (cognitive_level IN ('recognize', 'understand', 'apply', 'high_apply')),
    prompt TEXT NOT NULL,
    image_uri TEXT,
    explanation TEXT,
    
    -- Format-specific payloads stored as JSONB
    mcq_payload JSONB,
    tf_payload JSONB,
    short_answer_payload JSONB,
    
    -- Provenance & licensing metadata
    source_name VARCHAR(255) NOT NULL,
    source_url TEXT,
    license VARCHAR(64) NOT NULL,
    retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    verification_status VARCHAR(32) DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified', 'flagged')),
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    
    -- Answer policy
    answer_policy JSONB NOT NULL DEFAULT '{"caseSensitive": false, "normalizeSpaces": true, "allowCommaDecimal": true, "tolerance": 0, "allowUnitStripping": false}',
    
    -- Lifecycle status
    status VARCHAR(32) DEFAULT 'review' CHECK (status IN ('review', 'published', 'archived')),
    
    -- Deduplication fingerprint
    content_hash VARCHAR(64) NOT NULL,
    
    -- Audit trail & timestamps
    audit_log JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Uniqueness constraint on subject, grade, and content hash
    CONSTRAINT uq_question_content_hash UNIQUE (subject_id, grade, content_hash)
);

-- 2. Indexes for High-Performance Assessment Generation
CREATE INDEX IF NOT EXISTS idx_qbank_subject_grade ON question_bank_v2 (subject_id, grade);
CREATE INDEX IF NOT EXISTS idx_qbank_format ON question_bank_v2 (format);
CREATE INDEX IF NOT EXISTS idx_qbank_status ON question_bank_v2 (status);
CREATE INDEX IF NOT EXISTS idx_qbank_verification ON question_bank_v2 (verification_status);
CREATE INDEX IF NOT EXISTS idx_qbank_created ON question_bank_v2 (created_at DESC);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE question_bank_v2 ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth: Revoke SQL privileges from public/unauthenticated PostgREST roles
REVOKE ALL ON question_bank_v2 FROM anon, authenticated;

-- Explicit RLS Policies
-- Only service_role (trusted backend) has full administrative access
DROP POLICY IF EXISTS p_service_role_full_access ON question_bank_v2;
CREATE POLICY p_service_role_full_access ON question_bank_v2
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMIT;
