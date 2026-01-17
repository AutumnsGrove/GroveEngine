#!/usr/bin/env npx tsx
/**
 * Journey Curio D1 Loader
 *
 * Loads transformed snapshots from the backfill script into D1 database.
 *
 * Usage:
 *   npx tsx scripts/journey/load-to-d1.ts                    # Load to remote D1
 *   npx tsx scripts/journey/load-to-d1.ts --local            # Load to local D1
 *   npx tsx scripts/journey/load-to-d1.ts --dry-run          # Preview SQL only
 *   npx tsx scripts/journey/load-to-d1.ts --tenant=<id>      # Specify tenant ID
 *
 * Prerequisites:
 *   1. Run backfill-snapshots.ts first to generate snapshots.json
 *   2. Have wrangler configured with D1 access
 *
 * Security Note:
 *   This is a local developer CLI tool. The execSync usage is safe because:
 *   - SQL is generated from our controlled snapshots.json
 *   - The wrangler command uses a file path, not inline SQL
 *   - No user input is involved in command construction
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

// =============================================================================
// Configuration
// =============================================================================

const GROVE_ROOT = path.resolve(import.meta.dirname, "../..");
const SNAPSHOTS_PATH = path.join(
  GROVE_ROOT,
  "scripts/journey/output/snapshots.json",
);
const SQL_OUTPUT_PATH = path.join(
  GROVE_ROOT,
  "scripts/journey/output/insert-snapshots.sql",
);

const DATABASE_NAME = "grove-engine-db";

// Default tenant ID for personal use (Autumn's tenant)
const DEFAULT_TENANT_ID = "autumn";

// =============================================================================
// CLI Arguments
// =============================================================================

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run") || args.includes("-n");
const LOCAL = args.includes("--local");

// Parse --tenant=<id> argument
const tenantArg = args.find((a) => a.startsWith("--tenant="));
const TENANT_ID = tenantArg ? tenantArg.split("=")[1] : DEFAULT_TENANT_ID;

// =============================================================================
// Types
// =============================================================================

interface JourneySnapshot {
  id: string;
  timestamp: string;
  label: string;
  git_hash: string;
  total_lines: number;
  doc_lines: number;
  total_files: number;
  directories: number;
  estimated_tokens: number;
  language_breakdown: {
    svelte: number;
    typescript: number;
    javascript: number;
    css: number;
  };
  commits: number;
  test_files: number;
  test_lines: number;
  bundle_size_kb: number;
  snapshot_date: string;
  summary?: {
    text: string;
    stats: {
      totalCommits: number;
      features: number;
      fixes: number;
      refactoring: number;
      docs: number;
      tests: number;
      performance: number;
    };
    highlights: {
      features: string[];
      fixes: string[];
    };
  };
}

// =============================================================================
// SQL Generation
// =============================================================================

function escapeString(str: string): string {
  return str.replace(/'/g, "''");
}

function generateInsertSQL(
  snapshots: JourneySnapshot[],
  tenantId: string,
): string {
  const statements: string[] = [];

  // Header comment
  statements.push(`-- Journey Curio Snapshot Import`);
  statements.push(`-- Generated: ${new Date().toISOString()}`);
  statements.push(`-- Tenant: ${tenantId}`);
  statements.push(`-- Snapshots: ${snapshots.length}`);
  statements.push("");

  // Use INSERT OR REPLACE for idempotency
  for (const snapshot of snapshots) {
    const languageBreakdownJson = JSON.stringify({
      svelte: { lines: snapshot.language_breakdown.svelte },
      typescript: { lines: snapshot.language_breakdown.typescript },
      javascript: { lines: snapshot.language_breakdown.javascript },
      css: { lines: snapshot.language_breakdown.css },
    });

    // Parse ISO timestamp to Unix timestamp
    const createdAt = Math.floor(new Date(snapshot.timestamp).getTime() / 1000);

    const sql = `INSERT OR REPLACE INTO journey_snapshots (
  id,
  tenant_id,
  snapshot_date,
  label,
  git_hash,
  total_lines,
  doc_lines,
  total_files,
  directories,
  estimated_tokens,
  language_breakdown,
  total_commits,
  test_files,
  test_lines,
  bundle_size_kb,
  ingestion_source,
  created_at
) VALUES (
  '${escapeString(snapshot.id)}',
  '${escapeString(tenantId)}',
  '${escapeString(snapshot.snapshot_date)}',
  '${escapeString(snapshot.label)}',
  '${escapeString(snapshot.git_hash)}',
  ${snapshot.total_lines},
  ${snapshot.doc_lines},
  ${snapshot.total_files},
  ${snapshot.directories},
  ${snapshot.estimated_tokens},
  '${escapeString(languageBreakdownJson)}',
  ${snapshot.commits},
  ${snapshot.test_files},
  ${snapshot.test_lines},
  ${snapshot.bundle_size_kb},
  'manual',
  ${createdAt}
);`;

    statements.push(sql);
    statements.push("");
  }

  return statements.join("\n");
}

// =============================================================================
// Execution
// =============================================================================

/**
 * Execute SQL via wrangler.
 * NOTE: This is a local dev tool - the SQL file path is controlled by us.
 */
