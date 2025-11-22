---
aliases:
date created: Friday, November 22nd 2025, 12:00:00 pm
date modified: Friday, November 22nd 2025, 12:00:00 pm
tags:
type: tech-spec
---

# Grove Analytics - Technical Specification

**Project:** Grove Analytics - Privacy-Focused Blog Analytics
**Phase:** Phase 5 Enhancement
**Type:** Analytics System
**Purpose:** Provide blog owners and platform admin with privacy-respecting usage insights

---

## Overview

Grove Analytics is a privacy-focused analytics system that provides blog owners with meaningful insights into their content performance without invasive tracking. The system collects page views, reading behavior, content performance, and basic technical metrics while respecting user privacy through anonymization and minimal cookie usage.

### Core Principles

1. **Privacy-First** - Anonymize data by default, minimal tracking
2. **Transparency** - Clear consent banner, honest about what's collected
3. **Value-Focused** - Only collect metrics that provide actionable insights
4. **Lightweight** - Minimal impact on page load performance
5. **GDPR-Compliant** - Consent-based, data minimization, user rights

---

## Architecture

### Tech Stack
- **Collection:** Cloudflare Workers (edge-based)
- **Storage:** Cloudflare D1 (per-tenant analytics tables)
- **Caching:** Cloudflare KV (aggregated stats)
- **Dashboard:** SvelteKit components in admin panel
- **Consent:** Custom lightweight banner

### Data Flow

```
User Visit → Consent Check → Collect Event → Anonymize → Store in D1 → Aggregate → Dashboard
```

---

## Metrics Collected

### 1. Page Views

**What We Track:**
- Total page views per post
- Unique visitors (anonymized)
- Views over time (daily/weekly/monthly)
- Geographic region (country-level only)

**Data Model:**
```typescript
interface PageView {
  id: string;
  post_id: string;
  timestamp: number;

  // Anonymized visitor tracking
  visitor_hash: string; // Hash of IP + User Agent + Date (rotates daily)

  // Source
  referrer_domain: string | null; // Domain only, no full URL
  utm_source: string | null;
  utm_medium: string | null;

  // Device (broad categories)
  device_type: 'desktop' | 'tablet' | 'mobile';

  // Location (coarse)
  country_code: string | null;
}
```

**Privacy Measures:**
- IP addresses are hashed with daily salt (not stored raw)
- Visitor hash rotates daily to prevent long-term tracking
- No user fingerprinting beyond basic device type
- Referrer stripped to domain only

### 2. Reading Behavior

**What We Track:**
- Time on page (rounded to 10-second buckets)
- Scroll depth percentage (25%, 50%, 75%, 100%)
- Bounce rate (left within 10 seconds)
- Completion rate (reached end of post)

**Data Model:**
```typescript
interface ReadingSession {
  id: string;
  pageview_id: string; // Links to page view

  // Engagement
  time_on_page: number; // Seconds, rounded
  max_scroll_depth: number; // 0-100 percentage
  reached_end: boolean;
  bounced: boolean;

  // Interaction
  clicked_internal_link: boolean;
  clicked_external_link: boolean;
}
```

**Privacy Measures:**
- Aggregated only, no individual session replay
- No mouse tracking or heatmaps
- No scroll position history, just max depth
- Data expires after 90 days

### 3. Content Performance

**Derived Metrics (calculated from raw data):**
- Most read posts (by views)
- Best performing posts (by engagement)
- Popular tags
- Trending topics (recent momentum)
- Average reading time per post

**Aggregation Tables:**
```typescript
interface PostStats {
  post_id: string;
  date: string; // YYYY-MM-DD

  // Volume
  views: number;
  unique_visitors: number;

  // Engagement
  avg_time_on_page: number;
  avg_scroll_depth: number;
  bounce_rate: number;
  completion_rate: number;

  // Sources
  referrer_breakdown: Record<string, number>; // JSON
  device_breakdown: Record<string, number>; // JSON
}
```

### 4. Technical Metrics

**What We Track:**
- Device type distribution (desktop/tablet/mobile)
- Browser family (Chrome, Firefox, Safari, etc.)
- Page load performance (if available via Performance API)
- Error rates (JavaScript errors, 404s)

