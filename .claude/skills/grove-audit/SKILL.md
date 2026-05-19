---
name: grove-audit
description: Unified codebase audit that launches 10 parallel micro-lane subagents to check compliance, security, and quality. Auto-fixes deterministic issues, reports everything else inline. Three modes — quick (branch diff), standard (changed packages), full (entire codebase).
---

# Grove Audit

A fleet of 10 narrow-scoped subagents, each checking one thing well. Deterministic violations get auto-fixed and committed. Judgment calls get reported inline with `file:line` evidence.

## When to Activate

- User says `/grove-audit`, `/grove-audit quick`, `/grove-audit standard`, or `/grove-audit full`
- User asks for a comprehensive code review, compliance check, or codebase sweep
- Before major merges or releases
- After large refactors to catch regressions
- During active development to sweep for legacy violations

## Modes

| Mode | Scope | When to Use |
|------|-------|-------------|
| `quick` | Branch diff vs main | Iterative development, pre-commit check |
| `standard` | Changed packages (git diff + affected deps) | Pre-merge, after refactors |
| `full` | Entire codebase via Lumen + grep | Periodic sweeps, post-refactor cleanup, first-time audit |

Default when no mode specified: infer from context. On a feature branch with changes → `standard`. On main with no changes → `full`. User specified a scope → use that.

---

## Protocol

```
SCOPE → DISCOVER → DISPATCH → COLLECT → FIX → REPORT
  ↓        ↓          ↓          ↓        ↓       ↓
 Mode    Files     10 agents   Results  Commit  Inline
```

### Phase 1: SCOPE

Determine the audit mode and file set.

**Quick mode:**
```bash
git diff main...HEAD --name-only
```

**Standard mode:**
```bash
git diff main...HEAD --name-only
# Plus: identify affected packages from changed files
# Include downstream consumers of changed libs
```

**Full mode:**
- No file filtering — each lane agent discovers its own targets via Lumen semantic search + grep/glob
- Each agent gets the full codebase as its search space

### Phase 2: DISCOVER

For quick/standard modes, build the file list and pass it to each agent.
For full mode, each agent does its own discovery — this is the key advantage of full sweeps.

**Lumen is the primary discovery tool.** Each agent should query Lumen first to find files related to its concern, then use grep/glob to verify and catch stragglers. Agents have full access to all search tools — Lumen, grep, glob, find. No handicaps.

### Phase 3: DISPATCH

Launch all 10 lane agents **in parallel** using the Agent tool. Each agent gets:
1. Its lane reference doc (from `references/`)
2. The mode and file scope (for quick/standard) or "full sweep" instruction
3. Clear output format expectations

**The 10 Lanes:**

| # | Lane | Agent Type | Reference | Auto-Fix? |
|---|------|------------|-----------|-----------|
| 1 | Barrel Imports | sonnet-coder | `references/barrel-imports.md` | Yes |
| 2 | Icon Gateway | sonnet-coder | `references/icon-gateway.md` | Yes |
| 3 | CSRF / Fetch Safety | sonnet-coder | `references/csrf-fetch.md` | Yes |
| 4 | Accent Tokens | sonnet-coder | `references/accent-tokens.md` | Yes |
| 5 | Signpost Compliance | sonnet-coder | `references/signpost.md` | No |
| 6 | SDK Boundaries | sonnet-coder | `references/sdk-boundaries.md` | No |
| 7 | Data Primacy | sonnet-coder | `references/data-primacy.md` | No |
| 8 | Type Safety | sonnet-coder | `references/type-safety.md` | No |
| 9 | Security (STRIDE) | opus-coder | `references/security.md` | No |
| 10 | Test Coverage | sonnet-coder | `references/test-coverage.md` | No |

**Why opus for security only:** STRIDE threat modeling requires deeper reasoning about attack surfaces and trust boundaries. The other lanes are pattern-matching tasks where sonnet excels.

**Agent prompt template:**

Each agent receives:
1. The full content of its reference doc (read it and include it in the prompt)
2. Mode + file scope
3. Instructions to use Lumen (`mcp__lumen__semantic_search`) as primary discovery, supplemented by grep/glob
4. Output format: structured findings list with `file:line`, severity, and fix description
5. For auto-fix lanes (1-4): instructions to make the fixes directly
6. For report lanes (5-10): read-only — return findings only

### Phase 4: COLLECT

Wait for all 10 agents to complete. Gather their results.

### Phase 5: FIX

For auto-fix lanes (1-4) that made changes:

