# Pulse Dashboard — Architecture Plan

## Vision

Pulse is a live development heartbeat page at `grove.place/pulse` — a real-time window into how Grove is being built. Fed by GitHub webhooks, it shows the rhythm of development: commits flowing in, PRs merging, issues moving, releases shipping. Where `/journey` tells the story of _what_ was built, `/pulse` shows the story of _how it's being built, right now_.

Transparency as trust. A living heartbeat that says "we're here, we're building, come watch."

---

## Architecture Overview

```
GitHub (org-level webhook)
    │
    ▼ POST (X-Hub-Signature-256)
┌─────────────────────────────┐
│  grove-pulse (Worker)       │  ← New dedicated Cloudflare Worker
│  • Verify HMAC signature    │
│  • Normalize event payload  │
│  • Write to D1 (events)     │
│  • Update KV hot cache      │
│  • Cron: hourly/daily stats │
└─────────────────────────────┘
    │           │
    ▼           ▼
  ┌───┐     ┌────┐
  │D1 │     │ KV │  (shared grove-engine-db + CACHE_KV)
  └───┘     └────┘
    │           │
    ▼           ▼
┌─────────────────────────────┐
│  grove-landing (Pages)      │
│  /pulse route               │
│  • +page.server.ts → D1/KV  │
│  • +page.svelte → Dashboard │
└─────────────────────────────┘
```

---

## Component 1: Webhook Receiver Worker

**Location:** `workers/pulse/`

A dedicated Cloudflare Worker that receives GitHub webhook POST requests, validates them, normalizes payloads, stores events in D1, and updates KV hot caches.

### Why a Dedicated Worker (Not an API Route in Landing)

- **Isolation**: Webhook processing shouldn't be coupled to the marketing site
- **Cron support**: Workers support `[triggers]` cron for scheduled aggregation — Pages cannot
- **Performance**: Direct worker execution, no SvelteKit routing overhead
- **Follows existing pattern**: `workers/email-catchup/`, `packages/workers/timeline-sync/`, `packages/workers/webhook-cleanup/` all use this pattern

### Webhook Events to Handle

| Event          | Action                         | What We Store                                             |
| -------------- | ------------------------------ | --------------------------------------------------------- |
| `push`         | —                              | Commit count, authors, messages, files changed, lines +/- |
| `pull_request` | opened/closed/merged/reopened  | Title, state, draft status, labels, merge time            |
| `issues`       | opened/closed/reopened/labeled | Title, state, labels                                      |
| `release`      | published                      | Tag name, title, prerelease flag                          |
| `create`       | —                              | Branch/tag creation (ref_type)                            |
| `delete`       | —                              | Branch/tag deletion (ref_type)                            |
| `workflow_run` | completed                      | Conclusion (success/failure), workflow name               |
| `star`         | created/deleted                | Cumulative count                                          |
| `fork`         | —                              | Cumulative count                                          |

### Security

- **Signature verification**: HMAC-SHA256 via `X-Hub-Signature-256` header with shared `WEBHOOK_SECRET`
- **Idempotency**: Store `X-GitHub-Delivery` header as delivery_id, skip duplicates
- **Payload sanitization**: Strip unnecessary nested data (only store what we display)
- **No PII concerns**: GitHub webhook payloads are public repo data (usernames, commit messages, etc.) — not sensitive

### Worker Implementation Structure

```
workers/pulse/
├── src/
│   ├── index.ts           # Worker entry: fetch() + scheduled()
│   ├── verify.ts          # HMAC-SHA256 signature verification
│   ├── handlers/
│   │   ├── push.ts        # Push event handler
│   │   ├── pull-request.ts
│   │   ├── issues.ts
│   │   ├── release.ts
│   │   ├── workflow.ts
│   │   └── community.ts   # Stars, forks
│   ├── store.ts           # D1 writes + KV cache updates
│   └── aggregate.ts       # Cron aggregation logic
├── wrangler.toml
├── package.json
└── tsconfig.json
```

### Wrangler Config

```toml
name = "grove-pulse"
main = "src/index.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

[triggers]
crons = [
  "0 * * * *",    # Hourly: update hourly_activity rollups
  "5 0 * * *",    # Daily at 00:05 UTC: finalize daily_stats
]

[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[[kv_namespaces]]
binding = "KV"
id = "514e91e81cc44d128a82ec6f668303e4"  # Shared CACHE_KV

[vars]
# WEBHOOK_SECRET configured as secret in Cloudflare Dashboard
```

---

## Component 2: D1 Schema

**Migration location:** `packages/landing/migrations/0007_pulse.sql`

Using the landing package's migration chain since /pulse lives in landing, and we want the tables queryable from both the worker and the landing app (shared D1 database).

### Table: `pulse_events` — Normalized webhook events

