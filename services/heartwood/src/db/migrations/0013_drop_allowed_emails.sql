-- Migration 0013: Drop allowed_emails table
-- Database: D1 (SQLite) - groveauth
--
-- Public signup is permanently enabled (PUBLIC_SIGNUP_ENABLED = "true").
-- The isEmailAllowed() function and all code references have been removed.
-- This migration drops the now-unused table.

DROP TABLE IF EXISTS allowed_emails;
