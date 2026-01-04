# Asset Playground - Implementation Plan

## Overview

Create an interactive canvas-based playground where users can drag and drop Grove's nature components and assets to design custom multi-asset scenes (like grove compositions with lattices, trees, creatures, etc.).

---

## Core Features

### 1. Canvas System
- **Blank canvas** - Full viewport workspace with pan/zoom support
- **Infinite canvas** - Allow scrolling/panning beyond viewport
- **Background options** - Sky gradients, solid colors, or transparent

### 2. Drag-and-Drop Asset Placement
- **Asset palette** - Sidebar listing all available components by category:
  - Trees (Aspen, Birch, Cherry, Pine)
  - Creatures (Bee, Bird, Butterfly, Deer, Firefly, Owl, Rabbit, Squirrel, etc.)
  - Botanical (Acorn, Berry, Leaf, Vine, Fern, etc.)
  - Ground (Bush, Mushroom, Rock, Stump, Grass, Flowers)
  - Sky (Cloud, Moon, Star, Sun, Rainbow)
  - Structural (Lattice, LatticeWithVine, Birdhouse, Bridge, Lantern, GardenGate)
  - Water (Pond, Stream, LilyPad, Reeds)
  - Weather (Snowflake, SnowfallLayer, FallingLeavesLayer)
- **Drag from palette** to canvas
- **Click to place** as alternative interaction

### 3. Asset Manipulation
- **Move** - Drag placed assets to reposition
- **Scale** - Resize assets with handles or input
- **Rotate** - Optional rotation for certain assets
- **Layer order** - Bring forward/send back (z-index control)
- **Delete** - Remove assets from canvas
- **Duplicate** - Quick copy of placed assets

### 4. Snap-to-Grid Mode
- **Toggle grid** - Show/hide alignment grid
- **Grid size** - Configurable (16px, 32px, 64px default options)
- **Snap behavior** - Assets snap to grid intersections when enabled
- **Free placement** - Hold modifier key to temporarily disable snap

### 5. Scene Management
- **New scene** - Start fresh
- **Save scene** - Store scene data (positions, assets, settings)
- **Load scene** - Restore previously saved scenes
- **Export** - Download as PNG/SVG for use elsewhere

---

## Technical Architecture

### Data Structure

```typescript
interface PlaygroundScene {
  id: string;
  name: string;
  canvas: {
    width: number;
    height: number;
    background: string; // color or gradient
    gridEnabled: boolean;
    gridSize: number;
  };
  assets: PlacedAsset[];
  createdAt: Date;
  updatedAt: Date;
}

interface PlacedAsset {
  id: string;
  componentName: string; // e.g., "TreePine", "Lattice"
  category: AssetCategory;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  zIndex: number;
  props?: Record<string, any>; // Component-specific props
}

type AssetCategory =
  | 'trees' | 'creatures' | 'botanical'
  | 'ground' | 'sky' | 'structural'
  | 'water' | 'weather';
```

### Component Structure

```
packages/engine/src/lib/ui/components/playground/
├── Playground.svelte           # Main wrapper with state
├── Canvas.svelte               # The workspace area
├── AssetPalette.svelte         # Sidebar with draggable assets
├── PlacedAsset.svelte          # Wrapper for assets on canvas
├── GridOverlay.svelte          # Visual grid when enabled
├── Toolbar.svelte              # Top toolbar (grid toggle, export, etc.)
├── AssetControls.svelte        # Selection handles (scale, rotate, delete)
├── LayerPanel.svelte           # Optional: layer management sidebar
└── index.ts                    # Exports
```

### Route Structure

```
packages/engine/src/routes/playground/
├── +page.svelte                # Main playground page
├── +page.server.ts             # Load saved scenes (optional)
└── +layout.svelte              # Minimal layout (full-screen canvas)
```

---

## Implementation Phases

### Phase 1: Core Canvas & Asset Palette
1. Create `Playground.svelte` with canvas area
2. Build `AssetPalette.svelte` with categorized asset list
3. Implement basic drag-from-palette to canvas
4. Add `PlacedAsset.svelte` wrapper with position state
5. Enable moving placed assets by dragging

### Phase 2: Grid System & Snapping
1. Create `GridOverlay.svelte` with configurable size
2. Add snap-to-grid logic in drag handler
3. Build `Toolbar.svelte` with grid toggle and size options
4. Add modifier key (Shift) to disable snap temporarily

### Phase 3: Asset Controls & Selection
1. Implement asset selection (click to select)
2. Add `AssetControls.svelte` with resize handles
3. Implement scale functionality
4. Add delete action (keyboard + button)
5. Add duplicate action
6. Implement z-index controls (layer ordering)

### Phase 4: Scene Persistence
1. Define scene data structure
2. Implement save to localStorage (no backend initially)
3. Add load scene functionality
4. Optional: Database storage for authenticated users

