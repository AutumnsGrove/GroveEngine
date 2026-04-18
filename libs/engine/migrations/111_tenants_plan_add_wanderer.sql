-- Migration: Add 'wanderer' to tenants plan CHECK constraint
-- Description: The free tier was renamed from 'free' to 'wanderer' in the application,
--   but the DB CHECK constraint was never updated. This caused every free signup to fail
--   with SQLITE_CONSTRAINT_CHECK at step 1 of createTenant().
-- Date: 2026-04-18
--
-- Context: plan IN ('free', 'seedling', 'sapling', 'oak', 'evergreen') blocked inserts
--   with plan='wanderer'. SQLite requires a table rebuild to change a CHECK constraint.

PRAGMA foreign_keys = OFF;

-- 1. Create new tenants table with updated CHECK constraint (adds 'wanderer')
CREATE TABLE tenants_new (
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'wanderer', 'seedling', 'sapling', 'oak', 'evergreen')),
  storage_used INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  custom_domain TEXT,
  theme TEXT DEFAULT 'default',
  accent_color TEXT,
  active INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  encrypted_dek TEXT,
  meadow_opt_in INTEGER DEFAULT 0
);

-- 2. Copy all existing rows
INSERT INTO tenants_new SELECT * FROM tenants;

-- 3. Swap tables
DROP TABLE tenants;
ALTER TABLE tenants_new RENAME TO tenants;

-- 4. Recreate indexes (dropped with the old table)
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_subdomain_active ON tenants(subdomain) WHERE active = 1;
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_plan ON tenants(plan);

PRAGMA foreign_keys = ON;
