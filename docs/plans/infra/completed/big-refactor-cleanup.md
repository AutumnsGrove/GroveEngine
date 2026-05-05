---
title: "The Big Refactor — Engine Reorganization & Codebase Cleanup"
description: "Aggressive cleanup of the 600K+ line monorepo: domain-based engine reorganization, dead code removal, data externalization, file decomposition, and concept simplification"
status: complete
category: infra
lastUpdated: "2026-03-28"
tags:
  - refactor
  - engine
  - architecture
  - cleanup
  - discoverability
---

# The Big Refactor

> **Status:** Complete (PR #1535, merged 2026-03-28)
> **Created:** 2026-03-27
> **Scope:** Reorganize libs/engine internally by domain, remove dead code and legacy systems, externalize hardcoded data, break down oversized files, simplify the grafts concept, and deduplicate utilities across the monorepo.
> **Priority:** Discoverability and scoped files above all else.
> **Builds on:** [Monorepo Restructure Plan](monorepo-restructure.md) (the apps/services/workers/libs split)

---

## Table of Contents

- [The Problem](#the-problem)
- [Design Principles](#design-principles)
- [Codebase Snapshot](#codebase-snapshot)
- [Phase 1: Dead Code & Legacy Cleanup](#phase-1-dead-code--legacy-cleanup)
- [Phase 2: Engine Domain Reorganization](#phase-2-engine-domain-reorganization)
- [Phase 3: Untangle the Grafts Concept](#phase-3-untangle-the-grafts-concept)
- [Phase 4: Data Externalization](#phase-4-data-externalization)
- [Phase 5: Break Down Oversized Files](#phase-5-break-down-oversized-files)
- [Phase 6: Config & Pattern Consolidation](#phase-6-config--pattern-consolidation)
- [Decisions](#decisions)
- [Out of Scope](#out-of-scope)
- [Validation & Rollback](#validation--rollback)

---

## The Problem

The monorepo has grown to 600K+ lines across 42 packages. While the top-level structure is sound (the apps/services/workers/libs split from the earlier restructure worked well), the **interior** of `libs/engine` — the core shared library at 226K lines — is a navigational nightmare. Files are flat, concerns are mixed, and concepts have become overloaded.

Day-to-day friction:
- **Can't find things.** Engine has 30+ top-level directories under `src/lib/` with no domain grouping. Utilities, components, server code, and data definitions all sit at the same level.
- **Duplicated code.** Date formatting exists in 3 places. `formatBytes()` in 4. Auth middleware reimplemented in 5+ services. Icons redefined across apps.
- **Dead code lingers.** Legacy auth client (1,179 lines, zero runtime imports), passed migration deadlines with fallback code still active, deprecated shims kept out of fear.
- **Overloaded concepts.** "Grafts" means three different things (UI modules, feature flags, greenhouse program). Finding the right system requires tribal knowledge.
- **Monolithic files.** 20+ Svelte components over 1,000 lines. Server routes at 800+ lines. A single Drizzle schema at 1,280 lines. These resist comprehension and make agents slow.
- **Hardcoded data.** Badges (1,268 lines), artifacts (1,264 lines), blocklists (854+ lines) are all TypeScript when they should be external data files.

---

## Design Principles

1. **One file, one purpose.** The pythonic ideal adapted for Svelte — a component shouldn't handle rendering, data fetching, state management, AND business logic. Break it up.
2. **Domain-scoped directories.** If you're working on curios, everything you need is in `curios/`. If you're working on auth, everything is in `auth/`. No treasure hunts.
3. **Deep imports over barrel exports.** Consumers import `@autumnsgrove/lattice/content/markdown`, not `@autumnsgrove/lattice` with a 500-line index.ts. This keeps the dependency graph honest.
4. **Code interprets data; code is not the data.** Badges, artifacts, blocklists, and other catalogs belong in JSON files. The TypeScript is the runtime that reads them, not the source of truth for their contents.
5. **Single Source of Truth (SSOT).** Every system has one canonical location. Prism for design tokens. Lumen for AI infrastructure. Infra SDK for cloud access. No duplicates, no "also defined in..."
6. **Lean over safe.** Remove deprecated code rather than shimming it. If it breaks, we fix the breakage — that's better than carrying dead weight indefinitely.
7. **Each phase is independently valuable.** You can stop after any phase and the codebase is better than before. No phase depends on completing a later phase.

---

## Codebase Snapshot

### Weight Distribution

```
APPS (177K lines, 11 apps)
  aspen ........... 80,888 lines | 65 routes  (main tenant platform)
  landing ......... 43,339 lines | 73 routes  (marketing + admin)
  domains ......... 10,915 lines |  7 routes  (domain management)
  plant ........... 10,501 lines | 11 routes  (onboarding)
  ivy .............  8,231 lines |  9 routes  (email client — isolated, future plans)
  meadow ..........  6,390 lines |  4 routes  (community feed)
  amber ...........  6,308 lines |  5 routes  (storage/media UI)
  clearing ........  5,434 lines |  2 routes  (status page)
  billing .........  2,726 lines |  5 routes  (billing UI)
  login ...........  2,665 lines |  2 routes  (shared auth hub)
  terrarium .......    342 lines |  1 route   (canvas tool — will grow)

LIBS (265K lines, 8 libs)
  engine ......... 226,796 lines  ← THE MONOLITH (85% of all lib code)
  foliage ........  17,243 lines  (theme customization — clean, no overlap with engine UI)
  infra ..........   5,665 lines  (Cloudflare SDK abstraction)
  gossamer .......   5,640 lines  (theme engine)
  prism ..........   3,714 lines  (design tokens SSOT — colors, icons)
  shutter ........   3,192 lines  (image processing)
  vineyard .......   2,211 lines  (showcase components)
  grove-agent ....     763 lines  (agent tooling)

SERVICES (72K lines, 10 services)
  heartwood ...... 36,244 lines  (auth — Better Auth + SessionDO)
  durable-objects  10,407 lines  (all DOs)
  forage .........  7,675 lines  (search/discovery)
  billing-api ....  7,635 lines  (Stripe)
  zephyr .........  5,567 lines  (email gateway)
  og-worker ......  2,372 lines  (OG images)
  amber ..........  2,173 lines  (storage API)
  pulse ..........  1,692 lines  (GitHub webhooks)
  grove-router ...  1,434 lines  (subdomain routing)
  email-render ...    235 lines  (email templates)

WORKERS (26K lines, 13 workers)
  timeline-sync ..  6,786 lines  (nightly timeline generation)
  warden .........  5,235 lines  (credential gateway)
  patina .........  4,586 lines  (storage tiering)
  loft ...........  3,035 lines  (dev environments)
  reverie ........  2,743 lines  (NLC config API)
  lumen ..........  2,558 lines  (AI inference gateway)
  reverie-exec ...  1,787 lines  (applies reverie changes)
  meadow-poller ..  1,272 lines  (RSS sync)
  post-migrator ..  1,061 lines  (data migration)
  onboarding .....    709 lines  (email sequences)
  email-catchup ..    626 lines  (weekly digest)
  webhook-cleanup     462 lines  (retention cron)
  vista-collector      67 lines  (metrics collection)
```

### Engine Internal Breakdown (226K lines)

```
libs/engine/src/lib/
  ui/ .............. 361 files | 28.3K lines  (components: primitives, nature, charts)
  server/ .......... 110 files | ~18K lines   (DB schema, observability, services)
  curios/ .......... 106 files | ~15K lines   (24 feature subsystems!)
  grafts/ ..........  64 files | ~11K lines   (overloaded concept — UI modules + flags)
  utils/ ...........  52 files | ~11K lines   (markdown, images, dates, everything)
  reverie/ .........  35 files |  ~6K lines   (NLC config schemas)
  lumen/ ...........  34 files |  ~6K lines   (AI inference/quota)
  threshold/ .......  24 files |  ~4K lines   (rate limiting DOs)
  feature-flags/ ...  19 files |  ~4K lines   (the actual flag system)
  config/ ..........  20 files |  ~4K lines   (tiers, blocklists, feature config)
  heartwood/ .......  12 files |  ~3K lines   (auth client — mostly legacy)
  + 20 more directories
```

### Key Metrics

| Metric | Value |
|--------|-------|
| Total source files | 2,657 |
| Largest Svelte component | 2,345 lines (images page) |
| Largest server route | 810 lines (comped-invites) |
| Largest utility file | 1,268 lines (badges index) |
| Components over 1,000 lines | 20+ |
| Duplicated utility functions | 12+ across 3-4 locations each |
| Dead auth code | ~3,000 lines (client + tests + deprecated exports) |
| Hardcoded data files | ~4,000+ lines convertible to JSON |

---

## Phase 1: Dead Code & Legacy Cleanup

> Safest phase. Pure deletion and deduplication. No structural changes.
> Estimated removal: ~5,000-7,000 lines

### 1a. Legacy Auth Removal

The auth audit confirmed: Better Auth + SessionDO is the active system. The old GroveAuthClient has **zero runtime imports**. The legacy session migration deadline (2026-03-01) has passed.

| Action | File(s) | Lines Removed |
|--------|---------|---------------|
| Delete GroveAuthClient class | `libs/engine/src/lib/heartwood/client.ts` | ~1,179 |
| Delete client tests | `libs/engine/src/lib/heartwood/client.test.ts` | ~1,805 |
| Remove legacy cookie fallback in aspen callback | `apps/aspen/src/routes/auth/callback/+server.ts` (lines ~91-97) | ~20 |
| Remove legacy cookie fallback in landing callback | `apps/landing/src/routes/auth/callback/+server.ts` (lines ~75-82) | ~20 |
| Remove dual cookie clearing in logout | `apps/aspen/src/routes/auth/logout/+server.ts` (line ~59) | ~10 |
| Remove legacy session fallback in heartwood device route | `services/heartwood/src/routes/device.ts` | ~20 |
| Remove deprecated cookie name constants | `libs/engine/src/lib/grafts/login/config.ts` (deprecated fields only) | ~30 |
| Remove `magicCodes` table from Drizzle schema | `libs/engine/src/lib/server/db/schema/engine.ts` | ~15 |
| Clean up heartwood index.ts exports | `libs/engine/src/lib/heartwood/index.ts` | ~10 |

**Pre-flight check:** Verify `0010_drop_legacy_auth_tables.sql` migration has been applied in prod before removing `magicCodes` from schema.

**Note on CLI OAuth:** Better Auth fully supports OAuth2 flows including PKCE. The heartwood *service* (`services/heartwood/`) stays — it's active. Only the old *client library* inside engine is being removed. Future CLI auth (e.g., `gw lattice login`) will use Better Auth's OAuth endpoints directly.

### 1b. Stale Aspen-Split Artifacts

These files were left behind when engine was split from a deployable app into a pure library.

| Action | File(s) | Notes |
|--------|---------|-------|
| Delete stale app files | `libs/engine/src/app.d.ts`, `libs/engine/src/app.html` | Split spec says "NO app.html. Pure library." These belong in apps/aspen now. |
| Verify engine wrangler.toml role | `libs/engine/wrangler.toml` | NOT stale — used for D1 migration config and service binding definitions. Keep but add comment clarifying it's not a deploy target. |

### 1c. Deprecated Shims & Re-exports

These exist as safety nets from incomplete migrations. All have known replacements. Migrate the few remaining consumers, then delete.

| Shim | File | Consumers | Replacement |
|------|------|-----------|-------------|
| `tier-features.ts` re-export | `libs/engine/src/lib/server/tier-features.ts` | 1 (`apps/aspen/src/routes/+layout.server.ts`) | Import from `$lib/config/tiers.js` directly |
| `rate-limits/` module | `libs/engine/src/lib/server/rate-limits/` (~130 lines) | Tests only | `$lib/threshold` module |
| `rate-limits/middleware.ts` | `libs/engine/src/lib/server/rate-limits/middleware.ts` | Tests only | `$lib/threshold/adapters/worker.js` |
| `hasCollectionData()` | `libs/engine/src/lib/server/observability/index.ts` (lines 87-96) | Tests only | `getCollectionStatus()` |
| Deprecated palette exports | `libs/engine/src/lib/ui/components/nature/palette.ts` | Check before removal | `springFoliage`, `wildflowers`, `springSky` (individual exports) |

**Process for each:** Grep for imports → migrate consumers → delete shim → verify build.

### 1d. Utility Deduplication

Each of these functions exists in multiple places. Keep the engine version (most robust), delete duplicates, update imports.

| Function | Engine (SSOT) | Duplicates to Delete |
|----------|---------------|----------------------|
| `formatDate()` family | `libs/engine/src/lib/utils/date.ts` | `apps/clearing/src/lib/utils/date.ts`, `apps/ivy/src/lib/utils/index.ts` |
| `formatBytes()` | `libs/engine/src/lib/utils/imageProcessor.ts` (extract to `format.ts`) | `workers/patina/src/lib/utils.ts`, `apps/landing/src/lib/utils/journey.ts`, `apps/amber/src/lib/server/storage.ts` |
| `generateId()` / `generateUUID()` | Create `libs/engine/src/lib/utils/id.ts` | `apps/clearing/src/lib/server/monitor/utils.ts`, `workers/patina/src/lib/utils.ts`, `apps/ivy/src/lib/utils/index.ts` |
| `sanitizeErrorMessage()` | Move to `libs/engine/src/lib/utils/errors.ts` | Scattered across billing-related code (audit exact locations before moving) |

**Note on Ivy:** Ivy was built in isolation and has the most duplication. For now, just update its imports to point at engine. A deeper Ivy cleanup is out of scope (future work).

### 1e. Component Deduplication

| Component | Engine (SSOT) | Duplicate |
|-----------|---------------|-----------|
| Icons | `libs/engine/src/lib/ui/components/icons/Icons.svelte` or `@autumnsgrove/prism/icons` | `apps/ivy/src/lib/components/Icons.svelte` (31 reimplemented inline SVGs) |
| Button | `libs/engine/src/lib/ui/components/ui/Button.svelte` (shadcn, 7 variants) | `apps/ivy/src/components/ui/Button.svelte` (standalone, 4 variants) |

**Ivy note:** Same as above — update imports to use engine/prism. Don't rewrite Ivy's internals.

---

## Phase 2: Engine Domain Reorganization

> Highest-impact phase for discoverability. Restructures libs/engine/src/lib/ from flat to domain-based.

### Current Structure

```
libs/engine/src/lib/
├── amber/              (amber integration)
├── blazes/             (notification/alert system)
├── components/         (mixed: admin, custom, editor, chrome)
│   ├── admin/          (MarkdownEditor, GutterManager — huge files)
│   ├── custom/         (user-facing custom components)
│   ├── editor/         (editor sub-components)
│   └── chrome/         (app chrome/shell)
├── config/             (tiers, blocklists, feature config)
├── curios/             (24 feature subsystems — badges, artifacts, timeline, guestbook, polls, shelves, shrines, nowplaying, pulse, etc.)
├── email/              (email types and helpers)
├── errors/             (GroveErrorDef, error catalog)
├── feature-flags/      (flag loading, cache, greenhouse)
├── grafts/             (OVERLOADED — login, pricing, upgrades, greenhouse, uploads)
├── heartwood/          (auth client — mostly legacy)
├── loom/               (async job system)
├── lumen/              (AI inference routing)
├── reverie/            (NLC config schemas)
├── sentinel/           (uptime monitoring)
├── server/             (db schema, services, middleware, observability, petal)
├── styles/             (tokens.css, content.css)
├── threshold/          (rate limiting via DOs)
├── types/              (shared type definitions)
├── ui/                 (361 files — components, stores, styles, vineyard)
│   ├── components/     (nature, ui, arbor, chrome, typography, content, forms, charts)
│   ├── stores/         (theme, sidebar, preferences)
│   ├── styles/         (content.css, more CSS)
│   └── vineyard/       (showcase components)
├── utils/              (52 files — markdown, images, dates, CSRF, validation, everything)
├── warden/             (credential resolution client)
└── [other small dirs]
```

**Problems visible from here:**
- `components/` AND `ui/components/` — two component directories
- `grafts/` containing UI modules alongside `feature-flags/` containing the actual flags
- `utils/` with 52 files spanning 5+ unrelated domains
- `styles/` at top level AND inside `ui/styles/`
- `server/` containing DB schema, observability, services, rate-limits, AND petal
- No domain grouping — auth, content, media, monitoring all at the same level

### Target Structure

```
libs/engine/src/lib/
├── auth/                    ← Authentication & authorization
│   ├── client.ts            (Better Auth integration helpers)
│   ├── session.ts           (session utilities)
│   ├── warden.ts            (credential resolution client, from warden/)
│   └── components/          (login UI — from grafts/login/)
│       ├── LoginGraft.svelte
│       ├── PasskeyButton.svelte
│       └── EmailButton.svelte
│
├── content/                 ← Content creation & rendering
│   ├── markdown/            (from utils/markdown.ts + markdown-directives.ts — split up)
│   │   ├── parser.ts
│   │   ├── directives.ts
│   │   ├── sanitizer.ts
│   │   └── index.ts
│   ├── editor/              (from components/admin/MarkdownEditor — decomposed)
│   │   ├── MarkdownEditor.svelte
│   │   ├── DraftManager.svelte
│   │   ├── ImagePicker.svelte
│   │   └── VoiceInput.svelte
│   ├── blooms/              (post/bloom management)
│   └── reeds/               (comments system)
│
├── curios/                  ← Curio feature modules (stays, already domain-scoped)
│   ├── badges/
│   ├── artifacts/
│   ├── timeline/
│   ├── guestbook/
│   ├── polls/
│   ├── shelves/
│   ├── shrines/
│   ├── nowplaying/
│   ├── pulse/
│   └── components/          (shared curio UI)
│
├── media/                   ← Image/file processing
│   ├── processing/          (from utils/imageProcessor.ts — split up)
│   ├── validation/          (from utils/upload-validation.ts — split up)
│   ├── uploads/             (from grafts/uploads/)
│   └── amber.ts             (amber integration, from amber/)
│
├── social/                  ← Community & interaction features
│   ├── hum/                 (reactions/engagement)
│   ├── wisp/                (messaging)
│   └── blazes/              (notifications, from blazes/)
│
├── platform/                ← Platform infrastructure
│   ├── config/              (from config/)
│   ├── tiers/               (tier definitions, billing helpers)
│   ├── feature-flags/       (from feature-flags/ — renamed from "grafts API")
│   ├── greenhouse/          (trusted-tester program UI, from grafts/greenhouse/)
│   ├── pricing/             (pricing components, from grafts/pricing/)
│   ├── upgrades/            (subscription UI, from grafts/upgrades/)
│   └── threshold/           (rate limiting, from threshold/)
│
├── monitoring/              ← Observability & health
│   ├── sentinel/            (from sentinel/)
│   ├── observability/       (from server/observability/)
│   └── vista/               (analytics)
│
├── ai/                      ← AI infrastructure
│   ├── lumen/               (from lumen/)
│   └── reverie/             (from reverie/)
│
├── ui/                      ← Shared UI components (stays, already organized)
│   ├── components/
│   │   ├── nature/          (forests, creatures — keep as-is, well-scoped)
│   │   ├── ui/              (shadcn wrappers, base components)
│   │   ├── arbor/           (admin/dashboard components)
│   │   ├── chrome/          (app shell)
│   │   ├── typography/
│   │   ├── forms/
│   │   └── charts/
│   ├── stores/
│   └── vineyard/            (showcase components)
│
├── server/                  ← Server-side infrastructure
│   ├── db/
│   │   ├── schema/          (SPLIT from single engine.ts — see Phase 5)
│   │   │   ├── auth.ts
│   │   │   ├── content.ts
│   │   │   ├── curios.ts
│   │   │   ├── billing.ts
│   │   │   ├── platform.ts
│   │   │   └── index.ts     (re-exports all for Drizzle)
│   │   ├── helpers.ts
│   │   └── types.ts
│   ├── services/            (domain service modules)
│   ├── middleware/
│   └── petal/               (moderation)
│
├── utils/                   ← ONLY truly generic utilities
│   ├── date.ts              (date formatting — SSOT)
│   ├── format.ts            (formatBytes, number formatting)
│   ├── id.ts                (generateId — SSOT)
│   ├── csrf.ts
│   ├── errors.ts            (sanitizeErrorMessage — SSOT)
│   ├── validation.ts
│   └── url.ts
│
├── data/                    ← External data files (JSON)
│   ├── badges.json
│   ├── artifacts.json
│   ├── domain-blocklist.json
│   └── offensive-blocklist.json
│
├── email/                   ← Email types and helpers (stays small)
├── loom/                    ← Async job system (stays)
├── errors/                  ← Error catalog (stays)
├── types/                   ← Shared types (stays)
└── styles/                  ← Global styles (consolidate ui/styles/ into here)
    ├── tokens.css
    └── content.css
```

### Migration Map

Every move, explicitly:

| From | To | Notes |
|------|----|-------|
| `heartwood/` | `auth/` | Delete legacy client.ts (Phase 1), keep session helpers |
| `warden/` | `auth/warden.ts` | Credential resolution client |
| `grafts/login/` components | `auth/components/` | LoginGraft, PasskeyButton, EmailButton |
| `grafts/login/config.ts` | `auth/config.ts` | Remove deprecated fields first (Phase 1) |
| `grafts/pricing/` | `platform/pricing/` | PricingGraft, PricingCard, PricingTable |
| `grafts/upgrades/` | `platform/upgrades/` | GardenStatus, GrowthCard |
| `grafts/greenhouse/` | `platform/greenhouse/` | GreenhouseStatusCard, CultivateFlagTable |
| `grafts/uploads/` | `media/uploads/` | UploadManagementPanel |
| `grafts/types.ts`, `registry.ts`, `context.svelte.ts` | `platform/` root or delete | Evaluate if registry pattern still needed |
| `feature-flags/` | `platform/feature-flags/` | Rename `grafts.ts` → `flags.ts` |
| `utils/markdown.ts` | `content/markdown/parser.ts` | Split up (1,091 lines) |
| `utils/markdown-directives.ts` | `content/markdown/directives.ts` | |
| `utils/imageProcessor.ts` | `media/processing/` | Split up |
| `utils/upload-validation.ts` | `media/validation/` | Split up (798 lines) |
| `utils/date.ts` | `utils/date.ts` | Stays — truly generic |
| `utils/csrf.ts` | `utils/csrf.ts` | Stays — truly generic |
| `utils/sanitize.ts` | `utils/errors.ts` or `utils/sanitize.ts` | Stays — truly generic |
| `components/admin/MarkdownEditor.svelte` | `content/editor/MarkdownEditor.svelte` | Decompose in Phase 5 |
| `components/admin/GutterManager.svelte` | `content/editor/GutterManager.svelte` | Decompose in Phase 5 |
| `components/custom/` | `ui/components/custom/` | Merge into ui |
| `components/chrome/` | `ui/components/chrome/` | Already a chrome dir in ui — merge |
| `amber/` | `media/amber.ts` | Small integration module |
| `blazes/` | `social/blazes/` | Notification system |
| `sentinel/` | `monitoring/sentinel/` | |
| `server/observability/` | `monitoring/observability/` | |
| `lumen/` | `ai/lumen/` | |
| `reverie/` | `ai/reverie/` | |
| `threshold/` | `platform/threshold/` | |
| `config/` | `platform/config/` | |
| `config/tiers.ts` | `platform/tiers/` | |
| `config/domain-blocklist.ts` | `data/domain-blocklist.json` + `platform/config/blocklist.ts` loader | Phase 4 |
| `config/offensive-blocklist.ts` | `data/offensive-blocklist.json` + `platform/config/blocklist.ts` loader | Phase 4 |
| `curios/badges/index.ts` | `data/badges.json` + `curios/badges/loader.ts` | Phase 4 |
| `curios/artifacts/index.ts` | `data/artifacts.json` + `curios/artifacts/loader.ts` | Phase 4 |
| `ui/styles/` | `styles/` | Consolidate into single styles directory |
| `server/db/schema/engine.ts` | `server/db/schema/*.ts` (split) | Phase 5 |

### Import Path Strategy

**Before:**
```typescript
import { formatDateFull } from '$lib/utils/date';
import { MarkdownEditor } from '$lib/components/admin/MarkdownEditor.svelte';
import { getEnabledGrafts } from '$lib/feature-flags/grafts';
import { PricingGraft } from '$lib/grafts/pricing';
```

**After:**
```typescript
import { formatDateFull } from '$lib/utils/date';
import { MarkdownEditor } from '$lib/content/editor/MarkdownEditor.svelte';
import { getEnabledFlags } from '$lib/platform/feature-flags/flags';
import { PricingGraft } from '$lib/platform/pricing';
```

**Migration approach:**
1. Move files to new locations
2. Create temporary re-export shims at old locations (one-liner: `export * from '../new/path'`)
3. Grep for all old import paths across entire monorepo
4. Update all imports to new paths
5. Delete re-export shims
6. Verify build

**Do NOT leave shims permanently.** They exist only during the migration window of this phase. The whole point is to stop accumulating compatibility layers.

---

## Phase 3: Untangle the Grafts Concept

> Simplifies the overloaded "grafts" term into clear, separate concepts.

### Current State

The word "graft" means three different things:

1. **"UI Grafts"** (`libs/engine/src/lib/grafts/`) — Reusable component modules: pricing tables, login forms, upgrade cards, upload panels. These are just regular components with a catchy name. They're always loaded, not flag-gated.

2. **"Feature Grafts"** (`libs/engine/src/lib/feature-flags/grafts.ts`) — Actual boolean feature flags (`fireside_mode`, `reeds_comments`, `chirp_enabled`, etc.) loaded once at layout level and cascaded to child pages. This is the real flag system.

3. **"Greenhouse Grafts"** — The trusted-tester program where greenhouse tenants can self-toggle experimental features. It's a subset of #2 with dedicated admin UI in `grafts/greenhouse/`.

All three are called "grafts" in code, comments, and types. The `GraftId` type in `grafts/types.ts` refers to UI slots. The `KnownGraftId` type in `feature-flags/grafts.ts` refers to feature flags. They're completely different systems.

### Target State

- **"Feature Flags"** = boolean toggles for experimental features. Lives in `platform/feature-flags/`. The API function is `getEnabledFlags()` (not `getEnabledGrafts()`). The type is `KnownFlagId` (not `KnownGraftId`).
- **"Greenhouse"** = the trusted-tester program that controls who sees experimental flags. UI lives in `platform/greenhouse/`.
- **UI modules** (pricing, login, upgrades, uploads) = just components. They live in their domain directories (`platform/pricing/`, `auth/components/`, `platform/upgrades/`, `media/uploads/`). No special "graft" abstraction needed.
- The word **"graft"** is retired from the codebase vocabulary, or reserved exclusively for user-facing "graft a feature onto your grove" language (if needed in the future).

### Migration Steps

1. Rename `feature-flags/grafts.ts` → `feature-flags/flags.ts`
2. Rename `KnownGraftId` → `KnownFlagId`, `getEnabledGrafts()` → `getEnabledFlags()`
3. Move UI modules to domain directories (handled in Phase 2 migration map)
4. Evaluate `grafts/types.ts` + `grafts/registry.ts` + `grafts/context.svelte.ts` — these define a "UI graft slot" system. If no consumers depend on the registry/slot pattern, delete. If they do, move to `platform/` with clearer naming.
5. Delete `grafts/` directory once empty
6. Update all `data.grafts.some_flag` references in routes to `data.flags.some_flag`
7. Update AGENT.md and any documentation referencing "grafts" to use "feature flags"

---

## Phase 4: Data Externalization

> Converts hardcoded data into JSON files. Some baked into binary, some synced to D1.

### Pipeline Pattern

The knowledge base already does this for landing. The pattern:

```
Markdown/JSON files in repo → Parse at deploy time → Upload to D1 via REST API → Query at runtime
```

**Existing implementation:** `apps/landing/scripts/kb-sync.ts`
- Scans `docs/` directories for `.md` files with YAML frontmatter
- Renders markdown to HTML, calculates SHA256 content hash
- Compares hash to D1 to detect changes (only upserts changed items)
- Soft-deletes removed items (marks as unpublished, doesn't drop rows)
- Triggered as `pre-deploy-command: "pnpm run kb:sync"` in `deploy-landing.yml`
- Uses Cloudflare D1 REST API with parameterized queries

**For the refactor:** Create a generic `data-sync.ts` that handles JSON files the same way. Each data type gets:
1. A JSON source file in `libs/engine/src/lib/data/`
2. A D1 migration creating the table
3. A sync script entry in `scripts/data-sync.ts`
4. A `pre-deploy-command` hook in the deploy workflow

### Candidates for D1 Sync

These are large, catalog-style data that benefits from D1 queryability:

| Data | Current File | Lines | JSON Structure |
|------|-------------|-------|----------------|
| Badges | `curios/badges/index.ts` | 1,268 | `{ id, name, description, icon, tier, category, criteria, ... }[]` |
| Artifacts | `curios/artifacts/index.ts` | 1,264 | `{ id, name, description, type, placement, discovery, rarity, ... }[]` |
| Domain blocklist | `config/domain-blocklist.ts` | 854 | `{ domain, reason, category }[]` |
| Offensive blocklist | `config/offensive-blocklist.ts` | 801 | `{ term, category, severity }[]` |

**After conversion:** Each gets a thin TypeScript loader (~20-30 lines) that queries D1 and returns typed results. The JSON file is the source of truth; D1 is the runtime cache.

### Candidates for Bake-In

These are static rendering data that should stay as JSON files loaded at build/import time (NOT synced to D1):

| Data | Current File | Lines | Reason to Bake |
|------|-------------|-------|----------------|
| Nature palette | `ui/components/nature/palette.ts` | 714 | Rendering data for 89 SVG components. Needs to be instant, no DB round-trip. Not user-configurable. |
| Prism tokens | `libs/prism/src/lib/tokens/` | ~500 | Design system SSOT. Build-time only. |
| Seasonal palettes | `libs/prism/src/lib/tokens/seasons.ts` | ~60 | Part of design system. |

**Note:** Nature palette and Prism are intentionally separate systems (confirmed by audit). Prism = UI design tokens. Nature palette = content rendering data for forest scenes. No consolidation needed.

### New Infrastructure Needed

1. **`scripts/data-sync.ts`** — Generic sync script modeled after `kb-sync.ts`. Accepts a `--dataset` flag to sync specific data types. Supports `--dry` for preview.

2. **D1 migrations** — One per data type:
   - `XXXX_badges_data.sql` — `data_badges` table
   - `XXXX_artifacts_data.sql` — `data_artifacts` table
   - `XXXX_blocklists.sql` — `data_domain_blocklist` + `data_offensive_blocklist` tables

3. **Thin loaders** — Replace 1,200-line TypeScript definitions with ~30-line query functions:
   ```typescript
   // curios/badges/loader.ts
   import type { Badge } from './types';
   export async function getBadges(db: D1Database): Promise<Badge[]> {
     return db.prepare('SELECT * FROM data_badges WHERE active = 1').all();
   }
   export async function getBadgeById(db: D1Database, id: string): Promise<Badge | null> {
     return db.prepare('SELECT * FROM data_badges WHERE id = ?').bind(id).first();
   }
   ```

4. **Deploy workflow hook** — Add `pre-deploy-command: "pnpm run data:sync"` to relevant deploy workflows (at minimum `deploy-aspen.yml` since aspen uses badges/artifacts).

---

## Phase 5: Break Down Oversized Files

> Decomposes monolithic Svelte components and server files into scoped sub-files.

### Svelte Components (>1,000 lines)

Break these into sub-components. The parent file becomes an orchestrator that imports and composes children.

| File | Lines | Decomposition Strategy |
|------|-------|------------------------|
| `apps/aspen/src/routes/arbor/images/+page.svelte` | 2,345 | → `ImageGallery.svelte`, `ImageUploadForm.svelte`, `ImageProcessingPanel.svelte`, `ImageCropDialog.svelte` |
| `libs/engine/src/lib/components/admin/MarkdownEditor.svelte` | 2,280 | → `EditorCore.svelte`, `DraftManager.svelte`, `ImagePicker.svelte`, `VoiceInput.svelte`, `AIAssistPanel.svelte` |
| `apps/domains/src/routes/arbor/searcher/+page.svelte` | 2,060 | → `SearchForm.svelte`, `SearchResults.svelte`, `SearchFilters.svelte`, `DomainCard.svelte` |
| `libs/foliage/src/lib/components/ModerationQueue.svelte` | 2,020 | → `QueueList.svelte`, `QueueItem.svelte`, `QueueActions.svelte`, `QueueFilters.svelte` |
| `apps/landing/src/routes/workshop/+page.svelte` | 1,709 | → Section components per workshop step |
| `libs/engine/src/lib/components/admin/GutterManager.svelte` | 1,644 | → `GutterPanel.svelte`, `GutterItem.svelte`, `GutterDragHandle.svelte` |
| `apps/aspen/src/routes/arbor/curios/timeline/+page.svelte` | 1,635 | → `TimelineList.svelte`, `TimelineEntry.svelte`, `TimelineControls.svelte` |
| `apps/landing/src/routes/credits/+page.svelte` | 1,543 | → `CreditsSection.svelte`, `CreditCard.svelte`, `CreditsFilter.svelte` |
| `apps/landing/src/routes/vineyard/+page.svelte` | 1,448 | → Vineyard section components |
| `apps/aspen/src/routes/arbor/garden/edit/[slug]/+page.svelte` | 1,346 | → `GardenForm.svelte`, `GardenPreview.svelte`, section editors |
| `apps/aspen/src/routes/vineyard/+page.svelte` | 1,305 | → Vineyard section components |
| `apps/aspen/src/routes/arbor/curios/guestbook/+page.svelte` | 1,191 | → `GuestbookList.svelte`, `GuestbookEntry.svelte`, `GuestbookForm.svelte` |
| `libs/engine/src/lib/curios/components/CurioShelves.svelte` | 1,158 | → `ShelfRow.svelte`, `ShelfItem.svelte`, `ShelfControls.svelte` |
| `libs/engine/src/lib/components/WispPanel.svelte` | 1,146 | → `WispMessage.svelte`, `WispInput.svelte`, `WispHistory.svelte` |
| `apps/ivy/src/routes/(app)/settings/+page.svelte` | 1,088 | → Tab components per settings section |
| `apps/aspen/src/routes/arbor/reeds/+page.svelte` | 1,058 | → `ReedsList.svelte`, `ReedItem.svelte`, `ReedsControls.svelte` |
| `libs/foliage/src/lib/components/CommunityThemeSubmit.svelte` | 1,031 | → `ThemeForm.svelte`, `ThemePreviewPanel.svelte`, `ThemeValidation.svelte` |
| `libs/foliage/src/lib/components/FontUploader.svelte` | 1,004 | → `FontDropzone.svelte`, `FontPreview.svelte`, `FontValidation.svelte` |

**Pattern:** Each decomposed component gets a co-located directory:
```
arbor/images/
  +page.svelte              (orchestrator — imports children, passes data)
  +page.server.ts           (data loading — stays here)
  ImageGallery.svelte
  ImageUploadForm.svelte
  ImageProcessingPanel.svelte
  ImageCropDialog.svelte
```

### Server Route Files (>500 lines)

Extract business logic into importable modules. The `+page.server.ts` / `+server.ts` becomes a thin routing layer.

| File | Lines | Extraction Strategy |
|------|-------|---------------------|
| `apps/landing/src/routes/arbor/comped-invites/+page.server.ts` | 810 | → `comped-invites/invite-service.ts` (CRUD + audit logic), `comped-invites/schemas.ts` (validation) |
| `apps/aspen/src/routes/api/curios/timeline/generate/+server.ts` | 759 | → `curios/timeline/builder.ts` (generation logic), already partially in curios/ |
| `apps/aspen/src/routes/arbor/settings/profile/+page.server.ts` | 645 | → `settings/profile-service.ts` (update logic), `settings/schemas.ts` (validation) |
| `apps/aspen/src/routes/arbor/curios/shelves/+page.server.ts` | 622 | → `curios/shelves/shelf-service.ts` (CRUD) |
| `apps/aspen/src/routes/api/images/upload/+server.ts` | 554 | → `media/upload-service.ts` (processing pipeline) |
| `apps/aspen/src/routes/api/grove/wisp/+server.ts` | 545 | → `social/wisp/wisp-service.ts` |
| `apps/aspen/src/routes/api/blooms/[slug]/+server.ts` | 514 | → `content/blooms/bloom-service.ts` |
| `apps/aspen/src/routes/api/grove/wisp/fireside/+server.ts` | 479 | → `social/wisp/fireside-service.ts` |
| `apps/plant/src/routes/auth/callback/+server.ts` | 451 | → Thin after Phase 1 legacy removal |

**Pattern:** The server file keeps only request/response handling:
```typescript
// +page.server.ts (thin)
import { createInvite, listInvites, revokeInvite } from './invite-service';
import { inviteSchema } from './schemas';

export const actions = {
  create: async ({ request, locals }) => {
    const data = await parseFormData(request, inviteSchema);
    return createInvite(locals.db, data);
  },
  // ...
};
```

### God Files

These are highly-depended-upon files that concentrate too much logic.

| File | Lines | Split Strategy |
|------|-------|----------------|
| `libs/engine/src/lib/server/db/schema/engine.ts` | 1,280 | → `schema/auth.ts` (users, sessions, accounts), `schema/content.ts` (blooms, pages, gardens), `schema/curios.ts` (curio tables), `schema/billing.ts` (subscriptions, invoices), `schema/platform.ts` (config, flags, tenants). A `schema/index.ts` re-exports all tables for Drizzle config. |
| `libs/engine/src/lib/server/services/database.ts` | 1,074 | → Domain repositories: `server/services/user-repository.ts`, `server/services/content-repository.ts`, `server/services/curio-repository.ts`, etc. |
| `libs/engine/src/lib/utils/markdown.ts` | 1,091 | → `content/markdown/parser.ts`, `content/markdown/renderer.ts`, `content/markdown/sanitizer.ts` (handled in Phase 2 move) |
| `libs/engine/src/lib/utils/upload-validation.ts` | 798 | → `media/validation/format-detection.ts`, `media/validation/rules.ts`, `media/validation/processor.ts` (handled in Phase 2 move) |

**Schema split detail:**

The monolithic `engine.ts` defines ~78 tables in one file. Split by domain:

```
schema/
  auth.ts       ← users, ba_user, ba_session, ba_account, ba_verification, passkeys
  content.ts    ← blooms, pages, gardens, drafts, revisions, tags
  curios.ts     ← All curio-related tables (badges, artifacts, timeline, guestbook, polls, etc.)
  billing.ts    ← subscriptions, invoices, payment_methods, tier_history
  platform.ts   ← tenants, config, feature_flags, secrets, domains
  social.ts     ← reactions, comments, follows, notifications
  media.ts      ← uploads, images, exports, storage_quota
  index.ts      ← Re-exports everything (Drizzle needs all tables in one config)
```

Each file is self-contained with its own imports from `drizzle-orm/sqlite-core`. The `index.ts` simply does:
```typescript
export * from './auth';
export * from './content';
export * from './curios';
// ...
```

---

## Phase 6: Config & Pattern Consolidation

> Reduces copy-paste across config files and service boilerplate.

### Vite Config

**Problem:** 8+ `vite.config.ts` files copy-paste the same JXL externalization block:
```typescript
optimizeDeps: { exclude: ["@jsquash/jxl"] },
build: { rollupOptions: { external: ["@jsquash/jxl"] } },
```

**Solution:** Create a shared vite config factory in `libs/infra/`:

```typescript
// libs/infra/src/vite-config.ts
import { sveltekit } from '@sveltejs/kit/vite';

export function createGroveViteConfig(overrides = {}) {
  return {
    plugins: [sveltekit()],
    optimizeDeps: { exclude: ["@jsquash/jxl"] },
    build: { rollupOptions: { external: ["@jsquash/jxl"] } },
    ...overrides,
  };
}
```

Each app's `vite.config.ts` becomes:
```typescript
import { createGroveViteConfig } from '@autumnsgrove/infra/vite-config';
export default createGroveViteConfig();
```

**Files to update:** `apps/ivy`, `apps/terrarium`, `apps/landing`, `apps/domains`, `apps/clearing`, `apps/amber`, `apps/meadow`, `apps/aspen` (verify full list via grep for `@jsquash/jxl`).

### Tailwind Prose Config

**Problem:** `apps/aspen/tailwind.config.js` and `apps/landing/tailwind.config.js` repeat nearly identical prose CSS variable blocks (~60 lines each).

**Solution:** Extract to Prism as a prose preset:

```javascript
// libs/prism/src/lib/tailwind/prose.js
export const groveProseConfig = {
  typography: {
    DEFAULT: {
      css: {
        '--tw-prose-body': 'var(--color-text)',
        '--tw-prose-headings': 'var(--color-text)',
        // ... all shared prose variables
      }
    }
  }
};
```

Apps extend:
```javascript
import grovePreset from "@autumnsgrove/prism/tailwind";
import { groveProseConfig } from "@autumnsgrove/prism/tailwind/prose";
```

### Auth Middleware

**Problem:** 5+ workers/services each reimplement token validation middleware:
- `workers/warden/src/auth/middleware.ts`
- `workers/reverie/src/auth/middleware.ts`
- `workers/lumen/src/auth/middleware.ts`
- `workers/loft/src/middleware/auth.ts`
- `services/zephyr/src/middleware/auth.ts`

**Solution:** Create a shared middleware factory in `libs/infra/`:

```typescript
// libs/infra/src/middleware/auth.ts
export function createAuthMiddleware(options: {
  validateToken: (token: string) => Promise<boolean>;
  extractToken: (request: Request) => string | null;
}) {
  return async (request: Request): Promise<{ valid: boolean; error?: string }> => {
    const token = options.extractToken(request);
    if (!token) return { valid: false, error: 'Missing token' };
    const valid = await options.validateToken(token);
    return { valid, error: valid ? undefined : 'Invalid token' };
  };
}
```

Each service composes with its domain logic:
```typescript
import { createAuthMiddleware } from '@autumnsgrove/infra/middleware/auth';
const auth = createAuthMiddleware({
  validateToken: (token) => env.WARDEN.fetch('/validate', { headers: { Authorization: token } }),
  extractToken: (req) => req.headers.get('X-API-Key'),
});
```

### Response Builders

**Problem:** Services define response formats ad-hoc. No shared success/error response shape.

**Solution:** Shared response utilities in `libs/infra/`:

```typescript
// libs/infra/src/response.ts
export function jsonResponse<T>(data: T, status = 200) {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400, code?: string) {
  return new Response(JSON.stringify({ success: false, error: { message, code } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**Adopt gradually** — use in new code, migrate existing services when touched.

---

## Decisions

Confirmed during planning session (2026-03-27):

| Decision | Answer | Rationale |
|----------|--------|-----------|
| Keep all 11 apps separate? | **Yes** | Each is a legitimate separate deployment target. Terrarium, amber, meadow will grow. Login is shared across all apps. |
| Engine stays as one package? | **Yes** | Reorganize internally by domain, but keep as `@autumnsgrove/lattice`. |
| Import strategy? | **Deep imports** | `@autumnsgrove/lattice/content/markdown` not barrel exports. |
| Ivy cleanup? | **Deferred** | Update imports to use engine where possible, but don't rewrite Ivy internals. Future work. |
| Data externalization format? | **JSON files → D1** | Follow the KB pipeline pattern. JSON is the source of truth. D1 is the runtime cache. |
| Nature palette treatment? | **Keep as-is (bake in)** | Static rendering data for 89 SVG components. Not user-configurable. Correctly separate from Prism. |
| Prism relationship? | **Prism = SSOT for design tokens** | Nature palette = rendering data. No overlap. No consolidation needed. |
| Legacy auth removal? | **Yes, proceed carefully** | Better Auth + SessionDO is active. GroveAuthClient is dead code. Legacy deadline passed. CLI OAuth is covered by Better Auth. |
| Backward compat shims? | **Remove them** | Lean > safe. If something breaks, fix the breakage. |
| Tests in scope? | **No** | If moves break test imports, fix in a separate pass. Don't consolidate test files. |
| Big Svelte file decomposition? | **Yes** | One file, one purpose. Break monolithic components into sub-components. |
| Grafts simplification? | **Yes, retire the term** | Feature flags = feature flags. UI modules = components in their domain. |
| Gossamer? | **Investigate separately** | 5,640 lines. Purpose unclear from planning session. Not blocking this refactor. |
| Aggression level? | **Aggressive** | Remove duplication, delete dead code, restructure engine, externalize data. Lean codebase. |

---

## Out of Scope

- **Ivy deep cleanup** — Has the most duplication but is isolated and has future plans. Just update imports for now.
- **Test file consolidation** — If test imports break from moves, fix them. Don't reorganize test files themselves.
- **App merging/consolidation** — All 11 apps stay separate. Each is a legitimate deployment.
- **Gossamer investigation** — Needs its own exploration. Not blocking any phase here.
- **New features** — This is cleanup only. No new functionality.
- **Performance optimization** — Not the goal, though data externalization may improve cold starts.
- **CI/CD changes** — Beyond adding `pre-deploy-command` for data sync, don't restructure workflows.
- **Package renaming** — `@autumnsgrove/lattice` stays. The npm rename discussion is separate.

---

## Validation & Rollback

### Per-Phase Validation

Each phase must pass these checks before moving to the next:

1. **`bun run build`** passes for all affected apps
2. **`bun x tsc --noEmit`** passes for engine and all consuming packages
3. **No broken imports** — grep for old import paths returns zero results
4. **No orphaned files** — no files left in old locations (except intentional re-export shims during migration window)

### Rollback Strategy

- **Each phase is a separate branch/PR.** If a phase goes wrong, revert the entire PR.
- **Phase 1** (dead code removal) is the safest — it only deletes unused code. Rollback = restore deleted files.
- **Phase 2** (reorganization) is the riskiest — it moves many files. Use temporary re-export shims during migration to prevent breakage. Only delete shims after ALL imports are updated and verified.
- **Phase 4** (data externalization) changes runtime behavior. Test thoroughly in dev environment before deploying. The old TypeScript files can be kept as fallbacks until D1 sync is verified in prod.

### CI Checkpoints

After each phase commit:
- [ ] Full type check passes
- [ ] All deploy workflows still reference valid paths
- [ ] No `$lib/grafts/` imports remain (after Phase 3)
- [ ] No `$lib/utils/markdown` imports remain (after Phase 2 — should be `$lib/content/markdown`)
- [ ] `data-sync.ts` runs successfully in dry mode (after Phase 4)

---

## Execution Notes

- **Work in a worktree.** This is a massive refactor. Use `git worktree` to keep a clean main while working.
- **Commit granularly.** One commit per logical unit (e.g., "move curios/ badges to data/badges.json" not "Phase 4").
- **Update AGENT.md as you go.** The agent instructions reference current file paths. Update them after Phase 2 so future agents can find things.
- **Leave breadcrumbs during migration.** When moving a file, add a one-line comment at the old location during the migration window: `// Moved to $lib/content/markdown/parser.ts`. Delete these after all imports are updated.
