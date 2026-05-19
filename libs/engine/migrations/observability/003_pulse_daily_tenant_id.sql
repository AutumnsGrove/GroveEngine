-- Add tenant_id to pulse_daily for tenant-scoped analytics.
-- Without this, the daily aggregation merges all tenants' metrics into
-- shared rows, breaking tenant isolation when a dashboard is built.

ALTER TABLE pulse_daily ADD COLUMN tenant_id TEXT;

-- Replace the old unique constraint with one that includes tenant_id.
-- SQLite doesn't support DROP CONSTRAINT, so we recreate via index.
DROP INDEX IF EXISTS sqlite_autoindex_pulse_daily_1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pulse_daily_unique
  ON pulse_daily(date, event, route, app, tenant_id);

CREATE INDEX IF NOT EXISTS idx_pulse_daily_tenant
  ON pulse_daily(tenant_id, date)
  WHERE tenant_id IS NOT NULL;
