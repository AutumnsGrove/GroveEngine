# Lane 9: Security (STRIDE)

**Auto-fix:** NO — security issues require careful analysis and contextual understanding.

## The Rule

Apply STRIDE threat modeling to discover security vulnerabilities. This lane checks for exploitable issues, not just pattern violations. Every finding must have evidence (`file:line`) and realistic exploitability assessment.

## STRIDE Categories

### S — Spoofing

Can a caller fake their identity?

**Lumen query:** `"authentication tenant verification session identity"`

**Grep patterns:**
```
grep -rn 'getVerifiedTenantId\|getTenantId\|tenantId' --include='*.ts'
grep -rn 'POST\|PUT\|DELETE\|PATCH' --include='+server.ts' --include='+page.server.ts'
```

**Check for:**
- State-mutating endpoints (POST/PUT/DELETE) without `getVerifiedTenantId()`
- Session not verified before trust
- User-provided identity accepted without validation

**Grove pattern:** `getVerifiedTenantId()` must gate all tenant-scoped mutations.

### T — Tampering

Can malicious input corrupt data or bypass logic?

**Lumen query:** `"input validation form data user input SQL query"`

**Check for:**
- Unvalidated form fields (missing `parseFormData()`)
- SQL parameters built from string concatenation (not parameterized)
- Missing Rootwork parsers at trust boundaries
- Business logic steps that can be skipped

### R — Repudiation

Can users deny taking actions?

**Lumen query:** `"audit log state change delete create payment"`

**Check for:**
- Significant state changes (create, delete, payment, permission) without audit logging
- Missing Signpost error context for debugging
- No record of who did what and when

### I — Information Disclosure

Does code leak sensitive data?

**Lumen query:** `"adminMessage response token secret PII stack trace"`

**Grep patterns:**
```
grep -rn 'adminMessage' --include='*.ts'
grep -rn 'console\.log.*token\|console\.log.*key\|console\.log.*password\|console\.log.*secret' --include='*.ts'
grep -rn 'stack\|stackTrace' --include='*.ts' | grep -v 'test\|spec'
```

**Check for:**
- `adminMessage` field returned in client-visible responses
- Sensitive fields (tokens, hashes, internal IDs) in JSON responses
- `console.log` with secrets or PII
- Error messages exposing stack traces or internal state
- R2 keys or presigned URLs generated without ownership verification

### D — Denial of Service

Can code be abused to exhaust resources?

**Lumen query:** `"rate limit endpoint upload query LIMIT unbounded"`

**Check for:**
- New endpoints without rate limiting (especially auth, account creation, file uploads)
- Unbounded database queries without `LIMIT` clauses
- Missing file size validation on uploads
- Loops driven by user input without bounds
- Missing `Threshold` SDK usage where rate limiting is needed

**Grove pattern:** Use `Threshold` for rate limiting, not hand-rolled KV counters.

### E — Elevation of Privilege

Can users access beyond their tier or ownership?

**Lumen query:** `"tenant isolation tier check admin IDOR authorization"`

**Grep patterns:**
```
grep -rn 'tenant_id\|tenantId' --include='*.ts' -A3 | grep -v 'WHERE\|tenant'
grep -rn 'isAdmin\|role.*admin\|tier.*check' --include='*.ts'
```

**Check for:**
- Queries without `tenant_id` scoping (missing tenant isolation)
- Tier checks absent on gated features
- Admin-only actions reachable by non-admins
- IDOR: user can reference another user's resource by changing an ID parameter
- Raw `env.DB` bypassing `getTenantDb()` scoping

## Security Anti-Patterns

| Pattern | Severity | Fix |
|---------|----------|-----|
| `Object.assign(new Error(), untrustedData)` | CRITICAL | Direct property assignment |
| `token === expectedToken` for secrets | CRITICAL | `timingSafeEqual()` |
| `Math.random()` for security values | HIGH | `crypto.getRandomValues()` |
| `eval()` or `new Function()` | CRITICAL | Never use with user input |
| `innerHTML = userInput` | CRITICAL | Sanitize or use textContent |
| `JSON.parse()` without try/catch at boundary | MEDIUM | `safeJsonParse()` |
| Hardcoded API keys/tokens | CRITICAL | Environment variables / Warden |
| `.env` files in diff | CRITICAL | Must be in `.gitignore` |

## What to Report

For each finding:
- `file:line` reference
- STRIDE category (S/T/R/I/D/E)
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Realistic exploitability assessment (not worst-case theory)
- Specific remediation steps
- Whether it's a new vulnerability or pre-existing

**Severity honesty:** Rate by actual exploitability and impact. A timing-unsafe comparison on a rate-limit key is LOW. A timing-unsafe comparison on an auth token is CRITICAL. Context matters.
