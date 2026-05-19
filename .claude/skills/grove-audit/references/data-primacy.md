# Lane 7: Data Primacy (C0)

**Auto-fix:** NO — extracting values to config requires understanding the domain and choosing the right source of truth.

## The Rule

> **Code translates data. It never defines it.**

If a value could change independently of the code, it must live outside the code — in a config module, named constant, or data file. If the same value appears in two places, one must derive from the other.

## Detection Patterns

**Lumen query:** `"hardcoded config value magic number string literal threshold"`

**Grep patterns:**
```
# Duplicated model name strings
grep -rn "gpt-4\|claude-3\|openrouter\|voyage" --include='*.ts' | grep -v 'config\|test\|spec'

# Magic numbers (rate limits, timeouts, thresholds)
grep -rn '[^a-zA-Z]\(3600\|86400\|60000\|30000\|1000\|500\)\b' --include='*.ts' | grep -v 'test\|spec\|config'

# Hardcoded tier names
grep -rn '"seedling"\|"sapling"' --include='*.ts' | grep -v 'config\|types\|test'

# Duplicated error messages
grep -rn 'throw.*"[A-Z]' --include='*.ts' | grep -v 'test\|spec'
```

## Sources of Truth in Lattice

| Data | Source of Truth | Import |
|------|----------------|--------|
| Tier definitions | `platform/config/tiers.ts` | `@autumnsgrove/lattice/platform/config` |
| AI model names | `lumen-models.json` + `lumen/config.ts` | `@autumnsgrove/lattice/ai/lumen` |
| Error codes/messages | Signpost catalogs (`errors/*.ts`) | `@autumnsgrove/lattice/errors` |
| Design tokens/colors | Prism (`libs/prism/`) | `@autumnsgrove/prism` |
| Rate limit definitions | Threshold/Thorn config | `@autumnsgrove/lattice/platform/threshold` |
| Billing URLs | `platform/config/billing.ts` | `@autumnsgrove/lattice/platform/config` |
| Icon identity | `libs/prism/src/lib/icons/manifest.ts` | `@autumnsgrove/prism/icons` |

## FAIL Patterns

| Pattern | Severity | Why |
|---------|----------|-----|
| Same model name string in >1 file | HIGH | Should be in `lumen/config.ts` only |
| Tier names/limits duplicated in route handlers | HIGH | Read from `tiers.ts` |
| Inline error message strings (not Signpost) | MEDIUM | Use Signpost error catalog |
| Magic threshold values as bare literals | MEDIUM | Extract to named constants |
| Rate limit windows as magic numbers (3600, 86400) | MEDIUM | Use named constants in Threshold config |
| Switch/if-else chains dispatching on string literals | MEDIUM | Use map or table-driven approach |
| Parallel data structures shadowing existing config | HIGH | One must derive from the other |

## PASS Patterns

| Pattern | Why |
|---------|-----|
| Values imported from config modules | Correct — single source |
| Named constants at module scope | Acceptable for file-local configuration |
| Computed values derived from config | Correct derivation |
| String literals in test assertions | Tests need concrete values |
| String literals that are truly code, not data (e.g., SQL column names, HTTP methods) | Not configuration |

## What to Report

For each finding:
- `file:line` reference
- The hardcoded value found
- Where it should live instead (which config module / source of truth)
- Whether duplicates exist elsewhere (if you found the same value in another file)
- Severity: HIGH for duplicated sources of truth, MEDIUM for magic numbers
