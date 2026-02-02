-- Zephyr Email Gateway Logging
--
-- Stores all email send attempts for audit and debugging.
-- Does NOT store email body content (privacy).
--
-- Part of: Zephyr — Grove's unified email gateway

-- Email send log table
CREATE TABLE IF NOT EXISTS zephyr_logs (
  id TEXT PRIMARY KEY,
  message_id TEXT,

  -- Request details
  type TEXT NOT NULL,
  template TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,

  -- Result
  success INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  error_message TEXT,

  -- Provider metadata
  provider TEXT,
  attempts INTEGER DEFAULT 1,
  latency_ms INTEGER,

  -- Context for debugging
  tenant TEXT,
  source TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,

  -- Timestamps (Unix seconds)
  created_at INTEGER NOT NULL,
  scheduled_at INTEGER,
  sent_at INTEGER
);

-- Index for looking up emails by recipient
CREATE INDEX IF NOT EXISTS idx_zephyr_recipient ON zephyr_logs(recipient);

-- Index for filtering by email type
CREATE INDEX IF NOT EXISTS idx_zephyr_type ON zephyr_logs(type);

-- Index for time-based queries (stats, cleanup)
CREATE INDEX IF NOT EXISTS idx_zephyr_created ON zephyr_logs(created_at);

-- Index for correlation tracing
CREATE INDEX IF NOT EXISTS idx_zephyr_correlation ON zephyr_logs(correlation_id)
  WHERE correlation_id IS NOT NULL;

-- Unique index for idempotency enforcement
CREATE UNIQUE INDEX IF NOT EXISTS idx_zephyr_idempotency ON zephyr_logs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for finding failed emails (for retry dashboard)
CREATE INDEX IF NOT EXISTS idx_zephyr_failures ON zephyr_logs(success, created_at)
  WHERE success = 0;

-- Index for provider-specific queries (cost tracking)
CREATE INDEX IF NOT EXISTS idx_zephyr_provider ON zephyr_logs(provider);
