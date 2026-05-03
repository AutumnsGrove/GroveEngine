# SDK Boundary & Data Primacy Audit

**Date:** 2026-05-03
**Auditor:** Claude Code (Opus 4.6)
**Scope:** `apps/`, `workers/`, `services/` — all application code outside SDK implementations
**Principles tested:** C0 (Data Primacy), C0b (SDK Boundaries) as defined in `AGENT.md`

---

## Executive Summary

**319+ C0b violations and 21 C0 violations found.** The Grove SDKs are well-designed but under-adopted. Threshold, Signpost, GroveStorage, and Zephyr all exist and work — but large swaths of application code predate them and were never migrated. Error handling is the largest surface area (~2,000+ instances), rate limiting is the highest-risk category (includes a TOCTOU race condition in billing-api), and storage bindings are the most concentrated and easiest to fix.

| Category | Violations | Severity |
|----------|-----------|----------|
| C0: Data Primacy (hardcoded config) | 21 | HIGH–MEDIUM |
| C0b: Raw infrastructure bindings | 23 | CRITICAL |
| C0b: Ad-hoc rate limiting | 7 | CRITICAL |
| C0b: Error handling bypasses | ~2,091 | FAIL–WARN |
| C0b: Direct email API (Resend) | 10 | CRITICAL |
| C0b: Raw external API fetch | 2 files | CRITICAL |

---

## C0: Data Primacy Violations (21 total)

### Rate Limit Magic Numbers (8 violations — HIGH)

Values that should live in `platform/config/` or tier-based configuration:

| File | Line | Hardcoded Value | Should Be |
|------|------|-----------------|-----------|
| `apps/aspen/src/routes/api/images/upload/+server.ts` | 73-74 | `limit: 20, windowSeconds: 300` | Tier-based upload config |
| `apps/aspen/src/routes/api/images/upload/+server.ts` | 95-96 | `limit: 200, windowSeconds: 3600` | Tier-based upload config |
| `apps/aspen/src/routes/api/settings/avatar/+server.ts` | 69 | `limit: 5, windowSeconds: 3600` | Tier-based upload config |
| `apps/aspen/src/routes/api/chat/images/upload/+server.ts` | 58 | `limit: 20, windowSeconds: 3600` | Upload config module |
| `apps/aspen/src/routes/api/trace/+server.ts` | 31 | `TRACE_RATE_LIMIT = 10` | Config module |
| `apps/plant/src/routes/check-username/+server.ts` | ~40 | `RATE_LIMIT { maxRequests, windowSeconds }` | `platform/config/` |
| `apps/aspen/src/routes/api/check-domain/+server.ts` | ~26 | `RATE_LIMIT { maxRequests, windowSeconds }` | `platform/config/` |
| `apps/landing/src/routes/api/trace/+server.ts` | 23 | `10 submissions per day per IP` | Config module |

### File Size / Dimension Limits (3 violations — HIGH)

| File | Line | Hardcoded Value | Should Be |
|------|------|-----------------|-----------|
| `apps/aspen/src/routes/api/images/upload/upload-pipeline.ts` | 21 | `MAX_SIZE = 10 * 1024 * 1024` (10 MB) | `UPLOAD_CONFIG.maxImageFileSize` |
| `apps/aspen/src/routes/api/images/upload/upload-pipeline.ts` | 24 | `MAX_IMAGE_DIMENSION = 8192` | `UPLOAD_CONFIG.maxImageDimension` |
| `workers/lumen/src/types.ts` | 148 | `z.string().max(10485760)` (10 MB) | `LUMEN_CONFIG.maxAudioSize` |

### Token / Character Limits (3 violations — MEDIUM)

| File | Line | Hardcoded Value | Should Be |
|------|------|-----------------|-----------|
| `apps/aspen/src/routes/api/grove/wisp/fireside/fireside.ts` | 23 | `MAX_MESSAGE_LENGTH = 2000` | `WISP_CONFIG.maxMessageLength` |
| `apps/aspen/src/routes/api/grove/wisp/fireside/fireside.ts` | 41 | `MAX_CONVERSATION_TOKENS = 120000` | `WISP_CONFIG.maxConversationTokens` |
| `apps/aspen/src/routes/api/images/upload/upload-pipeline.ts` | 27 | `MAX_IMAGE_PIXELS = 50_000_000` | `UPLOAD_CONFIG.maxImagePixels` |

