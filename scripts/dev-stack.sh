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

    if ! command -v wrangler &>/dev/null; then
        err "wrangler not found on PATH. Install it globally: npm i -g wrangler"
        missing=1
    fi

    if [ ! -f "libs/engine/dist/loom/base.js" ]; then
        warn "Engine dist not built. Building..."
        (cd libs/engine && pnpm run package)
    fi

    # Check for .dev.vars files (warn but don't block)
    local services=("apps/aspen" "apps/plant" "apps/landing" "services/heartwood" "services/zephyr" "services/durable-objects")
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
    wrangler d1 migrations apply grove-engine-db \
        --local \
        -c apps/aspen/wrangler.toml \
        2>&1 | grep -E "applied|Already|Migrations" || true

    # Curios DB
    if [ -d "libs/engine/migrations/curios" ]; then
        dim "  → curios (grove-curios-db)"
        wrangler d1 migrations apply grove-curios-db \
            --local \
            -c apps/aspen/wrangler.toml \
            2>&1 | grep -E "applied|Already|Migrations" || true
    fi

    # Heartwood DB
    dim "  → heartwood (groveauth)"
    wrangler d1 migrations apply groveauth \
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
            wrangler d1 execute grove-engine-db \
                --local \
                -c apps/aspen/wrangler.toml \
                --file scripts/db/seed-midnight-bloom.sql \
                -y 2>&1 | tail -3

            if [ -f "scripts/db/add-midnight-bloom-pages.sql" ]; then
                wrangler d1 execute grove-engine-db \
                    --local \
                    -c apps/aspen/wrangler.toml \
                    --file scripts/db/add-midnight-bloom-pages.sql \
                    -y 2>&1 | tail -3
            fi

            if [ -f "scripts/db/fix-midnight-bloom-content.sql" ]; then
                wrangler d1 execute grove-engine-db \
                    --local \
                    -c apps/aspen/wrangler.toml \
                    --file scripts/db/fix-midnight-bloom-content.sql \
                    -y 2>&1 | tail -3
            fi
            ;;
        empty)
            dim "  → Empty tenant (defaults only)"
            wrangler d1 execute grove-engine-db \
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
    rm -rf apps/plant/.wrangler/state
    rm -rf apps/landing/.wrangler/state
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

