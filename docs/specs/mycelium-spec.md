---
title: Mycelium — MCP Server
description: Model Context Protocol server for Grove ecosystem
category: specs
specCategory: operations
icon: circuitboard
status: planned
lastUpdated: "2025-12-30"
aliases: []
tags:
  - mcp
  - ai-integration
  - api
---

# Mycelium — MCP Server

```
                 🌲          🌲          🌲          🌲
                  │           │           │           │
    ──────────────┼───────────┼───────────┼───────────┼──────────────
                  │           │           │           │
                  └─────┬─────┴─────┬─────┘           │
                        │           │                 │
              ┌─────────┴───────────┴─────────────────┤
              │                     🍄                │
              └──────┬──────────────┬─────────────────┘
                     │              │
              ·  ·  ·│·  ·  ·   ·  ·│·  ·  ·  ·  ·  ·  ·

            Hidden networks connecting every root.
            The wood wide web beneath the grove.
```

> _Hidden networks connecting every root._

```
                    MCP Protocol Data Flow

    ┌─────────────────────────────────────────────────────────────┐
    │                        🤖 CLAUDE                            │
    │   "Start a Bloom session for Lattice and fix the bug"       │
    └────────────────────────────┬────────────────────────────────┘
                                 │
                    1. Tool Call │  bloom_session_start
                                 │  { project: "lattice", task: "..." }
                                 ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                    🍄 MYCELIUM                              │
    │  ┌───────────────────────────────────────────────────────┐  │
    │  │  Validate OAuth token → Check scopes → Route request  │  │
    │  └───────────────────────────────────────────────────────┘  │
    │                          │                                  │
    │         2. Internal API  │  POST /api/sessions              │
    │            with token    │  Authorization: Bearer <token>   │
    │                          ▼                                  │
    │     ┌──────────┐   ┌──────────┐   ┌──────────┐              │
    │     │  Bloom   │   │ Lattice  │   │  Amber   │   ...        │
    │     │  🌸      │   │  🌿      │   │  💎      │              │
    │     └────┬─────┘   └──────────┘   └──────────┘              │
    │          │                                                  │
    │          │  3. Service responds                             │
    │          │     { sessionId: "abc123", status: "starting" }  │
    │          ▼                                                  │
    │  ┌───────────────────────────────────────────────────────┐  │
    │  │  Format response → Update session state → Return      │  │
    │  └───────────────────────────────────────────────────────┘  │
    └────────────────────────────┬────────────────────────────────┘
                                 │
                4. Tool Result   |
                                 │
                                 ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                        🤖 CLAUDE                            │
    │   "🌸 Bloom session started! Session ID: abc123..."         │
    └─────────────────────────────────────────────────────────────┘

   ═══════════════════════════════════════════════════════════════

    The invisible network:
    ┌─────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ Lattice │──────│         │──────│  Bloom  │──────│  Rings  │
    │  posts  │      │         │      │   dev   │      │ metrics │
    └─────────┘      │ 🍄      │      └─────────┘      └─────────┘
                     │MYCELIUM │
    ┌─────────┐      │         │      ┌─────────┐      ┌─────────┐
    │  Amber  │──────│         │──────│ Meadow  │──────│  Scout  │
    │ storage │      └─────────┘      │ social  │      │  deals  │
    └─────────┘                       └─────────┘      └─────────┘
```

Grove's Model Context Protocol server connecting AI agents to the entire ecosystem. Through Mycelium, Claude can read blog posts, start Bloom sessions, and manage Amber files. Every Grove service through a single, unified interface.

**Public Name:** Mycelium
**Internal Name:** GroveMCP
**Domain:** `mycelium.grove.place`
**Last Updated:** December 2025

Beneath the forest floor, fungal networks connect every tree, sharing nutrients, sending signals, creating a living internet of roots. Mycelium is Grove's Model Context Protocol server, the invisible network connecting AI agents to the entire ecosystem.

Through Mycelium, Claude can read your blog posts, start Bloom sessions, manage files in Amber, and tap into every Grove service through a single, unified interface. The wood wide web.

---

## Overview

Mycelium is Grove's Model Context Protocol (MCP) server: the communication network that lets AI agents interact with the entire Grove ecosystem. Just as fungal mycelium networks connect trees in a forest, enabling them to share nutrients and information, Mycelium connects Claude (and other AI assistants) to Lattice, Heartwood, Amber, Bloom, and every other Grove service.

**One sentence:** _"Claude talks to Grove through Mycelium."_

---

