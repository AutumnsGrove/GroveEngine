# CI/CD Patterns for Lattice

## Overview

Lattice uses **GitHub Actions** for CI/CD, **pnpm workspaces** for monorepo dependency management, and **Cloudflare** (Pages + Workers) for deployment. The `gw` CLI wraps common CI operations with safety checks and monorepo awareness.

**When to use this guide:**
- Setting up or debugging CI workflows
- Running CI checks locally before pushing
- Understanding the deployment pipeline
- Adding CI for new apps or services

---

## Quick Reference

### Local CI with `gw`

```bash
# Full CI pipeline (lint + typecheck + test + build)
gw ci

# Quick checks only (lint + typecheck)
gw ci --quick

# Run only affected packages (based on git diff)
gw ci --affected

# Full pipeline with diagnostics on failure
gw ci --affected --fail-fast --diagnose
```

### Manual Steps

```bash
# Lint
pnpm -r run lint

# Type check
pnpm -r run check

# Test
pnpm -r run test:run

# Build
pnpm -r run build
```

---

## GitHub Actions Workflow Structure

Workflows live in `.github/workflows/`. The primary CI workflow runs on push and PR.

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm -r run lint

      - name: Type check
        run: pnpm -r run check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm -r run test:run

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-check, test]
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build all packages
        run: pnpm -r run build
```

---

## Monorepo-Specific Patterns

### Running Commands Across Workspaces

```bash
# Run in all packages that have the script
pnpm -r run build

# Run in a specific package
pnpm --filter @autumnsgrove/lattice run test:run

# Run in a package and its dependencies
pnpm --filter @autumnsgrove/lattice... run build

# Run in packages that changed since main
pnpm --filter "...[origin/main]" run test:run
```

### Dependency Caching

Always use `--frozen-lockfile` in CI to ensure reproducible builds:

```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

pnpm's built-in caching with `actions/setup-node` handles the rest.

---

## Deployment

### Auto-Deploy on Push to Main

Apps auto-deploy via GitHub Actions when pushed to `main`. Each app's `wrangler.toml` contains its Cloudflare resource IDs.

### Manual Deployment

```bash
# Deploy a Pages app
cd apps/<name>
pnpm build && wrangler pages deploy .svelte-kit/cloudflare --project-name <project>

# Deploy a Worker service
cd services/<name>
wrangler deploy
```

### Secrets in CI

Cloudflare secrets are set in the Cloudflare Dashboard, not in GitHub Secrets. GitHub Secrets are only used for:
- `CLOUDFLARE_API_TOKEN` — Wrangler authentication
- `NPM_TOKEN` — Publishing `@autumnsgrove/lattice` to npm

```yaml
- name: Deploy
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
  run: wrangler pages deploy .svelte-kit/cloudflare
```

---

## Quality Checks

### Linting (ESLint + Prettier)

```bash
# Check
pnpm -r run lint

# Auto-fix
pnpm -r run lint -- --fix
bun x prettier --write .
```

### Type Checking

```bash
# SvelteKit type check (generates types + validates)
pnpm -r run check

# Direct TypeScript check
bun x tsc --noEmit
```

### Testing (Vitest)

```bash
# Run all tests once
pnpm -r run test:run

# Run with coverage
cd libs/engine && pnpm test:coverage

# Run specific test suite
cd libs/engine && pnpm test:security
```

---

## Related Guides

- [Git Guide](git_guide.md) — `gw git ship` and commit standards
- [Testing JavaScript](testing_javascript.md) — Vitest patterns and SvelteKit testing
- [Cloudflare Guide](cloudflare_guide.md) — Worker and Pages deployment details
- [Secrets Management](secrets_management.md) — API key security
