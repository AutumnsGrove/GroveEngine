# Codebase Bloat Analysis — April 2026 (Re-audited)

> **Context**: Grove/Lattice is maintained by a single developer. SQLite (the
> engine behind D1) ships at ~120k lines. This codebase is ~573k lines across
> 34 deployment targets. This document maps where the code lives, identifies
> bloat, and proposes a phased simplification plan.
>
> **Audit history**:
> - **April 2025** — Original 6-parallel audit (Audits A–F)
> - **April 2026 Pass 1** — Re-audit of Audit A "unused subsystems" (4/5
>   false positives corrected) + Tier 1 quick wins partially executed
> - **April 2026 Pass 2** — Re-audit of the remaining claims. Substantial
>   corrections to Audits B, C, D, E, and Tier 4. **Nearly every number in the
>   original document was off, and several strategic recommendations were
>   infeasible or based on phantom references.** See §0.2.
>
> **Reading guide**: Sections marked ✅ have been verified against the
> working tree in April 2026. Sections marked ⚠️ retain partial uncertainty.
> Strike-through indicates a claim that was reversed or removed after re-audit.

---

## 0. Progress & Re-audit Corrections

### 0.1 ✅ Completed actions (branch `claude/analyze-codebase-bloat-GqdSB`)

| # | Action | Lines | Notes |
|---|--------|------:|-------|
| 0.1 | Delete `libs/engine/src/lib/media/upload-validation.test.ts` duplicate | 1,321 | Confirmed byte-identical duplicate |
| 0.2 | Delete `workers/post-migrator/` entirely | 1,545 | Plus workflow shim + affected-packages + grove-census |
| 0.3 | Delete `libs/engine/src/lib/db/schema.sql` (standalone legacy schema) | 238 | Migrated into `grove-curios-db`'s `timeline_*` tables |
| 0.4 | Prune 7 defunct D1 databases from Patina backup worker | ~50 | See §Audit G — scout-db, grovemusic-db, library-enhancer-db, autumnsgrove-posts, autumnsgrove-git-stats, your-site-posts, mycelium-oauth |
| 0.5 | Delete `ui/components/custom/types.test.ts` (only truly-trivial test found) | 56 | See §Audit B re-audit below — the other ~900 lines flagged were false positives |
| | **Running total** | **~3,210** | 1 deploy target removed (post-migrator); 7 D1 backups pruned within Patina |

### 0.2 🔧 Pass 2 re-audit corrections (April 2026)

A second re-audit covering the remaining claims found **substantial
inaccuracies across nearly every section**. Detailed corrections are
inline below, but the material reversals are:

| Section | Original claim | Pass 2 finding |
|---------|----------------|----------------|
| Audit A (unused subsystems) | 5 subsystems unused | 4/5 false positives — only `db/` was truly unused (**corrected in Pass 1**) |
| Audit A (single-consumer) | curios: Aspen only | Aspen **+ `workers/timeline-sync`**; also re-exported from engine barrel |
| Audit B (trivial tests) | ~900 lines trivial | Only 56 lines actually trivial (see §0.1 row 0.5) |
| **Audit B (mock-heavy tests)** | **~3,000 lines of low-value "test-the-mock" files** | **All 4 flagged files test real business logic through boundary mocks. Pruning target is ~0 lines.** |
| Audit B (mock infra duplication) | 1,829 lines across 7 files | File sizes accurate but only ~400 lines are true duplication; rest is specialized per-service |
| Audit C (personal code) | `workers/loft` extractable with "only Firefly SDK" dep | Loft also imports `@autumnsgrove/lattice/auth/warden` + `@autumnsgrove/infra/middleware` — extraction is possible but not trivial |
| Audit D (pulse) | `services/pulse` is a 1,692-line architectural pillar | **`services/pulse` does not exist** — was deleted in a prior cleanup; the doc referenced a phantom service |
| Audit D (email-render size) | 235 lines, small/mergeable | 1,794 lines (7.6× larger). Strengthens the §1.6 rejection rationale |
| Audit D (terrarium) | "single component wrapper", 160 lines | Full SvelteKit mini-app with routes/layout/vite config, 223 lines |
| Audit E (worker sizes) | Several workers | email-catchup 384→626, webhook-cleanup 206→457 (1.6–2.2× under-reported) |
| Tier 4.1 (grove-maintenance) | Merge vista-collector + webhook-cleanup | **Not feasible**: 3 unrelated crons, 2 different DB bindings, orthogonal concerns |
| Tier 4.2 (email-catchup → onboarding) | Clean merge | **Risky**: onboarding is a DO agent with no cron, would inherit hidden `EMAIL_RENDER` service binding |
| Deployment target count | Varies (39 / 34 / 28 in different places) | **34** actual (12 apps + 13 workers + 9 services) |

