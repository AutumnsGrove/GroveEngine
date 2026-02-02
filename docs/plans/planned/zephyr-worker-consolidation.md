---
title: Zephyr Worker Consolidation
description: Future migration plans for email-catchup and email-render workers
category: plans
planCategory: infrastructure
icon: wind
lastUpdated: '2026-02-01'
status: planned
priority: medium
tags:
  - email
  - infrastructure
  - cloudflare-workers
  - zephyr
---

# Zephyr Worker Consolidation

> *Future work to consolidate remaining email workers into the Zephyr ecosystem.*

This document captures migration plans for workers that still use direct Resend calls after the initial Zephyr implementation.

---

## Current State

After the Zephyr gathering (February 2026), the following workers still bypass Zephyr:

### 1. `workers/email-catchup/worker.ts`

**What it does:**
- Weekly cron (Sunday 10:00 AM UTC)
- Finds users who missed scheduled emails
- Syncs unsubscribes from Resend back to D1
- Marks completed sequences

**Why it wasn't migrated:**
- Uses external `email-render` worker for template rendering
- Complex sequence logic with database queries
- Catch-up/recovery logic different from normal sends

**Current approach:**
- Direct Resend API calls
- Calls `EMAIL_RENDER_URL` to render React Email templates externally
- Has its own `RESEND_API_KEY` binding

### 2. `workers/email-render/` (referenced but not found in repo)

**What it does:**
- HTTP endpoint that renders React Email templates to HTML
- Called by email-catchup to get rendered email content
- Returns `{ html, text }` for a given template + data

**Why it exists:**
- React Email requires Node.js-like rendering
- Cloudflare Workers can't run React directly
- Separate worker allows template rendering in isolation

---

## Proposed Consolidation

### Option A: Zephyr Absorbs Rendering

**Approach:** Move template rendering into Zephyr itself using Worker-compatible HTML templates.

**Already done:** Zephyr now has HTML templates in `workers/zephyr/src/templates/` that don't require React.

**Migration path:**
1. ✅ Create HTML versions of all sequence templates (done)
2. Update `email-catchup` to call Zephyr instead of Resend directly
3. Remove dependency on `email-render` worker
4. Eventually deprecate `email-render` worker

**Pros:**
- Single source of truth for email sending
- Consistent retry/logging for all emails
- Simpler architecture (fewer workers)

**Cons:**
- HTML templates less maintainable than React Email
- Lose React Email's preview/development tooling

### Option B: Zephyr Calls email-render

**Approach:** Keep `email-render` as a rendering service, have Zephyr call it for React Email templates.

**Migration path:**
1. Add `EMAIL_RENDER_URL` env var to Zephyr
2. For React Email templates, Zephyr fetches rendered HTML from email-render
3. For simple templates, use built-in HTML templates
4. Update `email-catchup` to call Zephyr instead of Resend

```
email-catchup → Zephyr → email-render → (back to Zephyr) → Resend
```

**Pros:**
- Keep React Email tooling
- Gradual migration
- Templates can be updated independently

**Cons:**
- Extra network hop for React templates
- Two workers to maintain
- Latency increase

### Option C: Keep Hybrid (Current)

**Approach:** Let `email-catchup` continue using Resend directly for its specific use case.

**Rationale:**
- Catch-up emails are rare (edge cases only)
- Different retry semantics needed (per-user, not per-send)
- Weekly cron doesn't need real-time logging

**Pros:**
- No additional work needed
- Catch-up logic stays self-contained

**Cons:**
- Two API key locations
- Inconsistent logging
- Template duplication

---

## Recommended Path

**Short-term (current):** Option C — Keep hybrid. The Porch bug is fixed, primary sends go through Zephyr.

**Medium-term:** Option A — Migrate `email-catchup` to use Zephyr with HTML templates.

```typescript
// Current (email-catchup)
const html = await fetch(EMAIL_RENDER_URL, { ... });
await resend.emails.send({ html, ... });

// Future (email-catchup)
await Zephyr.send({
  type: "sequence",
  template: "day-7",
  to: email,
  data: { name, audienceType },
});
```

**Tasks for medium-term migration:**

- [ ] Update `email-catchup` to import Zephyr client
- [ ] Replace Resend calls with `Zephyr.send()`
- [ ] Remove `RESEND_API_KEY` from email-catchup wrangler.toml
- [ ] Remove `EMAIL_RENDER_URL` dependency
- [ ] Test catch-up cron with Zephyr
- [ ] Consider: Should catch-up bypass circuit breaker?

---

## Other Files Still Using Resend

These files also have direct Resend imports but are lower priority:

| File | Use Case | Migration Priority |
|------|----------|-------------------|
| `packages/landing/src/routes/feedback/+page.server.ts` | Feedback form notification | Low |
| `packages/landing/src/routes/porch/visits/[id]/+page.server.ts` | Visitor-side Porch | Low |
| `packages/landing/src/routes/porch/new/+page.server.ts` | New Porch visit | Low |
| `packages/landing/src/routes/api/webhooks/email-feedback/+server.ts` | Inbound email forwarding | Low |
| `packages/engine/src/routes/api/billing/+server.ts` | Billing notifications | Medium |
| `packages/landing/workers/onboarding-emails/worker.ts` | **DEPRECATED** — disable after verifying email-catchup | N/A |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-01 | Keep hybrid approach for now | Focus on Porch bug fix, migrate edge cases later |
| 2026-02-01 | Use HTML templates in Zephyr | Worker-compatible, no external rendering needed |
| 2026-02-01 | Document future consolidation | Capture knowledge while it's fresh |

---

## References

- [Zephyr Spec](/docs/specs/zephyr-spec.md)
- [Zephyr Email Gateway Plan](/docs/plans/planned/zephyr-email-gateway-plan.md)
- [What is Zephyr?](/docs/internal/what-is-zephyr.md)

---

*The wind will gather strength in time.*
