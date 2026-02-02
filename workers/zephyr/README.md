# Zephyr — Grove's Email Gateway

> _Carrying messages on the wind._

Zephyr is Grove's unified email gateway. Every email from every service rides the same wind: Porch replies, onboarding sequences, payment notifications, verification codes. One interface. Intelligent routing. Retries that actually work.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run locally
pnpm dev

# Deploy
pnpm deploy

# View logs
pnpm tail
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      GROVE SERVICES                              │
│   Porch · Plant · Landing · Arbor · Engine                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                   Zephyr.send({ ... })
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                     ZEPHYR WORKER                                │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Validation  │→ │  Templates   │→ │   Provider   │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                                    │                   │
│         ↓                                    ↓                   │
│  ┌──────────────┐                    ┌──────────────┐           │
│  │   Circuit    │                    │    Retry     │           │
│  │   Breaker    │                    │    Logic     │           │
│  └──────────────┘                    └──────────────┘           │
│                            │                                     │
│                    ┌───────┴───────┐                            │
│                    │   D1 Logging  │                            │
│                    └───────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                      ┌─────┴─────┐
                      │  Resend   │
                      │   API     │
                      └───────────┘
```

## Usage

### From Any Grove Service

```typescript
import { Zephyr } from "@autumnsgrove/groveengine/zephyr";

// Send an email
const result = await Zephyr.send({
  type: "notification",
  template: "porch-reply",
  to: "visitor@example.com",
  data: {
    content: "Thanks for reaching out!",
    visitId: "abc123",
  },
});

// Errors are RETURNED, not swallowed
if (!result.success) {
  console.error("Email failed:", result.error);
}
```

### Convenience Functions

```typescript
import {
  sendPorchReply,
  sendVerificationCode,
  sendPaymentEmail,
  sendSequenceEmail,
} from "@autumnsgrove/groveengine/zephyr";

// Porch reply
await sendPorchReply(email, { content, visitId, visitNumber });

// Verification code
await sendVerificationCode(email, "123456", { expiresIn: "15 minutes" });

// Payment notification
await sendPaymentEmail("received", email, { name, planName });

// Welcome sequence
await sendSequenceEmail("welcome", email, { audienceType: "wanderer" });
```

## Email Types

| Type            | Description          | From Address         | Retry |
| --------------- | -------------------- | -------------------- | ----- |
| `transactional` | One-to-one triggered | `hello@grove.place`  | 3x    |
| `notification`  | System notifications | `porch@grove.place`  | 3x    |
| `verification`  | Auth codes           | `hello@grove.place`  | 3x    |
| `sequence`      | Onboarding drip      | `autumn@grove.place` | 3x    |
| `lifecycle`     | Payment, renewal     | `hello@grove.place`  | 3x    |
| `broadcast`     | Marketing            | `autumn@grove.place` | 1x    |

## Templates

| Template                 | Type         | Description                    |
| ------------------------ | ------------ | ------------------------------ |
| `porch-reply`            | notification | Support reply to visitor       |
| `verification-code`      | verification | 6-digit auth code              |
| `payment-received`       | lifecycle    | Payment confirmation           |
| `payment-failed`         | lifecycle    | Payment failure notice         |
| `trial-ending`           | lifecycle    | Trial expiration warning       |
| `welcome`                | sequence     | Day 0 welcome                  |
| `day-1` through `day-30` | sequence     | Onboarding drip                |
| `trace-notification`     | notification | Feedback alert                 |
| `raw`                    | any          | Pre-rendered HTML pass-through |

## API Endpoints

### `POST /send`

Send an email through Zephyr.

### `GET /health`

Health check with circuit breaker status.

### `GET /stats`

Email statistics for the last 24 hours.

## Configuration

### Environment Variables

Set via `wrangler secret put`:

- `RESEND_API_KEY` — Resend API key (required)

### wrangler.toml

```toml
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "..."
```

## D1 Schema

Run the migration to create the logging table:

```bash
wrangler d1 execute grove-engine-db --file=../../packages/engine/migrations/041_zephyr_logs.sql
```

## Development

```bash
# Type check
pnpm typecheck

# Local development
pnpm dev

# Test with curl
curl -X POST http://localhost:8787/send \
  -H "Content-Type: application/json" \
  -d '{"type":"transactional","template":"raw","to":"test@example.com","subject":"Test","html":"<p>Hello</p>"}'
```

## Related

- [Zephyr Spec](/docs/specs/zephyr-spec.md) — Full technical specification
- [Email Gateway Plan](/docs/plans/planned/zephyr-email-gateway-plan.md) — Migration plan

---

_The gentle wind that carries. Invisible. Reliable. Warm._
