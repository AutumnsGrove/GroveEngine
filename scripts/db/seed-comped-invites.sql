-- Seed: Comped Invites demo data
--
-- Local-dev-only sample rows for apps/landing's Wayfinder /arbor/comped-invites
-- page — a mix of pending/used comped invites, legacy "beta" invites (the
-- retired waitlist-promotion type, kept here so the historical filter/list
-- view has something real to show), and matching audit log entries.

-- Pending comped invites
INSERT INTO comped_invites (id, email, tier, invite_type, custom_message, invited_by, invite_token, created_at)
VALUES
  ('seed-comped-001', 'sage.wheeler@example.com', 'sapling', 'comped', 'Welcome to the grove, Sage!', 'autumn@grove.place', 'seed-token-comped-001', unixepoch() - 86400),
  ('seed-comped-002', 'juniper.reyes@example.com', 'seedling', 'comped', NULL, 'autumn@grove.place', 'seed-token-comped-002', unixepoch() - 43200);

-- Used comped invite (already claimed by an existing seeded tenant)
INSERT INTO comped_invites (id, email, tier, invite_type, custom_message, invited_by, invite_token, created_at, used_at, used_by_tenant_id, email_sent_at)
VALUES
  ('seed-comped-003', 'owner@driftwood-ink.grove.place', 'seedling', 'comped', 'Enjoy your free grove!', 'autumn@grove.place', 'seed-token-comped-003', unixepoch() - 604800, unixepoch() - 600000, 'example-tenant-002', unixepoch() - 604700);

-- Legacy pending "beta" invites — retired type, still visible/filterable/resendable
INSERT INTO comped_invites (id, email, tier, invite_type, custom_message, invited_by, invite_token, created_at, email_sent_at)
VALUES
  ('seed-beta-001', 'wren.castillo@example.com', 'seedling', 'beta', NULL, 'autumn@grove.place', 'seed-token-beta-001', unixepoch() - 5184000, unixepoch() - 5183900),
  ('seed-beta-002', 'ridley.moss@example.com', 'seedling', 'beta', 'Thanks for being an early tester', 'autumn@grove.place', 'seed-token-beta-002', unixepoch() - 5097600, NULL);

-- Legacy used "beta" invite
INSERT INTO comped_invites (id, email, tier, invite_type, custom_message, invited_by, invite_token, created_at, used_at, used_by_tenant_id, email_sent_at)
VALUES
  ('seed-beta-003', 'owner@quiet-orchard.grove.place', 'seedling', 'beta', NULL, 'autumn@grove.place', 'seed-token-beta-003', unixepoch() - 6912000, unixepoch() - 6900000, 'example-tenant-003', unixepoch() - 6911900);

-- Audit log entries
INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, actor_email, notes, created_at, invite_type)
VALUES
  ('seed-audit-001', 'create', 'seed-comped-001', 'sage.wheeler@example.com', 'sapling', 'autumn@grove.place', 'Welcome to the grove, Sage!', unixepoch() - 86400, 'comped'),
  ('seed-audit-002', 'create', 'seed-comped-002', 'juniper.reyes@example.com', 'seedling', 'autumn@grove.place', NULL, unixepoch() - 43200, 'comped'),
  ('seed-audit-003', 'create', 'seed-comped-003', 'owner@driftwood-ink.grove.place', 'seedling', 'autumn@grove.place', 'Enjoy your free grove!', unixepoch() - 604800, 'comped'),
  ('seed-audit-004', 'use', 'seed-comped-003', 'owner@driftwood-ink.grove.place', 'seedling', 'owner@driftwood-ink.grove.place', NULL, unixepoch() - 600000, 'comped'),
  ('seed-audit-005', 'create', 'seed-beta-001', 'wren.castillo@example.com', 'seedling', 'autumn@grove.place', NULL, unixepoch() - 5184000, 'beta'),
  ('seed-audit-006', 'create', 'seed-beta-002', 'ridley.moss@example.com', 'seedling', 'autumn@grove.place', 'Thanks for being an early tester', unixepoch() - 5097600, 'beta'),
  ('seed-audit-007', 'resend', 'seed-beta-002', 'ridley.moss@example.com', 'seedling', 'autumn@grove.place', 'Resent — original may have landed in spam', unixepoch() - 5011200, 'beta'),
  ('seed-audit-008', 'create', 'seed-beta-003', 'owner@quiet-orchard.grove.place', 'seedling', 'autumn@grove.place', NULL, unixepoch() - 6912000, 'beta'),
  ('seed-audit-009', 'use', 'seed-beta-003', 'owner@quiet-orchard.grove.place', 'seedling', 'owner@quiet-orchard.grove.place', NULL, unixepoch() - 6900000, 'beta'),
  -- A revoked invite that no longer has a live comped_invites row — shows the
  -- audit trail surviving past the invite's own deletion, same as production.
  ('seed-audit-010', 'revoke', 'seed-revoked-001', 'stale.invite@example.com', 'seedling', 'autumn@grove.place', 'Requested by mistake', unixepoch() - 1728000, 'comped');
