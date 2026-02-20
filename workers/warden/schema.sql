-- Grove Warden — D1 Schema
-- Run against grove-warden D1 database
--
-- Column names are aligned with the Vista warden-aggregator queries:
--   auth_result, auth_method, target_service, event_type
-- See: libs/engine/src/lib/server/observability/aggregators/warden-aggregator.ts

CREATE TABLE IF NOT EXISTS warden_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  scopes TEXT NOT NULL DEFAULT '[]',
  rate_limit_rpm INTEGER DEFAULT 60,
  rate_limit_daily INTEGER DEFAULT 1000,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT,
  request_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS warden_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  target_service TEXT NOT NULL,
  action TEXT NOT NULL,
  auth_method TEXT NOT NULL,
  auth_result TEXT NOT NULL DEFAULT 'success',
  event_type TEXT NOT NULL DEFAULT 'request',
  tenant_id TEXT,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  created_at TEXT DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (agent_id) REFERENCES warden_agents(id)
);

-- Indexes for Vista aggregator queries (all filter on created_at DESC)
CREATE INDEX IF NOT EXISTS idx_audit_created ON warden_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_agent ON warden_audit_log(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_service ON warden_audit_log(target_service, created_at DESC);
