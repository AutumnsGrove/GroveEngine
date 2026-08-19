-- Migration: Add 'wanderer' to platform_billing plan CHECK constraint
-- Description: Same root cause as migration 111 (tenants table) — platform_billing's
--   plan CHECK constraint also excluded 'wanderer', causing step 2 of createTenant()
--   to fail with SQLITE_CONSTRAINT_CHECK for every free signup attempt.
-- Date: 2026-04-18
--
-- STATUS AS OF 2026-08-19: never applied through this migration file.
--
-- Verified against production (2026-08-19): the CHECK constraint already
-- reads `plan IN ('free', 'wanderer', 'seedling', 'sapling', 'oak',
-- 'evergreen')` — someone applied the fix by hand, directly against
-- production, outside the tracked migration history (same pattern as
-- migration 111). This file is now a documented no-op so `d1_migrations`
-- can mark it applied and the tracked history matches reality.
--
-- Unlike 111, `platform_billing` has zero dependent tables, so the original
-- rename-and-recreate approach above would likely have worked fine even
-- under D1's transaction-wrapped migration execution — it just never ran.

SELECT 1;
