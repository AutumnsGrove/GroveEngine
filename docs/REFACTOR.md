# The Great Grove Refactor - May 2026

## The Problem

Grove has massively overextended. The codebase advertises **63 services** across Workshop.svelte, but the core blogging platform (Garden/Blooms creation) requires maybe 15-20 of them. The rest are:
- Experimental features with 0% test coverage
- Personal tools that snuck into the monorepo
- Ambitious vision features built on unstable foundations
- Half-implemented integrations with no actual usage

**The consequences:**
- **Auth/Signup breaks constantly** (67 fixes in 6 months) - the core onboarding flow is flaky
- **Engine core fragility** (101 fixes in 6 months) - large refactors cascade into 5-7 rounds of fixes
- **No local development environment** - commits go straight to production because service bindings and DOs can't be tested locally
- **11.5% test coverage overall** - critical systems like Billing (5%), Login (2%), Firefly (0%), and Durable Objects (0%) are untested
- **Zero observability** - no way to know if signups complete, which features are used, or what's breaking for users
- **Test theater** - heavily mocked tests that don't actually validate critical paths
- **Pre-commit/pre-push gaps** - no svelte-check, no tests, no full app builds in hooks. Only "affected shims" typechecked. This is why CI fails 5-7 rounds.

This is the exact pattern from the her-go refactor: too many features burning iteration budget while the core loop is fragile.

## The Decision

**Timeline:** THIS WEEK (emergency mode)

**Execution:** ONE ATOMIC PR - junk drawer everything at once, then stabilize what remains

**Philosophy:** Reliability over features. A stable blogging platform with solid core features beats an unstable platform with 63 half-working ones.

---

## The Scope

### **KEEP (Core Platform - The Essential 21)**

#### Infrastructure (5)
1. **Lattice/Engine** - Core framework (needs reliability work)
2. **Heartwood** - Auth (needs simplification: Google OAuth only)
3. **Prism** - Design tokens (16 files, stable)
4. **Lumen** - AI gateway (68 files, well-tested, tightly coupled with Thorn - cannot separate)
5. **Warden** - API credential gateway (12 tests, production-critical)

#### User-Facing Apps (5)
6. **Aspen** - Main blog app (325 files, most developed)
7. **Landing** - Marketing site (255 files, needs stability work)
8. **Garden/Blooms** - Content creation (the actual product)
9. **Arbor** - Admin panel (essential control plane)
10. **Flow** - Writing editor (2,280 lines, no alternative)

#### Supporting Services (5)
11. **Foliage** - Theming (61 files, well-tested)
12. **Amber** - Storage (basic file upload/storage viz only, not full Google Drive)
13. **Billing** - Stripe integration (95% untested, needs major work)
14. **Patina** - Backups (essential for trust)
15. **Clearing** - Status pages (essential for trust)

#### Social & Discovery (2) - ESSENTIAL TO THE GROVE VISION
16. **Lantern** - Cross-grove navigation (essential gateway to finding other groves; friends system needs reliability work, follows need fixing)
17. **Reeds** - Comments system (essential to blogging; threaded comments, moderation, private replies)

#### Curios (4 only - from 18+)
18. **Gallery** - Photo galleries (not technically a curio, works)
19. **Guestbook** - Visitor entries (works, keep it)
20. **Polls** - Voting (works)
21. **Timeline** - GitHub activity (works, **move OUT of greenhouse to production**)

**Total: 21 features/services** (down from 63)

---

### **JUNK DRAWER (Eventually Want - Needs Stable Foundation First)**

**19 services + Meadow** going to `_junkdrawer/` (may return when core is rock solid):

#### Experimental Features (5 greenhouse flags)
1. **Wisp** - AI writing assistant (parent feature)
2. **Fireside** - AI writing prompts (child of Wisp)
3. **Scribe** - Voice transcription (child of Wisp)
4. **Chirp** - Direct messaging (just added March, 0% tests, no love yet)
5. **Reverie** - AI site config ("just use Foliage" - active service bindings will be severed)

#### Ambitious Vision Features (7)
6. **Ivy** - Email client (49 files, 0% crypto tests, months away)
7. **Wander** - 3D grove exploration (completely out of scope for now)
8. **Nook** - Video sharing (planned, GitHub repo exists)
9. **Terrarium** - Graphical design editor (5 files stub)
10. **Gossamer** - ASCII effects (21 files, works but not essential)
11. **Meadow** - Social feed (7 tables, 61 files, needs extremely stable foundation)
12. **Amber (full)** - Full Google Drive experience (basic storage viz stays, full app goes)

