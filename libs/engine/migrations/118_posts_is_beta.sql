-- 118_posts_is_beta.sql
-- Beta authorship tracking (issue #1585)
-- Records whether a post was created through the beta deployment
-- (<tenant>-beta.grove.place) vs. the regular one, so Wayfinders can see
-- beta usage on landing's /arbor admin pages.
--
-- Nullable INTEGER (0/1) defaulting to 0: forward-looking only, no backfill
-- for existing rows.

ALTER TABLE posts ADD COLUMN is_beta INTEGER DEFAULT 0;
