-- Great Grove Refactor Phase 2: Auth Simplification
-- Mark passkey and magic link tables as deprecated.
-- Grove now uses Google OAuth exclusively.
--
-- ba_passkey: 30-day retention window, then DROP (scheduled ~2026-06-06)
-- ba_verification: safe to DROP immediately (ephemeral tokens, no user data)
--
-- This migration is a no-op — it exists to document the deprecation decision
-- in the migration timeline. The actual DROP will be a separate migration
-- after the retention window.

-- No-op: tables are deprecated but not yet dropped.
-- See docs/REFACTOR.md Phase 2 for context.
SELECT 1;
