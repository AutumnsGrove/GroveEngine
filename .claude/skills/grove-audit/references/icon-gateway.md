# Lane 2: Icon Gateway (Prism)

**Auto-fix:** YES — convert bare Lucide imports to Prism icon group imports.

## The Rule

All icons MUST route through `@autumnsgrove/prism/icons`. No direct `@lucide/svelte` imports.

Prism provides semantic icon groups (`stateIcons`, `navIcons`, `actionIcons`, etc.) that centralize icon identity. Changing an icon across the app means changing one line in Prism, not hunting through dozens of files.

## Detection Patterns

**Lumen query:** `"lucide svelte icon import"`

**Grep patterns:**
```
grep -rn "from ['\"]@lucide/svelte" --include='*.svelte' --include='*.ts' --include='*.js'
```

## FAIL Patterns

| Pattern | Fix |
|---------|-----|
| `from '@lucide/svelte'` | Use `from '@autumnsgrove/prism/icons'` with semantic groups |
| `from '@autumnsgrove/lattice/ui/icons'` with named icons like `{ Check, ArrowRight }` | Use Prism groups: `{ stateIcons, navIcons }` |
| `<Check class="..." />` (bare Lucide component in template) | Use `<stateIcons.check class="..." />` |
| `icon: Check` (Lucide component reference in JS) | Use `icon: stateIcons.check` |

## PASS Patterns

| Pattern | Why |
|---------|-----|
| `from '@autumnsgrove/prism/icons'` with group imports | Correct |
| `<stateIcons.check class="w-5 h-5" />` | Correct dotted access |
| Lines with `// prism-ok` | Intentional exception |

## Exempt Files

- `libs/prism/src/lib/icons/adapters/lucide.ts` — the ONE adapter file that wraps Lucide
- `apps/landing/src/lib/components/icons/BeeIcon.svelte` — needs Lucide `Icon` base for lab icons

## Auto-Fix Rules

1. Find the bare Lucide import: `import { Check, ArrowRight, Settings } from '@lucide/svelte'`
2. Map each icon to its Prism group by searching the Prism icon manifest
3. Replace with grouped import: `import { stateIcons, navIcons } from '@autumnsgrove/prism/icons'`
4. Update template usage: `<Check />` → `<stateIcons.check />`

**To find which group an icon belongs to:**
Search `libs/prism/src/lib/icons/` for the icon name to find its group assignment.

If an icon has no Prism group assignment yet, report it as a finding instead of auto-fixing — it needs to be added to the Prism manifest first.

## Suppression

`// prism-ok` on the import line skips the check.