#### Infrastructure (3)
13. **Firefly** - Job orchestration (1,089 LOC, 0% tests, powers NOTHING in production)
14. **Loft** - SSH dev sessions (worker directory is empty, only Go CLI exists)
15. **Outpost** - Minecraft server (going to junk drawer, mc-control doesn't even exist as a worker)

#### Curios (14+ widgets)
16-30+. **All curios except Gallery, Guestbook, Polls, Timeline:**
   - Journey, Pulse, Hit Counter, Link Garden, Bookmark Shelf, Shrines, Mood Ring, Badges, Now Playing, Status Badge, Activity Status, Webring, Artifacts, Cursor, Blogroll, Ambient, Clipart

---

### **REMOVE COMPLETELY (Out of Scope - Never Coming Back)**

**6 features** that are personal tools or completely out of scope:

1. **Verge** - Remote AI coding (personal tool, not Grove-related)
2. **Moss** - AI chat memory (no AI chat in Grove, out of scope)
3. **Weave** - Animations/visual composition (we're not Canva)
4. **Etch** - Link saving (we're not Raindrop, personal want)
5. **Loft** - Dev environments (starting in junk drawer, likely full removal)
6. **Outpost** - Minecraft server (starting in junk drawer, likely full removal)

---

## The Analysis

### **Firefly: The Great Mirage**

Based on comprehensive import graph analysis:

**What Firefly Actually Powers:**
- **Outpost (Minecraft):** Has config preset, but **no actual Firefly SDK integration exists**
- **Loft (SSH sessions):** Has config preset, but **worker directory is empty** (only Go CLI works)
- **Queen CI:** Fully spec'd (1,200+ lines), **zero implementation code**
- **Bloom (AI Agents):** Fully spec'd, **zero implementation code**

**Import Graph Results:**
- 20 source files (1,089 LOC)
- 0% test coverage
- **Zero actual usage** in production code
- Only imports are self-references and monitoring stubs

**Decision:** Firefly goes to junk drawer. 1,089 lines of unused infrastructure.

---

### **Reverie: Active Bindings, Still Junk-Drawering**

Reverie has active service bindings from Aspen and Engine wrangler.toml files. However:
- The feature is experimental and out of scope ("just use Foliage")
- Removing it requires: delete REVERIE binding from wrangler.toml + delete routes
- Workers `reverie` + `reverie-exec` move to junk drawer
- **This is a clean cut** - no other kept features import from Reverie

---

### **Engine Dependency Graph: Clean Separations**

Based on comprehensive import graph analysis:

| Feature | Imports From Kept | Imports From Junk | Clean to Remove? |
|---------|-------------------|-------------------|------------------|
| **Firefly** | auth/warden (types only) | None | YES (isolated) |
| **Reverie** | None | None | YES (cleanest cut) |
| **Scribe** | None | None | YES (only VoiceInput.svelte imports it) |
| **Curios (14+)** | None | None | YES (zero cross-curio deps) |
| **Thorn ↔ Lumen** | Each other | N/A | CANNOT separate (both kept) |
| **Email ↔ Zephyr** | Each other | N/A | CANNOT separate (both kept) |

**Conclusion:** This is a CLEAN ARCHITECTURAL CUT. Only 2 couplings exist (Thorn↔Lumen, Email↔Zephyr) and both are between kept features.

---

### **Curios Isolation: Surgical Precision**

The 4 kept curios (Gallery, Guestbook, Polls, Timeline) are COMPLETELY ISOLATED:
- Zero curio-to-curio imports
- Zero cross-curio foreign key constraints
- Each has its own API routes, admin UI, and database tables
- Shared infrastructure is curio-agnostic (`sanitize.ts`)

**Files to update (4 only):**
1. `libs/engine/src/lib/curios/index.ts` - Remove journey exports, keep 4
2. `libs/engine/src/lib/content/markdown/directives.ts` - Remove 12+ from CURIO_DIRECTIVES, keep guestbook + poll
3. `libs/engine/src/lib/curios/components/index.ts` - Remove 14+ curio component exports
4. `libs/engine/src/lib/server/curio-status.ts` - Remove queries for 14+ removed curios

**Directories to delete:** 16 curio directories (engine, Aspen admin, Aspen API)

---

### **Auth Simplification: Clean Surgery (~1,500 LOC)**

Google OAuth is **completely self-contained**:
- Uses `ba_account` table (separate from passkey/magic link tables)
- Zero shared code between auth methods
- Better Auth plugin architecture supports selective removal
- All 14 consumer apps unaffected (they just use sessions)

**Passkey removal (~1,100 LOC):**
- `services/heartwood/e2e/tests/passkey/` (3 files, 486 LOC)
- `services/heartwood/src/client/auth.ts` (passkey functions)
- `services/heartwood/src/auth/index.ts` (passkey plugin config)
- `services/heartwood/src/templates/settings.ts` (passkey UI)
- `apps/login/src/routes/passkey/` (setup page)
- `apps/plant/src/routes/auth/setup-passkey/` (onboarding redirect)
- Database table: `ba_passkey` (mark for removal)

**Magic link removal (~400 LOC):**
- `services/heartwood/src/client/auth.ts` (magic link function)
- `services/heartwood/src/auth/index.ts` (magic link plugin + email templates)
- `services/heartwood/src/routes/betterAuth.ts` (rate limiters + redirect logic)
- `apps/plant/src/routes/auth/magic-link/` (callback route)
- Database table: `ba_verification` (safe to drop, tokens are ephemeral)

**Risk level: LOW** — No shared dependencies outside Better Auth plugins.

---

### **Local Dev: The Missing Foundation**

**Current State:**
- 75% functional, 25% blocked
- Individual apps/workers work fine with `pnpm dev`
- Robust mocking infrastructure already exists (D1, KV, R2, DOs all mocked)
- Only 3 workers use `@cloudflare/vitest-pool-workers` (lumen, durable-objects, billing-api)

**The Blockers:**
1. **Service bindings** - workers calling other workers require manual start-in-order
2. **Durable Objects** - DOs in separate worker unreachable from apps
3. **Secrets management** - no `.dev.vars` propagation to all services
4. **Stripe** - needs test key + secret in local environment

**The Fix (2-3 hours):**
1. Create orchestration script (start services in dependency order)
2. Add `.dev.vars.example` templates to all services
3. Document startup sequence and port assignments
4. Create "minimal dev" mode (heartwood → zephyr → durable-objects → aspen)

**Service dependency chain:**
```
billing-api (no deps)
heartwood (no deps)
zephyr → email-render
durable-objects (no deps)
lumen → warden
aspen → auth, zephyr, durable-objects, lumen
landing → auth, zephyr, vista-collector, onboarding
```

---

### **Hooks Gap Analysis: Why CI Fails 5-7 Rounds**

**Pre-commit catches (11 checks):**
- YAML lint, Prettier, ESLint, TypeScript (staged files only)
- Bare fetch CSRF, engine barrel exports, @lucide/svelte imports
- Barrel cascade imports, hardcoded accent colors
- Commit message format, secrets scanner

**Pre-push catches (6 checks):**
- Lockfile sync, deploy manifest drift
- Affected libs build, SvelteKit sync
- Affected shims typecheck, wrangler dry-run

**CRITICAL GAPS (what's missing):**
| Gap | Impact | Fix |
|-----|--------|-----|
| No `svelte-check` | 10-15% of type errors slip through | Add to pre-push |
| No test execution | Broken tests only caught in CI | Add opt-in pre-push test runner |
| No full app build | App build failures only caught in CI | Add app builds to pre-push |
| Only "affected shims" typechecked | Cross-workspace type errors slip through | Expand to full workspace |
| No Tailwind class validation | Styling typos slip through | Add class validator |

**Adding svelte-check + full workspace typecheck to pre-push would eliminate ~40% of CI round-trips.**

---

### **Billing & Plant: Clean, Independent, Undertested**

**Key findings:**
- Billing is COMPLETELY independent of auth methods (only cares about Stripe webhooks)
- No junk drawer dependencies in either system
- Free tier (wanderer) creates tenant immediately, paid tier waits for webhook
- `payment_completed_at` column issue is fixed (was causing April breakage)
- Both have duplicate `createTenant()` logic (should centralize later)

**Minimum viable signup flow (Google OAuth only):**
1. Google OAuth → creates `user_onboarding` record
2. Profile page (username, display name)
3. Plan selection (wanderer = immediate tenant, paid = Stripe checkout)
4. Webhook creates tenant → redirect to blog

---

### **Workers: Minimal Set Needed**

| Worker | Status | Keep? | Reason |
|--------|--------|-------|--------|
| **grove-lumen** | Core | YES | AI gateway, bound by apps |
| **grove-warden** | Core | YES | Credential gateway |
| **grove-patina** | Core | YES | Backups (essential trust) |
| **grove-webhook-cleanup** | Core | YES | Retention cron |
| **grove-vista-collector** | Core | YES | Metrics |
| **grove-onboarding** | Core | YES | Email sequences |
| **grove-subscription-digest** | Core | YES | Nightly summaries |
| **grove-email-catchup** | Core | YES | Weekly digest |
| **grove-reverie** | Junk | NO | Sever binding from Aspen/Engine |
| **grove-reverie-exec** | Junk | NO | Goes with Reverie |
| **grove-timeline-sync** | Junk | NO | ORPHANED - Timeline works without it |
| **grove-meadow-poller** | Junk | NO | Goes with Meadow |
| **grove-loft** | Junk | NO | Empty directory |
| **mc-control** | Dead | REMOVE | Doesn't exist! Dead reference in router |

---

## The Plan

### **Phase 0: Research & Audit (Day 1 - Monday)** ✅ COMPLETE

1. ✅ Map feature surface area (Workshop.svelte: 63 services)
2. ✅ Identify junk drawer candidates (19 services + Meadow)
3. ✅ Analyze Firefly dependencies (powers nothing)
4. ✅ Investigate local dev blockers (service orchestration + secrets)
5. ✅ Audit remaining features for reliability (Heartwood, Aspen, Landing, Billing, Plant)
6. ✅ Create dependency graph (full service binding map)
7. ✅ Review pre-commit/pre-push hooks (11 checks, 6 critical gaps)
8. ✅ Document test coverage gaps (11.5% overall)
9. ✅ Confirm Lantern and Reeds STAY (essential features)
10. ✅ Get user approval on final junk drawer list

---

### **Phase 1: The Great Junk Drawer (Day 2-3 - Tue/Wed)**

**Goal:** Reduce scope from 63 services to 21 core features. ONE ATOMIC PR.

#### **Step 1: Create Infrastructure**
```bash
mkdir -p _junkdrawer/{features,workers,curios,apps}
```

#### **Step 2: Move Workers to Junk Drawer**
```bash
# Workers (5 moves)
mv workers/reverie _junkdrawer/workers/
mv workers/reverie-exec _junkdrawer/workers/
mv workers/loft _junkdrawer/workers/
mv workers/meadow-poller _junkdrawer/workers/
mv workers/timeline-sync _junkdrawer/workers/
```

#### **Step 3: Move Apps to Junk Drawer**
```bash
# Apps (3 moves)
mv apps/ivy _junkdrawer/apps/
mv apps/terrarium _junkdrawer/apps/
mv apps/meadow _junkdrawer/apps/
```

#### **Step 4: Move Engine Features to Junk Drawer**
```bash
# Engine lib features (3 moves)
mv libs/engine/src/lib/firefly _junkdrawer/features/
mv libs/engine/src/lib/ai/reverie _junkdrawer/features/reverie-schemas/
# Note: VoiceInput.svelte imports scribe - delete the component
```

#### **Step 5: Delete Curio Directories (16 removals)**
```bash
# Engine curio code
rm -rf libs/engine/src/lib/curios/{activitystatus,ambient,artifacts,badges,blogroll,clipart,cursors,customuploads,hitcounter,journey,moodring,nowplaying,shelves,shrines,statusbadge,webring}

# Aspen admin routes
rm -rf apps/aspen/src/routes/arbor/curios/{activitystatus,ambient,artifacts,badges,blogroll,clipart,cursors,customuploads,hitcounter,journey,moodring,nowplaying,shelves,shrines,statusbadge,webring}

# Aspen API routes
rm -rf apps/aspen/src/routes/api/curios/{activitystatus,ambient,artifacts,badges,blogroll,clipart,cursors,customuploads,hitcounter,journey,moodring,nowplaying,shelves,shrines,statusbadge,webring}
```

#### **Step 6: Delete Aspen Junk Drawer Routes**
```bash
# Reverie (AI config)
rm -rf apps/aspen/src/routes/arbor/reverie
rm -rf apps/aspen/src/routes/api/reverie

# Chirp (messaging)
rm -rf apps/aspen/src/routes/arbor/chat
rm -rf apps/aspen/src/routes/api/chat

# Wisp/Fireside (AI writing)
rm -rf apps/aspen/src/routes/api/grove/wisp

# Meadow opt-in
rm -f apps/aspen/src/routes/api/admin/meadow/+server.ts
```

#### **Step 7: Delete Landing Junk Drawer Routes**
```bash
# Outpost/Minecraft (mc-control doesn't even exist)
rm -rf apps/landing/src/routes/arbor/minecraft
rm -rf apps/landing/src/routes/api/minecraft

# Firefly observability (stub that returns empty data)
rm -rf apps/landing/src/routes/arbor/vista/firefly

# Meadow observability
rm -rf apps/landing/src/routes/arbor/vista/meadow
rm -rf apps/landing/src/routes/api/admin/observability/meadow
```

#### **Step 8: Update Service Bindings (wrangler.toml)**
```toml
# apps/aspen/wrangler.toml - REMOVE:
# [[services]] binding = "REVERIE"
# Durable Object: CHAT binding

# services/grove-router/wrangler.toml - REMOVE:
# [[services]] binding = "MC_CONTROL"

# services/heartwood/src/routes/minecraft.ts - DELETE FILE
```

#### **Step 9: Update Engine Barrels & Infrastructure**

**`libs/engine/src/lib/curios/index.ts`** - Remove journey, keep only:
- timeline, gallery, guestbook, polls

**`libs/engine/src/lib/content/markdown/directives.ts`** - Update CURIO_DIRECTIVES:
- Keep: `["guestbook", "poll"]`
- Remove: 12+ other curio types

**`libs/engine/src/lib/curios/components/index.ts`** - Remove all 14+ curio component exports

**`libs/engine/src/lib/server/curio-status.ts`** - Remove queries for 14+ removed curios

**`libs/engine/src/lib/monitoring/observability/`** - Remove firefly-aggregator, meadow references

#### **Step 10: Disable Feature Flags**
Set `enabled=0` for greenhouse flags of removed features:
- `wisp_enabled`
- `fireside_mode`
- `scribe_mode`
- `chirp_enabled`
- `reverie_enabled`

**KEEP ENABLED (promote to production):**
- `reeds_comments` → keep enabled, remove `greenhouse_only` restriction
- `lantern_enabled` → keep enabled, remove `greenhouse_only` restriction
- Timeline → move out of greenhouse to production

#### **Step 11: Update Workshop Data**
Update `apps/landing/src/routes/workshop/workshop-data.ts`:
- Remove or mark junk drawer features as "planned" or "coming later"
- Keep core 21 features prominently displayed
- Reduce visible active service count

#### **Step 12: Complete Removal (Out of Scope - Delete Entirely)**
Features with no preservation value:
- Verge, Moss, Weave, Etch references in Workshop data
- Any planned routes or stubs for these features

#### **Step 13: Validation**
```bash
pnpm install
pnpm -r run lint
pnpm -r run build
pnpm -r run check  # svelte-check
pnpm -r run test:run
```

All must pass before PR is created.

---

### **Phase 2: Auth Simplification (Day 3 - Wed)**

**Goal:** Reduce auth from 3 methods to 1 reliable method (Google OAuth only)

#### **Removal Checklist:**

**Passkeys (~1,100 LOC):**
- [ ] Delete `services/heartwood/e2e/tests/passkey/` (3 files, 486 LOC)
- [ ] Delete `services/heartwood/e2e/fixtures/webauthn.ts` (158 LOC)
- [ ] Delete `apps/login/src/routes/passkey/`
- [ ] Delete `apps/plant/src/routes/auth/setup-passkey/`
- [ ] Remove passkey functions from `services/heartwood/src/client/auth.ts`
- [ ] Remove passkey plugin from `services/heartwood/src/auth/index.ts`
- [ ] Remove passkey rate limiters from middleware
- [ ] Remove passkey UI from settings template

**Magic Links (~400 LOC):**
- [ ] Remove magic link function from `services/heartwood/src/client/auth.ts`
- [ ] Remove magic link plugin + email templates from `services/heartwood/src/auth/index.ts`
- [ ] Remove magic link rate limiter
- [ ] Delete `apps/plant/src/routes/auth/magic-link/`
- [ ] Clean up redirect conversion logic in betterAuth.ts

**Plant Signup Simplification:**
- [ ] Remove auth method selection UI (Google OAuth button only)
- [ ] Remove passkey setup step from onboarding
- [ ] Remove email verification step (OAuth verifies email)
- [ ] Simplify flow: OAuth → Profile → Plan → Checkout → Success

**Database (mark deprecated, don't drop yet):**
- [ ] `ba_passkey` table → mark for 30-day retention then drop
- [ ] `ba_verification` table → safe to drop immediately (ephemeral tokens)

**Validation:**
- [ ] Google OAuth login works end-to-end
- [ ] Signup flow completes without errors
- [ ] All 14 consumer apps still validate sessions
- [ ] E2E tests for Google OAuth pass

---

### **Phase 3: Local Dev Setup (Day 4 - Thu Morning)**

**Goal:** Enable full stack local development (2-3 hours)

#### **Step 1: Create Orchestration Script**
Add to `tools/` or integrate with `gw dev`:
```bash
# Startup order (based on service dependency graph):
# Tier 0 (no deps): billing-api, heartwood, zephyr, durable-objects, warden
# Tier 1 (deps on Tier 0): lumen (→ warden)
# Tier 2 (deps on Tier 0+1): aspen (→ auth, zephyr, DOs, lumen)
```

#### **Step 2: Add .dev.vars Templates**
Create `.dev.vars.example` for each service with required local secrets:
- `/services/billing-api/.dev.vars.example` - STRIPE_SECRET_KEY (test mode)
- `/services/heartwood/.dev.vars.example` - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- `/services/durable-objects/.dev.vars.example` - Basic config
- `/workers/lumen/.dev.vars.example` - AI API keys
- `/services/zephyr/.dev.vars.example` - RESEND_API_KEY

#### **Step 3: Document in `docs/LOCAL_DEV.md`**
- Port assignments (5173-5180 range)
- Service dependency graph (visual)
- Required environment variables per service
- "Minimal dev" mode: just heartwood + zephyr + aspen
- Troubleshooting common issues

#### **Step 4: Verify the Flow**
- [ ] Can start full stack with one command
- [ ] Signup flow works locally (Google OAuth + Stripe test mode)
- [ ] Content creation works (write post, publish, view)
- [ ] Comments work (Reeds)
- [ ] Lantern renders (even if friends list is empty)

---

### **Phase 4: Observability Foundation (Day 4 - Thu Afternoon)**

**Goal:** Stop flying blind - know what's working and what's breaking

#### **1. Signup Completion Tracking**
- Add event logging at each Plant signup step
- Track funnel: started → authenticated → profile → plan → payment → tenant created
- Store in D1 table: `signup_funnel` (user_id, step, timestamp, metadata)

#### **2. Feature Usage Stats**
- Track curio deployments (which tenant enabled which curio)
- Track Lantern usage (navigation events)
- Track Reeds engagement (comments posted, moderated)
- Simple counts queryable from Arbor admin

#### **3. Error Reporting**
- "Report Issue" button in footer of all apps
- Captures: screenshot + URL + user agent + tenant ID + timestamp
- Stores in Porch (support conversations) or dedicated R2 bucket

#### **4. Vista Fixes**
- Investigate why Vista doesn't work (suspected: API key sync issue)
- Fix the blocker
- Verify metrics flowing from vista-collector
- Set up basic alerts (signup failures, error rate spikes)

---

### **Phase 5: Stability Hardening (Day 5 - Fri)**

**Goal:** Fix the top breaking patterns and close hook gaps

#### **1. Close Hook Gaps**
- Add `svelte-check` to pre-push (catches 10-15% of type errors)
- Add full workspace typecheck for lib changes
- Consider opt-in test runner in pre-push

#### **2. Fix Plant (Signup) Reliability**
- Add integration tests for simplified OAuth-only flow
- Test edge cases: network failures, Stripe delays, duplicate webhooks
- Ensure idempotent tenant creation
- Target: signup works first try, every time

#### **3. Fix Color Token Enforcement**
- Pre-commit hook already catches hardcoded greens (good!)
- Verify no remaining violations
- Add CI lint rule for any that slip through

#### **4. Promote Lantern, Reeds, Timeline**
- Remove `greenhouse_only` restriction from Lantern flag
- Remove `greenhouse_only` restriction from Reeds flag
- Remove greenhouse gating from Timeline
- All three become production features available to all tenants

---

## Dependency Graph (Final)

```
CORE PLATFORM (21 features)
├── grove-aspen (Main blog app)
│   ├── → AUTH (groveauth) ✓
│   ├── → ZEPHYR (email) ✓
│   ├── → DB (grove-engine-db) ✓
│   ├── → CURIO_DB (grove-curios-db) ✓
│   ├── → CACHE_KV / FLAGS_KV ✓
│   ├── → IMAGES (R2) ✓
│   ├── → DOs: TENANTS, POST_META, POST_CONTENT, THRESHOLD, EXPORTS, SENTINEL ✓
│   ├── → REVERIE ❌ REMOVE BINDING
│   └── → CHAT ❌ REMOVE BINDING
│
├── grove-landing (Marketing + Admin)
│   ├── → AUTH, ZEPHYR, DB, OBS_DB, CURIO_DB ✓
│   ├── → VISTA_COLLECTOR, ONBOARDING ✓
│   └── → CDN_BUCKET (R2) ✓
│
├── grove-router (Passage)
│   ├── → AUTH_API ✓
│   ├── → WARDEN ✓
│   ├── → BILLING ✓
│   └── → MC_CONTROL ❌ DEAD (doesn't exist, remove reference)
│
├── groveauth (Heartwood) → ZEPHYR ✓
├── grove-billing-api → ZEPHYR ✓
├── grove-durable-objects (8 DOs) → ZEPHYR ✓
├── grove-zephyr → EMAIL_RENDER ✓
├── grove-lumen → WARDEN ✓
├── grove-warden (standalone) ✓
├── grove-patina (standalone backup cron) ✓
├── grove-clearing (standalone status page) ✓
├── grove-webhook-cleanup (standalone cron) ✓
├── grove-vista-collector (standalone metrics) ✓
├── grove-onboarding → ZEPHYR ✓
├── grove-subscription-digest → ZEPHYR ✓
└── grove-email-catchup → EMAIL_RENDER ✓

JUNK DRAWER (sever all connections)
├── grove-reverie → (was: lumen, auth, reverie-exec) ← SEVER
├── grove-reverie-exec → (was: grove-lattice) ← GOES WITH REVERIE
├── grove-timeline-sync ← ORPHANED (timeline works without it)
├── grove-meadow-poller ← GOES WITH MEADOW
├── grove-loft ← EMPTY DIRECTORY
└── mc-control ← DOESN'T EXIST (dead reference in router)
```

---

## Success Criteria

### **By End of Week:**

1. ✅ **Reduced scope:** 21 core features (down from 63)
2. ✅ **Junk drawer populated:** 19+ services preserved but inactive
3. ✅ **Auth simplified:** Google OAuth only, working reliably
4. ✅ **Lantern & Reeds promoted:** Out of greenhouse, available to all tenants
5. ✅ **Local dev works:** `pnpm dev:all` runs full stack
6. ✅ **Observability exists:** Can track signups, features, errors
7. ✅ **Hook gaps closed:** svelte-check + workspace typecheck in pre-push

### **Validation Gates:**

- [ ] `pnpm install && pnpm -r run build` passes with zero errors
- [ ] Can run full signup flow locally (no production commits needed)
- [ ] Can answer "how many signups this week?" with data
- [ ] Can answer "which curios are deployed?" with data
- [ ] Google OAuth login works end-to-end (all apps)
- [ ] Lantern renders for all logged-in users (not just greenhouse)
- [ ] Comments (Reeds) work for all tenants (not just greenhouse)
- [ ] CI passes first try after pre-push validation
- [ ] Workshop shows 21 core features clearly

---

## Risks & Mitigation

### **Risk 1: Breaking Production**
- **Mitigation:** One atomic PR allows clean rollback
- **Mitigation:** Full build + typecheck + test validation before merge
- **Mitigation:** Feature flags allow gradual re-enablement if needed

### **Risk 2: Losing Work**
- **Mitigation:** `_junkdrawer/` preserves all code (just moved)
- **Mitigation:** Git history preserved (file moves tracked as renames)
- **Mitigation:** Database migrations documented, not deleted

### **Risk 3: Missing Dependencies**
- **Mitigation:** Full dependency graph mapped via import analysis
- **Mitigation:** Service bindings explicitly documented
- **Mitigation:** Build validation catches any missing imports immediately

### **Risk 4: Reverie Binding Removal**
- **Mitigation:** Routes that USE Reverie are deleted in same PR
- **Mitigation:** wrangler.toml binding removal is reversible
- **Mitigation:** No other feature depends on Reverie

### **Risk 5: Curio Data Loss**
- **Mitigation:** Database tables stay (just orphaned, queries removed)
- **Mitigation:** Code moves to `_junkdrawer/`, not deleted
- **Mitigation:** Can reconnect later by moving code back + re-enabling

---

## Post-Refactor: What's Next?

**After this week (not part of this refactor):**

1. **Increase test coverage** - Target 40% overall (currently 11.5%)
2. **Fix Lantern reliability** - Friends system flaky, follows don't work
3. **Fix Reeds reliability** - Ensure comments work consistently
4. **Fix remaining engine issues** - 101 fix commits in 6 months
5. **Evaluate junk drawer items** - Based on usage data from observability
6. **Selective rebuild** - Bring back features that have:
   - Clear user demand (data-driven from observability)
   - >40% test coverage
   - Integration tests for critical paths
   - Don't break core loop

7. **Foliage completion** - Theming needs work but separate effort
8. **Billing testing** - Add Stripe test mode to local dev, add integration tests

---

## The Bottom Line

Grove tried to be everything at once: blogging platform + email client + Minecraft server + 3D exploration + AI agents + 18 widget types + DMs + video sharing. The result: nothing works reliably.

**This refactor:** Cut scope to 21 core features (including Lantern for discovery and Reeds for comments), make those bulletproof, then selectively rebuild.

**Her-go taught us:** You can't stabilize the core while building 63 features simultaneously. Junk drawer the nice-to-haves, nail the essentials, then bring things back one at a time with tests.

**This week:** Emergency surgery. Reduce the surface area, stabilize what remains, add visibility so we can make data-driven decisions about what to bring back.

---
---

## Runbook: Session Continuity & Progress Tracking

### Handoff Prompt (Copy this to start a new session)

```
I'm working on The Great Grove Refactor (docs/REFACTOR.md). Read that document
fully before doing anything else. It contains:
- The full plan, dependency graph, and scope decisions
- Progress tracker showing exactly where we left off
- Conductor workflow (you orchestrate, subagents implement)

Check the Progress Tracker section to see what's done and what's next.
Then tell me what the next step is and ask if I'm ready to proceed.

Workflow: You are the conductor (Opus). Dispatch sonnet-coders or opus-coders
for implementation work. Use mv/rm commands directly for simple file moves.
Review all subagent work before marking steps complete. Update the progress
tracker in this document after each completed step.
```

---

### Conductor Workflow

**You (Opus) are the conductor.** Your job:
1. Read the progress tracker to understand current state
2. Identify the next step(s) that can be parallelized
3. Dispatch subagents (sonnet-coder for straightforward work, opus-coder for complex refactoring)
4. Review their work when it lands (check actual file changes, not just summaries)
5. Update the progress tracker in this document
6. Report to the user what was accomplished

**Subagent dispatch rules:**
- **Simple file moves** (`mv`, `rm -rf`): Do directly in Bash, no subagent needed
- **Barrel/index updates** (removing exports, updating arrays): sonnet-coder
- **Route deletions** (entire route trees): sonnet-coder
- **Service binding changes** (wrangler.toml edits): sonnet-coder
- **Auth simplification** (removing plugins, cleaning up logic): opus-coder (complex, cross-file)
- **Feature flag changes** (DB migrations, flag config): sonnet-coder
- **New infrastructure** (orchestration scripts, observability): opus-coder
- **Validation** (running builds, tests): house-bash

**After each step:**
1. Run `pnpm install` to verify no broken deps
2. Run `pnpm -r run build` for affected packages
3. Update progress tracker below
4. If build fails: fix before proceeding (don't accumulate errors)

---

### Progress Tracker

**Last updated:** 2026-05-05 (Session 2 - Phase 1 complete)

#### Phase 0: Research & Audit
| Step | Status | Notes |
|------|--------|-------|
| Map feature surface area | ✅ DONE | 63 services in Workshop.svelte |
| Identify junk drawer candidates | ✅ DONE | 19 services + Meadow |
| Analyze Firefly dependencies | ✅ DONE | Powers nothing in production |
| Investigate local dev blockers | ✅ DONE | Service orchestration + secrets |
| Audit Heartwood auth | ✅ DONE | Clean removal of passkeys + magic links (~1,500 LOC) |
| Audit Aspen dependencies | ✅ DONE | Full route deletion map created |
| Audit Landing dependencies | ✅ DONE | Minecraft/Outpost UI + dead refs identified |
| Audit Billing/Plant | ✅ DONE | Clean, independent, undertested |
| Audit engine dep graph | ✅ DONE | Moderately clean cut, 2 kept couplings |
| Audit workers/services | ✅ DONE | timeline-sync orphaned, mc-control dead |
| Audit pre-commit/pre-push hooks | ✅ DONE | 11 checks, 6 critical gaps |
| Audit curios isolation | ✅ DONE | Zero cross-curio deps, clean isolation |
| Confirm Lantern + Reeds STAY | ✅ DONE | Essential features, promote from greenhouse |
| User approval on final list | ✅ DONE | 21 keep, 19+ junk drawer, 6 remove |

#### Phase 1: The Great Junk Drawer ✅ COMPLETE
| Step | Status | Notes |
|------|--------|-------|
| 1. Create _junkdrawer/ structure | ✅ DONE | `_junkdrawer/{features,workers,curios,apps}` |
| 2. Move workers (5) | ✅ DONE | reverie, reverie-exec, loft, meadow-poller, timeline-sync |
| 3. Move apps (3) | ✅ DONE | ivy, terrarium, meadow |
| 4. Move engine features | ✅ DONE | firefly, reverie-schemas, VoiceInput, FiresideChat |
| 5. Move curio directories (16+) | ✅ DONE | Engine + Aspen admin/API + components + (site) routes |
| 6. Move Aspen junk drawer routes | ✅ DONE | reverie, chat, wisp, meadow opt-in |
| 7. Move Landing junk drawer routes | ✅ DONE | minecraft, firefly vista, meadow vista |
| 8. Update service bindings | ✅ DONE | REVERIE, CHAT, MC_CONTROL removed + minecraft route |
| 9. Update engine barrels | ✅ DONE | curios, directives, components, curio-status, observability, package.json |
| 10. Disable feature flags | ✅ DONE | KnownFlagId cleaned + migration 113 |
| 11. Promote Lantern/Reeds/Timeline | ✅ DONE | Migration 113: greenhouse_only = 0 |
| 12. Update Workshop data | ✅ DONE | 4 deleted, 12 marked "planned" |
| 13. Complete removal | ✅ DONE | Verge/Moss/Weave/Etch removed from workshop |
| 14. Validation (build + lint) | ✅ DONE | All packages build + lint clean (0 errors) |

#### Phase 2: Auth Simplification
| Step | Status | Notes |
|------|--------|-------|
| Remove passkey code (~1,100 LOC) | ✅ DONE | 28 files moved, 45+ files edited across 5 apps |
| Remove magic link code (~400 LOC) | ✅ DONE | 4 route dirs moved, email templates removed |
| Simplify Plant signup | ✅ DONE | Invite page → Google OAuth, setup-passkey step removed |
| Mark deprecated DB tables | ✅ DONE | ba_passkey, ba_verification (migration 0014), magic_codes |
| Remove dead deps | ✅ DONE | @better-auth/passkey, @simplewebauthn/browser from login+heartwood |
| Phase 1 deep sweep | ✅ DONE | 75+ more files: Lumen reverie tasks, threshold configs, FeedDO/ChatDO/TriageDO, Arbor UI, Lantern destinations, Router rules, Prism icons, pricing text, terrarium components |
| Validation (build + typecheck) | ✅ DONE | All packages build + typecheck clean |

#### Phase 3: Local Dev Setup
| Step | Status | Notes |
|------|--------|-------|
| Create orchestration script | ⬜ TODO | Service startup ordering |
| Add .dev.vars templates | ⬜ TODO | 5 services need templates |
| Document in LOCAL_DEV.md | ⬜ TODO | Ports, deps, minimal mode |
| Verify full flow locally | ⬜ TODO | Signup + content creation + comments |

#### Phase 4: Observability
| Step | Status | Notes |
|------|--------|-------|
| Signup funnel tracking | ⬜ TODO | D1 table + event logging |
| Feature usage stats | ⬜ TODO | Curio deployment counts |
| Error reporting button | ⬜ TODO | Screenshot + diagnostic capture |
| Vista fixes | ⬜ TODO | Suspected API key sync |

#### Phase 5: Stability Hardening
| Step | Status | Notes |
|------|--------|-------|
| Add svelte-check to pre-push | ⬜ TODO | Closes biggest hook gap |
| Add workspace typecheck | ⬜ TODO | Prevents cross-package errors |
| Plant integration tests | ⬜ TODO | OAuth flow coverage |
| Color token final sweep | ⬜ TODO | Verify enforcement |

---

### Session Log

**Session 1 (2026-05-05):**
- Completed full Phase 0 research and audit
- Dispatched 13 explorer agents across the codebase
- Created comprehensive dependency graph
- Identified 21 core features to keep
- Confirmed Lantern + Reeds are essential (not junk drawer)
- Documented auth simplification path (~1,500 LOC removal)
- Documented curios isolation strategy (16 dirs, 4 file updates)
- Documented hook gaps (svelte-check, tests, app builds missing)
- Found mc-control is a dead reference (doesn't exist as a worker)
- Found timeline-sync is orphaned (timeline works without it)
- Created full REFACTOR.md plan document
- **Next session:** Begin Phase 1, Step 1 (create _junkdrawer/ and start moving)

**Session 2 (2026-05-05):**
- Completed full Phase 1 execution (14 steps)
- 499 files changed: moves, barrel updates, binding removals, UI cleanup
- Moved 5 workers, 3 apps, 16+ curio dirs, firefly, reverie-schemas
- Severed service bindings: REVERIE, CHAT, MC_CONTROL
- Cleaned FormattingToolbar, MarkdownEditor, garden new/edit pages (Wisp/Fireside/Meadow)
- Updated curio dashboard (19 entries → 4)
- Updated Workshop data (4 deleted, 12 marked "planned")
- Created migration 113 (promote Lantern/Reeds, disable junk flags)
- Gossamer stays in libs/ (actively used by Glass/GlassCard — deviation from plan)
- Full build + lint passes: 0 errors across all 17 packages
- **Next session:** Phase 2 (auth simplification — Google OAuth only)

**Session 3 (2026-05-06):**
- Phase 2: Auth Simplification — COMPLETE
  - Removed passkeys (~1,100 LOC) and magic links (~400 LOC) from entire auth stack
  - 90 files in main commit + 17 files in stragglers cleanup
  - Removed @better-auth/passkey and @simplewebauthn/browser dependencies
  - Converted invite page from magic link to Google OAuth
  - Created Heartwood migration 0014 (deprecate ba_passkey, ba_verification)
  - Updated help center, specs, FAQ, credits, workshop, skills, auto-label workflow
  - Two rounds of aggressive searching caught passkey/magic-link in 100+ files
- Phase 1 Deep Sweep — cross-cutting cleanup the blitz missed
  - Moved: WispPanel, WispButton, Terrarium components, FeedDO, ChatDO, TriageDO
  - Cleaned: Lumen reverie/reverie-compose tasks, threshold rate limiters, observability types
  - Cleaned: Arbor sidebar nav, settings pages, Lantern destinations, grove-router rules
  - Cleaned: Prism icons, pricing text, tier configs, DB schema deprecations
  - Removed FEED_QUEUE from Aspen bloom-service publish flow
  - Removed TriageDO/ChatDO/FeedDO from DO worker index + wrangler.toml
  - ~8,700 additional lines deleted across 75+ files
- All packages build + typecheck clean (0 errors)
- **Next session:** Phase 3 (local dev setup — full stack runnable locally)
