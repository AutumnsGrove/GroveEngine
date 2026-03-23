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
--
-- The friends table had 0 rows in production at migration time, so no
-- backfill is needed. We drop and recreate with the new schema.
--
-- SQLite requires recreate-and-copy for constraint changes.
--
-- @see https://github.com/AutumnsGrove/Lattice/issues/1518
-- ============================================================================

-- Drop old table (empty — no data loss)
DROP TABLE IF EXISTS friends;

-- Recreate with user-scoped schema
CREATE TABLE friends (
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

CREATE INDEX IF NOT EXISTS idx_friends_user ON friends (user_id);
CREATE INDEX IF NOT EXISTS idx_friends_tenant ON friends (tenant_id);
