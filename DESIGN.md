# Design Standards

> Extracted from `AGENT.md` — the authoritative reference for Grove's visual design system.

---

## Typography

- **Default Font:** Lexend — used across all Grove properties
- **Font Fallback:** All font mappings should fall back to `lexend`, not other fonts
- **Available Fonts:** See `libs/engine/static/fonts/` for the full collection

## CRITICAL: Verify Colors Exist Before Using Them

**Before using ANY Tailwind color class, verify it exists in the Grove design system.** LLMs frequently hallucinate class names that look right but aren't defined.

**Valid Grove color families** (defined in `tailwind.preset.js`):

| Token         | Variants                              | Example classes                         |
| ------------- | ------------------------------------- | --------------------------------------- |
| `grove`       | 50–950                                | `bg-grove-500`, `text-grove-700`        |
| `cream`       | DEFAULT, 50–500                       | `bg-cream-200`, `border-cream-300`      |
| `bark`        | DEFAULT, 50–950                       | `text-bark-900`, `bg-bark-50`           |
| `primary`     | DEFAULT, foreground                   | `bg-primary`, `text-primary-foreground` |
| `secondary`   | DEFAULT, foreground                   | `bg-secondary`                          |
| `background`  | —                                     | `bg-background`                         |
| `foreground`  | DEFAULT, muted, subtle, faint         | `text-foreground-muted`                 |
| `muted`       | DEFAULT, foreground                   | `bg-muted`, `text-muted-foreground`     |
| `accent`      | DEFAULT, foreground, muted, subtle    | `bg-accent-subtle`                      |
| `surface`     | DEFAULT, hover, elevated, subtle, alt | `bg-surface-subtle`                     |
| `card`        | DEFAULT, foreground                   | `bg-card`, `text-card-foreground`       |
| `popover`     | DEFAULT, foreground                   | `bg-popover`                            |
| `destructive` | DEFAULT, foreground                   | `bg-destructive`                        |
| `error`       | DEFAULT, foreground, bg               | `text-error`, `bg-error-bg`             |
| `warning`     | DEFAULT, foreground, bg, muted        | `text-warning`, `bg-warning-bg`         |
| `success`     | DEFAULT, foreground, bg, muted        | `text-success`, `bg-success-bg`         |
| `info`        | DEFAULT, foreground, bg, muted        | `text-info`, `bg-info-bg`               |
| `divider`     | —                                     | `border-divider`                        |
| `default`     | —                                     | `border-default`                        |
| `subtle`      | —                                     | `bg-subtle`                             |
| `border`      | —                                     | `border-border`                         |
| `input`       | —                                     | `border-input`                          |
| `ring`        | —                                     | `ring-ring`                             |

**DO NOT use** standard Tailwind colors (`gray-*`, `slate-*`, `zinc-*`, `neutral-*`, `stone-*`, `red-*`, `blue-*`, `green-*`, `amber-*`, `purple-*`, `pink-*`, `emerald-*`, `indigo-*`, `teal-*`). These are not in the Grove palette and will render as transparent/invisible.

**When unsure**, check the preset: `libs/prism/src/lib/tailwind/preset.js`

## Dual Token System (CSS Custom Properties)

The engine has **two parallel CSS variable systems** loaded in order by `+layout.svelte`:

1. **`app.css`** (via Tailwind directives) — shadcn-style HSL system (`--primary`, `--foreground`, `--border`). Values are bare HSL channels, used as `hsl(var(--primary))`.
2. **`tokens.css`** (`libs/engine/src/lib/styles/tokens.css`) — Grove's full semantic token system (`--color-text`, `--color-border`, `--glass-bg`, `--grove-overlay-*`, etc.). Values are complete color expressions.

**tokens.css loads after app.css**, so it wins the cascade for any shared names. Do NOT add aliases to `app.css` for variables that `tokens.css` already defines — they'll be overridden silently.

