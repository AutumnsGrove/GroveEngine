-- Seed script for The Quiet Orchard, third example tenant for local
-- cross-account testing (Lantern friends, Reeds comments) — see #1581.
-- Local-only: like seed-tenant-002.sql, this tenant is created entirely
-- here, run with --local only from scripts/dev-stack.sh. Never migrated
-- to prod.
--
-- Run with: wrangler d1 execute grove-engine-db --local -c apps/aspen/wrangler.toml --file scripts/db/seed-tenant-003.sql

-- ============================================================
-- TENANT
-- ============================================================
INSERT INTO tenants (id, subdomain, display_name, email, plan, theme, accent_color, active, post_count, created_at, updated_at)
VALUES (
  'example-tenant-003',
  'quiet-orchard',
  'The Quiet Orchard',
  'owner@quiet-orchard.grove.place',
  'seedling',
  'default',
  '#8A9A5B',
  1,
  0,
  unixepoch(),
  unixepoch()
)
ON CONFLICT(id) DO UPDATE SET
  subdomain = excluded.subdomain,
  display_name = excluded.display_name,
  email = excluded.email,
  updated_at = unixepoch();

-- ============================================================
-- USER (owner) — see seed-tenant-002.sql for why this row exists
-- (hooks.server.ts's demo-mode lookup wants a real users row, not the
-- synthetic-id fallback).
-- ============================================================
INSERT INTO users (id, groveauth_id, email, display_name, tenant_id, is_active, created_at, updated_at)
VALUES (
  'demo-user-quiet-orchard',
  'demo-groveauth-quiet-orchard',
  'owner@quiet-orchard.grove.place',
  'The Quiet Orchard',
  'example-tenant-003',
  1,
  datetime('now'),
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  tenant_id = excluded.tenant_id,
  updated_at = datetime('now');

-- ============================================================
-- SITE SETTINGS
-- ============================================================
INSERT INTO site_settings (tenant_id, setting_key, setting_value, updated_at)
VALUES
  ('example-tenant-003', 'site_title', 'The Quiet Orchard', unixepoch()),
  ('example-tenant-003', 'site_description', 'A small orchard journal — what''s ripening, what''s worth waiting for', unixepoch()),
  ('example-tenant-003', 'accent_color', '#8A9A5B', unixepoch()),
  ('example-tenant-003', 'font_family', 'lexend', unixepoch())
ON CONFLICT(tenant_id, setting_key) DO UPDATE SET
  setting_value = excluded.setting_value,
  updated_at = unixepoch();

-- ============================================================
-- HOME PAGE
-- ============================================================
INSERT INTO pages (id, tenant_id, slug, title, type, markdown_content, hero, updated_at, created_at)
VALUES (
  'tenant-003-page-home',
  'example-tenant-003',
  'home',
  'The Quiet Orchard',
  'home',
  '# The Quiet Orchard

Six rows of apple trees, two of pears, and a stand of quince nobody remembers planting. Not a farm, not really a business — more of a long-running argument with the weather that I keep losing and keep enjoying.

## What This Is

Mostly this is a record of what''s actually happening out here, season by season, instead of the tidy version. Which trees sulked this year. Which ones surprised me. What finally worked after three years of not working.

## Why "Quiet"

Because an orchard doesn''t rush for anyone. You plant a tree and then you wait — sometimes years — before it tells you whether it likes where you put it. Everything here runs on that kind of time.

*Come back after the frost. There''s usually something worth writing about.*',
  '{"title": "The Quiet Orchard", "subtitle": "Notes from six rows of trees and one stubborn quince", "cta": {"text": "Read the Journal", "link": "/garden"}}',
  unixepoch(),
  unixepoch()
)
ON CONFLICT(tenant_id, slug) DO UPDATE SET
  title = excluded.title,
  markdown_content = excluded.markdown_content,
  hero = excluded.hero,
  updated_at = unixepoch();

-- ============================================================
-- ABOUT PAGE
-- ============================================================
INSERT INTO pages (id, tenant_id, slug, title, type, markdown_content, updated_at)
VALUES (
  'tenant-003-page-about',
  'example-tenant-003',
  'about',
  'About',
  'about',
  '# About the Orchard

I inherited this land with the trees already on it — some planted by a grandfather I never met, some clearly volunteers that just showed up and stayed. I didn''t know an espalier from a rootstock when I started. I still don''t know everything, but the trees have been patient teachers.

This isn''t a commercial orchard. I sell what I can''t eat or give away at a folding table by the road, on the honor system, most weekends in season. The rest goes into more cider than any one person should reasonably make.

*If the gate''s open, so am I.*',
  unixepoch()
)
ON CONFLICT(tenant_id, slug) DO UPDATE SET
  title = excluded.title,
  markdown_content = excluded.markdown_content,
  updated_at = unixepoch();

-- ============================================================
-- POSTS
-- ============================================================
DELETE FROM posts WHERE tenant_id = 'example-tenant-003';

INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, published_at, created_at, updated_at)
VALUES (
  'tenant-003-post-quince',
  'example-tenant-003',
  'the-quince-nobody-planted',
  'The Quince Nobody Planted',
  'On the tree that showed up uninvited and outlasted everything I actually planned',
  'Nobody in the family remembers planting the quince tree by the north fence. It''s older than the orchard records I have, which only go back to my grandfather''s notebook, and even that just mentions it once: "quince — ask around." Nobody I''ve asked knows anything either.

It doesn''t produce much — a modest basket most years, gnarled and lumpy fruit that''s inedible raw and stubborn to cook. But it''s outlived two hard freezes that took out trees I babied for years, and it never once got the attention the "real" crop trees got.

I''ve stopped trying to figure out where it came from. Some things just decide to be part of a place, and the place lets them.',
  '["orchard-notes", "quince", "mystery-tree"]',
  'published',
  unixepoch() - 86400 * 25,
  unixepoch() - 86400 * 25,
  unixepoch()
);

INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, published_at, created_at, updated_at)
VALUES (
  'tenant-003-post-frost',
  'example-tenant-003',
  'reading-the-frost-wrong-three-years-running',
  'Reading the Frost Wrong, Three Years Running',
  'A small, honest accounting of guesses that did not pan out',
  'Three springs in a row I''ve covered the pear blossoms against a frost that never came, and left the apples exposed against one that did. I''d like to say I''ve learned the pattern by now. I have not.

What I''ve actually learned is less useful and more true: there isn''t a pattern, just a lot of variables I can''t see from the porch with a mug of coffee, guessing. The almanac helps. The old-timers'' advice helps a little more. Mostly I just plant more than I need and let the orchard sort out its own winners.

This year I covered everything. We''ll see.',
  '["orchard-notes", "frost", "lessons-the-hard-way"]',
  'published',
  unixepoch() - 86400 * 11,
  unixepoch() - 86400 * 11,
  unixepoch()
);

INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, published_at, created_at, updated_at)
VALUES (
  'tenant-003-post-cider',
  'example-tenant-003',
  'more-cider-than-any-reasonable-person-needs',
  'More Cider Than Any Reasonable Person Needs',
  'What happens when the harvest outpaces the fridge, every single year',
  'The math never works out. Every year I plan to eat more apples fresh, give more away, freeze more sauce — and every year I end up standing over the press by October with more fruit than sense, making cider I have nowhere to put.

The neighbors have started leaving jugs on my porch, unprompted, as a hint. I take the hint. Everyone gets cider whether they asked or not.

I could plant fewer trees. I''m not going to.',
  '["orchard-notes", "cider", "harvest"]',
  'published',
  unixepoch() - 86400 * 3,
  unixepoch() - 86400 * 3,
  unixepoch()
);

-- ============================================================
-- UPDATE TENANT POST COUNT
-- ============================================================
UPDATE tenants SET post_count = 3 WHERE id = 'example-tenant-003';
