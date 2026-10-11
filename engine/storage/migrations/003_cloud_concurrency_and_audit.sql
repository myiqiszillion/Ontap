-- ========================================================================
-- MIGRATION: 003_cloud_concurrency_and_audit.sql
-- NTMK Rebuild Phase 02C: Distributed Leases, Reviewer Registry, RPC Functions & Constraints
-- Compatible with Supabase PostgreSQL & Standard PostgreSQL 14+
-- Transactional & Idempotent
-- ========================================================================

BEGIN;

-- 1. Distributed Leases for Multi-Instance Concurrency (Requirement 2)
CREATE TABLE IF NOT EXISTS ntmk_sync_leases (
    lease_key TEXT PRIMARY KEY,
    holder_id TEXT NOT NULL,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 2. Certified Reviewer Registry & RBAC Identity (Requirement 4)
CREATE TABLE IF NOT EXISTS ntmk_reviewers (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('pedagogical_auditor', 'curriculum_lead', 'system_operator')),
    subject_specialties JSONB NOT NULL DEFAULT '[]',
    token_hash TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_fixture BOOLEAN NOT NULL DEFAULT FALSE,
    invited_by TEXT NOT NULL DEFAULT 'system',
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE ntmk_sync_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ntmk_reviewers ENABLE ROW LEVEL SECURITY;

-- Deny unmediated public/student access from Supabase client / PostgREST
REVOKE ALL ON ntmk_sync_leases FROM anon, authenticated;
REVOKE ALL ON ntmk_reviewers FROM anon, authenticated;

-- Grant administrative access to backend service role only
DROP POLICY IF EXISTS p_service_role_sync_leases ON ntmk_sync_leases;
CREATE POLICY p_service_role_sync_leases ON ntmk_sync_leases
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS p_service_role_reviewers ON ntmk_reviewers;
CREATE POLICY p_service_role_reviewers ON ntmk_reviewers
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 4. Database Functions / RPC: Atomic Distributed Lease Acquisition
CREATE OR REPLACE FUNCTION acquire_sync_lease(
    p_lease_key TEXT,
    p_holder_id TEXT,
    p_ttl_seconds INT
) RETURNS JSONB AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_new_expires TIMESTAMPTZ := v_now + (p_ttl_seconds || ' seconds')::INTERVAL;
    v_current RECORD;
BEGIN
    SELECT * INTO v_current FROM ntmk_sync_leases WHERE lease_key = p_lease_key;
    
    IF v_current IS NULL THEN
        INSERT INTO ntmk_sync_leases (lease_key, holder_id, acquired_at, expires_at)
        VALUES (p_lease_key, p_holder_id, v_now, v_new_expires);
        RETURN jsonb_build_object(
            'acquired', true,
            'lease_key', p_lease_key,
            'holder_id', p_holder_id,
            'expires_at', v_new_expires
        );
    ELSIF v_current.expires_at < v_now OR v_current.holder_id = p_holder_id THEN
        UPDATE ntmk_sync_leases
        SET holder_id = p_holder_id, acquired_at = v_now, expires_at = v_new_expires
        WHERE lease_key = p_lease_key;
        RETURN jsonb_build_object(
            'acquired', true,
            'lease_key', p_lease_key,
            'holder_id', p_holder_id,
            'expires_at', v_new_expires
        );
    ELSE
        RETURN jsonb_build_object(
            'acquired', false,
            'lease_key', p_lease_key,
            'holder_id', v_current.holder_id,
            'expires_at', v_current.expires_at,
            'message', 'Distributed lock held by instance ' || v_current.holder_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Database Functions / RPC: Release Distributed Lease
CREATE OR REPLACE FUNCTION release_sync_lease(
    p_lease_key TEXT,
    p_holder_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_deleted INT;
BEGIN
    DELETE FROM ntmk_sync_leases
    WHERE lease_key = p_lease_key AND holder_id = p_holder_id;
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Database Functions / RPC: Transactional Idempotent Exam Submission
CREATE OR REPLACE FUNCTION submit_exam_result(
    p_session_id UUID,
    p_result JSONB
) RETURNS JSONB AS $$
DECLARE
    v_existing RECORD;
BEGIN
    -- 1. Check if already committed (Idempotent replay)
    SELECT * INTO v_existing FROM ntmk_exam_results WHERE session_id = p_session_id;
    IF v_existing IS NOT NULL THEN
        RETURN v_existing.result;
    END IF;

    -- 2. Insert atomically with ON CONFLICT DO NOTHING to guarantee no duplicate writes
    INSERT INTO ntmk_exam_results (session_id, result, submitted_at)
    VALUES (p_session_id, p_result, NOW())
    ON CONFLICT (session_id) DO NOTHING;

    -- 3. Return authoritative stored result
    SELECT * INTO v_existing FROM ntmk_exam_results WHERE session_id = p_session_id;
    RETURN v_existing.result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. PostgREST Defense-in-depth: Restrict function execution to backend service_role only
REVOKE EXECUTE ON FUNCTION acquire_sync_lease(TEXT, TEXT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION acquire_sync_lease(TEXT, TEXT, INT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION acquire_sync_lease(TEXT, TEXT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION release_sync_lease(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION release_sync_lease(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION release_sync_lease(TEXT, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION submit_exam_result(UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION submit_exam_result(UUID, JSONB) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_exam_result(UUID, JSONB) TO service_role;

COMMIT;
