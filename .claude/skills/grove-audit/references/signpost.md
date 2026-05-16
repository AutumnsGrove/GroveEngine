# Lane 5: Signpost Compliance

**Auto-fix:** NO — error handling changes require judgment about context and error catalogs.

## The Rule

All error handling must go through Signpost (`@autumnsgrove/lattice/errors`). No bare `throw new Error()`, no `console.error()`, no ad-hoc JSON error responses, no `alert()`.

## Detection Patterns

**Lumen query:** `"throw new Error console.error error handling"`

**Grep patterns:**
```
# Bare throws
grep -rn 'throw new Error(' --include='*.ts' --include='*.js'

# Console.error without logGroveError
grep -rn 'console\.error(' --include='*.ts' --include='*.js'

# alert() in Svelte
grep -rn 'alert(' --include='*.svelte'

# adminMessage in client responses
grep -rn 'adminMessage' --include='*.ts' --include='*.svelte'
```

## FAIL Patterns

| Pattern | Severity | Fix |
|---------|----------|-----|
| `throw new Error("something broke")` | MEDIUM | `throwGroveError(status, ERROR_DEF, source)` from Signpost |
| `console.error()` without `logGroveError()` | MEDIUM | `logGroveError(source, ERROR_DEF, context)` |
| Ad-hoc JSON error responses (`json({ error: "..." })`) | MEDIUM | `buildErrorJson()` for consistent error shape |
| `alert()` in Svelte components | HIGH | Use `toast` from `@autumnsgrove/lattice/ui` |
| `adminMessage` exposed in client-visible responses | HIGH | Admin messages are server-only, never in response body |

## PASS Patterns

| Pattern | Why |
|---------|-----|
| `throwGroveError(status, ERROR_DEF, source)` | Correct Signpost usage |
| `logGroveError(source, ERROR_DEF, context)` | Correct structured logging |
| `buildErrorJson(ERROR_DEF)` | Correct error response shape |
| `toast.error('...')` | Correct user-facing notification |
| `console.log()` for debug (not errors) | Fine, though prefer structured logging |

## Exempt Contexts

- SDK library internals that define error catalogs
- Test files using `expect(() => ...).toThrow()`
- Migration scripts
- CLI tools
- Lines with `// error-ok`

## What to Report

For each finding:
- `file:line` reference
- The bare error pattern found
- Which Signpost function should replace it
- Which error catalog the error likely belongs to (suggest based on the file's domain)

## Error Catalog Hint

To suggest the right catalog, check the file's location:
- `libs/engine/src/lib/amber/` → Amber errors
- `libs/engine/src/lib/lumen/` → Lumen errors
- `libs/engine/src/lib/thorn/` → Thorn errors
- `apps/*/src/routes/api/` → API errors
- `workers/*/` → Worker-specific errors
