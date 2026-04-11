# CI Punt List

Real pre-existing type/test errors that the new `validate-deployments` pipeline
surfaced during PR #1554 setup but we deferred fixing. Each entry is actionable
as-is; pick one, reproduce locally, fix, commit.

**Status at PR #1554 merge:** the validation pipeline is live and correct.
These errors fail locally via `.githooks/pre-push` and fail on PRs via the
`validate-deployments.yml` workflow. They do NOT affect production deploys
today because most of them have never run through a typecheck gate before —
the deploy workflows skip typecheck for several packages.

## How to reproduce any single one

```bash
# From the repo root:
pnpm install
pnpm run build --filter=libs/foliage
pnpm run build --filter=libs/gossamer
pnpm run package --filter=libs/engine
pnpm run package --filter=libs/vineyard

# Then for the specific target:
cd <path>
pnpm exec svelte-kit sync       # only for apps/ (SvelteKit)
pnpm exec tsc --noEmit          # or `pnpm check` for SvelteKit apps
```

Or just run `node scripts/pre-push/validate.mjs` from the repo root — it does
all of the above automatically and scopes to affected shims.

---

## Class A — Real class-property errors (pre-existing, high-value fixes)

These are the highest-value fixes. They look like Cloudflare Workers `DurableObject`
subclasses that were written against an older `@cloudflare/workers-types` and
never updated, or classes that lost their explicit property declarations during
a refactor.

### services/amber (amber-worker) — `src/services/ExportJobV2.ts`

24 errors. Class `ExportJobV2` accesses `this.sql`, `this.env`, `this.log` but
TypeScript doesn't see them on the class type.

```
ExportJobV2.ts(387,8)  TS2339: Property 'sql' does not exist on type 'ExportJobV2'.
ExportJobV2.ts(403,8)  TS2339: Property 'sql' does not exist on type 'ExportJobV2'.
ExportJobV2.ts(411,15) TS2339: Property 'env' does not exist on type 'ExportJobV2'.
ExportJobV2.ts(417,15) TS2339: Property 'env' does not exist on type 'ExportJobV2'.
ExportJobV2.ts(443,28) TS2339: Property 'env' does not exist on type 'ExportJobV2'.
ExportJobV2.ts(457,38) TS7006: Parameter 'file' implicitly has an 'any' type.
ExportJobV2.ts(459,32) TS2339: Property 'env' does not exist on type 'ExportJobV2'.
ExportJobV2.ts(477,11) TS2339: Property 'log' does not exist on type 'ExportJobV2'.
ExportJobV2.ts(495,9)  TS2339: Property 'log' does not exist on type 'ExportJobV2'.
ExportJobV2.ts(520,8)  TS2339: Property 'log' does not exist on type 'ExportJobV2'.
… (15 more identical-pattern errors through line 670)
```

**Likely fix:** either extend the correct DurableObject base class, add
explicit `protected env: Env; protected sql: SqlStorage; protected log: Logger;`
declarations, or apply the `ctx.storage.sql` / `ctx.env` pattern if it's meant
to use the new DO interface.

### services/durable-objects — `src/sentinel/SentinelDO.ts`

20 errors, same pattern as amber-worker. `SentinelDO` accesses `this.state_data`,
`this.env`, `this.log`, `this.sockets`.

```
SentinelDO.ts(444,13) TS2339: Property 'state_data' does not exist on type 'SentinelDO'.
SentinelDO.ts(450,26) TS2339: Property 'state_data' does not exist on type 'SentinelDO'.
SentinelDO.ts(450,53) TS7006: Parameter 'a' implicitly has an 'any' type.
SentinelDO.ts(450,56) TS7006: Parameter 'b' implicitly has an 'any' type.
SentinelDO.ts(451,25) TS2339: Property 'state_data' does not exist on type 'SentinelDO'.
… (15 more)
SentinelDO.ts(502,8)  TS2339: Property 'sockets' does not exist on type 'SentinelDO'.
SentinelDO.ts(504,8)  TS2339: Property 'log' does not exist on type 'SentinelDO'.
```

### services/forage — `src/durable-object.ts`

23 errors. `SearchJobDO` class — same missing `this.log`, `this.env`, `this.sql`
pattern. Fix probably mirrors whatever fixes amber-worker and sentinel.

