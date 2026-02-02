---
title: Warden — External API Gateway
description: Secure credential injection for agent-initiated external API requests
category: specs
specCategory: operations
icon: vault
lastUpdated: '2026-02-01'
aliases: []
tags:
  - api-gateway
  - infrastructure
  - cloudflare-workers
  - agent-security
---

# Warden — External API Gateway

```
                    ┌─────────────────────────┐
                    │    ╭───────────────╮    │
                    │    │   🔑  🔑  🔑  │    │
                    │    │   🔑  🔑  🔑  │    │
                    │    ╰───────────────╯    │
                    │           ║             │
                    │           ║             │
                    │     ┌─────╨─────┐       │
                    │     │  WARDEN   │       │
                    │     │    ◈◈◈    │       │
                    │     └─────┬─────┘       │
                    │           │             │
                    └───────────┼─────────────┘
                          ══════╧══════
                               ╱ ╲
                              ╱   ╲
                             ╱     ╲
                          agents enter
                          keys stay home

                    The one who holds the keys.
```

> *The one who holds the keys.*

Grove's external API gateway. Every outbound request to third-party services passes through Warden: GitHub operations, search queries, Cloudflare management, external integrations. Agents describe what they need. Warden executes with injected credentials. Keys never leave the vault.

**Public Name:** Warden
**Internal Name:** GroveWarden
**Domain:** `warden.grove.place`
**Last Updated:** February 2026

A warden guards what matters. In Grove, that's your secrets. Agents operating in environments you don't control (remote servers, third-party platforms, training pipelines) can't be trusted with raw credentials. Warden stands at the gate: agents request actions, Warden validates, injects the key, executes, and returns results. The agent gets what it asked for. The key never travels.

---

## Overview

Warden is Grove's unified external API gateway: a single interface that proxies all third-party API requests, handles credential injection, validates permissions, normalizes responses, and logs usage.

**The problem it solves:**

- Agents need API access but can't be trusted with keys
- Credentials stored in agent memory can be exfiltrated, logged, or trained on
- No unified way to scope, rotate, or audit external API usage
- Each integration requires separate auth handling

**The solution:**

```typescript
// Before: Agent holds the key (dangerous)
const response = await fetch("https://api.github.com/repos", {
  headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }, // 💀 exposed
});

// After: Agent describes intent, Warden executes
const response = await Warden.request({
  service: "github",
  action: "list_repos",
  params: { org: "autumnsgrove" },
  agent: agentId,
});
```

**One sentence:** *"Agents talk to the outside world through Warden."*

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AGENTS                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Claude    │  │   Cursor    │  │  MCP Tools  │  │  Workflows  │         │
│  │  (claude.ai)│  │   (IDE)     │  │  (servers)  │  │  (internal) │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          │  Warden.request({ service, action, params, agent })                │
          │                │                │                │
          └────────────────┴────────┬───────┴────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                        WARDEN (Cloudflare Worker)                            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                          Authentication                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │ Agent Verify │  │ Permission   │  │ Rate Limiter │                  │  │
│  │  │ (challenge)  │  │ Scope Check  │  │              │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────────┬───────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────┴───────────────────────────────────────┐  │
│  │                          Service Router                                │  │
│  │                                                                        │  │
│  │   service: "github"     → GitHub REST/GraphQL API                      │  │
│  │   service: "cloudflare" → Cloudflare API                               │  │
│  │   service: "tavily"     → Tavily Search API                            │  │
│  │   service: "exa"        → Exa Search API                               │  │
│  │   service: "resend"     → Resend Email API                             │  │
│  │   service: "lemonsqueezy" → Lemon Squeezy API (read-only)               │  │
│  │                                                                        │  │
│  └────────────────────────────────┬───────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────┴───────────────────────────────────────┐  │
│  │                         Credential Injection                           │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │  Fetch Key   │  │  Build Auth  │  │  Execute     │                  │  │
│  │  │  (secrets)   │  │  Headers     │  │  Request     │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────────┬───────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────┴───────────────────────────────────────┐  │
│  │                         Post-Processing                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │   Normalize  │  │   Scrub      │  │  Log Usage   │                  │  │
│  │  │   Response   │  │   Sensitive  │  │  (agent,     │                  │  │
│  │  │              │  │   Data       │  │   action)    │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                   │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                  │
│  │     GitHub     │  │   Cloudflare   │  │    Tavily      │                  │
│  │                │  │                │  │                │                  │
│  │  repos, issues │  │  workers, kv   │  │  search, crawl │                  │
│  │  prs, actions  │  │  d1, r2        │  │  extract       │                  │
│  └────────────────┘  └────────────────┘  └────────────────┘                  │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                  │
│  │      Exa       │  │    Resend      │  │ Lemon Squeezy  │                  │
│  │                │  │                │  │                │                  │
│  │  search, find  │  │  send email    │  │  read billing  │                  │
│  │  similar       │  │  (templated)   │  │  (no writes)   │                  │
│  └────────────────┘  └────────────────┘  └────────────────┘                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Agent Authentication

