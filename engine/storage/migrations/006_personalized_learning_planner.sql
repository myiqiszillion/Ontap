-- ========================================================================
-- MIGRATION: 006_personalized_learning_planner.sql
-- NTMK Rebuild Phase 03B: Personalized Learning Planner & Adaptive Practice
-- Compatible with Supabase PostgreSQL & Standard PostgreSQL 14+
-- Transactional & Idempotent
-- ========================================================================

BEGIN;

-- 1. Learning Profiles Table
CREATE TABLE IF NOT EXISTS ntmk_learning_profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    grade SMALLINT NOT NULL CHECK (grade IN (10, 11, 12)),
    priority_subjects JSONB NOT NULL DEFAULT '["toan"]',
    learning_goals JSONB NOT NULL DEFAULT '["strengthen_foundation"]',
    target_scores JSONB NOT NULL DEFAULT '{}',
    target_exam_date DATE,
    daily_study_minutes SMALLINT NOT NULL DEFAULT 30 CHECK (daily_study_minutes BETWEEN 15 AND 180),
    study_days_per_week JSONB NOT NULL DEFAULT '[1,2,3,4,5,6]',
    diagnostic_references JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Learning Plans Table
CREATE TABLE IF NOT EXISTS ntmk_learning_plans (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL REFERENCES ntmk_learning_profiles(id) ON DELETE CASCADE,
    plan_version INT NOT NULL DEFAULT 1,
    plan_days SMALLINT NOT NULL DEFAULT 14,
    start_date DATE NOT NULL,
    daily_study_minutes SMALLINT NOT NULL,
    study_days_per_week JSONB NOT NULL,
    priority_subjects JSONB NOT NULL,
    calendar_schedule JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Learning Plan Versions (History of replans)
CREATE TABLE IF NOT EXISTS ntmk_learning_plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id TEXT NOT NULL REFERENCES ntmk_learning_plans(id) ON DELETE CASCADE,
    version INT NOT NULL,
    change_reason TEXT NOT NULL,
    before_after_summary JSONB NOT NULL,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Learning Tasks Table
CREATE TABLE IF NOT EXISTS ntmk_learning_tasks (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL REFERENCES ntmk_learning_plans(id) ON DELETE CASCADE,
    subject_id VARCHAR(32) NOT NULL,
    skill_id VARCHAR(64) NOT NULL,
    topic_id VARCHAR(64) NOT NULL,
    task_type VARCHAR(32) NOT NULL CHECK (task_type IN ('remediation', 'adaptive_practice', 'wrong_review', 'spaced_review', 'followup_assessment')),
    title VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    difficulty VARCHAR(16) NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    estimated_minutes SMALLINT NOT NULL DEFAULT 20,
    scheduled_date DATE,
    question_set_reference JSONB,
    prerequisite_references JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'in_progress', 'completed', 'postponed', 'skipped', 'blocked')),
    completion_evidence JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Learning Task Events (Task lifecycle auditing)
CREATE TABLE IF NOT EXISTS ntmk_learning_task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT NOT NULL REFERENCES ntmk_learning_tasks(id) ON DELETE CASCADE,
    event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('started', 'completed', 'postponed', 'skipped', 'rescheduled')),
    event_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Practice Sessions Table
CREATE TABLE IF NOT EXISTS ntmk_practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id TEXT REFERENCES ntmk_learning_tasks(id) ON DELETE SET NULL,
    student_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    mode VARCHAR(32) NOT NULL,
    subject_id VARCHAR(32) NOT NULL,
    skill_id VARCHAR(64),
    target_difficulty VARCHAR(16) NOT NULL,
    private_questions JSONB NOT NULL,
    saved_answers JSONB NOT NULL DEFAULT '{}',
    is_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    result JSONB,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at TIMESTAMPTZ
);

-- 7. Review Schedules Table (Spaced repetition tracking)
CREATE TABLE IF NOT EXISTS ntmk_review_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    skill_id VARCHAR(64) NOT NULL,
    subject_id VARCHAR(32) NOT NULL,
    review_count INT NOT NULL DEFAULT 0,
    consecutive_successes INT NOT NULL DEFAULT 0,
    current_interval_days SMALLINT NOT NULL DEFAULT 1,
    last_practiced DATE,
    last_accuracy NUMERIC(5,4),
    next_review_date DATE,
    retention_evidence VARCHAR(32) NOT NULL DEFAULT 'untested',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, skill_id)
);

-- 8. Study Progress Snapshots Table
CREATE TABLE IF NOT EXISTS ntmk_study_progress_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_tasks_plan_id ON ntmk_learning_tasks(plan_id);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_status ON ntmk_learning_tasks(status);
CREATE INDEX IF NOT EXISTS idx_learning_tasks_scheduled_date ON ntmk_learning_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_review_schedules_next_date ON ntmk_review_schedules(next_review_date);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_student ON ntmk_practice_sessions(student_id);

COMMIT;
