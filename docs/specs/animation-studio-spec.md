---
date created: Tuesday, January 6th 2026
date modified: Tuesday, January 6th 2026
tags: []
type: tech-spec
status: draft
---

# Animation Studio — Terrarium Extension

```
          ┌─────────────────────────────────────────┐
          │           GRID MATRIX EDITOR            │
          │                                         │
          │    [Rock]───────[Vine]───────[Vine]    │
          │       │            │            │       │
          │       │            │            │       │
          │    [Vine]      [Vine]       [Vine]     │
          │       │                                 │
          │    [Vine]                               │
          │                                         │
          │   ─── connection (timing: 0.3s) ───    │
          └─────────────────────────────────────────┘
                            ↓
          ┌─────────────────────────────────────────┐
          │           LIVE MODE (Terrarium)         │
          │                                         │
          │         🪨~~~🌿~~~🌿                    │
          │          |    |    |                    │
          │         🌿   🌿   🌿                    │
          │          |                              │
          │         🌿   ~ jangle jangle ~          │
          │                                         │
          └─────────────────────────────────────────┘
```

> *Connect. Time. Jangle. A symphony of nature in motion.*

**Status:** Draft / Idea Documentation
**Parent Feature:** Terrarium
**Location:** Studio mode within Terrarium

---

## Overview

Animation Studio is an extension of Terrarium that transforms static scene composition into dynamic animation creation. Think of it as a **node-graph editor** (like n8n or LangChain) meets **motion design** — you connect assets with lines, define timing between connections, and watch chains of movement ripple through your scene.

### The Core Idea

1. **Grid Matrix Editor** — A node-graph view where you place assets on a precise grid and draw connections between them
2. **Live Mode** — The existing Terrarium canvas where animations play out
3. **Chain Reactions** — Connected assets move together; parent movement propagates to children

---

## Two Modes

### Grid Matrix Editor (Studio)

The workspace for building animation relationships.

```
┌──────────────────────────────────────────────────────────────┐
│  ◎ Animation Studio                    [Grid: 0.5rem ▾]     │
├────────────┬─────────────────────────────────────────────────┤
│   Assets   │  · · · · · · · · · · · · · · · · · · · · · ·   │
│  ────────  │  ·       ·       ·       ·       ·       ·     │
│  🪨 Rock   │  ·   [Rock]──────────[Vine A]   ·       ·     │
│  🌿 Vine   │  ·       │       ·       │       ·       ·     │
│  🌲 Tree   │  ·       │       ·       │       ·       ·     │
│  ╫ Lattice │  ·   [Vine B]    ·   [Vine C]───[Vine D]  ·   │
│            │  ·       ·       ·       ·       ·       ·     │
│            │  · · · · · · · · · · · · · · · · · · · · · ·   │
├────────────┴─────────────────────────────────────────────────┤
│  Connection: Rock → Vine A                                   │
│  Duration: [0.3s____]  Easing: [ease-out ▾]  Delay: [0s___] │
└──────────────────────────────────────────────────────────────┘
```

**Key Features:**
- Snap-to-grid placement (0.5rem increments for half-steps)
- Draw connections by dragging lines between assets
- Select connections to configure timing/easing
- Visual hierarchy of parent-child relationships

### Live Mode (Terrarium)

The existing Terrarium canvas, enhanced to play animations.

- Preview animations in real-time
- Jiggle/drag parent assets to see chain reactions
- Toggle between edit and preview states
- Same export capabilities (PNG, GIF, video, blog import)

---

## Grid System

### Placement Grid

- **Unit:** 0.5rem increments (half-steps)
- **Purpose:** Precise, even alignment — whole numbers with half-steps between
- **Snap behavior:** Assets snap to grid intersections when dragged

### Alignment Options

| Type | Description |
|------|-------------|
| **Corner-to-corner** | Align asset corners to grid points |
| **Side-to-side** | Align asset edges |
| **Center** | Align asset centers to grid |

---

## Connection System ("Glue")

Connections define relationships between assets. When a parent moves, connected children follow.

### Connection Properties

| Property | Description | Default |
|----------|-------------|---------|
| **Duration** | Time for child to respond to parent movement | 0.3s |
| **Delay** | Wait time before child starts moving | 0s |
| **Easing** | Animation curve (ease-in, ease-out, bounce, etc.) | ease-out |

