# Debug Investigations — 2026-04-18

## Overarching Goal: Harden the Signup Flow

The theme running through all of this work is **reliability**. The signup flow is the first thing a new user experiences — if it fails, Grove fails them before they even get started. Every issue below should be viewed through this lens: not just fixing the specific bug, but making the whole onboarding path robust enough that it never silently breaks for a real person again.

- First impressions are permanent — a broken signup is a lost person
- Dante's referral should have been a success story; instead it exposed fragility
- The goal isn't patches, it's a flow you can trust

---

## 1. Dante's Gallery Shows No Photos

**Status:** Deferred (handle later)  
**Reporter:** Autumn (noticed by friend Dante)

### Symptoms
- Dante signed up and has been actively posting photos — uploads work fine
- He has enabled the gallery feature (all flags confirmed enabled)
- He has 12+ photos uploaded
- His gallery page shows **nothing** — completely empty

### What to investigate
- How gallery queries photos (does it filter by something Dante's account doesn't satisfy?)
- Whether gallery reads from a different data path than post uploads
- Whether there's a missing join or wrong tenant scope in the gallery query
- `uploads_suspended` flag ruled out — Dante has everything enabled

---

## 2. Signup Flow Failures + Incomplete Tenant Deletion

**Status:** Fixed (pending deploy + test)  
**Trigger:** Dante referred a friend to sign up → Autumn tested the flow, it failed 3 times

### Real-world impact
- **Dante's referred friend** attempted signup and hit the same "failed to create session" error — this is a live failure affecting real new users, not just test accounts
- Dante advised them to try Google signup as the "more reliable" option — but that is also broken
- This is actively blocking word-of-mouth growth right now

### Test accounts used
| Account | Method | Result |
|---|---|---|
| `autumn@grove.place` | Email magic link | Failed to create session when clicking the link |
| `wrathofthestormzero@gmail.com` | Google OAuth | Said "welcome back, Wrath" — account still exists |
| `palmer.brown38@gmail.com` | Google OAuth | Said "welcome back, Dead" — account still exists |
| Dante's friend (unknown) | Unknown (likely email or Google) | Failed to create session |

### Root causes found

**Bug 1: Silent error swallowing in magic link callback**
- `apps/plant/src/routes/auth/magic-link/callback/+server.ts:44` — the `error` param from Heartwood was ONLY handled when `inviteToken` was present
- For normal signups (no invite), if magic link verify failed (token expired, D1 error, etc.), the error was **silently ignored**
- Code then tried to fetch a session that was never created → user saw cryptic "session wasn't found" instead of the real error
- **Fixed:** Error param now handled for all cases, not just invite flow

**Bug 2: Incomplete tenant deletion (`gw tenant delete`)**
- `gw tenant delete` only ran `DELETE FROM tenants WHERE id = ?` — CASCADE removed 29 child tables
- But left behind: `user_onboarding` (display name → "welcome back, Wrath"), `users` (legacy table), and ALL Heartwood records (`ba_user`, `ba_account`, `ba_session`)
- **Fixed:** `gw tenant delete` now cleans up all 5 orphaned record types across both DBs

**Bug 3: Magic link API using public internet instead of service binding**
- `apps/plant/src/routes/api/auth/magic-link/+server.ts` used raw `fetch()` to `login.grove.place` instead of `platform.env.AUTH.fetch()` (service binding)
- Unnecessary internet hop, added latency and potential failure point
- **Fixed:** Now uses AUTH service binding for worker-to-worker routing

**Improvement: Email allowlist removed**
- Heartwood `databaseHooks.user.create.before` had allowlist + comped_invites checks
- `PUBLIC_SIGNUP_ENABLED = "true"` was already bypassing it, but the dead code added confusion
- **Removed:** Hook now simply logs and allows all signups

**Improvement: Diagnostic logging added**
- Both callbacks now log which cookies arrive (names only, not values)
- Session fetch failures now include whether the BA cookie was present
- OAuth callback logs available cookies when session cookie is missing

### Remaining work
1. **Deploy and test** — all changes need deployment to verify in production
2. **Clean up 3 stuck accounts** — run `gw tenant delete` for the test accounts (now with full cleanup)
3. **Monitor logs** — the new diagnostic logging will reveal if the session cookie is actually reaching Plant or getting lost in the redirect chain

---

## 3. Plant Signup — Username Field UX

**Status:** Pending

### Request
In the Plant signup flow, users need to know they can change their username later. Add helper text beneath the username input field, something like:

> "You can change this later in Arbor."

This removes anxiety about locking in a username during onboarding.

---

## Notes
- Investigations 1 (Dante's gallery) and 2–3 (signup flow) are **independent** — tackle separately
- Signup failures are **blocking new user acquisition** — Dante referred a friend and it failed in front of them, priority issue
- Account cleanup for the three stuck accounts needs to happen alongside the fix so testing can resume cleanly