**Data Model:**
```typescript
interface TechnicalMetrics {
  date: string;
  blog_id: string;

  // Devices
  desktop_views: number;
  tablet_views: number;
  mobile_views: number;

  // Browsers
  browser_breakdown: Record<string, number>; // JSON

  // Performance (optional, requires consent)
  avg_page_load_ms: number | null;

  // Errors
  js_error_count: number;
  not_found_count: number;
}
```

**Privacy Measures:**
- Browser version not tracked, only family
- No OS version tracking
- Performance metrics are averages only

---

## Cookie & Consent Strategy

### Consent Banner

A lightweight, non-intrusive banner that appears on first visit:

```
┌─────────────────────────────────────────────────────────────┐
│  We use cookies to understand how you read our blog.        │
│  No ads, no tracking across sites.                          │
│                                                              │
│  [Accept]  [Decline]  [Learn More]                          │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Banner appears on first visit only
- Choice stored in localStorage (no cookie for consent itself)
- "Learn More" links to privacy policy
- Banner dismisses after choice
- Choice remembered for 1 year

### Cookie Usage

**With Consent (Accept):**
- `grove_visitor` - Anonymized visitor ID
  - Value: Random UUID
  - Expiry: Session (cleared on browser close)
  - Purpose: Distinguish unique visitors
  - HttpOnly: No (needs JS access)
  - Secure: Yes
  - SameSite: Strict

**Without Consent (Decline):**
- No cookies set
- Basic page view still counted
- Unique visitors estimated via IP hash (less accurate)
- No reading behavior tracked (requires session cookie)

### Technical Implementation

```typescript
// Check consent status
function hasAnalyticsConsent(): boolean {
  return localStorage.getItem('grove_analytics_consent') === 'accepted';
}

// Set consent
function setAnalyticsConsent(accepted: boolean): void {
  localStorage.setItem('grove_analytics_consent', accepted ? 'accepted' : 'declined');
  localStorage.setItem('grove_analytics_consent_date', Date.now().toString());

  if (accepted) {
    initializeAnalytics();
  }
}

// Initialize tracking
function initializeAnalytics(): void {
  // Set session cookie for visitor tracking
  const visitorId = crypto.randomUUID();
  document.cookie = `grove_visitor=${visitorId}; Secure; SameSite=Strict`;

  // Start tracking reading behavior
  initScrollTracking();
  initTimeTracking();
}
```

---

## Access Control

### Blog Owner Access

Blog owners can view analytics for their own blog only:

**Dashboard Features:**
- Date range selector (7/30/90 days, custom)
- Page view trends (line chart)
- Top posts table
- Traffic sources breakdown
- Device distribution
- Reading engagement metrics

**Available Data:**
- All metrics for their blog
- Historical data (up to 2 years)
- Export to CSV

**Restricted:**
- Cannot see other blogs' data
- Cannot see platform-wide metrics
- Cannot see individual visitor data

### Platform Admin Access (You)

Full access to all analytics data:

**Dashboard Features:**
- Platform-wide overview
- Per-client drill-down
- Revenue correlation
- System health metrics

**Available Data:**
- All blog analytics
- Aggregated platform metrics
- Client comparison
- Trend analysis

**Access Termination:**
- If client contract ends, admin loses access to that client's analytics
- Client retains access during data export period (30 days)
- After 30 days, data is deleted

### Public Stats (Very Light)

Minimal public-facing stats on blog posts:

**What's Shown:**
- Reading time estimate (e.g., "5 min read")
- *Optionally:* View count (if blog owner enables)

**What's NOT Shown:**
- No public upvote/downvote counts (per existing decision)
- No reaction counts
- No detailed engagement metrics
- No leaderboards or comparisons

---

## Database Schema

### Analytics Events Table (Per-Tenant D1)

```sql
CREATE TABLE analytics_events (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'pageview', 'scroll', 'time', 'click'
  timestamp INTEGER NOT NULL,

  -- Visitor (anonymized)
  visitor_hash TEXT NOT NULL,
  session_id TEXT,

  -- Event data
  data TEXT, -- JSON for flexible event properties

  -- Source
  referrer_domain TEXT,
  utm_source TEXT,
  utm_medium TEXT,

  -- Device
  device_type TEXT,
  browser_family TEXT,
  country_code TEXT
);

