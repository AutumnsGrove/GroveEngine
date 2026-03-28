#!/usr/bin/env tsx
/**
 * Data Sync — Syncs JSON reference data to D1.
 *
 * Reads JSON source files from libs/engine/src/lib/data/, computes content
 * hashes for change detection, and upserts changed records into D1 tables.
 * Unchanged records (matching content hash) are skipped.
 *
 * Uses the Cloudflare D1 REST API with parameterized queries (same pattern
 * as apps/landing/scripts/kb-sync.ts).
 *
 * Usage:
 *   tsx scripts/data-sync.ts                    # sync all datasets
 *   tsx scripts/data-sync.ts --dataset badges   # sync only badges
 *   tsx scripts/data-sync.ts --dataset artifacts
 *   tsx scripts/data-sync.ts --dataset blocklist
 *   tsx scripts/data-sync.ts --dry-run          # preview without writing
 *
 * Required environment variables:
 *   CLOUDFLARE_ACCOUNT_ID — Cloudflare account ID
 *   CLOUDFLARE_API_TOKEN  — API token with D1 write permissions
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const DATA_DIR = resolve(PROJECT_ROOT, "libs/engine/src/lib/data");

// Database ID: grove-engine-db
const D1_DATABASE_ID = process.env.D1_DATABASE_ID ?? "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68";

type DatasetName = "badges" | "artifacts" | "blocklist";

const VALID_DATASETS: DatasetName[] = ["badges", "artifacts", "blocklist"];

// ---------------------------------------------------------------------------
// D1 REST API (mirrors kb-sync.ts pattern)
// ---------------------------------------------------------------------------

async function d1Query(
	sql: string,
	params: unknown[] = [],
): Promise<{ success: boolean; results?: unknown[] }> {
	const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
	const apiToken = process.env.CLOUDFLARE_API_TOKEN;

	if (!accountId || !apiToken) {
		throw new Error("Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN environment variables");
	}

	const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${D1_DATABASE_ID}/query`;

	const response = await fetch(url, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiToken}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ sql, params }),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`D1 API error (${response.status}): ${text}`);
	}

	const json = (await response.json()) as {
		success: boolean;
		result: Array<{ success: boolean; results: unknown[] }>;
		errors: unknown[];
	};

	if (!json.success) {
		throw new Error(`D1 query failed: ${JSON.stringify(json.errors)}`);
	}

	return { success: true, results: json.result?.[0]?.results };
}

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

function contentHash(obj: unknown): string {
	return createHash("sha256").update(JSON.stringify(obj)).digest("hex");
}

// ---------------------------------------------------------------------------
// Existing hash retrieval
// ---------------------------------------------------------------------------

async function getExistingHashes(table: string, idColumn: string): Promise<Map<string, string>> {
	const result = await d1Query(`SELECT ${idColumn}, content_hash FROM ${table}`);
	const map = new Map<string, string>();
	for (const row of (result.results || []) as Array<Record<string, string>>) {
		map.set(row[idColumn], row.content_hash);
	}
	return map;
}

// ---------------------------------------------------------------------------
// Badge sync
// ---------------------------------------------------------------------------

interface BadgeJson {
	id: string;
	name: string;
	description: string;
	icon: string;
	category: string;
	rarity: string;
	group: string;
	criteria: string;
}

async function syncBadges(
	dryRun: boolean,
): Promise<{ synced: number; skipped: number; errors: number }> {
	console.log("  Syncing badges...");

	const raw = readFileSync(resolve(DATA_DIR, "badges.json"), "utf-8");
	const badges: BadgeJson[] = JSON.parse(raw);

	console.log(`    ${badges.length} badges in source`);

	if (dryRun) {
		for (const b of badges) {
			console.log(`    ${b.id} — ${b.name} (${b.category}/${b.rarity})`);
		}
		return { synced: 0, skipped: badges.length, errors: 0 };
	}

	const existingHashes = await getExistingHashes("data_badges", "id");
	console.log(`    ${existingHashes.size} existing in D1`);

	let synced = 0;
	let skipped = 0;
	let errors = 0;

	for (const badge of badges) {
		const hash = contentHash(badge);

		if (existingHashes.get(badge.id) === hash) {
			skipped++;
			continue;
		}

		const isSystem = badge.group === "system" ? 1 : 0;
		const autoCriteria = badge.criteria || null;

		try {
			await d1Query(
				`INSERT OR REPLACE INTO data_badges
					(id, name, description, icon, category, rarity, badge_group,
					 auto_criteria, is_system, content_hash, updated_at)
				VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'))`,
				[
					badge.id,
					badge.name,
					badge.description,
					badge.icon,
					badge.category,
					badge.rarity,
					badge.group,
					autoCriteria,
					isSystem,
					hash,
				],
			);
			console.log(`    + ${badge.id}`);
			synced++;
		} catch (err) {
			console.error(`    x ${badge.id}: ${(err as Error).message}`);
			errors++;
		}
	}

	return { synced, skipped, errors };
}

// ---------------------------------------------------------------------------
// Artifact sync
// ---------------------------------------------------------------------------

interface ArtifactJson {
	type: string;
	label: string;
	description: string;
	category: string;
}

/** Map artifact type to a sensible Lucide icon name */
const ARTIFACT_ICONS: Record<string, string> = {
	magic8ball: "circle",
	fortunecookie: "cookie",
	tarotcard: "layers",
	crystalball: "sparkles",
	glasscathedral: "church",
	diceroller: "dice-5",
	coinflip: "coins",
	wishingwell: "droplets",
	snowglobe: "snowflake",
	marqueetext: "move-horizontal",
	blinkingnew: "zap",
	rainbowdivider: "rainbow",
	emailbutton: "mail",
	moodcandle: "flame",
	windchime: "wind",
	hourglass: "hourglass",
	potionbottle: "flask-conical",
	musicbox: "music",
	compassrose: "compass",
	terrariumglobe: "globe",
};

