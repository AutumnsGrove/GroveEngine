---
title: Clearing — Status Page
description: Public-facing status page for platform health and incident communication
category: specs
specCategory: platform-services
icon: activity
lastUpdated: "2026-04-06"
aliases: []
tags:
  - status-page
  - infrastructure
  - user-communication
---

# Clearing — Status Page

```
                    .  ·  .    ☀️    .  ·  .
                 ·                           ·
               🌲         ┌─────────┐         🌲
                          │    ○    │
              🌲          │  clear  │          🌲
                          │  skies  │
               🌲         └─────────┘         🌲
                 ·                           ·
                    ·  .  ·       ·  .  ·
                ────────────────────────────
               ~~~~~~~~~ open ground ~~~~~~~~~
                   Where you can see clearly.
```

> _A clearing in the forest where you can see what's happening._

Grove's public status page providing transparent, real-time communication about platform health. When something goes wrong or maintenance is planned, users can check the clearing to understand what's happening without contacting support.

**Public Name:** Clearing
**Internal Name:** GroveClear
**Domain:** `status.grove.place`

A clearing is an open space in the forest where the trees part and visibility opens up. You can see what's around you, assess the situation, and understand what's happening.

Clearing is Grove's public status page: transparent, real-time communication about platform health. When something goes wrong or maintenance is planned, users can check the clearing to understand what's happening without needing to contact support.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components & Services](#components--services)
4. [Incident Types](#incident-types)
5. [Database Schema](#database-schema)
6. [Admin Interface](#admin-interface)
7. [Public Interface](#public-interface)
8. [User Notifications](#user-notifications)
9. [API Specification](#api-specification)
10. [Design & UX](#design--ux)

---

## Overview

### Purpose

The Grove Status page provides transparent, real-time communication about platform health. When something goes wrong, or when maintenance is planned, users can check status.grove.place to understand what's happening without needing to contact support.

### Goals

- **Transparency**: Honest, timely updates about platform issues
- **Reduce support load**: Users can self-serve status information
- **Build trust**: Proactive communication during incidents
- **Simple administration**: Easy for Autumn to post updates from the admin panel

### Non-Goals

- Public incident reporting/submission
- Complex SLA tracking or uptime percentages

### Inspiration

Modeled after Anthropic's Claude status page—clean, informative, focused on what matters.

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        status.grove.place                           │
│                     (Cloudflare Worker + Pages)                     │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                      Public Status Page                         ││
│  │                                                                 ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              ││
│  │  │  Current    │  │  Component  │  │   Incident  │              ││
│  │  │  Status     │  │  Status     │  │   History   │              ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘              ││
│  │                                                                 ││
│  │  ┌─────────────────────────────────────────────────────────────┐││
│  │  │                    RSS Feed (/feed)                         │││
│  │  └─────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ reads from
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           D1 Database                               │
│                        (shared with Grove)                          │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │ components  │  │  incidents  │  │  updates    │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                                  ▲
                                  │ writes to
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│             Arbor Admin Panel (apps/landing)                        │
│             /arbor/status/ — Autumn's admin interface               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                  Status Management Section                      ││
│  │                                                                 ││
│  │  - Create/update incidents                                      ││
│  │  - Post incident updates                                        ││
│  │  - Set component status                                         ││
│  │  - Resolve incidents                                            ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                  Automated Monitoring                           ││
│  │                                                                 ││
│  │  - 5-minute cron health checks (worker-entry.ts scheduled)      ││
│  │  - Daily history aggregation (midnight UTC)                     ││
│  │  - Incident auto-creation on health check failures              ││
│  │  - Sentinel API (/api/sentinel) — stress-test result ingestion  ││
│  │  - Email alerts via Zephyr                                      ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

- **Frontend**: SvelteKit (static site generation for fast loading)
- **Backend**: Cloudflare Worker (API endpoints)
- **Database**: D1 (shared with main Grove database)
- **Hosting**: Cloudflare Pages
- **Styling**: Tailwind CSS (consistent with Grove aesthetic)

---

## Components & Services

Grove's platform is divided into trackable components. Each component has its own status indicator.

### Component List

| Component          | Description                                          | Affects                      |
| ------------------ | ---------------------------------------------------- | ---------------------------- |
| **Blog Engine**    | Core blog functionality—publishing, reading, editing | All blog operations          |
| **CDN**            | Image and media delivery via R2/Cloudflare           | Media loading, image uploads |
| **Authentication** | Heartwood login and session management               | Sign-in, admin access        |
| **Payments**       | BillingHub — centralized payment processing via Stripe | Plan upgrades, billing     |
| **API**            | Backend API endpoints                                | All platform operations      |

> **Note:** The Meadow component (`comp_meadow`) was seeded in migration 0001 but removed in migration 0008. Meadow is a not-yet-live feature (Phase 5: Grove Social) and does not appear on the active component list.

### Component Statuses

| Status                   | Color  | Meaning                           |
| ------------------------ | ------ | --------------------------------- |
| **Operational**          | Green  | Everything working normally       |
| **Degraded Performance** | Yellow | Slower than usual, but functional |
| **Partial Outage**       | Orange | Some functionality unavailable    |
| **Major Outage**         | Red    | Component is down                 |
| **Maintenance**          | Blue   | Planned maintenance in progress   |

---

## Incident Types

### Incident Classifications

| Type                     | Description                | Example                                    |
| ------------------------ | -------------------------- | ------------------------------------------ |
| **Outage**               | Service unavailable        | "Blog engine returning 500 errors"         |
| **Degraded Performance** | Service slow or unreliable | "Image uploads taking longer than usual"   |
| **Planned Maintenance**  | Scheduled work             | "Database migration scheduled for 2am UTC" |
| **Security Incident**    | Security-related issue     | "Investigating unusual activity"           |

### Incident Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Investigating│────▶│  Identified  │────▶│  Monitoring  │────▶│   Resolved   │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                     │
       ▼                    ▼                    ▼                     ▼
  "We're aware       "Root cause         "Fix deployed,          "Incident
   and looking        identified,          watching for           resolved"
   into it"           working on fix"      stability"
```

### Incident States

| State             | Description                           |
| ----------------- | ------------------------------------- |
| **Investigating** | Aware of issue, determining cause     |
| **Identified**    | Root cause found, working on fix      |
| **Monitoring**    | Fix deployed, observing for stability |
| **Resolved**      | Issue fully resolved                  |

---

## Database Schema

### Tables

```sql
-- Trackable platform components
CREATE TABLE status_components (
    id TEXT PRIMARY KEY,                    -- UUID
    name TEXT NOT NULL,                     -- "Blog Engine", "CDN", etc.
    slug TEXT UNIQUE NOT NULL,              -- "blog-engine", "cdn"
    description TEXT,                       -- What this component does
    display_order INTEGER DEFAULT 0,        -- Sort order on status page
    current_status TEXT DEFAULT 'operational',  -- operational, degraded, partial_outage, major_outage, maintenance
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Incidents (outages, maintenance, etc.)
CREATE TABLE status_incidents (
    id TEXT PRIMARY KEY,                    -- UUID
    title TEXT NOT NULL,                    -- "CDN Degraded Performance"
    slug TEXT UNIQUE NOT NULL,              -- URL-friendly identifier
    status TEXT NOT NULL,                   -- investigating, identified, monitoring, resolved
    impact TEXT NOT NULL,                   -- none, minor, major, critical
    type TEXT NOT NULL,                     -- outage, degraded, maintenance, security
    started_at TEXT NOT NULL,               -- When incident began
    resolved_at TEXT,                       -- When incident was resolved (null if ongoing)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Updates posted to incidents (timeline)
CREATE TABLE status_updates (
    id TEXT PRIMARY KEY,                    -- UUID
    incident_id TEXT NOT NULL,              -- Foreign key to incidents
    status TEXT NOT NULL,                   -- Status at time of update
    message TEXT NOT NULL,                  -- Update content (markdown supported)
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incident_id) REFERENCES status_incidents(id)
);

-- Which components are affected by which incidents
CREATE TABLE status_incident_components (
    incident_id TEXT NOT NULL,
    component_id TEXT NOT NULL,
    PRIMARY KEY (incident_id, component_id),
    FOREIGN KEY (incident_id) REFERENCES status_incidents(id),
    FOREIGN KEY (component_id) REFERENCES status_components(id)
);

-- Scheduled maintenance announcements
CREATE TABLE status_scheduled (
    id TEXT PRIMARY KEY,                    -- UUID
    title TEXT NOT NULL,                    -- "Database Migration"
    description TEXT,                       -- Details about the maintenance
    scheduled_start TEXT NOT NULL,          -- When maintenance begins
    scheduled_end TEXT NOT NULL,            -- Expected end time
    components TEXT NOT NULL,               -- JSON array of component IDs
    status TEXT DEFAULT 'scheduled',        -- scheduled, in_progress, completed
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

```sql
CREATE INDEX idx_incidents_started ON status_incidents(started_at DESC);
CREATE INDEX idx_incidents_status ON status_incidents(status);
CREATE INDEX idx_updates_incident ON status_updates(incident_id);
CREATE INDEX idx_updates_created ON status_updates(created_at DESC);
CREATE INDEX idx_scheduled_start ON status_scheduled(scheduled_start);
```

### Initial Component Data

```sql
INSERT INTO status_components (id, name, slug, description, display_order) VALUES
('comp_blog', 'Blog Engine', 'blog-engine', 'Core blogging functionality', 1),
('comp_cdn', 'CDN', 'cdn', 'Image and media delivery', 2),
('comp_auth', 'Authentication', 'authentication', 'Login and session management', 3),
('comp_payments', 'Payments', 'payments', 'BillingHub — centralized payment processing via Stripe', 4),
('comp_api', 'API', 'api', 'Backend API endpoints', 5);
```

> **Note:** `comp_meadow` was in the original seed data but removed via migration 0008. It is not present in the live database.

---

## Admin Interface

### Location

Status management is **live** at `/arbor/status/` in the landing app (`apps/landing`). It is accessible via the Arbor admin sidebar under **Service Status**. The earlier plan to implement this in GroveAuth has been superseded — the landing app's Arbor panel is the canonical admin interface.

### Admin Sections

#### Dashboard View

Shows at a glance:

- Current overall status
- Any active incidents
- Upcoming scheduled maintenance
- Quick actions: "Report Incident", "Schedule Maintenance"

#### Incident Management

**Create Incident:**

1. Title (required)
2. Type: Outage / Degraded / Maintenance / Security
3. Impact: Minor / Major / Critical
4. Affected components (multi-select)
5. Initial status: Investigating / Identified
6. Initial update message (what you know so far)

**Update Incident:**

- Post new updates to the timeline
- Change status (Investigating → Identified → Monitoring → Resolved)
- Mark as resolved (sets resolved_at timestamp)

**View History:**

- List of past incidents
- Filter by type, date range, component
- Click to view full timeline

#### Component Status

- Override component status manually
- Useful for quick "all clear" after incidents
- Auto-updates when incidents are created/resolved

#### Scheduled Maintenance

- Schedule future maintenance windows
- Set affected components
- Auto-displays on status page when scheduled time approaches
- Can convert to active incident when maintenance begins

### Admin UI Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ Status Management                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Overall Status: [🟢 All Systems Operational]                       │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Active Incidents (0)                                           │ │
│  │                                                                │ │
│  │ No active incidents. All systems operational.                  │ │
│  │                                                                │ │
│  │ [+ Report New Incident]                                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Scheduled Maintenance                                          │ │
│  │                                                                │ │
│  │ No upcoming maintenance scheduled.                             │ │
│  │                                                                │ │
│  │ [+ Schedule Maintenance]                                       │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Component Status                                               │ │
│  │                                                                │ │
│  │ Blog Engine      [🟢 Operational  ▼]                           │ │
│  │ CDN              [🟢 Operational  ▼]                           │ │
│  │ Authentication   [🟢 Operational  ▼]                           │ │
│  │ Payments         [🟢 Operational  ▼]                           │ │
│  │ API              [🟢 Operational  ▼]                           │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Public Interface

### Page Structure

**Header:**

- Grove Status logo
- Current overall status indicator
- Last updated timestamp

**Current Status Section:**

- Large status banner (All Operational / Active Incident)
- Component status grid

**Active Incidents:**

- Displayed prominently if any
- Shows latest update, timeline accessible

**Scheduled Maintenance:**

- Upcoming maintenance windows
- When scheduled, how long expected

**Incident History:**

- 30-day rolling history
- Expandable incident details
- Full timeline for each incident

**Footer:**

- Link to subscribe (RSS)
- Link to main Grove site
- "Questions? Contact support"

### Public Page Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  🌿 Grove Status                                    Last updated:   │
│                                                     2 minutes ago   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                                                                │ │
│  │           🟢 All Systems Operational                           │ │
│  │                                                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Components                                                         │
│  ─────────────────────────────────────────────────────────────────  │
│  Blog Engine         🟢 Operational                                 │
│  CDN                 🟢 Operational                                 │
│  Authentication      🟢 Operational                                 │
│  Payments            🟢 Operational                                 │
│  API                 🟢 Operational                                 │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  Past Incidents (30 days)                                           │
│                                                                     │
│  ▼ December 20, 2025                                                │
│    ✓ CDN Degraded Performance                        [Resolved]     │
│      Resolved in 45 minutes                                         │
│                                                                     │
│  ▼ December 15, 2025                                                │
│    ✓ Scheduled Maintenance - Database Migration      [Completed]    │
│      Duration: 2 hours                                              │
│                                                                     │
│  No other incidents in the past 30 days.                            │
│                                                                     │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  📡 Subscribe via RSS    │    🌿 grove.place    │     📧 Support    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Incident Detail View

When clicking an incident:

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Back to Status                                                   │
│                                                                     │
│  CDN Degraded Performance                                           │
│  ══════════════════════════════════════════════════════════════════ │
│                                                                     │
│  Status: ✓ Resolved                                                 │
│  Duration: 45 minutes (Dec 20, 10:15 AM - 11:00 AM UTC)             │
│  Affected: CDN                                                      │
│                                                                     │
│  Timeline                                                           │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  11:00 AM  [Resolved]                                               │
│            The issue has been resolved. Image delivery is back      │
│            to normal speeds.                                        │
│                                                                     │
│  10:45 AM  [Monitoring]                                             │
│            We've deployed a fix and are monitoring. Image           │
│            loading times are improving.                             │
│                                                                     │
│  10:30 AM  [Identified]                                             │
│            Root cause identified: cache invalidation issue          │
│            following deployment. Working on a fix.                  │
│                                                                     │
│  10:15 AM  [Investigating]                                          │
│            We're investigating reports of slow image loading.       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## User Notifications

### Messages Panel (User Admin Panels)

> **Status: Partial.** The `GroveMessages` component exists and is wired into the ArborPanel admin sidebar (landing app) and into the plant onboarding/checkout app and meadow app layouts. It is **not yet wired** into the primary user blog dashboard (`apps/aspen`).

Users see platform status in a **Messages** panel in their Grove admin dashboard.

**What appears:**

- Active incidents affecting the platform
- Scheduled maintenance announcements
- Resolved incidents (for 24 hours after resolution)

**Display format:**

```
┌────────────────────────────────────────────────────────────────┐
│ 📢 Messages                                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ⚠️ CDN Degraded Performance                      Dec 20, 10:15 │
│    Images may load slower than usual. We're on it.             │
│    Status: Monitoring • View details →                         │
│                                                                │
│ 🔧 Scheduled: Database Maintenance               Dec 22, 2:00  │
│    Expect 30 minutes of read-only mode.                        │
│    View details →                                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**When empty:**

```
┌────────────────────────────────────────────────────────────────┐
│ 📢 Messages                                                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│ ✓ No current issues. All systems operational.                  │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### RSS Feed

Available at `status.grove.place/feed`

- Standard RSS 2.0 format
- Includes all incidents and updates
- Users can subscribe in their feed reader of choice
- Updates posted when:
  - New incident created
  - Incident status changes
  - Incident resolved
  - Maintenance scheduled

---

## API Specification

### Base URL

```
https://status.grove.place/api
```

### Public Endpoints (No Auth)

#### `GET /status`

Current overall status.

**Response:**

```json
{
  "status": "operational",
  "components": [
    {
      "name": "Blog Engine",
      "slug": "blog-engine",
      "status": "operational"
    },
    {
      "name": "CDN",
      "slug": "cdn",
      "status": "degraded"
    }
  ],
  "activeIncidents": [
    {
      "id": "inc_xxx",
      "title": "CDN Degraded Performance",
      "status": "monitoring",
      "impact": "minor",
      "startedAt": "2025-12-20T10:15:00Z",
      "latestUpdate": "We've deployed a fix and are monitoring."
    }
  ],
  "scheduledMaintenance": [],
  "updatedAt": "2025-12-20T10:45:00Z"
}
```

#### `GET /incidents`

List incidents (30-day history).

**Query Parameters:**

- `limit` (default: 20)
- `offset` (default: 0)
- `status` (filter: active, resolved, all)

**Response:**

```json
{
  "incidents": [
    {
      "id": "inc_xxx",
      "title": "CDN Degraded Performance",
      "slug": "cdn-degraded-performance-dec-20",
      "status": "resolved",
      "impact": "minor",
      "type": "degraded",
      "startedAt": "2025-12-20T10:15:00Z",
      "resolvedAt": "2025-12-20T11:00:00Z",
      "components": ["cdn"],
      "updateCount": 4
    }
  ],
  "total": 5,
  "hasMore": false
}
```

#### `GET /incidents/:slug`

Single incident with full timeline.

**Response:**

```json
{
  "id": "inc_xxx",
  "title": "CDN Degraded Performance",
  "slug": "cdn-degraded-performance-dec-20",
  "status": "resolved",
  "impact": "minor",
  "type": "degraded",
  "startedAt": "2025-12-20T10:15:00Z",
  "resolvedAt": "2025-12-20T11:00:00Z",
  "components": [
    {
      "name": "CDN",
      "slug": "cdn"
    }
  ],
  "updates": [
    {
      "id": "upd_4",
      "status": "resolved",
      "message": "The issue has been resolved.",
      "createdAt": "2025-12-20T11:00:00Z"
    },
    {
      "id": "upd_3",
      "status": "monitoring",
      "message": "Fix deployed, monitoring.",
      "createdAt": "2025-12-20T10:45:00Z"
    }
  ]
}
```

#### `GET /feed`

RSS feed of incidents.

**Response:** RSS 2.0 XML

### Admin Endpoints (Authenticated)

These endpoints require authentication via GroveAuth.

#### `POST /admin/incidents`

Create new incident.

#### `PATCH /admin/incidents/:id`

Update incident status.

#### `POST /admin/incidents/:id/updates`

Post update to incident.

#### `PATCH /admin/components/:slug`

Update component status.

#### `POST /admin/scheduled`

Schedule maintenance.

---

## Design & UX

### Visual Design

- **Clean and minimal**: Focus on information, not decoration
- **Consistent with Grove**: Same color palette, typography (Lexend)
- **Status colors**: Green (good), Yellow (degraded), Orange (partial), Red (major), Blue (maintenance)
- **Dark mode support**: Follows system preference

### Mobile Considerations

- Fully responsive
- Component grid stacks on mobile
- Incident timelines remain readable
- Touch-friendly interactive elements

### Accessibility

- Proper color contrast ratios
- Screen reader friendly status announcements
- Keyboard navigable
- Status not communicated by color alone (icons + text)

### Performance

- Static site generation where possible
- API responses cached at edge
- Minimal JavaScript
- Fast initial load (status is time-sensitive)

---

## Implementation Notes

### Phase 1 (MVP) — Live

- [x] Database schema setup
- [x] Public status page (read-only)
- [x] Component status display
- [x] Incident history (30 days)
- [x] RSS feed (`/feed` — live and tested)
- [x] Automated health monitoring — 5-minute cron checks via `worker-entry.ts` scheduled handler; incident auto-creation on failures; daily history aggregation at midnight UTC
- [x] Sentinel API integration (`/api/sentinel`) — accepts stress-test results from the Sentinel system, updates component statuses, and optionally creates incidents based on error rate thresholds
- [x] Email alerts via Zephyr (`ZEPHYR_URL` / `ZEPHYR_API_KEY` bindings on the worker)

### Phase 2 — Live

- [x] Admin dashboard at `/arbor/status/` in landing app (not GroveAuth as originally planned)
- [x] Create/update incidents (`/arbor/status/incidents/new`, `/arbor/status/incidents/[id]`)
- [x] Post incident updates
- [x] Manual component status override (inline dropdowns on the status dashboard)

### Phase 3

- [ ] Scheduled maintenance management
- [x] Messages panel — partial; `GroveMessages` is live in ArborPanel and plant/meadow apps, but not yet wired into the primary user blog dashboard (`apps/aspen`)
- [ ] Email notifications to users (optional)

### Admin Implementation Notes

The admin interface is **live** at `apps/landing/src/routes/arbor/status/`. Key files:

- `+page.svelte` / `+page.server.ts` — dashboard with component status overrides and active incident list
- `incidents/new/` — create incident form
- `incidents/[id]/` — update incident, post timeline updates, resolve

Remaining work: scheduled maintenance management UI (Phase 3).

---

_Spec Version: 1.1_
_Created: 2025-12-24_
_Updated: 2026-04-06 — reflected live implementation (automated monitoring, admin dashboard, RSS, BillingHub, Meadow removal)_
_Author: Claude (with guidance from Autumn)_
