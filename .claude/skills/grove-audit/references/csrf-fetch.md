# Lane 3: CSRF / Fetch Safety

**Auto-fix:** YES — convert bare `fetch()` to `api.*()` calls.

## The Rule

Client-side code must use `api.*()` from `$lib/utils/api` for internal API calls. Bare `fetch()` skips CSRF token injection and credentials. The server has an origin-based fallback, but `api.*()` is the correct pattern.

## Detection Patterns

**Lumen query:** `"bare fetch client side API call"`

**Grep patterns:**
```
grep -rn 'fetch\s*(\s*["\x27`]\s*/' --include='*.svelte' --include='*.ts' --include='*.js'
```

Filter to client-side files only. Exclude:
- `+server.ts`, `+page.server.ts`, `+layout.server.ts` — server-side, legitimate external calls
- `hooks.server.ts`, `hooks.client.ts` — framework hooks
- `*.test.ts`, `*.spec.ts` — test files
- Files in `libs/` that are SDK internals

## FAIL Patterns

| Pattern | Fix |
|---------|-----|
| `fetch('/api/...')` in client code | `api.get('/api/...')` or `api.post('/api/...', body)` |
| `fetch('/api/...', { method: 'POST', body })` | `api.post('/api/...', body)` |
| `fetch('/api/...', { method: 'PUT', body })` | `api.put('/api/...', body)` |
| `fetch('/api/...', { method: 'DELETE' })` | `api.del('/api/...')` |
| Raw `fetch()` to external APIs in client code | Use appropriate SDK (Lumen, Zephyr, Warden) |

## PASS Patterns

| Pattern | Why |
|---------|-----|
| `api.get()`, `api.post()`, `api.put()`, `api.del()` | Correct — auto-injects CSRF |
| `fetch("?/actionName")` | SvelteKit form action — handled by SvelteKit CSRF |
| `fetch()` in server-side files | Legitimate — service bindings, external APIs |
| Lines with `// csrf-ok` | Intentional exception |

## Auto-Fix Rules

1. Identify the HTTP method from the fetch options (default: GET)
2. Extract the URL argument
3. Replace with the corresponding `api.*()` call
4. Add the import if not present: `import { api } from '$lib/utils/api'`

```typescript
// BEFORE
const res = await fetch('/api/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// AFTER
import { api } from '$lib/utils/api';
const res = await api.post('/api/posts', data);
```

**Edge cases that should NOT be auto-fixed (report instead):**
- `fetch()` with complex options (custom headers beyond Content-Type, streams, AbortController)
- `fetch()` to external URLs (needs SDK routing, not api.*)
- `fetch()` for blob/file downloads (needs `getCSRFToken()` pattern)

## Suppression

`// csrf-ok` on the line or the next line skips the check. Also check up to 1 line below (Prettier sometimes moves comments).
