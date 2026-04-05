# Codebase Bloat Analysis — April 2025

> **Context**: Grove/Lattice is maintained by a single developer. SQLite (the
> engine behind D1) ships at ~120k lines. This codebase is 528k lines across 39
> deployment targets. This document maps where the code lives, identifies bloat,
> and proposes a phased simplification plan.
>
> **Status**: Phase 1 audit complete. All findings below are backed by automated
> import tracing, file-level analysis, and manual review across 6 parallel audits.

---

## 1. The Numbers

### Total Source Code: ~528,000 lines

| Category | Lines | % |
|----------|------:|--:|
| TypeScript (.ts) | 391,944 | 74% |
| Svelte (.svelte) | 158,245 | 30% |
| JavaScript (.js) | 4,378 | <1% |
| CSS (.css) | 7,435 | 1% |

**Test code: ~145,000 lines (27% of total)**
**Production code: ~383,000 lines**

### By Area

| Area | Lines | % | What it does |
|------|------:|--:|-------------|
| libs/engine | 222,256 | 42% | Shared framework — UI, server, curios, platform, AI, auth, media, monitoring |
| apps/aspen | 80,886 | 15% | Main blog app (42k of that is Arbor admin panel) |
| apps/landing | 43,287 | 8% | Marketing/landing site |
| services/heartwood | 36,099 | 7% | Auth service |
| workers/ (13 total) | 30,907 | 6% | Background workers |
| libs/foliage | 18,187 | 3% | Community themes |
| other services (9) | 39,187 | 7% | Billing, forage, durable-objects, amber, etc. |
| other apps (9) | 53,419 | 10% | Domains, ivy, plant, meadow, billing, clearing, etc. |
| other libs + tools | 24,000 | 5% | Gossamer, infra, prism, shutter, cairn, scripts |

### Engine Internals (222k lines)

| Subsystem | Lines | Notes |
|-----------|------:|-------|
| ui/components | 40,699 | Largest single chunk. "nature" (8.9k), "ui" (11.5k), "chrome" (3.3k) |
| curios | 28,007 | 22 widget types. Only consumed by Aspen. |
| server/services | 28,688 | Database, storage, billing, petal, rate-limits |
| platform | 21,686 | Feature flags (7.3k!), config, greenhouse, pricing, threshold |
| ai/lumen | 15,041 | AI gateway — shared by 5 consumers |
| monitoring | 11,622 | Sentinel + observability — 3 consumers |
| utils | 10,953 | General utilities — 15 consumers (ubiquitous) |
| content | 8,384 | Markdown editor, GutterManager — Aspen only |
| auth | 8,286 | Auth client/helpers — 6 consumers |
| media | 8,022 | Upload validation, amber client |
| everything else | ~41,000 | Firefly, loom, thorn, errors, email, git, etc. |

### Test Distribution

| Area | Test Lines |
|------|----------:|
| libs/engine | 73,891 |
| services/ | 25,623 |
| workers/ | 15,264 |
| apps/aspen | 7,594 |
| apps/landing | 1,877 |

---

## 2. Audit Findings

### Audit A: Engine Consumer Map

Every engine subsystem was traced to identify which apps, services, and workers
actually import from it. Key finding: **7 subsystems are single-consumer, 5 are
completely unused.**

#### Single-Consumer Subsystems (move out of engine)

| Subsystem | Lines | Only Consumer | Action |
|-----------|------:|---------------|--------|
| **curios** | 28,007 | Aspen | Move to `libs/curios` or into Aspen |
| **content** | 8,384 | Aspen | Move to Aspen |
| **components** | 8,278 | Aspen | Move to Aspen |
| **durable-objects** | 999 | Aspen | Move to Aspen |
| **git** | 903 | Aspen | Move to Aspen |
| **actions** | 27 | Aspen | Move to Aspen |
| **firefly** | 2,760 | Loft (personal) | Move with Loft or delete |
| **Total** | **49,358** | | |

#### Unused Subsystems (delete)

| Subsystem | Notes |
|-----------|-------|
| **data** | Zero imports found anywhere |
| **db** | Zero imports found anywhere |
| **scribe** | Zero imports found anywhere |
| **styles** | Zero imports found anywhere |
| **types** | Zero imports found anywhere |

#### Truly Shared Subsystems (keep in engine)

