-- ========================================================================
-- MIGRATION: 008_multi_tenant_saas_core.sql
-- NTMK EdTech SaaS Evolution: Multi-Tenant Architecture & Data Isolation
-- Compatible with Supabase PostgreSQL & Standard PostgreSQL 14+
-- Transactional & Idempotent
-- ========================================================================

BEGIN;

-- 1. Create Core Multi-tenant Organization Table (Schools, Academies, B2C Portal)
CREATE TABLE IF NOT EXISTS saas_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    logo_url TEXT,
    primary_color VARCHAR(16) NOT NULL DEFAULT '#d97706',
    secondary_color VARCHAR(16) NOT NULL DEFAULT '#b45309',
    tagline VARCHAR(255) NOT NULL DEFAULT 'Nền tảng ôn tập thông minh GDPT 2018',
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial', 'archived')),
    plan_tier VARCHAR(32) NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro_student', 'school_standard', 'school_enterprise')),
    max_students INT NOT NULL DEFAULT 100,
    max_teachers INT NOT NULL DEFAULT 10,
    settings JSONB NOT NULL DEFAULT '{"allowGuestPractice": true, "showLeaderboard": true, "watermarkPrint": false, "customOmrLogo": true}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_tenants_slug ON saas_tenants(slug);
CREATE INDEX IF NOT EXISTS idx_saas_tenants_domain ON saas_tenants(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saas_tenants_status ON saas_tenants(status);

-- 2. Create Tenant Subscriptions & Billing Ledger
CREATE TABLE IF NOT EXISTS saas_tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
    plan_tier VARCHAR(32) NOT NULL CHECK (plan_tier IN ('free', 'pro_student', 'school_standard', 'school_enterprise')),
    billing_cycle VARCHAR(16) NOT NULL DEFAULT 'yearly' CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
    amount_vnd BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    payment_gateway VARCHAR(32) NOT NULL DEFAULT 'manual' CHECK (payment_gateway IN ('manual', 'payos', 'vnpay', 'stripe', 'sepay')),
    payment_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_tenant ON saas_tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_subscriptions_exp ON saas_tenant_subscriptions(expires_at);

-- 3. Create Tenant Membership & Role-Based Access Control (RBAC)
CREATE TABLE IF NOT EXISTS saas_tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES saas_tenants(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES ntmk_student_accounts(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'student' CHECK (role IN ('owner', 'admin', 'head_of_department', 'teacher', 'student', 'parent')),
    department_id VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_saas_tenant_member UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_tenant_members_tenant ON saas_tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saas_tenant_members_user ON saas_tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_saas_tenant_members_role ON saas_tenant_members(role);

-- 4. Alter Existing Entities to Enforce Multi-Tenant Data Architecture
DO $$
BEGIN
    -- Associate Student Accounts with Tenant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ntmk_student_accounts' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE ntmk_student_accounts ADD COLUMN tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL;
        CREATE INDEX idx_ntmk_student_accounts_tenant ON ntmk_student_accounts(tenant_id);
    END IF;

    -- Associate Active Sessions with Tenant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ntmk_student_sessions' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE ntmk_student_sessions ADD COLUMN tenant_id UUID REFERENCES saas_tenants(id) ON DELETE CASCADE;
        CREATE INDEX idx_ntmk_student_sessions_tenant ON ntmk_student_sessions(tenant_id);
    END IF;

    -- Associate Question Bank with Tenant (NULL = shared public MOET bank; UUID = private school bank)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'question_bank_v2' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE question_bank_v2 ADD COLUMN tenant_id UUID REFERENCES saas_tenants(id) ON DELETE CASCADE;
        ALTER TABLE question_bank_v2 ADD COLUMN is_shared_globally BOOLEAN NOT NULL DEFAULT TRUE;
        CREATE INDEX idx_question_bank_v2_tenant ON question_bank_v2(tenant_id);
        CREATE INDEX idx_question_bank_v2_shared ON question_bank_v2(is_shared_globally);
    END IF;

    -- Associate Diagnostic Sessions with Tenant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ntmk_diagnostic_sessions' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE ntmk_diagnostic_sessions ADD COLUMN tenant_id UUID REFERENCES saas_tenants(id) ON DELETE CASCADE;
        CREATE INDEX idx_ntmk_diagnostic_sessions_tenant ON ntmk_diagnostic_sessions(tenant_id);
    END IF;

    -- Associate Learning Profiles with Tenant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ntmk_learning_profiles' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE ntmk_learning_profiles ADD COLUMN tenant_id UUID REFERENCES saas_tenants(id) ON DELETE CASCADE;
        CREATE INDEX idx_ntmk_learning_profiles_tenant ON ntmk_learning_profiles(tenant_id);
    END IF;

    -- Associate Learning Plans with Tenant
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ntmk_learning_plans' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE ntmk_learning_plans ADD COLUMN tenant_id UUID REFERENCES saas_tenants(id) ON DELETE CASCADE;
        CREATE INDEX idx_ntmk_learning_plans_tenant ON ntmk_learning_plans(tenant_id);
    END IF;
END
$$;

-- 5. Seed Core Tenants (THPT Nguyễn Thị Minh Khai & Public B2C Portal)
INSERT INTO saas_tenants (id, slug, name, domain, primary_color, secondary_color, tagline, status, plan_tier, max_students, max_teachers)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'ntmk',
        'THPT Nguyễn Thị Minh Khai',
        'thptminhkhai.ntmk.vn',
        '#d97706',
        '#b45309',
        'Nền tảng ôn tập thông minh THPT Nguyễn Thị Minh Khai',
        'active',
        'school_enterprise',
        3000,
        150
    ),
    (
        'a0000000-0000-0000-0000-000000000000',
        'public',
        'Học sinh Toàn quốc (B2C Portal)',
        'app.edusaas.vn',
        '#2563eb',
        '#1d4ed8',
        'Nền tảng luyện thi trực tuyến THPT toàn quốc',
        'active',
        'free',
        1000000,
        0
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    plan_tier = EXCLUDED.plan_tier,
    updated_at = NOW();

-- 6. Seed Subscriptions for Seeded Tenants
INSERT INTO saas_tenant_subscriptions (id, tenant_id, plan_tier, billing_cycle, amount_vnd, status, starts_at, expires_at, payment_gateway)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'school_enterprise',
        'yearly',
        35000000,
        'active',
        NOW(),
        NOW() + INTERVAL '10 years',
        'manual'
    ),
    (
        'b0000000-0000-0000-0000-000000000000',
        'a0000000-0000-0000-0000-000000000000',
        'free',
        'lifetime',
        0,
        'active',
        NOW(),
        NOW() + INTERVAL '100 years',
        'manual'
    )
ON CONFLICT (id) DO NOTHING;

-- 7. Backfill Existing Records with Default NTMK Tenant
UPDATE ntmk_student_accounts 
SET tenant_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

UPDATE ntmk_student_sessions 
SET tenant_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

UPDATE question_bank_v2 
SET is_shared_globally = TRUE 
WHERE is_shared_globally IS NULL;

-- 8. Row Level Security (RLS) Helper Functions & Policies
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable RLS on Multi-Tenant Tables
ALTER TABLE saas_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_tenant_members ENABLE ROW LEVEL SECURITY;

-- Tenants Policy: Anyone can read active tenants (required for login & domain resolution)
DROP POLICY IF EXISTS saas_tenants_public_read ON saas_tenants;
CREATE POLICY saas_tenants_public_read ON saas_tenants
    FOR SELECT
    USING (status = 'active' OR current_setting('ntmk.actor_role', true) = 'admin');

-- Tenant Members Isolation Policy: Users see members in their active tenant
DROP POLICY IF EXISTS saas_tenant_members_tenant_isolation ON saas_tenant_members;
CREATE POLICY saas_tenant_members_tenant_isolation ON saas_tenant_members
    FOR ALL
    USING (
        tenant_id = get_current_tenant_id() 
        OR user_id = current_setting('request.jwt.claims', true)::jsonb->>'sub'
        OR current_setting('ntmk.actor_role', true) = 'admin'
    );

-- Question Bank Multi-Tenant Policy: Shared globally OR private to current tenant
DROP POLICY IF EXISTS question_bank_v2_tenant_isolation ON question_bank_v2;
CREATE POLICY question_bank_v2_tenant_isolation ON question_bank_v2
    FOR SELECT
    USING (
        is_shared_globally = TRUE
        OR tenant_id = get_current_tenant_id()
        OR current_setting('ntmk.actor_role', true) = 'admin'
    );

COMMIT;
