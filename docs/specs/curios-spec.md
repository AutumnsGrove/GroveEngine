---
aliases: []
date created: Monday, January 13th 2026
date modified: Monday, January 13th 2026
tags:
  - personalization
  - visitor-experience
  - old-web
  - svelte
type: tech-spec
---

# Curios — Cabinet of Wonders

```
        ┌─────────────────────────────────┐
        │  ╭─────╮   ╭─────╮   ╭─────╮   │
        │  │ 🦋  │   │ 📖  │   │ 🔮  │   │
        │  ╰─────╯   ╰─────╯   ╰─────╯   │
        │  ╭─────╮   ╭─────╮   ╭─────╮   │
        │  │ 🕯️  │   │ 🎰  │   │ ✨  │   │
        │  ╰─────╯   ╰─────╯   ╰─────╯   │
        │  ╭─────╮   ╭─────╮   ╭─────╮   │
        │  │ 🌿  │   │ 📊  │   │ 🚧  │   │
        │  ╰─────╯   ╰─────╯   ╰─────╯   │
        └─────────────────────────────────┘

        What curiosities will they find?
```

> *A curio is something unusual and intriguing—a curiosity that makes you pause and look closer.*

Curios is your cabinet of wonders. Guestbooks, shrines, hit counters, cursors, link gardens, under-construction badges—the curious little things that make visitors pause and smile. Not your theme (that's Foliage). Not the editor (that's Terrarium). This is the STUFF. The personal touches. The old-web-chaos-energy that says "someone lives here."

---

## Overview

**Internal Name:** GroveCurios
**Public Name:** Curios
**Domain:** `curios.grove.place`
**Package:** `@autumnsgrove/curios`

Curios handles the interactive, decorative, and personal elements that visitors experience on your site. While Foliage controls your theme (colors, fonts, layouts) and Terrarium is where you create visual scenes, Curios is everything else—the guestbook nailed to the trunk, the wind chimes in the branches, the shrine at the base of your tree.

---

## Design Philosophy

- **Personal expression:** Your space should feel YOURS, not a template
- **Old web energy:** Bring back the weird, wonderful, chaotic personal homepage vibes
- **Visitor participation:** Let people leave their mark (guestbooks, etc.)
- **Delight over polish:** Charm matters more than perfection
- **Guardrails, not walls:** Enable creativity within reasonable limits

---

## The Curios Collection

### 1. Custom Cursors

Let users choose how visitors experience their space.

**Cursor Categories:**
- **Nature** — Leaf, flower, butterfly, ladybug, raindrop
- **Whimsical** — Sparkle trail, magic wand, tiny mushroom
- **Classic Web** — Spinning hourglass, rainbow trail, hand pointer variants
- **Seasonal** — Snowflake, pumpkin, cherry blossom, falling leaves
- **Custom** — Upload your own (PNG, max 32x32)

**Configuration:**
```typescript
interface CursorConfig {
  type: 'preset' | 'custom';
  preset?: CursorPreset;
  customUrl?: string; // R2 CDN URL
  trailEffect?: boolean;
  trailLength?: number; // 3-10 elements
}

type CursorPreset =
  | 'leaf' | 'flower' | 'butterfly' | 'ladybug' | 'raindrop'
  | 'sparkle' | 'wand' | 'mushroom'
  | 'hourglass' | 'rainbow' | 'pointer-leaf'
  | 'snowflake' | 'pumpkin' | 'blossom' | 'falling-leaf';
```

**Tier Access:**
- **Seedling:** 5 nature presets
- **Sapling:** All presets
- **Oak+:** All presets + 1 custom upload

---

### 2. Guestbooks

The classic. Let visitors sign your guestbook.

**Features:**
- Visitor name (optional, defaults to "Anonymous Wanderer")
- Message (max 500 characters)
- Optional emoji reaction
- Timestamp
- Author can delete entries
- Spam filtering via Thorn

**Schema:**
```typescript
interface GuestbookEntry {
  id: string;
  tenantId: string;
  name: string;
  message: string;
  emoji?: string;
  createdAt: Date;
  ipHash: string; // For rate limiting, not stored long-term
  approved: boolean; // For moderation
}
```

**Display Styles:**
- **Classic** — Lined paper, handwritten font vibe
- **Modern** — Clean cards
- **Pixel** — Retro pixel art aesthetic
- **Cozy** — Warm, journaly feel

**Tier Access:**
- **Seedling:** 1 guestbook, 50 entries max, Classic style only
- **Sapling:** 1 guestbook, 500 entries, all styles
- **Oak+:** Multiple guestbooks, unlimited entries, all styles

---

### 3. Hit Counters

You are visitor #1,247!

