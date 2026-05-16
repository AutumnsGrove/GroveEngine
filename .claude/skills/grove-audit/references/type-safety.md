# Lane 8: Type Safety / Rootwork

**Auto-fix:** NO — type boundary changes require understanding the data shape and choosing the right Zod schema.

## The Rule

External data must be validated at trust boundaries using Rootwork utilities from `@autumnsgrove/lattice/server`. No unsafe `as` casts on form data, KV reads, API responses, or webhook payloads.

## Detection Patterns

**Lumen query:** `"as any unsafe cast form data JSON parse type assertion"`

**Grep patterns:**
```
# Unsafe casts on external data
grep -rn 'as any' --include='*.ts' | grep -v 'test\|spec\|\.d\.ts'

# FormData without parseFormData
grep -rn 'formData\.get.*as string\|formData\.get.*as number' --include='*.ts'

# JSON.parse without safeJsonParse
grep -rn 'JSON\.parse(' --include='*.ts' | grep -v 'safeJsonParse\|test\|spec'

# KV reads with unsafe cast
grep -rn '\.get(.*"json".*) as\|\.get(.*) as' --include='*.ts' | grep -i 'kv\|cache'

# Missing isRedirect/isHttpError in catch blocks
grep -rn 'catch.*err\|catch.*error\|catch.*e)' --include='*.ts' -A5 | grep -v 'isRedirect\|isHttpError'

# request.json() with unsafe cast
grep -rn 'request\.json().*as [A-Z]' --include='*.ts'
```

## FAIL Patterns

| Pattern | Severity | Fix |
|---------|----------|-----|
| `formData.get("name") as string` | HIGH | `parseFormData(formData, ZodSchema)` |
| `(await kv.get(key, "json")) as MyType` | HIGH | `safeJsonParse(await kv.get(key), Schema) ?? fallback` |
| `JSON.parse(raw) as Config` | HIGH | `safeJsonParse(raw, ConfigSchema)` |
| `(err as any)?.status === 302` in catch | HIGH | `isRedirect(err)` — re-throw if true |
| `(err as any)?.status >= 400` in catch | HIGH | `isHttpError(err)` |
| Catch block that swallows redirects | HIGH | Must check `isRedirect(err)` first |
| `as any` on external data (form, KV, webhooks, API responses) | MEDIUM | Use appropriate Rootwork utility |
| `(await request.json()) as SomeType` | MEDIUM | Use Zod schema validation |

## PASS Patterns

| Pattern | Why |
|---------|-----|
| `parseFormData(formData, Schema)` | Correct Rootwork usage |
| `safeJsonParse(raw, Schema) ?? fallback` | Correct with fallback |
| `isRedirect(err)` / `isHttpError(err)` | Correct error type guards |
| `as const` for literal narrowing | TypeScript feature, not unsafe cast |
| `as SomeType` on internal known data | Trust inside the boundary |
| `(await request.json()) as Record<string, unknown>` | Acceptable for simple cases |

## Decision Guide

| Reading from... | Use |
|-----------------|-----|
| `request.formData()` | `parseFormData(formData, Schema)` |
| `kv.get()` or any JSON string | `safeJsonParse(raw, Schema)` |
| Cache service `.get()` | `createTypedCacheReader(cache)` |
| SvelteKit catch block | `isRedirect()` / `isHttpError()` |
| Webhook `event.data` | Custom typed accessor |

## What to Report

For each finding:
- `file:line` reference
- The unsafe pattern found
- Which Rootwork utility should replace it
- Severity: HIGH for external data boundaries (form, KV, API), MEDIUM for internal casts
