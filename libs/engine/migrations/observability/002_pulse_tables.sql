-- Grove Pulse — Product Observability Tables
-- Stores product-level events (page views, signups, feature usage, errors)
-- collected by the pulse-collector worker via DO-buffered writes.
--
-- Timestamp convention: ALL timestamps use INTEGER (Unix epoch seconds).
-- Retention: pulse_events = 90 days, pulse_daily = 1 year, signup_funnel = 1 year.

-- =============================================================================
-- pulse_events — Raw product events (90-day retention)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pulse_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event TEXT NOT NULL,
  category TEXT NOT NULL,
  route TEXT,
  method TEXT,
  status INTEGER,
  duration_ms INTEGER,
  tenant_id TEXT,
  visitor_hash TEXT,
  app TEXT,
  metadata TEXT,
  recorded_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pulse_events_category_time
  ON pulse_events(category, recorded_at);

CREATE INDEX IF NOT EXISTS idx_pulse_events_event_time
  ON pulse_events(event, recorded_at);

CREATE INDEX IF NOT EXISTS idx_pulse_events_app_time
  ON pulse_events(app, recorded_at);

CREATE INDEX IF NOT EXISTS idx_pulse_events_route_time
  ON pulse_events(route, recorded_at);

CREATE INDEX IF NOT EXISTS idx_pulse_events_tenant_time
  ON pulse_events(tenant_id, recorded_at)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pulse_events_recorded
  ON pulse_events(recorded_at);

-- =============================================================================
-- pulse_daily — Aggregated daily counts per event/route/app (1-year retention)
-- =============================================================================
CREATE TABLE IF NOT EXISTS pulse_daily (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  event TEXT NOT NULL,
  category TEXT NOT NULL,
  route TEXT,
  app TEXT,
  count INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  avg_duration_ms INTEGER,
  error_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(date, event, route, app)
);

CREATE INDEX IF NOT EXISTS idx_pulse_daily_date
  ON pulse_daily(date);

CREATE INDEX IF NOT EXISTS idx_pulse_daily_event_date
  ON pulse_daily(event, date);

-- =============================================================================
-- signup_funnel — Dedicated signup step tracking (1-year retention)
-- =============================================================================
CREATE TABLE IF NOT EXISTS signup_funnel (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  step TEXT NOT NULL,
  recorded_at INTEGER NOT NULL,
  duration_from_start_ms INTEGER,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_signup_funnel_user
  ON signup_funnel(user_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_signup_funnel_step_time
  ON signup_funnel(step, recorded_at);

CREATE INDEX IF NOT EXISTS idx_signup_funnel_time
  ON signup_funnel(recorded_at);