**Styles:**
- **Classic** — Green digits on black background
- **Odometer** — Flip-style mechanical counter
- **Minimal** — Just the number
- **Retro LCD** — Calculator display vibes
- **Custom** — Match your theme colors

**Configuration:**
```typescript
interface HitCounter {
  id: string;
  tenantId: string;
  count: number;
  style: 'classic' | 'odometer' | 'minimal' | 'lcd' | 'custom';
  showLabel: boolean; // "You are visitor"
  showSince: boolean; // "since Jan 2026"
  startedAt: Date;
  customColors?: {
    background: string;
    digits: string;
  };
}
```

**Privacy:**
- Counts page loads, not unique visitors (no tracking)
- No IP logging
- Purely decorative/nostalgic

**Tier Access:**
- **Seedling:** 1 counter, Classic style
- **Sapling:** 1 counter, all styles
- **Oak+:** Multiple counters (per page), custom colors

---

### 4. Personal Shrines

Dedicated spaces for the things you love.

**Shrine Types:**
- **Memory** — Photos, dates, dedications
- **Fandom** — Celebrate favorite media
- **Pet Memorial** — Honor beloved companions
- **Achievement** — Display accomplishments
- **Gratitude** — Things you're thankful for
- **Inspiration** — Quotes, images, vibes
- **Blank** — Build from scratch

**Structure:**
```typescript
interface Shrine {
  id: string;
  tenantId: string;
  type: ShrineType;
  title?: string;
  dedication?: string;
  frame: 'wood' | 'stone' | 'crystal' | 'floral' | 'cosmic' | 'minimal';
  size: 'small' | 'medium' | 'large'; // 150x150, 250x250, 400x400
  contents: ShrineContent[];
  candle?: boolean; // Animated flickering
  flowers?: boolean; // Decorative edge flowers
  createdAt: Date;
}

interface ShrineContent {
  type: 'image' | 'text' | 'date' | 'icon' | 'decoration';
  position: { x: number; y: number };
  data: Record<string, unknown>;
}
```

**Tier Access:**
- **Seedling:** No shrines
- **Sapling:** 3 shrines, small/medium only
- **Oak+:** Unlimited shrines, all sizes, all frames

---

### 5. Link Gardens

Curated links to other sites—your personal webring.

**Features:**
- Categorized link collections
- Custom labels and descriptions
- Optional favicons (auto-fetched or custom)
- "Blogroll" / "Friends" / "Cool Sites" vibes

**Structure:**
```typescript
interface LinkGarden {
  id: string;
  tenantId: string;
  title: string; // "Friends" / "Cool Sites" / "Blogroll"
  description?: string;
  links: GardenLink[];
  style: 'list' | 'grid' | 'buttons' | 'marquee';
}

interface GardenLink {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string; // Auto or custom
  addedAt: Date;
}
```

**Display Styles:**
- **List** — Simple vertical list
- **Grid** — Icon grid with tooltips
- **Buttons** — 88x31 button style (classic web!)
- **Marquee** — Scrolling links (the chaos option)

**Tier Access:**
- **Seedling:** 1 garden, 10 links, list style
- **Sapling:** 3 gardens, 50 links each, all styles
- **Oak+:** Unlimited gardens/links, all styles, custom 88x31 buttons

---

### 6. Status Badges

Signal what's up with your site.

**Pre-Made Badges:**
- 🚧 **Under Construction** — Animated worker
- 🌱 **Just Planted** — Sprouting seedling
- 🔮 **Coming Soon** — Crystal ball
- ✨ **New & Shiny** — Sparkle burst
- 💤 **On Hiatus** — Sleeping moon
- 🎉 **Grand Opening** — Confetti
- 🌙 **Night Owl** — Active late (auto based on post times)
- 📅 **Last Updated** — Auto-updates with last post date

**Animated GIF Collection:**
- Classic construction worker
- Spinning "under construction" tape
- Growing plant time-lapse
- Floating "pardon our dust"
- Retro pixel variants

**Configuration:**
```typescript
interface StatusBadge {
  id: string;
  tenantId: string;
  type: BadgeType;
  position: 'header' | 'sidebar' | 'footer' | 'floating';
  animated: boolean;
  customText?: string;
  showDate?: boolean;
}
```