### Phase 5: Export & Polish
1. Add PNG export using html2canvas or similar
2. Add SVG export for vector output
3. Refine UX with keyboard shortcuts
4. Add undo/redo (stretch goal)

---

## State Management

Using Svelte 5 runes for reactive state:

```typescript
// playground.svelte.ts - Shared state
export const playgroundState = $state({
  scene: {
    assets: [] as PlacedAsset[],
    canvas: {
      width: 1200,
      height: 800,
      background: 'var(--sky-gradient)',
      gridEnabled: true,
      gridSize: 32
    }
  },
  selectedAssetId: null as string | null,
  isDragging: false,
  dragOffset: { x: 0, y: 0 }
});
```

---

## Asset Registry

Create a registry mapping component names to actual components:

```typescript
// assetRegistry.ts
import * as Trees from '$lib/ui/components/nature/trees';
import * as Creatures from '$lib/ui/components/nature/creatures';
import * as Botanical from '$lib/ui/components/nature/botanical';
// ... etc

export const assetRegistry = {
  trees: {
    TreeAspen: { component: Trees.TreeAspen, name: 'Aspen', icon: '🌳' },
    TreeBirch: { component: Trees.TreeBirch, name: 'Birch', icon: '🌳' },
    TreeCherry: { component: Trees.TreeCherry, name: 'Cherry', icon: '🌸' },
    TreePine: { component: Trees.TreePine, name: 'Pine', icon: '🌲' },
  },
  creatures: {
    Bee: { component: Creatures.Bee, name: 'Bee', icon: '🐝' },
    // ...
  },
  // ... all categories
};
```

---

## UI/UX Considerations

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  [Toolbar: Grid Toggle | Size | Export | Save | Load]   │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  Asset     │                                            │
│  Palette   │              Canvas Area                   │
│            │                                            │
│  [Trees]   │         ┌──────┐                          │
│  [Creat.]  │         │ 🌲   │    🦋                    │
│  [Plants]  │         └──────┘         ╔════╗           │
│  [Ground]  │                          ║    ║ Lattice   │
│  [Sky]     │     🍄      🪨           ╚════╝           │
│  [Struct.] │                                            │
│  [Water]   │                                            │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

### Interactions
- **Drag from palette**: Ghost preview follows cursor
- **Drop on canvas**: Asset placed at drop position
- **Click asset**: Select it (shows controls)
- **Drag asset**: Move it (respects grid if enabled)
- **Corner handles**: Scale proportionally
- **Delete key**: Remove selected asset
- **Escape**: Deselect

### Visual Feedback
- **Grid**: Subtle dotted lines when enabled
- **Selection**: Dashed border around selected asset
- **Drag preview**: Semi-transparent ghost
- **Snap indicator**: Highlight grid lines when snapping

---

## Questions for User

1. **Persistence**: Should scenes save to the database (for logged-in users), or is localStorage sufficient initially?

2. **Collaboration**: Any plans for sharing/collaborative editing in the future?

3. **Asset props**: Should users be able to customize component props (colors, sizes, variants)?

4. **Animation**: Should animated assets (FallingLeavesLayer, Firefly) animate in the playground?

5. **Custom images**: Should users be able to drag in their own images from the gallery alongside nature components?

6. **Route location**: Where should this live?
   - `/playground` - Standalone feature
   - `/admin/playground` - Admin-only tool
   - `/create` - User-facing creative tool

---

## Files to Create/Modify

### New Files
- `packages/engine/src/lib/ui/components/playground/Playground.svelte`
- `packages/engine/src/lib/ui/components/playground/Canvas.svelte`
- `packages/engine/src/lib/ui/components/playground/AssetPalette.svelte`
- `packages/engine/src/lib/ui/components/playground/PlacedAsset.svelte`
- `packages/engine/src/lib/ui/components/playground/GridOverlay.svelte`
- `packages/engine/src/lib/ui/components/playground/Toolbar.svelte`
- `packages/engine/src/lib/ui/components/playground/AssetControls.svelte`
- `packages/engine/src/lib/ui/components/playground/assetRegistry.ts`
- `packages/engine/src/lib/ui/components/playground/index.ts`
- `packages/engine/src/routes/playground/+page.svelte`
- `packages/engine/src/routes/playground/+layout.svelte`

### Files to Modify
- `packages/engine/package.json` - Add playground export
- `packages/engine/src/lib/ui/index.ts` - Export playground components

---

## Estimated Scope

- **Phase 1** (Core): ~6-8 components
- **Phase 2** (Grid): ~2-3 components
- **Phase 3** (Controls): ~2-3 components
- **Phase 4** (Persistence): State management + storage
- **Phase 5** (Export): Export utilities

Total: ~15 new files, creating a complete interactive playground experience.
