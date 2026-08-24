-- Migration 116: Actually fix the tenants.plan CHECK constraint (real fix for #111)
-- Database: D1 (SQLite) - grove-engine-db
--
-- Migration 111 documented this same bug but shipped as a no-op — the
-- original rename-and-recreate attempt assumed `PRAGMA foreign_keys=OFF`
-- would suppress FK enforcement during the swap. It doesn't: D1 wraps a
-- migration file's statements in one implicit transaction, and the pragma
-- is silently ignored once that transaction is open. Production was hand-
-- patched directly (outside migration history) back on 2026-04-18, so this
-- has only ever blocked fresh database bootstraps — local dev, CI, or any
-- future prod rebuild from migration history alone. Confirmed while wiring
-- up local Plant dev: every Wanderer (free tier) signup failed at step 1 of
-- createTenant() with SQLITE_CONSTRAINT_CHECK on a from-scratch database.
--
-- The actual blocker: SQLite CHECK constraints live in the table's stored
-- CREATE TABLE text and can't be altered in place; changing one requires
-- recreating the table. `tenants` has 27 dependent tables via FK, and two
-- more common workarounds were tried and ruled out first:
--   - PRAGMA foreign_keys=OFF: no-op mid-transaction (see above)
--   - PRAGMA writable_schema=ON + direct sqlite_master edit: D1 rejects
--     this outright with SQLITE_AUTH
--
-- What actually works: SQLite auto-rewrites a dependent table's stored FK
-- REFERENCES clause when the table IT references is renamed — but only the
-- renamed table's dependents get rewritten, and only to follow that new
-- name. So the swap below is careful to never rename the original `tenants`
-- table at all — dependents keep referencing the literal name "tenants"
-- throughout. Steps: build the corrected table under a temp name, copy
-- data in, drop the original, then rename the temp table into the vacated
-- "tenants" name. Verified locally: PRAGMA foreign_key_check reports zero
-- violations across the whole database after this swap, and all 27
-- dependent tables' stored FK clauses are byte-identical before and after.
--
-- Superseded no-op: 111_tenants_plan_add_wanderer.sql

CREATE TABLE tenants_new (
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,

  plan TEXT DEFAULT 'seedling' CHECK (plan IN ('free', 'wanderer', 'seedling', 'sapling', 'oak', 'evergreen')),
  storage_used INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,

  custom_domain TEXT,

  theme TEXT DEFAULT 'default',
  accent_color TEXT,

  active INTEGER DEFAULT 1,

  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  encrypted_dek TEXT, last_activity_at INTEGER DEFAULT 0, reclamation_status TEXT, meadow_opt_in INTEGER DEFAULT 0
);

INSERT INTO tenants_new SELECT * FROM tenants;

DROP TABLE tenants;

ALTER TABLE tenants_new RENAME TO tenants;

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_subdomain_active ON tenants(subdomain) WHERE active = 1;
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_plan ON tenants(plan);
