---
aliases: []
date created: Monday, January 13th 2026
date modified: Monday, January 13th 2026
tags:
  - community
  - discovery
  - aggregation
  - social
type: tech-spec
---

# Forests — Community Groves

```
    🌲🌲🌲   🌲🌲   🌲🌲🌲🌲   🌲🌲🌲
   🌲 THE 🌲 🌲   🌲 PRISM 🌲  🌲🌲
    🌲🌲🌲   🌲🌲   🌲🌲🌲🌲   🌲🌲🌲
         ╲     |     ╱
          ╲    |    ╱
           ╲   |   ╱
        ════════════════
         SHARED ROOTS
```

> *A forest is many trees growing together. Roots intertwined. Shelter shared.*

Forests are themed community aggregators—places where like-minded folks gather. Inspired by GeoCities neighborhoods, but with Grove's nature-first naming. Each forest is a subdomain (`prism.grove.place`) that collects and showcases foliage from users who identify with that community.

---

## Overview

**Internal Name:** GroveForests
**Public Name:** Forests
**Domain Pattern:** `{forest}.grove.place`
**Package:** `@autumnsgrove/forests`

Forests solve the discovery problem: How do you find other people like you in the grove? Not through algorithms—through community. You join a forest, your foliage appears in that forest's directory, and visitors can wander through finding kindred spirits.

---

## Design Philosophy

- **Community over algorithm** — You find people through shared interests, not engagement metrics
- **Self-selection** — Users choose which forests they belong to
- **Not tier-gated** — Anyone can join any forest regardless of subscription
- **Curated growth** — Start with ~40-50 forests, expand based on user requests
- **Grove-themed names** — Names that feel like places in a forest, not corporate categories

---

## Core Features

### 1. Forest Membership

Users can join multiple forests. Membership is:
- **Self-selected** — You choose your forests
- **Public or private** — Choose whether to appear in forest directories
- **Unlimited** — No cap on how many forests you can join
- **Free** — Not tier-restricted

```typescript
interface ForestMembership {
  userId: string;
  forestId: string;
  joinedAt: Date;
  visible: boolean; // Appear in forest directory?
  featured: boolean; // Pinned in forest? (forest mod decision)
}
```

### 2. Forest Pages

Each forest has its own landing page at `{forest}.grove.place`:

- **Hero section** — Forest name, description, vibe
- **Member directory** — Grid/list of foliage in this forest
- **Recent activity** — Latest posts from forest members
- **Link garden** — Curated external resources for the community
- **Stats** — Member count, post count (private, not competitive)

### 3. Strolling (Discovery)

"Go for a stroll" — Random discovery feature.

**Stroll modes:**
- **Through a forest** — Random foliage from a specific forest
- **Through the grove** — Random foliage from anywhere
- **Along a trail** — Curated path through related forests

```typescript
interface StrollOptions {
  mode: 'forest' | 'grove' | 'trail';
  forestId?: string; // For forest mode
  trailId?: string; // For trail mode
  excludeVisited?: boolean; // Don't repeat
}

// Returns random foliage
async function takeAStroll(options: StrollOptions): Promise<Foliage[]>;
```

### 4. Link Gardens (Forest-Level)

Each forest maintains a community link garden:
- External resources relevant to the community
- Curated by forest moderators
- Not user-submitted (to prevent spam)

---

## The Forests

### Naming Convention

Names should feel like **places in or around a forest**—clearings, structures, natural features. They should evoke the community's vibe while being discoverable.

### Initial Forest List

See **[forests-seed-data.md](../forests-seed-data.md)** for the complete list of ~45 initial forests.

The seed data is maintained separately so it can be updated independently of this spec. Categories include:

- 🎨 **Creative & Arts** — Studios, darkrooms, stages for makers
- 💻 **Tech & Digital** — Terminals, arcades, workbenches for builders
- 🏳️‍🌈 **Identity & Community** — Safe spaces for identity communities
- 🍳 **Lifestyle** — Kitchens, greenhouses, dens for daily life
- 📚 **Knowledge & Learning** — Laboratories, chronicles for learners
- 🎮 **Entertainment & Fandom** — Shrines, pagodas for fans
- 🌿 **Outdoors & Nature** — Summits, blinds for nature lovers
- ✨ **Spiritual & Mystical** — Circles, veils for spiritual practice
- 💼 **Work & Professional** — Storefronts, towers for workers
- 🎵 **Music Genres** — 10 genre-specific gathering places

### Adding New Forests

Expand based on community requests. Track requests via:
- Porch conversations
- Community voting (future feature)
- Usage patterns (if a tag is heavily used, consider a forest)

**Potential additions:**
- Specific fandom forests (requested by communities)
- Regional/language forests
- Seasonal or event forests
- Niche hobby forests

---

## Database Schema

### forests

```sql
CREATE TABLE forests (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- URL slug (e.g., 'prism')
  name TEXT NOT NULL, -- Display name (e.g., 'The Prism')
  tagline TEXT, -- Short description
  description TEXT, -- Full description (markdown)
  icon TEXT, -- Lucide icon name
  color TEXT, -- Accent color hex
  category TEXT NOT NULL, -- Category grouping
  member_count INTEGER DEFAULT 0, -- Cached count
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_forests_category ON forests(category);
CREATE INDEX idx_forests_slug ON forests(slug);
```

### forest_memberships

