# What is Zephyr?

> *In mythology, Zephyrus was the god of the west wind—the gentlest of the four winds, bringer of spring. While other winds howled and destroyed, the zephyr carried seeds to new soil, pollen to waiting flowers, whispers to distant ears.*

**Zephyr is Grove's unified email gateway.** It's a single Cloudflare Worker that handles all email sending across the entire Grove ecosystem.

## The Problem It Solves

Before Zephyr, email sending in Grove was... scattered:

- **9+ locations** sending email directly through Resend
- **7 files** reading `RESEND_API_KEY` independently
- **3 different template systems** (React Email, inline HTML, HTML functions)
- **Silent failures** — errors logged but never surfaced to users

The worst case was Porch: when admin replied to a visitor, the email send could fail silently. The database recorded the reply, the UI said "sent!", but the visitor never received anything. They'd wait for a reply that would never come.

## How Zephyr Fixes This

### One Interface

Every Grove service sends email the same way:

```typescript
import { Zephyr } from "@autumnsgrove/groveengine/zephyr";

const result = await Zephyr.send({
  type: "notification",
  template: "porch-reply",
  to: recipientEmail,
  data: { content, visitId },
});
```

### Errors Are Returned, Not Swallowed

```typescript
// Before (THE BUG)
try {
  await resend.emails.send({ ... });
} catch (err) {
  console.error("Failed:", err);
  // Don't fail - message is saved
}

// After (THE FIX)
const result = await Zephyr.send({ ... });
if (!result.success) {
  // Error is RETURNED to caller
  return { replySuccess: true, emailFailed: true };
}
```

### Automatic Retries

Zephyr retries failed sends with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 1 second delay
- Attempt 3: 2 seconds delay

### Circuit Breaker

If Resend has 5 failures in 1 minute, Zephyr stops trying for 30 seconds. This prevents cascade failures and respects the provider.

### Centralized Logging

Every email attempt is logged to D1:
- Who it was sent to
- Which template was used
- Whether it succeeded or failed
- How long it took
- Provider used

**What's NOT logged:** Email body content. Privacy matters.

### Single API Key

Instead of 7 files reading `RESEND_API_KEY`, there's now just one: the Zephyr worker itself.

## Architecture

```
Grove Services → Zephyr.send() → Zephyr Worker → Resend API
                                      ↓
                                 D1 Logging
```

Zephyr is a Cloudflare Worker deployed at `grove-zephyr.autumnsgrove.workers.dev`. Services call it via HTTP (abstracted by the client library), and it handles:

1. **Validation** — Is this a valid request?
2. **Template Rendering** — Turn template + data into HTML
3. **Provider Routing** — Send via Resend (future: fallback providers)
4. **Retry Logic** — Try again on transient failures
5. **Circuit Breaking** — Stop when provider is unhealthy
6. **Logging** — Record everything (except content)

## Email Types

Zephyr routes emails based on their type:

| Type | What It Is | From Address |
|------|------------|--------------|
| `transactional` | One-off triggered emails | `hello@grove.place` |
| `notification` | System alerts, replies | `porch@grove.place` |
| `verification` | Auth codes, magic links | `hello@grove.place` |
| `sequence` | Onboarding drip emails | `autumn@grove.place` |
| `lifecycle` | Payment, subscription | `hello@grove.place` |
| `broadcast` | Marketing (rare) | `autumn@grove.place` |

## Templates

Templates are HTML generators that live in the Zephyr worker:

- `porch-reply` — Admin reply to Porch visitor
- `verification-code` — 6-digit auth code
- `payment-received` / `payment-failed` — Billing notifications
- `welcome`, `day-1`, `day-7`, etc. — Onboarding sequence
- `raw` — Pass pre-rendered HTML directly

## The Name

Why "Zephyr"?

The metaphor is the architecture: **gentle delivery, invisible infrastructure**.

You don't see the wind, but you see what it carries. Zephyr delivers messages without drawing attention to itself. It's reliable, warm, and patient.

---

*Carrying messages on the wind.*
