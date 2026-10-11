-- ========================================================================
-- MIGRATION: 005_diagnostic_skill_graph.sql
-- NTMK Rebuild Phase 03A: Skill Knowledge Graph & Diagnostic Persistence
-- Compatible with Supabase PostgreSQL & Standard PostgreSQL 14+
-- Transactional & Idempotent
-- ========================================================================

BEGIN;

-- 1. Curriculum Skills Taxonomy Table
CREATE TABLE IF NOT EXISTS ntmk_curriculum_skills (
    id VARCHAR(64) PRIMARY KEY,
    subject_id VARCHAR(32) NOT NULL CHECK (subject_id IN ('toan', 'vatli', 'hoahoc', 'tienganh')),
    grade SMALLINT NOT NULL CHECK (grade IN (10, 11, 12)),
    domain_id VARCHAR(64) NOT NULL,
    topic_id VARCHAR(64) NOT NULL,
    topic_title VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    learning_objectives JSONB NOT NULL DEFAULT '[]',
    cognitive_levels JSONB NOT NULL DEFAULT '[]',
    curriculum_version VARCHAR(32) DEFAULT 'GDPT2018',
    verification_status VARCHAR(32) DEFAULT 'verified' CHECK (verification_status IN ('verified', 'unverified')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Skill Prerequisite Directed Graph Edges
CREATE TABLE IF NOT EXISTS ntmk_skill_prerequisites (
    skill_id VARCHAR(64) NOT NULL REFERENCES ntmk_curriculum_skills(id) ON DELETE CASCADE,
    prerequisite_skill_id VARCHAR(64) NOT NULL REFERENCES ntmk_curriculum_skills(id) ON DELETE CASCADE,
    is_cross_grade BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (skill_id, prerequisite_skill_id)
);

-- 3. Diagnostic Assessment Sessions (Private server-side state)
CREATE TABLE IF NOT EXISTS ntmk_diagnostic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    subject_id VARCHAR(32) NOT NULL,
    grade SMALLINT NOT NULL,
    blueprint_id TEXT NOT NULL,
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('grade_diagnostic', 'graduation_readiness')),
    target TEXT,
    initial_rating JSONB,
    private_questions JSONB NOT NULL,
    saved_answers JSONB NOT NULL DEFAULT '{}',
    current_question_index INT NOT NULL DEFAULT 0,
    is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Immutable Diagnostic Assessment Results (Idempotent single entry)
CREATE TABLE IF NOT EXISTS ntmk_diagnostic_results (
    session_id UUID PRIMARY KEY REFERENCES ntmk_diagnostic_sessions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    report JSONB NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Atomic Skill Evidence Log
CREATE TABLE IF NOT EXISTS ntmk_skill_evidence (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id TEXT NOT NULL,
    session_id UUID NOT NULL REFERENCES ntmk_diagnostic_sessions(id) ON DELETE CASCADE,
    question_id VARCHAR(64) NOT NULL,
    skill_id VARCHAR(64) NOT NULL REFERENCES ntmk_curriculum_skills(id) ON DELETE CASCADE,
    is_answered BOOLEAN NOT NULL,
    is_correct BOOLEAN NOT NULL,
    score_ratio NUMERIC(5, 4) NOT NULL DEFAULT 0,
    cognitive_level VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Current Skill Mastery Snapshots
CREATE TABLE IF NOT EXISTS ntmk_skill_mastery_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    skill_id VARCHAR(64) NOT NULL REFERENCES ntmk_curriculum_skills(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL CHECK (status IN ('not_assessed', 'insufficient_evidence', 'needs_foundation', 'developing', 'proficient', 'strong')),
    estimated_mastery NUMERIC(4, 2),
    confidence_score NUMERIC(4, 2) NOT NULL,
    evidence_count INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    last_assessed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_skill_mastery UNIQUE (student_id, skill_id)
);

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_diag_skills_subject_grade ON ntmk_curriculum_skills(subject_id, grade);
CREATE INDEX IF NOT EXISTS idx_diag_sessions_token ON ntmk_diagnostic_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_diag_sessions_student ON ntmk_diagnostic_sessions(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diag_evidence_student_skill ON ntmk_skill_evidence(student_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_diag_mastery_student ON ntmk_skill_mastery_snapshots(student_id);

-- 8. Row Level Security (RLS) Configuration
ALTER TABLE ntmk_curriculum_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_skill_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_skill_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_skill_mastery_snapshots ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth: Deny direct SQL from public postgrest roles
REVOKE ALL ON ntmk_curriculum_skills, ntmk_skill_prerequisites, ntmk_diagnostic_sessions,
    ntmk_diagnostic_results, ntmk_skill_evidence, ntmk_skill_mastery_snapshots FROM anon, authenticated;

-- Public read-only policy for curriculum skills (sanitized reference data only)
DROP POLICY IF EXISTS p_anon_read_curriculum_skills ON ntmk_curriculum_skills;
CREATE POLICY p_anon_read_curriculum_skills ON ntmk_curriculum_skills
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS p_anon_read_skill_prerequisites ON ntmk_skill_prerequisites;
CREATE POLICY p_anon_read_skill_prerequisites ON ntmk_skill_prerequisites
    FOR SELECT TO anon, authenticated USING (true);

-- Backend service role has full access
DROP POLICY IF EXISTS p_service_role_diag_skills ON ntmk_curriculum_skills;
CREATE POLICY p_service_role_diag_skills ON ntmk_curriculum_skills FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_diag_prereqs ON ntmk_skill_prerequisites;
CREATE POLICY p_service_role_diag_prereqs ON ntmk_skill_prerequisites FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_diag_sessions ON ntmk_diagnostic_sessions;
CREATE POLICY p_service_role_diag_sessions ON ntmk_diagnostic_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_diag_results ON ntmk_diagnostic_results;
CREATE POLICY p_service_role_diag_results ON ntmk_diagnostic_results FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_diag_evidence ON ntmk_skill_evidence;
CREATE POLICY p_service_role_diag_evidence ON ntmk_skill_evidence FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_diag_mastery ON ntmk_skill_mastery_snapshots;
CREATE POLICY p_service_role_diag_mastery ON ntmk_skill_mastery_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMIT;