```sql
CREATE TABLE pulse_events (
    id TEXT PRIMARY KEY,
    delivery_id TEXT UNIQUE,          -- GitHub X-GitHub-Delivery (idempotency)
    event_type TEXT NOT NULL,         -- push, pull_request, issues, release, etc.
    action TEXT,                      -- opened, closed, merged, created, etc.
    repo_name TEXT NOT NULL,          -- Short name (e.g., "GroveEngine")
    repo_full_name TEXT NOT NULL,     -- Full name (e.g., "AutumnsGrove/GroveEngine")
    actor TEXT NOT NULL,              -- GitHub username
    title TEXT,                       -- Commit message / PR title / issue title
    ref TEXT,                         -- Branch name or tag
    data TEXT,                        -- JSON: event-specific details
    occurred_at INTEGER NOT NULL,     -- Event timestamp (unix seconds)
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX idx_pulse_events_type ON pulse_events(event_type);
CREATE INDEX idx_pulse_events_repo ON pulse_events(repo_name);
CREATE INDEX idx_pulse_events_occurred ON pulse_events(occurred_at);
CREATE INDEX idx_pulse_events_actor ON pulse_events(actor);
```

**`data` column (JSON) varies by event type:**

- **push**: `{ commits: number, additions: number, deletions: number, files_changed: number, head_sha: string }`
- **pull_request**: `{ number: number, state: string, draft: boolean, labels: string[], merged: boolean, merge_time_hours: number | null }`
- **issues**: `{ number: number, state: string, labels: string[] }`
- **release**: `{ tag: string, prerelease: boolean }`
- **workflow_run**: `{ name: string, conclusion: string, branch: string }`
- **star/fork**: `{ total_count: number }`

### Table: `pulse_daily_stats` — Aggregated daily metrics

```sql
CREATE TABLE pulse_daily_stats (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,                -- YYYY-MM-DD
    repo_name TEXT,                    -- NULL = all repos combined
    commits INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_removed INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    prs_opened INTEGER DEFAULT 0,
    prs_merged INTEGER DEFAULT 0,
    prs_closed INTEGER DEFAULT 0,
    issues_opened INTEGER DEFAULT 0,
    issues_closed INTEGER DEFAULT 0,
    releases INTEGER DEFAULT 0,
    ci_passes INTEGER DEFAULT 0,
    ci_failures INTEGER DEFAULT 0,
    stars_total INTEGER,               -- Snapshot of total stars
    forks_total INTEGER,               -- Snapshot of total forks
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(date, repo_name)
);

CREATE INDEX idx_pulse_daily_date ON pulse_daily_stats(date);
```

### Table: `pulse_hourly_activity` — Heatmap data

```sql
CREATE TABLE pulse_hourly_activity (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,                -- YYYY-MM-DD
    hour INTEGER NOT NULL,            -- 0-23 (UTC)
    commits INTEGER DEFAULT 0,
    events INTEGER DEFAULT 0,         -- Total events of any type
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(date, hour)
);

CREATE INDEX idx_pulse_hourly_date ON pulse_hourly_activity(date);
```

### Retention