## Why Mycelium?

In forests, mycelium is the underground fungal network scientists call the "wood wide web." It allows trees to:

- Share resources across the forest
- Send chemical signals to warn of threats
- Support seedlings that can't yet reach sunlight
- Connect the entire ecosystem invisibly

For Grove, Mycelium does the same thing: it's the invisible connective tissue that lets AI agents tap into your entire digital ecosystem through a single, unified interface.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            MCP CLIENTS                                      │
│  ┌─────────────┐  ┌─────────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  Claude.ai  │  │ Claude Desktop  │  │ Claude Code │  │   Cursor    │     │
│  │ (Connectors)│  │  (mcp-remote)   │  │             │  │             │     │
│  └──────┬──────┘  └────────┬────────┘  └──────┬──────┘  └──────┬──────┘     │
└─────────┼──────────────────┼──────────────────┼────────────────┼────────────┘
          │                  │                  │                │
          │         SSE / Streamable HTTP / WebSocket            │
          │                  │                  │                │
          └──────────────────┴─────────┬────────┴────────────────┘
                                       │
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                     MYCELIUM (Cloudflare Worker)                            │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        Router Layer                                 │    │
│  │   /mcp  → Streamable HTTP (recommended)                             │    │
│  │   /sse  → Server-Sent Events (legacy support)                       │    │
│  └─────────────────────────────────┬───────────────────────────────────┘    │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │                    OAuth Provider (Heartwood)                       │    │
│  │   /authorize  → Redirect to heartwood.grove.place                   │    │
│  │   /callback   → Token exchange                                      │    │
│  │   /token      → Token refresh                                       │    │
│  └─────────────────────────────────┬───────────────────────────────────┘    │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐    │
│  │              MyceliumDO (Durable Object per Session)                │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │    │
│  │  │  Session State  │  │  SQLite Storage │  │   Hibernation   │      │    │
│  │  │  - preferences  │  │  - task history │  │   (auto-sleep)  │      │    │
│  │  │  - active ctx   │  │  - cached data  │  │                 │      │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │ Internal API Calls
                                       │
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                          GROVE ECOSYSTEM                                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Lattice  │  │ Heartwood │  │   Amber   │  │   Bloom   │  │   Rings   │  │
│  │  (blogs)  │  │  (auth)   │  │ (storage) │  │ (dev env) │  │(analytics)│  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
│                                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Meadow   │  │   Scout   │  │   Aria    │  │   Acorn   │  │  Outpost  │  │
│  │ (social)  │  │  (deals)  │  │  (music)  │  │ (domains) │  │(minecraft)│  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Technology

### McpAgent on Durable Objects

Mycelium extends Cloudflare's `McpAgent` class, which means:

1. **Each MCP session is a Durable Object** — globally unique, persistent state
2. **Built-in SQLite storage** — per-session database for history, preferences, caching
3. **WebSocket Hibernation** — sleeps when inactive, wakes instantly on tool call
4. **Zero cold start** — Durable Objects are always warm within region

```typescript
import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

type SessionState = {
  activeTenant: string | null;
  activeProject: string | null;
  preferences: UserPreferences;
  taskHistory: Task[];
};

type AuthProps = {
  userId: string;
  email: string;
  tenants: string[]; // Grove tenants user has access to
  scopes: string[]; // Permissions granted
};

export class Mycelium extends McpAgent<Env, SessionState, AuthProps> {
  server = new McpServer({
    name: "Mycelium",
    version: "1.0.0",
    description: "The wood wide web of the Grove ecosystem",
  });

  initialState: SessionState = {
    activeTenant: null,
    activeProject: null,
    preferences: { defaultRegion: "eu" },
    taskHistory: [],
  };

  async init() {
    // Register all Grove tools
    this.registerLatticeTools();
    this.registerBloomTools();
    this.registerAmberTools();
    this.registerRingsTools();
    this.registerMeadowTools();
    // ... etc
  }
}
```

### Transport Support

| Transport       | Endpoint  | Use Case                    |
| --------------- | --------- | --------------------------- |
| Streamable HTTP | `/mcp`    | Recommended for new clients |
| SSE             | `/sse`    | Legacy client support       |
| WebSocket       | Automatic | Long-running sessions       |

---

## MCP Tools

### Lattice Tools (Blogging)

