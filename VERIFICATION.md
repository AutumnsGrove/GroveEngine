# Verification & Visual Testing

> Extracted from `AGENT.md` — the authoritative reference for verifying code changes and visual output.

---

## MANDATORY: Agent Self-Verification Protocol

**After making ANY code changes, you MUST verify your work before committing.** Do not commit broken code.

```bash
# Step 1: Ensure dependencies are in sync
pnpm install

# Step 2: Run affected-only CI
gw dev ci --affected --fail-fast --diagnose
```

**When verification fails:** Read diagnostics, fix errors, re-run, repeat until clean, THEN commit.

**When to run:** After completing code changes (before commit), after PR review feedback (before push), after multi-file refactoring.

**When to skip:** Documentation-only changes (.md files only), configuration-only changes.

**This is non-negotiable.** Every workflow must end with verification before commit.

---

## Glimpse — Visual Verification (UI Work)

**When you build, modify, or review UI, you MUST look at the result.** CI passing is not the same as looking correct. Glimpse is Grove's Playwright-based screenshot tool — it lets you see what you built.

### Quick Start (3 steps from cold start)

```bash
# 1. Seed the local database with test data
uv run --project tools/glimpse glimpse seed --yes

# 2. Capture a page (--auto starts the dev server if not running)
uv run --project tools/glimpse glimpse capture http://localhost:5173/?subdomain=midnight-bloom \
  --season autumn --theme dark --logs --auto

# 3. Read the screenshot to verify (Claude can view PNGs)
# The output path is printed in the capture output
```

That's it. `glimpse seed` sets up the database, `--auto` starts the dev server, and `?subdomain=` routes to the test tenant locally.

### Local Routing

Locally, subdomains are simulated via query parameter:

- `http://localhost:5173/?subdomain=midnight-bloom` — Home page
- `http://localhost:5173/garden?subdomain=midnight-bloom` — Blog listing
- `http://localhost:5173/garden/some-post?subdomain=midnight-bloom` — Blog post
- `http://localhost:5173/about?subdomain=midnight-bloom` — About page

### Data Profiles

Glimpse seeds local D1 databases with test content. Choose the right profile for what you're testing:

```bash
# Full curated blog (3 posts, 5 pages) — default, good for consistent verification
uv run --project tools/glimpse glimpse seed --profile blog --yes

# Empty tenant — test what new users see (no posts, no custom pages)
uv run --project tools/glimpse glimpse seed --profile empty --yes

# Random content via @faker-js/faker — proves UI works with any data, not just golden-path
uv run --project tools/glimpse glimpse seed --profile fake --fake-posts 5 --yes

# Migrations only, no seed data — clean slate
uv run --project tools/glimpse glimpse seed --profile fresh --yes
```

| Profile | Subdomain           | Use Case                                                    |
| ------- | ------------------- | ----------------------------------------------------------- |
| `blog`  | `midnight-bloom`    | Default. Curated tea shop blog with known content           |
| `empty` | `empty-grove`       | Empty state testing — what does a blank site look like?     |
| `fake`  | _(random each run)_ | Random content — proves rendering works with arbitrary data |
| `fresh` | _(none)_            | Migrations only — no tenant data at all                     |

**Use `fake` when you want to prove your UI handles real-world variation, not just the one test dataset you designed around.**

### Capture Commands

```bash
# Single page capture with theme injection
uv run --project tools/glimpse glimpse capture http://localhost:5173/?subdomain=midnight-bloom \
  --season autumn --theme dark --logs --auto

# All season × theme combinations at once
uv run --project tools/glimpse glimpse matrix http://localhost:5173/?subdomain=midnight-bloom --auto

# Interactive browsing — click around, fill forms, verify flows
uv run --project tools/glimpse glimpse browse http://localhost:5173/?subdomain=midnight-bloom \
  --do "click Posts, then scroll down" --screenshot-each --logs --auto

# Check readiness (browser, server, database)
uv run --project tools/glimpse glimpse status
```

