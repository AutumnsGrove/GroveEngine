-- Migration 107: Ensure users table has full schema + backfill
-- Database: D1 (SQLite) - grove-engine-db
--
-- Migration 014 defines the full users table via CREATE TABLE IF NOT EXISTS.
-- On fresh databases, 014 creates the complete schema — this just backfills.
-- On production, 014 was a no-op (5-col table pre-existed), so this migration
-- uses rename-and-recreate to bring the schema to canonical shape safely.
--
-- Uses rename-and-recreate pattern (same as migration 108) to avoid
-- ALTER TABLE ADD COLUMN failures on columns that may already exist.

PRAGMA foreign_keys = OFF;

-- =============================================================================
-- STEP 1: Recreate users table with canonical schema
-- =============================================================================
-- Rename existing table (works regardless of its column count).
-- Create new table matching migration 014's intent + is_admin for compat.

ALTER TABLE users RENAME TO _users_107_backup;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  groveauth_id TEXT,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  tenant_id TEXT REFERENCES tenants(id) ON DELETE SET NULL,
  last_login_at INTEGER,
  login_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- =============================================================================
-- STEP 2: Copy data — only universally-present columns
-- =============================================================================
-- The backup may have 5 columns (production) or 12 (fresh DB from 014).
-- Only id, email, created_at, updated_at are guaranteed in both schemas.
-- Missing columns get their DEFAULT values; step 4 backfills the rest.

INSERT INTO users (id, email, created_at, updated_at)
SELECT id, email, created_at, updated_at
FROM _users_107_backup;

DROP TABLE _users_107_backup;

-- =============================================================================
-- STEP 3: Recreate indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_users_groveauth ON users(groveauth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_groveauth_unique ON users(groveauth_id) WHERE groveauth_id IS NOT NULL;

PRAGMA foreign_keys = ON;

-- =============================================================================
-- STEP 4: Backfill from user_onboarding for existing users
-- =============================================================================

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
WHERE groveauth_id IS NULL
  AND EXISTS (
    SELECT 1 FROM user_onboarding
    WHERE LOWER(user_onboarding.email) = LOWER(users.email)
  );

-- =============================================================================
-- STEP 5: Create users records for anyone only in user_onboarding
-- =============================================================================

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