| Tool                  | Description          | Parameters                              |
| --------------------- | -------------------- | --------------------------------------- |
| `lattice_posts_list`  | List blog posts      | `tenant?`, `limit?`, `status?`          |
| `lattice_post_get`    | Get single post      | `tenant`, `slug`                        |
| `lattice_post_create` | Create new post      | `tenant`, `title`, `content`, `status?` |
| `lattice_post_update` | Update existing post | `tenant`, `slug`, `updates`             |
| `lattice_post_delete` | Delete post          | `tenant`, `slug`                        |
| `lattice_drafts`      | List user's drafts   | `tenant?`                               |

```typescript
this.server.tool(
  "lattice_post_create",
  {
    tenant: z.string().describe("Blog tenant subdomain"),
    title: z.string().describe("Post title"),
    content: z.string().describe("Markdown content"),
    status: z.enum(["draft", "published"]).default("draft"),
  },
  async ({ tenant, title, content, status }) => {
    // Verify user has write access to tenant
    if (!this.props.tenants.includes(tenant)) {
      return {
        content: [{ type: "text", text: `No access to tenant: ${tenant}` }],
      };
    }

    const response = await fetch(
      `https://lattice.grove.place/api/${tenant}/posts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.props.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content, status }),
      },
    );

    const post = await response.json();

    // Track in session history
    this.setState({
      ...this.state,
      taskHistory: [
        ...this.state.taskHistory,
        {
          type: "lattice_post_create",
          tenant,
          slug: post.slug,
          timestamp: Date.now(),
        },
      ],
    });

    return {
      content: [
        {
          type: "text",
          text: `✨ Post created!\nTitle: ${post.title}\nSlug: ${post.slug}\nStatus: ${status}\nURL: https://${tenant}.grove.place/${post.slug}`,
        },
      ],
    };
  },
);
```

### Bloom Tools (Remote Development)

| Tool                   | Description                    | Parameters                    |
| ---------------------- | ------------------------------ | ----------------------------- |
| `bloom_session_start`  | Start coding session           | `project`, `region?`, `task?` |
| `bloom_session_status` | Get session status             | `sessionId?`                  |
| `bloom_session_stop`   | Stop session                   | `sessionId`                   |
| `bloom_task_submit`    | Submit task to running session | `sessionId`, `task`           |
| `bloom_logs`           | Get session logs               | `sessionId`, `lines?`         |

```typescript
this.server.tool(
  "bloom_session_start",
  {
    project: z.string().describe("Project name from R2"),
    region: z
      .enum(["eu", "us"])
      .default("eu")
      .describe("EU is cheaper, US is faster"),
    task: z.string().optional().describe("Initial task for the agent"),
  },
  async ({ project, region, task }) => {
    const response = await fetch("https://bloom.grove.place/api/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.props.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project,
        region,
        task,
        userId: this.props.userId,
      }),
    });

    const session = await response.json();

    // Update session state
    this.setState({
      ...this.state,
      activeProject: project,
      taskHistory: [
        ...this.state.taskHistory,
        {
          type: "bloom_session_start",
          sessionId: session.id,
          project,
          task,
          timestamp: Date.now(),
        },
      ],
    });

    return {
      content: [
        {
          type: "text",
          text: `🌸 Bloom session started!\n\nSession ID: ${session.id}\nProject: ${project}\nRegion: ${region}\nTerminal: ${session.terminalUrl}\n\n${task ? `Task queued: "${task}"` : "No initial task. Session idle."}`,
        },
      ],
    };
  },
);
```

### Amber Tools (Storage)

| Tool             | Description        | Parameters                        |
| ---------------- | ------------------ | --------------------------------- |
| `amber_upload`   | Upload file to R2  | `path`, `content`, `contentType?` |
| `amber_download` | Download file      | `path`                            |
| `amber_list`     | List files in path | `prefix?`, `limit?`               |
| `amber_delete`   | Delete file        | `path`                            |
| `amber_presign`  | Get presigned URL  | `path`, `expiresIn?`              |

### Rings Tools (Analytics)

| Tool              | Description           | Parameters                       |
| ----------------- | --------------------- | -------------------------------- |
| `rings_query`     | Query analytics data  | `tenant`, `metric`, `timeRange?` |
| `rings_events`    | Get recent events     | `tenant`, `eventType?`, `limit?` |
| `rings_dashboard` | Get dashboard summary | `tenant`                         |

### Meadow Tools (Social)

| Tool               | Description        | Parameters               |
| ------------------ | ------------------ | ------------------------ |
| `meadow_post`      | Create social post | `content`, `visibility?` |
| `meadow_feed`      | Get user's feed    | `limit?`, `before?`      |
| `meadow_following` | List following     | -                        |
| `meadow_followers` | List followers     | -                        |

### Scout Tools (Deal Finding)

| Tool           | Description                | Parameters                        |
| -------------- | -------------------------- | --------------------------------- |
| `scout_search` | Search for deals           | `query`, `category?`, `maxPrice?` |
| `scout_track`  | Track item for price drops | `url`, `targetPrice?`             |
| `scout_alerts` | Get price alerts           | -                                 |

### Context Tools (Session Management)

| Tool                   | Description                 | Parameters    |
| ---------------------- | --------------------------- | ------------- |
| `mycelium_context`     | Get current session context | -             |
| `mycelium_set_tenant`  | Set active tenant           | `tenant`      |
| `mycelium_set_project` | Set active project          | `project`     |
| `mycelium_preferences` | Update preferences          | `preferences` |
| `mycelium_history`     | Get task history            | `limit?`      |

```typescript
this.server.tool("mycelium_context", {}, async () => {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            user: {
              id: this.props.userId,
              email: this.props.email,
              tenants: this.props.tenants,
            },
            session: {
              activeTenant: this.state.activeTenant,
              activeProject: this.state.activeProject,
              preferences: this.state.preferences,
              taskCount: this.state.taskHistory.length,
            },
          },
          null,
          2,
        ),
      },
    ],
  };
});
```

---

## Authentication with Heartwood

Mycelium uses Heartwood as its OAuth provider, leveraging Grove's existing auth infrastructure.

### OAuth Flow

```
┌──────────┐     1. Connect to Mycelium      ┌──────────┐
│  Claude  │ ───────────────────────────────▶│ Mycelium │
│  Client  │                                 │  Worker  │
└──────────┘                                 └────┬─────┘
     │                                            │
     │         2. Redirect to /authorize          │
     │◀───────────────────────────────────────────┘
     │
     │         3. Redirect to Heartwood
     ▼
