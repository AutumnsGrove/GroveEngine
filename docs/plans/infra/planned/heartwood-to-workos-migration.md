---
title: "Heartwood → WorkOS Migration Plan"
status: planning
category: infra
lastUpdated: "2026-04-11"
---

# Heartwood → WorkOS Migration Plan

```
                    ╭─────────────────────╮
                    │                     │
                 ╭──│   ╭─╮         ╭─╮   │──╮
                │   │   │ │ ──────→ │ │   │   │
                 ╰──│   ╰─╯         ╰─╯   │──╯
                    │                     │
                    ╰─────────────────────╯

          from custom roots to a tended garden
```

> **Migration Type**: Authentication Infrastructure
> **Status**: Planning (POC validated, awaiting decision to proceed)
> **Target**: WorkOS AuthKit (headless mode) via `@workos/authkit-session`
> **Author**: Claude (with guidance from Autumn)
> **Created**: April 2026

---

## Table of Contents

1. [Why This Exists](#why-this-exists)
2. [What the POC Proved](#what-the-poc-proved)
3. [End State Vision](#end-state-vision)
4. [What Stays, What Goes](#what-stays-what-goes)
5. [Migration Phases](#migration-phases)
6. [Risks and Mitigations](#risks-and-mitigations)
7. [Rollback Plan](#rollback-plan)
8. [Decision Gates](#decision-gates)
9. [Decisions Made](#decisions-made)

---

## Why This Exists

Heartwood works. It's audited, deployed, integrated across nine Grove apps, and it does its job. But it costs something real to keep it running: every few weeks, something breaks in the auth layer and requires careful, anxious surgery. Auth code is the scariest code in the codebase — a bug there doesn't just break a feature, it locks users out of the whole garden.

The ambition with Heartwood was sovereignty: own every byte, depend on nothing. That's still a value worth holding. But Grove is explicitly passwordless — magic links and Google OAuth only. The "sovereignty over password hashes" argument doesn't apply when there are no password hashes to own.

What we'd be trading:

- **~21K lines** of custom auth code we maintain (Better Auth + Grove extensions + SessionDO bridges + session routes + audit logs + device flows)
- **A recurring maintenance tax** — the "pray to the auth gods" moments when something breaks
- **Cognitive load** — auth complexity that crowds out time for actually building Grove

For:

- **~200-400 lines** of integration code we write once
- **A battle-tested session engine** maintained by a company whose entire business is getting auth right
- **More time** to build the warm things that make Grove feel like home

This is not an aesthetic choice. It's a "what should we be spending our energy on" choice.

---

## What the POC Proved

A standalone SvelteKit + Cloudflare Workers app using `@workos/authkit-session` (not the alpha SvelteKit SDK) was built outside Lattice and tested. Headless mode — entirely custom UI, WorkOS as the backend identity engine.

**What worked:**

- Magic link flow (6-digit code sent to email, verified via API)
- Google OAuth flow (redirect → callback → sealed session cookie)
- Session validation in `hooks.server.ts`
- Deployment to Cloudflare Workers
- Full control over the login UI — no WorkOS hosted pages

**What this validates:**

- WorkOS AuthKit works in headless mode as advertised
- The `@workos/authkit-session` toolkit (v0.3.4, stable) is a solid foundation
- We can keep our hand-designed login hub
- Cloudflare Workers compatibility is real, not theoretical

**What remains unproven:**

- Behavior at Grove's actual scale and traffic patterns
- Edge cases: organization switching, user suspension, session revocation
- Migration of existing users without disruption
- Service binding patterns across nine Grove apps

---

## End State Vision

After migration, the Grove auth stack looks like this:

```
                    ┌────────────────────────┐
                    │   login.grove.place    │
                    │   (still ours, still   │
                    │    warm, still home)   │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │   Heartwood (thinned)  │
                    │   — WorkOS adapter     │
                    │   — SessionDO hydra    │
                    │   — Grove state layer  │
                    └───────────┬────────────┘
                                │
                    ┌───────────┴────────────┐
                    │                        │
                    ▼                        ▼
          ┌──────────────────┐    ┌──────────────────┐
          │     WorkOS       │    │    SessionDO     │
          │   — identity     │    │  — Grove state   │
          │   — sessions     │    │  — preferences   │
          │   — magic links  │    │  — quota caches  │
          │   — OAuth        │    │  — per-user DO   │
          └──────────────────┘    └──────────────────┘
```

WorkOS becomes the identity source of truth. SessionDO becomes a pure Grove-state cache, freed from auth responsibilities. Heartwood shrinks from ~21K lines to a thin adapter layer (~2-4K lines) that translates between WorkOS sessions and Grove's internal needs, plus the preserved device flow implementation for CLI auth (which WorkOS charges enterprise prices to replicate).

The login hub at `login.grove.place` stays exactly as it is. Users never see WorkOS branding.

---

## What Stays, What Goes

### Stays

| Component | Why |
|-----------|-----|
| **login.grove.place UI** | Hand-designed, warm, one source of truth. This is Grove. |
| **SessionDO** | Repurposed as Grove-state cache (preferences, quotas, subscriptions). Stops doing auth validation. |
| **Service binding pattern** | Worker-to-Worker calls stay. Heartwood remains the auth gateway for Grove apps. |
| **Audit log** | Grove-specific security events. Expanded to also record WorkOS events. |
| **Subscription/quota tables** | Grove business logic, not auth. |
| **CDN/avatar handling** | Unrelated to auth. |
| **Email allowlist enforcement** | Grove policy layer on top of WorkOS identity. |
| **Device flow** (CLI auth) | Stays on the existing Better Auth code. WorkOS device flow is enterprise-only; cheaper to preserve the working implementation than rebuild. |
| **`AUTH` service binding** in Grove apps | The binding stays; the worker behind it changes. |

### Goes

| Component | Replacement |
|-----------|-------------|
| **Better Auth config** (`services/heartwood/src/auth/index.ts`, 477 lines) | `@workos/authkit-session` + thin adapter |
| **`ba_*` database tables** | WorkOS is the source of truth for identity; D1 only keeps Grove extension tables |
| **JWT signing/verification** (RSA keypair) | WorkOS handles JWTs; we verify via JWKS |
| **Drizzle schema for auth tables** | Only Grove extension tables remain |
| **Session routes** (767 lines) | Thin proxy or removed entirely |
| **Token routes** (781 lines) | WorkOS callback handler + session sealing |
| **Password-related code paths** | Deleted — we never had passwords anyway |
| **KV session cache bug** | Moot; WorkOS handles session storage |
| **Drizzle-ORM version mismatch hack** | Moot; we stop using Drizzle for auth |
| **SessionDO keepalive cron** | Still runs for Grove state, but auth latency no longer depends on it |

### Thins Out

| Component | Change |
|-----------|--------|
| **Heartwood worker** (~21K → ~3-5K lines) | Becomes an adapter layer, not a full auth system |
| **Database queries** (1,377 lines) | Shrinks to Grove-specific queries only |
| **Settings template** (1,187 lines) | Passkey/2FA UI rebuilt on WorkOS APIs; D1-backed credential management removed |
| **Client library** (`libs/engine/src/lib/heartwood/`) | API surface stays stable; internals change |

---

## Migration Phases

### Phase 0: Preparation (before any user-facing change)

- [ ] Create WorkOS production environment
- [ ] Create WorkOS staging environment (separate tenant, seeded with synthetic test users)
- [ ] Configure Google OAuth provider in WorkOS dashboard (both envs)
- [ ] Enable passkeys and TOTP MFA in WorkOS dashboard
- [ ] Configure magic link email templates (use WorkOS defaults initially)
- [ ] Set up WorkOS webhook subscription → Grove audit log endpoint
- [ ] Add WorkOS secrets to Cloudflare (API key, client ID, cookie password)
- [ ] Document current Heartwood auth flows exhaustively (screenshots, sequence diagrams)
- [ ] Audit which device flow routes in Heartwood must be preserved
- [ ] Back up the entire `groveauth` D1 database
- [ ] Write runbooks for rollback scenarios

### Phase 1: Parallel Implementation (Heartwood untouched)

- [ ] Create new worker `heartwood-workos` alongside existing `groveauth`
- [ ] Implement `@workos/authkit-session` integration layer
- [ ] Rebuild the login flows against WorkOS (magic link, Google OAuth)
- [ ] Port SessionDO integration — now as a cache hydrated from WorkOS user IDs
- [ ] Port device flow (CLI auth) against WorkOS user IDs
- [ ] Port email allowlist enforcement layer
- [ ] Write integration tests
- [ ] Deploy to a staging subdomain (`auth-staging.grove.place`)

### Phase 2: Dual Running

- [ ] Add feature flag `USE_WORKOS_AUTH` (default off) in login hub
- [ ] Flag routes user flows to either Heartwood or new worker based on flag
- [ ] Enable flag for internal testing (Autumn only)
- [ ] Run both systems in parallel for 1-2 weeks
- [ ] Validate: login, logout, session persistence, cross-subdomain sessions, service bindings
- [ ] Fix any gaps discovered

### Phase 3: User Migration

Since Grove uses magic links and Google OAuth only (no passwords to migrate), user migration is simpler than typical auth migrations. But it's still non-trivial:

- [ ] Export existing users from `ba_user` table (email, createdAt, metadata)
- [ ] Bulk-create matching users in WorkOS via User Management API
- [ ] Map Grove user IDs → WorkOS user IDs in a translation table
- [ ] Update `ba_*` foreign keys in dependent tables (subscriptions, cdn_files, audit_log, etc.) to reference WorkOS user IDs OR keep Grove IDs as primary and store WorkOS ID as secondary
- [ ] **Decision point**: do we keep Grove user IDs as primary (simpler migration) or switch to WorkOS user IDs (cleaner end state)?

### Phase 4: Cutover

- [ ] Enable `USE_WORKOS_AUTH` flag for all users
- [ ] Monitor for 48 hours with Heartwood still warm and ready to roll back
- [ ] Invalidate all Heartwood sessions (users re-authenticate via WorkOS)
- [ ] **Expected user impact**: everyone signs in once. Magic link users get a fresh code. Google OAuth users click "Sign in with Google" once.
- [ ] Disable Heartwood auth routes but keep the worker running for other functions

### Phase 5: Cleanup (begins day 91 post-cutover)

- [ ] Remove Better Auth code from `services/heartwood/src/auth/` (except the slice supporting device flow)
- [ ] Remove `ba_*` tables from D1 — **except** those still referenced by the preserved device flow
- [ ] Remove JWT signing secrets from Cloudflare (unless device flow still needs them)
- [ ] Remove KV namespace (if unused)
- [ ] Shrink `services/heartwood/src/db/queries.ts` to Grove-only queries + device flow queries
- [ ] Migrate magic link email delivery from WorkOS defaults to Zephyr (custom emails mode)
- [ ] Update developer documentation
- [ ] Update security audit (HAWK) with new architecture
- [ ] Remove `USE_WORKOS_AUTH` feature flag

---

## Risks and Mitigations

### Risk: WorkOS outage locks everyone out

**Likelihood**: Low (WorkOS has good uptime)
**Impact**: Severe (no one can sign in)
**Mitigation**:
- Keep Heartwood infrastructure warm for 30+ days post-cutover
- Cache WorkOS JWKS locally (the `authkit-session` toolkit does this)
- Sealed session cookies keep users logged in even during brief WorkOS outages — only new logins are blocked
- Have a documented "emergency rollback" runbook

### Risk: Cloudflare Workers buffer polyfill issue

**Likelihood**: Medium (known issue: workos/workos-node#1130)
**Impact**: Moderate (breaks build or runtime)
**Mitigation**:
- POC already validates this works — document the exact workaround used
- Pin SDK versions that are known to work
- Test thoroughly in staging before production

### Risk: Data sovereignty philosophical drift

**Likelihood**: N/A (this is a values question, not a technical one)
**Impact**: Worth sitting with
**Mitigation**:
- Grove is explicitly passwordless — WorkOS doesn't own password hashes because there are none
- User profiles and metadata remain exportable via WorkOS API
- Social login tokens aren't portable, but they weren't portable under Better Auth either
- The pattern (OAuth/OIDC redirect flow) is portable; provider swap is possible
- Document this trade-off publicly in Grove's privacy page

### Risk: WorkOS pricing changes

**Likelihood**: Low (1M MAU free tier is a stated positioning move)
**Impact**: Low at Grove's current scale
**Mitigation**:
- Grove would need 1M+ MAUs before paying anything — years away
- Enterprise SSO is the paid lever, not basic auth; Grove doesn't need SSO
- If pricing changes, the escape hatch (back to self-hosted) is expensive but possible

### Risk: Heartwood's custom features aren't replicable in WorkOS

**Likelihood**: Medium (need detailed audit)
**Impact**: Could block migration
**Mitigation**:
- Before Phase 1, audit every auth feature in Heartwood against WorkOS capabilities
- Flag any Grove-specific behavior that must be rebuilt (device flow, email allowlist, custom audit log events)
- These live in Heartwood's adapter layer, not in WorkOS

### Risk: Service binding pattern doesn't translate cleanly

**Likelihood**: Low
**Impact**: Moderate (latency regression across Grove apps)
**Mitigation**:
- The `AUTH` service binding stays — only the worker behind it changes
- Heartwood worker becomes a thin adapter that calls WorkOS from its own Worker context
- Cache WorkOS session validation results aggressively within the adapter

---

## Rollback Plan

### Before Phase 4 (Cutover)

Trivial. Turn off the feature flag. Nothing in production has changed.

### During Phase 4 (Cutover)

1. Re-enable Heartwood auth routes
2. Toggle feature flag back to `false`
3. Users re-authenticate via Heartwood (sessions need re-issuance)
4. Monitor for stability
5. Investigate the issue, patch, retry later

### After Phase 5 (Cleanup)

Hard. Better Auth tables have been dropped. Rolling back requires:

1. Restore D1 `ba_*` tables from backup (kept for 30 days)
2. Restore Better Auth code from git history
3. Re-deploy old Heartwood worker
4. Flag users back to old system
5. They re-authenticate — any accounts created during the WorkOS period may be lost unless manually migrated back

**This is why Phase 5 has a 90-day safety window.** Do not delete the safety net until the migration has clearly succeeded across at least one full quarter of user activity — including annual subscribers and users who only visit occasionally.

---

## Decision Gates

These are the points where we stop and decide whether to proceed.

### Gate 1: After POC (CURRENT)

- [x] Does WorkOS work in headless mode?
- [x] Does it run on Cloudflare Workers?
- [x] Is the DX acceptable?

**Status**: POC complete, all gates passed.

### Gate 2: Before Phase 1

- [ ] Is there time and focus to do this migration carefully?
- [ ] Has Heartwood had a recent stability event that justifies the effort?
- [ ] Are there any WorkOS issues reported in the last 30 days that concern us?
- [ ] Is the feature-work pipeline in a state where auth work is the best use of time?

### Gate 3: Before Phase 4 (Cutover)

- [ ] Has dual-running in Phase 3 surfaced any blockers?
- [ ] Are all Grove-specific features (device flow, allowlist, audit log) working against WorkOS?
- [ ] Is there a clear, tested rollback path?
- [ ] Is there a quiet window (not mid-launch, not during a security incident) to do the cutover?

### Gate 4: Before Phase 5 (Cleanup)

- [ ] Has it been at least 30 days since cutover with no auth incidents?
- [ ] Has user feedback been positive or neutral?
- [ ] Are there any features we might want to roll back to for?

---

## Decisions Made

These were worked through in an interview session on 2026-04-11. The answers reflect Grove's priorities: warm by default, invisible to users, simple first, sovereignty where it matters.

### Identity & Session Architecture

1. **User ID strategy** → **Keep Grove UUIDs as primary.** WorkOS user IDs stored as a secondary field on each user record. Simpler migration, cleaner rollback, no foreign key churn across `subscriptions`, `cdn_files`, `audit_log`, etc. Lookup logic has a small tax (two IDs to reconcile) but it's worth it for the safety.

2. **Organization model** → **Skip organizations entirely.** Grove is a personal-account product. Every user is their own account. Can be revisited later if multi-user Meadow instances or team workspaces show up — WorkOS orgs can be added incrementally without breaking the personal-account flow.

3. **Custom domain** → **Keep WorkOS internal (invisible to users).** Users only ever see `login.grove.place`. Since we're in headless mode, users never interact with WorkOS-branded surfaces. Saves $99/mo and keeps one less DNS record to manage. Can be upgraded later if WorkOS branding ever leaks through.

4. **Session length** → **Match WorkOS default (400 days).** Grove is a cozy home, not a bank. Sealed cookies still support server-side revocation for suspicious activity, so this isn't "forever no matter what" — it's "warm by default, tightened only when needed."

### Email, Audit, Device Flow, MFA

5. **Email delivery** → **WorkOS defaults in Phase 4, migrate to Zephyr in Phase 5.** Two-stage approach. Ship the core migration faster using WorkOS's built-in email delivery. Once the migration is stable, swap email delivery to route through Zephyr for full Grove voice and branding. This means Phase 5 grows a new step: "migrate email delivery to Zephyr via WorkOS custom emails mode."

6. **Audit log** → **Subscribe to WorkOS webhooks, record in Grove audit log.** WorkOS emits webhook events for logins, failed auths, user updates. Grove's existing audit_log table becomes the single source of truth — WorkOS events flow in alongside Grove-specific events. Existing audit queries keep working. Webhook subscription setup is part of Phase 1.

7. **CLI device flow** → **Keep Heartwood running just for device flow.** Everything else migrates to WorkOS, but the device flow stays on the existing Better Auth code. WorkOS device flow is an enterprise/paid feature, so rather than rebuild it or drop it, we preserve the existing implementation. This means Heartwood doesn't fully shrink to an adapter layer — it retains the device flow routes and their supporting code. The rest of Heartwood thins out as planned.

8. **Passkeys and 2FA** → **Port to WorkOS — both are confirmed free tier.** Research on 2026-04-11 verified: WorkOS AuthKit includes native WebAuthn/passkeys and TOTP-based MFA on the free tier (no conditions, no paid gate). SMS MFA is deliberately not supported, which matches Grove's security posture. The Heartwood Settings UI for passkey/2FA management gets rebuilt on top of WorkOS APIs during Phase 1. Users keep passkey login capability; implementation details change.

### Testing, Communication, Safety

9. **Testing strategy** → **Dedicated WorkOS staging environment with seed test users.** Create a completely separate WorkOS environment for staging. Seed it with synthetic test users covering key scenarios: new user, returning user, admin, suspended user, magic-link-only, Google-OAuth, passkey-enrolled. Zero production data crosses the boundary. Part of Phase 0.

10. **User communication** → **Nothing proactive.** Users don't need to know about invisible infrastructure changes. Magic links and Google OAuth will look identical from their perspective. Any surface-level differences (one forced re-login) can be documented quietly in the firefly patch notes but not broadcast. Save the communication capital for features that actually affect the user experience.

11. **Safety window for `ba_*` tables** → **90 days, not 30.** Grove moves at its own pace. 90 days of safety net gives plenty of time to catch rare edge cases — annual subscribers who only log in once a quarter, users who haven't visited since before cutover, etc. Phase 5 cleanup cannot begin until day 91 post-cutover.

---

## Notes

This plan is not a commitment. It's a roadmap for **when** (and if) Autumn decides to proceed. The POC validated the technical approach. The decision to start Phase 1 is a separate decision — one that weighs the maintenance burden of Heartwood against the one-time cost of migration, against the value of the features that aren't getting built because auth keeps demanding attention.

There is no rush. Heartwood works. This plan waits patiently until the moment is right.

When that moment comes, start at Phase 0 and walk it carefully. Auth migrations are never "move fast" territory. They're "move with care, with rollback paths, with the lights on" territory.

The garden is already growing. This is about tending, not tearing up.