**Tier Access:**
- **All tiers:** Access to status badges (they're fun and free!)

---

### 7. Clip Art Library

Templated decorations you can drop anywhere.

**Categories:**

**🌿 Foliage Extras:**
- Decorative borders (vine, flower, mushroom)
- Corner flourishes
- Divider lines (branch, dotted path, stream)
- Frame templates

**🦋 Critters:**
- Butterflies (various species)
- Bees, ladybugs, dragonflies
- Birds (songbird, owl, hummingbird)
- Woodland silhouettes (fox, deer, rabbit)
- Snails, caterpillars

**✨ Effects:**
- Sparkle clusters
- Fairy dust trails
- Light rays / sun beams
- Weather overlays (rain, snow, fog)

**🏷️ Labels & Signs:**
- Wooden signposts
- Stone markers
- Hanging banners
- Speech bubbles
- Name plates

**🎀 Decorative:**
- Ribbons and bows
- Lanterns and fairy lights
- Garden stakes
- Wind chimes
- Bird houses

**Tier Access:**
- **Seedling:** 5 items per page
- **Sapling:** 25 items per page
- **Oak+:** Unlimited

---

### 8. Weird Artifacts

The chaos corner. Strange, delightful, interactive objects.

**🔮 Mystical:**
- **Crystal Ball** — Swirling animated mist
- **Magic 8-Ball** — Click for answers
- **Tarot Card** — Random daily draw
- **Glowing Runes** — Decorative magic symbols
- **Floating Orbs** — Ambient decoration

**🎰 Interactive:**
- **Fortune Cookie** — Daily fortune
- **Dice Roller** — Click to roll
- **Coin Flip** — Heads or tails
- **Mood Ring** — Changes with time of day

**🌀 Classic Web:**
- **Marquee Text** — Scrolling messages (THE CLASSIC)
- **Blinking "NEW!"** — Attention grabber
- **Rainbow Dividers** — Colorful separators
- **"Email Me" Buttons** — Retro contact buttons
- **ASCII Art Blocks** — Text art displays

**🎵 Audio (Optional):**
- **Nature Sounds Button** — Rain, birds, wind
- **Ambient Player** — Lo-fi background vibes

**Artifact Structure:**
```typescript
interface Artifact {
  id: string;
  tenantId: string;
  type: ArtifactType;
  position: { x: number; y: number };
  config: Record<string, unknown>; // Type-specific
  interactive: boolean;
}

// Example: Marquee
interface MarqueeArtifact extends Artifact {
  type: 'marquee';
  config: {
    text: string;
    speed: 'slow' | 'medium' | 'fast';
    direction: 'left' | 'right';
    style: 'classic' | 'neon' | 'minimal';
  };
}

// Example: Magic 8-Ball
interface Magic8BallArtifact extends Artifact {
  type: 'magic-8-ball';
  config: {
    customAnswers?: string[]; // Override defaults
  };
}
```

**Tier Access:**
- **Seedling:** 2 artifacts (non-interactive only)
- **Sapling:** 5 artifacts, all types
- **Oak+:** Unlimited artifacts

---

### 9. Custom Uploads

Drop in your own images.

**Guardrails:**
- Max file size: 2MB
- Max dimensions: 512x512 (auto-resized)
- Formats: PNG, GIF, WEBP, SVG (sanitized)
- Content moderation via hash detection

**Storage Quotas:**
- **Seedling:** 10 uploads, 50MB total
- **Sapling:** 25 uploads, 500MB total
- **Oak+:** Unlimited uploads, 5GB total

**Structure:**
```typescript
interface CustomUpload {
  id: string;
  tenantId: string;
  filename: string;
  originalSize: { width: number; height: number };
  displaySize: { width: number; height: number };
  cdnUrl: string;
  thumbnailUrl: string;
  fileSize: number;
  uploadedAt: Date;
  usageCount: number;
}
```

---

## Database Schema

### curio_settings

```sql
CREATE TABLE curio_settings (
  tenant_id TEXT PRIMARY KEY,
  cursor_config TEXT, -- JSON
  enabled_curios TEXT DEFAULT '[]', -- JSON array of enabled curio types
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

### guestbook_entries

```sql
CREATE TABLE guestbook_entries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  guestbook_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'Anonymous Wanderer',
  message TEXT NOT NULL,
  emoji TEXT,
  approved INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_guestbook_tenant ON guestbook_entries(tenant_id, guestbook_id);
CREATE INDEX idx_guestbook_approved ON guestbook_entries(approved, created_at);
```

### hit_counters

```sql
CREATE TABLE hit_counters (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  page_path TEXT DEFAULT '/',
  count INTEGER DEFAULT 0,
  style TEXT DEFAULT 'classic',
  config TEXT, -- JSON
  started_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_counter_tenant_page ON hit_counters(tenant_id, page_path);
```

### shrines

```sql
CREATE TABLE shrines (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT,
  dedication TEXT,
  frame TEXT DEFAULT 'wood',
  size TEXT DEFAULT 'medium',
  contents TEXT NOT NULL, -- JSON
  candle INTEGER DEFAULT 0,
  flowers INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_shrines_tenant ON shrines(tenant_id);
```

### link_gardens

```sql
CREATE TABLE link_gardens (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  style TEXT DEFAULT 'list',
  links TEXT NOT NULL, -- JSON array
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_gardens_tenant ON link_gardens(tenant_id);
```

### artifacts

```sql
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  page_path TEXT DEFAULT '/',
  position TEXT, -- JSON {x, y}
  config TEXT NOT NULL, -- JSON
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_artifacts_tenant ON artifacts(tenant_id, page_path);
```

### custom_uploads

```sql
CREATE TABLE custom_uploads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  cdn_url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size INTEGER NOT NULL,
  dimensions TEXT, -- JSON {width, height}
  usage_count INTEGER DEFAULT 0,
  uploaded_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_uploads_tenant ON custom_uploads(tenant_id);
```

---

## Tier Access Summary

| Curio | Seedling | Sapling | Oak+ |
|-------|----------|---------|------|
| **Cursors** | 5 presets | All presets | All + custom |
| **Guestbook** | 1, 50 entries | 1, 500 entries | Multiple, unlimited |
| **Hit Counter** | 1, classic | 1, all styles | Multiple, custom |
| **Shrines** | — | 3, small/medium | Unlimited, all |
| **Link Gardens** | 1, 10 links | 3, 50 links | Unlimited |
| **Status Badges** | ✅ All | ✅ All | ✅ All |
| **Clip Art** | 5/page | 25/page | Unlimited |
| **Artifacts** | 2 (non-interactive) | 5 | Unlimited |
| **Custom Uploads** | 10, 50MB | 25, 500MB | Unlimited, 5GB |

---

## Integration with Terrarium

Terrarium is the EDITOR where users configure their Curios. The relationship:

- **Terrarium** — Where you ADD and ARRANGE curios (drag-drop interface)
- **Curios** — The THINGS themselves and their rendering logic

When a user opens Terrarium, they see:
1. The visual canvas (scenes, decorations)
2. A "Curios" panel with available curios to place
3. Configuration options for each curio type

Curios exports components that Terrarium imports:
```typescript
// @autumnsgrove/curios
export { GuestbookWidget } from './components/Guestbook.svelte';
export { HitCounterWidget } from './components/HitCounter.svelte';
export { ShrineWidget } from './components/Shrine.svelte';
export { LinkGardenWidget } from './components/LinkGarden.svelte';
export { ArtifactWidget } from './components/Artifact.svelte';
// ... etc
```

---

## Integration with Foliage

Foliage handles THEME (colors, fonts, layouts). Curios respects theme variables:

```css
/* Curios components use Foliage CSS variables */
.guestbook {
  background: var(--surface);
  color: var(--foreground);
  border-color: var(--border);
  accent-color: var(--accent);
}
```

This ensures Curios blend with whatever theme the user has chosen.

---

## Accessibility

- All interactive curios keyboard-accessible
- Screen reader labels for decorative elements
- `prefers-reduced-motion` disables animations
- Sufficient color contrast (inherits from Foliage)
- Skip links for heavily-decorated pages

---

## Content Moderation

- Guestbook entries filtered via Thorn
- Custom uploads scanned for NSFW content
- Report button on all user-generated content
- Auto-hide flagged content pending review
- Marquee/custom text checked for slurs/spam

---

## Performance

- Lazy-load curios below the fold
- Limit simultaneous animations (max 20)
- Compress custom uploads to WebP server-side
- Cache curio configurations in edge KV
- "Reduce motion" mode pauses all animations

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Initialize package structure
- Database migrations
- Basic curio settings API
- Cursor system implementation

### Phase 2: Core Curios (Week 3-5)
- Guestbook implementation
- Hit counter implementation
- Status badges
- Basic clip art library

### Phase 3: Advanced Curios (Week 6-8)
- Shrines system
- Link gardens
- Artifacts (interactive elements)
- Marquee and classic web stuff

### Phase 4: Custom Content (Week 9-10)
- Custom upload system
- R2 integration
- Content moderation hooks
- Storage quota enforcement

### Phase 5: Polish (Week 11-12)
- Terrarium integration
- Foliage theming integration
- Accessibility audit
- Performance optimization

---

## Success Metrics

- Curio adoption rate (% of users with at least one curio)
- Guestbook engagement (entries per active guestbook)
- Custom upload usage
- Page load time with curios (target: <100ms additional)
- Accessibility compliance (WCAG 2.1 AA)

---

**Summary:** Curios brings back the soul of the personal web. The guestbooks, the hit counters, the shrines, the weird delightful chaos—everything that made the old web feel alive and personal. Not nostalgia for nostalgia's sake, but because these things MATTERED. They said "someone lives here." And in a world of algorithmic sameness, that matters more than ever.

*What curiosities will they find?*
