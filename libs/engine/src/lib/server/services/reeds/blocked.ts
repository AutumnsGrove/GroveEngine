import type { BlockedCommenterRecord } from "./types.js";

export async function isUserBlocked(
	db: D1Database,
	tenantId: string,
	userId: string,
): Promise<boolean> {
	const result = await db
		.prepare("SELECT 1 FROM blocked_commenters WHERE tenant_id = ? AND blocked_user_id = ? LIMIT 1")
		.bind(tenantId, userId)
		.first();
	return result !== null;
}

export async function blockCommenter(
	db: D1Database,
	tenantId: string,
	userId: string,
	reason?: string,
): Promise<void> {
	await db
		.prepare(
			"INSERT OR IGNORE INTO blocked_commenters (tenant_id, blocked_user_id, reason, created_at) VALUES (?, ?, ?, datetime('now'))",
		)
		.bind(tenantId, userId, reason || null)
		.run();
}

export async function unblockCommenter(
	db: D1Database,
	tenantId: string,
	userId: string,
): Promise<void> {
	await db
		.prepare("DELETE FROM blocked_commenters WHERE tenant_id = ? AND blocked_user_id = ?")
		.bind(tenantId, userId)
		.run();
}

export async function getBlockedCommenters(
	db: D1Database,
	tenantId: string,
): Promise<BlockedCommenterRecord[]> {
	const result = await db
		.prepare(
			"SELECT blocked_user_id, reason, created_at FROM blocked_commenters WHERE tenant_id = ? ORDER BY created_at DESC",
		)
		.bind(tenantId)
		.all<BlockedCommenterRecord>();
	return result.results ?? [];
}