| Subsystem | Consumers | Status |
|-----------|----------:|--------|
| ui | 10 apps | Core — stays |
| errors | 17 consumers | Ubiquitous — stays |
| utils | 15 consumers | Ubiquitous — stays |
| platform | 8 consumers | Shared config — stays |
| auth | 6 consumers | Shared auth — stays |
| ai/lumen | 5 consumers | Shared AI gateway — stays |
| zephyr | 5 consumers | Shared email — stays |
| loom | 4 consumers | Shared — stays |
| monitoring | 3 consumers | Shared observability — stays |
| media | 2 consumers | Shared — stays |
| thorn | 2 consumers | Shared — stays |
| email | 2 consumers | Shared — stays |
| social | 2 consumers | Shared — stays |
| server | 3 consumers | Shared — stays |

---

### Audit B: Test Quality

433 test files analyzed. 145k lines across 8,000+ test cases.

#### Key Findings

1. **Duplicated Cloudflare mock infrastructure**: 1,829 lines across 5+ locations.
   D1, KV, R2, and Durable Object mocking reimplemented independently in:
   - `services/durable-objects/src/test-helpers.ts` (411 lines)
   - `libs/engine/tests/utils/setup.ts` (518 lines)
   - `services/heartwood/src/test-helpers.ts` (242 lines)
   - `workers/warden/src/test-helpers.ts` (210 lines)
   - `libs/infra/src/testing/mock-*.ts` (426 lines combined)
   - `apps/domains/src/lib/server/test-helpers.ts` (116 lines)
   - `apps/meadow/src/lib/server/test-helpers.ts` (118 lines)

2. **Duplicate test file**: `upload-validation.test.ts` exists identically in two
   locations (1,321 lines each):
   - `libs/engine/src/lib/media/upload-validation.test.ts`
   - `libs/engine/src/lib/media/validation/upload-validation.test.ts`

3. **Worst mock-heavy offenders** (tests that validate mocks, not behavior):
   - `server/billing.test.ts` — 1,350 lines, 328 `vi.fn()` calls
   - `lumen/providers/openrouter.test.ts` — 1,529 lines, 151 mock refs
   - `media/amber/amber.test.ts` — 1,468 lines, 139 mock refs
   - `loft/scheduled/scheduled.test.ts` — 792 lines, 206 mock refs, only 21 tests

4. **Trivial tests** (type guards, constant checks, CSS class assertions):
   - `components/custom/types.test.ts` — tests `isValidIcon(null) === false`
   - `components/custom/MobileTOC.test.ts` — tests aria attributes exist
   - `auth/limits.test.ts` — tests `RATE_LIMIT_PER_HOUR === 100`
   - `auth/palette.test.ts` — tests color constants exist

#### Recommended Actions

| Action | Lines Saved | Effort |
|--------|----------:|--------|
| Delete duplicate upload-validation.test.ts | 1,321 | Trivial |
| Consolidate mock infrastructure to shared package | ~1,200 | 1 week |
| Delete trivial test files (type guards, constants) | ~900 | 1 day |
| Prune mock-heavy billing/openrouter/amber tests | ~3,000 | 1 week |
| **Total immediate test savings** | **~6,400** | |

**Longer-term**: Update `/beaver-build` skill to produce fewer, higher-quality
tests. Stop testing implementation details; focus on behavior at boundaries.

---

### Audit C: Personal vs Product Code

#### Personal Code Identified