# Same idea as demo_login_url() above, but for Plant's onboarding bypass —
# reads apps/plant/.dev.vars separately since it's a different worker's
# secret store, even though both apps use the same DEMO_MODE_SECRET value
# by local-dev convention (see apps/plant/.dev.vars.example).
plant_demo_url() {
    local dev_vars="apps/plant/.dev.vars"
    if [ ! -f "$dev_vars" ]; then
        return 1
    fi

    local secret
    secret=$(grep -E "^DEMO_MODE_SECRET=" "$dev_vars" | head -1 | cut -d= -f2-)
    if [ -z "$secret" ]; then
        return 1
    fi

    echo "http://localhost:5175/auth/demo?demo=$secret"
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
    dim "  Primary:   grove-aspen (port 5173) + auxiliary grove-durable-objects, grove-zephyr"
    dim "  Landing:   grove-landing (port 5174) — separate process"
    dim "  Plant:     grove-plant (port 5175) — separate process"
    echo ""

    # Shared local state directory. Only wrangler dev invocations that point
    # here (via --persist-to) or that run inside the same multi-config group
    # as this path's owner see the same D1/KV/R2 data. Each config directory
    # gets its OWN separate .wrangler/state by default otherwise — a config
    # bundled into a multi-config -c list still only gets its own listening
    # port if it's the FIRST (primary) config; auxiliary configs (durable
    # objects, zephyr here) are service-binding-only, not browsable. Plant
    # and Landing are full apps that need their own port, so they run as
    # separate processes with --persist-to pointed at aspen's state — same
    # trick as Heartwood already uses for ENGINE_DB.
    local shared_state="apps/aspen/.wrangler/state"

    # Start heartwood first (separate process on port 8787)
    # Runs independently so its [[routes]] custom_domain doesn't
    # pollute the primary worker's Host header in multi-config.
    # Service bindings discover it via wrangler's dev registry.
    wrangler dev \
        -c services/heartwood/wrangler.toml \
        --inspector-port 9229 \
        2>&1 | sed "s/^/  ${DIM}[heartwood]${RESET} /" &
    HEARTWOOD_PID=$!
    PIDS+=("$HEARTWOOD_PID")

    log "Waiting for heartwood (port 8787)..."
    if ! wait_for_port 8787 "heartwood"; then
        err "Heartwood failed to start within 30 seconds"
        exit 1
    fi
    log "Heartwood ready."

    # wrangler dev serves each app's built .svelte-kit/output — it does NOT
    # watch source files the way `vite dev` does. Always rebuild here so
    # edits made before this run are actually reflected, not a stale bundle.
    log "Building aspen, plant, landing (wrangler dev serves build output, not source)..."
    (cd apps/aspen && pnpm run build) || {
        err "Aspen build failed — see output above"
        exit 1
    }
    (cd apps/plant && pnpm run build) || {
        err "Plant build failed — see output above"
        exit 1
    }

    # Landing prerenders a couple of pages that fetch from GitHub at build
    # time (e.g. /knowledge/exhibit/sister-museum) — a flaky network or an
    # offline machine shouldn't take down the whole stack over a marketing
    # page. Warn and skip landing rather than exit; aspen + plant are what
    # the signup flow actually needs.
    # Not `local` — main() reads this after start_workers() returns to
    # decide whether to print the Landing URL in the summary banner.
    landing_ready=1
    if ! (cd apps/landing && pnpm run build); then
        warn "Landing build failed (often a transient GitHub fetch during prerender) — skipping landing, rest of the stack will still start"
        landing_ready=0
    fi

    # Start main multi-config (aspen + auxiliary DOs/zephyr, which are
    # service-binding-only and don't need their own port).
    # Explicit --inspector-port per process — each `wrangler dev` process
    # independently tries to claim the default inspector port and doesn't
    # reliably auto-increment past a collision when several start close
    # together, so a bare default risks one process failing to bind.
    wrangler dev \
        -c apps/aspen/wrangler.toml \
        -c services/durable-objects/wrangler.toml \
        -c services/zephyr/wrangler.toml \
        --inspector-port 9230 \
        2>&1 &
    WRANGLER_PID=$!
    PIDS+=("$WRANGLER_PID")

    log "Waiting for aspen (port 5173)..."
    if ! wait_for_port 5173 "aspen"; then
        err "Aspen failed to start within 30 seconds"
        exit 1
    fi

    # Plant — separate process, explicitly shares aspen's local D1/KV so the
    # onboarding flow sees the same seeded tenant data.
    #
    # --local-upstream localhost: without this, wrangler dev simulates the
    # production route (plant.grove.place/* from wrangler.toml) by rewriting
    # the Host/Origin the app sees to "plant.grove.place" over plain HTTP.
    # Plant's hooks.server.ts CSRF check (validateCSRF) correctly requires
    # HTTPS for any non-localhost origin, so EVERY state-changing POST
    # (profile save, plan selection, etc.) gets rejected with a generic
    # "Cross-site request blocked" 403 unless this is set. Found while
    # debugging the profile-save step throwing "Something went wrong."
    wrangler dev \
        -c apps/plant/wrangler.toml \
        --persist-to "$shared_state" \
        --local-upstream localhost \
        --inspector-port 9231 \
        2>&1 | sed "s/^/  ${DIM}[plant]${RESET} /" &
    PLANT_PID=$!
    PIDS+=("$PLANT_PID")

    log "Waiting for plant (port 5175)..."
    if ! wait_for_port 5175 "plant"; then
        err "Plant failed to start within 30 seconds"
        exit 1
    fi

    if [ "$landing_ready" -eq 1 ]; then
        # Same --local-upstream reasoning as plant above — landing has its
        # own production route pattern (grove.place/*) that would otherwise
        # get faked into the Host/Origin headers locally.
        wrangler dev \
            -c apps/landing/wrangler.toml \
            --persist-to "$shared_state" \
            --local-upstream localhost \
            --inspector-port 9232 \
            2>&1 | sed "s/^/  ${DIM}[landing]${RESET} /" &
        LANDING_PID=$!
        PIDS+=("$LANDING_PID")

        log "Waiting for landing (port 5174)..."
        if ! wait_for_port 5174 "landing"; then
            err "Landing failed to start within 30 seconds"
            exit 1
        fi
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
            local demo_url plant_url
            if demo_url=$(demo_login_url); then
                echo -e "  ${CYAN}Demo login:${RESET} $demo_url"
                echo -e "  ${DIM}(visit once — sets the grove_demo_mode cookie, bypasses Turnstile/login)${RESET}"
            fi
            if plant_url=$(plant_demo_url); then
                echo -e "  ${CYAN}Plant demo signup:${RESET} $plant_url"
                echo -e "  ${DIM}(or click \"Skip sign-in (Dev Mode)\" on http://localhost:5175)${RESET}"
            fi
            echo ""
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
            if [ "${landing_ready:-0}" -eq 1 ]; then
                echo -e "  ${CYAN}Landing:${RESET}   http://localhost:5174"
            fi
            echo -e "  ${CYAN}Plant:${RESET}     http://localhost:5175 (onboarding/signup)"
            echo -e "  ${CYAN}Heartwood:${RESET} http://localhost:8787 (auth API)"
            echo -e "  ${CYAN}DOs:${RESET}       via service binding (grove-durable-objects)"
            echo -e "  ${CYAN}Email:${RESET}     via service binding (grove-zephyr)"
            echo ""
            local demo_url plant_url
            if demo_url=$(demo_login_url); then
                echo -e "  ${CYAN}Demo login:${RESET} $demo_url"
                echo -e "  ${DIM}(visit once — sets the grove_demo_mode cookie, bypasses Turnstile/login)${RESET}"
            else
                warn "DEMO_MODE_SECRET not found in apps/aspen/.dev.vars — demo login unavailable"
            fi
            if plant_url=$(plant_demo_url); then
                echo -e "  ${CYAN}Plant demo signup:${RESET} $plant_url"
                echo -e "  ${DIM}(or click \"Skip sign-in (Dev Mode)\" on http://localhost:5175)${RESET}"
            else
                warn "DEMO_MODE_SECRET not found in apps/plant/.dev.vars — Plant demo signup unavailable"
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
