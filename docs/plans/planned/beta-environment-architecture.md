---
title: "Beta Environment — Shared-Data Staging for Aspen"
status: planned
category: general
lastUpdated: "2026-08-19"
---

# Beta Environment — Shared-Data Staging for Aspen

> Not a copy of the grove. A second door into the same one.

## Why

Every push to `main` deploys straight to production, for all 11 apps, immediately. There is no way for Autumn — or Arturo, the main beta tester — to see a real change against real Cloudflare infrastructure (Durable Objects, D1, routing) before every Wanderer sees it too. When something breaks, it breaks in front of everyone.

This isn't a new problem. An SST migration plan from December 2025 (`_archived/docs/sst-migration-plan-archived-2026-01-05.md`) identified it explicitly — *"Staging Environment: Yes! Everything has been going straight to production"* — and proposed a classic isolated-staging-database approach (separate D1/KV/R2 per stage, PR preview URLs). It was marked "ready for implementation" and abandoned roughly two weeks later, around the point the broader project became unmanageable. A second breadcrumb from the same era sits unused in `apps/aspen/src/hooks.server.ts`: `staging: null, // Staging environment flag` in the `RESERVED_SUBDOMAINS` map — the idea surfaced again and stalled a second time.

## The model

Rather than isolating data, this design isolates **code and deployment only**. Beta is a second deployment of the same Aspen Worker, reachable at `beta.<tenant>.grove.place`, sharing the exact same `grove-engine-db` D1 database, KV namespaces, and R2 buckets as production.

```
main branch  → grove-aspen        → autumn.grove.place
beta branch  → grove-aspen-beta   → beta.autumn.grove.place
                       │                      │
                       └──────────┬───────────┘
                                  ▼
                    same grove-engine-db / KV / R2
```

A post written in beta is a row in the same table the public site reads. No sync, no mirroring, no replication lag, no drift — because there's nothing to keep in sync. If beta breaks, `git revert` and redeploy; daily D1 backups (via Clearing) are the last-resort undo.

## Why not Grafts/Greenhouse for this

Grafts (`docs/specs/grafts-spec.md`) answer *"should this tenant see this feature"* — a per-request database check. Beta answers *"which deployment am I talking to"* — decided once, at the routing layer, before any tenant lookup happens. These are different axes, and conflating them is exactly what made Grafts confusing in the first place: the term has historically covered three different things at once — a feature-flag mechanism (`feature_flags` table + `isFlagEnabled()`), a component-naming convention (`PricingGraft.svelte`, no toggle logic of its own), and a tenant allowlist (`greenhouse_tenants`). Beta doesn't need any of them to exist. Grafts remain useful *later*, for graduating a proven beta feature to a percentage of tenants on main — but the beta split itself has no dependency on the feature-flag system.

## Routing

Confirmed by reading the current config: Cloudflare's existing wildcard route (`*.grove.place/*` in `services/grove-router/wrangler.toml`) already catches multi-label hosts like `beta.autumn.grove.place` — DNS/Cloudflare wildcards match all descendant labels below the owner name, not just one level, as long as no more specific record exists (tenants aren't individually registered in DNS; lookup happens in D1). **No new DNS record or Cloudflare route is needed.** Two application-level changes are required:

- **`services/grove-router/src/index.ts`** — add a second service binding (`ASPEN_BETA` → new `grove-aspen-beta` Worker) alongside the existing `ASPEN` binding (`services/grove-router/wrangler.toml`, the `[[services]]` block around line 59). Detect a leading `beta.` label on the hostname and dispatch there instead of the current `DEFAULT_TARGET`, forwarding the *rest* of the host (e.g. `autumn.grove.place`) via `X-Forwarded-Host` unchanged. Also add `"beta"` to the reserved-subdomain set so no tenant can ever register it — the same treatment `www`/`admin`/`arbor` already get.
- **`apps/aspen/src/hooks.server.ts`** — `extractSubdomain()` currently reads only `parts[0]` of the hostname. It needs to detect a leading `beta` label, strip it, treat the next label as the real tenant, and set a beta-mode flag on `locals` for the rest of the request. This is the real implementation of the `staging: null` placeholder that's been sitting unused in `RESERVED_SUBDOMAINS`.

## Deployment

`services/amber/wrangler.toml` already has a working precedent: an `[env.staging]` block that inherits the top-level `d1_databases`/`r2_buckets` declarations and only overrides `name`, `routes`, and `vars`. Aspen's `wrangler.toml` gets a matching `[env.beta]` block:

```toml
[env.beta]
name = "grove-aspen-beta"
# no routes block needed — grove-router dispatches via service binding,
# aspen itself owns no direct Cloudflare route today
```

Deploy trigger: a new `.github/workflows/deploy-aspen-beta.yml`, identical to `deploy-aspen.yml` (same path filters — `apps/aspen/**` plus every lib it imports) but `branches: [beta]` instead of `[main]`. The shared reusable workflow, `.github/workflows/_deploy-worker.yml`, needs a new input (e.g. `deploy-env`) threaded into the `wrangler deploy` invocation as `--env beta`. Its auto-open/close failure-tracking issue logic is currently keyed on the `worker-dir` basename (`aspen`) — a beta deploy sharing that same `worker-dir` would collide with prod's tracking issue unless given a distinct key.

## Schema for beta-only features

New tables or nullable columns land directly in `grove-engine-db` via normal sequential migrations (`libs/engine/migrations/NNN_description.sql`), matching the existing `-- Migration: / -- Description: / -- Date: / -- Context:` header convention (see `111_tenants_plan_add_wanderer.sql`). A plain `ALTER TABLE ADD COLUMN` is sufficient where no `CHECK` constraint is involved; SQLite's inability to `ALTER` a `CHECK` constraint means the create-new/copy/swap/reindex dance (also demonstrated in `111_...`) is only needed if a constraint itself changes. Main's code simply never reads beta-only columns — visibility is enforced by which deployment's code path runs, not by a flag hiding the data.

## Local dev

`pnpm dev:wrangler` in the engine already runs on fully local, isolated Miniflare-backed D1/KV/R2 (documented in `SETUP.md`) — this already satisfies "local dev should be pure local data, no risk to anything real." What's missing is a small seed script so a fresh local DB isn't empty. For the rarer case of wanting local dev to see real data, `wrangler dev --remote` (or `--x-remote-bindings`) already exists as a built-in escape hatch — no new tooling required.

## Out of scope for the first pass

- Only Aspen gets a beta deployment. Arbor's admin routes already live inside Aspen (`apps/aspen/src/routes/arbor/`), so this covers both the editor and the admin panel in one pass — no separate deployment needed for Arbor.
- No other app (landing, plant, billing, etc.) gets this treatment yet. Prove the pattern once before repeating it.
- `SETUP.md`'s stale project-structure list (missing `apps/aspen` and `apps/billing` entirely) is a real, separate small fix — noted here so it isn't lost, not bundled into this work.

## Unblocks

- [#1575](https://github.com/AutumnsGrove/Lattice/issues/1575) — the writing-prompts Curio, parked specifically because there was nowhere safe to test it first.