### URL Strings (4 violations — MEDIUM)

| File | Lines | Hardcoded URL | Should Be |
|------|-------|---------------|-----------|
| `apps/landing/workers/onboarding-emails/worker.ts` | 70, 90, 97, 141, 175, 185, 266, 342, 364 | `grove.place`, `cdn.grove.place`, `hello@grove.place` | `platform/config/urls.ts` |
| `apps/landing/src/lib/server/invite-email.ts` | 68 | `https://plant.grove.place/invited?token=...` | `platform/config/urls.ts` |
| `workers/subscription-digest/src/worker.ts` | 143 | `https://${sub}.grove.place/garden/...` | `platform/config/urls.ts` |
| `workers/reverie/src/lib/composer.ts` | 46 | `https://grove-lumen.internal` | Config or env binding |

### Tier Name Strings (1 violation — LOW)

| File | Line | Issue |
|------|------|-------|
| `workers/lumen/src/types.ts` | 142 | `z.enum(["wanderer", "seedling", "sapling", "oak", "evergreen"])` — should import `TierKey` type |

### Timeout / TTL Constants (2 violations — MEDIUM)

| File | Line | Value |
|------|------|-------|
| `apps/aspen/src/routes/api/images/upload/+server.ts` | 237 | `expirationTtl: 3600` |
| `apps/aspen/src/routes/api/images/upload/+server.ts` | 230 | `windowSeconds: 3600` |

### Recommended New Config Modules

1. **`platform/config/uploads.ts`** — `MAX_IMAGE_FILE_SIZE`, `MAX_IMAGE_DIMENSION`, `MAX_IMAGE_PIXELS`, per-endpoint rate limits
2. **`platform/config/urls.ts`** — `MAIN_DOMAIN`, `CDN_DOMAIN`, `PLANT_DOMAIN`, `LOGIN_DOMAIN`, `BILLING_DOMAIN`

---

## C0b: Raw Infrastructure Bindings (19 violations — CRITICAL)

### R2 Storage (14 files, 15+ instances)

All should use `GroveStorage` from `@autumnsgrove/infra` or `FileManager` from Amber.

| File | Lines | Raw Binding |
|------|-------|-------------|
| `services/grove-router/src/index.ts` | 230 | `env.MEDIA`, `env.CDN` |
| `services/amber/src/services/ExportJobV2.ts` | 459, 541 | `this.env.R2_BUCKET` |
| `services/amber/src/index.ts` | 516, 560, 823, 855, 899, 963, 965 | `env.R2_BUCKET` (7 instances) |
| `services/durable-objects/src/PostContentDO.ts` | 229, 246, 309 | `this.env.IMAGES` |
| `services/durable-objects/src/ExportDO.ts` | 426, 483 | `this.env.IMAGES`, `this.env.EXPORTS_BUCKET` |
| `apps/ivy/src/routes/api/emails/[id]/+server.ts` | 54, 56 | `env.R2` |
| `apps/ivy/src/workers/webhook/handler.ts` | 216 | `env.R2` |
| `apps/aspen/src/routes/api/export/[id]/download/+server.ts` | 103 | `platform.env.EXPORTS_BUCKET` |
| `apps/aspen/src/routes/api/export/start/+server.ts` | 145, 151, 152 | `platform.env.EXPORTS` (DO binding) |
| `apps/aspen/src/routes/api/images/list/+server.ts` | 79 | `platform.env.IMAGES` |
| `apps/aspen/src/routes/api/images/delete-batch/+server.ts` | 109 | `platform.env.IMAGES` |
| `apps/aspen/src/routes/api/images/delete/+server.ts` | 103 | `platform.env.IMAGES` |
| `apps/aspen/src/routes/api/images/filters/+server.ts` | 69 | `platform.env.IMAGES` |
| `apps/aspen/src/routes/api/sentinel/[id]/+server.ts` | 88 | `platform.env.IMAGES as unknown as R2Bucket` |
| `apps/aspen/src/routes/api/sentinel/+server.ts` | 104 | `platform.env.IMAGES as unknown as R2Bucket` |