- `pulse_events`: 90 days (add to webhook-cleanup worker's cron job)
- `pulse_daily_stats`: Indefinite (small rows, historical value)
- `pulse_hourly_activity`: 90 days (add to cleanup)

---

## Component 3: KV Hot Cache

Keys in the shared `CACHE_KV` namespace, prefixed with `pulse:` to avoid collisions.

| Key                   | Value                                                                | TTL   | Updated On              |
| --------------------- | -------------------------------------------------------------------- | ----- | ----------------------- |
| `pulse:latest:commit` | `{ repo, message, author, sha, time }`                               | 24h   | Every push event        |
| `pulse:latest:pr`     | `{ repo, title, number, action, author, time }`                      | 24h   | Every PR event          |
| `pulse:latest:event`  | `{ type, repo, title, time }`                                        | 24h   | Every event             |
| `pulse:today`         | `{ commits, prs_merged, issues_closed, lines_added, lines_removed }` | 2h    | Every event (increment) |
| `pulse:active`        | `{ active: true, last_commit: timestamp, author }`                   | 30min | Every push event        |
| `pulse:streak`        | `{ days: number, since: date }`                                      | 24h   | Daily cron              |
| `pulse:week`          | `{ commits, prs_merged, issues_closed }`                             | 6h    | Hourly cron             |

### Why KV + D1 (Not Just D1)

- KV reads are ~1ms from the edge. D1 queries are 100-300ms.
- The /pulse page will likely get more traffic than /journey — it's the "live" page.
- KV serves the "current state" fast; D1 serves historical queries for charts.
- The "currently active" indicator needs sub-second response.

---

## Component 4: Frontend — `/pulse` Route

**Location:** `packages/landing/src/routes/pulse/`

### Data Loading (`+page.server.ts`)

```typescript
// Parallel queries: KV for hot data, D1 for historical
const [kvData, dailyStats, recentEvents, hourlyActivity] = await Promise.all([
  loadKVCache(platform.env.CACHE_KV), // pulse:today, pulse:active, pulse:streak
  loadDailyStats(platform.env.DB, 30), // Last 30 days
  loadRecentEvents(platform.env.DB, 50), // Last 50 events
  loadHourlyActivity(platform.env.DB, 7), // Last 7 days of hourly data
]);
```

### Page Sections (Top to Bottom)

#### 1. Hero — "The Heartbeat of Grove"

- Large pulsing dot animation when `pulse:active` is true
- "Currently building..." with last commit message when active
- "Last seen building X hours ago" when inactive
- Current streak badge

#### 2. Today's Pulse — Stats Cards

- 4 glassmorphism cards in a responsive grid:
  - **Commits today** (with sparkline of hourly distribution)
  - **PRs merged** (with total open count)
  - **Issues closed** (with net change: opened vs closed)
  - **Lines changed** (+additions / -deletions)

#### 3. Activity Heatmap — "When We Build"

- 7-day x 24-hour grid (GitHub contribution chart style)
- Color intensity based on commit count per hour
- Uses the existing `ActivityOverview` chart component from engine as reference
- Timezone-aware (display in visitor's local time)

#### 4. Live Feed — "What's Happening"

- Chronological event feed (most recent first)
- Each event type has its own icon and color:
  - Push (commits) — green
  - PR merged — purple
  - PR opened — blue
  - Issue opened — amber
  - Issue closed — gray
  - CI failed — red
  - Release — gold
- Filterable by event type (toggle chips)
- "Load more" pagination (50 at a time)
- Relative timestamps ("2 hours ago", "yesterday")

#### 5. Trends — "The Bigger Picture"

- 30-day rolling charts:
  - Commit velocity (daily commits line chart)
  - Code churn (additions vs deletions stacked area)
  - Issue health (opened vs closed, burn-down style)
- Weekly comparison: "This week vs last week" delta badges

#### 6. Build Health — "CI & Releases"

- Latest CI status badge (green/red/yellow)
- CI pass rate (last 30 days)
- Recent releases timeline
- Link to latest release notes

### UI Design

- **Glassmorphism** cards with nature-themed accents (following Grove design system)
- **Seasonal awareness** via `seasonStore` — heatmap colors shift with season
- **Dark mode support** — "nature at night" warmth maintained
- **Responsive**: Mobile-first, 1-column on mobile -> 2-column -> 4-column grid
- **Reduced motion**: All animations respect `prefers-reduced-motion`
- **Accessibility**: WCAG AA, proper ARIA labels on charts, screen-reader-friendly event feed

### Engine Components to Build

These go in the engine (engine-first pattern), importable by any app:

| Component        | Path                              | Purpose                         |
| ---------------- | --------------------------------- | ------------------------------- |
| `PulseHeatmap`   | `ui/charts/PulseHeatmap.svelte`   | 7x24 activity heatmap           |
| `PulseEventFeed` | `ui/charts/PulseEventFeed.svelte` | Chronological event list        |
| `PulseStat`      | `ui/charts/PulseStat.svelte`      | Single stat card with sparkline |
| `PulseIndicator` | `ui/charts/PulseIndicator.svelte` | Pulsing "active" dot            |
| `TrendChart`     | `ui/charts/TrendChart.svelte`     | Line/area chart for trends      |

Reuse existing: `Sparkline`, `GlassCard`, `GlassButton` from engine.

---

## Component 5: GitHub Setup

### Organization-Level Webhook (Recommended)

Instead of per-repo webhooks, configure a single org-level webhook on `AutumnsGrove`:

- **URL**: `https://grove-pulse.<account>.workers.dev/webhook` (or custom domain later)
- **Content type**: `application/json`
- **Secret**: Shared HMAC secret (stored as `WEBHOOK_SECRET` in worker)
- **Events**: Push, Pull requests, Issues, Releases, Create, Delete, Workflow runs, Stars, Forks
- **Active**: Yes

### Repo Filtering

The worker can filter by repository if needed (only process events from configured repos), but initially accept all events from the org — more data is better for the dashboard.

---

## Implementation Phases

### Phase 1: Plumbing (This PR)

1. Create `workers/pulse/` worker with webhook receiver
2. Write D1 migration (`0007_pulse.sql`) with all three tables
3. Implement signature verification + event normalization
4. Handle `push` and `pull_request` events (most common)
5. KV hot cache updates for latest commit + today's stats
6. Create basic `/pulse` route in landing with server-side data loading
7. Build initial page: hero + today's stats + recent events feed

### Phase 2: Heatmap & Trends

1. Implement cron aggregation (hourly + daily rollups)
2. Handle remaining events (issues, releases, workflow_run, stars, forks)
3. Build `PulseHeatmap` component
4. Build `TrendChart` component
5. Add heatmap section and trends section to page
6. Add event type filtering to the feed

### Phase 3: Polish & Live Feel

1. "Currently active" pulsing indicator with 30-min window
2. Streak tracking (consecutive days with commits)
3. CI health section
4. Glassmorphism polish, seasonal color shifts
5. SEO + OG image for /pulse
6. Add cleanup rules to webhook-cleanup worker (90-day retention)
7. Nature elements: subtle forest backdrop matching /journey's vibe

### Phase 4: Future (Not This PR)

- Auto-generated daily standup summaries (using existing AI stack)
- Contributor ecosystem view (when community grows)
- Integration with Mycelium MCP / Forage
- WebSocket or SSE for true real-time updates
- "First commit of the day" badge
- PR review time analytics

---

## Files to Create / Modify

### New Files

| File                                                                 | Purpose                          |
| -------------------------------------------------------------------- | -------------------------------- |
| `workers/pulse/src/index.ts`                                         | Worker entry (fetch + scheduled) |
| `workers/pulse/src/verify.ts`                                        | HMAC-SHA256 verification         |
| `workers/pulse/src/handlers/push.ts`                                 | Push event handler               |
| `workers/pulse/src/handlers/pull-request.ts`                         | PR event handler                 |
| `workers/pulse/src/handlers/issues.ts`                               | Issues event handler             |
| `workers/pulse/src/handlers/release.ts`                              | Release event handler            |
| `workers/pulse/src/handlers/workflow.ts`                             | CI workflow handler              |
| `workers/pulse/src/handlers/community.ts`                            | Stars/forks handler              |
| `workers/pulse/src/store.ts`                                         | D1 writes + KV updates           |
| `workers/pulse/src/aggregate.ts`                                     | Cron aggregation                 |
| `workers/pulse/wrangler.toml`                                        | Worker config                    |
| `workers/pulse/package.json`                                         | Package config                   |
| `workers/pulse/tsconfig.json`                                        | TypeScript config                |
| `packages/landing/migrations/0007_pulse.sql`                         | D1 migration                     |
| `packages/landing/src/routes/pulse/+page.server.ts`                  | Server data loader               |
| `packages/landing/src/routes/pulse/+page.svelte`                     | Dashboard UI                     |
| `packages/engine/src/lib/ui/components/charts/PulseHeatmap.svelte`   | Heatmap component                |
| `packages/engine/src/lib/ui/components/charts/PulseEventFeed.svelte` | Event feed component             |
| `packages/engine/src/lib/ui/components/charts/PulseStat.svelte`      | Stat card component              |
| `packages/engine/src/lib/ui/components/charts/PulseIndicator.svelte` | Active indicator                 |
| `packages/engine/src/lib/ui/components/charts/TrendChart.svelte`     | Trend line/area chart            |

### Modified Files

| File                                                    | Change                           |
| ------------------------------------------------------- | -------------------------------- |
| `packages/engine/src/lib/ui/components/charts/index.ts` | Export new chart components      |
| `packages/engine/package.json`                          | Ensure charts export path exists |
| `packages/landing/src/app.d.ts`                         | Add Env types if needed          |
| `pnpm-workspace.yaml`                                   | Add `workers/pulse` to workspace |

---

## Key Design Decisions

### Why Dedicated Worker (Not Landing API Route)

- Cron triggers for aggregation (Pages can't do cron)
- Isolation from marketing site
- Follows established pattern (timeline-sync, webhook-cleanup, email-catchup)
- Can scale independently

### Why Shared D1 + KV (Not New Database)

- Landing already queries grove-engine-db
- All pulse data renders in landing — no cross-service queries needed
- KV namespace already shared across services
- One database = one migration chain = simpler ops

### Why Store Raw Events + Aggregate (Not Just Aggregate)

- Raw events power the chronological feed
- Enables future filtering/search without re-processing
- Historical raw data enables new aggregation dimensions later
- 90-day retention keeps storage bounded

### Why KV Hot Cache Exists

- Sub-millisecond reads for "currently active" check
- Today's stats update on every event (cheap KV write vs D1 query)
- /pulse page loads should feel instant
- Edge-cached = fast globally

---

## Strategic Value

This isn't just a dashboard — it's a statement:

- **Transparency as trust**: 30-50 commits/day is extraordinary velocity. Show it.
- **Build-in-public proof**: Not "we're working on it" — here's the live data.
- **Waitlist conversion**: 70+ people watching. Give them something alive to look at.
- **Your narrative**: Post-job-quit, building something meaningful. Pulse _is_ the heartbeat of that story.
- **Community template**: When contributors join, Pulse already shows their work too.

The /journey page tells where you've been. The /pulse page shows where you are _right now_.
