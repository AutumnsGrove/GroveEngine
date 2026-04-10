# Project Instructions - Agent Workflows

> **Note**: This is the main orchestrator file. For detailed guides, see `AgentUsage/README.md`

---

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Project Naming

|                       |                       |
| --------------------- | --------------------- |
| **Public name**       | Lattice               |
| **Internal codename** | Lattice               |
| **npm package**       | @autumnsgrove/lattice |

Lattice is the core framework that powers the Grove ecosystem. The name evokes a framework that supports growth—vines climb it, gardens are built around it. Use "Lattice" in user-facing documentation and marketing; use "Lattice" for internal references, database names, and infrastructure.

---

## User Identity Terminology

Grove uses specific terms for community members. **Always use these in user-facing text.**

| Identity       | Who                       | Usage                                                |
| -------------- | ------------------------- | ---------------------------------------------------- |
| **Wanderer**   | Everyone who enters Grove | "Welcome, Wanderer" — default greeting for all users |
| **Rooted**     | Subscribers (paid users)  | "You've taken root" — when someone subscribes        |
| **Pathfinder** | Trusted community guides  | Appointed by Wayfinder — similar to "Trusted Admins" |
| **Wayfinder**  | Autumn (singular)         | The grove keeper — finds and shows the way           |

**Key rules:**

- Never use "user" or "member" in user-facing text — use "Wanderer"
- Never use "subscriber" in user-facing text — use "Rooted" or "the Rooted"
- The symmetry: Wanderers _seek_ the way, the Wayfinder _shows_ the way
- Identity is separate from subscription tiers (Seedling/Sapling/Oak/Evergreen)

See `docs/grove-user-identity.md` for full documentation.

---

## Project Purpose

Multi-tenant blog platform where users get their own blogs on subdomains (username.grove.place). Built on Cloudflare infrastructure with SvelteKit, featuring an optional community feed where blogs can share posts, vote, and react with emojis.

**The Why:** This isn't just a SaaS—it's about helping friends have their own space online, away from big tech algorithms. It's solarpunk-aligned (decentralized, community-owned), and built to be genuinely helpful rather than exploitative. Grove provides queer-friendly infrastructure: safe digital spaces, especially valuable when physical environments feel hostile.

## Tech Stack

- **Language:** TypeScript, JavaScript
- **Framework:** SvelteKit 2.0+
- **Backend:** Cloudflare Workers, D1 (SQLite), KV, R2 Storage
- **Infrastructure:** Wrangler (app deployment)
- **Auth:** Heartwood (Google OAuth 2.0 + PKCE)
- **Payments:** Stripe
- **Email:** Resend
- **Styling:** Tailwind CSS
- **Package Manager:** pnpm (CI/deployments) + bun (local dev speed)

## Local Development

**Hybrid pnpm + bun workflow:** Use pnpm for dependency management (keeps lockfile in sync with CI), use bun for fast local execution.

```bash
# DEPENDENCIES - Always use pnpm (syncs with CI)
pnpm install              # Install all deps
pnpm add <package>        # Add a package

# LOCAL EXECUTION - Use bun for speed (10-50x faster)
bun run dev               # Start dev server
bun run build             # Build locally
bun x prettier --write .  # Run prettier
bun x tsc --noEmit        # Type check
```

**Why this works:** Bun uses the `node_modules` that pnpm creates—no separate lockfile needed.

**Avoid:** `bun install` or `bun add` — these update bun.lock instead of pnpm-lock.yaml, causing drift.

### Stripe Configuration

Products and prices are managed in Stripe Dashboard. Price IDs are hardcoded in `services/billing-api/src/types.ts`. Billing flows through the BillingHub (`billing.grove.place`) — a two-worker hub pattern mirroring the login hub. Set secrets via `gw secret apply` on `grove-billing-api` and `grove-billing`. Full instructions: `docs/setup/stripe-setup.md`

### Production Deployment

Apps auto-deploy via GitHub Actions on push to main. Resource IDs are hardcoded in each app's `wrangler.toml`.

---

## Design Standards

**See `DESIGN.md`** for the complete design reference: typography, color tokens, dual CSS variable system, Prism SSOT, and the Grove accent scale.

---

## Architecture Notes

**See `ARCHITECTURE.md`** for the complete architecture reference: D1 database layout (3 databases), Warden credential gateway, and key architecture documents.

---

## Essential Instructions (Always Follow)

### Grove Wrap (gw) — Required CLI

All git, GitHub, and Cloudflare operations go through `gw`. Write operations require `--write`. The `enforce-gw` hook blocks raw commands automatically.

```bash
gw context                              # Start every session here
gw git ship --write -a -m "feat: msg"   # Auto-stage + format + check + commit + push
gw dev ci --affected --fail-fast --diagnose # Verify before committing
gw git pr-prep                          # PR readiness report
```

Run `gw --help` for full commands. See `AgentUsage/git_guide.md` for details.

**Note:** `--write` is auto-implied for interactive terminal sessions but required for agents/CI/MCP. DANGEROUS-tier operations (`--write --force`) are never auto-implied.

### Core Behavior

- Do what has been asked; nothing more, nothing less
- NEVER create files unless absolutely necessary for achieving your goal
- ALWAYS prefer editing existing files to creating new ones
- NEVER proactively create documentation files (\*.md) or README files unless explicitly requested

### Verification

**See `VERIFICATION.md`** for the complete verification reference: self-verification protocol, Glimpse visual testing, Showroom component auditing, and data profiles.