CREATE INDEX idx_analytics_post ON analytics_events(post_id);
CREATE INDEX idx_analytics_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
```

### Daily Aggregates Table

```sql
CREATE TABLE analytics_daily (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD

  -- Volume
  pageviews INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,

  -- Engagement
  avg_time_on_page REAL DEFAULT 0,
  avg_scroll_depth REAL DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,

  -- Breakdowns (JSON)
  referrer_breakdown TEXT,
  device_breakdown TEXT,
  country_breakdown TEXT,

  UNIQUE(post_id, date)
);

CREATE INDEX idx_daily_post ON analytics_daily(post_id);
CREATE INDEX idx_daily_date ON analytics_daily(date);
```

### Blog-Level Stats Table

```sql
CREATE TABLE analytics_blog_stats (
  id TEXT PRIMARY KEY,
  blog_id TEXT NOT NULL,
  date TEXT NOT NULL,

  -- Totals
  total_pageviews INTEGER DEFAULT 0,
  total_unique_visitors INTEGER DEFAULT 0,
  total_posts_viewed INTEGER DEFAULT 0,

  -- Averages
  avg_time_on_page REAL DEFAULT 0,
  avg_scroll_depth REAL DEFAULT 0,
  overall_bounce_rate REAL DEFAULT 0,

  -- Top content
  top_posts TEXT, -- JSON array of {post_id, views}

  UNIQUE(blog_id, date)
);

CREATE INDEX idx_blog_stats_blog ON analytics_blog_stats(blog_id);
CREATE INDEX idx_blog_stats_date ON analytics_blog_stats(date);
```

---

## API Endpoints

### Collection API (Public, runs on blog)

**Track Page View:**
```typescript
POST /api/analytics/pageview
Body: {
  post_id: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
}
Response: { success: boolean; session_id: string }
```

**Track Reading Progress:**
```typescript
POST /api/analytics/reading
Body: {
  session_id: string;
  time_on_page: number;
  scroll_depth: number;
  reached_end: boolean;
}
Response: { success: boolean }
```

### Dashboard API (Auth Required)

**Get Post Analytics:**
```typescript
GET /api/analytics/posts/:postId
Query: { start_date: string; end_date: string }
Auth: Blog owner or admin
Response: {
  views: number;
  unique_visitors: number;
  avg_time: number;
  avg_scroll: number;
  bounce_rate: number;
  daily_data: Array<{date, views, unique}>;
  referrers: Array<{domain, count}>;
  devices: {desktop, tablet, mobile};
}
```

**Get Blog Overview:**
```typescript
GET /api/analytics/overview
Query: { start_date: string; end_date: string }
Auth: Blog owner or admin
Response: {
  total_views: number;
  total_unique: number;
  top_posts: Array<{post_id, title, views}>;
  trend: 'up' | 'down' | 'stable';
  trend_percentage: number;
}
```

**Export Analytics:**
```typescript
GET /api/analytics/export
Query: { start_date: string; end_date: string; format: 'csv' | 'json' }
Auth: Blog owner only
Response: File download
```

---

## Dashboard UI

### Blog Owner Dashboard

**Overview Page:**
```
┌─────────────────────────────────────────────────────────────┐
│  Analytics                    [Last 30 Days ▼] [Export]     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  1,234   │  │   892    │  │  3:42    │  │   68%    │    │
│  │  Views   │  │  Unique  │  │ Avg Time │  │  Scroll  │    │
│  │  ↑ 12%   │  │  ↑ 8%    │  │  ↑ 15%   │  │  ↓ 3%    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  Page Views Over Time                                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     ╱╲    ╱╲                                         │    │
│  │   ╱    ╲╱    ╲    ╱╲                                 │    │
│  │ ╱              ╲╱    ╲                               │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Top Posts                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 1. How to Grow Tomatoes      │ 342 views │ 4:12 avg │    │
│  │ 2. Garden Planning Guide     │ 289 views │ 5:30 avg │    │
│  │ 3. Composting Basics         │ 201 views │ 3:45 avg │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  Traffic Sources              Device Breakdown               │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │ Google    45%   │         │ Desktop   62%   │            │
│  │ Direct    30%   │         │ Mobile    33%   │            │
│  │ Twitter   15%   │         │ Tablet     5%   │            │
│  │ Other     10%   │         └─────────────────┘            │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

**Post Detail Page:**
- Full metrics for single post
- Daily breakdown chart
- Reading funnel (viewed → scrolled → completed)
- Referrer details
- Comparable posts