async function syncArtifacts(
	dryRun: boolean,
): Promise<{ synced: number; skipped: number; errors: number }> {
	console.log("  Syncing artifacts...");

	const raw = readFileSync(resolve(DATA_DIR, "artifacts.json"), "utf-8");
	const artifacts: ArtifactJson[] = JSON.parse(raw);

	console.log(`    ${artifacts.length} artifacts in source`);

	if (dryRun) {
		for (const a of artifacts) {
			console.log(`    artifact_${a.type} — ${a.label} (${a.category})`);
		}
		return { synced: 0, skipped: artifacts.length, errors: 0 };
	}

	const existingHashes = await getExistingHashes("data_artifacts", "id");
	console.log(`    ${existingHashes.size} existing in D1`);

	let synced = 0;
	let skipped = 0;
	let errors = 0;

	for (const artifact of artifacts) {
		const id = `artifact_${artifact.type}`;
		const hash = contentHash(artifact);

		if (existingHashes.get(id) === hash) {
			skipped++;
			continue;
		}

		const icon = ARTIFACT_ICONS[artifact.type] || "box";

		try {
			await d1Query(
				`INSERT OR REPLACE INTO data_artifacts
					(id, name, label, description, artifact_type, category,
					 icon, default_config, content_hash, updated_at)
				VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'))`,
				[
					id,
					artifact.label,
					artifact.label,
					artifact.description,
					artifact.type,
					artifact.category,
					icon,
					null,
					hash,
				],
			);
			console.log(`    + ${id}`);
			synced++;
		} catch (err) {
			console.error(`    x ${id}: ${(err as Error).message}`);
			errors++;
		}
	}

	return { synced, skipped, errors };
}

// ---------------------------------------------------------------------------
// Domain blocklist sync
// ---------------------------------------------------------------------------

interface BlocklistJson {
	username: string;
	reason: string;
	category: string;
}

async function syncDomainBlocklist(
	dryRun: boolean,
): Promise<{ synced: number; skipped: number; errors: number }> {
	console.log("  Syncing domain blocklist...");

	const raw = readFileSync(resolve(DATA_DIR, "domain-blocklist.json"), "utf-8");
	const entries: BlocklistJson[] = JSON.parse(raw);

	console.log(`    ${entries.length} entries in source`);

	if (dryRun) {
		const byReason: Record<string, number> = {};
		for (const e of entries) {
			byReason[e.reason] = (byReason[e.reason] || 0) + 1;
		}
		for (const [reason, count] of Object.entries(byReason)) {
			console.log(`    ${reason}: ${count} entries`);
		}
		return { synced: 0, skipped: entries.length, errors: 0 };
	}

	const existingHashes = await getExistingHashes("data_domain_blocklist", "username");
	console.log(`    ${existingHashes.size} existing in D1`);

	let synced = 0;
	let skipped = 0;
	let errors = 0;

	for (const entry of entries) {
		const hash = contentHash(entry);

		if (existingHashes.get(entry.username) === hash) {
			skipped++;
			continue;
		}

		try {
			await d1Query(
				`INSERT OR REPLACE INTO data_domain_blocklist
					(username, reason, category, content_hash, updated_at)
				VALUES (?1, ?2, ?3, ?4, datetime('now'))`,
				[entry.username, entry.reason, entry.category || null, hash],
			);
			synced++;
		} catch (err) {
			console.error(`    x ${entry.username}: ${(err as Error).message}`);
			errors++;
		}
	}

	// Log synced count without individual lines (too many entries)
	if (synced > 0) {
		console.log(`    + ${synced} entries upserted`);
	}

	return { synced, skipped, errors };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
	const args = process.argv.slice(2);
	const dryRun = args.includes("--dry-run");
	const datasetIdx = args.indexOf("--dataset");
	const datasetFilter = datasetIdx !== -1 ? (args[datasetIdx + 1] as DatasetName) : null;

	if (datasetFilter && !VALID_DATASETS.includes(datasetFilter)) {
		console.error(`Unknown dataset: ${datasetFilter}`);
		console.error(`Valid datasets: ${VALID_DATASETS.join(", ")}`);
		process.exit(1);
	}

	console.log("Data Sync — JSON Source Files -> D1\n");

	if (dryRun) {
		console.log("  (dry run — no changes will be written)\n");
	}

	const datasets = datasetFilter ? [datasetFilter] : VALID_DATASETS;
	let totalSynced = 0;
	let totalSkipped = 0;
	let totalErrors = 0;

	for (const dataset of datasets) {
		let result: { synced: number; skipped: number; errors: number };

		switch (dataset) {
			case "badges":
				result = await syncBadges(dryRun);
				break;
			case "artifacts":
				result = await syncArtifacts(dryRun);
				break;
			case "blocklist":
				result = await syncDomainBlocklist(dryRun);
				break;
		}

		totalSynced += result.synced;
		totalSkipped += result.skipped;
		totalErrors += result.errors;
		console.log(
			`    => ${result.synced} synced, ${result.skipped} unchanged, ${result.errors} errors\n`,
		);
	}

	console.log(
		`Sync complete: ${totalSynced} synced, ${totalSkipped} unchanged, ${totalErrors} errors`,
	);

	if (totalErrors > 0) {
		process.exit(1);
	}
}

main().catch((err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
