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

## Open Questions

- [ ] Should connections be visible in Live Mode, or hidden during preview?
- [ ] How to handle circular connections (A→B→C→A)?
- [ ] Maximum chain depth before performance degrades?
- [ ] Should there be preset "jiggle patterns" (wave, pulse, random)?
- [ ] Audio sync possibilities for V2+?

---

## Related Documents

- [[terrarium-spec]] — Parent feature spec
- [[foliage-spec]] — Blog decoration system (if exists)

---

*Draft created: January 6th, 2026*
*Status: Idea documentation — not yet scheduled for implementation*