function executeSQL(sql: string): void {
  // Write SQL to temp file
  fs.writeFileSync(SQL_OUTPUT_PATH, sql);
  console.log(`      SQL written to: ${SQL_OUTPUT_PATH}`);

  // Execute with wrangler - using file path, not inline SQL
  const remoteFlag = LOCAL ? "" : "--remote";
  const cmd = `npx wrangler d1 execute ${DATABASE_NAME} --file="${SQL_OUTPUT_PATH}" ${remoteFlag}`;

  console.log(`\n      Executing: ${cmd}\n`);

  try {
    execSync(cmd, {
      cwd: GROVE_ROOT,
      encoding: "utf-8",
      stdio: "inherit",
    });
  } catch (error) {
    console.error("\nError executing SQL:", error);
    throw error;
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log("=".repeat(70));
  console.log("JOURNEY CURIO D1 LOADER");
  console.log("=".repeat(70));

  console.log(`\nConfiguration:`);
  console.log(`  Tenant ID: ${TENANT_ID}`);
  console.log(`  Database:  ${DATABASE_NAME}`);
  console.log(`  Target:    ${LOCAL ? "LOCAL" : "REMOTE"}`);
  console.log(`  Dry Run:   ${DRY_RUN}`);

  // Load snapshots
  console.log("\n[1/3] Loading snapshots...");
  if (!fs.existsSync(SNAPSHOTS_PATH)) {
    console.error(`\nError: Snapshots file not found at ${SNAPSHOTS_PATH}`);
    console.error("Run 'npx tsx scripts/journey/backfill-snapshots.ts' first.");
    process.exit(1);
  }

  const content = fs.readFileSync(SNAPSHOTS_PATH, "utf-8");
  const snapshots: JourneySnapshot[] = JSON.parse(content);
  console.log(`      Loaded ${snapshots.length} snapshots`);

  // Generate SQL
  console.log("\n[2/3] Generating SQL...");
  const sql = generateInsertSQL(snapshots, TENANT_ID);
  console.log(`      Generated ${snapshots.length} INSERT statements`);

  if (DRY_RUN) {
    console.log("\n[3/3] Dry run - SQL preview:");
    console.log("-".repeat(70));
    // Show first few statements
    const lines = sql.split("\n").slice(0, 50);
    console.log(lines.join("\n"));
    if (sql.split("\n").length > 50) {
      console.log(`\n... (${sql.split("\n").length - 50} more lines)`);
    }
    console.log("-".repeat(70));
    console.log("\n*** DRY RUN COMPLETE - No changes made ***");
    console.log("Run without --dry-run to execute.\n");
    return;
  }

  // Execute
  console.log("\n[3/3] Executing SQL...");
  executeSQL(sql);

  console.log("\n" + "=".repeat(70));
  console.log("LOAD COMPLETE");
  console.log("=".repeat(70));
  console.log(
    `\nInserted ${snapshots.length} snapshots for tenant '${TENANT_ID}'`,
  );
  console.log(`Target: ${LOCAL ? "local D1" : "remote D1 (production)"}\n`);
}

main().catch((error) => {
  console.error("\nError:", error.message);
  process.exit(1);
});
