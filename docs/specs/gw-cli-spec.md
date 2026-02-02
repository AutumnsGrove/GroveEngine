---
aliases: []
date created: Sunday, February 2nd 2026
date modified: Sunday, February 2nd 2026
tags:
  - lattice
  - cloudflare
  - tooling
  - agent-integration
type: tech-spec
---

```
                    ╭──────────────────────────────────╮
                    │     🌿  G R O V E W R A P  🌿    │
                    │                                  │
                    │   ┌────┐  ┌────┐  ┌────┐        │
                    │   │ D1 │──│ KV │──│ R2 │        │
                    │   └──┬─┘  └──┬─┘  └──┬─┘        │
                    │      │       │       │          │
                    │      └───────┼───────┘          │
                    │              │                  │
                    │         ╭────┴────╮             │
                    │         │   gw    │             │
                    │         ╰────┬────╯             │
                    │              │                  │
                    │    ┌─────────┴─────────┐        │
                    │    ▼                   ▼        │
                    │  Human              Agent       │
                    │  (safe)            (safer)      │
                    │                                  │
                    ╰──────────────────────────────────╯

             The trellis that holds the wild growth in check.
```

> *A friendly fence around Wrangler's garden. Safe enough for agents, fast enough for humans.*

**Public Name:** Grove Wrap (gw)
**Internal Name:** GroveWrap
**Package:** `tools/gw/` (Python + UV)
**Issue:** [#348](https://github.com/AutumnsGrove/GroveEngine/issues/348)
**Last Updated:** February 2026

Grove Wrap (`gw`) is a CLI abstraction over Wrangler that provides:
- **Safety guards** for database operations (read-only by default)
- **Grove-aware shortcuts** (knows database IDs, table names, common queries)
- **Agent integration** (MCP server mode for Claude Code)
- **Cache management** (the most-requested feature)
- **Human-friendly output** (Rich terminal UI)

This tool exists because fighting Wrangler is a daily occurrence. 116 `wrangler d1 execute` calls in our conversation history. Memorizing UUIDs. Getting column names wrong. Accidentally running DELETEs. This ends now.

---

## Goals

1. **Never type a database UUID again** - `gw` knows them all
2. **Read-only by default** - Write operations require explicit `--write` flag
3. **Agent-safe** - Can be auto-approved in Claude Code without fear
4. **Fast iteration** - Common operations as one-liners
5. **Cache busting** - Finally solve issue #527 from the CLI
6. **Extensible** - Add new commands without Wrangler's complexity

## Non-Goals

- Replacing Wrangler entirely (we still need it for deployments)
- Supporting non-Grove Cloudflare accounts
- Being a general-purpose database tool

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              gw CLI                                     │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   gw db     │  │   gw kv     │  │   gw r2     │  │  gw cache   │    │
│  │             │  │             │  │             │  │             │    │
│  │ • query     │  │ • get       │  │ • list      │  │ • list      │    │
│  │ • tables    │  │ • put       │  │ • get       │  │ • purge     │    │
│  │ • schema    │  │ • delete    │  │ • put       │  │ • stats     │    │
│  │ • tenant    │  │ • list      │  │ • delete    │  │             │    │
│  │ • migrate   │  │             │  │             │  │             │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │           │
│         └────────────────┼────────────────┼────────────────┘           │
│                          │                │                            │
│                    ┌─────┴────────────────┴─────┐                       │
│                    │      Safety Layer          │                       │
│                    │  • Read-only default       │                       │
│                    │  • Row limits on DELETE    │                       │
│                    │  • Protected tables        │                       │
│                    │  • Audit logging           │                       │
│                    └─────────────┬──────────────┘                       │
│                                  │                                      │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │         Wrangler CLI         │
                    │   (subprocess execution)     │
                    └──────────────────────────────┘
```

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | Python 3.11+ | Rich terminal UI, fast iteration with UV |
| Package Manager | UV | Already used in Grove, instant startup |
| CLI Framework | Click | Battle-tested, good for subcommands |
| Terminal UI | Rich | Tables, panels, progress bars |
| Config | TOML | Matches wrangler.toml pattern |
| Wrangler Integration | Subprocess | Wraps existing commands |

---

## Command Reference

### Database Commands (`gw db`)

The most-used commands based on our usage analysis.

```bash
# List all databases (no more wrangler d1 list)
gw db list

# Query the main database (read-only by default)
gw db query "SELECT * FROM tenants WHERE subdomain = 'autumn'"

# Query with a named database alias
gw db query --db lattice "SELECT * FROM feature_flags"

# Show tables in a database
gw db tables
gw db tables --db groveauth

# Show schema for a table
gw db schema tenants
gw db schema --db lattice posts

# Get tenant info (common operation)
gw db tenant autumn           # By subdomain
gw db tenant --email user@example.com

# Run migrations
gw db migrate --file migrations/042_new_table.sql
gw db migrate --file migrations/042_new_table.sql --write  # Actually apply
```

### Write Operations (Require `--write` flag)

```bash
# DELETE with safety checks
gw db query --write "DELETE FROM sessions WHERE tenant_id = 'abc'"

# INSERT/UPDATE
gw db query --write "UPDATE tenants SET plan = 'oak' WHERE id = 'abc'"

# Bypass row limit (dangerous, requires confirmation)
gw db query --write --no-limit "DELETE FROM old_logs WHERE created_at < '2025-01-01'"
```

### Cache Commands (`gw cache`) — Issue #527

```bash
# List cached keys for a tenant
gw cache list autumn

# List all cache keys (paginated)
gw cache list --all

# Purge specific key
gw cache purge "cache:autumn:homepage"

# Purge all keys for a tenant
gw cache purge --tenant autumn

# Purge CDN edge cache (Cloudflare API)
gw cache purge --cdn autumn.grove.place
gw cache purge --cdn --all  # Full zone purge (requires confirmation)

# Show cache stats
gw cache stats
```

### KV Commands (`gw kv`)

```bash
# List keys in a namespace
gw kv list              # Default: CACHE_KV
gw kv list --ns FLAGS_KV

# Get a value
gw kv get "config:autumn"

# Set a value (requires --write)
gw kv put --write "config:autumn" '{"theme": "dark"}'

# Delete a key (requires --write)
gw kv delete --write "config:autumn"
```

### R2 Commands (`gw r2`)

```bash
# List buckets
gw r2 list

# List objects in a bucket
gw r2 ls grove-media
gw r2 ls grove-media --prefix "autumn/"

# Get object info
gw r2 info grove-media autumn/avatar.png

# Download object
gw r2 get grove-media autumn/avatar.png ./avatar.png

# Upload object (requires --write)
gw r2 put --write grove-media autumn/new-image.png ./local.png

# Delete object (requires --write)
gw r2 rm --write grove-media autumn/old-image.png
```

### Durable Objects Commands (`gw do`)

```bash
# List Durable Objects classes
gw do list

# Get DO status/info
gw do info TenantDO
gw do info PostMetaDO

# List active instances
gw do instances TenantDO
gw do instances TenantDO --limit 10

# Wake/ping a specific DO
gw do ping TenantDO autumn

# List alarms (scheduled work)
gw do alarms TenantDO

# Delete DO storage (dangerous! requires --write --force)
gw do reset --write --force TenantDO autumn
```

### Secrets Management (`gw secret`) — Agent-Safe!

This is the **killer feature** for agent safety. Secrets are stored in a local vault
and can be applied to Wrangler without the agent ever seeing the actual value.

```bash
# === HUMAN-ONLY COMMANDS (require interactive input) ===

# Set a secret (prompts for value, NEVER echoes it)
gw secret set TAVILI_API_KEY
# > Enter value for TAVILI_API_KEY: ********
# > ✓ Secret stored in ~/.grove/secrets.enc

# Set from stdin (for scripts)
echo "sk_live_xxx" | gw secret set STRIPE_SECRET_KEY

# List secret NAMES (never values)
gw secret list
# > TAVILI_API_KEY      (set 2026-02-01)
# > STRIPE_SECRET_KEY   (set 2026-01-15)
# > RESEND_API_KEY      (set 2026-01-10)

# Delete a secret
gw secret delete TAVILI_API_KEY


# === AGENT-SAFE COMMANDS (can be auto-approved) ===

# Apply a secret to a worker (agent never sees the value!)
gw secret apply TAVILI_API_KEY --worker grove-lattice
# > ✓ Applied TAVILI_API_KEY to grove-lattice

# Apply multiple secrets
gw secret apply STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET --worker grove-lattice

# Check if a secret exists (returns exit code, no value exposure)
gw secret exists TAVILI_API_KEY
# > ✓ Secret exists

# Sync all secrets to a worker
gw secret sync --worker grove-lattice
# > Syncing 5 secrets to grove-lattice...
# > ✓ TAVILI_API_KEY
# > ✓ STRIPE_SECRET_KEY
# > ✓ RESEND_API_KEY
# > ...
```

**Security Model:**
- Secrets stored encrypted at `~/.grove/secrets.enc`
- Master key derived from system keychain (macOS) or password
- Agent commands NEVER return secret values in output
- Even `gw secret list` only shows names, not values
- Audit log tracks all secret applications

### Deployment Helpers (`gw deploy`)

```bash
# Deploy a specific package
gw deploy engine
gw deploy landing
gw deploy router

# Deploy with preview (dry run)
gw deploy engine --preview

# Deploy all packages
gw deploy --all

# Deploy with specific options
gw deploy engine --message "Fix auth bug"

# Tail logs after deploy
gw deploy engine --tail

# Quick rollback (deploys previous version)
gw deploy engine --rollback
```

### Logs Commands (`gw logs`)

```bash
# Tail logs from a worker
gw logs engine
gw logs engine --follow          # Live tail
gw logs engine --since 1h        # Last hour
gw logs engine --filter error    # Only errors

# Tail multiple workers
gw logs engine router

# JSON output for parsing
gw logs engine --json
```

### Backup Commands (`gw backup`)

```bash
# List existing backups
gw backup list
gw backup list --db lattice

# Create a backup
gw backup create lattice
gw backup create lattice --name "pre-migration-2026-02"
# > ✓ Backup saved to ~/.grove/backups/lattice-2026-02-02-1200.sql

# Restore from backup (requires --write)
gw backup restore --write lattice backup-2026-02-01.sql
gw backup restore --write lattice --latest  # Most recent backup

# Export to file
gw backup export lattice ./my-backup.sql
```

### Feature Flags Commands (`gw flag`)

```bash
# List all flags
gw flag list
gw flag list --tenant autumn

# Get flag status
gw flag get gallery_v2
gw flag get gallery_v2 --tenant autumn

# Enable/disable a flag (requires --write)
gw flag enable --write gallery_v2
gw flag enable --write gallery_v2 --tenant autumn
gw flag disable --write timeline_ai

# Check flag rules
gw flag rules gallery_v2

# Quick toggle (enable if disabled, disable if enabled)
gw flag toggle --write gallery_v2
```

### Health Check Commands (`gw health`)

```bash
# Check all services
gw health
# ┌────────────────┬────────┬──────────┐
# │ Service        │ Status │ Latency  │
# ├────────────────┼────────┼──────────┤
# │ Engine         │ ✓ OK   │ 145ms    │
# │ Router         │ ✓ OK   │ 89ms     │
# │ Heartwood      │ ✓ OK   │ 112ms    │
# │ Meadow         │ ✓ OK   │ 203ms    │
# │ Clearing       │ ✓ OK   │ 156ms    │
# │ CDN            │ ✓ OK   │ 45ms     │
# └────────────────┴────────┴──────────┘

# Check specific service
gw health engine
gw health --deep  # Full health checks (slower, more thorough)

# JSON output for monitoring
gw health --json
```

### Tenant Commands (`gw tenant`)

These commands wrap the logic from the `grove-account-deletion` skill and make it CLI-accessible.

```bash
# Look up tenant info
gw tenant autumn                      # By subdomain
gw tenant --email user@example.com    # By email
gw tenant --id abc-123                # By ID

# Get tenant stats
gw tenant stats autumn
# > Tenant: autumn (autumn.grove.place)
# > Plan: oak
# > Created: 2025-11-24
# > ───────────────────────
# > Posts: 47
# > Pages: 12
# > Media: 234 files (1.2 GB)
# > Sessions: 3 active
# > ───────────────────────
# > Storage used: 1.45 GB of 20 GB

# Create a new tenant (interactive wizard)
gw tenant create
# > Subdomain: newblog
# > Display name: My New Blog
# > Email: user@example.com
# > Plan [seedling/sapling/oak/evergreen]: sapling
# > ✓ Created tenant newblog (id: xxx-xxx)

# Delete a tenant (DANGEROUS - requires --write --force)
gw tenant delete --write --force autumn
# > ⚠️  This will DELETE all data for tenant 'autumn':
# >    - 47 posts
# >    - 12 pages
# >    - 234 media files
# >    - 3 sessions
# >    - All settings, products, orders, subscriptions
# >
# > Type 'DELETE autumn' to confirm: DELETE autumn
# > ✓ Tenant deleted

# Preview deletion (no --write, shows what would be deleted)
gw tenant delete autumn
# > Would delete: 47 posts, 12 pages, 234 media files...
```

### Email Test Commands (`gw email`)

```bash
# Send a test email
gw email test user@example.com
# > ✓ Test email sent to user@example.com via Resend

# Send with specific template
gw email test user@example.com --template welcome
gw email test user@example.com --template password-reset

# Check email config
gw email status
# > Resend API: ✓ Configured
# > Domain: grove.place (verified)
# > Sending from: noreply@grove.place
```

### Heartwood Auth Client Commands (`gw auth client`)

Register and manage OAuth clients with Heartwood. This automates the painful manual process
from the `grove-auth-integration` skill.

```bash
# === CLIENT REGISTRATION ===

# Create a new OAuth client (interactive wizard)
gw auth client create grove-plant
# > Display Name: Grove Plant
# > Production URL: https://plant.grove.place
# > Callback Path [/auth/callback]: /auth/callback
# > Include localhost? [Y/n]: Y
# >
# > Generating client secret...
# > ✓ Client secret generated (stored in vault)
# > ✓ Base64url hash computed
# > ✓ Client registered in Heartwood DB
# >
# > Client ID: grove-plant
# > Redirect URIs:
# >   - https://plant.grove.place/auth/callback
# >   - http://localhost:5173/auth/callback
# >
# > Next steps:
# >   gw secret apply GROVEAUTH_CLIENT_SECRET --worker grove-plant

# Create with all options specified (non-interactive)
gw auth client create arbor-admin \
  --name "Arbor Admin Panel" \
  --url "https://arbor.grove.place" \
  --callback "/auth/callback" \
  --localhost

# === CLIENT MANAGEMENT ===

# List all registered clients
gw auth client list
# ┌──────────────────┬────────────────────────┬─────────────────────────────────────────┐
# │ Client ID        │ Name                   │ Redirect URIs                           │
# ├──────────────────┼────────────────────────┼─────────────────────────────────────────┤
# │ grove-lattice    │ Grove Engine           │ https://grove.place/auth/callback, ...  │
# │ grove-plant      │ Grove Plant            │ https://plant.grove.place/auth/callback │
# │ arbor-admin      │ Arbor Admin Panel      │ https://arbor.grove.place/auth/callback │
# │ grove-domains    │ Domain Search          │ https://domains.grove.place/auth/callb  │
# └──────────────────┴────────────────────────┴─────────────────────────────────────────┘

# Get details for a specific client
gw auth client info grove-plant

# === SECRET ROTATION ===

# Rotate client secret (generates new secret, updates DB)
gw auth client rotate grove-plant
# > ⚠️  This will invalidate the current secret!
# > Proceed? [y/N]: y
# >
# > ✓ New secret generated (stored in vault)
# > ✓ Heartwood DB updated
# >
# > Apply the new secret:
# >   gw secret apply GROVEAUTH_CLIENT_SECRET_GROVE_PLANT --worker grove-plant

# === CLIENT REMOVAL ===

# Delete a client (requires --write)
gw auth client delete --write grove-test
# > ✓ Client 'grove-test' removed from Heartwood

# === FULL SETUP HELPER ===

# Complete setup: create client + apply secrets to worker
gw auth client setup grove-plant --worker grove-plant
# > Creating client 'grove-plant'...
# > ✓ Client registered
# >
# > Applying secrets to worker 'grove-plant'...
# > ✓ GROVEAUTH_CLIENT_ID
# > ✓ GROVEAUTH_CLIENT_SECRET (from vault)
# > ✓ GROVEAUTH_REDIRECT_URI
# > ✓ GROVEAUTH_URL
# >
# > ✓ grove-plant is ready for Heartwood auth!
```

**Why this is a game-changer:**
- No more manual base64url hash generation (gets the encoding wrong 50% of the time)
- No more copy-pasting UUIDs
- No more forgetting localhost in redirect URIs
- Client secret goes straight to the vault (agent-safe!)
- One command to set up an entire auth flow

### Status & Info Commands

```bash
# Show Grove infrastructure status
gw status

# Show database info
gw info db
gw info db --db groveauth

# Show all bindings from wrangler.toml
gw bindings

# Check wrangler authentication
gw auth check
gw auth login  # Re-authenticate if needed
```

### Diagnostics (`gw doctor`)

Like `brew doctor` - diagnoses common issues and suggests fixes.

```bash
gw doctor
# ┌─────────────────────────────────────────────────────────────────┐
# │                     Grove Diagnostics                          │
# ├─────────────────────────────────────────────────────────────────┤
# │ ✓ Wrangler installed (v4.50.0)                                 │
# │ ✓ Wrangler authenticated                                       │
# │ ✓ Config file exists (~/.grove/gw.toml)                        │
# │ ✓ Secrets vault initialized                                    │
# │ ⚠ Wrangler update available (4.50.0 → 4.61.1)                  │
# │ ✓ grove-engine-db accessible                                   │
# │ ✓ groveauth accessible                                         │
# │ ✓ CACHE_KV accessible                                          │
# │ ✓ grove-media bucket accessible                                │
# │ ✓ CF_API_TOKEN set (for CDN purge)                             │
# ├─────────────────────────────────────────────────────────────────┤
# │ 1 warning                                                      │
# │                                                                 │
# │ To fix:                                                         │
# │   npm install -g wrangler@latest                               │
# └─────────────────────────────────────────────────────────────────┘

# Check specific subsystem
gw doctor db      # Database connectivity
gw doctor auth    # Wrangler + Heartwood auth
gw doctor secrets # Vault health
```

### Identity (`gw whoami`)

Show current context and authentication status.

```bash
gw whoami
# ┌─────────────────────────────────────────────────────────────────┐
# │ Cloudflare Account                                             │
# │   Email: autumn@autumnsgrove.com                               │
# │   Account ID: abc123...                                        │
# │   Account Name: Autumn's Grove                                 │
# ├─────────────────────────────────────────────────────────────────┤
# │ Current Project                                                │
# │   Directory: /Users/autumn/Documents/Projects/GroveEngine      │
# │   Wrangler Config: packages/engine/wrangler.toml               │
# │   Default DB: grove-engine-db                                  │
# ├─────────────────────────────────────────────────────────────────┤
# │ Secrets Vault                                                  │
# │   Location: ~/.grove/secrets.enc                               │
# │   Secrets stored: 12                                           │
# │   Last modified: 2026-02-01 14:30                              │
# └─────────────────────────────────────────────────────────────────┘
```

### Command History (`gw history`)

Show recent commands with timestamps for audit trail and easy re-run.

```bash
gw history
# ┌─────┬─────────────────────┬────────────────────────────────────────────┐
# │ ID  │ Timestamp           │ Command                                    │
# ├─────┼─────────────────────┼────────────────────────────────────────────┤
# │ 12  │ 2026-02-01 15:30:42 │ gw db query "SELECT * FROM tenants LIM... │
# │ 11  │ 2026-02-01 15:28:15 │ gw cache purge --tenant autumn            │
# │ 10  │ 2026-02-01 15:25:03 │ gw tenant stats autumn                    │
# │ 9   │ 2026-02-01 14:55:22 │ gw secret apply STRIPE_KEY --worker eng.. │
# │ 8   │ 2026-02-01 14:50:11 │ gw health                                 │
# └─────┴─────────────────────┴────────────────────────────────────────────┘

# Show last N commands
gw history --limit 5

# Show only write operations
gw history --writes

# Re-run a command by ID
gw history run 12

# Search history
gw history search "tenant"

# Clear history
gw history clear
```

### Shell Completions

Tab-complete everything: commands, database names, table names, tenant subdomains.

```bash
# Install completions (one-time setup)
gw completion install
# > Detected shell: zsh
# > Added completion to ~/.zshrc
# > Run 'source ~/.zshrc' or restart your shell

# Generate completion script manually
gw completion bash > /etc/bash_completion.d/gw
gw completion zsh > ~/.zfunc/_gw
gw completion fish > ~/.config/fish/completions/gw.fish

# What gets completed:
gw db <TAB>        → list, tables, schema, query, tenant, migrate
gw db --db <TAB>   → lattice, groveauth, clearing, amber, ...
gw db schema <TAB> → tenants, posts, pages, users, sessions, ...
gw tenant <TAB>    → autumn, mom, test-user, ...
gw cache purge --tenant <TAB> → autumn, mom, ...
gw secret apply <TAB> → STRIPE_KEY, RESEND_API_KEY, TAVILI_KEY, ...
```

---

## Configuration

### Database Aliases (`~/.grove/gw.toml`)

```toml
[databases]
# Default database for `gw db` commands
default = "grove-engine-db"

# Named aliases (no more UUIDs!)
[databases.lattice]
name = "grove-engine-db"
id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[databases.groveauth]
name = "groveauth"
id = "45eae4c7-8ae7-4078-9218-8e1677a4360f"

[databases.clearing]
name = "daily-clearing-db"
id = "1fb94ac6-53c6-49d6-9388-a6f585f86196"

[databases.amber]
name = "amber"
id = "f688021b-a986-495a-94bb-352354768a22"

[kv_namespaces]
default = "CACHE_KV"

[kv_namespaces.cache]
title = "CACHE_KV"
id = "514e91e81cc44d128a82ec6f668303e4"

[kv_namespaces.flags]
title = "FLAGS_KV"
id = "65a600876aa14e9cbec8f8acd7d53b5f"

[r2_buckets]
default = "grove-media"

[safety]
# Default safety settings
max_delete_rows = 100
max_update_rows = 500
protected_tables = ["users", "tenants", "subscriptions", "payments"]

[cache]
# Cloudflare API for CDN purge
zone_id = "your-zone-id"  # Set via: gw config set cache.zone_id VALUE
```

### Protected Tables

These tables cannot be modified without explicit `--force` flag:

| Table | Reason |
|-------|--------|
| `tenants` | Core identity data |
| `users` | User accounts |
| `subscriptions` | Billing data |
| `payments` | Financial records |
| `sessions` | Auth state (use Heartwood) |

---

## Safety Model

### Read-Only by Default

```
┌─────────────────────────────────────────────────────────────────┐
│                      SAFETY FLOW                                │
│                                                                 │
│  ┌───────────┐                                                  │
│  │  Command  │                                                  │
│  └─────┬─────┘                                                  │
│        │                                                        │
│        ▼                                                        │
│  ┌───────────────┐     YES    ┌─────────────────┐              │
│  │ Is it a read? │──────────▶ │ Execute freely  │              │
│  └───────┬───────┘            └─────────────────┘              │
│          │ NO                                                   │
│          ▼                                                      │
│  ┌───────────────┐     NO     ┌─────────────────┐              │
│  │ --write flag? │──────────▶ │ Block + explain │              │
│  └───────┬───────┘            └─────────────────┘              │
│          │ YES                                                  │
│          ▼                                                      │
│  ┌───────────────┐     YES    ┌─────────────────┐              │
│  │ Protected     │──────────▶ │ Require --force │              │
│  │ table?        │            └─────────────────┘              │
│  └───────┬───────┘                                              │
│          │ NO                                                   │
│          ▼                                                      │
│  ┌───────────────┐     YES    ┌─────────────────┐              │
│  │ Row limit     │──────────▶ │ Block + show    │              │
│  │ exceeded?     │            │ affected count  │              │
│  └───────┬───────┘            └─────────────────┘              │
│          │ NO                                                   │
│          ▼                                                      │
│  ┌─────────────────┐                                            │
│  │ Execute + log   │                                            │
│  └─────────────────┘                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Mode

When called from Claude Code (detected via environment), additional safety:

```bash
# Agent mode restrictions:
# - max_delete_rows = 50 (not 100)
# - max_update_rows = 200 (not 500)
# - All writes logged to ~/.grove/audit.log
# - No --force allowed (must use human mode)

GW_AGENT_MODE=1 gw db query --write "DELETE FROM posts WHERE id = 'abc'"
```

---

## MCP Server Mode

For Claude Code integration, `gw` can run as an MCP server:

```bash
# Start MCP server
gw mcp serve

# In Claude Code settings.json:
{
  "mcpServers": {
    "grove-wrap": {
      "command": "gw",
      "args": ["mcp", "serve"]
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `grove_db_query` | Execute read-only SQL |
| `grove_db_tables` | List tables |
| `grove_db_schema` | Get table schema |
| `grove_db_tenant` | Look up tenant info |
| `grove_cache_list` | List cache keys |
| `grove_cache_purge` | Purge cache (with confirmation) |
| `grove_kv_get` | Get KV value |
| `grove_r2_list` | List R2 objects |
| `grove_status` | Infrastructure status |

---

## Integration with grove-find

The `gw` CLI integrates with the existing `grove-find.sh` toolkit:

```bash
# Source grove-find to get gw shortcuts
source scripts/repo/grove-find.sh

# New functions added:
gwd                    # Alias for: gw db
gwq "sql"              # Quick query: gw db query "sql"
gwt                    # Tables: gw db tables
gwc tenant             # Cache purge: gw cache purge --tenant
gws                    # Status: gw status
```

---

## Directory Structure

```
tools/gw/
├── pyproject.toml          # UV project config
├── src/
│   └── gw/
│       ├── __init__.py
│       ├── cli.py          # Main CLI entry point (Click)
│       ├── commands/
│       │   ├── __init__.py
│       │   ├── db.py       # Database commands
│       │   ├── kv.py       # KV commands
│       │   ├── r2.py       # R2 commands
│       │   ├── cache.py    # Cache commands
│       │   ├── do.py       # Durable Objects commands
│       │   ├── secret.py   # Secrets management (agent-safe!)
│       │   ├── deploy.py   # Deployment helpers
│       │   ├── logs.py     # Worker log tailing
│       │   ├── backup.py   # D1 backup/restore
│       │   ├── flag.py     # Feature flag management
│       │   ├── health.py   # Service health checks
│       │   ├── tenant.py   # Tenant CRUD operations
│       │   ├── email.py    # Email testing
│       │   ├── auth.py     # Heartwood client management
│       │   ├── doctor.py   # Diagnostic checks
│       │   ├── whoami.py   # Identity display
│       │   ├── history.py  # Command history
│       │   └── status.py   # Status commands
│       ├── completions/
│       │   ├── __init__.py
│       │   ├── bash.py     # Bash completion generator
│       │   ├── zsh.py      # Zsh completion generator
│       │   └── fish.py     # Fish completion generator
│       ├── safety.py       # Safety layer (ports database-safety.ts)
│       ├── config.py       # Configuration loading
│       ├── wrangler.py     # Wrangler subprocess wrapper
│       ├── secrets_vault.py # Encrypted secrets storage
│       ├── cloudflare.py   # Cloudflare API client
│       ├── mcp_server.py   # MCP server implementation
│       └── ui.py           # Rich terminal output
├── tests/
│   ├── test_safety.py
│   ├── test_db.py
│   ├── test_secrets.py
│   ├── test_tenant.py
│   └── test_config.py
└── README.md
```

---

## Security Considerations

1. **No secrets in config** - Zone ID/API keys stored via `wrangler secret` or env vars
2. **Audit logging** - All write operations logged with timestamp, user, query
3. **Row limits** - Prevent accidental mass deletion
4. **Protected tables** - Extra confirmation for sensitive data
5. **No --force in agent mode** - Humans must approve destructive operations

---

## Implementation Phases

### Phase 1: Foundation & Status (Week 1) ✨ START HERE

- [ ] Project setup (UV, Click, Rich)
- [ ] Config loading from `~/.grove/gw.toml`
- [ ] Wrangler subprocess wrapper
- [ ] `gw status` - Infrastructure overview (FIRST COMMAND)
- [ ] `gw health` - Service health checks
- [ ] `gw bindings` - Show all bindings from wrangler.toml
- [ ] `gw auth check/login` - Authentication helpers
- [ ] Basic Rich UI patterns established

### Phase 2: Core DB & Tenant (Week 2)

- [ ] `gw db list` - List databases
- [ ] `gw db tables` - List tables
- [ ] `gw db schema` - Show table schema
- [ ] `gw db query` - Read-only queries
- [ ] Safety layer for writes (port database-safety.ts)
- [ ] `gw tenant` - Tenant lookup (by subdomain/email/id)
- [ ] `gw tenant stats` - Tenant statistics
- [ ] Basic tests

### Phase 3: Secrets & Cache (Week 3) 🔐 SECURITY MILESTONE

- [ ] Encrypted secrets vault (`~/.grove/secrets.enc`)
- [ ] System keychain integration (macOS Keychain)
- [ ] `gw secret set/list/delete` - Human-only commands
- [ ] `gw secret apply/sync` - Agent-safe commands
- [ ] `gw cache list` - List cached keys
- [ ] `gw cache purge` - Purge keys (tenant/CDN)
- [ ] Cloudflare API integration (CF_API_TOKEN env var)

### Phase 4: Logs, Backup, Flags (Week 4)

- [ ] `gw logs` - Tail worker logs with filtering
- [ ] `gw backup create/list` - D1 backups
- [ ] `gw backup restore` - Restore from backup
- [ ] `gw flag list/get` - Feature flag queries
- [ ] `gw flag enable/disable` - Flag management

### Phase 5: KV, R2, DOs (Week 5)

- [ ] `gw kv get/list` - KV read operations
- [ ] `gw kv put/delete` - KV write operations
- [ ] `gw r2 list/ls` - List buckets and objects
- [ ] `gw r2 get/put/rm` - Object operations
- [ ] `gw do list/info` - DO introspection
- [ ] `gw do instances/alarms` - Instance management

### Phase 6: Tenant Management & Email (Week 6)

- [ ] `gw tenant create` - Interactive creation wizard
- [ ] `gw tenant delete` - Safe deletion with CASCADE preview
- [ ] `gw email test` - Test email sending
- [ ] `gw email status` - Email config check
- [ ] `gw deploy` - Deployment helpers

### Phase 6.5: Heartwood Client Management (Week 6-7) 🔐

- [ ] `gw auth client create` - Interactive client registration
- [ ] `gw auth client list` - List all registered clients
- [ ] `gw auth client info` - Get client details
- [ ] `gw auth client rotate` - Rotate client secret
- [ ] `gw auth client delete` - Remove a client
- [ ] `gw auth client setup` - Full setup wizard (create + apply secrets)
- [ ] Base64url hash generation (critical - gets encoding right!)
- [ ] Integration with `gw secret` vault

### Phase 7: Agent Integration (Week 7) 🤖 MCP MILESTONE

- [ ] MCP server implementation
- [ ] Agent mode safety restrictions
- [ ] grove-find.sh integration (`gwq`, `gwc`, `gws`, etc.)
- [ ] Claude Code settings documentation
- [ ] Full test coverage

### Phase 7.5: Quality of Life (Week 7-8)

- [ ] `gw doctor` - Diagnostic checks
- [ ] `gw whoami` - Identity and context display
- [ ] `gw history` - Command history with re-run
- [ ] Shell completions (bash, zsh, fish)
- [ ] Dynamic completion for db names, tables, tenants

### Phase 8 (v2): Advanced Features

- [ ] `gw shell` - Interactive REPL mode
- [ ] `gw ai quota` - AI Gateway usage/limits
- [ ] `gw inspect <request-id>` - Debug specific requests
- [ ] `gw replay` - Replay webhooks for debugging
- [ ] `gw metrics` - Quick metrics dashboard
- [ ] `gw tunnel` - Quick cloudflared tunnel for local dev

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to query a table | < 3 seconds (vs 10+ with wrangler) |
| Commands memorized | 0 UUIDs needed |
| Accidental deletes | 0 (safety layer) |
| Agent auto-approval | Safe for all read operations |

---

## Related

- **Issue #348**: Database safety layer integration (parent issue)
- **Issue #527**: Cache management admin tool (CLI implementation)
- **database-safety.ts**: TypeScript safety layer (pattern to port)
- **grove-find.sh**: Existing search toolkit (integration target)

---

*The best CLI is the one you don't have to think about. Just type `gw` and go.*