### Connection Types (V1)

For V1, connections use **animation propagation** — parent moves, children follow with configurable delay and easing. No physics simulation.

```
Parent moves → 0.1s delay → Child A moves → 0.1s delay → Child B moves
```

### Chain Behavior

The rock-and-vines example:

```
[Rock] (root)
   │
   ├── [Vine 1]
   │      ├── [Vine 1a]
   │      └── [Vine 1b]
   │
   ├── [Vine 2]
   │      └── [Vine 2a]
   │             └── [Vine 2aa]
   │
   └── [Vine 3]
```

**Jiggle the rock → all vines jangle in sequence, delays cascading down the tree.**

---

## Animation Workflow

### Creating an Animation

1. **Enter Grid Matrix Editor** — Switch from Live Mode to Studio
2. **Enable Grid** — Turn on 0.5rem snap grid
3. **Place Assets** — Drag assets onto grid points
4. **Draw Connections** — Drag lines between assets to connect them
5. **Configure Timing** — Select connections, adjust duration/delay/easing
6. **Preview** — Switch to Live Mode, jiggle parent assets
7. **Export** — Save as GIF, video, or import to blog

### Example: Swaying Lattice Garden

1. Place `Lattice` at center
2. Connect multiple `Vine` assets to lattice
3. Connect `Butterfly` to one vine
4. Set vine connections: 0.2s duration, staggered delays
5. Set butterfly: 0.5s duration, 0.3s delay
6. In Live Mode: move lattice side-to-side
7. Result: lattice sways → vines follow in wave → butterfly bobs along

---

## Export Options

| Format | Use Case |
|--------|----------|
| **Blog Import** | Live animation plays on Grove blog (uses Foliage) |
| **GIF** | Shareable, loops forever |
| **Video (WebM/MP4)** | Higher quality, social sharing |
| **PNG Sequence** | Frame-by-frame for external editing |

---

## Phased Implementation

### V1: Animation Propagation

- Grid Matrix Editor with node-graph connections
- Basic timing controls (duration, delay, easing)
- Propagation-based chain reactions (no physics)
- Export to GIF/video
- Blog import integration

### V2: Real Physics

- Physics simulation engine (spring tension, momentum, gravity)
- Configurable physics properties per connection
- More organic, realistic chain movement
- Wind/force effects

---

## Integration with Terrarium

Animation Studio lives **inside** Terrarium as a mode/tab:

```
┌─────────────────────────────────────────────────────────────┐
│  ◎ Terrarium                                                │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │  🎨 Canvas   │  🔗 Studio   │  📦 Export   │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                             │
│  [Current mode content here]                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Canvas** — Existing Terrarium (static composition + Live preview)
- **Studio** — Grid Matrix Editor (connections + timing)
- **Export** — Export dialog (now supports animation formats)

---

## Diagram Editor — Shared Node-Graph Engine

The same node-graph engine that powers Animation Studio can also power a **Grove-styled diagram editor** — a lightweight alternative to Mermaid that renders natively without heavy external libraries.

### The Problem with Mermaid

Mermaid diagrams are powerful but:
- Heavy rendering library (bloats bundle size)
- External dependency for what's essentially boxes and arrows
- Styling doesn't match Grove's aesthetic

### The Solution

Build diagram rendering into the same node-graph foundation:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED NODE-GRAPH ENGINE                     │
├─────────────────────────────┬───────────────────────────────────┤
│      Animation Studio       │        Diagram Editor             │
├─────────────────────────────┼───────────────────────────────────┤
│  Assets: Nature components  │  Assets: Glass cards + icons      │
│  Connections: Timing/glue   │  Connections: Arrows/lines        │
│  Output: Animations         │  Output: Static diagrams          │
│  Mode: Live preview         │  Mode: Rendered SVG/embed         │
└─────────────────────────────┴───────────────────────────────────┘
```

### Diagram Editor Features

**Node Types:**
- **Glass Cards** — Grove's glassmorphism aesthetic, customizable content
- **Lucide Icons** — MIT-licensed, tree-shakeable, perfect fit
- **Text Nodes** — Simple labeled boxes
- **Custom Components** — Extend with Svelte components

**Connection Types:**
- Solid arrows (→)
- Dashed lines (--)
- Labeled connections
- Directional/bidirectional

