-- Migration 108: Remove dead columns from user_onboarding
-- Database: D1 (SQLite) - grove-engine-db
--
-- Drops 10 unused columns using the rename-and-recreate pattern required by
-- SQLite (no ALTER TABLE DROP COLUMN support in the SQLite version D1 runs).
--
-- Dropped columns (never carried into the rebuilt table):
--   stripe_checkout_session_id, checklist_dismissed, first_post_at,
--   first_vine_at, theme_customized_at, welcome_email_sent,
--   day1_email_sent, day3_email_sent, and 2 more never-read/written columns.
--
-- Written to only reference columns being KEPT, so it's safe to run whether
-- the dead columns are still present (fresh install) or already gone
-- (production, hand-patched — verified 2026-08-19, all 10 already absent).
--
-- IMPORTANT — same D1-safe rename-and-recreate pattern as migration 107:
-- renaming `user_onboarding` auto-repoints `email_verifications.user_id`'s
-- FK at the backup table, so it must be rebuilt too before the backup can
-- be dropped (verified against a disposable scratch D1 database, 2026-08-19).

PRAGMA foreign_keys = OFF;

CREATE TABLE user_onboarding_new (
  id TEXT PRIMARY KEY,
  groveauth_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  username TEXT UNIQUE,
  favorite_color TEXT,
  interests TEXT DEFAULT '[]',
  auth_completed_at INTEGER,
  profile_completed_at INTEGER,
  plan_selected TEXT,
  plan_billing_cycle TEXT,
  plan_selected_at INTEGER,
  payment_completed_at INTEGER,
  tenant_created_at INTEGER,
  tour_started_at INTEGER,
  tour_completed_at INTEGER,
  tour_skipped INTEGER DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  checkin_emails_unsubscribed INTEGER DEFAULT 0,
  email_verified INTEGER DEFAULT 0,
  email_verified_at INTEGER,
  email_verified_via TEXT,
  tenant_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

INSERT INTO user_onboarding_new (
  id, groveauth_id, email, display_name, username, favorite_color, interests,
  auth_completed_at, profile_completed_at, plan_selected, plan_billing_cycle,
  plan_selected_at, payment_completed_at, tenant_created_at, tour_started_at,
  tour_completed_at, tour_skipped, stripe_customer_id, stripe_subscription_id,
  checkin_emails_unsubscribed, email_verified, email_verified_at,
  email_verified_via, tenant_id, created_at, updated_at
)
SELECT
  id, groveauth_id, email, display_name, username, favorite_color, interests,
  auth_completed_at, profile_completed_at, plan_selected, plan_billing_cycle,
  plan_selected_at, payment_completed_at, tenant_created_at, tour_started_at,
  tour_completed_at, tour_skipped, stripe_customer_id, stripe_subscription_id,
  checkin_emails_unsubscribed, email_verified, email_verified_at,
  email_verified_via, tenant_id, created_at, updated_at
FROM user_onboarding;

-- Rebuild the dependent before dropping the backup (same fix as 107).
CREATE TABLE email_verifications_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_onboarding_new(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  verified_at INTEGER,
  attempts INTEGER DEFAULT 0
);
INSERT INTO email_verifications_new SELECT * FROM email_verifications;
DROP TABLE email_verifications;
ALTER TABLE email_verifications_new RENAME TO email_verifications;

DROP TABLE user_onboarding;
ALTER TABLE user_onboarding_new RENAME TO user_onboarding;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_onboarding_groveauth ON user_onboarding(groveauth_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_email ON user_onboarding(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);

PRAGMA foreign_keys = ON;
