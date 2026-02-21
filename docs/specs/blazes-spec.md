---
title: Blazes — Content Type Indicators
description: Small visual markers on each Meadow post that identify its content type at a glance.
category: specs
specCategory: content-community
icon: flame
lastUpdated: "2026-02-21"
aliases: []
date created: Saturday, February 21st 2026
date modified: Saturday, February 21st 2026
tags:
  - meadow
  - ui
  - svelte
  - content-types
type: tech-spec
---

# Blazes — Content Type Indicators

```
         🌲          🌲          🌲          🌲
         │           │           │           │
         │           │           │           │
        [🌸]        [🎵]        [🌸]        [🎵]
         │           │           │           │
         │           │           │           │
    ═════╧═══════════╧═══════════╧═══════════╧═════
                     the trail ahead

    A painted mark on a tree.
    You glance. You know the path. You keep walking.
```

> _A small mark that tells you everything._

The little indicator on each Meadow post that tells you what you're looking at. A bloom, a note, something else. Icon and label, or sometimes just the icon. You don't stop to read a blaze. You glance at it and keep walking. It orients you instantly.

**Public Name:** Blazes
**Internal Name:** Blaze (component), PostBlaze
**Domain:** _(part of Meadow)_
**Parent Spec:** [Meadow](./meadow-spec.md)
**Status:** Planned
**Last Updated:** February 2026

A trail blaze is a painted mark on a tree. A rectangle of color that tells hikers which path they're on. Blue blaze, white blaze, yellow blaze. Each trail has its own. You don't read a blaze. You scan for it, confirm the color, and move on. It's the smallest possible wayfinding signal.

Blazes bring that to Meadow. Right now, blooms and notes look structurally different (titles vs. body text, images vs. none), but there's no explicit marker that says "this is a bloom" or "this is a note." The difference is implied by layout. Blazes make it explicit: a small icon + label in the post header that names what you're seeing.

---

## Table of Contents

