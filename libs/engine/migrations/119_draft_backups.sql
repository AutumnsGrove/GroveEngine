-- 119_draft_backups.sql
-- Periodic D1 backup of TenantDO in-progress drafts (issue #1586)
--
-- TenantDO's `drafts` table (per-tenant SQLite, durable but only reachable by
-- routing a request through that specific DO) is the hot write path for
-- autosave. This table is a periodic, alarm-driven mirror of that data into
-- D1 so it's queryable with normal tooling and survives a tenant's DO
-- storage ever being wiped (offboarding, account deletion cleanup, etc).
--
-- One row per (tenant, draft slug) — INSERT OR REPLACE keyed the same way
-- TenantDO keys its own drafts table. Not a source of truth; TenantDO's
-- SQLite remains authoritative until a draft is actually saved as a post.

CREATE TABLE IF NOT EXISTS draft_backups (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT NOT NULL,
  last_saved INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  backed_up_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_draft_backups_tenant ON draft_backups(tenant_id, last_saved DESC);
