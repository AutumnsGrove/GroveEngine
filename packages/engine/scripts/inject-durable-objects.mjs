#!/usr/bin/env node
/**
 * Post-build script to inject Durable Object exports into _worker.js
 *
 * adapter-cloudflare doesn't natively support DO exports.
 * This script compiles DO classes and appends them to the generated worker.
 *
 * Run after: pnpm build
 * Run before: wrangler pages deploy
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Configuration
const WORKER_PATH = join(ROOT, ".svelte-kit/cloudflare/_worker.js");
const DO_SOURCE = join(ROOT, "src/lib/durable-objects/TenantDO.ts");
const DO_COMPILED = join(ROOT, ".svelte-kit/cloudflare/TenantDO.js");

// Marker to detect if DOs are already injected
const INJECTION_MARKER = "// === DURABLE OBJECTS (injected) ===";

console.log("🔧 Injecting Durable Objects into worker...\n");

// Check if build output exists
if (!existsSync(WORKER_PATH)) {
  console.error("❌ Worker not found at:", WORKER_PATH);
  console.error("   Run 'pnpm build' first.");
  process.exit(1);
}

// Check if DO source exists
if (!existsSync(DO_SOURCE)) {
  console.error("❌ TenantDO source not found at:", DO_SOURCE);
  process.exit(1);
}

// Read current worker
let workerCode = readFileSync(WORKER_PATH, "utf-8");

// Check if already injected
if (workerCode.includes(INJECTION_MARKER)) {
  console.log("ℹ️  Durable Objects already injected, skipping...");
  process.exit(0);
}

// Compile TenantDO.ts to JS using esbuild (bundled with vite)
// Using spawnSync with explicit arguments to avoid shell injection
console.log("📦 Compiling TenantDO.ts...");
const esbuildResult = spawnSync(
  "npx",
  [
    "esbuild",
    DO_SOURCE,
    `--outfile=${DO_COMPILED}`,
    "--format=esm",
    "--target=es2022",
    "--platform=neutral",
  ],
  {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
  },
);

if (esbuildResult.status !== 0) {
  console.error("❌ Failed to compile TenantDO");
  process.exit(1);
}

// Read compiled DO code
const doCode = readFileSync(DO_COMPILED, "utf-8");

// Extract the TenantDO class and related exports
// The compiled code exports TenantDO class - we need to append it
const doExport = `
${INJECTION_MARKER}
${doCode}
`;

// Append DO exports to worker
workerCode += doExport;
writeFileSync(WORKER_PATH, workerCode);

console.log("✅ Injected TenantDO into _worker.js");
console.log("\n📋 DO exports added:");
console.log("   - TenantDO (config caching, draft sync, analytics)");
console.log("\n🚀 Ready to deploy with: pnpm deploy");