```sql
CREATE TABLE forest_memberships (
  id TEXT PRIMARY KEY,
  forest_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  visible INTEGER DEFAULT 1, -- Show in directory
  featured INTEGER DEFAULT 0, -- Pinned by moderator
  joined_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (forest_id) REFERENCES forests(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(forest_id, tenant_id)
);

CREATE INDEX idx_memberships_forest ON forest_memberships(forest_id, visible);
CREATE INDEX idx_memberships_tenant ON forest_memberships(tenant_id);
```

### forest_link_gardens

```sql
CREATE TABLE forest_link_gardens (
  id TEXT PRIMARY KEY,
  forest_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT, -- Grouping within the garden
  added_by TEXT, -- Admin who added
  added_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (forest_id) REFERENCES forests(id) ON DELETE CASCADE
);

CREATE INDEX idx_garden_forest ON forest_link_gardens(forest_id);
```

---

## Forest Page Structure

Each forest page (`{forest}.grove.place`) includes:

```svelte
<main class="forest-page">
  <!-- Hero -->
  <header class="forest-hero">
    <h1>{forest.name}</h1>
    <p class="tagline">{forest.tagline}</p>
    <p class="description">{forest.description}</p>
    <div class="stats">
      <span>{memberCount} members</span>
    </div>
    {#if !isMember}
      <button onclick={joinForest}>Join this forest</button>
    {:else}
      <button onclick={leaveForest}>Leave forest</button>
    {/if}
  </header>

  <!-- Stroll CTA -->
  <section class="stroll-cta">
    <button onclick={() => stroll('forest')}>
      🚶 Take a stroll through {forest.name}
    </button>
  </section>

  <!-- Member Directory -->
  <section class="directory">
    <h2>Who's here</h2>
    <div class="member-grid">
      {#each members as member}
        <FoliageCard foliage={member} />
      {/each}
    </div>
  </section>

  <!-- Recent Activity -->
  <section class="activity">
    <h2>Recent growth</h2>
    <PostFeed posts={recentPosts} />
  </section>

  <!-- Link Garden -->
  {#if linkGarden.length > 0}
    <aside class="link-garden">
      <h2>Community resources</h2>
      <LinkGarden links={linkGarden} />
    </aside>
  {/if}
</main>
```

---

## Strolling Implementation

```typescript
// Take a random stroll
export async function stroll(
  db: D1Database,
  options: StrollOptions
): Promise<string> { // Returns redirect URL
  let query: string;
  let params: unknown[];

  if (options.mode === 'forest') {
    // Random visible member from specific forest
    query = `
      SELECT t.subdomain
      FROM forest_memberships fm
      JOIN tenants t ON fm.tenant_id = t.id
      WHERE fm.forest_id = ? AND fm.visible = 1
      ORDER BY RANDOM()
      LIMIT 1
    `;
    params = [options.forestId];
  } else {
    // Random from entire grove
    query = `
      SELECT subdomain FROM tenants
      WHERE status = 'active'
      ORDER BY RANDOM()
      LIMIT 1
    `;
    params = [];
  }

  const result = await db.prepare(query).bind(...params).first<{ subdomain: string }>();

  if (!result) {
    throw new Error('No foliage found');
  }

  return `https://${result.subdomain}.grove.place`;
}
```

---

## User Experience

### Joining a Forest

1. User visits forest page or discovers via browse
2. Clicks "Join this forest"
3. Chooses visibility (appear in directory or not)
4. Foliage now associated with forest

### Discovering Forests

- **Browse page** — Grid of all forests by category
- **Search** — Find forests by name/description
- **Recommendations** — Based on interests (future)
- **From other users** — See which forests they're in

### Leaving a Forest

- One click from forest page or settings
- Removes from directory immediately
- No penalty, can rejoin anytime

---

## Learning in Public Badge

A special Curio for users who want to signal they're learning:

```typescript
interface LearningBadge {
  type: 'learning-in-public';
  topic: string; // What they're learning
  startedAt: Date;
  style: 'seedling' | 'sprout' | 'sapling'; // Growth stages
}
```

Display on foliage to invite feedback and connect with others learning similar things.

---

## Tier Access

Forests are **NOT tier-gated**. Everyone can:
- Join any forest
- Appear in directories
- Take strolls
- View forest pages

Premium features (future):
- Forest moderation tools (for community leaders)
- Custom forest creation (Evergreen only?)
- Forest analytics (for moderators)

---

## Moderation

Each forest needs light moderation:
- **Featured members** — Moderators can pin exemplary foliage
- **Removal** — Remove inappropriate members
- **Link garden curation** — Add/remove resources

Initially: Autumn moderates all forests
Future: Community moderators per forest

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- Database schema and migrations
- Forest seed data (all ~45 forests)
- Basic forest page rendering
- Join/leave functionality

### Phase 2: Discovery (Week 3-4)
- Browse all forests page
- Strolling feature
- Member directory grid
- Search functionality

### Phase 3: Activity (Week 5-6)
- Recent posts feed on forest pages
- Link garden display
- Forest stats

### Phase 4: Polish (Week 7-8)
- Learning in Public badge integration
- Forest recommendations
- Mobile optimization
- Performance tuning

---

## Success Metrics

- Forest join rate (members per forest)
- Stroll engagement (strolls per day)
- Cross-pollination (users in multiple forests)
- Directory visibility rate (% choosing to be visible)

---

**Summary:** Forests bring back the magic of GeoCities neighborhoods—themed communities where you belong, not algorithms deciding what you see. Find your people. Join their forest. Take a stroll. Discover kindred spirits among the trees.

*Many trees, one grove.*
