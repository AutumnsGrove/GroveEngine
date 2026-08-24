# Handoff — Plant local dev + signup flow (2026-08-24)

Start here tomorrow. This describes what got built, what got fixed, what's
still unverified, and what to expect from Autumn's next pass (a wave of
small UI/UX polish notes on the signup flow itself, now that it's actually
testable).

## Why this session happened

Autumn wanted to polish the Plant signup flow (landing → profile → plans →
success) but had no way to run it locally — Plant and Landing were never
wired into `scripts/dev-stack.sh`, and Google OAuth can't be exercised
offline. The ask: a local demo-mode bypass (click a button, get a
placeholder email, walk the real signup code paths) mirroring the
`DEMO_MODE_SECRET` pattern Aspen already has for Arbor.

That surfaced three real, previously-invisible bugs — not local-only
quirks, actual defects that were blocking anyone from ever exercising this
flow outside production. All are now fixed and merged into both `main` and
`beta`.

## What's committed (main + beta, both pushed and in sync)

1. **`feat(plant): local demo-mode signup bypass + dev-stack wiring`**
   (`c6790130c` on main)
   - `apps/plant/src/routes/auth/demo/+server.ts` — dev-only endpoint,
     gated behind `DEMO_MODE_SECRET` (unset/inert in production). Reuses
     the *real* `resolveOnboarding`/`upsertOnboarding` functions from the
     OAuth callback service, so a demo signup produces an identical
     `user_onboarding` row to a real Google sign-in — just with a
     generated `demo+<id>@grove.place` email instead of a Google identity.
   - "Skip sign-in (Dev Mode)" button on Plant's homepage.
   - Green `DemoBadge` chip (reused from Aspen's component) shown in
     Plant's header throughout the flow while demo mode is active — same
     `grove_demo_mode` cookie mechanism as Aspen.
   - `scripts/dev-stack.sh`: Plant (port 5175) and Landing (port 5174) now
     run as their own `wrangler dev` processes (like Heartwood already
     does), sharing Aspen's local D1/KV via `--persist-to`. Landing's
     build failure is now a warning, not a hard stop — see "Known issue:
     Landing" below.

2. **`perf(shade): use global wrangler instead of npx in dev-stack.sh`**
   (`53051509b`)
   - Swapped all `npx wrangler` → bare `wrangler` (repo pins `^4.76.0`;
     Autumn's global install was upgraded to 4.125.0 to match). Full
     stack boot went from ~6 minutes to ~100 seconds.

3. **`fix(plant): local wrangler dev CSRF + Wanderer tenant creation bugs`**
   (`f0edc63f3`) — **the big one, two real bugs:**

   - **CSRF blocked every state-changing POST locally.** `wrangler dev`
     simulates Plant/Landing's production route (`plant.grove.place/*`
     from `wrangler.toml`) by rewriting the `Host`/`Origin` headers the
     app sees to the production hostname, over plain HTTP. Plant's CSRF
     check (`validateCSRF` in `libs/engine/src/lib/utils/csrf.ts`)
     correctly requires HTTPS for any non-localhost origin, so profile
     save, plan selection, etc. all 403'd with a generic "Cross-site
     request blocked" — which the client then displayed as an even more
     generic "Something went wrong. Please try again." (see
     `apps/plant/src/lib/submit-form.ts:69`, the fallback used when a
     response has no `.error` field).
     **Fix:** `--local-upstream localhost` on Plant and Landing's
     `wrangler dev` invocations in `dev-stack.sh`. Also pinned explicit
     `--inspector-port` per process (9229/9230/9231/9232) — without it,
     processes starting close together intermittently fail to bind with
     `Address already in use`.

   - **Wanderer (free tier) tenant creation was broken everywhere except
     production.** `tenants.plan` and `platform_billing.plan` both have
     `CHECK` constraints that never got `'wanderer'` added when the free
     tier was renamed from `'free'`. Migrations `111`/`112` documented
     this exact bug back in April but shipped as no-ops — the original
     fix attempt assumed `PRAGMA foreign_keys=OFF` would let a
     rename-and-recreate migration through; it doesn't (D1 wraps a
     migration file in one implicit transaction, so the pragma is a
     no-op), and `tenants` has 27 dependent tables via FK, so the
     original author correctly bailed rather than risk it. Someone hand-
     patched **production** directly, outside migration history — so this
     only ever blocked *fresh* database bootstraps (local dev, CI, any
     future prod rebuild from migration history alone).
     **Fix:** migrations `116`/`117`. Two SQLite tricks were tried and
     ruled out first (`PRAGMA foreign_keys=OFF` — no-op mid-transaction;
     `PRAGMA writable_schema` direct edit — D1 rejects with
     `SQLITE_AUTH`). What actually works: build the corrected table under
     a temp name, copy data in, drop the original, rename the temp table
     into the vacated name — the 27 dependent tables keep referencing the
     unchanged literal name `"tenants"` throughout, so their FK clauses
     never need touching. **Verified twice**: once against the live
     session DB, once from a completely fresh `dev-stack.sh reset`
     bootstrap. `PRAGMA foreign_key_check` came back clean (zero
     violations) both times.

