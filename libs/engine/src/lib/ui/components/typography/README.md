# Typography Components

Scoped font wrapper components for the Grove Design System. Each component loads its font from CDN on-demand and applies it to children.

## Installation

```ts
import {
  Alagard,
  IBMPlexMono,
  Caveat,
} from "@autumnsgrove/lattice/ui/typography";
```

## Quick Start

```svelte
<!-- Fantasy game header -->
<Alagard as="h1" class="text-4xl">Welcome to the Grove</Alagard>

<!-- Code block -->
<IBMPlexMono as="code">console.log('hello');</IBMPlexMono>

<!-- Handwritten note -->
<Caveat as="p" class="text-2xl">A personal touch...</Caveat>
```

## Available Fonts

This is the complete catalog — the canonical source is `libs/engine/src/lib/ui/tokens/fonts.ts`; every font picker in the app (post/page editors, site appearance settings) reads from it, so this list is always in sync with what's actually loaded.

### Default (1)

| Component | Font   | Use Case                    |
| --------- | ------ | ---------------------------- |
| `Lexend` | Lexend | Default, highly readable UI |

### Accessibility (2)

| Component      | Font                  | Use Case            |
| -------------- | --------------------- | -------------------- |
| `Atkinson`     | Atkinson Hyperlegible | Low vision readers   |
| `OpenDyslexic` | OpenDyslexic          | Dyslexic readers     |

### Sans-Serif (2)

| Component         | Font              | Use Case               |
| ----------------- | ----------------- | ----------------------- |
| `Quicksand`       | Quicksand         | Light, modern, geometric |
| `PlusJakartaSans` | Plus Jakarta Sans | Balanced, versatile      |

### Monospace (2)

| Component     | Font          | Use Case                        |
| ------------- | ------------- | -------------------------------- |
| `IBMPlexMono` | IBM Plex Mono | Code blocks, technical content   |
| `Cozette`     | Cozette       | Retro terminal, pixel aesthetic  |

### Display & Special (3)

| Component   | Font      | Use Case                            |
| ----------- | --------- | ------------------------------------ |
| `Alagard`   | Alagard   | Fantasy, gaming, medieval themes     |
| `Calistoga` | Calistoga | Friendly headlines, warm branding    |
| `Caveat`    | Caveat    | Handwritten notes, personal touches  |

## Props

All font components accept the same props:

| Prop    | Type                                                                                                                  | Default  | Description                        |
| ------- | --------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------- |
| `as`    | `'span' \| 'div' \| 'p' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'code' \| 'pre' \| 'article' \| 'section'` | `'span'` | HTML element to render             |
| `class` | `string`                                                                                                              | `''`     | CSS classes (Tailwind works great) |
| `style` | `string`                                                                                                              | `''`     | Inline styles                      |

## Dynamic Font Selection

Use `FontProvider` when you need to select fonts programmatically:

```svelte
<script>
  import { FontProvider } from '@autumnsgrove/lattice/ui/typography';
  let selectedFont = 'quicksand';
</script>

<FontProvider font={selectedFont} as="article">
  <p>Content with dynamic font...</p>
</FontProvider>
```

## Performance

- **On-demand loading**: Fonts load from CDN only when the component mounts
- **Deduplication**: Each font's `@font-face` is injected once, even with multiple instances
- **Swap display**: Uses `font-display: swap` for fast initial render
- **CDN**: All fonts served from `cdn.grove.place` with proper caching

## Accessibility Recommendations

| Situation             | Recommended Font                           |
| ---------------------- | ------------------------------------------- |
| Low vision users       | `Atkinson` (maximum character distinction)  |
| Dyslexic readers       | `OpenDyslexic` (weighted letter bottoms)    |
| General accessibility  | `Lexend` (designed for reading fluency)     |

## Examples

### Blog Post Header

```svelte
<Calistoga as="h1" class="text-4xl font-bold text-bark-900">
  A Warm Welcome to the Grove
</Calistoga>
```

### Code Documentation

```svelte
<IBMPlexMono as="pre" class="bg-bark-900 text-cream-100 p-4 rounded-lg">
  {codeExample}
</IBMPlexMono>
```

### Personal Note Card

```svelte
<div class="bg-rose-50 p-6 rounded-lg">
  <Caveat as="p" class="text-2xl text-rose-900">
    Thanks for being here...
  </Caveat>
</div>
```

### Mixed Typography

```svelte
<article>
  <Alagard as="h1" class="text-3xl mb-4">Quest Log</Alagard>
  <Quicksand as="div" class="prose">
    <p>Your journey begins in the misty forests...</p>
  </Quicksand>
</article>
```

## Font Tokens

The typography module also exports font metadata for programmatic use:

```ts
import {
  fonts, // Array of all font definitions
  fontById, // Map of font ID to definition
  getFontStack, // Get full font-family string with fallbacks
  getFontUrl, // Get CDN URL for a font file
} from "@autumnsgrove/lattice/ui/typography";
```