1. Review the changes each agent made (verify they're correct)
2. Stage the fixed files
3. Commit with a descriptive message:

```bash
git commit -m "$(cat <<'EOF'
fix(audit): auto-fix [barrel imports|icon gateway|CSRF fetch|accent tokens]

[Summary of what was fixed, e.g., "12 barrel imports converted to direct imports"]

Co-Authored-By: Claude (Grove Agent)
EOF
)"
```

Group related fixes into logical commits — one per auto-fix lane that had changes.

### Phase 6: REPORT

Compile the inline report from all 10 lanes. Format:

```
================================================================================
 GROVE AUDIT REPORT
 Mode: [quick|standard|full] | Files scanned: N | Date: YYYY-MM-DD
================================================================================

AUTO-FIXED (committed)
--------------------------------------------------------------------------------
Lane 1 — Barrel Imports: N fixes applied
Lane 2 — Icon Gateway: N fixes applied
Lane 3 — CSRF / Fetch: N fixes applied
Lane 4 — Accent Tokens: N fixes applied

FINDINGS (requires manual attention)
--------------------------------------------------------------------------------

[CRITICAL] ──────────────────────────────────────
  1. [SDK Boundaries] libs/engine/src/lib/foo.ts:42
     Raw env.DB.prepare() — use GroveDatabase from @autumnsgrove/infra
  ...

[HIGH] ──────────────────────────────────────────
  ...

[MEDIUM] ────────────────────────────────────────
  ...

[LOW] ───────────────────────────────────────────
  ...

SUMMARY
--------------------------------------------------------------------------------
┌──────────────────────────┬────────┬───────┬──────────────┐
│ Lane                     │ Status │ Found │ Fixed        │
├──────────────────────────┼────────┼───────┼──────────────┤
│ 1. Barrel Imports        │ ✓ FIXED│   12  │ 12 auto-fix  │
│ 2. Icon Gateway          │ ✓ CLEAN│    0  │ —            │
│ 3. CSRF / Fetch          │ ✓ FIXED│    3  │ 3 auto-fix   │
│ 4. Accent Tokens         │ ✓ CLEAN│    0  │ —            │
│ 5. Signpost Compliance   │ ⚠ WARN │    5  │ manual       │
│ 6. SDK Boundaries        │ ✗ FAIL │    8  │ manual       │
│ 7. Data Primacy          │ ✓ PASS │    0  │ —            │
│ 8. Type Safety           │ ⚠ WARN │    2  │ manual       │
│ 9. Security (STRIDE)     │ ✓ PASS │    0  │ —            │
│ 10. Test Coverage        │ ⚠ WARN │    4  │ manual       │
└──────────────────────────┴────────┴───────┴──────────────┘

Total: 34 findings | 15 auto-fixed | 19 manual | 0 critical
================================================================================
```

---

## Severity Classification

| Severity | Meaning | Examples |
|----------|---------|---------|
| CRITICAL | Exploitable vulnerability or data leak | Raw env.DB without tenant scoping, adminMessage in client response, timing-unsafe secret comparison |
| HIGH | Architectural violation that compounds | Raw SDK bypass (env.DB, env.BUCKET), duplicated data sources, missing rate limiting on auth |
| MEDIUM | Pattern violation, not dangerous | Barrel imports, bare Lucide icons, hardcoded accent colors, missing Signpost errors |
| LOW | Style/hygiene, no functional impact | Missing tests for utilities, Svelte 5 store usage, stale TODO comments |

---

## Agent Prompting Guide

When dispatching each lane agent, read the corresponding reference file and include its full content in the agent prompt. Structure each prompt as:

```
You are a focused code auditor for the Grove/Lattice monorepo.
Your ONLY job is: [lane description].

MODE: [quick|standard|full]
SCOPE: [file list for quick/standard, or "full codebase" for full]

RULES (from reference doc):
[paste full reference content]

DISCOVERY:
- Use mcp__lumen__semantic_search as your primary discovery tool
- Supplement with grep and glob for exact pattern matching
- For full mode: discover your own targets, don't wait for a file list

OUTPUT FORMAT:
Return a structured list of findings:
- file_path:line_number
- severity: CRITICAL | HIGH | MEDIUM | LOW
- description: what's wrong
- fix: what to do instead (or "auto-fixed" for lanes 1-4)

[For auto-fix lanes 1-4 only:]
AUTO-FIX: You MUST fix deterministic violations directly using Edit.
After fixing, report what you changed.

[For report lanes 5-10:]
READ-ONLY: Do NOT edit any files. Report findings only.
```

---

## Suppression Comments

Each lane respects specific suppression comments. These are documented in the lane references:

| Lane | Suppression | Effect |
|------|-------------|--------|
| Barrel Imports | `// barrel-ok` | Skip this import |
| Icon Gateway | `// prism-ok` | Allow bare Lucide import |
| CSRF / Fetch | `// csrf-ok` | Allow bare fetch() |
| Accent Tokens | `// accent-ok` | Allow hardcoded color |
| SDK Boundaries | `// boundary-ok` | Allow raw binding |
| Signpost | `// error-ok` | Allow bare throw/console |

---

## What Grove Audit Does NOT Do

- **Run tests or type checks** — use `gw ci` for that
- **Review prose or documentation** — code patterns only
- **Judge style preferences** — "I'd name this differently" is not a finding
- **Audit dependencies** — use `pnpm audit` for that
- **Replace targeted skills** — hawk-survey for deep security, deer-sense for a11y, etc.

---

## Integration

**Before audit:** Ensure Lumen index is fresh (`mcp__lumen__index_status`)
**After audit:** Use the report to prioritize manual fixes
**For auto-fixes:** Review the committed changes with `git diff HEAD~1` if desired
