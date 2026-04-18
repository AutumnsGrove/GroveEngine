# Debug Investigations — 2026-04-18

## Overarching Goal: Harden the Signup Flow

The theme running through all of this work is **reliability**. The signup flow is the first thing a new user experiences — if it fails, Grove fails them before they even get started. Every issue below should be viewed through this lens: not just fixing the specific bug, but making the whole onboarding path robust enough that it never silently breaks for a real person again.

- First impressions are permanent — a broken signup is a lost person
- Dante's referral should have been a success story; instead it exposed fragility
- The goal isn't patches, it's a flow you can trust

---

## 1. Dante's Gallery Shows No Photos

**Status:** Unstarted  
**Reporter:** Autumn (noticed by friend Dante)

### Symptoms
- Dante signed up and has been actively posting photos — uploads work fine
- He has enabled the gallery feature
- He has 12+ photos uploaded
- His gallery page shows **nothing** — completely empty

### What to investigate
- How gallery queries photos (does it filter by something Dante's account doesn't satisfy?)
- Whether gallery reads from a different data path than post uploads
- Whether the gallery feature flag is wired up correctly for his account
- Whether there's a missing join or wrong tenant scope in the gallery query

---

## 2. Signup Flow Failures + Incomplete Tenant Deletion

**Status:** Unstarted  
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

> **Note:** Autumn had previously deleted the tenants for all three test accounts, but the deletion did not fully complete — system still recognizes them and greets them by their old names. Dante's friend is a fresh account with no prior history, so the session creation failure is independent of the deletion issue.

### What to fix
1. **Magic link session creation** — clicking the email link fails to create a session for `autumn@grove.place`
2. **Tenant deletion is incomplete** — investigate what the deletion flow actually removes vs. what it leaves behind (Heartwood user record? OAuth linkage? Tenant row?)
3. **Clean up the three stuck accounts** — manually ensure `autumn@grove.place`, `wrathofthestormzero@gmail.com`, and `palmer.brown38@gmail.com` are fully purged so re-signup works correctly

---

## 3. Plant Signup — Username Field UX

**Status:** Unstarted

### Request
In the Plant signup flow, users need to know they can change their username later. Add helper text beneath the username input field, something like:

> "You can change this later in Arbor."

This removes anxiety about locking in a username during onboarding.

---

## Notes
- Investigations 1 (Dante's gallery) and 2–3 (signup flow) are **independent** — tackle separately
- Signup failures are **blocking new user acquisition** — Dante referred a friend and it failed in front of them, priority issue
- Account cleanup for the three stuck accounts needs to happen alongside the fix so testing can resume cleanly
