-- Migration 115: Case-insensitive uniqueness guard on users.email (#1580 follow-up)
-- Database: D1 (SQLite) - grove-engine-db
--
-- idx_users_email_unique (migration 109) is a plain, case-SENSITIVE unique
-- index — "User@x.com" and "user@x.com" could coexist as two rows, each
-- potentially owning a different tenant (a duplicate account for the same
-- person). Investigation of prod confirmed this hasn't happened yet (every
-- stored email is already lowercase), but insert paths didn't normalize
-- case before this fix, so it was only a matter of time.
--
-- App-side inserts now normalize via normalizeEmail() before writing, so
-- this expression index is defense-in-depth: it enforces the invariant at
-- the database level even if a future insert path forgets to normalize.
--
-- Kept alongside (not replacing) idx_users_email_unique — the ON CONFLICT(email)
-- upsert in tenant.ts targets that plain index by exact column match, and
-- SQLite's UPSERT conflict-target resolution requires it to stay as-is.

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique_ci ON users(LOWER(email));