**When using CSS variables in scoped `<style>` blocks**, always verify the variable exists in one of these two files. Invented variable names fail silently (render as transparent).

## CRITICAL: Prism is the Design SSOT

**`@autumnsgrove/prism`** is the single source of truth for ALL design tokens and icons:

- **Colors/tokens:** `@autumnsgrove/prism` (TS tokens), `@autumnsgrove/prism/css` (CSS custom properties), `@autumnsgrove/prism/tailwind` (Tailwind preset)
- **Icons:** `@autumnsgrove/prism/icons` (408 icons across 12 semantic groups)

**All 8 apps + engine import the Tailwind preset from `@autumnsgrove/prism/tailwind`:**

```javascript
import grovePreset from "@autumnsgrove/prism/tailwind";

export default {
	presets: [grovePreset],
	content: [
		"./src/**/*.{html,js,svelte,ts}",
		"../../libs/engine/src/lib/**/*.{html,js,svelte,ts}",
	],
};
```

> **Note:** Engine has a deprecated re-export stub at `src/lib/ui/tailwind.preset.js` for backward compat. New code should import from Prism directly.

## CRITICAL: Accent Colors — The Grove Accent Scale

**NEVER hardcode green hex values (`#22c55e`, `#4ade80`, `#16a34a`, etc.) or `rgba(34, 197, 94, ...)` in CSS.** This is enforced by pre-commit hook. Users choose their accent color (purple, blue, red, etc.) and hardcoded green breaks their customization.

**Use `--grove-accent-*` tokens from Prism instead:**

| Token                    | What it is            | Use for                          |
| ------------------------ | --------------------- | -------------------------------- |
| `var(--grove-accent)`    | Solid accent color    | Buttons, links, active text      |
| `var(--grove-accent-5)`  | 5% opacity tint       | Very subtle backgrounds          |
| `var(--grove-accent-10)` | 10% opacity tint      | Subtle borders, hover bg         |
| `var(--grove-accent-15)` | 15% opacity tint      | Light backgrounds, selected bg   |
| `var(--grove-accent-20)` | 20% opacity tint      | Borders, focus rings             |
| `var(--grove-accent-30)` | 30% opacity tint      | Strong borders, box shadows      |
| `var(--grove-accent-40)` | 40% opacity tint      | Active borders                   |
| `var(--grove-accent-50)` | 50% opacity tint      | Medium intensity                 |
| `var(--grove-accent-70)` | 70% opacity tint      | High intensity overlays          |
| `var(--grove-accent-80)` | 80% opacity tint      | Near-solid overlays              |
| `var(--grove-accent-dark)`  | Darkened (80% + black) | Hover states on accent bg     |
| `var(--grove-accent-light)` | Lightened (80% + white) | Light accent variant         |

**Full scale:** 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 50, 70, 80 + dark/light

**Examples:**

```svelte
<style>
  /* ✅ CORRECT — uses accent tokens */
  .btn { background: var(--grove-accent); }
  .btn:hover { background: var(--grove-accent-dark); }
  .subtle-bg { background: var(--grove-accent-10); }
  .border { border: 1px solid var(--grove-accent-20); }
  .glow { box-shadow: 0 0 8px var(--grove-accent-30); }

  /* ❌ WRONG — hardcoded green, breaks non-green accents */
  .btn { background: #22c55e; }
  .subtle-bg { background: rgba(34, 197, 94, 0.1); }
  .border { border: 1px solid var(--grove-500, #22c55e); }
</style>
```

**When green IS correct:** Brand assets (Grove logo, nature SVGs), seasonal decorations, and semantic success/status colors (`--success`, `text-success`) are intentionally green. Mark these with `// accent-ok` to suppress the pre-commit hook.

**Defined in:** `libs/prism/src/lib/css/grove-tokens.css` (SSOT) and `libs/engine/src/lib/styles/tokens.css` (engine duplicate)