### Admin Dashboard (Platform-Wide)

Additional sections:
- Total platform views
- Views by client
- Active vs inactive blogs
- Revenue per view correlation
- System performance metrics

---

## Implementation Phases

### Phase 5a: Basic Analytics (2-3 weeks)

**Scope:**
- Page view tracking
- Basic consent banner
- Simple dashboard with totals
- Date range selection

**Features:**
- [ ] Collection Worker endpoint
- [ ] Consent banner component
- [ ] Daily aggregation job
- [ ] Basic dashboard UI
- [ ] Blog owner access

### Phase 5b: Reading Behavior (1-2 weeks)

**Scope:**
- Scroll depth tracking
- Time on page
- Bounce rate calculation
- Engagement metrics

**Features:**
- [ ] Client-side scroll tracker
- [ ] Time tracking with visibility API
- [ ] Engagement calculations
- [ ] Dashboard charts

### Phase 5c: Advanced Features (2 weeks)

**Scope:**
- Admin platform view
- Export functionality
- Performance metrics
- Historical data

**Features:**
- [ ] Platform-wide dashboard
- [ ] CSV/JSON export
- [ ] Performance tracking
- [ ] 2-year data retention

---

## Analytics Tools Research

The specific analytics tool choice needs further research. Options to evaluate:

### Option 1: Fully Custom (Cloudflare-Native)

**Pros:**
- Complete control
- No external dependencies
- Zero cost (within free tier)
- Perfect privacy alignment

**Cons:**
- 40-60 hours development time
- Ongoing maintenance
- No benchmarking

### Option 2: Cloudflare Web Analytics

**Pros:**
- Free, built-in
- Privacy-focused by default
- Zero development time
- Automatic edge collection

**Cons:**
- Limited customization
- No reading behavior
- Basic metrics only
- Dashboard outside Grove

### Option 3: Plausible Analytics

**Pros:**
- Privacy-focused
- Beautiful dashboard
- EU-hosted option
- Open source

**Cons:**
- $9/month minimum
- External service
- Limited customization
- No reading behavior

### Option 4: Hybrid Approach

Use Cloudflare Web Analytics for basic metrics + custom tracking for reading behavior. Best of both worlds.

**Recommendation:** Start with Cloudflare Web Analytics for basic page views, add custom reading behavior tracking. Evaluate migration to fully custom if more control needed.

---

## Privacy Compliance

### GDPR Requirements

1. **Lawful Basis:** Consent (via banner)
2. **Data Minimization:** Only collect what's needed
3. **Purpose Limitation:** Only for analytics, no advertising
4. **Storage Limitation:** 2-year retention, then deletion
5. **Right to Access:** Export function in dashboard
6. **Right to Erasure:** Delete on account closure
7. **Data Processing Agreement:** Cloudflare acts as processor

### Privacy Policy Updates

Required additions to privacy policy:
- What analytics data is collected
- How it's anonymized
- Cookie usage explanation
- Consent mechanism
- Data retention period
- How to opt out
- Contact for data requests

### Technical Privacy Measures

1. **IP Anonymization:** Hash with daily rotating salt
2. **Session Cookies Only:** No persistent tracking
3. **No Cross-Site Tracking:** SameSite=Strict
4. **Aggregation:** Individual sessions not visible
5. **Data Expiry:** Automatic deletion after 2 years
6. **Encryption:** HTTPS only, encrypted at rest

---

## Success Metrics

**Launch Goals:**
- [ ] < 50ms collection latency
- [ ] < 1KB tracking script
- [ ] > 60% consent acceptance rate
- [ ] < 5% impact on page load
- [ ] Zero PII in database

**Usage Goals:**
- [ ] 80% of blog owners view analytics monthly
- [ ] Avg 3 dashboard visits per week per owner
- [ ] < 10% support tickets about analytics
- [ ] Positive feedback on privacy approach

---

## Future Enhancements

- **Real-time dashboard:** Live visitor count
- **Content suggestions:** AI-powered topic recommendations
- **A/B testing:** Test titles/images
- **Email reports:** Weekly digest to owners
- **Goal tracking:** Custom conversion events
- **Cohort analysis:** Returning visitors
- **Search analytics:** What visitors search for

---

*Last Updated: November 2025*
