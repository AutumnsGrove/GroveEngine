#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────
# Grove Dev Stack — Local Development Environment
#
# Runs the real Grove stack locally: real workers, real DOs, real D1/KV/R2.
# No mocks. Single miniflare instance via wrangler multi-config.
#
# Usage:
#   ./scripts/dev-stack.sh                Full stack (workers + aspen)
#   ./scripts/dev-stack.sh workers        Workers only (no SvelteKit apps)
#   ./scripts/dev-stack.sh seed           Apply migrations + seed data only
#   ./scripts/dev-stack.sh reset          Nuke local DBs and re-seed
#
# Prerequisites:
#   pnpm install                          (workspace deps)
#   pnpm -r run package                   (build engine dist — needed for DOs)
#
# See: docs/LOCAL_DEV.md
# ──────────────────────────────────────────────────────────────────────

set -euo pipefail

GROVE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$GROVE_ROOT"

# ── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[0;90m'
BOLD='\033[1m'
RESET='\033[0m'

# ── State ─────────────────────────────────────────────────────────────
WRANGLER_PID=""
ASPEN_PID=""
PIDS=()

log()  { echo -e "${GREEN}[grove]${RESET} $1"; }
warn() { echo -e "${YELLOW}[grove]${RESET} $1"; }
err()  { echo -e "${RED}[grove]${RESET} $1"; }
dim()  { echo -e "${DIM}$1${RESET}"; }

# ── Cleanup ───────────────────────────────────────────────────────────
cleanup() {
    echo ""
    log "Shutting down..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            wait "$pid" 2>/dev/null || true
        fi
    done
    log "All processes stopped."
}
trap cleanup EXIT INT TERM

# ── Preflight checks ─────────────────────────────────────────────────
preflight() {
    local missing=0

    if ! command -v npx &>/dev/null; then
        err "npx not found. Install Node.js."
        missing=1
    fi

    if [ ! -f "libs/engine/dist/loom/base.js" ]; then
        warn "Engine dist not built. Building..."
        (cd libs/engine && pnpm run package)
    fi

    # Check for .dev.vars files (warn but don't block)
    local services=("apps/aspen" "services/heartwood" "services/zephyr" "services/durable-objects")
    for svc in "${services[@]}"; do
        if [ ! -f "$svc/.dev.vars" ] && [ -f "$svc/.dev.vars.example" ]; then
            warn "Missing $svc/.dev.vars — copy from .dev.vars.example"
        fi
    done

    if [ "$missing" -eq 1 ]; then
        exit 1
    fi
}

# ── Database seeding ──────────────────────────────────────────────────
apply_migrations() {
    log "Applying D1 migrations..."

    # Engine DB (118 migrations)
    dim "  → engine (grove-engine-db)"
    npx wrangler d1 migrations apply grove-engine-db \
        --local \
        -c apps/aspen/wrangler.toml \
        2>&1 | grep -E "applied|Already|Migrations" || true

    # Curios DB
    if [ -d "libs/engine/migrations/curios" ]; then
        dim "  → curios (grove-curios-db)"
        npx wrangler d1 migrations apply grove-curios-db \
            --local \
            -c apps/aspen/wrangler.toml \
            2>&1 | grep -E "applied|Already|Migrations" || true
    fi

    # Heartwood DB
    dim "  → heartwood (groveauth)"
    npx wrangler d1 migrations apply groveauth \
        --local \
        -c services/heartwood/wrangler.toml \
        2>&1 | grep -E "applied|Already|Migrations" || true

    log "Migrations complete."
}

seed_data() {
    local profile="${1:-blog}"

    log "Seeding data (profile: ${CYAN}$profile${RESET})..."

    case "$profile" in
        blog)
            dim "  → Midnight Bloom tenant (4 posts, 5 pages)"
            npx wrangler d1 execute grove-engine-db \
                --local \
                -c apps/aspen/wrangler.toml \
                --file scripts/db/seed-midnight-bloom.sql \
                -y 2>&1 | tail -3

            if [ -f "scripts/db/add-midnight-bloom-pages.sql" ]; then
                npx wrangler d1 execute grove-engine-db \
                    --local \
                    -c apps/aspen/wrangler.toml \
                    --file scripts/db/add-midnight-bloom-pages.sql \
                    -y 2>&1 | tail -3
            fi

            if [ -f "scripts/db/fix-midnight-bloom-content.sql" ]; then
                npx wrangler d1 execute grove-engine-db \
                    --local \
                    -c apps/aspen/wrangler.toml \
                    --file scripts/db/fix-midnight-bloom-content.sql \
                    -y 2>&1 | tail -3
            fi
            ;;
        empty)
            dim "  → Empty tenant (defaults only)"
            npx wrangler d1 execute grove-engine-db \
                --local \
                -c apps/aspen/wrangler.toml \
                --file scripts/db/seed-empty-grove.sql \
                -y 2>&1 | tail -3
            ;;
        fresh)
            dim "  → Fresh (migrations only, no data)"
            ;;
        *)
            err "Unknown profile: $profile (use: blog, empty, fresh)"
            exit 1
            ;;
    esac

    log "Seed complete."
}

