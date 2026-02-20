/**
 * Post-Build: Compile worker-entry.ts → _entry.js
 *
 * This script runs after `vite build` and uses esbuild to:
 * 1. Rename the adapter's output (_entry.js → _worker.js)
 *    The adapter reads `main` from wrangler.toml, so it outputs as _entry.js.
 *    We rename it so our custom entry can import it as _worker.js.
 * 2. Bundle all monitor code (config, health-checks, incident-manager, daily-history, utils)
 *    inline into our custom entry point
 * 3. Mark ./_worker.js as external (preserved as ES module import, not re-bundled)
 * 4. Output as ESM to .svelte-kit/cloudflare/_entry.js
 *
 * The result is two files in .svelte-kit/cloudflare/:
 * - _worker.js  — SvelteKit's generated worker (fetch handler, renamed from adapter output)
 * - _entry.js   — Our custom entry (imports _worker.js + adds scheduled handler)
 */

import { build } from "esbuild";
import { existsSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const cloudflareDir = resolve(projectRoot, ".svelte-kit/cloudflare");

const adapterOutput = resolve(cloudflareDir, "_entry.js");
const workerFile = resolve(cloudflareDir, "_worker.js");

// Step 1: Rename adapter output (_entry.js → _worker.js)
// The adapter reads `main` from wrangler.toml and outputs to that filename.
// Since main = "_entry.js", we need to rename before creating our custom entry.
if (existsSync(adapterOutput)) {
	renameSync(adapterOutput, workerFile);
	console.log("[build-entry] Renamed _entry.js → _worker.js");
} else if (!existsSync(workerFile)) {
	console.error(
		"Error: Neither _entry.js nor _worker.js found in .svelte-kit/cloudflare/. Run `vite build` first.",
	);
	process.exit(1);
}

// Step 2: Bundle our custom entry that wraps SvelteKit + adds scheduled()
await build({
	entryPoints: [resolve(projectRoot, "src/worker-entry.ts")],
	outfile: resolve(cloudflareDir, "_entry.js"),
	bundle: true,
	format: "esm",
	target: "es2022",
	platform: "neutral",
	// Keep _worker.js as an external import — don't re-bundle SvelteKit's output
	external: ["./_worker.js"],
	// Minify for smaller deployment
	minify: true,
	// Source maps for debugging cron failures
	sourcemap: true,
});

console.log("[build-entry] Compiled _entry.js successfully");
