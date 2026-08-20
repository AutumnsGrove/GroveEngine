#!/usr/bin/env node
/**
 * Pre-push validation runner.
 *
 * Runs identically in local dev, Claude Code web sandboxes, and can be
 * invoked by CI. Uses the deploy-manifest parser to scope work to only
 * the deploy shims affected by the push.
 *
 * Checks (in order):
 *   1. Lockfile sync      (pnpm install --frozen-lockfile)
 *   2. Deploy drift       (deploy-manifest --drift)
 *   3. Direct typecheck   (tsc --noEmit or custom typecheck-command — shims whose
 *                          OWN directory changed, not shims that merely declare a
 *                          changed shared lib as a path trigger)
 *   4. Svelte-check       (same direct-only scope as #3)
 *   5. Direct dry-run     (wrangler deploy --dry-run — only if CF token present)
 *
 * Time budget: ~30-60s for a typical single-service change. Scoping to
 * directly-changed shims (not their lib-triggered downstream consumers) is
 * the key — editing one file in libs/gossamer shouldn't locally typecheck
 * and svelte-check every unrelated worker that happens to import
 * libs/engine (which itself depends on gossamer). CI still runs the full
 * fan-out remotely via each deploy-*.yml's own path triggers — this script
 * only trims what runs on your machine, blocking your terminal.
 *
 * Environment:
 *   PRE_PUSH_BASE              Git ref to diff against (default: origin/main)
 *   PRE_PUSH_SKIP_LOCKFILE=1   Skip the pnpm-lock.yaml sync check
 *   CLOUDFLARE_API_TOKEN       If set, wrangler dry-run runs; else skipped with a note
 *   CLOUDFLARE_ACCOUNT_ID      Required alongside the token for dry-run
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	parseAllShims,
	filterAffected,
	detectDrift,
	findWranglerConfigs,
	getChangedFiles,
} from "./deploy-manifest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

let failures = 0;

const header = (t) => console.log(`\n${BLUE}━━ ${t} ━━${RESET}`);
const ok = (t) => console.log(`  ${GREEN}✓${RESET} ${t}`);
const bad = (t) => {
	console.log(`  ${RED}✗${RESET} ${t}`);
	failures++;
};
const skip = (t) => console.log(`  ${DIM}⊘ ${t}${RESET}`);
const note = (t) => console.log(`  ${DIM}${t}${RESET}`);

// Diff against the remote tracking branch when it exists (only checks
// commits not yet on the remote). Falls back to origin/main for new
// branches or detached HEAD.
function detectBase() {
	const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "@{push}"], {
		cwd: REPO_ROOT,
		encoding: "utf8",
		stdio: "pipe",
	});
	if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
	return "origin/main";
}

function run(cmd, cwd) {
	const r = spawnSync("sh", ["-c", cmd], {
		cwd: cwd || REPO_ROOT,
		stdio: "pipe",
		encoding: "utf8",
	});
	return { ok: r.status === 0, stdout: r.stdout, stderr: r.stderr, code: r.status };
}

function dumpTail(out, n = 25) {
	const lines = (out || "").split("\n").filter(Boolean).slice(-n);
	for (const line of lines) console.log(`    ${DIM}${line}${RESET}`);
}

// ─── 1. Lockfile sync ─────────────────────────────────────────────
if (process.env.PRE_PUSH_SKIP_LOCKFILE !== "1") {
	header("Lockfile sync");
	const r = run("pnpm install --frozen-lockfile --prefer-offline");
	if (r.ok) ok("pnpm-lock.yaml in sync");
	else {
		bad("pnpm-lock.yaml out of sync — run `pnpm install` and commit");
		dumpTail(r.stderr, 10);
	}
} else {
	header("Lockfile sync");
	skip("PRE_PUSH_SKIP_LOCKFILE=1");
}

// ─── 2. Deploy manifest drift ─────────────────────────────────────
header("Deploy manifest drift");
const shims = parseAllShims();
const wranglers = findWranglerConfigs();
const drift = detectDrift(shims, wranglers);
if (drift.missingWrangler.length === 0 && drift.orphanedWrangler.length === 0) {
	ok(`${shims.length} shims match ${wranglers.length} wrangler.toml files`);
} else {
	for (const m of drift.missingWrangler) bad(`${m.shim} → expects ${m.expected}`);
	for (const o of drift.orphanedWrangler)
		bad(`${o.wrangler} (${o.name || "unnamed"}) has no deploy-*.yml shim`);
}

// ─── 3. Affected shims — typecheck ────────────────────────────────
header("Affected deploys");
const base = process.env.PRE_PUSH_BASE || detectBase();
let affected = [];
try {
	affected = filterAffected(shims, base);
} catch (e) {
	note(`could not diff against ${base}: ${e.message}`);
}

// Split "affected" into shims whose OWN directory changed ("direct") vs
// shims matched only because they declare a changed shared lib as a path
// trigger ("lib-only"). Local checks run against `direct` only — CI still
// covers the full fan-out remotely via the same deploy-*.yml path triggers.
const changedFiles = affected.length > 0 ? getChangedFiles(base) : [];
const direct = affected.filter(
	(s) => s.path && changedFiles.some((f) => f.startsWith(s.path + "/")),
);
const libOnly = affected.filter((s) => !direct.includes(s));

if (affected.length === 0) {
	skip(`No deploy shims affected since ${base}`);
} else {
	note(`${direct.length} direct: ${direct.map((s) => s.service).join(", ") || "(none)"}`);
	if (libOnly.length > 0) {
		note(
			`${libOnly.length} lib-triggered (skipped locally, CI covers these): ` +
				libOnly.map((s) => s.service).join(", "),
		);
	}

	// ── Build lib deps first (always) ──────────────────────────────
	// Build all shared libs before typechecking, regardless of which
	// specific shims declare them. Prevents "cannot find module" errors
	// in fresh environments and guards against shims that forget to
	// declare needs-engine/foliage.
	const buildLib = (name, dir, label, cmd = "pnpm run package") => {
		process.stdout.write(`  ${DIM}build ${label.padEnd(18)}...${RESET}`);
		const r = run(cmd, resolve(REPO_ROOT, dir));
		if (r.ok) console.log(` ${GREEN}✓${RESET}`);
		else {
			console.log(` ${RED}✗${RESET}`);
			failures++;
			dumpTail(r.stderr || r.stdout, 20);
		}
		return r.ok;
	};

	buildLib("foliage", "libs/foliage", "libs/foliage", "pnpm run build");
	buildLib("gossamer", "libs/gossamer", "libs/gossamer", "pnpm run build");
	buildLib("engine", "libs/engine", "libs/engine", "pnpm run package");

	// ── SvelteKit sync for directly-changed shims ───────────────────
	// Attempt sync for every direct shim — non-SvelteKit packages exit
	// non-zero and are logged as ⊘. Covers apps/, workers/ that use
	// SvelteKit, and libs/* like engine that extend .svelte-kit/tsconfig.json.
	for (const shim of direct) {
		if (!shim.path) continue;
		process.stdout.write(`  ${DIM}sync ${shim.service.padEnd(18)}...${RESET}`);
		const r = run("pnpm exec svelte-kit sync", resolve(REPO_ROOT, shim.path));
		if (r.ok) console.log(` ${GREEN}✓${RESET}`);
		else console.log(` ${DIM}⊘ (not a SvelteKit target)${RESET}`);
	}

	console.log();

	for (const shim of direct) {
		if (shim.kind === "custom" || !shim.path) continue;
		if (shim.with["run-typecheck"] === false) {
			skip(`${shim.service} typecheck (run-typecheck: false)`);
			continue;
		}
		const cmd = shim.with["typecheck-command"] || "pnpm exec tsc --noEmit";
		process.stdout.write(`  ${DIM}${shim.service.padEnd(20)} typecheck ...${RESET}`);
		const r = run(cmd, resolve(REPO_ROOT, shim.path));
		if (r.ok) console.log(` ${GREEN}✓${RESET}`);
		else {
			console.log(` ${RED}✗${RESET}`);
			failures++;
			dumpTail(r.stderr || r.stdout, 25);
		}
	}

	// ─── 4. Svelte-check (directly-changed shims only) ──────────────
	// Downstream consumers of a changed shared lib are NOT checked here —
	// they're still covered by CI via each deploy-*.yml's own path triggers,
	// which run on remote runners and don't cost local wall-clock time.
	header("Svelte-check");

	const svelteShims = direct.filter((s) => s.path);

	if (svelteShims.length === 0) {
		skip("No svelte-check targets affected");
	} else {
		for (const shim of svelteShims) {
			// Only run svelte-check on packages that have a "check" script
			const pkgPath = resolve(REPO_ROOT, shim.path, "package.json");
			let hasCheckScript = false;
			try {
				const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
				hasCheckScript = Boolean(pkg.scripts && pkg.scripts.check);
			} catch {
				// No package.json or unreadable — skip
			}

			if (!hasCheckScript) continue;
			if (shim.with["run-svelte-check"] === false) {
				skip(`${shim.service} svelte-check (run-svelte-check: false)`);
				continue;
			}

			process.stdout.write(`  ${DIM}${shim.service.padEnd(20)} svelte-check ...${RESET}`);
			const r = run("pnpm run check", resolve(REPO_ROOT, shim.path));
			if (r.ok) console.log(` ${GREEN}✓${RESET}`);
			else {
				console.log(` ${RED}✗${RESET}`);
				failures++;
				dumpTail(r.stderr || r.stdout, 25);
			}
		}
	}

	// ─── 5. Direct shims — wrangler dry-run ─────────────────────────
	const hasToken = Boolean(process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID);
	console.log();
	if (!hasToken) {
		skip("wrangler dry-run (CLOUDFLARE_API_TOKEN/ACCOUNT_ID not set — CI will still run it)");
	} else {
		for (const shim of direct) {
			// Skip kind!=worker and library-only shims (run-deploy: false),
			// mirrors the `matrix.kind == 'worker' && matrix.run-deploy` gate
			// in validate-deployments.yml. libs/engine is the only shim that
			// currently sets run-deploy: false.
			if (shim.kind !== "worker" || !shim.path || shim.with["run-deploy"] === false) continue;
			process.stdout.write(`  ${DIM}${shim.service.padEnd(20)} wrangler dry-run ...${RESET}`);
			const r = run("pnpm exec wrangler deploy --dry-run", resolve(REPO_ROOT, shim.path));
			if (r.ok) console.log(` ${GREEN}✓${RESET}`);
			else {
				console.log(` ${RED}✗${RESET}`);
				failures++;
				dumpTail(r.stderr || r.stdout, 20);
			}
		}
	}
}

// ─── Summary ──────────────────────────────────────────────────────
console.log();
const bar = "━".repeat(40);
if (failures === 0) {
	console.log(`${GREEN}${bar}${RESET}`);
	console.log(`${GREEN}✓ All pre-push checks passed${RESET}`);
	console.log(`${GREEN}${bar}${RESET}`);
	process.exit(0);
} else {
	console.log(`${RED}${bar}${RESET}`);
	console.log(`${RED}✗ ${failures} pre-push check${failures === 1 ? "" : "s"} failed${RESET}`);
	console.log(`${YELLOW}To bypass (sparingly): git push --no-verify${RESET}`);
	console.log(`${RED}${bar}${RESET}`);
	process.exit(1);
}