reset_databases() {
    warn "Nuking local databases..."
    rm -rf apps/aspen/.wrangler/state
    rm -rf services/heartwood/.wrangler/state
    rm -rf services/durable-objects/.wrangler/state
    rm -rf services/zephyr/.wrangler/state
    log "Local databases cleared."
    apply_migrations
    seed_data "blog"
}

# ── Demo mode ─────────────────────────────────────────────────────────
# Reads DEMO_MODE_SECRET from apps/aspen/.dev.vars and prints the exact
# URL that trades it for the grove_demo_mode cookie, so nobody has to
# manually dig the secret out of .dev.vars and hand-build the URL
# every time (see project_local_dev_login memory for the full flow).
demo_login_url() {
    local dev_vars="apps/aspen/.dev.vars"
    if [ ! -f "$dev_vars" ]; then
        return 1
    fi

    local secret
    secret=$(grep -E "^DEMO_MODE_SECRET=" "$dev_vars" | head -1 | cut -d= -f2-)
    if [ -z "$secret" ]; then
        return 1
    fi

    echo "http://localhost:5173/arbor?demo=$secret"
}

# ── Workers ───────────────────────────────────────────────────────────
wait_for_port() {
    local port=$1
    local name=$2
    local attempts=0
    while [ $attempts -lt 30 ]; do
        if curl -s "http://localhost:$port/" >/dev/null 2>&1; then
            return 0
        fi
        sleep 1
        attempts=$((attempts + 1))
    done
    return 1
}

start_workers() {
    log "Starting workers..."
    echo ""
    dim "  Heartwood: groveauth (port 8787) — separate process"
    dim "  Primary:   grove-aspen (port 5173)"
    dim "  Auxiliary:  grove-durable-objects, grove-zephyr"
    echo ""

    # Start heartwood first (separate process on port 8787)
    # Runs independently so its [[routes]] custom_domain doesn't
    # pollute the primary worker's Host header in multi-config.
    # Service bindings discover it via wrangler's dev registry.
    npx wrangler dev \
        -c services/heartwood/wrangler.toml \
        2>&1 | sed "s/^/  ${DIM}[heartwood]${RESET} /" &
    HEARTWOOD_PID=$!
    PIDS+=("$HEARTWOOD_PID")

    log "Waiting for heartwood (port 8787)..."
    if ! wait_for_port 8787 "heartwood"; then
        err "Heartwood failed to start within 30 seconds"
        exit 1
    fi
    log "Heartwood ready."

    # Start main multi-config (aspen + DOs + zephyr)
    npx wrangler dev \
        -c apps/aspen/wrangler.toml \
        -c services/durable-objects/wrangler.toml \
        -c services/zephyr/wrangler.toml \
        2>&1 &
    WRANGLER_PID=$!
    PIDS+=("$WRANGLER_PID")

    log "Waiting for aspen (port 5173)..."
    if ! wait_for_port 5173 "aspen"; then
        err "Aspen failed to start within 30 seconds"
        exit 1
    fi
    log "All workers ready."
}

# ── Main ──────────────────────────────────────────────────────────────
main() {
    local mode="${1:-full}"

    echo ""
    echo -e "${BOLD}${GREEN}🌲 Grove Dev Stack${RESET}"
    echo -e "${DIM}────────────────────────────────${RESET}"
    echo ""

    preflight

    case "$mode" in
        seed)
            apply_migrations
            seed_data "${2:-blog}"
            ;;
        reset)
            reset_databases
            ;;
        workers)
            apply_migrations
            seed_data "blog"
            start_workers
            echo ""
            local demo_url
            if demo_url=$(demo_login_url); then
                echo -e "  ${CYAN}Demo login:${RESET} $demo_url"
                echo -e "  ${DIM}(visit once — sets the grove_demo_mode cookie, bypasses Turnstile/login)${RESET}"
                echo ""
            fi
            log "Workers running. Press Ctrl+C to stop."
            wait
            ;;
        full|"")
            apply_migrations
            seed_data "blog"
            start_workers
            echo ""
            echo -e "${BOLD}${GREEN}Stack is running:${RESET}"
            echo -e "  ${CYAN}Aspen:${RESET}     http://localhost:5173"
            echo -e "  ${CYAN}Heartwood:${RESET} http://localhost:8787 (auth API)"
            echo -e "  ${CYAN}DOs:${RESET}       via service binding (grove-durable-objects)"
            echo -e "  ${CYAN}Email:${RESET}     via service binding (grove-zephyr)"
            echo ""
            local demo_url
            if demo_url=$(demo_login_url); then
                echo -e "  ${CYAN}Demo login:${RESET} $demo_url"
                echo -e "  ${DIM}(visit once — sets the grove_demo_mode cookie, bypasses Turnstile/login)${RESET}"
            else
                warn "DEMO_MODE_SECRET not found in apps/aspen/.dev.vars — demo login unavailable"
            fi
            echo ""
            log "Press Ctrl+C to stop all services."
            wait
            ;;
        *)
            echo "Usage: ./scripts/dev-stack.sh [full|workers|seed|reset]"
            echo ""
            echo "Modes:"
            echo "  full      Start everything (default)"
            echo "  workers   Start workers only (no SvelteKit dev server)"
            echo "  seed      Apply migrations + seed data, then exit"
            echo "  reset     Nuke local DBs, re-migrate, re-seed"
            exit 1
            ;;
    esac
}

main "$@"
