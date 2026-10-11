-- ========================================================================
-- MIGRATION ROLLBACK: 004_rollback_phase02c.sql
-- NTMK Rebuild Phase 02C: Safe Reversible Rollback Plan
-- Ordered, Idempotent & Non-destructive to Pre-existing Production Data
-- ========================================================================

-- PRE-REQUISITE SAFETY CHECK:
-- 1. Ensure snapshot / pg_dump backup taken before executing rollback:
--    pg_dump -h $SUPABASE_HOST -U postgres -d postgres -F c -b -v -f pre_rollback_safety_$(date +%Y%m%d_%H%M%S).dump
-- 2. Verify staging environment before executing on production.
-- 3. Verify that active exam sessions are drained or saved before reverting.

BEGIN;

-- 1. Drop Stored Procedures / RPC Functions
DROP FUNCTION IF EXISTS submit_exam_result(UUID, JSONB);
DROP FUNCTION IF EXISTS release_sync_lease(TEXT, TEXT);
DROP FUNCTION IF EXISTS acquire_sync_lease(TEXT, TEXT, INT);

-- 2. Drop RLS Policies on Phase 02C & Phase 02B Tables
DROP POLICY IF EXISTS p_service_role_sync_leases ON ntmk_sync_leases;
DROP POLICY IF EXISTS p_service_role_reviewers ON ntmk_reviewers;
DROP POLICY IF EXISTS p_service_role_content_audit ON ntmk_content_audit;
DROP POLICY IF EXISTS p_service_role_exam_results ON ntmk_exam_results;
DROP POLICY IF EXISTS p_service_role_exam_sessions ON ntmk_exam_sessions;
DROP POLICY IF EXISTS p_service_role_sync_jobs ON ntmk_sync_jobs;
DROP POLICY IF EXISTS p_service_role_review_candidates ON ntmk_review_candidates;
DROP POLICY IF EXISTS p_service_role_source_permissions ON ntmk_source_permissions;
DROP POLICY IF EXISTS p_service_role_full_access ON question_bank_v2;

-- 3. Drop Phase 02C Transient & Identity Tables safely (Reverse order of creation)
DROP TABLE IF EXISTS ntmk_sync_leases CASCADE;
DROP TABLE IF EXISTS ntmk_reviewers CASCADE;

-- 4. Note on Core Tables (ntmk_exam_results, question_bank_v2, etc.):
-- In production, NEVER drop data tables directly during an operational rollback.
-- Tables below are only dropped during complete staging teardown.
-- To tear down staging cleanly, uncomment:
-- DROP TABLE IF EXISTS ntmk_content_audit CASCADE;
-- DROP TABLE IF EXISTS ntmk_exam_results CASCADE;
-- DROP TABLE IF EXISTS ntmk_exam_sessions CASCADE;
-- DROP TABLE IF EXISTS ntmk_sync_jobs CASCADE;
-- DROP TABLE IF EXISTS ntmk_review_candidates CASCADE;
-- DROP TABLE IF EXISTS ntmk_source_permissions CASCADE;
-- DROP TABLE IF EXISTS question_bank_v2 CASCADE;

COMMIT;

-- Post-rollback verification:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'ntmk_%';
