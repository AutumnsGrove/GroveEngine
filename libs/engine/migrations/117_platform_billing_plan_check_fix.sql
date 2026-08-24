-- Migration 117: Actually fix the platform_billing.plan CHECK constraint (real fix for #112)
-- Database: D1 (SQLite) - grove-engine-db
--
-- Same root cause and history as migration 116 (tenants.plan) — see that
-- file for the full writeup. Migration 112 documented this bug but shipped
-- as a no-op for the same reason. Unlike tenants, platform_billing has zero
-- dependent tables, so this is a plain, low-risk rename-and-recreate swap.
--
-- Superseded no-op: 112_platform_billing_plan_add_wanderer.sql

CREATE TABLE platform_billing_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,

  plan TEXT NOT NULL DEFAULT 'seedling'
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

INSERT INTO platform_billing_new SELECT * FROM platform_billing;

DROP TABLE platform_billing;

ALTER TABLE platform_billing_new RENAME TO platform_billing;

CREATE INDEX idx_platform_billing_status ON platform_billing(status);
CREATE INDEX idx_platform_billing_plan ON platform_billing(plan);
CREATE INDEX idx_platform_billing_provider ON platform_billing(provider_subscription_id) WHERE provider_subscription_id IS NOT NULL;
