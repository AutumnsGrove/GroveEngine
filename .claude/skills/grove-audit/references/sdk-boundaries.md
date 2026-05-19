# Lane 6: SDK Boundaries (C0b)

**Auto-fix:** NO — SDK boundary violations require understanding the surrounding code to apply the right SDK pattern.

## The Rule

> **Every capability is accessed through its owning SDK. If no SDK exists, build the shared function so the next consumer doesn't reinvent it.**

**The test:** "If I needed to change how this works, how many files would I touch?" 1 (the owning SDK) = PASS. >1 = FAIL.

## Detection Patterns

**Lumen query:** `"raw env.DB env.BUCKET env.KV direct binding access"`

**Grep patterns:**
```
# Raw database
grep -rn 'env\.DB\.\|c\.env\.DB\.\|platform\.env\.DB' --include='*.ts'

# Raw storage
grep -rn 'env\.BUCKET\.\|\.put(\|\.get(\|\.delete(' --include='*.ts' | grep -i 'r2\|bucket'

# Raw KV
grep -rn 'env\.KV\.\|env\.[A-Z_]*KV\.' --include='*.ts'

# Raw AI
grep -rn 'new OpenAI(\|new Anthropic(' --include='*.ts'

# Raw email
grep -rn 'new Resend(\|import.*Resend' --include='*.ts'

# Raw rate limiting (hand-rolled KV counters)
grep -rn 'rl:\|rate.limit\|rateLimit' --include='*.ts' | grep -v 'threshold\|Threshold'
```

## Capability Ownership Map

| Capability | Owner | Consumers Call | They Do NOT |
|---|---|---|---|
| Database | `@autumnsgrove/infra` | `GroveDatabase`, `createDb()`, `scopedDb()` | `env.DB.prepare()`, `platform.env.DB` |
| Storage | `@autumnsgrove/lattice/amber` | `FileManager`, `GroveStorage` | `env.BUCKET.put()`, raw R2 ops |
| KV | `@autumnsgrove/infra` | `GroveKV` via `GroveContext` | `env.KV.get()` / `.put()` |
| AI | `@autumnsgrove/lattice/ai/lumen` | `createLumenClient()`, `RemoteLumenClient` | `new OpenAI()`, raw model API fetch |
| Rate limiting | `@autumnsgrove/lattice/platform/threshold` | `createThreshold()`, `thresholdMiddleware()` | Hand-rolled KV counters |
| Email | `@autumnsgrove/lattice/zephyr` | `createZephyrClient()`, `zephyr.send()` | `new Resend()`, raw email API |
| Credentials | Warden (service binding) | `createWardenClient()` | Hardcoded API keys in worker env |
| Icons | `@autumnsgrove/prism/icons` | Semantic groups | `@lucide/svelte` directly |
| Client fetch | `$lib/utils/api` | `apiRequest()` | Raw `fetch()` for internal APIs |
| Type boundaries | `@autumnsgrove/lattice/server` | `parseFormData()`, `safeJsonParse()` | `as any` on external data |

## Exempt Contexts (mark PASS with note)

- SDK library files themselves (`libs/infra/`, `libs/engine/src/lib/threshold/`, etc.) — they wrap raw bindings by design
- Durable Objects with dual-binding strategy (e.g., Warden's `TENANT_DB`)
- Migration scripts that run outside normal SDK flow
- Test mocks that reference raw types
- Wrangler config binding declarations
- Lines with `// boundary-ok`

## Resolution Order

When reporting a violation, suggest the resolution:
1. **SDK exists** → use it (name the import path)
2. **Engine has it** → import from `@autumnsgrove/lattice/...`
3. **Neither exists** → suggest building it in the engine first
4. **Truly app-specific** → note that local code is acceptable if genuinely unique

## What to Report

For each finding:
- `file:line` reference
- The raw binding pattern found
- Which SDK should be used instead (with import path)
- Severity: HIGH for database/storage/KV (data integrity), MEDIUM for others