The core challenge: how does Warden know which agents to trust?

### Challenge-Response Flow

Agents don't send credentials directly. Instead, Warden uses a nonce-based challenge-response:

```
┌─────────────┐                              ┌─────────────┐
│    Agent    │                              │   Warden    │
└──────┬──────┘                              └──────┬──────┘
       │                                            │
       │  1. Request nonce                          │
       │ ─────────────────────────────────────────► │
       │                                            │
       │  2. Nonce (single-use, 30s TTL)            │
       │ ◄───────────────────────────────────────── │
       │                                            │
       │  3. hash(agent_secret + nonce) + request   │
       │ ─────────────────────────────────────────► │
       │                                            │
       │         4. Verify hash, check scope        │
       │         5. Execute with injected creds     │
       │         6. Invalidate nonce                │
       │                                            │
       │  7. Response (credentials stripped)        │
       │ ◄───────────────────────────────────────── │
       │                                            │
```

**Why this works:**

- The `agent_secret` is stored by the agent but never transmitted
- The hash changes every request (nonce is unique)
- Intercepting the hash is useless (nonce is invalidated after use)
- Even if an attacker captures the hash, they can't replay it

**What agents store:**

```typescript
// Agent configuration (stored in agent's environment)
const WARDEN_AGENT_ID = "agent_abc123";
const WARDEN_AGENT_SECRET = "sec_xxxxxx"; // Never transmitted directly
```

**What travels over the wire:**

```typescript
// Request to Warden
{
  agentId: "agent_abc123",
  nonce: "n_xyz789",
  signature: "sha256(agent_secret + nonce)", // Proves possession of secret
  request: {
    service: "github",
    action: "create_issue",
    params: { ... }
  }
}
```

### Agent Registration

