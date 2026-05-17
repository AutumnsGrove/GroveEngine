/**
 * Shared utility for loading curio configuration status.
 *
 * Used by:
 *   - arbor/pages/+page.server.ts (curio dashboard)
 *   - arbor/garden/edit, garden/new, pages/edit (editor autocomplete)
 *
 * Queries all curio tables in parallel to determine which are configured.
 * Two detection patterns:
 *   1. Enabled-column curios — have a config table with an `enabled` column
 *   2. Existence-based curios — any row existing = configured
 */

export interface CurioStatus {
	slug: string;
	name: string;
	enabled: boolean;
	configUrl: string;
}

interface CurioConfig {
	enabled: number;
}

/** Query a curio table with an `enabled` column */
function queryEnabled(
	db: D1Database,
	table: string,
	tenantId: string | undefined,
): Promise<CurioConfig | null> {
	if (!tenantId) return Promise.resolve(null);
	return db
		.prepare(`SELECT enabled FROM ${table} WHERE tenant_id = ?`)
		.bind(tenantId)
		.first<CurioConfig>()
		.catch(() => null);
}

/** Check if any row exists for this tenant (existence = configured) */
function queryExists(
	db: D1Database,
	table: string,
	tenantId: string | undefined,
): Promise<{ exists: 1 } | null> {
	if (!tenantId) return Promise.resolve(null);
	return db
		.prepare(`SELECT 1 as exists FROM ${table} WHERE tenant_id = ? LIMIT 1`)
		.bind(tenantId)
		.first<{ exists: 1 }>()
		.catch(() => null);
}

/**
 * Load configuration status for kept curios (4 total).
 */
export async function loadCurioStatus(
	db: D1Database | undefined,
	tenantId: string | undefined,
): Promise<CurioStatus[]> {
	if (!db) return [];
	const [timelineResult, galleryResult, guestbookResult, pollsResult] = await Promise.all([
		queryEnabled(db, "timeline_curio_config", tenantId),
		queryEnabled(db, "gallery_curio_config", tenantId),
		queryEnabled(db, "guestbook_config", tenantId),
		queryExists(db, "polls", tenantId),
	]);

	return [
		{
			slug: "timeline",
			name: "Timeline",
			enabled: timelineResult?.enabled === 1,
			configUrl: "/arbor/curios/timeline",
		},
		{
			slug: "gallery",
			name: "Gallery",
			enabled: galleryResult?.enabled === 1,
			configUrl: "/arbor/curios/gallery",
		},
		{
			slug: "guestbook",
			name: "Guestbook",
			enabled: guestbookResult?.enabled === 1,
			configUrl: "/arbor/curios/guestbook",
		},
		{
			slug: "polls",
			name: "Polls",
			enabled: pollsResult !== null,
			configUrl: "/arbor/curios/polls",
		},
	];
}