4. **`fix(plant): tenant blog/admin links point at live grove.place in
   local dev`** (`4c8657122`) — found by Autumn clicking through live.
   - The "Visit My Blog" / "go to your admin dashboard" links on
     `success`, `tour`, and `comped` were hardcoded to
     `https://{subdomain}.grove.place`. Locally that's the *real*
     production site, which has never heard of a locally-created demo
     tenant — clicking through silently bounced to a real
     `login.grove.place` flow instead of the local Aspen instance being
     tested.
   - **Fix:** new `apps/plant/src/lib/tenant-url.ts` — shared
     `buildBlogUrl`/`buildAdminUrl` helpers that branch on
     `localhost`/`127.0.0.1`. Locally they point at Aspen's fixed dev
     port (`localhost:5173`) using the `?subdomain=` simulation Aspen's
     own `hooks.server.ts` already supports (`extractSubdomain()`,
     option 2). In production, unchanged.
   - **⚠️ Not yet visually verified.** `svelte-check` passes and the logic
     was read carefully, but this couldn't be proven by curl — `tenant`
     state is set by client-side JS polling `/success/check`, which curl
     never executes. **First thing to check tomorrow**: click "Visit My
     Blog" for real in a browser and confirm it lands on
     `localhost:5173/?subdomain=<name>` showing the new tenant's blog,
     and that the admin dashboard link lands on `localhost:5173/arbor?subdomain=<name>`.

## How to resume tomorrow

```bash
./scripts/dev-stack.sh full
```

Takes ~100 seconds now (was ~6 minutes before the wrangler fix). Then:

- **Aspen**: `http://localhost:5173`
- **Plant**: `http://localhost:5175` — click **"Skip sign-in (Dev Mode)"**
  on the homepage, or use the `Plant demo signup:` URL the script prints
  at the end
- **Heartwood**: `http://localhost:8787` (auth API, underneath)
- **Landing**: usually *not* running — see known issue below

Full signup path to test: demo button → profile (fill name/color/interests)
→ plans (pick **Wanderer** — the only tier that creates a tenant
immediately without needing Stripe/billing-api running) → success → click
"Visit My Blog" / "Take the Tour".

If ports are stuck/weird from a previous session, don't fight it —
`ps aux | grep -E "wrangler|workerd" | grep -v grep | grep -v esbuild | awk '{print $2}' | xargs kill -9`
then relaunch. Tonight's session burned a lot of time on zombie `wrangler
dev`/`workerd` processes surviving `pkill -f` pattern matches; killing by
explicit PID is what actually worked.

## Known issue: Landing doesn't build locally (not fixed, not urgent)

`apps/landing`'s `/knowledge/exhibit/sister-museum` page is `prerender =
true` and fetches from `raw.githubusercontent.com` at build time. In this
session's sandboxed environment (no outbound network during build) that
fetch 500'd and failed the whole Landing build. `dev-stack.sh` already
treats this as non-fatal — it warns and skips Landing, Aspen and Plant
still come up fine. Autumn confirmed this is a known thing and said
she's planning to remove the sister-museum page eventually. **Not
something to fix reactively** unless it comes up again on a real network.

## What to expect next session

Autumn said explicitly: there will be **a lot of small comments** on
little things that need cleaning up in the signup flow now that it's
actually clickable end-to-end for the first time. Expect a punch list
covering things like spacing, copy, button placement, step-indicator
behavior, error message wording, etc. — normal UI polish work, not
architecture. Come in ready to triage a list rather than dig for bugs;
the big structural bugs (CSRF, tenant creation, dead links) are the ones
this session found and fixed.

Also worth doing early next session, before diving into polish:
- Visually confirm the tenant-url.ts fix (see ⚠️ above)
- Click all the way through Wanderer signup → tour → arbor at least once
  in an actual browser, not just via curl, to catch anything curl can't
  see (client-side reactivity, layout, visual bugs)

## Files touched this session

```
apps/plant/src/routes/auth/demo/+server.ts        (new)
apps/plant/src/routes/+page.server.ts              (new)
apps/plant/src/routes/+page.svelte                 (dev-mode button)
apps/plant/src/routes/+layout.server.ts             (isDemoMode)
apps/plant/src/routes/+layout.svelte                 (DemoBadge)
apps/plant/src/app.d.ts                             (DEMO_MODE_SECRET type)
apps/plant/src/lib/tenant-url.ts                    (new)
apps/plant/src/routes/success/+page.svelte
apps/plant/src/routes/tour/+page.svelte
apps/plant/src/routes/comped/+page.svelte
apps/plant/.dev.vars                                (new, gitignored — DEMO_MODE_SECRET)
scripts/dev-stack.sh
libs/engine/migrations/116_tenants_plan_check_fix.sql       (new)
libs/engine/migrations/117_platform_billing_plan_check_fix.sql (new)
```
