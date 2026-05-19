# Lane 1: Barrel Import Safety

**Auto-fix:** YES — convert barrel imports to direct file imports.

## The Problem

Barrel cascades kill hydration. `export *` from barrels with Svelte components pulls CSS side effects Vite can't tree-shake. Layout routes are critical; page routes bloat bundles.

## Dangerous Barrels (FAIL if imported from in .svelte files)

```
$lib/ui                          — mega-barrel (~100 modules)
$lib/ui/components/ui            — 47+ components
$lib/ui/components/nature        — 40+ nature components
@autumnsgrove/lattice            — top-level barrel (if importing UI)
```

## Detection Patterns

Search for these import patterns in `.svelte` files:

```
from "$lib/ui"
from '$lib/ui'
from "$lib/ui/components/ui"
from '$lib/ui/components/ui'
from "$lib/ui/components/nature"
from '$lib/ui/components/nature'
from "../nature"  (relative nature barrel)
from "./nature"   (relative nature barrel)
```

**Lumen query:** `"barrel import svelte components $lib/ui"`

**Grep patterns:**
```
grep -rn 'from ["\x27]\$lib/ui["\x27;]' --include='*.svelte'
grep -rn 'from ["\x27]\$lib/ui/components/ui["\x27;]' --include='*.svelte'
grep -rn 'from ["\x27]\$lib/ui/components/nature["\x27;]' --include='*.svelte'
```

## Suppression

Lines with `// barrel-ok` are intentional. Skip them.

## Severity by Context

| Context | Severity |
|---------|----------|
| Layout routes (`+layout.svelte`) | HIGH — barrel cascades are critical here |
| Page routes (`+page.svelte`) | MEDIUM — bloats route bundle |
| Component files (`.svelte`) | MEDIUM — contributes to bundle bloat |
| Server files, test files | Skip — no client bundle impact |

## Auto-Fix Rules

Convert barrel imports to direct file imports:

```typescript
// BEFORE (barrel)
import { Button, Card } from "$lib/ui";

// AFTER (direct)
import Button from "$lib/ui/components/ui/Button.svelte";
import Card from "$lib/ui/components/ui/Card.svelte";
```

```typescript
// BEFORE (barrel)
import { GroveDivider } from "$lib/ui/components/nature";

// AFTER (direct)
import GroveDivider from "$lib/ui/components/nature/GroveDivider.svelte";
```

To find the correct direct path for a component:
1. Search for the component's `.svelte` file in the codebase
2. Use the path relative to the import root

**Important:** Some barrel imports are for non-component exports (stores, utilities, types). These may need different resolution — check what the export actually is before converting.

## What NOT to Flag

- Barrel imports in `.ts` files (server-side, no bundle impact)
- Barrel imports in test files
- Lines with `// barrel-ok`
- Imports from specific sub-barrels that don't cascade (e.g., `$lib/ui/toast`)
