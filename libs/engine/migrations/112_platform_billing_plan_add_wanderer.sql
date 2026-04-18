-- Migration: Add 'wanderer' to platform_billing plan CHECK constraint
-- Description: Same root cause as migration 111 (tenants table) — platform_billing's
--   plan CHECK constraint also excluded 'wanderer', causing step 2 of createTenant()
--   to fail with SQLITE_CONSTRAINT_CHECK for every free signup attempt.
-- Date: 2026-04-18
--
-- Context: plan IN ('free', 'seedling', 'sapling', 'oak', 'evergreen') blocked inserts
--   with plan='wanderer'. Requires table rebuild since SQLite can't ALTER CHECK constraints.
--   platform_billing has a FK to tenants(id) ON DELETE CASCADE — preserved in new table.

PRAGMA foreign_keys = OFF;

-- 1. Create new platform_billing table with updated CHECK constraint (adds 'wanderer')
CREATE TABLE platform_billing_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'wanderer', 'seedling', 'sapling', 'oak', 'evergreen')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trialing', 'active', 'past_due', 'paused', 'canceled', 'unpaid')),
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  current_period_start INTEGER,
  current_period_end INTEGER,
  cancel_at_period_end INTEGER DEFAULT 0,
  trial_end INTEGER,
  payment_method_last4 TEXT,
  payment_method_brand TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 2. Copy all existing rows
INSERT INTO platform_billing_new SELECT * FROM platform_billing;

-- 3. Swap tables
DROP TABLE platform_billing;
ALTER TABLE platform_billing_new RENAME TO platform_billing;

PRAGMA foreign_keys = ON;
