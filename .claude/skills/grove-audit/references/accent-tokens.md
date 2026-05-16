# Lane 4: Accent Token Compliance

**Auto-fix:** YES — convert hardcoded green values to `--grove-accent-*` tokens.

## The Rule

Grove has a unified accent color system. Users choose their accent color — it is NOT always green. All accent-colored surfaces MUST use `--grove-accent-*` CSS custom properties from Prism. Hardcoded greens break non-green accent themes.

## The Accent Scale (defined in `libs/prism/src/lib/css/grove-tokens.css`)

| Token | Purpose |
|-------|---------|
| `var(--grove-accent)` | Solid accent color |
| `var(--grove-accent-dark)` | Darkened for hover/pressed states |
| `var(--grove-accent-light)` | Lightened variant |
| `var(--grove-accent-5)` through `var(--grove-accent-80)` | Opacity tints (stops: 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 50, 70, 80) |

## Detection Patterns

**Lumen query:** `"hardcoded green hex color accent"`

**Grep patterns:**
```
# Green hex values
grep -rin '#\(22c55e\|4ade80\|16a34a\|86efac\|15803d\|10b981\|059669\|166534\|14532d\|dcfce7\|bbf7d0\|f0fdf4\)' --include='*.svelte' --include='*.css'

# Green rgba patterns
grep -rn 'rgba\s*(\s*\(34,\s*197,\s*94\|74,\s*222,\s*128\|22,\s*163,\s*74\)' --include='*.svelte' --include='*.css'

# Old grove scale tokens used for accent
grep -rn 'var(--grove-[3-7]00' --include='*.svelte' --include='*.css'
```

## Exempt Files (skip these entirely)

- `libs/prism/*` — token definitions themselves
- `libs/foliage/src/lib/themes/*` — theme definitions
- `libs/engine/src/lib/config/presets.ts` — config
- `libs/engine/src/lib/heartwood/colors.ts` — semantic status colors
- `libs/engine/src/lib/styles/tokens.css` — CSS variable definitions
- `*Logo*`, `*nature/*`, `*vine-pattern*`, `*TerrariumGlobe*` — brand assets
- `*email*`, `*template*` — email templates
- `*.test.*`, `*.spec.*` — test files

## FAIL Patterns

| Pattern | Fix |
|---------|-----|
| `#22c55e` in accent context | `var(--grove-accent)` |
| `#4ade80` in accent context | `var(--grove-accent-light)` or appropriate tint |
| `rgba(34, 197, 94, 0.2)` | `var(--grove-accent-20)` |
| `var(--grove-500)` for accent surface | `var(--grove-accent)` |
| `hover:bg-green-600` on accent element | Use `var(--grove-accent-dark)` |
| Inline `style="color: green"` on accent | Use accent token |

## What is NOT Accent (leave as-is)

- Brand greens: Grove logo, nature SVGs, tree/leaf illustrations — mark with `// accent-ok`
- Semantic status: `--success`, `text-success`, `bg-success` (green = "good", not accent)
- Palette definitions in Prism itself
- Tailwind `grove-*` classes for decorative palette backgrounds

## Auto-Fix Rules

1. For hex values in style blocks: replace with closest `var(--grove-accent-*)` token
2. For rgba with opacity: map to the closest opacity stop (`var(--grove-accent-N)`)
3. For old scale tokens (`var(--grove-500)`): replace with `var(--grove-accent)`

**Common mappings:**
| Old | New |
|-----|-----|
| `#22c55e` / `var(--grove-500)` | `var(--grove-accent)` |
| `#16a34a` / `var(--grove-600)` | `var(--grove-accent-dark)` |
| `#4ade80` / `var(--grove-400)` | `var(--grove-accent-light)` |
| `rgba(34, 197, 94, 0.1)` | `var(--grove-accent-10)` |
| `rgba(34, 197, 94, 0.2)` | `var(--grove-accent-20)` |
| `rgba(34, 197, 94, 0.5)` | `var(--grove-accent-50)` |

**When NOT to auto-fix (report instead):**
- Context is ambiguous (could be brand green, not accent)
- Color is in a complex gradient or animation
- Value doesn't map cleanly to an accent stop

## Suppression

`// accent-ok` or `<!-- accent-ok -->` on the line or within 5 lines above.
