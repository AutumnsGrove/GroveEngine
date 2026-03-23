-- ============================================================================
-- FRIENDS: USER-SCOPED FOLLOW RELATIONSHIPS
-- ============================================================================
-- Changes friends from tenant-scoped to user-scoped so that users WITHOUT
-- their own grove can still follow other groves. Previously, following
-- required getUserHomeGrove() which blocked grove-less users entirely.
--
-- Changes:
--   - Adds user_id column (NOT NULL) — the primary scope for follows
--   - Makes tenant_id nullable (NULL for grove-less users)
--   - Unique constraint changes: (tenant_id, friend_tenant_id) → (user_id, friend_tenant_id)
--   - Backfills user_id from users table via tenant_id join
--
-- SQLite requires recreate-and-copy for constraint changes.
--
-- @see https://github.com/AutumnsGrove/Lattice/issues/1518
-- ============================================================================

-- Step 1: Create the new table with user-scoped schema
CREATE TABLE IF NOT EXISTS friends_v2 (
    id                TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id           TEXT NOT NULL,
    tenant_id         TEXT,
    friend_tenant_id  TEXT NOT NULL,
    friend_name       TEXT NOT NULL,
    friend_subdomain  TEXT NOT NULL,
    source            TEXT NOT NULL DEFAULT 'manual',
    added_at          TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, friend_tenant_id)
);

-- Step 2: Backfill from old table — resolve user_id via the users table
-- Users are linked to tenants via users.tenant_id, so we join on that.
-- Any orphaned rows (tenant_id with no matching user) are silently skipped.
INSERT OR IGNORE INTO friends_v2 (id, user_id, tenant_id, friend_tenant_id, friend_name, friend_subdomain, source, added_at)
SELECT
    f.id,
    u.id,
    f.tenant_id,
    f.friend_tenant_id,
    f.friend_name,
    f.friend_subdomain,
    f.source,
    f.added_at
FROM friends f
JOIN users u ON u.tenant_id = f.tenant_id AND u.is_active = 1;

-- Step 3: Drop old table and rename
DROP TABLE IF EXISTS friends;
ALTER TABLE friends_v2 RENAME TO friends;

-- Step 4: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends (user_id);
CREATE INDEX IF NOT EXISTS idx_friends_tenant ON friends (tenant_id);
