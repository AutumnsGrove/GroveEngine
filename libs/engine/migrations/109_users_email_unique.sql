-- Migration 109: Add UNIQUE constraint on users.email
-- Database: D1 (SQLite) - grove-engine-db
--
-- The original users table was created before migration 014 with email TEXT NOT NULL
-- but no UNIQUE constraint. Migration 107 added columns but couldn't retroactively
-- add constraints. The users upsert in tenant.ts uses ON CONFLICT(email) which
-- requires a unique index to function.

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email);
