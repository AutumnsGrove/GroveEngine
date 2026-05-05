-- ============================================================================
-- GREAT GROVE REFACTOR — Flag Updates
-- ============================================================================
-- Promotes Lantern and Reeds from greenhouse to production.
-- Disables junk-drawered feature flags.
-- ============================================================================

-- PROMOTE: Lantern (grove discovery) — available to all tenants
UPDATE feature_flags SET greenhouse_only = 0 WHERE id = 'lantern_enabled';

-- PROMOTE: Reeds (comments) — available to all tenants
UPDATE feature_flags SET greenhouse_only = 0 WHERE id = 'reeds_comments';

-- DISABLE: Junk-drawered features
UPDATE feature_flags SET enabled = 0 WHERE id = 'wisp_enabled';
UPDATE feature_flags SET enabled = 0 WHERE id = 'fireside_mode';
UPDATE feature_flags SET enabled = 0 WHERE id = 'scribe_mode';
UPDATE feature_flags SET enabled = 0 WHERE id = 'chirp_enabled';
UPDATE feature_flags SET enabled = 0 WHERE id = 'reverie_enabled';
UPDATE feature_flags SET enabled = 0 WHERE id = 'meadow_access';