### D1 Database (4 instances)

| File | Lines | Raw Binding |
|------|-------|-------------|
| `services/durable-objects/src/TenantDO.ts` | 273, 340, 500 | `this.env.DB.prepare()` |
| `services/amber/src/services/ExportJobV2.ts` | 526 | `this.env.DB.prepare()` |
| `apps/ivy/src/routes/api/emails/[id]/+server.ts` | 67 | `env.DB.prepare()` |
| `apps/ivy/src/workers/webhook/handler.ts` | 221 | `env.DB.prepare()` |

### KV Storage (1 instance)

| File | Lines | Raw Binding |
|------|-------|-------------|
| `services/durable-objects/src/sentinel/SentinelDO.ts` | 270 | `this.env.KV` passed directly |

---

## C0b: Ad-Hoc Rate Limiting (7 violations — CRITICAL)

All bypass the Threshold SDK (`@autumnsgrove/lattice/platform/threshold`). Each reimplements manual KV counter logic with get/increment/put.

| File | Lines | Pattern | Risk |
|------|-------|---------|------|
| `apps/plant/src/routes/api/check-username/+server.ts` | 44-95 | Manual KV counter (30 req/min) | HIGH |
| `apps/aspen/src/routes/api/check-domain/+server.ts` | 29-75 | Manual KV counter (15 req/min) — **copy-pasted from check-username** | HIGH |
| `services/billing-api/src/middleware/rateLimit.ts` | 54-87 | Manual sliding-window — **has documented TOCTOU race condition** | **CRITICAL** |
| `services/og-worker/src/index.ts` | 433-465 | Manual KV counter (100 req/hr) | HIGH |
| `libs/engine/src/lib/auth/login/server/callback.ts` | 39-67 | Manual windowed-bucket for OAuth callback | HIGH |
| `apps/ivy/src/routes/api/webhook/incoming/+server.ts` | 32-63 | Manual dual-window counter (per-min + per-hr) | HIGH |

**Note:** The billing-api implementation (lines 49-52) explicitly documents a TOCTOU race condition where concurrent requests can bypass the rate limit. This is both a C0b violation and a security vulnerability.

**Correct implementations for reference:** `workers/lumen/`, `workers/reverie/`, `workers/reverie-exec/` all use Threshold SDK correctly.

---

## C0b: Error Handling Bypasses (~2,091 violations)

### Bare `throw new Error()` (~353 instances — FAIL)

Should use `throwGroveError(status, ERROR_DEF, source)`.

**Hotspots:**