### Dev Server Details

The `--auto` flag handles server startup automatically. If you need to manage it manually:

```bash
# Start dev server (from repo root — runs in libs/engine via wrangler)
cd libs/engine && pnpm dev:wrangler

# Stop auto-started server
uv run --project tools/glimpse glimpse stop
```

Default port is 5173. The server runs via wrangler for local D1/KV/R2 bindings.

### When to use Glimpse vs Showroom

- **Showroom first** — After building or modifying any individual UI component, run `glimpse showroom` to audit it in isolation (design tokens, spacing, focus styles, visual baselines)
- **Glimpse second** — After components pass Showroom, capture full pages with `glimpse capture`/`glimpse matrix` to verify integration
- During design skill workflows (chameleon-adapt, gathering-ui, grove-ui-design) — both gates are required
- When verifying accessibility (deer-sense) — Showroom for component a11y, Glimpse for page-level a11y
- Before declaring UI work complete — Showroom → Glimpse → review → iterate
- When reviewing someone else's UI changes

**The iterate loop:** Capture → look at screenshot → fix issues → capture again. Don't ship UI you haven't seen.

**Output modes:** `--agent` for CI-style output, `--json` for structured data, default for rich terminal display. Use `--logs` to surface console errors alongside screenshots.

**Full spec:** `docs/specs/glimpse-spec.md`

---

## Showroom — Component-Level Visual Auditing

**When you build, modify, or review individual UI components, you MUST audit them in isolation.** Glimpse captures full pages; Showroom isolates single `.svelte` components, renders them with controlled props and scenarios, runs design compliance checks (color tokens, spacing grid, typography, focus styles), and diffs against visual baselines.

**This is a required gate for component work.** You cannot declare a component "done" without a passing Showroom audit. Page-level Glimpse captures are not a substitute — they don't catch component-level issues like missing focus rings, off-grid spacing, or hardcoded colors hidden behind page context.

```bash
# Audit a component (auto-starts the Showroom server)
uv run --project tools/glimpse glimpse showroom \
  libs/engine/src/lib/ui/components/primitives/button/button.svelte

# Scaffold a fixture file for a new component (generates .showroom.ts)
uv run --project tools/glimpse glimpse showroom \
  libs/engine/src/lib/ui/components/ui/MyNewComponent.svelte --scaffold

# Audit with specific scenario/theme
uv run --project tools/glimpse glimpse showroom \
  libs/engine/src/lib/ui/components/primitives/button/button.svelte \
  --scenario destructive --theme dark

# Update visual baselines after intentional design changes
uv run --project tools/glimpse glimpse showroom \
  libs/engine/src/lib/ui/components/primitives/button/button.svelte \
  --update-baselines
```

**What the audit checks:**
- **Color tokens** — Flags hardcoded hex/rgb values not using CSS custom properties
- **Spacing grid** — Verifies all spacing aligns to 4px increments
- **Typography scale** — Ensures font sizes follow the design scale
- **Focus styles** — Checks interactive elements have visible focus indicators
- **Heading hierarchy** — Validates heading levels don't skip
- **Image alt text** — Ensures images have alt attributes
- **Visual diff** — Compares screenshots against baselines to catch regressions

**Output:** An audit bundle in `.glimpse/showroom/` containing screenshots (light + dark), compliance results, and visual diffs.

**When to use Showroom vs Glimpse:**

| Tool | Scope | Use When |
|------|-------|----------|
| **Showroom** | Single component in isolation | Building/modifying a component, reviewing component PRs, verifying design token compliance |
| **Glimpse** | Full page with real data | Verifying page layouts, user flows, seasonal themes, integration testing |

**The component gate:** After building or modifying any UI component → `glimpse showroom <component>` → review audit → fix violations → re-audit → THEN use Glimpse for full-page verification. Both gates must pass before shipping.
