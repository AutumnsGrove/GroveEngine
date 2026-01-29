# Meadow v1 Implementation Plan

## Overview

This plan implements Meadow v1: Grove's social feed layer connecting blogs across the network with chronological feeds, private voting, and Heartwood OAuth authentication.

**Key Decisions:**
- Core features first, PWA later (issue #729)
- Heartwood OAuth for authentication
- RSS polling for post aggregation
- 10 default reaction emojis (no angry ones)
- Basic moderation tools initially

**Related Issues:**
- #730: Meadow v1 launch (parent)
- #731: RSS polling system
- #729: PWA implementation (deferred)
- #531, #532, #577 (covered or deferred)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Meadow (meadow.grove.place)                      │
├─────────────────────────────────────────────────────────────────────┤
│  SvelteKit Frontend: /feed, /post/:id, /profile, /admin              │
│                              │                                       │
│  Cloudflare Worker: RSS Poller (Cron), Feed API, Vote Handlers       │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                  │
│  D1 Database │ KV Cache │ Heartwood OAuth                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Foundation (Week 1)

### 1.1 D1 Schema (`packages/engine/migrations/036_meadow_social.sql`)

**Tables:**
- `meadow_posts` - Denormalized posts from opted-in blogs
- `meadow_votes` - Private votes (scores not public)
- `meadow_reactions` - Emoji reactions (counts visible to author only)
- `meadow_bookmarks` - User saved posts
- `meadow_follows` - Blog subscriptions
- `meadow_reactions_agg` - Cached reaction counts
- `meadow_poll_state` - Polling tracking

### 1.2 D1 Configuration

Update `packages/meadow/wrangler.toml` with:
- D1 database binding
- KV namespace for caching
- Heartwood OAuth environment variables
- Cron trigger for RSS polling every 15 minutes

### 1.3 Database Service Layer

Create `packages/meadow/src/lib/server/db.ts` with methods for:
- `getFeed()`, `getPost()`, `getPostStats()`
- `castVote()`, `removeVote()`, `getUserVote()`
- `addReaction()`, `removeReaction()`, `getPostReactions()`
- `bookmarkPost()`, `getUserBookmarks()`
- `followBlog()`, `getUserFollows()`

---

## Phase 2: RSS Polling Infrastructure (Week 2)

### 2.1 RSS Feed Discovery

**Pattern:** `https://{subdomain}.grove.place/feed.xml`

Check fallback patterns: `/rss.xml`, `/feed`, `/rss`

### 2.2 RSS Parser (`packages/meadow/src/lib/rss/parser.ts`)

Using `fast-xml-parser` (~30KB) for RSS 2.0 and Atom support.

### 2.3 Polling Worker (`packages/meadow/src/routes/api/cron/poll/+worker.ts`)

- Scheduled every 15 minutes via Cloudflare Cron
- Get opted-in blogs from database
- Fetch and parse RSS feeds
- Deduplicate posts by GUID
- Insert new posts with denormalized data
- Update poll state tracking

### 2.4 Post Ingestion (`packages/meadow/src/lib/rss/ingest.ts`)

- Filter new posts vs existing
- Insert with denormalized content
- Handle errors gracefully per blog

---

## Phase 3: Feed API & UI (Week 3)

### 3.1 Feed API Endpoints

**GET `/api/feed`**
- Query params: `filter` (all/popular/hot/top), `period`, `page`, `limit`
- Supports following filter (user's followed blogs)

**GET `/api/post/:id`**

**POST `/api/vote`** - Private voting
- Returns only whether user voted (not scores)
- Scores visible only to post author

**POST `/api/reaction`** - Emoji reactions

**GET `/api/bookmarks`**, **POST `/api/bookmark`**

### 3.2 Feed UI (`/feed`)

- Filter tabs (All, Popular, Hot, Top, Following)
- Infinite scroll pagination
- Glassmorphism post cards
- Offline indicator

### 3.3 Post Card Component

- Author attribution with blog link
- Title and excerpt
- Vote buttons (▲ ▼)
- Reaction picker
- Bookmark button
- Private stats for authors only

---

## Phase 4: Authentication (Week 3-4)

### 4.1 OAuth Handlers

**`/auth/login/start`** - Redirect to Heartwood
**`/auth/callback`** - Handle OAuth response

Using `createLoginHandler` and `createCallbackHandler` from `@autumnsgrove/groveengine/grafts/login/server`

### 4.2 Session Management (`hooks.server.ts`)

- Extract user from Heartwood session cookies
- Verify token via `/userinfo` endpoint
- Populate `locals.user`

### 4.3 Auth UI

- `LoginGraft` component for sign-in
- Profile display in header
- Protected route handling

---

## Phase 5: Testing & Polish (Week 5)

- Unit tests: RSS parsing, date formatting, vote logic
- Integration tests: API endpoints, database queries
- E2E tests: Full user flows
- Monitoring: Polling errors, vote rates, feed load times

---

## Default Reaction Emojis (10 total, no angry ones)

```
❤️  heart               💛  yellow_heart
😂  laugh_tears         💚  green_heart
😮  surprised           💙  blue_heart
😢  sad                 💜  purple_heart
✨  sparkle             🌱  seedling
```

**Future:** Replace with EmojiKitchen combos (e.g., 😂❤️ = 😂❤️, 🤔🔥 = 🤔🔥)

---

## Basic Moderation Tools

**For Post Authors:**
- Delete own post from feed
- Disable reactions on own posts

**For Meadow Moderators:**
- Hide/unhide posts from feed
- Reset vote counts (for brigading)
- Ban/unban blogs from feed
- View report queue

**For Users (all logged in):**
- Report post (spam, harassment, misinformation, other)
- Auto-hide after 3 reports

---

## Deliverables Summary

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| 1: Foundation | Week 1 | D1 schema, migrations, service layer |
| 2: RSS Polling | Week 2 | Feed discovery, parser, polling worker |
| 3: Feed API/UI | Week 3 | Feed endpoints, PostCard, infinite scroll |
| 4: Auth | Week 3-4 | Heartwood OAuth, session management |
| 5: Testing | Week 5 | Unit/integration tests, monitoring |

---

## RSS Polling Configuration

- **Frequency:** Every 15 minutes
- **Timeout:** 30 seconds per feed
- **Retry:** Exponential backoff on errors
- **Rate limiting:** Respectful polling across all blogs

---

## Next Steps

1. Review and approve this plan
2. Create D1 migration file
3. Set up wrangler.toml with bindings
4. Implement RSS polling infrastructure
5. Build feed API endpoints
6. Create UI components
7. Integrate Heartwood OAuth
8. Write tests and deploy

---

*Last Updated: January 2026*