| File / Directory | Count | Notes |
|-----------------|-------|-------|
| `workers/timeline-sync/src/` | ~20 | generator.ts, encryption.ts, secrets-manager.ts, github.ts |
| `services/heartwood/src/` | ~30+ | auth/index.ts, db/queries.ts, routes/* |
| `services/durable-objects/src/` | ~15+ | ChatDO.ts, TenantDO.ts, ExportDO.ts |
| `services/zephyr/src/templates/` | ~6 | Uses `throw new Error(ZEPHYR_ERRORS.*.adminMessage)` — has catalog but wrong throw pattern |
| `services/og-worker/src/` | ~4 | Uses `throw new Error(OG_ERRORS.*.adminMessage)` — same pattern |
| `workers/meadow-poller/src/` | ~4 | HTTP errors, feed parsing |
| `workers/onboarding/src/` | ~2 | Agent errors |

### Ad-Hoc JSON Error Responses (~66 instances — FAIL)

Should use `json(buildErrorJson(ERROR_DEF), { status })`.

**Hotspots:**

| File / Directory | Count | Notes |
|-----------------|-------|-------|
| `services/heartwood/src/routes/` | ~48 | user.ts, device.ts, subscription.ts, cdn.ts, verify.ts — all return `c.json({ error: "..." })` |
| `services/durable-objects/src/ChatDO.ts` | ~14 | Returns `Response.json({ error: "..." })` |
| `services/email-render/src/worker.ts` | ~4 | Returns `json({ error: "..." })` |

### `console.error()` Without Signpost (~1,672 instances — WARN)

Should use `logGroveError(source, ERROR_DEF, context)`.

**Sampled hotspots:**

| File / Directory | Notes |
|-----------------|-------|
| `services/heartwood/src/` | Session validation, OAuth, BetterAuth, settings routes |
| `services/zephyr/src/` | D1 logging, rate limiting, circuit breaker, unsubscribe |
| `services/heartwood/src/templates/settings.ts` | 10+ console.error calls in settings UI handlers |

---

## C0b: Direct Email API Usage (10 violations — CRITICAL)

All should use `createZephyrClient()` from `@autumnsgrove/lattice/zephyr`.

| File | Lines | Pattern |
|------|-------|---------|
| `apps/landing/src/routes/api/webhooks/email-feedback/+server.ts` | 111 | `new Resend(platform.env.RESEND_API_KEY)` |
| `apps/landing/workers/onboarding-emails/worker.ts` | 391 | `new Resend(env.RESEND_API_KEY)` |
| `apps/landing/src/routes/arbor/porch/[id]/+page.server.ts` | 185 | `new Resend(platform.env.RESEND_API_KEY)` |
| `apps/landing/src/routes/porch/new/+page.server.ts` | 196, 262 | `new Resend(platform.env.RESEND_API_KEY)` (x2) |
| `apps/landing/src/routes/porch/visits/[id]/+page.server.ts` | 144 | `new Resend(platform.env.RESEND_API_KEY)` |
| `apps/landing/src/routes/security/+page.server.ts` | 102, 168 | `new Resend(platform.env.RESEND_API_KEY)` (x2) |
| `workers/email-catchup/worker.ts` | 166, 296 | `new Resend(env.RESEND_API_KEY)` (x2) |

---

## C0b: Raw External API Fetch (2 files — CRITICAL)

Should use `createWardenClient()` for credential-managed API access.

| File | Lines | Pattern |
|------|-------|---------|
| `apps/aspen/src/routes/api/curios/timeline/generate/github-fetcher.ts` | 108-216 | Multiple `fetch("https://api.github.com/...")` with bearer token |
| `apps/aspen/src/routes/api/curios/timeline/backfill/+server.ts` | 250-356 | Multiple `fetch("https://api.github.com/...")` with bearer token |

---

## Remediation Priority

### P0 — Security Risk (do first)

1. **billing-api rate limit TOCTOU race** — `services/billing-api/src/middleware/rateLimit.ts` — migrate to Threshold SDK with atomic DO-backed store
2. **All 7 ad-hoc rate limiters** — migrate to Threshold SDK (small batch, highest impact)

### P1 — Critical SDK Violations (concentrated, mechanical)

3. **Raw R2 storage bindings** — 14 files, mostly in Aspen image routes + Amber service — migrate to GroveStorage
4. **Direct Resend usage** — 10 instances all in landing app + email-catchup — migrate to Zephyr
5. **GitHub API via raw fetch** — 2 files in timeline curio — migrate to Warden

### P2 — Config Centralization

6. **Create `platform/config/uploads.ts`** — centralize file size, dimension, and pixel limits
7. **Create `platform/config/urls.ts`** — centralize domain strings
8. **Move rate limit constants** — from route handlers into tier config or dedicated modules

### P3 — Error Handling (largest surface, phased)

9. **Heartwood route handlers** — 48+ ad-hoc JSON responses, highest density
10. **Bare throws in workers** — timeline-sync, meadow-poller, onboarding
11. **console.error → logGroveError** — systematic sweep (lowest urgency, highest volume)

---

## Good Patterns Found (for reference)

These are doing it right — use as migration models:

- `workers/lumen/src/lib/rate-limit.ts` — correct Threshold SDK usage
- `workers/reverie/src/lib/rate-limit.ts` — correct Threshold + DO store
- `workers/reverie-exec/src/lib/rate-limit.ts` — correct Threshold + DO store
- `libs/engine/src/lib/platform/config/tiers.ts` — gold standard config centralization
- `libs/engine/src/lib/data/lumen-models.json` — model registry as data file
- `libs/engine/src/lib/errors/` — properly structured Signpost error catalogs

---

_Audit conducted against principles defined in commit `a0c468113` (2026-05-03)._
_Next audit recommended after P0-P1 remediation is complete._
