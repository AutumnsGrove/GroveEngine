# Natural Language Cross-Site Search Plan

## Overview

This plan explores how Grove can enable natural language search across all blogs in the network — not just "find posts with the word 'grove'" but "find posts about loss and grief" or "show me writing about starting over."

**The Vision:**
Right now, each blog has its own search. But Grove isn't just isolated sites — it's a community. Wanderers should be able to discover stories, ideas, and voices across the entire network. Natural language search makes that discovery feel _human_ rather than mechanical.

**Key Questions to Explore:**

- How do we index content across multiple blogs while respecting privacy?
- What's the right balance between search quality and infrastructure cost?
- Can we make semantic search feel like discovering a friend's writing, not querying a database?
- How do we handle tenant opt-in/opt-out for cross-site discovery?

**Related Goals:**

- Make Grove content discoverable beyond individual blogs
- Enable thematic exploration ("grief," "queer joy," "building in public")
- Create paths for wanderers to find their people
- Stay true to Grove values: warm, owned, not extractive

---

## The Problem We're Solving

### Current State

Each blog has local search:

- Works well for "I know this blog has something about X"
- Fast, client-side, zero infrastructure cost
- But isolated — you can't discover content across blogs

### What We Want

"Find posts about starting over" should return:

- Your friend's post about moving cities after a breakup
- Someone's essay about pivoting their career
- A poem about spring and renewal
- A technical post about rewriting a codebase

**This isn't keyword matching** — it's understanding _meaning_ and _theme_.

---

## Architecture Options

### Option A: Client-Side Aggregated Index

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Grove Discovery (discover.grove.place)            │
├─────────────────────────────────────────────────────────────────────┤
│  SvelteKit Frontend: /search, /explore, /browse                      │
│                              │                                       │
│  On page load: Fetch aggregated index from KV/R2                     │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                  │
│  FlexSearch/Orama Client │ Embeddings (optional) │ Filters (tags)    │
└─────────────────────────────────────────────────────────────────────┘
│
│  Background Worker (Cron, every 15 min):
│    - Poll opted-in blog RSS feeds
│    - Update master index in R2
│    - Generate embeddings for semantic search (if using Orama + vectors)
└─────────────────────────────────────────────────────────────────────┘
```

**Pros:**

- Zero per-search cost (client does the work)
- Privacy-friendly (searches happen locally)
- Fast response times
- Aligns with Grove's indie web values

**Cons:**

- Large initial download (index size grows with content)
- Limited semantic search quality without server-side embeddings
- Re-indexing lag (15-30 min for new posts to appear)

**Estimated Cost:** ~$0-5/month (R2 storage + Worker cron)

---

### Option B: Cloudflare AI Search (Managed)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Grove Discovery (discover.grove.place)            │
├─────────────────────────────────────────────────────────────────────┤
│  SvelteKit Frontend: /search, /explore                               │
│                              │                                       │
│  Server-Side Search Handler                                          │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                  │
│  Cloudflare AI Search │ Workers Binding │ Streaming Results           │
└─────────────────────────────────────────────────────────────────────┘
│
│  Indexing (Background):
│    - Automatic crawling of sitemaps OR
│    - Manual index updates via API
│    - Path filtering (only /garden/* routes)
│    - AI-powered semantic understanding built-in
└─────────────────────────────────────────────────────────────────────┘
```

**Pros:**

- Fully managed (zero infrastructure work)
- Native Cloudflare integration
- Built-in semantic search and AI ranking
- Stream results as they arrive (good UX)
- Automatic re-indexing

**Cons:**

- **Pricing unclear** (needs evaluation)
- Less control over indexing and ranking
- Newer service (beta/early adoption phase)
- Vendor lock-in