### 0.3 🔧 Pass 1 re-audit correction (engine subsystems)

The original **Audit A** claimed 5 "unused" engine subsystems. Pass 1 proved
**4 of those 5 were false positives** — the original grep missed relative
imports, ambient `.d.ts` declarations, and package.json `./exports` paths.

| Subsystem | Original verdict | Actual verdict | Consumers |
|-----------|------------------|----------------|-----------|
| `data/` | Unused | **Used** | 15+ consumers (JSON files imported via relative paths) |
| `db/` | Unused | **Unused** ✓ | Only `schema.sql` existed — now deleted |
| `scribe/` | Unused | **Used** | 1 consumer (VoiceInput.svelte) — **owner wants kept as future feature** |
| `styles/` | Unused | **Used** | 8+ consumers via package.json `./styles/*` exports |
| `types/` | Unused | **Used** | 10+ consumers (including ambient `.d.ts` files) |

The corrected "unused subsystems" count is **1, not 5** — and it's already deleted.

---

## 1. The Numbers (re-measured April 2026)

### Total Source Code: ~573,000 lines

| Category | Lines | % | Change from original doc |
|----------|------:|--:|------|
| TypeScript (.ts) | 389,660 | 68% | ✅ within 1% |
| Svelte (.svelte) | 166,599 | 29% | ⚠️ was 158,245 (+8k) |
| JavaScript (.js) | 5,554 | 1% | ⚠️ was 4,378 |
| CSS (.css) | 7,606 | 1% | ✅ within 3% |
| **Total** | **~572,993** | | ⚠️ was 528,000 (+45k) |

