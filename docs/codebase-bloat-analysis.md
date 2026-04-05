# Codebase Bloat Analysis — April 2025

> **Context**: Grove/Lattice is maintained by a single developer. SQLite (the
> engine behind D1) ships at ~120k lines. This codebase is 528k lines across 39
> deployment targets. This document maps where the code lives, identifies bloat,
> and proposes a phased simplification plan.

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
| curios | 28,007 | 22 widget types. Really an Aspen concern, not shared. |
| server/services | 28,688 | Database, storage, billing, petal, rate-limits |
| platform | 21,686 | Feature flags (7.3k!), config, greenhouse, pricing, threshold |
| ai/lumen | 15,041 | AI gateway — shared by design |
| monitoring | 11,622 | Sentinel + observability |
| utils | 10,953 | General utilities |
| content | 8,384 | Markdown editor, GutterManager |
| auth | 8,286 | Auth client/helpers |
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

## 2. Where the Fat Is

### Problem 1: Engine is a monolith (222k lines, 42% of codebase)

The engine contains code that is shared across apps AND code that only one app
uses. The "engine-first" philosophy is sound — single source of truth, avoid
drift — but the boundary has drifted. Code goes into engine by default rather
than by need.

**Specific violations of "shared only":**
- **Curios (28k)**: Only consumed by Aspen. No other app uses shrines, guestbooks, or mood rings.
- **Monitoring/Sentinel (11.6k)**: Likely only consumed by 1-2 apps.
- **Firefly (2.8k)**: Internal journaling SDK — may only be used by personal tools.

### Problem 2: Tests are large but low-signal (145k lines)

- 8,000+ tests, 145k lines
- Heavy Cloudflare mocking infrastructure that "always passes because the mocks were made in the same pass"
- Tests rarely catch real bugs — mostly confirm implementation details
- Test infrastructure itself adds significant code volume

### Problem 3: Too many deployment targets (39 wrangler configs)

While each worker/service has a purpose, the cognitive overhead of 39 deployable
units is severe. When one change breaks CI across multiple targets, it's nearly
impossible to triage quickly.

- 11 apps
- 10 services
- 13 workers
- + libs with wrangler configs

### Problem 4: Personal code mixed with product code

Workers like `loft` and tools like `cairn` are personal projects built on
internal SDKs (e.g., Firefly). They add to line counts, CI surface, and
cognitive load. Their tight coupling to internal libs makes extraction non-trivial.

### Problem 5: Large Svelte components

Several components exceed 1,000 lines — effectively "god components":
- `GutterManager.svelte` — 1,644 lines
- `vineyard/+page.svelte` — 1,353 lines (landing) / 1,299 lines (aspen)
- `garden/edit/[slug]/+page.svelte` — 1,346 lines
- `ImageUploadForm.svelte` — 1,245 lines
- `MarkdownEditor.svelte` — 1,153 lines
- `curios/timeline/+page.svelte` — 1,161 lines

### Problem 6: Feature flags system is 7,280 lines

That's a substantial subsystem for feature management. Worth reviewing whether
this complexity is proportional to the number of flags actually in use.

---

## 3. What's NOT Bloat

Some things look large but are justified:

- **UI components (40k)**: A design system for a platform this ambitious needs
  breadth. The components are shared across 11 apps.
- **Heartwood (36k)**: Auth is inherently complex. OAuth, PKCE, session
  management, templates, CDN.
- **Curios as a concept**: The curio system is core to Grove's identity. The
  issue is location (engine vs aspen), not existence.
- **Worker architecture**: Cloudflare-native, each worker is small and focused.
  The architecture is sound.
- **Admin panel depth**: Arbor at 42k lines is proportional to the features it
  manages.

---

## 4. Recommended Simplification Plan

### Phase 1: Audit & Inventory (Low effort, high clarity)

Before cutting anything, build a clear map:

1. **Audit engine exports**: For each engine subsystem, determine which apps
   actually import from it. Identify code that's "shared" in theory but consumed
   by exactly one app.
2. **Audit tests**: Identify tests that are pure mock-validation (mock returns X,
   assert X was returned). Flag tests where the mock setup is longer than the
   test assertions.
3. **Audit personal code**: Catalog workers, tools, and scripts that are personal
   projects vs product code. Map their internal dependencies.
4. **Audit deployment targets**: For each wrangler.toml, note last deploy date,
   traffic/usage, and whether it could be merged with another target.

### Phase 2: Extract Curios from Engine (Medium effort, high impact)

Move `libs/engine/src/lib/curios/` (28k lines) into Aspen or a dedicated
`libs/curios` package. This is the clearest win:
- Only Aspen uses curios
- Removes 28k lines from engine
- Makes engine's purpose cleaner
- Curios can evolve independently without engine release cycles

### Phase 3: Test Pruning (Medium effort, medium impact)

Target: Reduce test code by ~40% (~58k lines).

Strategy:
- **Delete mock-heavy "pass-through" tests** where setup mirrors assertions
- **Consolidate integration tests** that test the same flow from different angles
- **Remove tests on trivial functions** (simple getters, type guards, formatters)
- **Keep**: Boundary tests (API routes, DB queries), complex logic tests, regression tests
- **Update /beaver-build skill** to produce fewer, higher-quality tests going forward

### Phase 4: Evaluate Consolidation Opportunities

After the audit, evaluate:
- Can `apps/terrarium` (331 lines) be absorbed into Aspen or landing?
- Can `apps/billing` (2.7k) and `apps/login` (2.7k) be routes within landing?
- Can any workers be merged? (e.g., `webhook-cleanup` + `warden` if they share concerns)
- Can `email-render` (235 lines!) be a function within another service?

### Phase 5: Engine Internal Boundaries

Even without splitting packages, enforce clearer boundaries within engine:
- Define explicit public APIs per subsystem via barrel exports
- Document which apps may import from which engine subsystems
- Consider a lint rule or import map that flags "curios imported outside Aspen"

### Phase 6: Personal Code Separation

Options (to be decided after audit):
- **Soft separation**: Move to `personal/` directory, exclude from main CI
- **Hard separation**: Extract to separate repo with engine as a dependency
- **Hybrid**: Keep in monorepo but use workspace filtering to exclude from builds

---

## 5. Expected Impact

| Action | Lines Removed | Cognitive Load Reduction |
|--------|-------------:|--------------------------|
| Move curios to Aspen/libs | ~28k from engine | Engine becomes "shared framework" again |
| Prune tests (40%) | ~58k | Faster CI, less noise, clearer signal |
| Consolidate tiny apps | ~5-10k | Fewer deployment targets |
| Personal code separation | ~5-15k | Clearer product boundary |
| **Total potential** | **~96-111k lines** | **~18-21% reduction** |

This would bring the codebase from ~528k to ~420-430k lines, with the remaining
code better organized and more clearly purposeful.

---

## 6. Non-Negotiables (Per Owner)

These stay, even if they add complexity:
- **Curios system** — core to Grove identity (just needs to move)
- **Worker architecture** — Cloudflare-native, correct pattern
- **Admin panel depth** — Arbor richness matters for the product

---

## 7. Next Steps

1. Start with Phase 1 (Audit) — this is pure research, zero risk
2. Use findings to prioritize Phase 2-6 ordering
3. Each phase should be a standalone PR with clear before/after metrics
4. Re-measure after each phase to track progress

The goal isn't "smallest possible codebase" — it's **code that one developer can
confidently navigate, modify, and maintain** without fear of invisible breakage.