**Estimated Cost:** TBD (Cloudflare hasn't published pricing yet — needs research in Q2 2026)

---

### Option C: Orama Hybrid Search (Client + Server)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Grove Discovery (discover.grove.place)            │
├─────────────────────────────────────────────────────────────────────┤
│  SvelteKit Frontend: /search                                         │
│                              │                                       │
│  Hybrid Search:                                                      │
│    - Fast keywords → Client-side Orama (<2KB core)                   │
│    - Semantic queries → Server-side embeddings + vector search       │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                  │
│  Orama Client Index │ Workers AI Embeddings │ Vector KV Store        │
└─────────────────────────────────────────────────────────────────────┘
│
│  Background Indexing Worker:
│    - Poll RSS feeds every 15 min
│    - Build text index for client (stored in R2)
│    - Generate embeddings for semantic search (Workers AI)
│    - Store vectors in KV or Vectorize
└─────────────────────────────────────────────────────────────────────┘
```

**Pros:**

- Best of both worlds: fast keywords + deep semantic search
- Modern, future-proof technology
- Small client bundle (<2KB + index)
- Full control over indexing and ranking
- Could enable RAG features later ("summarize posts about X")

**Cons:**

- More complex implementation
- Workers AI usage costs (embedding generation)
- Need to build and maintain indexing pipeline

**Estimated Cost:** $10-30/month (Workers AI embeddings + KV/Vectorize storage)

---

## Technology Deep Dive

### For Full-Text Search (Keywords)

**Recommended: FlexSearch or Orama**

| Feature       | FlexSearch         | Orama                     |
| ------------- | ------------------ | ------------------------- |
| Bundle Size   | ~35KB              | <2KB core                 |
| Fuzzy Search  | ✅ Excellent       | ✅ Good                   |
| Ranking       | Good               | Excellent                 |
| Vector Search | ❌ No              | ✅ Yes (hybrid)           |
| Maintenance   | Active (2026)      | Very Active (2026)        |
| Grove Fit     | Great for keywords | Great for future-proofing |

**Decision Point:** Use **FlexSearch** for MVP, migrate to **Orama** when adding semantic search.

---

### For Semantic Search (Meaning)

**Recommended: Orama + Workers AI Embeddings**

**How it works:**

1. User searches: "posts about grief and healing"
2. Server generates embedding for query (Workers AI: `@cf/baai/bge-base-en-v1.5`)
3. Find similar embeddings in vector store (Vectorize or KV)
4. Return semantically related posts

**Alternative: Cloudflare AI Search**

- Fully managed, but pricing unclear
- Wait for Q2 2026 pricing announcement
- Evaluate against self-hosted Orama

---

## User Experience

### Search Interface (Grove-themed)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌲 Discover the Grove                                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  What are you looking for?                                     │  │
│  │  [Try: "posts about starting over" or "queer joy"]              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  🔍 Recent Searches                                                   │
│  - posts about grief and healing                                     │
│  - building in public                                                │
│  - cozy game recommendations                                         │
│                                                                       │
│  🏷️ Explore by Theme                                                 │
│  [Queer] [Tech] [Art] [Writing] [Mental Health] [Building]          │
└─────────────────────────────────────────────────────────────────────┘
```

**Search Results:**

- Show blog name + author (with avatar if available)
- Excerpt highlighting relevant section
- Date + tags
- "Read on [Blog Name]" link
- Respect blog accent colors in results

**Privacy:**

- Only index opted-in blogs (default: off)
- Show "public" badge on discoverable blogs
- Allow per-post opt-out (frontmatter: `discoverable: false`)

---

## Implementation Phases

### Phase 0: Planning & Research (Current - Q1 2026)

**Deliverables:**

- ✅ This document
- Research Cloudflare AI Search pricing (when available)
- Prototype Orama with small dataset
- Test embedding quality with Workers AI
- Design search UI mockups (Chameleon gathering)

**Decision Gates:**

- Is Cloudflare AI Search affordable? → Option B
- Do we need semantic search now? → Option C
- Should we start simple? → Option A

---

### Phase 1: Cross-Site Keyword Search (MVP - Q2 2026)

**Goal:** Enable basic "find posts with keyword X" across all opted-in blogs.

**Implementation: Option A (Client-Side)**

#### 1.1 Opt-In System

**Database Schema** (`packages/engine/migrations/XXX_search_opt_in.sql`):

```sql
CREATE TABLE IF NOT EXISTS search_opt_in (
  tenant_id TEXT PRIMARY KEY,
  opted_in INTEGER DEFAULT 0,
  indexed_at TEXT,
  index_url TEXT
);
```

**Admin UI** (`packages/engine/src/routes/arbor/settings/discovery`):

- Toggle: "Make my blog discoverable in Grove search"
- Explanation: "Your public posts will appear in cross-site search"
- Preview: "Your blog will appear as: [Name] ([subdomain].grove.place)"

#### 1.2 RSS Polling & Indexing

**Background Worker** (`packages/discovery/src/workers/indexer.ts`):

- Cron schedule: Every 15 minutes
- Fetch opted-in blogs from D1
- Poll RSS feeds (`/feed.xml`)
- Build FlexSearch index
- Store index in R2 (`grove-search-index/index.json`)
- Update `indexed_at` timestamp

**Index Structure:**

```json
{
  "version": "1.0",
  "updated_at": "2026-03-15T10:30:00Z",
  "posts": [
    {
      "id": "tenant_slug:post_slug",
      "title": "Starting Over",
      "description": "...",
      "content_preview": "First 500 chars...",
      "author": "Blog Name",
      "blog_url": "https://example.grove.place",
      "post_url": "https://example.grove.place/garden/starting-over",
      "date": "2026-03-10",
      "tags": ["personal", "reflection"]
    }
  ]
}
```

#### 1.3 Discovery Frontend

**New Property:** `packages/discovery/` (SvelteKit)

- Route: `discover.grove.place/search`
- On mount: Fetch index from R2
- Initialize FlexSearch client-side
- Search as user types (debounced)
- Display results with blog context

**Timeline:** 3-4 weeks

**Success Metrics:**

- Can search across all opted-in blogs
- Results appear in <500ms
- Index size stays under 2MB
- Zero per-search cost

---

### Phase 2: Semantic Search (Q3 2026)

**Goal:** Enable "find posts about X" where X is a concept/theme, not just keywords.

**Implementation: Option C (Orama + Workers AI)**

#### 2.1 Upgrade to Orama

- Replace FlexSearch with Orama client
- Add vector search capability
- Hybrid mode: keywords (fast) + semantic (smart)

#### 2.2 Embedding Generation

**Worker:** `packages/discovery/src/workers/embedder.ts`

- For each new post: generate embedding (Workers AI)
- Model: `@cf/baai/bge-base-en-v1.5` (multilingual)
- Store in Cloudflare Vectorize or KV
- Associate with post ID

#### 2.3 Query Understanding

**Server Handler:** `packages/discovery/src/routes/api/search/+server.ts`

- Detect semantic queries ("about X", "related to Y")
- Generate query embedding
- Search vector store for similar posts
- Merge with keyword results
- Rank by relevance score

**Timeline:** 4-6 weeks

**Success Metrics:**

- "Posts about grief" returns thematically related content
- "Queer joy" finds celebratory LGBTQ+ writing
- "Building in public" discovers maker stories
- Query latency <1s (including embedding generation)

---

### Phase 3: Discovery Features (Q4 2026)

**Goal:** Make search feel like _exploration_, not just retrieval.

#### 3.1 Thematic Collections

- Auto-generated collections based on clustering
- "Posts about..." pages
- Seasonal roundups ("Spring Reflections")

#### 3.2 "More Like This"

- Per-post recommendations
- Find similar writing across blogs
- "If you liked this, you might enjoy..."

#### 3.3 Trending & Popular

- Track search queries
- Surface popular topics
- Weekly digest: "What the Grove is writing about"

#### 3.4 Author Discovery

- "Find other writers who explore similar themes"
- Cross-blog conversation discovery

**Timeline:** 6-8 weeks

---

## Privacy & Consent

### Tenant Controls

**Default: Opt-Out**

- New tenants NOT discoverable by default
- Must explicitly opt in via settings
- Clear explanation of what gets indexed

**Per-Post Control:**
Frontmatter flag:

```yaml
---
title: Private Thoughts
discoverable: false
---
```

**Respect Robots.txt:**

- Check `robots.txt` before indexing
- Honor `Disallow: /garden/*` directives

### What Gets Indexed

**Public Only:**

- Only content visible without authentication
- No draft posts
- No password-protected pages

**Respects Deletion:**

- If post deleted → remove from index within 15 min
- If blog opts out → purge all content immediately

---

## Technical Considerations

### Bundle Size Budget

**Discovery Frontend:**

- FlexSearch: ~35KB
- Orama: <2KB
- Index: Target <2MB (paginated if needed)
- Total initial load: <3MB acceptable

**Strategy:** Progressive loading

- Load basic UI immediately
- Fetch index in background
- Show "Loading search index..." with progress

### Performance Targets

- **First paint:** <1s
- **Index ready:** <3s
- **Search results:** <500ms (keywords), <1s (semantic)
- **Result rendering:** <100ms

### Scaling Considerations

**Index Size:**

- Assume 100 blogs × 20 posts average = 2000 posts
- ~1KB per post metadata = ~2MB index
- At 500 blogs × 50 posts = 25,000 posts = ~25MB
  - **Solution:** Paginated index or shard by date

**Embedding Storage:**

- Vectorize: 100K vectors free, then $0.040 per 1K
- Alternative: Store in KV (cheaper but slower search)

---

## Open Questions & Decisions Needed

### 1. Should semantic search be MVP or Phase 2?

**Arguments for MVP:**

- Semantic search is the differentiator
- "Find posts about X" is the killer feature
- Workers AI makes it feasible

**Arguments for Phase 2:**

- Keyword search alone is valuable
- Test opt-in adoption first
- Reduce initial complexity

**Recommendation:** Start with keywords (Phase 1), add semantic in Phase 2. This validates the opt-in model and keeps initial build focused.

---

### 2. Client-side vs server-side search?

**Client-side (Option A):**

- Free per-search
- Privacy-friendly
- Fast response

**Server-side (Option B/C):**

- Better semantic search
- Smaller initial bundle
- Pay per query

**Recommendation:** Hybrid

- Client-side for keyword queries (<2MB index)
- Server-side for semantic queries (embeddings)
- Best of both worlds

---

### 3. Cloudflare AI Search vs self-hosted?

**Wait for pricing clarity.**

- Cloudflare AI Search is promising but unproven
- Self-hosted Orama gives full control
- Decision gate: Q2 2026 when pricing announced

**Action:** Build with Orama, keep architecture flexible to swap in Cloudflare AI Search if it's cost-effective.

---

## Success Metrics

### Adoption

- % of tenants opted in to discovery
- Target: 30% by end of Q2, 50% by end of Q3

### Usage

- Searches per day
- Click-through rate on results
- "More like this" engagement

### Quality

- Search satisfaction (feedback widget)
- Result relevance (manual spot checks)
- False positive rate

---

## Naming

**Property Name:** `discover.grove.place` or `search.grove.place`

**Feature Name:** "Grove Discovery" or "Cross-Site Search"

**In UI:**

- "Discover the Grove"
- "Explore writing across the network"
- "Find your people"

---

## Next Steps

1. **Immediate:**
   - ✅ Complete this planning document
   - Share with community for feedback
   - Create wireframes for search UI

2. **Q1 2026:**
   - Monitor Cloudflare AI Search pricing announcements
   - Prototype Orama + Workers AI embeddings
   - Design opt-in UI in Arbor settings

3. **Q2 2026:**
   - Build Phase 1 (keyword search)
   - Soft launch with beta tenants
   - Gather feedback

4. **Q3 2026:**
   - Add Phase 2 (semantic search)
   - Public launch

---

## Related Reading

- [Orama Documentation](https://docs.oramasearch.com/)
- [Cloudflare AI Search Docs](https://developers.cloudflare.com/ai-search/)
- [Workers AI Embeddings](https://developers.cloudflare.com/workers-ai/models/text-embeddings/)
- [Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- FlexSearch vs Orama comparison (research notes)

---

_This is a living document. Update as we learn more about technology tradeoffs, user needs, and infrastructure costs._

_Last updated: 2026-02-11 by Claude (tag search investigation)_