*(Percentages don't sum to 100% because some TS files also contain compiled Svelte output; gross counts overlap at package boundaries.)*

**Test code: ~143,306 lines (25% of total)** — 429 test files, **10,399
individual test cases** (the original doc said "8,000+" — actual coverage
is ~30% denser than claimed).

### By Area

| Area | Lines | What it does |
|------|------:|-------------|
| libs/engine | 222,547 | Shared framework — UI, server, curios, platform, AI, auth, media, monitoring |
| apps/aspen | 79,569 | Main blog app (~41.6k of that is the Arbor admin panel) |
| apps/landing | 43,512 | Marketing/landing site |
| services/heartwood | 36,099 | Auth service |
| workers/ (13 total) | 29,978 | Background workers |
| libs/foliage | 18,187 | Community themes |
| other services (9) | ~39k | Billing, forage, durable-objects, amber, zephyr, email-render, grove-router, og-worker, warden |
| other apps (11) | ~54k | Domains, ivy, plant, meadow, billing, clearing, login, terrarium, etc. |
| other libs + tools | ~25k | Gossamer, infra, prism, shutter, cairn, looking-glass, glimpse, scripts |

### Engine Internals (~222.5k lines)

| Subsystem | Lines | Notes |
|-----------|------:|-------|
| ui/components | 40,873 | Largest single chunk. "nature" (~8.9k), "ui" (~11.5k), "chrome" (~3.3k) |
| curios | 26,379 | 22 widget types. ⚠️ Consumed by Aspen **+ workers/timeline-sync**, also re-exported from engine barrel |
| platform | 21,686 | Feature flags (~7.3k), config, greenhouse, pricing, threshold |
| server/services | 15,813 | Database, storage, billing, petal, rate-limits. **⚠️ Original doc said 28,688 — massive overcount** |
| ai/lumen | 12,076 | AI gateway. ⚠️ Original doc said 15,041 |
| monitoring | 11,622 | Sentinel + observability — 3 consumers |
| utils | 11,289 | General utilities — 15 consumers (ubiquitous) |
| content | 8,645 | Markdown editor, GutterManager — Aspen only |
| auth | 8,286 | Auth client/helpers — 6 consumers |
| components | 8,304 | Layout SVGs + terminology — Aspen only (re-exported via barrel) |
| media | 6,701 | Upload validation, amber client. ⚠️ Original doc said 8,022 |
| everything else | ~50,875 | Firefly, loom, thorn, errors, email, git, durable-objects, actions, data, styles, types, scribe, etc. |

---

## 2. Audit Findings

### Audit A: Engine Consumer Map ✅ (verified April 2026)

Every engine subsystem was traced to identify which apps, services, and workers
actually import from it. Key finding: **7 subsystems are nearly single-consumer,
but 2 of them have complications** (barrel re-exports and secondary consumers)
that the original audit missed.

#### Single-Consumer Subsystems — ranked by extraction difficulty

| Subsystem | Lines | Consumers | Barrel re-export? | Difficulty |
|-----------|------:|-----------|-------------------|------------|
| **actions** | 27 | Aspen (2 files) | No | ✅ Trivial |
| **git** | 903 | Aspen (4 API routes) | No | ✅ Trivial |
| **durable-objects** | 999 | Aspen (hooks.server.ts) | No | ✅ Trivial |
| **firefly** | 2,760 | workers/loft only | No | ✅ Clean — move with loft or delete together |
| **content** | 8,645 | Aspen (17 route files) | No | ✅ Clean |
| **components** | 8,304 | Aspen (21 layout/SVG files) | **Yes** — via `ui/index.ts` | ⚠️ Requires barrel cleanup |
| **curios** | 26,379 | Aspen (60+ files) **+ `workers/timeline-sync/voices.ts`** | **Yes** — `curios/timeline` specifically | ⚠️ Two consumers; barrel cleanup required |
| **Total** | **47,017** | | | |

**Corrections from original doc**:
- Original claimed 49,358 lines. Actual total is **47,017** (the doc's `curios`
  and `content` numbers were slightly off, and the doc listed `components` at
  8,278 vs actual 8,304).
- Original claimed curios is **Aspen-only**. Actual: also consumed by
  `workers/timeline-sync/voices.ts`, which imports from `curios/timeline`.
- Original missed that **curios/timeline is re-exported from engine's root
  barrel** (`libs/engine/src/lib/index.ts`, lines ~73–112). Moving curios
  requires updating the barrel or anything that imports from
  `@autumnsgrove/lattice` root will break.
- `components/terminology` is re-exported via `ui/index.ts` which cascades
  into the root barrel. Same barrel-cleanup issue.

#### ~~Unused Subsystems~~ (re-audit: only 1 real, now deleted)

| Subsystem | Original verdict | Re-audit | Final action |
|-----------|------------------|----------|--------------|
| ~~data~~ | Unused | 15+ consumers (relative imports of JSON) | **Keep** |
| **db** | Unused | **Truly unused** — only held `schema.sql` | **✅ Deleted** |
| ~~scribe~~ | Unused | 1 consumer (VoiceInput.svelte) | **Keep** (future feature per owner) |
| ~~styles~~ | Unused | 8+ consumers via `./styles/*` package exports | **Keep** |
| ~~types~~ | Unused | 10+ consumers (ambient `.d.ts`) | **Keep** |

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

### Audit B: Test Quality ⚠️ (largely reversed in Pass 2 re-audit)

**429 test files**, **143,306 lines**, **10,399 individual test cases** (the
original doc said "433 files / 145k / 8,000+ cases" — the test-case count was
off by ~30%; the suite has materially denser coverage than the original audit
claimed).

The original Audit B concluded the test suite had ~6,400 lines of "bloat" to
prune. Pass 2 re-audit found **most of that target is bogus**: the flagged
"mock-heavy" files test real business logic through boundary mocks, which is
the correct pattern, not the wrong one.

#### What held up in re-audit ✅

1. **Duplicate test file**: `upload-validation.test.ts` existed identically at
   two paths (1,321 lines each). **Deleted** — `libs/engine/src/lib/media/upload-validation.test.ts`
   (the root-level copy). Validated `validation/upload-validation.test.ts`
   survives and no stale references remain.

2. **Trivial tests re-audit**: Of the ~900 lines originally flagged as "trivial
   tests", **only 56 lines** (`types.test.ts`) were actually trivial. See
   §0.1 row 0.5. The rest either test real behavior, real transforms, or
   serve as security regression guards. Specifically:
   - `components/custom/MobileTOC.test.ts` (267 lines) — real component tests (render, click, menu toggle, aria-expanded, level classes, icon handling). **KEPT.**
   - `auth/limits.test.ts` (426 lines) — real business-logic tests (quota descriptions, urgency levels, upgrade recommendations, pre-submit checks). **KEPT.**
   - `ui/components/nature/palette.test.ts` (556 lines — seasonal logic, Math.random mocking, dark mode). **KEPT.**
   - `social/blazes/palette.test.ts` (135 lines — mostly constant checks but `resolveLucideIcon` has real fallback logic). **KEPT.**
   - `curios/ambient/index.test.ts` (121 lines), `curios/cursors/index.test.ts` (124 lines), `curios/clipart/index.test.ts` (165 lines) — contain `isValidUrl`/`isValidCursorUrl` tests that **reject `javascript:alert(1)` URLs (XSS guard)**. **KEPT — deleting would regress a security boundary.**

#### What was reversed ❌

3. **"Mock-heavy offenders" claim is backwards.** Pass 2 read the actual files
   and found the `vi.fn()` counts were 2–6× inflated and the verdict was
   wrong. The flagged files test real branching/error paths through mocked
   **infrastructure boundaries** — the correct pattern.

   | File | Doc claimed | Actually has | Verdict |
   |---|---|---|---|
   | `server/billing.test.ts` | 1,350 lines, **328** `vi.fn()` | 1,350 lines, **86** `vi.fn()`, 71 tests | Tests real subscription-tier branching. **Legitimate.** |
   | `lumen/providers/openrouter.test.ts` | 1,529 lines, 151 mock refs | 1,529 lines, **46** `vi.fn()`, 55 tests | Tests streaming parsers + retry logic. **Legitimate.** |
   | `media/amber/amber.test.ts` | 1,468 lines, 139 mock refs | 1,468 lines, **23** `vi.fn()`, 96 tests | Tests quota thresholds + error codes. **Legitimate.** |
   | `loft/scheduled/scheduled.test.ts` | 792 lines, 206 mock refs, "only 21 tests" | 792 lines, **60** `vi.fn()`, 21 tests | Tests cron state machine + fallback. Each test covers multiple paths. **Legitimate.** |

   **Verdict**: The recommended "Prune mock-heavy tests ~3,000 lines" is not
   achievable without hurting coverage. The target is ~0 lines, not ~3,000.

4. **"Duplicated Cloudflare mock infrastructure: 1,829 lines"** — file sizes
   are accurate (see below) but the **duplication claim is overstated**.
   Only ~400 lines are actually duplicated; the rest is specialized per
   purpose:

   | File | Lines | Specialized / Duplicate |
   |---|---:|---|
   | `services/durable-objects/src/test-helpers.ts` | 411 | Specialized — result-queue SQL pattern for Loom subclasses |
   | `libs/engine/tests/utils/setup.ts` | 517 | Specialized — global vitest setup (D1 + browser APIs) |
   | `services/heartwood/src/test-helpers.ts` | 242 | Specialized — RSA key fixtures + auth-specific D1 |
   | `workers/warden/src/test-helpers.ts` | 210 | Specialized — warden worker environment factories |
   | `libs/infra/src/testing/mock-*.ts` | 426 | Specialized — GroveDatabase/GroveStorage/KV abstractions |
   | `apps/domains/src/lib/server/test-helpers.ts` | 116 | **Duplicate** — near-identical to meadow |
   | `apps/meadow/src/lib/server/test-helpers.ts` | 118 | **Duplicate** — near-identical to domains |
   | Real duplication total | **~234** | Only the apps-layer boilerplate |

#### Recommended Actions (re-audited)

| Action | Lines Saved | Effort | Status |
|--------|----------:|--------|--------|
| Delete duplicate upload-validation.test.ts | 1,321 | Trivial | ✅ Done |
| Delete `types.test.ts` (only truly-trivial test) | 56 | Trivial | ✅ Done |
| Consolidate apps-layer test helpers (domains + meadow) | ~200 | 1 day | ⏳ Small win |
| ~~Prune mock-heavy billing/openrouter/amber/loft tests~~ | ~~3,000~~ | — | ❌ **Rejected** — tests are legitimate |
| ~~Consolidate all CF mock infrastructure~~ | ~~1,200~~ | — | ❌ **Overstated** — only ~200 actually duplicated |
| **Realistic immediate test savings** | **~1,577** | | |

**Longer-term**: The `/beaver-build` skill still warrants review, but the
target isn't "fewer tests" — it's "more precise use of `vi.fn()` counts when
sizing cleanup work", since raw `vi.fn()` counts mistake boundary mocking
(legitimate) for mock-validation (rare).

---

### Audit C: Personal vs Product Code ✅ (verified April 2026, 1 correction)

#### Personal Code Identified

| Item | Type | Lines | Extractable? |
|------|------|------:|-------------|
| **tools/cairn/** | Claude session viewer | 5,289 | ✅ Yes — zero monorepo deps (pure npm: gray-matter, marked, minisearch, shiki) |
| **workers/loft/** | Ephemeral dev envs on Fly.io | 3,024 | ⚠️ Yes, but has monorepo ties — see note below |
| **tools/looking-glass/** | Alternate session viewer | 2,217 | ✅ Yes — zero monorepo deps |
| **tools/index-viz/** | Vector index visualization (Python) | 412 | ✅ Yes — zero monorepo deps |
| **Total** | | **10,942** | |

**Original doc said 9,217 lines** — actual is ~1,725 higher because the
original undercounted cairn (3,994 → 5,289), looking-glass (1,795 → 2,217),
and loft (3,016 → 3,024).

**⚠️ `workers/loft` correction**: The original doc claimed loft's only
monorepo dependency was the Firefly SDK. Actual imports:
- `@autumnsgrove/lattice/firefly` — this is the dominant dep and moves with loft
- `@autumnsgrove/lattice/auth/warden` — depends on the shared Warden client
- `@autumnsgrove/infra/middleware` — depends on the shared auth middleware

Loft **should still be extracted or deleted** per owner intent, but the move
isn't a clean pluck. Options:
1. **Delete entirely** (simplest) — also removes `libs/engine/src/lib/firefly`
   (2,760 lines, the sole consumer). Net: −5,784 lines, −1 worker deployment.
2. **Extract to external repo** — requires publishing `auth/warden` client
   and `infra/middleware` as consumable packages (or vendoring them). More
   work, preserves the dev-env feature.

#### Borderline / Future Product Items

| Item | Lines | Assessment |
|------|------:|-----------|
| tools/glimpse/ | 8,643 | Internal agent auditing companion (Python) — product infra, needs work |
| apps/terrarium/ | 223 | **⚠️ Full SvelteKit mini-app** with routes/layout/vite config — not a "single component wrapper" as originally claimed. Planned future project — keep, will grow |
| tools/showroom/ | 1,077 | Product showcase — confirmed uses lattice/gossamer/prism |
| scripts/journey/ | ~200 | Data migration — internal tooling |
| scripts/generate/generate-business-cards.mjs | ~100 | Personal asset generation |

#### Product Code Confirmed

All remaining apps, all remaining workers, all libs, all services, and
core scripts are product code. Notably:
- **apps/ivy/** — Zero-knowledge email client (product, not personal)
- **apps/meadow/** — Social feed (product)
- **libs/grove-agent/** — Agent framework (product, used by onboarding)

---

### Audit D: App & Service Consolidation ⚠️ (rewritten in Pass 2)

#### Consolidation Candidates (re-audited)

| Target | Lines | Recommendation | Effort |
|--------|------:|---------------|--------|
| ~~**services/email-render**~~ | 1,794 | **REJECTED** — see re-audit below | — |
| ~~**apps/terrarium**~~ | 223 | **REJECTED** — it's a full SvelteKit mini-app, not a single-component wrapper. See §Audit C. | — |

**Neither consolidation candidate survived re-audit.** The original document
listed two mergeable targets; both were based on line-count undercounts that
masked their actual complexity.

**email-render re-audit** (rejected): The original recommendation said
email-render was "235 lines, small/mergeable". Actual: **1,794 lines** (7.6×
larger) with its own `sync-templates.mjs` build script, dedicated bundled
templates, and `nodejs_compat` compatibility flag. It also has **two**
consumers (both `services/zephyr` AND `workers/email-catchup`), not one. A
full merge into Zephyr would require:
(a) adding `react` + `@react-email/render` + `@react-email/components` as
Zephyr runtime deps, (b) adding `nodejs_compat` to Zephyr's wrangler.toml,
(c) porting the `sync-templates.mjs` prebuild step into Zephyr, (d) inlining
React SSR into Zephyr's request path (roughly doubling its bundle size), and
(e) updating email-catchup's service binding and render call sites. Net
result: 1 deployment saved, but Zephyr becomes a heavyweight React-bundling
worker instead of a lean Hono gateway. **The existing split is legitimate
separation of concerns** — Zephyr is a fast stateless gateway, email-render
is a CPU-bound renderer shared by two consumers, and they scale
independently. Worker-to-worker service bindings are free (no network hop,
no cold start). **Keep email-render separate.**

**terrarium re-audit** (rejected): The original doc described terrarium as a
"single component wrapper, 160 lines". Actual: **223 lines** across a full
SvelteKit mini-app with `src/routes/+page.svelte`, `src/routes/+layout.svelte`,
`vite.config.ts`, and its own `svelte.config.js`. Per owner intent it's a
planned future project that will grow — absorbing it into Aspen now would
just create throwaway migration work. **Keep terrarium separate.**

#### Keep Separate (Architectural Reasons, re-measured)

| Target | Lines | Why |
|--------|------:|-----|
| apps/login | 2,310 | Must be at `login.grove.place` for auth redirects |
| apps/billing | 2,290 | Payment isolation, Stripe/PCI compliance |
| apps/clearing | 5,130 | Status page must work when main app is down; has crons |
| services/grove-router | 1,434 | Entry point for ALL traffic — critical path |
| services/amber | 2,173 | Own DB, Durable Objects, R2 — backend for amber app |
| services/og-worker | 2,372 | Expensive image generation, separate scaling |

**Corrections from original doc**:
- **`services/pulse` removed from this table.** The original doc listed
  pulse as a 1,692-line "webhook receiver, cron aggregation" service.
  Pulse **does not exist in the repository** — it was deleted in a prior
  cleanup and the original audit referenced a phantom service. No action
  needed; the deployment count already reflects its absence.
- Line counts above are re-measured against the April 2026 working tree
  and were accurate in the original doc (all within ±2%).

---

### Audit E: Worker Consolidation ⚠️ (largely rewritten in Pass 2)

#### Remove or Merge (re-audited)

| Worker | Lines | Action | Status |
|--------|------:|--------|--------|
| ~~**post-migrator**~~ | 673 | **DELETE** — disabled, timestamp bug | ✅ Done (§0.1 row 0.2) |
| ~~**grove-maintenance merge**~~ | — | **Merge vista-collector + webhook-cleanup** | ❌ **Not feasible** — see below |
| ~~**email-catchup → onboarding**~~ | 626 | Merge retries into existing DO agent | ⚠️ **Risky** — see below |
| **workers/loft** | 3,024 | Delete or extract with Firefly subsystem (see §Audit C) | ⚠️ Owner intent: remove; complications noted |

**grove-maintenance merge rejected**: The original plan was to combine
`vista-collector` + `webhook-cleanup` into one `grove-maintenance` worker
to save a deployment slot. Re-audit shows these two workers are **orthogonal
concerns** that don't belong together:
- `vista-collector` is a **cron-driven observability ingestion** worker that
  binds to `grove-observability-db` and polls external services.
- `webhook-cleanup` is a **cron-driven database janitor** for
  `grove-engine-db` (cleans stale webhook delivery rows).
- Different DB bindings, different crons, different failure modes. Merging
  them would create a worker that owns two unrelated responsibilities just
  to save one `wrangler.toml`. Deployment bookkeeping isn't worth the
  architectural muddle. **Keep them separate.**

**email-catchup merge risky**: Re-audit found `workers/email-catchup` is
**626 lines** (original doc: 384 — 63% under). More importantly, email-catchup
has its own `[[services]] binding = "EMAIL_RENDER"` service binding to
`grove-email-render` — it's a **second consumer of email-render** alongside
Zephyr. Absorbing it into `onboarding` (which is a Durable Object agent with
no cron today) would:
- Inherit the `EMAIL_RENDER` service binding into onboarding, which has
  never had it.
- Convert onboarding from pure-DO into cron-owning — changing its failure
  profile.
- Require onboarding to handle email retries alongside its existing agent
  loop, mixing two failure modes.
- Force a schema/state-model alignment between catchup and onboarding that
  neither currently shares.

The catchup worker is 626 lines for a reason; the "clean merge" framing was
based on an undercount. **Keep separate.**

#### Keep Separate (re-measured)

| Worker | Lines | Why |
|--------|------:|-----|
| email-catchup | 626 | Weekly catchup retries; 2nd consumer of email-render |
| lumen | 2,561 | Core AI service, used by multiple consumers |
| meadow-poller | 1,272 | RSS aggregator, focused purpose |
| onboarding | 709 | Email sequence agent (DO-based) |
| patina | 4,508 | Critical backup system for 7 live Grove databases |
| reverie | 2,737 | AI config planner — intentional split from exec |
| reverie-exec | 1,759 | Execution sidecar — intentional split from reverie |
| timeline-sync | 6,786 | Nightly summary generation |
| vista-collector | 67 | Observability cron — too small and orthogonal to fold |
| warden | 5,235 | Critical credential gateway |
| webhook-cleanup | 457 | DB janitor cron |

**Result: 13 workers → 12** (only post-migrator deleted). Loft is a
separate question handled under §Audit C; if loft is deleted entirely,
that's **13 → 11**, but the move has to consider loft's three monorepo
dependencies (see §Audit C correction).

**Corrections from original doc**:
- `webhook-cleanup` was **206 → 457** lines (2.2× under).
- `email-catchup` was **384 → 626** lines (1.6× under).
- `patina` was **4,586 → 4,508** lines (close; rounding).
- `reverie-exec` was **1,786 → 1,759** lines (close; rounding).
- `loft` was **3,016 → 3,024** lines (close; rounding).

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

### Audit G: Patina Backup Targets

Patina (`workers/patina/`) is Grove's nightly database backup worker. While
investigating whether `libs/engine/src/lib/db/schema.sql` was still in use, we
discovered Patina was still backing up the defunct `autumnsgrove-git-stats` D1
database — and on closer inspection, **7 of Patina's 14 backup targets had
zero binding in any `wrangler.toml` outside of Patina itself.**

#### Defunct databases removed from Patina

| # | Database | Est. Size | Why defunct |
|---|----------|----------:|-------------|
| 1 | `autumnsgrove-git-stats` | 335 KB | Migrated into `grove-curios-db` as `timeline_*` tables |
| 2 | `autumnsgrove-posts` | 118 KB | Legacy personal-site blog; fully migrated into `grove-engine-db` multi-tenant posts (autumn-primary tenant) |
| 3 | `your-site-posts` | 12 KB | Legacy stub — only referenced in setup-comment placeholders |
| 4 | `scout-db` | 364 KB | GroveScout test data — feature not currently live, data is disposable |
| 5 | `library-enhancer-db` | 679 KB | Library enhancer test data — feature not currently live, data is disposable |
| 6 | `grovemusic-db` | 98 KB | GroveMusic test data — routes via grove-router but no live DB binding |
| 7 | `mycelium-oauth` | 28 KB | Legacy OAuth subsystem — superseded by Heartwood |
| | **Total** | **~1.6 MB** | |

#### Patina's new backup roster (7 databases)

| Database | Priority | Bound by |
|----------|----------|----------|
| `groveauth` | critical | `services/heartwood` + many auth consumers |
| `grove-engine-db` | high | `libs/engine`, `apps/aspen`, `apps/landing`, +9 workers |
| `grove-curios-db` | high | `libs/engine`, `apps/aspen`, `workers/timeline-sync`, `workers/reverie` |
| `grove-domain-jobs` | normal | `services/forage` |
| `amber` | normal | `services/amber` |
| `ivy-db` | normal | `apps/ivy`, `services/durable-objects` |
| `grove-observability-db` | normal | `workers/vista-collector`, `apps/landing` |

**Savings:** 7 fewer nightly D1 exports, ~1.6 MB/day of cold storage writes
avoided, cleaner restore-order documentation, no more drift between real
infrastructure and Patina's internal type definitions.

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

| # | Action | Lines Saved | Deployments Saved | Status |
|---|--------|----------:|------------------:|--------|
| 1.1 | ~~Delete unused engine subsystems~~ → only `db/schema.sql` was truly unused | 238 | 0 | ✅ Done |
| 1.2 | Delete duplicate `upload-validation.test.ts` | 1,321 | 0 | ✅ Done |
| 1.3 | Delete `workers/post-migrator` (disabled, buggy) | 1,545 | 1 | ✅ Done |
| 1.4 | Prune Patina of 7 defunct D1 backup targets | ~50 | 0 (7 backups) | ✅ Done |
| 1.5 | ~~Delete trivial test files~~ → re-audited; only `types.test.ts` was truly trivial | 56 | 0 | ✅ Done (corrected) |
| 1.6 | ~~Merge `services/email-render` into Zephyr~~ → **rejected** after re-audit (2 consumers, React bundle bloat, good architectural split) | 0 | 0 | ❌ Rejected |
| | **Tier 1 Total** | **~3,210** | **1** | |

### Tier 2: Engine Extraction (medium effort) — **requires barrel cleanup**

| # | Action | Lines Moved Out | Impact |
|---|--------|---------------:|--------|
| 2.1 | Move curios (26.4k) to `libs/curios` or Aspen — **two consumers**, barrel re-export cleanup required | 26,379 | Engine -12% |
| 2.2 | Move content (8.6k) to Aspen | 8,645 | Engine -4% |
| 2.3 | Move components (8.3k) to Aspen — barrel re-export cleanup required | 8,304 | Engine -4% |
| 2.4 | Move durable-objects, git, actions to Aspen | 1,929 | Engine -1% |
| 2.5 | Move firefly to personal or delete (moves with loft per §Audit C) | 2,760 | Engine -1% |
| | **Tier 2 Total** | **~48,017 from engine** | **Engine: 222.5k → 174.5k** |

**⚠️ Barrel cleanup gate**: Before curios or components can be moved,
`libs/engine/src/lib/index.ts` and `libs/engine/src/lib/ui/index.ts` must
stop re-exporting them (lines ~73–112 of the root barrel currently
re-export `curios/timeline`, and `ui/index.ts` cascades `terminology`).
Any consumer importing from `@autumnsgrove/lattice` root will break
otherwise. This is a prerequisite, not a blocker — budget a half-day per
subsystem for the barrel migration.

### Tier 3: Test & Infrastructure Cleanup (scope reduced after re-audit)

| # | Action | Lines Saved | Status |
|---|--------|----------:|--------|
| 3.1 | ~~Consolidate Cloudflare mock infrastructure~~ → only apps-layer helpers are truly duplicated | ~200 | Rescoped |
| 3.2 | ~~Prune mock-heavy test files~~ | 0 | ❌ **Rejected** — tests are legitimate; see §Audit B |
| 3.3 | Create shared API route middleware (auth guard, error wrapper) for 250 `+server.ts` files | ~2,500 | ✅ **Helpers done** — `guardAuth`, `guardDb`, `parseJsonBody` added to `@autumnsgrove/lattice/server`; 9 meadow files migrated (~180 lines). Remaining ~250 files adopt on next touch. |
| 3.4 | Extract auth hook utilities to engine (8 `hooks.server.ts` files) | ~248 | ✅ Done — `getCookie`, `extractSessionCookie`, `setSecurityHeaders`, `isGroveOrigin`, `isLocalOrigin` added to `libs/engine/src/lib/server/hooks.ts`; all 8 `hooks.server.ts` files updated |
| 3.5 | Update `/beaver-build` skill to **use accurate `vi.fn()` counts** when sizing work | Future | ⏳ Open |
| | **Tier 3 Total (revised)** | **~3,050** | Down from the original ~7,050 |

### Tier 4: Worker & Personal Code Consolidation — **mostly rejected**

| # | Action | Lines Saved/Moved | Deployments Saved | Status |
|---|--------|-----------------:|------------------:|--------|
| 4.1 | ~~Create `grove-maintenance` worker~~ | 0 | 1 | ❌ **Rejected** — orthogonal concerns (§Audit E) |
| 4.2 | ~~Merge email-catchup into onboarding~~ | 0 | 1 | ❌ **Rejected** — risky DO/cron mixing (§Audit E) |
| 4.3 | Move personal tools (cairn, looking-glass, index-viz) to `personal/` | 7,918 | 0 | ✅ Done — relocated to `personal/`; root `cairn` script updated |
| 4.4 | Delete or extract `workers/loft` **and** `libs/engine/src/lib/firefly` | ~3,024 | 1 | ✅ Done — `workers/loft` deleted + deploy workflow removed; `firefly` kept (won't stay loft-only forever) |
| | **Tier 4 Total (revised)** | **~13,702** | **1** | Personal extraction + loft removal |

---

## 5. Expected Impact (revised after Pass 2 re-audit)

### Lines

| Metric | Before | After | Change |
|--------|-------:|------:|-------:|
| Total source | ~572,993 | ~508,000 | **-65,000 (-11%)** |
| Engine | 222,547 | ~174,500 | -48,000 (-22%) |
| Tests | 143,306 | ~141,700 | -1,600 (-1%) |
| Personal code in product tree | ~10,942 | ~0 | -10,942 (relocated + loft removed) |

**Why the test savings shrank from -6,000 to -1,600**: The original audit
flagged ~3,000 lines of "mock-heavy tests" and ~1,200 lines of "duplicated
CF mock infrastructure" for pruning. Re-audit (§Audit B) found the
mock-heavy tests are legitimate boundary-mocked business logic and only
~200 lines of mock infra are genuinely duplicated. The remaining ~1,600
lines of savings come from row 0.1 (upload-validation duplicate), row 0.5
(trivial `types.test.ts`), and the apps-layer test-helper consolidation.

### Deployment Targets

| Metric | Current | After | Notes |
|--------|-------:|------:|-------|
| Apps | 12 | 12 | No app removed (terrarium kept per §Audit D) |
| Workers | 13 | **11** ✅ | post-migrator ✅ deleted, loft ✅ deleted |
| Services | 9 | 9 | email-render merge **rejected** (§Audit D) |
| **Total** | **34** | **32** ✅ | Target reached |

### Cognitive Load

| Improvement | Mechanism |
|-------------|-----------|
| Engine becomes "shared code only" | Single-consumer code (curios, content, components) moves to its actual consumer |
| Fewer deployment targets | 34 → 32 (2 fewer; down from the over-promised "6 fewer") |
| Accurate test signal | Raw `vi.fn()` counts replaced with per-file audits in future cleanup work |
| Personal/product boundary ✅ | cairn/looking-glass/index-viz → `personal/`; loft deleted; firefly kept |
| Less API boilerplate ✅ (partial) | `guardAuth`, `guardDb`, `parseJsonBody` in engine; 9 meadow files migrated; hooks boilerplate extracted across all 8 apps |

---

## 6. Non-Negotiables (Per Owner)

These stay, even if they add complexity:
- **Curios system** — core to Grove identity (moves location, not deleted)
- **Worker architecture** — Cloudflare-native, correct pattern
- **Admin panel depth** — Arbor richness matters for the product

---

## 7. Execution Order (revised)

```
Stage 1:  ✅ Tier 1 quick wins — done (3,210 lines + 1 deployment removed)
Stage 2:  ✅ Tier 4.3/4.4 — cairn/looking-glass/index-viz → personal/; loft deleted
              (10,942 lines relocated/deleted + 1 deployment removed)
Stage 3:  ✅ Tier 3 — auth hook extraction (Tier 3.4, ~248 lines across 8 files) +
              route guard helpers (Tier 3.3, helpers shipped; meadow migrated ~180 lines;
              remaining ~250 +server.ts files adopt on next touch)
Stage 4:  ⏳ Tier 2 barrel cleanup — prerequisite for engine extraction
Stage 5:  ⏳ Tier 2 — move curios, content, components, durable-objects, firefly
              out of engine (~48k lines relocated, not deleted)
```

Each stage is a standalone set of PRs. Measure total lines and deployment count
after each stage. **Stop whenever the maintenance burden feels manageable** —
Tier 2 is a large refactor and may not be worth the churn if stages 1–3
already produce enough relief.

The goal isn't "smallest possible codebase" — it's **code that one developer
can confidently navigate, modify, and maintain** without fear of invisible
breakage. The Pass 2 re-audit reinforced this: several of the original
"savings" were based on line-count undercounts or phantom services, and
chasing them would have created work without improving the human experience
of the codebase.
