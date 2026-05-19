# Lane 10: Test Coverage

**Auto-fix:** NO — tests require understanding the code's behavior and edge cases.

## The Rule

New logic files should have corresponding test files. This lane checks for coverage gaps, not test quality.

## Detection Patterns

**Lumen query:** `"test file vitest describe it expect"`

**For quick/standard mode:** Check changed `.ts` files against existing `.test.ts` files.

**For full mode:** Scan `src/lib/` directories for `.ts` files without corresponding `.test.ts`.

**Grep patterns:**
```
# Find all .ts files in src/lib/ (logic files)
find libs/engine/src/lib -name '*.ts' -not -name '*.test.ts' -not -name '*.d.ts' -not -name 'index.ts'

# Find all existing test files
find libs/engine/src/lib -name '*.test.ts'

# Cross-reference: which logic files lack tests?
```

## Rules

| File Type | Test Required? | Severity if Missing |
|-----------|---------------|-------------------|
| `src/lib/**/*.ts` (logic) | Yes | MEDIUM |
| `+page.server.ts`, `+server.ts` (routes) | Encouraged | LOW |
| Utility functions | Yes | MEDIUM |
| Config files | No | — |
| Type definition files (`.d.ts`) | No | — |
| Index/barrel files (`index.ts`) | No | — |
| Migration files | No (integration tested) | — |
| Svelte components (`.svelte`) | Encouraged, not required | LOW |
| Test files themselves | N/A | — |

## What to Check

1. **New files without tests:** Any new `.ts` file in `src/lib/` that doesn't have a corresponding `.test.ts` file.

2. **Test file naming:** Test files should follow the pattern `{filename}.test.ts` in the same directory as the source file.

3. **Test patterns:** When tests exist, briefly check they follow project conventions:
   - Using `vitest` (`describe`, `it`, `expect`)
   - Using `beforeEach`/`afterEach` for setup/teardown
   - Testing both success and error paths

## What NOT to Flag

- Files in `src/routes/` (route tests are integration-level, not always 1:1)
- Files that are purely type exports
- Generated files
- Files in `dist/` or build output
- Existing files that already lack tests (in quick/standard mode — only flag new files)
- In full mode: focus on `libs/engine/src/lib/` where SDK code lives, not app routes

## What to Report

For each finding:
- `file_path` of the untested file
- What it exports / what it does (brief)
- Severity: MEDIUM for utility/logic files, LOW for components/routes
- Suggested test file path: `{same_dir}/{filename}.test.ts`
