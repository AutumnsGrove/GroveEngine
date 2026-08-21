-- Migration 107: Ensure users table has full schema + backfill
-- Database: D1 (SQLite) - grove-engine-db
--
-- Migration 014 defines the full users table via CREATE TABLE IF NOT EXISTS.
-- On fresh databases, 014 creates the complete schema — this just backfills.
-- On production, 014 was a no-op (5-col table pre-existed), so this migration
-- uses rename-and-recreate to bring the schema to canonical shape safely.
--
-- IMPORTANT — D1-safe rename-and-recreate pattern:
-- Renaming `users` auto-rewrites any OTHER table's foreign key clause that
-- references it (SQLite renames FK targets on ALTER TABLE RENAME). That
-- silently repoints `sessions.user_id` and `cdn_files.uploaded_by` at the
-- backup table's name — so `DROP TABLE _users_107_backup` later fails with
-- SQLITE_CONSTRAINT_FOREIGNKEY, because those tables still hold live FKs
-- into it. `PRAGMA foreign_keys = OFF` does NOT prevent this — verified
-- against a disposable scratch D1 database (2026-08-19) that the DROP fails
-- regardless of the pragma. The fix: rebuild every dependent table too,
-- re-pointing its FK at the final `users` table, BEFORE dropping the backup.
--
-- Verified against production (2026-08-19): schema and backfill already
-- match target (someone applied this by hand previously, outside tracked
-- migration history) — this run should affect 0 rows. Written to also be
-- correct on a genuinely fresh database.

PRAGMA foreign_keys = OFF;

-- STEP 1: Recreate users table with canonical schema
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

-- STEP 2: Copy data — only universally-present columns.
-- The backup may have 5 columns (production) or 12 (fresh DB from 014).
-- Only id, email, created_at, updated_at are guaranteed in both schemas.
-- Missing columns get their DEFAULT values; step 5 backfills the rest.
INSERT INTO users (id, email, created_at, updated_at)
SELECT id, email, created_at, updated_at
FROM _users_107_backup;

-- STEP 3: Rebuild every table with a live FK into `users`, re-pointing it
-- at the new table (SQLite auto-repointed these at `_users_107_backup`
-- when it was renamed in step 1 — they must be rebuilt before that backup
-- can be dropped).
CREATE TABLE sessions_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL, access_token TEXT, refresh_token TEXT, token_expires_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- `SELECT *` here assumed `sessions` already had this migration's 7-column
-- shape — true on production (hand-migrated out of band, see note below),
-- but false on a genuinely fresh database, which only ever gets the
-- 5-column shape from migration 005 (id, tenant_id, user_email, expires_at,
-- created_at). No tracked migration between 005 and this one ever bridges
-- that gap, so `SELECT *` against a fresh DB fails at prepare time with a
-- column-count mismatch — verified against a scratch fresh D1 (2026-08-21).
--
-- Fix: derive user_id via the users table (already populated by STEP 2,
-- keyed by email) instead of assuming `sessions.user_id` already exists.
-- Sessions with no matching user are dropped — they're expired auth tokens
-- from the old scheme, not durable data; losing them just means a
-- re-login, the normal consequence of any session-table migration.
--
-- Production is unaffected: this migration is already recorded as applied
-- there (verified via d1_migrations, 2026-08-21) and will never re-run.
INSERT INTO sessions_new (id, user_id, expires_at, created_at)
SELECT s.id, u.id, s.expires_at, s.created_at
FROM sessions s
JOIN users u ON LOWER(u.email) = LOWER(s.user_email);
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

-- `cdn_files` has the identical problem `sessions` had: no tracked
-- migration ever creates it, so on a fresh database it doesn't exist at
-- all yet — the rename-and-copy dance below was designed for production,
-- where it already existed with data. Since production already has this
-- migration recorded as applied (verified via d1_migrations, 2026-08-21)
-- and will never re-run it, this only needs to handle "table doesn't
-- exist yet" going forward — so just create it directly, no data to
-- preserve.
CREATE TABLE IF NOT EXISTS cdn_files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    folder TEXT DEFAULT '/',
    alt_text TEXT,
    uploaded_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- STEP 4: Now safe to drop — nothing references it anymore.
DROP TABLE _users_107_backup;

-- STEP 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_groveauth ON users(groveauth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_groveauth_unique ON users(groveauth_id) WHERE groveauth_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_cdn_files_uploaded_by ON cdn_files(uploaded_by);

PRAGMA foreign_keys = ON;

-- STEP 6: Backfill from user_onboarding for existing users
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

-- STEP 7: Create users records for anyone only in user_onboarding
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