┌──────────────┐
│  Heartwood   │
│ OAuth Server │
└──────┬───────┘
       │        4. User authenticates
       │           (email, passkey, etc.)
       │
       │        5. Redirect to /callback with code
       ▼
┌──────────┐    6. Exchange code for tokens   ┌──────────┐
│  Claude  │ ───────────────────────────────▶ │ Mycelium │
│  Client  │                                  │  Worker  │
└──────────┘                                  └────┬─────┘
     │                                             │
     │         7. Return access token              │
     │◀────────────────────────────────────────────┘
     │
     │         8. Connect with token
     │─────────────────────────────────────────────▶
```

### Implementation

```typescript
// src/auth/heartwood.ts
import { OAuthProvider } from "@cloudflare/workers-oauth-provider";

class HeartwoodHandler {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/authorize") {
      const heartwoodUrl = new URL(
        "https://heartwood.grove.place/oauth/authorize",
      );
      heartwoodUrl.searchParams.set("client_id", env.HEARTWOOD_CLIENT_ID);
      heartwoodUrl.searchParams.set("redirect_uri", `${url.origin}/callback`);
      heartwoodUrl.searchParams.set("response_type", "code");
      heartwoodUrl.searchParams.set(
        "scope",
        "profile tenants:read tenants:write",
      );
      heartwoodUrl.searchParams.set(
        "state",
        url.searchParams.get("state") || "",
      );
      heartwoodUrl.searchParams.set(
        "code_challenge",
        url.searchParams.get("code_challenge") || "",
      );
      heartwoodUrl.searchParams.set("code_challenge_method", "S256");

      return Response.redirect(heartwoodUrl.toString());
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      // Exchange code for tokens
      const tokenResponse = await fetch(
        "https://heartwood.grove.place/oauth/token",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            code,
            client_id: env.HEARTWOOD_CLIENT_ID,
            client_secret: env.HEARTWOOD_CLIENT_SECRET,
            redirect_uri: `${url.origin}/callback`,
          }),
        },
      );

      const tokens = await tokenResponse.json();

      // Get user info
      const userResponse = await fetch(
        "https://heartwood.grove.place/oauth/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );

      const user = await userResponse.json();

      // Store in KV and redirect back
      await env.OAUTH_KV.put(
        `session:${state}`,
        JSON.stringify({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          userId: user.id,
          email: user.email,
          tenants: user.tenants,
        }),
        { expirationTtl: 86400 },
      );

      // Redirect back to MCP client
      return new Response(null, {
        status: 302,
        headers: { Location: `/?state=${state}` },
      });
    }

    return new Response("Not Found", { status: 404 });
  }
}