**Quick reference:**

```bash
# Verify code changes before committing
pnpm install && gw dev ci --affected --fail-fast --diagnose

# Verify UI changes visually
uv run --project tools/glimpse glimpse capture http://localhost:5173/?subdomain=midnight-bloom \
  --season autumn --theme dark --logs --auto
```

### Naming Conventions

- **Directories**: Use CamelCase (e.g., `VideoProcessor`, `AudioTools`, `DataAnalysis`)
- **Date-based paths**: Use skewer-case with YYYY-MM-DD (e.g., `logs-2025-01-15`)
- **No spaces or underscores** in directory names (except date-based paths)

### Task Tracking (GitHub Issues)

- **All tasks are tracked in [GitHub Issues](https://github.com/AutumnsGrove/Lattice/issues)** — not in local files
- **Check open issues** when starting a session to understand current priorities
- **Close issues** when work is complete — reference the issue number in commits (e.g., `fixes #123`)
- **Bulk issue creation** — Use skill: `grove-issues` to parse brain dumps into structured issues

### Git Workflow

> **Use `gw git` commands, not raw git.** See gw section above.

**Conventional Commits Format (enforced by gw):**

```bash
<type>(<scope>): <brief description>
# Types: feat, fix, docs, refactor, test, chore, perf
```

**Daily workflow:**

```bash
gw context                                    # Start here
gw git ship --write -a -m "feat(auth): msg"   # Commit + push
gw git pr-prep                                # Before creating PRs
```

See `AgentUsage/git_guide.md` for complete reference.

### Claude Code Hooks

Two hooks are registered in `~/.claude/settings.json`:

- **PreToolUse `enforce-gw.py`** — Blocks raw git/gh/wrangler write commands, redirects to gw equivalents
- **PostToolUse `auto-format.py`** — Auto-runs Prettier after every Edit/Write on supported file types

### Pull Requests

Use conventional commits format for PR titles. Write a brief description of what the PR does and why.

---

## Code Standards

**See `CODE-STANDARDS.md`** for the complete code standards reference: engine-first pattern, Prism icon gateway, Signpost error handling, Rootwork type safety, database query patterns, and CSRF configuration.

---

## Skills

Skills are invoked via the Skill tool. Each skill's description explains when to use it. For help choosing a skill, invoke skill: `robin-guide`.

Skills live in `.claude/skills/` — lean instruction files with deep references loaded on demand.

### Security Skills

Grove has layered security animals — use the right one for the scope of work:

| Skill                | Focus                      | Use When                                             |
| -------------------- | -------------------------- | ---------------------------------------------------- |
| `spider-weave`       | Auth integration           | Implementing OAuth, sessions, RBAC, route protection |
| `raccoon-audit`      | Secrets & vulnerability    | Finding exposed secrets, dead code, dependency vulns |
| `turtle-harden`      | Defense-in-depth           | Layered hardening: validation, sanitization, CSP     |
| `raven-investigate`  | Quick posture assessment   | Rapid audit of any codebase (parallel sub-agents)    |
| `hawk-survey`        | Formal audit + remediation | Full STRIDE threat model across 14 domains           |
| `gathering-security` | End-to-end pipeline        | Spider → Raccoon → Turtle in coordinated sequence    |

**Credential security:** All API keys route through Warden (see `ARCHITECTURE.md`). Use `gw warden agent enroll` to register workers, `gw secret` to manage the vault.

### Gathering Chains (Multi-Animal Workflows)

When a task spans multiple specialties, gatherings orchestrate the right animals in sequence:

| Gathering                | Animals                                       | Use When                                 |
| ------------------------ | --------------------------------------------- | ---------------------------------------- |
| `gathering-feature`      | Bloodhound → Elephant → Turtle → Beaver → Owl | Full feature lifecycle                   |
| `gathering-architecture` | Eagle → Crow → Swan → Elephant                | System design → challenge → spec → build |
| `gathering-ui`           | Chameleon → Deer                              | UI design + accessibility                |
| `gathering-security`     | Spider → Raccoon → Turtle                     | Auth + audit + hardening                 |
| `gathering-migration`    | Bloodhound → Bear                             | Scout territory → migrate data           |
| `gathering-planning`     | Bee → Badger                                  | Idea capture → board organization        |

---

## Agent Ecosystem

Grove uses specialized subagents. **Prefer Grove agents** (`.claude/agents/`) over generic ones — they know gw/gf, Lattice conventions, and the monorepo.

| Task                 | Agent              |
| -------------------- | ------------------ |
| Run CI               | **grove-runner**   |
| Analyze git          | **grove-git**      |
| Code changes         | **grove-coder**    |
| Search code          | **grove-scout**    |
| Verify before commit | **grove-verifier** |

Full reference: `AgentUsage/house_agents.md`

---

## Additional Resources

- **Design standards:** `DESIGN.md` — colors, tokens, Prism, accent scale
- **Architecture:** `ARCHITECTURE.md` — D1 databases, Warden, infrastructure
- **Verification:** `VERIFICATION.md` — CI checks, Glimpse, Showroom
- **Code standards:** `CODE-STANDARDS.md` — engine-first, errors, types, queries
- **Skills:** `.claude/skills/` — primary mechanism for specialized workflows
- **Extended docs:** `AgentUsage/README.md` — master index of detailed documentation
- **Design context:** `AgentUsage/design_context.md` — brand, aesthetic, principles

---

_Last updated: 2026-04-10_
_Model: Claude Opus 4.6_
