-- Migration 107: Fix users table schema
-- Database: D1 (SQLite) - grove-engine-db
--
-- Migration 014 defined an 11-column users table, but used CREATE TABLE IF NOT EXISTS.
-- The table already existed with 5 columns (id, email, is_admin, created_at, updated_at)
-- from an earlier migration, so 014 was a silent no-op. This left 9 functions in
-- users.ts querying columns that don't exist in production — including getUserHomeGrove()
-- which is called from 10+ Aspen endpoints.
--
-- This migration adds the 6 missing columns and backfills from user_onboarding.

-- =============================================================================
-- STEP 1: Add missing columns
-- =============================================================================

ALTER TABLE users ADD COLUMN groveauth_id TEXT;
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN last_login_at INTEGER;
ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;

-- =============================================================================
-- STEP 2: Create indexes (from migration 014, never applied)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_groveauth ON users(groveauth_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id) WHERE tenant_id IS NOT NULL;

-- Make groveauth_id unique (matches migration 014 intent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_groveauth_unique ON users(groveauth_id) WHERE groveauth_id IS NOT NULL;

-- =============================================================================
-- STEP 3: Backfill from user_onboarding for existing users
-- =============================================================================
-- user_onboarding has groveauth_id, tenant_id, and display_name that we need.
-- Match by email (case-insensitive) since that's the shared key.

UPDATE users SET
  groveauth_id = (
    SELECT groveauth_id FROM user_onboarding
    WHERE LOWER(user_onboarding.email) = LOWER(users.email)
    LIMIT 1
  ),
  tenant_id = (
    SELECT tenant_id FROM user_onboarding
    WHERE LOWER(user_onboarding.email) = LOWER(users.email)
      AND tenant_id IS NOT NULL
    LIMIT 1
  ),
  display_name = (
    SELECT display_name FROM user_onboarding
    WHERE LOWER(user_onboarding.email) = LOWER(users.email)
    LIMIT 1
  ),
  is_active = 1
WHERE EXISTS (
  SELECT 1 FROM user_onboarding
  WHERE LOWER(user_onboarding.email) = LOWER(users.email)
);

-- =============================================================================
-- STEP 4: Create users records for anyone only in user_onboarding
-- =============================================================================
-- Some users completed Plant onboarding but never hit the Landing/Domains flow
-- that creates a users record. Ensure they exist in the SSOT.
--
-- Note: users.created_at is TEXT (ISO format) in production, not INTEGER.

INSERT OR IGNORE INTO users (
  id, groveauth_id, email, display_name, tenant_id,
  is_active, created_at, updated_at
)
SELECT
  id, groveauth_id, email, display_name, tenant_id,
  1,
  datetime(created_at, 'unixepoch'),
  datetime(updated_at, 'unixepoch')
FROM user_onboarding
WHERE groveauth_id IS NOT NULL
  AND LOWER(email) NOT IN (SELECT LOWER(email) FROM users);
