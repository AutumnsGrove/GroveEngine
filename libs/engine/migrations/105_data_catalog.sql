-- ============================================================================
-- DATA CATALOG: BADGES, ARTIFACTS, DOMAIN BLOCKLIST
-- ============================================================================
-- D1 tables for synced reference data from JSON source files.
-- Populated by scripts/data-sync.ts which reads from
-- libs/engine/src/lib/data/*.json and upserts via the D1 REST API.
--
-- These tables serve as the queryable runtime store. The JSON files remain
-- the single source of truth; the sync script uses content_hash for
-- change detection to avoid unnecessary writes.
--
-- Tables:
--   data_badges          — Achievement and community badges
--   data_artifacts       — Interactive curios (magic 8-ball, tarot, etc.)
--   data_domain_blocklist — Reserved/blocked usernames for Loam
--
-- @see scripts/data-sync.ts
-- @see libs/engine/src/lib/data/
-- ============================================================================

-- ---------------------------------------------------------------------------
-- data_badges
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS data_badges (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT NOT NULL,
    icon          TEXT NOT NULL,
    category      TEXT NOT NULL,
    rarity        TEXT NOT NULL,
    badge_group   TEXT NOT NULL,
    auto_criteria TEXT,
    is_system     INTEGER NOT NULL DEFAULT 0,
    content_hash  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_data_badges_category ON data_badges (category);
CREATE INDEX IF NOT EXISTS idx_data_badges_rarity ON data_badges (rarity);
CREATE INDEX IF NOT EXISTS idx_data_badges_group ON data_badges (badge_group);
CREATE INDEX IF NOT EXISTS idx_data_badges_system ON data_badges (is_system);

-- ---------------------------------------------------------------------------
-- data_artifacts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS data_artifacts (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    label          TEXT NOT NULL,
    description    TEXT NOT NULL,
    artifact_type  TEXT NOT NULL,
    category       TEXT NOT NULL,
    icon           TEXT NOT NULL,
    default_config TEXT,
    content_hash   TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_data_artifacts_type ON data_artifacts (artifact_type);
CREATE INDEX IF NOT EXISTS idx_data_artifacts_category ON data_artifacts (category);

-- ---------------------------------------------------------------------------
-- data_domain_blocklist
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS data_domain_blocklist (
    username      TEXT PRIMARY KEY,
    reason        TEXT NOT NULL CHECK (reason IN (
        'system', 'grove_service', 'trademark', 'impersonation',
        'offensive', 'fraud', 'future_reserved'
    )),
    category      TEXT,
    content_hash  TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_data_domain_blocklist_reason ON data_domain_blocklist (reason);
CREATE INDEX IF NOT EXISTS idx_data_domain_blocklist_category ON data_domain_blocklist (category);