// Export the OAuth-wrapped server
export default new OAuthProvider({
  apiRoute: "/mcp",
  apiHandler: Mycelium.Router,
  defaultHandler: HeartwoodHandler,
  authorizeEndpoint: "/authorize",
  tokenEndpoint: "/token",
  clientRegistrationEndpoint: "/register",
});
```

### Scopes

| Scope           | Description                      |
| --------------- | -------------------------------- |
| `profile`       | Basic user info (id, email)      |
| `tenants:read`  | List user's Grove tenants        |
| `tenants:write` | Create/modify content on tenants |
| `bloom:read`    | View Bloom sessions              |
| `bloom:write`   | Start/stop Bloom sessions        |
| `amber:read`    | Download from Amber storage      |
| `amber:write`   | Upload to Amber storage          |
| `meadow:read`   | View social feed                 |
| `meadow:write`  | Post to Meadow                   |

---

## Session State & Persistence

### State Schema

```typescript
type SessionState = {
  // Active context (survives reconnects within session)
  activeTenant: string | null;
  activeProject: string | null;

  // User preferences (persisted to DO storage)
  preferences: {
    defaultRegion: "eu" | "us";
    defaultTenant: string | null;
    notifyOnTaskComplete: boolean;
  };

  // Task history (queryable via SQL)
  taskHistory: Array<{
    id: string;
    type: string;
    params: Record<string, unknown>;
    result: "success" | "error";
    timestamp: number;
    duration: number;
  }>;

  // Cached data (reduces API calls)
  cache: {
    tenantList?: { data: Tenant[]; expiry: number };
    recentPosts?: { data: Post[]; expiry: number };
  };
};
```

### SQL Storage

Each Mycelium session has its own SQLite database:

```sql
-- Task history for analytics
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  params TEXT, -- JSON
  result TEXT CHECK(result IN ('success', 'error')),
  error_message TEXT,
  created_at INTEGER NOT NULL,
  duration_ms INTEGER
);

-- Cached API responses
CREATE TABLE cache (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);

-- User preferences (singleton)
CREATE TABLE preferences (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  default_region TEXT DEFAULT 'eu',
  default_tenant TEXT,
  notify_on_complete INTEGER DEFAULT 0
);
```

### Hibernation Behavior

Mycelium automatically hibernates during inactivity:

1. **Active** → Processing tool calls, WebSocket messages
2. **Idle** → No activity for 10 seconds, preparing to hibernate
3. **Hibernating** → Evicted from memory, WebSocket stays open
4. **Waking** → Instant restore on next message, state preserved

**Cost impact:** You only pay for compute when tools are being called!

---

## Deployment

### Prerequisites

- Cloudflare account (free tier works!)
- Heartwood OAuth client credentials
- Wrangler CLI

### Setup

```bash
# Create project
pnpm create cloudflare@latest mycelium --template=cloudflare/ai/demos/remote-mcp-github-oauth

cd mycelium

# Create KV namespace for OAuth
npx wrangler kv namespace create "OAUTH_KV"

# Set secrets
npx wrangler secret put HEARTWOOD_CLIENT_ID
npx wrangler secret put HEARTWOOD_CLIENT_SECRET
npx wrangler secret put COOKIE_ENCRYPTION_KEY

# Deploy
npx wrangler deploy
```

### wrangler.jsonc

```jsonc
{
  "name": "mycelium",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],

  "durable_objects": {
    "bindings": [
      {
        "name": "MYCELIUM_DO",
        "class_name": "Mycelium",
      },
    ],
  },

  "kv_namespaces": [
    {
      "binding": "OAUTH_KV",
      "id": "your-kv-id",
    },
  ],

  "routes": [{ "pattern": "mycelium.grove.place", "zone_name": "grove.place" }],
}
```

### Connecting to Claude.ai

1. **Settings → Connectors → Add custom connector**
2. **URL:** `https://mycelium.grove.place/mcp`
3. **Authenticate** via Heartwood OAuth flow
4. **Enable tools** you want Claude to access

### Connecting to Claude Desktop

```json
{
  "mcpServers": {
    "grove": {
      "command": "npx",
      "args": ["mcp-remote", "https://mycelium.grove.place/sse"]
    }
  }
}
```

---

## Cost Analysis

### Cloudflare Costs (Free Tier)

| Resource        | Free Tier    | Mycelium Usage   |
| --------------- | ------------ | ---------------- |
| Worker Requests | 100K/day     | ~1K/day expected |
| Durable Objects | 1M req/month | ~30K/month       |
| DO Storage      | 1 GB         | ~10 MB           |
| KV Operations   | 100K/day     | ~100/day         |

