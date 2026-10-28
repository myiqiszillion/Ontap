/**
 * SaaS Multi-Tenant Database Schema & RLS Policy Integrity Test Suite
 * Step 1: Multi-Tenant Architecture Verification
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { MigrationRunner } = require('../engine/storage/migration-runner.js');

describe('SaaS Multi-Tenant Core Architecture & Schema Integrity (008)', () => {
  const migrationsDir = path.join(__dirname, '../engine/storage/migrations');
  const migration008File = path.join(migrationsDir, '008_multi_tenant_saas_core.sql');

  test('1.1 Migration 008 file exists, has valid BEGIN/COMMIT transaction boundaries and zero static errors', () => {
    assert.ok(fs.existsSync(migration008File), '008_multi_tenant_saas_core.sql must exist');
    const sql = fs.readFileSync(migration008File, 'utf8');

    const runner = new MigrationRunner();
    const fileReport = runner.validateSingleSql('008_multi_tenant_saas_core.sql', sql);

    assert.equal(fileReport.valid, true, `Static SQL errors: ${fileReport.errors.join('; ')}`);
    assert.equal(fileReport.hasTransaction, true, 'Migration must have BEGIN; and COMMIT;');
    assert.ok(fileReport.tables.includes('saas_tenants'), 'Must declare saas_tenants');
    assert.ok(fileReport.tables.includes('saas_tenant_subscriptions'), 'Must declare saas_tenant_subscriptions');
    assert.ok(fileReport.tables.includes('saas_tenant_members'), 'Must declare saas_tenant_members');
  });

  test('1.2 saas_tenants table defines required multi-tenant white-label and quota columns', () => {
    const sql = fs.readFileSync(migration008File, 'utf8');

    // Multi-tenant core columns
    assert.ok(sql.includes('slug VARCHAR(64) UNIQUE NOT NULL'), 'Must require unique organization slug');
    assert.ok(sql.includes('name VARCHAR(255) NOT NULL'), 'Must require organization name');
    assert.ok(sql.includes('domain VARCHAR(255) UNIQUE'), 'Must support custom school domains');
    assert.ok(sql.includes('logo_url TEXT'), 'Must support custom logo');
    assert.ok(sql.includes('primary_color VARCHAR(16)'), 'Must support brand primary color');
    assert.ok(sql.includes('plan_tier VARCHAR(32)'), 'Must define plan tier');
    assert.ok(sql.includes('max_students INT'), 'Must define student license quota');
    assert.ok(sql.includes('max_teachers INT'), 'Must define teacher quota');
  });

  test('1.3 saas_tenant_members table defines RBAC roles for school hierarchy', () => {
    const sql = fs.readFileSync(migration008File, 'utf8');

    assert.ok(sql.includes('role VARCHAR(32) NOT NULL DEFAULT \'student\''), 'Must define default role');
    assert.ok(sql.includes("'owner', 'admin', 'head_of_department', 'teacher', 'student', 'parent'"), 
      'Must support complete educational RBAC hierarchy: owner, admin, head_of_department, teacher, student, parent');
    assert.ok(sql.includes('CONSTRAINT uq_saas_tenant_member UNIQUE (tenant_id, user_id)'), 
      'Must enforce unique membership per tenant');
  });

  test('1.4 Alters existing core tables to incorporate tenant_id foreign keys', () => {
    const sql = fs.readFileSync(migration008File, 'utf8');

    assert.ok(sql.includes('ADD COLUMN tenant_id UUID REFERENCES saas_tenants(id) ON DELETE SET NULL'), 
      'Must add tenant_id to ntmk_student_accounts');
    assert.ok(sql.includes('ADD COLUMN tenant_id UUID REFERENCES saas_tenants(id) ON DELETE CASCADE'), 
      'Must cascade tenant deletion for sessions');
    assert.ok(sql.includes('ALTER TABLE question_bank_v2 ADD COLUMN tenant_id UUID'), 
      'Must add tenant_id to question_bank_v2');
    assert.ok(sql.includes('ADD COLUMN is_shared_globally BOOLEAN NOT NULL DEFAULT TRUE'), 
      'Must support global public questions vs school private questions');
  });

  test('1.5 Seeds default legacy tenant (THPT Nguyễn Thị Minh Khai) and public B2C portal', () => {
    const sql = fs.readFileSync(migration008File, 'utf8');

    // Check NTMK seed
    assert.ok(sql.includes('a0000000-0000-0000-0000-000000000001'), 'Must seed NTMK UUID');
    assert.ok(sql.includes('THPT Nguyễn Thị Minh Khai'), 'Must seed NTMK school name');
    assert.ok(sql.includes('school_enterprise'), 'NTMK must be configured as school_enterprise');

    // Check Public Portal seed
    assert.ok(sql.includes('a0000000-0000-0000-0000-000000000000'), 'Must seed Public UUID');
    assert.ok(sql.includes('Học sinh Toàn quốc (B2C Portal)'), 'Must seed public portal name');
  });

  test('1.6 Defines Row Level Security (RLS) isolation policies & tenant lookup function', () => {
    const sql = fs.readFileSync(migration008File, 'utf8');

    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION get_current_tenant_id()'), 
      'Must declare get_current_tenant_id() helper function');
    assert.ok(sql.includes('ALTER TABLE saas_tenants ENABLE ROW LEVEL SECURITY;'), 
      'Must enable RLS on saas_tenants');
    assert.ok(sql.includes('ALTER TABLE saas_tenant_members ENABLE ROW LEVEL SECURITY;'), 
      'Must enable RLS on saas_tenant_members');
    assert.ok(sql.includes('CREATE POLICY question_bank_v2_tenant_isolation ON question_bank_v2'), 
      'Must declare question bank tenant isolation policy');
  });

  test('1.7 MigrationRunner includes 008 in strict forward sequence without regressions', () => {
    const runner = new MigrationRunner();
    assert.ok(runner.forwardList.includes('008_multi_tenant_saas_core.sql'));
    assert.equal(runner.forwardList[runner.forwardList.length - 1], '008_multi_tenant_saas_core.sql');

    const staticReport = runner.validateStaticAll();
    assert.equal(staticReport.valid, true);
    assert.equal(staticReport.errors.length, 0);
  });
});