Agents are registered via Heartwood (Grove's auth system):

```typescript
// Admin creates agent credentials
const agent = await Heartwood.createAgent({
  name: "Claude MCP Server",
  owner: "autumn",
  scopes: ["github:read", "github:write", "tavily:search"],
  rateLimit: { rpm: 60, daily: 1000 },
});

// Returns:
// {
//   agentId: "agent_abc123",
//   secret: "sec_xxxxxx",  // Show once, agent must store
//   scopes: ["github:read", "github:write", "tavily:search"]
// }
```

---

## Service Registry

Each external service is defined with its authentication method, available actions, and permission scopes.

### Service Definitions

| Service    | Auth Method    | Base URL                       | Scopes                              |
| ---------- | -------------- | ------------------------------ | ----------------------------------- |
| github     | Bearer token   | `api.github.com`               | `read`, `write`, `admin`, `actions` |
| cloudflare | Bearer token   | `api.cloudflare.com`           | `read`, `write`, `workers`, `dns`   |
| tavily     | API key header | `api.tavily.com`               | `search`, `crawl`, `extract`        |
| exa        | API key header | `api.exa.ai`                   | `search`, `contents`, `similar`     |
| resend     | Bearer token   | `api.resend.com`               | `send` (templated only)             |
| lemonsqueezy | Bearer token | `api.lemonsqueezy.com`         | `read` (no write operations)        |

### Action Mapping

Actions map to specific API endpoints with validation:

```typescript
const serviceActions = {
  github: {
    list_repos: {
      method: "GET",
      path: "/user/repos",
      scope: "read",
      params: z.object({
        type: z.enum(["all", "owner", "member"]).optional(),
        sort: z.enum(["created", "updated", "pushed", "full_name"]).optional(),
      }),
    },
    create_issue: {
      method: "POST",
      path: "/repos/{owner}/{repo}/issues",
      scope: "write",
      params: z.object({
        owner: z.string(),
        repo: z.string(),
        title: z.string(),
        body: z.string().optional(),
        labels: z.array(z.string()).optional(),
      }),
    },
    // ... more actions
  },

  tavily: {
    search: {
      method: "POST",
      path: "/search",
      scope: "search",
      params: z.object({
        query: z.string(),
        search_depth: z.enum(["basic", "advanced"]).optional(),
        max_results: z.number().max(20).optional(),
      }),
    },
    // ... more actions
  },
};
```

---

## API Design

### Core Interface

```typescript
interface WardenRequest {
  service: ServiceType;
  action: string;
  params?: Record<string, unknown>;
  agent: {
    id: string;
    signature: string; // hash(secret + nonce)
    nonce: string;
  };
}

interface WardenResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    service: string;
    action: string;
    latencyMs: number;
    rateLimitRemaining: number;
  };
}

type ServiceType =
  | "github"
  | "cloudflare"
  | "tavily"
  | "exa"
  | "resend"
  | "lemonsqueezy";
```

### Usage Examples

```typescript
import { Warden } from "@autumnsgrove/warden-client";

// Initialize client with agent credentials
const warden = new Warden({
  agentId: process.env.WARDEN_AGENT_ID,
  agentSecret: process.env.WARDEN_AGENT_SECRET,
});

// GitHub: Create an issue
const issue = await warden.request({
  service: "github",
  action: "create_issue",
  params: {
    owner: "autumnsgrove",
    repo: "grove-lattice",
    title: "Bug: Login redirect fails",
    body: "Steps to reproduce...",
    labels: ["bug", "auth"],
  },
});

// Tavily: Search the web
const results = await warden.request({
  service: "tavily",
  action: "search",
  params: {
    query: "cloudflare workers durable objects patterns",
    search_depth: "advanced",
    max_results: 10,
  },
});

// Cloudflare: Deploy a worker
const deployment = await warden.request({
  service: "cloudflare",
  action: "deploy_worker",
  params: {
    name: "my-worker",
    script: workerCode,
    bindings: { KV: "my-namespace" },
  },
});
```

### Client SDK

The client handles nonce fetching and signature generation automatically:

```typescript
// warden-client internals
class Warden {
  async request(req: Omit<WardenRequest, "agent">) {
    // 1. Fetch nonce from Warden
    const { nonce } = await this.getNonce();

    // 2. Generate signature
    const signature = await this.sign(this.secret, nonce);

    // 3. Make authenticated request
    return this.execute({
      ...req,
      agent: {
        id: this.agentId,
        signature,
        nonce,
      },
    });
  }

  private async sign(secret: string, nonce: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret + nonce);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  }
}
```

---

## Permission Scopes

Scopes control what actions an agent can perform. Granular by service and operation type.

### Scope Hierarchy

```
github:*           → All GitHub operations
github:read        → Read repos, issues, PRs, etc.
github:write       → Create/update issues, PRs, comments
github:admin       → Manage repo settings, collaborators
github:actions     → Trigger and manage workflow runs

cloudflare:*       → All Cloudflare operations
cloudflare:read    → List workers, KV namespaces, etc.
cloudflare:write   → Deploy workers, write KV
cloudflare:workers → Worker-specific operations
cloudflare:dns     → DNS record management

tavily:*           → All Tavily operations
tavily:search      → Web search
tavily:crawl       → Site crawling
tavily:extract     → Content extraction

exa:*              → All Exa operations
exa:search         → Semantic search
exa:contents       → Full content retrieval
exa:similar        → Find similar pages

resend:send        → Send emails (templated only)

lemonsqueezy:read  → View billing, subscriptions, orders
```

### Scope Validation

```typescript
function validateScope(
  agentScopes: string[],
  service: string,
  action: string
): boolean {
  const requiredScope = serviceActions[service][action].scope;
  const fullScope = `${service}:${requiredScope}`;
  const wildcardScope = `${service}:*`;

  return agentScopes.includes(fullScope) || agentScopes.includes(wildcardScope);
}
```

---

## Key Management

### Storage

Credentials stored as Cloudflare Worker secrets:

```bash
# Set secrets via wrangler
wrangler secret put GITHUB_TOKEN
wrangler secret put CLOUDFLARE_API_TOKEN
wrangler secret put TAVILY_API_KEY
wrangler secret put EXA_API_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put LEMONSQUEEZY_API_KEY
```

### Rotation

Keys can be rotated without agent disruption:

```typescript
// Warden supports multiple active keys per service during rotation
const serviceKeys = {
  github: {
    primary: env.GITHUB_TOKEN,
    secondary: env.GITHUB_TOKEN_ROTATING, // Optional, used during rotation
  },
};

// If primary fails with 401, try secondary
async function executeWithFallback(service, request) {
  try {
    return await execute(serviceKeys[service].primary, request);
  } catch (e) {
    if (e.status === 401 && serviceKeys[service].secondary) {
      return await execute(serviceKeys[service].secondary, request);
    }
    throw e;
  }
}
```

### Audit Trail

Every credential access is logged (without the credential itself):

```typescript
await logAccess({
  agentId: agent.id,
  service: "github",
  action: "create_issue",
  timestamp: Date.now(),
  success: true,
  latencyMs: 234,
});
```

---

## Rate Limiting

### Per-Agent Limits

```typescript
const defaultLimits = {
  rpm: 60,        // Requests per minute
  daily: 1000,    // Requests per day
  concurrent: 5,  // Max concurrent requests
};

// Custom limits per agent
const agentLimits = {
  "agent_mcp_claude": { rpm: 120, daily: 5000, concurrent: 10 },
  "agent_workflow_auto": { rpm: 30, daily: 500, concurrent: 2 },
};
```

### Per-Service Limits

Respects upstream API limits:

```typescript
const serviceLimits = {
  github: { rpm: 5000, daily: null },      // GitHub's own limits
  tavily: { rpm: 100, daily: 1000 },       // Based on plan
  exa: { rpm: 60, daily: 500 },            // Based on plan
  cloudflare: { rpm: 1200, daily: null },  // CF API limits
};
```

### Rate Limit Response

```typescript
// When rate limited
{
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Agent rate limit exceeded",
  },
  metadata: {
    retryAfter: 32,  // seconds
    limitType: "rpm",
    rateLimitRemaining: 0,
  }
}
```

---

## Error Handling

### Error Types

```typescript
type WardenError =
  | { code: "AUTH_FAILED"; message: string }
  | { code: "INVALID_NONCE"; message: string }
  | { code: "SCOPE_DENIED"; service: string; scope: string }
  | { code: "RATE_LIMITED"; retryAfter: number }
  | { code: "SERVICE_ERROR"; service: string; upstream: string }
  | { code: "INVALID_ACTION"; service: string; action: string }
  | { code: "VALIDATION_ERROR"; field: string; message: string };
```

### Error Responses

```typescript
// Auth failure
{
  success: false,
  error: {
    code: "AUTH_FAILED",
    message: "Invalid agent signature"
  }
}

// Scope denial
{
  success: false,
  error: {
    code: "SCOPE_DENIED",
    message: "Agent lacks required scope",
    service: "github",
    scope: "admin"
  }
}

// Upstream error (sanitized)
{
  success: false,
  error: {
    code: "SERVICE_ERROR",
    message: "GitHub API error: Repository not found",
    service: "github"
  }
}
```

---

## Response Scrubbing

Responses are sanitized before returning to agents:

### Credential Stripping

```typescript
function scrubResponse(response: any, service: string): any {
  const sensitiveFields = [
    "token",
    "api_key",
    "apiKey",
    "secret",
    "password",
    "authorization",
    "x-api-key",
  ];

  return deepOmit(response, sensitiveFields);
}
```

### URL Sanitization

```typescript
// Remove any URLs that might contain tokens
function sanitizeUrls(data: any): any {
  const tokenPatterns = [
    /[?&]token=[^&]+/gi,
    /[?&]api_key=[^&]+/gi,
    /[?&]access_token=[^&]+/gi,
  ];

  return deepReplace(data, tokenPatterns, "[REDACTED]");
}
```

---

## Lumen vs Warden

Two gateways, distinct domains:

```
┌─────────────────────────────────────────────────────────────────┐
│                          GROVE                                  │
│                                                                 │
│    ┌─────────────────────┐     ┌─────────────────────┐          │
│    │       LUMEN         │     │       WARDEN        │          │
│    │                     │     │                     │          │
│    │   AI Inference      │     │   External APIs     │          │
│    │                     │     │                     │          │
│    │   • OpenRouter      │     │   • GitHub          │          │
│    │   • Anthropic       │     │   • Cloudflare      │          │
│    │   • Workers AI      │     │   • Tavily / Exa    │          │
│    │   • Transcription   │     │   • Resend          │          │
│    │                     │     │   • Lemon Squeezy   │          │
│    │   task-based        │     │   action-based      │          │
│    │   routing           │     │   routing           │          │
│    │                     │     │                     │          │
│    │   tenant auth       │     │   agent auth        │          │
│    │   (Heartwood)       │     │   (challenge-resp)  │          │
│    │                     │     │                     │          │
│    └─────────────────────┘     └─────────────────────┘          │
│                                                                 │
│    "Grove talks to AI      "Agents talk to the                  │
│     through Lumen."         outside world through Warden."      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Aspect         | Lumen                    | Warden                     |
| -------------- | ------------------------ | -------------------------- |
| Purpose        | AI model inference       | External API proxy         |
| Consumer       | Grove services           | Agents (MCP, workflows)    |
| Auth           | Tenant via Heartwood     | Agent challenge-response   |
| Routing        | Task-based (moderation)  | Action-based (create_issue)|
| Keys protected | OpenRouter, Anthropic    | GitHub, Tavily, etc.       |
| Threat model   | Cost control, rate limit | Agent credential exfil     |

---

## Implementation

### File Structure

```
workers/warden/
├── src/
│   ├── index.ts              # Worker entry, routing
│   ├── types.ts              # Type definitions
│   ├── auth/
│   │   ├── nonce.ts          # Nonce generation, validation
│   │   ├── signature.ts      # Signature verification
│   │   └── scopes.ts         # Permission checking
│   ├── services/
│   │   ├── index.ts          # Service registry
│   │   ├── github.ts         # GitHub actions
│   │   ├── cloudflare.ts     # Cloudflare actions
│   │   ├── tavily.ts         # Tavily actions
│   │   ├── exa.ts            # Exa actions
│   │   ├── resend.ts         # Resend actions
│   │   └── lemonsqueezy.ts   # Lemon Squeezy actions
│   ├── middleware/
│   │   ├── rate-limit.ts     # Rate limiting
│   │   ├── validate.ts       # Request validation
│   │   └── scrub.ts          # Response sanitization
│   └── lib/
│       ├── execute.ts        # HTTP execution with creds
│       └── logging.ts        # Audit logging
├── wrangler.toml
└── package.json

packages/warden-client/
├── src/
│   ├── index.ts              # Client exports
│   ├── client.ts             # Warden client class
│   ├── types.ts              # Shared types
│   └── crypto.ts             # Signature generation
├── package.json
└── tsconfig.json
```

### Cloudflare Resources

```toml
# wrangler.toml
name = "grove-warden"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"

[[kv_namespaces]]
binding = "NONCES"
id = "xxx"  # For nonce storage with TTL

[[d1_databases]]
binding = "AUDIT"
database_name = "warden-audit"
database_id = "xxx"
```

---

## Security Considerations

1. **No credential exposure** — Keys never leave Warden, never in responses
2. **Challenge-response auth** — Agent secrets never transmitted
3. **Nonce single-use** — Replay attacks impossible
4. **Scope enforcement** — Agents can only perform allowed actions
5. **Response scrubbing** — Any leaked tokens in responses are stripped
6. **Audit trail** — Every request logged for accountability
7. **Rate limiting** — Prevents abuse, protects upstream quotas
8. **Key rotation** — Seamless rotation without agent disruption

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Create `workers/warden/` structure
- [ ] Define types and interfaces
- [ ] Implement nonce generation/validation (KV with TTL)
- [ ] Implement signature verification
- [ ] Basic service router

### Phase 2: Services

- [ ] GitHub service (read/write operations)
- [ ] Tavily service (search)
- [ ] Exa service (search)
- [ ] Cloudflare service (workers, KV)
- [ ] Request validation per service

### Phase 3: Security

- [ ] Scope enforcement
- [ ] Rate limiting (per-agent, per-service)
- [ ] Response scrubbing
- [ ] Audit logging to D1

### Phase 4: Client SDK

- [ ] Create `packages/warden-client/`
- [ ] Automatic nonce fetching
- [ ] Signature generation
- [ ] TypeScript types for all services

### Phase 5: Integration

- [ ] Agent registration in Heartwood
- [ ] MCP server integration
- [ ] Workflow integration
- [ ] Monitoring via Vista

---

## Future Considerations

**Short-lived tokens:** Instead of challenge-response per request, Warden could issue short-lived JWTs (5 min TTL) after initial auth. Reduces latency for burst operations.

**Webhook proxying:** Warden could receive webhooks from external services and forward to Grove, keeping webhook secrets protected.

**Request batching:** For agents making many small requests, batch them into single Warden calls.

**Service plugins:** Allow adding new services without core changes.

---

*The one who holds the keys.*

**Last updated:** February 2026
**Status:** Specification Complete
**Author:** Autumn Brown
