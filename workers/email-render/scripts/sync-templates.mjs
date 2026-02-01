#!/usr/bin/env node
/**
 * Sync email templates from engine package to worker
 *
 * This copies the necessary files to bundle with the worker.
 * Run automatically during build via `bun run prebuild`.
 */

import { cpSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(__dirname, "..");
const engineEmail = join(__dirname, "../../../packages/engine/src/lib/email");

const destinations = {
  components: join(workerRoot, "src/templates/components"),
  sequences: join(workerRoot, "src/templates"),
};

console.log("📧 Syncing email templates from engine package...");

// Ensure directories exist
mkdirSync(destinations.components, { recursive: true });
mkdirSync(destinations.sequences, { recursive: true });

// Copy components
const componentFiles = [
  "GroveEmail.tsx",
  "GroveButton.tsx",
  "GroveDivider.tsx",
  "GroveHighlight.tsx",
  "GroveText.tsx",
  "GrovePatchNote.tsx",
  "styles.ts",
  "index.ts",
];

for (const file of componentFiles) {
  const src = join(engineEmail, "components", file);
  const dest = join(destinations.components, file);
  if (existsSync(src)) {
    cpSync(src, dest);
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ⚠ Missing: ${file}`);
  }
}

// Copy sequence templates
const sequenceFiles = [
  "WelcomeEmail.tsx",
  "Day1Email.tsx",
  "Day7Email.tsx",
  "Day14Email.tsx",
  "Day30Email.tsx",
];

for (const file of sequenceFiles) {
  const src = join(engineEmail, "sequences", file);
  const dest = join(destinations.sequences, file);
  if (existsSync(src)) {
    cpSync(src, dest);
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ⚠ Missing: ${file}`);
  }
}

// Copy URL helpers
const urlSrc = join(engineEmail, "urls.ts");
const urlDest = join(destinations.sequences, "urls.ts");
if (existsSync(urlSrc)) {
  cpSync(urlSrc, urlDest);
  console.log(`  ✓ urls.ts`);
}

// Copy types
const typesSrc = join(engineEmail, "types.ts");
const typesDest = join(destinations.sequences, "types.ts");
if (existsSync(typesSrc)) {
  cpSync(typesSrc, typesDest);
  console.log(`  ✓ types.ts`);
}

console.log("📧 Template sync complete!");