**Estimated monthly cost: $0** (free tier sufficient for personal use)

### Paid Tier (if needed)

| Resource        | Cost              | Usage      |
| --------------- | ----------------- | ---------- |
| Workers         | $5/month + usage  | Base       |
| Durable Objects | $0.15/million req | Negligible |
| DO Storage      | $0.20/GB          | Negligible |

**Estimated with heavy use: ~$5/month**

---

## Project Structure

```
mycelium/
├── src/
│   ├── index.ts              # Main entry, exports Mycelium class
│   ├── tools/
│   │   ├── lattice.ts        # Blog tools
│   │   ├── bloom.ts          # Remote dev tools
│   │   ├── amber.ts          # Storage tools
│   │   ├── rings.ts          # Analytics tools
│   │   ├── meadow.ts         # Social tools
│   │   ├── scout.ts          # Deal finding tools
│   │   └── context.ts        # Session management tools
│   ├── auth/
│   │   └── heartwood.ts      # OAuth handler
│   ├── state/
│   │   ├── schema.ts         # State type definitions
│   │   └── migrations.ts     # SQL migrations
│   └── types.ts              # Shared types
├── wrangler.jsonc
├── package.json
├── tsconfig.json
└── README.md
```

---

## Roadmap

### Phase 1: Foundation (MVP)

- [ ] Basic McpAgent setup
- [ ] Heartwood OAuth integration
- [ ] Core tools: `lattice_*`, `mycelium_*`
- [ ] Deploy to mycelium.grove.place
- [ ] Test with Claude.ai Connectors

### Phase 2: Bloom Integration

- [ ] `bloom_*` tools
- [ ] Session state persistence
- [ ] Task history tracking
- [ ] Webhook support for task completion

### Phase 3: Full Ecosystem

- [ ] `amber_*` tools
- [ ] `rings_*` tools
- [ ] `meadow_*` tools
- [ ] `scout_*` tools

### Phase 4: Advanced Features

- [ ] Multi-tenant tool scoping
- [ ] Usage analytics via Rings
- [ ] Rate limiting per user
- [ ] Tool recommendations based on context

---

## Example Interactions

### Starting a Bloom Session

**User:** "Start a Bloom session for Lattice and fix the pagination bug on the posts page"

**Claude:** _calls `bloom_session_start`_

```
🌸 Bloom session started!

Session ID: bloom_abc123
Project: lattice
Region: eu
Terminal: https://bloom.grove.place/terminal/abc123

Task queued: "fix the pagination bug on the posts page"

The VPS is provisioning now (~2 minutes). I'll let you know when it's ready, or you can check status with `bloom_session_status`.
```

### Creating a Blog Post

**User:** "Write a blog post about Mycelium and publish it to my blog"

**Claude:** _calls `lattice_post_create`_

```
✨ Post created!

Title: Introducing Mycelium: The Wood Wide Web of Grove
Slug: introducing-mycelium
Status: published
URL: https://autumn.grove.place/introducing-mycelium

The post is now live on your blog!
```

### Checking Context

**User:** "What's my current context?"

**Claude:** _calls `mycelium_context`_

```json
{
  "user": {
    "id": "user_autumn",
    "email": "autumn@grove.place",
    "tenants": ["autumn", "grove", "test"]
  },
  "session": {
    "activeTenant": "autumn",
    "activeProject": "lattice",
    "preferences": {
      "defaultRegion": "eu"
    },
    "taskCount": 7
  }
}
```

---

## Security Considerations

1. **OAuth scopes** — Users grant specific permissions, tools respect them
2. **Tenant isolation** — Tools verify user has access before operations
3. **No credential storage** — Tokens stored in encrypted KV, not in code
4. **Rate limiting** — Per-user limits prevent abuse
5. **Audit logging** — All tool calls logged to Rings

---

## References

- [Cloudflare MCP Server Guide](https://developers.cloudflare.com/agents/guides/remote-mcp-server/)
- [McpAgent API Reference](https://developers.cloudflare.com/agents/model-context-protocol/mcp-agent-api/)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Claude Connectors](https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp)
- [Grove Naming Guide](https://github.com/AutumnsGrove/Lattice/blob/main/docs/grove-naming.md)

---

_"The forest speaks through its roots."_

**Last updated:** December 2025
**Status:** Specification Draft
**Author:** Autumn Brown