| Item | Type | Lines | Extractable? |
|------|------|------:|-------------|
| **tools/cairn/** | Claude session viewer | 3,994 | Yes — zero product deps |
| **workers/loft/** | Ephemeral dev envs on Fly.io | 3,016 | Yes — only dep is Firefly SDK |
| **tools/looking-glass/** | Alternate session viewer | 1,795 | Yes — zero product deps |
| **tools/index-viz/** | Vector index visualization (Python) | 412 | Yes — zero product deps |
| **Total** | | **9,217** | |

#### Borderline / Future Product Items

| Item | Lines | Assessment |
|------|------:|-----------|
| tools/glimpse/ | 8,643 | Internal agent auditing companion (Python) — product infra, needs work |
| apps/terrarium/ | 160 | Planned future project — keep, will grow |
| tools/showroom/ | 952 | Product showcase — uses lattice/gossamer/prism |
| scripts/journey/ | ~200 | Data migration — internal tooling |
| scripts/generate/generate-business-cards.mjs | ~100 | Personal asset generation |

#### Product Code Confirmed

All 10 remaining apps, all 12 remaining workers, all libs, all services, and
core scripts are product code. Notably:
- **apps/ivy/** — Zero-knowledge email client (product, not personal)
- **apps/meadow/** — Social feed (product)
- **libs/grove-agent/** — Agent framework (product, used by onboarding)

---

### Audit D: App & Service Consolidation

#### Consolidation Candidates

| Target | Lines | Recommendation | Effort |
|--------|------:|---------------|--------|
| **services/email-render** | 235 | Merge into Zephyr (stateless template renderer) | 1-2 hours |
| **apps/terrarium** | 160 | Absorb into Aspen or delete (single component wrapper) | 1 hour |

#### Keep Separate (Architectural Reasons)

| Target | Lines | Why |
|--------|------:|-----|
| apps/login | 2,310 | Must be at `login.grove.place` for auth redirects |
| apps/billing | 2,290 | Payment isolation, Stripe/PCI compliance |
| apps/clearing | 5,130 | Status page must work when main app is down; has crons |
| services/grove-router | 1,434 | Entry point for ALL traffic — critical path |
| services/pulse | 1,692 | Webhook receiver, cron aggregation |
| services/amber | 2,173 | Own DB, Durable Objects, R2 — backend for amber app |
| services/og-worker | 2,372 | Expensive image generation, separate scaling |

---

### Audit E: Worker Consolidation

#### Remove or Merge

| Worker | Lines | Action |
|--------|------:|--------|
| **post-migrator** | 673 | **DELETE** — disabled, has known timestamp bug, not needed |
| **vista-collector** | 67 | **MERGE** → new `grove-maintenance` worker |
| **webhook-cleanup** | 206 | **MERGE** → new `grove-maintenance` worker |
| **email-catchup** | 384 | **MERGE** → onboarding (extend DO to handle retries) |

#### Keep Separate

| Worker | Lines | Why |
|--------|------:|-----|
| loft | 3,016 | Personal but self-contained |
| lumen | 2,561 | Core AI service, used by multiple consumers |
| meadow-poller | 1,272 | RSS aggregator, focused purpose |
| onboarding | 709 | Email sequence agent (absorbs email-catchup) |
| patina | 4,586 | Critical backup system for 14 databases |
| reverie | 2,737 | AI config planner — intentional split from exec |
| reverie-exec | 1,786 | Execution sidecar — intentional split from reverie |
| timeline-sync | 6,786 | Nightly summary generation |
| warden | 5,235 | Critical credential gateway |

**Result: 13 workers → 9** (delete 1, merge 3 into 1 new + 1 existing)

---

### Audit F: Code Duplication

#### Significant Duplication

| Pattern | Scope | Duplicate Lines | Fix |
|---------|-------|---------------:|-----|
| **API route boilerplate** | 252 `+server.ts` files | 4,800-6,000 | Create shared auth guard + error middleware |
| **Cloudflare test mocks** | 5+ locations | 1,829 | Consolidate to `@lattice/test-utils` |
| **Auth hooks boilerplate** | 8 `hooks.server.ts` files | 320-480 | Extract `getCookie()`, `validateSession()` to engine |
| **Error type definitions** | `billing-api` vs engine | ~100 | Migrate to shared `GroveErrorDef` |
| **PostMeta/PostContent types** | engine + services/durable-objects | ~16 | Consolidate to engine, re-export |

#### Not Actually Duplicated

| Pattern | Assessment |
|---------|-----------|
| Rate limiting (7 files) | Different storage backends (memory, D1, KV, DO) — justified |
| Vineyard pages (aspen + landing) | Different purpose (internal catalog vs marketing) — justified |
| Vitest/Vite configs | Already using `createGroveViteConfig()` factory — well-managed |

---

## 3. What's NOT Bloat

Some things look large but are justified:

- **UI components (40k)**: Shared design system across 10 apps. Core to the platform.
- **Heartwood (36k)**: Auth is inherently complex. OAuth, PKCE, session management, templates.
- **Curios as a concept**: Core to Grove's identity. The issue is location, not existence.
- **Worker architecture**: Cloudflare-native, each worker is small and focused.
- **Admin panel depth**: Arbor at 42k lines is proportional to its features.
- **Rate limiting variety**: Different storage backends serve different needs.
- **Config system**: `createGroveViteConfig()` factory is already well-designed.

---

## 4. Simplification Roadmap

### Tier 1: Quick Wins (1-2 days each, zero risk)

| # | Action | Lines Saved | Deployments Saved |
|---|--------|----------:|------------------:|
| 1.1 | Delete unused engine subsystems (data, db, scribe, styles, types) | ~500 | 0 |
| 1.2 | Delete duplicate `upload-validation.test.ts` | 1,321 | 0 |
| 1.3 | Delete `workers/post-migrator` (disabled, buggy) | 673 | 1 |
| 1.4 | Delete trivial test files (type guards, constant assertions) | ~900 | 0 |
| 1.5 | Merge `services/email-render` into Zephyr | 235 | 1 |
| | **Tier 1 Total** | **~3,629** | **2** |

### Tier 2: Engine Extraction (1-2 weeks, medium effort)

| # | Action | Lines Moved Out | Impact |
|---|--------|---------------:|--------|
| 2.1 | Move curios (28k) to `libs/curios` or Aspen | 28,007 | Engine -13% |
| 2.2 | Move content (8.4k) to Aspen | 8,384 | Engine -4% |
| 2.3 | Move components (8.3k) to Aspen | 8,278 | Engine -4% |
| 2.4 | Move durable-objects, git, actions to Aspen | 1,929 | Engine -1% |
| 2.5 | Move firefly to personal or delete | 2,760 | Engine -1% |
| | **Tier 2 Total** | **49,358 from engine** | **Engine: 222k → 173k** |

### Tier 3: Test & Infrastructure Cleanup (2-3 weeks)

| # | Action | Lines Saved |
|---|--------|----------:|
| 3.1 | Consolidate Cloudflare mock infrastructure | ~1,200 |
| 3.2 | Prune mock-heavy test files (billing, openrouter, amber, loft) | ~3,000 |
| 3.3 | Create shared API route middleware (auth guard, error wrapper) | ~2,500 |
| 3.4 | Extract auth hook utilities to engine | ~350 |
| 3.5 | Update `/beaver-build` skill to produce fewer, better tests | Future savings |
| | **Tier 3 Total** | **~7,050** |

### Tier 4: Worker & Personal Code Consolidation (1-2 weeks)

| # | Action | Lines Saved/Moved | Deployments Saved |
|---|--------|-----------------:|------------------:|
| 4.1 | Create `grove-maintenance` worker (vista-collector + webhook-cleanup) | 0 (consolidation) | 1 |
| 4.2 | Merge email-catchup into onboarding | ~384 | 1 |
| 4.3 | Move personal tools to `personal/` directory, exclude from CI | 9,217 | 0 |
| | **Tier 4 Total** | **~9,601** | **2** |

---

## 5. Expected Impact

### Lines

| Metric | Before | After | Change |
|--------|-------:|------:|-------:|
| Total source | 528,000 | ~461,000 | -67,000 (-13%) |
| Engine | 222,256 | ~173,000 | -49,000 (-22%) |
| Tests | 145,000 | ~139,000 | -6,000 (-4%) |
| Personal code in product tree | 9,217 | 0 | -9,217 |

### Deployment Targets

| Metric | Before | After |
|--------|-------:|------:|
| Workers | 13 | 9 |
| Apps | 11 | 11 |
| Services | 10 | 9 |
| **Total** | **34** | **29** |

### Cognitive Load

| Improvement | Mechanism |
|-------------|-----------|
| Engine becomes "shared code only" | Single-consumer code moves to its actual consumer |
| Fewer deployment targets | 34 → 28 (6 fewer things to break) |
| Cleaner test signal | Fewer mock-heavy pass-throughs, consolidated infrastructure |
| Personal/product boundary | Personal tools in `personal/`, excluded from CI |
| Less API boilerplate | Shared middleware for auth, errors, config checks |

---

## 6. Non-Negotiables (Per Owner)

These stay, even if they add complexity:
- **Curios system** — core to Grove identity (moves location, not deleted)
- **Worker architecture** — Cloudflare-native, correct pattern
- **Admin panel depth** — Arbor richness matters for the product

---

## 7. Execution Order

```
Week 1:  Tier 1 (quick wins) — delete dead code, merge tiny services
Week 2-3: Tier 2 (engine extraction) — move single-consumer code out
Week 4-5: Tier 3 (test & infra cleanup) — consolidate mocks, add middleware
Week 6:  Tier 4 (worker & personal consolidation) — maintenance worker, personal dir
```

Each tier is a standalone set of PRs. Measure total lines and deployment count
after each tier. Stop whenever the maintenance burden feels manageable.

The goal isn't "smallest possible codebase" — it's **code that one developer can
confidently navigate, modify, and maintain** without fear of invisible breakage.
