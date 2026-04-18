-- Migration 108: Remove dead columns from user_onboarding
-- Database: D1 (SQLite) - grove-engine-db
--
-- Drops 10 unused columns using the rename-and-recreate pattern
-- required by SQLite (no ALTER TABLE DROP COLUMN support).
--
-- Dropped columns:
--   stripe_checkout_session_id  (never read/written; other 2 Stripe cols ARE live)
--   checklist_dismissed         (never read/written)
--   first_post_at               (never read/written)
--   first_vine_at               (never read/written)
--   theme_customized_at         (never read/written)
--   welcome_email_sent          (deprecated email worker)
--   day1_email_sent             (deprecated email worker)
--   day3_email_sent             (deprecated email worker)
--   day7_email_sent             (deprecated email worker)
--   day30_email_sent            (deprecated email worker)
--
-- IMPORTANT: email_verifications has FK ON DELETE CASCADE to user_onboarding.id
-- We must handle it during table recreation.

PRAGMA foreign_keys = OFF;

-- =============================================================================
-- STEP 1: Rename current tables
-- =============================================================================

ALTER TABLE email_verifications RENAME TO _email_verifications_backup;
ALTER TABLE user_onboarding RENAME TO _user_onboarding_backup;

-- =============================================================================
-- STEP 2: Create new user_onboarding without dead columns (36 → 26)
-- =============================================================================

CREATE TABLE user_onboarding (
  id TEXT PRIMARY KEY,
  groveauth_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,

  -- Profile
  display_name TEXT,
  username TEXT UNIQUE,
  favorite_color TEXT,
  interests TEXT DEFAULT '[]',

  -- Onboarding progress
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

  -- Billing (actively written by billing webhook)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Email preferences
  checkin_emails_unsubscribed INTEGER DEFAULT 0,

  -- Email verification
  email_verified INTEGER DEFAULT 0,
  email_verified_at INTEGER,
  email_verified_via TEXT,

  -- Tenant link
  tenant_id TEXT,

  -- Timestamps
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- =============================================================================
-- STEP 3: Copy data from backup
-- =============================================================================

INSERT INTO user_onboarding (
  id, groveauth_id, email,
  display_name, username, favorite_color, interests,
  auth_completed_at, profile_completed_at, plan_selected,
  plan_billing_cycle, plan_selected_at, payment_completed_at,
  tenant_created_at, tour_started_at, tour_completed_at, tour_skipped,
  stripe_customer_id, stripe_subscription_id,
  checkin_emails_unsubscribed,
  email_verified, email_verified_at, email_verified_via,
  tenant_id, created_at, updated_at
)
SELECT
  id, groveauth_id, email,
  display_name, username, favorite_color, interests,
  auth_completed_at, profile_completed_at, plan_selected,
  plan_billing_cycle, plan_selected_at, payment_completed_at,
  tenant_created_at, tour_started_at, tour_completed_at, tour_skipped,
  stripe_customer_id, stripe_subscription_id,
  checkin_emails_unsubscribed,
  email_verified, email_verified_at, email_verified_via,
  tenant_id, created_at, updated_at
FROM _user_onboarding_backup;

-- =============================================================================
-- STEP 4: Recreate email_verifications with FK to new table
-- =============================================================================

CREATE TABLE email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_onboarding(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  verified_at INTEGER,
  attempts INTEGER DEFAULT 0
);

INSERT INTO email_verifications (id, user_id, email, code, created_at, expires_at, verified_at, attempts)
SELECT id, user_id, email, code, created_at, expires_at, verified_at, attempts
FROM _email_verifications_backup;

-- =============================================================================
-- STEP 5: Drop backups
-- =============================================================================

DROP TABLE _email_verifications_backup;
DROP TABLE _user_onboarding_backup;

-- =============================================================================
-- STEP 6: Recreate indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_onboarding_groveauth ON user_onboarding(groveauth_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_username ON user_onboarding(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_email ON user_onboarding(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON user_onboarding(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_stripe_customer ON user_onboarding(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);

PRAGMA foreign_keys = ON;