```
durable-object.ts(832,9)  TS2339: Property 'log' does not exist on type 'SearchJobDO'.
durable-object.ts(834,9)  TS2339: Property 'log' does not exist on type 'SearchJobDO'.
durable-object.ts(901,8)  TS2339: Property 'log' does not exist on type 'SearchJobDO'.
durable-object.ts(966,29) TS2339: Property 'env' does not exist on type 'SearchJobDO'.
durable-object.ts(966,49) TS2339: Property 'env' does not exist on type 'SearchJobDO'.
… (18 more)
```

---

## Class B — tsconfig module/moduleResolution mismatch

All SvelteKit app tsconfigs have `moduleResolution: bundler` but a `module`
setting that's incompatible (needs `preserve`, `es2015+`, or removal of the
conflicting option). This is a single-line fix per file but affects 5 apps.

```
apps/amber/tsconfig.json(12,23)  TS5095: Option 'bundler' can only be used when 'module' is set to 'preserve' or to 'es2015' or later.
apps/billing/tsconfig.json(12,23)  same
apps/domains/tsconfig.json(12,23)  same
apps/ivy/tsconfig.json(13,23)    same
apps/login/tsconfig.json(12,25)  same
apps/meadow/tsconfig.json(12,23)  same
apps/plant/tsconfig.json(12,23)  same
```

**Fix:** in each tsconfig.json, change `"module": "..."` to `"module": "preserve"`
(or `"es2022"`) to match the `"moduleResolution": "bundler"` setting.

---

## Class C — Implicit-any parameters (quick fixes)

Small, low-risk fixes. Add explicit types.

```
workers/email-catchup/worker.ts(184,39) TS7006: Parameter 'e' implicitly has an 'any' type.
workers/email-catchup/worker.ts(377,31) TS7006: Parameter 's' implicitly has an 'any' type.
workers/email-catchup/worker.ts(378,33) TS7006: Parameter 's' implicitly has an 'any' type.

workers/lumen/src/lib/rate-limit.ts(46,13) TS7006: Parameter 'ctx' implicitly has an 'any' type.

workers/onboarding/src/agent.ts(175,31) TS7006: Parameter 's' implicitly has an 'any' type.

workers/reverie/src/routes/domains.ts(22,36) TS7006: Parameter 'id' implicitly has an 'any' type.
```

---

## Class D — `unknown` typed values (need type guards or annotations)

```
workers/onboarding/src/onboarding.test.ts(71-89)  TS18046: 'sequence' is of type 'unknown'.
  (8 occurrences in this file — the test fixture needs a type annotation)

workers/reverie/src/routes/query.ts(56-58)  TS18046: 'def' is of type 'unknown'.
```

---

## Class E — Pre-existing CI failures from unrelated packages

These were failing on CI before PR #1554 and are unrelated to the deploy
validation pipeline. Included here for completeness so a future fix session
knows the landscape.

- **CI / Test: vineyard** — test failure in `libs/vineyard`, pre-existing
- **CI / Check: ivy** — pre-existing typecheck failure
- **CI / Check: aspen** — pre-existing, newly-visible because PR #1554
  added `apps/aspen` to `affected-packages.mjs`
- **CI / Check: subscription-digest** — pre-existing, newly-visible
  same reason

Reproduce each via `cd <path> && pnpm check` (or `pnpm test:run` for vineyard).

---

## Notes on what's NOT in this list

Errors that looked like `Cannot find module '@autumnsgrove/lattice/errors'`
(or other `/lattice/*` subpaths) during the initial run of `validate.mjs` were
**false positives** caused by the pre-push hook not building `libs/engine`
before typechecking. Commit `<hash>` in PR #1554 fixes the hook to build
foliage/gossamer/engine/vineyard first, which makes those errors disappear.
If you see any of those errors during a future run, it means the build step
failed or was skipped — check `node scripts/pre-push/validate.mjs` output
for the "build libs/engine" line.

## Suggested work order

1. **Class B (tsconfig fix)** — lowest risk, highest unlock value. 7 single-line
   edits. Will make 7 app typechecks work end-to-end.
2. **Class C + D (implicit any + unknown)** — quick wins, <30 min each.
3. **Class A (DurableObject class properties)** — highest-value but needs
   careful investigation of what base class / types should apply. One fix
   pattern likely applies to all three DOs (ExportJobV2, SentinelDO, SearchJobDO).
4. **Class E** — tackle when you have the context for each individual package.