**Diagram Types (potential):**
- Flowcharts
- Sequence diagrams
- Entity relationships
- Mind maps
- Architecture diagrams

```
┌──────────────────────────────────────────────────────────────┐
│  ◎ Diagram Editor                         [Export ▾]        │
├────────────┬─────────────────────────────────────────────────┤
│   Palette  │                                                 │
│  ────────  │    ╭─────────────╮         ╭─────────────╮     │
│  ▢ Card    │    │   Request   │────────→│   Handler   │     │
│  ◇ Diamond │    │   ☁ icon    │         │   ⚡ icon   │     │
│  ○ Circle  │    ╰─────────────╯         ╰─────────────╯     │
│  ─ Line    │          │                        │             │
│            │          │                        │             │
│  Icons:    │          ▼                        ▼             │
│  ☁ ⚡ 📦   │    ╭─────────────╮         ╭─────────────╮     │
│  🔒 📊 ⚙   │    │  Database   │←────────│   Cache     │     │
│            │    │   📦 icon   │         │   ⚡ icon   │     │
│            │    ╰─────────────╯         ╰─────────────╯     │
└────────────┴─────────────────────────────────────────────────┘
```

### Output Formats

| Format | Use Case |
|--------|----------|
| **Live Svelte** | Renders directly in blog posts, no external deps |
| **SVG Export** | Clean vectors for docs, READMEs |
| **PNG Export** | Static images |
| **Embed Code** | Copy/paste component into posts |

### Icon Integration

[Lucide](https://lucide.dev) icons are:
- MIT licensed (fully permissive)
- Tree-shakeable (only import what you use)
- SVG-based (scales perfectly)
- 1000+ icons available

```svelte
<script>
  import { Cloud, Zap, Database } from 'lucide-svelte';
</script>
```

---

## Architecture Patterns

### D1 Batch Calls via Loom

For persistence, wrap diagram/animation data in D1 batch operations using the Loom pattern:

```typescript
// Example: Save diagram with all nodes and connections in one batch
await loom.batch([
  db.insert(diagrams).values({ id, name, userId }),
  ...nodes.map(node => db.insert(diagramNodes).values(node)),
  ...connections.map(conn => db.insert(diagramConnections).values(conn))
]);
```

Benefits:
- Single round-trip for complex saves
- Transactional consistency
- Efficient for node-graph structures with many relationships

### Shared Engine Components

```
packages/engine/src/lib/ui/components/
├── node-graph/                 # Shared foundation
│   ├── Grid.svelte            # Snap grid system
│   ├── Connection.svelte      # Line/arrow rendering
│   ├── Node.svelte            # Base node wrapper
│   ├── Canvas.svelte          # Pan/zoom canvas
│   └── types.ts               # Shared types
│
├── terrarium/                  # Animation Studio
│   ├── ...existing...
│   └── uses node-graph/
│
└── diagrams/                   # Diagram Editor (new)
    ├── DiagramEditor.svelte
    ├── GlassCard.svelte
    ├── IconNode.svelte
    └── uses node-graph/
```

---

## Open Questions

- [ ] Should connections be visible in Live Mode, or hidden during preview?
- [ ] How to handle circular connections (A→B→C→A)?
- [ ] Maximum chain depth before performance degrades?
- [ ] Should there be preset "jiggle patterns" (wave, pulse, random)?
- [ ] Audio sync possibilities for V2+?
- [ ] **Naming:** What to call the unified node-graph system? (Walk through Grove needed)
- [ ] Which Lucide icons to include in starter palette?
- [ ] Markdown shortcode syntax for embedding diagrams in posts?
- [ ] Should diagrams support dark/light mode variants?

---

## Tomorrow's Tasks

- [ ] **Walk through the Grove** — Find proper names for this system
- [ ] **Review grove-ui-design skill** — Ensure patterns align
- [ ] **Expand spec** — Add more detail based on naming/patterns discovered
- [ ] **Consider Loom integration** — Map out D1 schema for persistence

---

## Related Documents

- [[terrarium-spec]] — Parent feature spec
- [[foliage-spec]] — Blog decoration system (if exists)
- [[grove-naming]] — Naming philosophy

---

*Draft created: January 6th, 2026*
*Updated: January 6th, 2026 — Added Diagram Editor concept*
*Status: Idea documentation — not yet scheduled for implementation*
