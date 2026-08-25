-- Seed script for Driftwood & Ink, second example tenant for local
-- cross-account testing (Lantern friends, Reeds comments) — see #1581.
-- Local-only: unlike Midnight Bloom (whose tenants row lives in migration
-- 010, applied to production too), this tenant is created entirely here,
-- run with --local only from scripts/dev-stack.sh. Never migrated to prod.
--
-- Run with: wrangler d1 execute grove-engine-db --local -c apps/aspen/wrangler.toml --file scripts/db/seed-tenant-002.sql

-- ============================================================
-- TENANT
-- ============================================================
INSERT INTO tenants (id, subdomain, display_name, email, plan, theme, accent_color, active, post_count, created_at, updated_at)
VALUES (
  'example-tenant-002',
  'driftwood-ink',
  'Driftwood & Ink',
  'owner@driftwood-ink.grove.place',
  'seedling',
  'default',
  '#4A6670',
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
-- USER (owner) — matches the shape apps/plant/src/lib/server/tenant.ts
-- step 4b creates for a real signup, so hooks.server.ts's demo-mode
-- lookup (SELECT id FROM users WHERE tenant_id = ?) finds a real,
-- stable identity instead of falling back to a synthetic id.
-- ============================================================
INSERT INTO users (id, groveauth_id, email, display_name, tenant_id, is_active, created_at, updated_at)
VALUES (
  'demo-user-driftwood-ink',
  'demo-groveauth-driftwood-ink',
  'owner@driftwood-ink.grove.place',
  'Driftwood & Ink',
  'example-tenant-002',
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
  ('example-tenant-002', 'site_title', 'Driftwood & Ink', unixepoch()),
  ('example-tenant-002', 'site_description', 'A secondhand bookshop and letterpress on the harbor road', unixepoch()),
  ('example-tenant-002', 'accent_color', '#4A6670', unixepoch()),
  ('example-tenant-002', 'font_family', 'literata', unixepoch())
ON CONFLICT(tenant_id, setting_key) DO UPDATE SET
  setting_value = excluded.setting_value,
  updated_at = unixepoch();

-- ============================================================
-- HOME PAGE
-- ============================================================
INSERT INTO pages (id, tenant_id, slug, title, type, markdown_content, hero, updated_at, created_at)
VALUES (
  'tenant-002-page-home',
  'example-tenant-002',
  'home',
  'Driftwood & Ink',
  'home',
  '# Driftwood & Ink

We sell books that have already lived a life before this one — dog-eared, underlined, someone else''s coffee ring on the back cover. Half the shop is secondhand paperbacks; the other half is a letterpress in the back room, still inked up from whatever broadside we printed last.

## What We Keep on the Shelves

Nothing sorted by genre. We shelve by mood: books for grey afternoons, books for the first sun of spring, books you read once and immediately hand to someone else. Ask at the counter if you can''t find your mood — we usually know where it lives.

## The Press

Every few weeks we set a poem or a stray sentence someone said out loud in the shop, and print a run of twenty. Most go up on the community board out front, free to take. A few end up pressed into the books we sell, found later by whoever buys them.

*Come in from the wind. Stay as long as the tide lets you.*',
  '{"title": "Driftwood & Ink", "subtitle": "Secondhand books, freshly pressed words", "cta": {"text": "Read the Blog", "link": "/garden"}}',
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
  'tenant-002-page-about',
  'example-tenant-002',
  'about',
  'About',
  'about',
  '# About the Shop

Driftwood & Ink started as a stall at the harbor market — a card table, a few boxes of paperbacks, and a hand-crank press salvaged from a print shop that closed in the nineties. Ten years later we have four walls, but the card-table spirit never quite left.

We don''t chase first editions or rare finds. We chase the books people actually want to reread — the ones with a crease in the spine from being carried around too long. If a book comes in loved, it stays loved on our shelves.

*Open most days, closed when the tide''s wrong for deliveries.*',
  unixepoch()
)
ON CONFLICT(tenant_id, slug) DO UPDATE SET
  title = excluded.title,
  markdown_content = excluded.markdown_content,
  updated_at = unixepoch();

-- ============================================================
-- POSTS
-- ============================================================
DELETE FROM posts WHERE tenant_id = 'example-tenant-002';

INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, published_at, created_at, updated_at)
VALUES (
  'tenant-002-post-margins',
  'example-tenant-002',
  'what-we-find-in-the-margins',
  'What We Find in the Margins',
  'On the notes strangers leave behind in secondhand books',
  'Every secondhand book is two books: the one the author wrote, and the one built out of whatever the last owner left behind. A grocery list used as a bookmark. A single word circled in pencil, no explanation. Once, an entire pressed flower, still faintly purple after who knows how many years.

We''ve started keeping a jar by the register for anything that falls out of a book we''re shelving. It''s mostly receipts and ticket stubs. Once it was a handwritten recipe for lemon cake, no name attached. We made it. It was good.

We like to think whoever left these things wouldn''t mind us finding them. Books get passed on; so, apparently, does whatever''s tucked inside them.',
  '["books", "secondhand", "small-things"]',
  'published',
  unixepoch() - 86400 * 30,
  unixepoch() - 86400 * 30,
  unixepoch()
);

INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, published_at, created_at, updated_at)
VALUES (
  'tenant-002-post-press',
  'example-tenant-002',
  'the-press-runs-slow-on-purpose',
  'The Press Runs Slow on Purpose',
  'Why we still hand-set type for twenty copies of something nobody asked for',
  'A run of twenty broadsides takes an entire afternoon on the hand press — setting type letter by letter, inking the plate, cranking it through, one sheet at a time. A laser printer could do the same job in about four seconds.

We know. We''ve been told. We keep doing it the slow way anyway.

There''s something about watching the words arrive one sheet at a time that makes you actually read them, instead of just glancing past on your way somewhere else. By sheet twelve you''ve read the poem more times than you meant to. By sheet twenty you might even know it by heart.

That''s the whole point, honestly. Slow isn''t a limitation of the press. It''s the reason we still have one.',
  '["letterpress", "craft", "slow-work"]',
  'published',
  unixepoch() - 86400 * 18,
  unixepoch() - 86400 * 18,
  unixepoch()
);

INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, tags, status, published_at, created_at, updated_at)
VALUES (
  'tenant-002-post-tide',
  'example-tenant-002',
  'closing-up-when-the-tide-says-so',
  'Closing Up When the Tide Says So',
  'A shop schedule set by the harbor, not the clock',
  'We don''t have posted hours. We have the tide chart taped inside the front door, and a chalkboard sign that says either "open" or "back after the tide turns."

Deliveries come in by boat twice a week, and the harbor road floods at high water regardless of what our hours say we should be doing. So we stopped fighting it. Customers who''ve been coming long enough just check the tide chart before they check us.

It sounds impractical. Mostly it is. But there''s a kind of honesty in a shop that admits the water is in charge, not us.',
  '["harbor-life", "small-business", "tides"]',
  'published',
  unixepoch() - 86400 * 6,
  unixepoch() - 86400 * 6,
  unixepoch()
);

-- ============================================================
-- UPDATE TENANT POST COUNT
-- ============================================================
UPDATE tenants SET post_count = 3 WHERE id = 'example-tenant-002';