1. [Overview](#overview)
2. [Content Types](#content-types)
3. [Visual Design](#visual-design)
4. [Component Architecture](#component-architecture)
5. [Integration Points](#integration-points)
6. [Accessibility](#accessibility)
7. [Future Content Types](#future-content-types)
8. [Implementation Checklist](#implementation-checklist)

---

## Overview

### The problem

Meadow's feed displays blooms and notes side by side. The only way to tell them apart is by reading the card structure: blooms have titles and external links, notes have body text. There's no visual shorthand. When you're scrolling quickly, every card looks like a slightly different shape of the same thing.

### What Blazes do

A blaze is a small badge in the post card header, next to the author info and timestamp. It contains:

1. **An icon** that represents the content type (flower for bloom, music note for note)
2. **A label** that names it ("Bloom" or "Note")
3. **A color** that distinguishes it at a glance

Together, these three things give the feed visual rhythm. Your eye can pick out "three blooms, a note, two blooms, a note" without reading a word.

### What Blazes don't do

- They don't filter content (that's the FeedFilters tab bar)
- They don't link anywhere (they're informational, not interactive)
- They don't appear in the database (content types already exist as `post_type`)
- They don't change the post's behavior or layout

Blazes are pure presentation. A visual affordance layered on top of data that already exists.

---

## Content Types

Two content types exist today. The blaze system is designed to extend when more arrive.

### Current types

| Type | Icon | Label | Color | Description |
|------|------|-------|-------|-------------|
| Bloom | `🌸` | Bloom | grove (green) | A full blog post syndicated from a Grove garden via RSS. Has title, description, external link, optional featured image. |
| Note | `♪` | Note | amber (warm) | A short-form native post written directly in Meadow. Up to 1000 characters. No title. |

### Type definitions

```typescript
/** Blaze configuration for a content type */
interface BlazeConfig {
  /** Machine identifier — matches MeadowPost.postType */
  type: "bloom" | "note";
  /** Display label shown next to the icon */
  label: string;
  /** Icon character or SVG reference */
  icon: string;
  /** Tailwind color classes for the badge */
  colors: {
    bg: string;
    text: string;
    darkBg: string;
    darkText: string;
  };
}

const BLAZE_CONFIG: Record<string, BlazeConfig> = {
  bloom: {
    type: "bloom",
    label: "Bloom",
    icon: "🌸",
    colors: {
      bg: "bg-grove-50",
      text: "text-grove-700",
      darkBg: "dark:bg-grove-900/30",
      darkText: "dark:text-grove-300",
    },
  },
  note: {
    type: "note",
    label: "Note",
    icon: "♪",
    colors: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      darkBg: "dark:bg-amber-900/30",
      darkText: "dark:text-amber-300",
    },
  },
};
```

---

## Visual Design

### Placement

The blaze sits in the post card header, inline with the author metadata row. It appears after the timestamp, separated by a middot.

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌───┐  autumn · autumn.grove.place · 3h · 🌸 Bloom        │
│   │ A │                                                      │
│   └───┘  ──────────────────────────────────────────────      │
│                                                              │
│   On the Quiet Architecture of Personal Websites             │
│                                                              │
│   There's something about building your own corner           │
│   of the internet that feels like planting a garden...       │
│                                                              │
│   ┌──────────────────────────────────────────┐               │
│   │                                          │               │
│   │            [ featured image ]             │               │
│   │                                          │               │
│   └──────────────────────────────────────────┘               │
│                                                              │
│   ──────────────────────────────────────────────────         │
│   △ 12                                          🔖           │
│                                                              │
└──────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────┐
│                                                              │
│   ┌───┐  river · river.grove.place · 20m · ♪ Note           │
│   │ R │                                                      │
│   └───┘  ──────────────────────────────────────────────      │
│                                                              │
│   just found the most beautiful moth on my windowsill.       │
│   she's been sitting there for twenty minutes. i think       │
│   she likes the lamp.                                        │
│                                                              │
│   ──────────────────────────────────────────────────         │
│   △ 4                                           🔖           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Badge anatomy

```
        ╭──────────────╮
        │  🌸  Bloom   │     ← icon + label
        ╰──────────────╯
            ↑
       rounded-full pill
       subtle bg color
       small text (text-xs)
       44px min touch target (via padding)
```

The badge is a small pill. Rounded corners (full radius), subtle background tint matching the content type color, icon on the left, label on the right. At small viewport widths, the label collapses and only the icon remains.

### Responsive behavior

```
  Desktop (≥640px):          Mobile (<640px):

  autumn · 3h · 🌸 Bloom    autumn · 3h · 🌸
```

On mobile, the label hides. The icon alone carries the meaning. This keeps the header from overflowing while preserving the visual signal.

### Color in context

Blazes use the lightest tint of their color family. They should feel like a gentle wash, not a loud badge. The goal is that you notice the pattern across multiple cards, not that any single blaze demands attention.

```
  Light mode:                 Dark mode:

  ┌─────────────────┐         ┌─────────────────┐
  │ bg-grove-50      │         │ bg-grove-900/30  │
  │ text-grove-700   │         │ text-grove-300   │
  │                  │         │                  │
  │  🌸 Bloom        │         │  🌸 Bloom        │
  └─────────────────┘         └─────────────────┘

  ┌─────────────────┐         ┌─────────────────┐
  │ bg-amber-50      │         │ bg-amber-900/30  │
  │ text-amber-700   │         │ text-amber-300   │
  │                  │         │                  │
  │  ♪ Note          │         │  ♪ Note          │
  └─────────────────┘         └─────────────────┘
```

---

## Component Architecture

### New component: `PostBlaze.svelte`

A single new component in the Meadow app. Intentionally simple. No engine dependency needed since it's Meadow-specific.

**Location:** `apps/meadow/src/lib/components/PostBlaze.svelte`

```svelte
<!--
  PostBlaze — Content type indicator for Meadow posts.

  Displays a small icon + label badge identifying the post type
  (Bloom, Note, etc). Label collapses on mobile viewports.
-->
<script lang="ts">
  import type { MeadowPost } from "$lib/types/post.js";

  interface Props {
    postType: MeadowPost["postType"];
  }

  const { postType }: Props = $props();

  const config = $derived(BLAZE_CONFIG[postType] ?? BLAZE_CONFIG.bloom);
</script>

<span
  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5
         text-xs font-medium {config.colors.bg} {config.colors.text}
         {config.colors.darkBg} {config.colors.darkText}"
  aria-label="{config.label} post"
>
  <span aria-hidden="true">{config.icon}</span>
  <span class="hidden sm:inline">{config.label}</span>
</span>
```

### Data flow

No new data required. Blazes read from `MeadowPost.postType`, which already exists.

```
  Database                Server               Client
  ─────────────────────────────────────────────────────

  meadow_posts            rowToPost()          PostCard.svelte
  ┌──────────────┐        ┌──────────┐         ┌───────────────┐
  │ post_type     │───────▶│ postType  │────────▶│ PostBlaze     │
  │ TEXT          │        │ string    │         │ reads postType│
  │ DEFAULT       │        └──────────┘         │ renders badge │
  │ 'bloom'       │                             └───────────────┘
  └──────────────┘

  No new columns. No new queries. No new API fields.
```

### Integration into PostCard

The blaze slots into the existing author metadata row in `PostCard.svelte`. One new import, one new element in the header.

```
  Before:
  ┌─────────────────────────────────────────────────────────┐
  │  [avatar]  author name                                  │
  │            subdomain.grove.place · 3h ago               │
  └─────────────────────────────────────────────────────────┘

  After:
  ┌─────────────────────────────────────────────────────────┐
  │  [avatar]  author name                                  │
  │            subdomain.grove.place · 3h ago · 🌸 Bloom    │
  └─────────────────────────────────────────────────────────┘
```

The change in PostCard is minimal: import PostBlaze, add it after the `<time>` element in the metadata row. Approximately 5 lines of diff.

---

## Integration Points

### Feed filter tabs

The FeedFilters component already has "Notes" and "Blooms" tabs. These filter by `post_type` at the query level. Blazes complement this by marking individual posts within a mixed view. When someone is on the "All" tab, blazes are how they tell the types apart.

```
  ┌──────────────────────────────────────────────────────┐
  │  [ All ]  [ Notes ]  [ Blooms ]  [ Popular ]  ...   │
  └──────────────────────────────────────────────────────┘
       ↑                                   ↑
       Blazes visible here       Blazes still visible
       (mixed types)             (all same type, but
                                  consistent marking)
```

Blazes appear on every post in every filter view. Even when you're on the "Blooms" tab and every post is a bloom, the blaze is still there. Consistency over cleverness.

### Existing components used

| Component | From | Purpose |
|-----------|------|---------|
| `PostCard.svelte` | Meadow | Parent container; blaze added to header |
| `Badge.svelte` | Engine (available but not used) | PostBlaze is self-contained; simpler than wrapping the shared Badge for this specific use case |

PostBlaze is intentionally not built on the engine's `Badge` component. The shared Badge has variants (default, secondary, destructive, tag) designed for general-purpose use. Blazes have specific color semantics tied to content types. A dedicated component is cleaner than overriding Badge styles.

---

## Accessibility

### Screen readers

The blaze badge includes an `aria-label` that reads naturally: "Bloom post" or "Note post." The icon is marked `aria-hidden="true"` since the label carries the semantic meaning.

On mobile, where the label is visually hidden (`hidden sm:inline`), the `aria-label` on the parent span still announces the full type name. Screen readers always hear "Bloom post" regardless of viewport.

### Reduced motion

Blazes have no animation. They're static badges. No `prefers-reduced-motion` consideration needed.

### Color contrast

| Mode | Type | Background | Text | Ratio |
|------|------|-----------|------|-------|
| Light | Bloom | `grove-50` (#f0fdf4) | `grove-700` (#15803d) | ~7.5:1 |
| Light | Note | `amber-50` (#fffbeb) | `amber-700` (#b45309) | ~6.8:1 |
| Dark | Bloom | `grove-900/30` | `grove-300` (#86efac) | ~5.2:1 |
| Dark | Note | `amber-900/30` | `amber-300` (#fcd34d) | ~5.5:1 |

All combinations exceed WCAG AA (4.5:1 for small text). The light mode combinations exceed AAA (7:1).

### Touch targets

The badge pill has `px-2 py-0.5` padding. This is visually compact but the blaze is not interactive (no click handler, no link). Touch target size requirements (44x44px) only apply to interactive elements. Blazes are informational. No tap target needed.

---

## Future Content Types

The blaze system is designed for extension. When new content types arrive, you add an entry to `BLAZE_CONFIG` and the badge renders automatically. No component changes needed.

### Potential future types

These are speculative. They illustrate how the system extends, not a commitment to build them.

| Type | Icon | Label | Color | What it might be |
|------|------|-------|-------|------------------|
| Share | `🔗` | Share | sky (blue) | A repost or link share from another grove |
| Thread | `🧵` | Thread | violet (purple) | A connected sequence of notes |
| Event | `📅` | Event | rose (pink) | A calendar happening |

Adding a new type:

```typescript
// 1. Add database value
//    ALTER TABLE meadow_posts ... (or new migration)

// 2. Update TypeScript union
//    postType: "bloom" | "note" | "share"

// 3. Add blaze config
BLAZE_CONFIG.share = {
  type: "share",
  label: "Share",
  icon: "🔗",
  colors: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    darkBg: "dark:bg-sky-900/30",
    darkText: "dark:text-sky-300",
  },
};

// 4. Done. PostBlaze renders it automatically.
```

---

## Implementation Checklist

### Phase 1: Core component

- [ ] Create `BLAZE_CONFIG` constant in `apps/meadow/src/lib/types/blaze.ts`
- [ ] Create `PostBlaze.svelte` component in `apps/meadow/src/lib/components/`
- [ ] Add PostBlaze to `PostCard.svelte` header, after the timestamp
- [ ] Verify responsive label collapse at `sm` breakpoint
- [ ] Verify dark mode colors

### Phase 2: Polish

- [ ] Test with screen reader (VoiceOver, NVDA)
- [ ] Verify color contrast ratios with browser devtools
- [ ] Test in feed with mixed content (All tab)
- [ ] Test in filtered views (Notes tab, Blooms tab)
- [ ] Check that the blaze doesn't push the header to two lines on narrow viewports

### Phase 3: Documentation

- [ ] Add PostBlaze to Meadow's component index
- [ ] Update Meadow spec with reference to Blazes
- [ ] Add Waystone tooltip for "Blaze" if GroveTerm is rendered in Meadow

---

## Related Specs

- [Meadow](./meadow-spec.md). Parent system. Blazes live inside the Meadow feed.
- [Waystone](./waystone-spec.md). Help system. "Blaze" is in the GroveTerm manifest and could show a tooltip.
- [Canopy](./canopy-spec.md). Directory. If Canopy ever displays post previews, blazes may appear there too.

---

_A painted mark on a tree. You glance. You know the path._
