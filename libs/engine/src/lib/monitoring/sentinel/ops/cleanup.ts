import { SENTINEL_PREFIX } from "./registry.js";

export async function cleanupSentinelData(
	db: D1Database,
	kv: KVNamespace,
	r2: R2Bucket,
	tenantId: string,
): Promise<{ d1Deleted: number; kvDeleted: number; r2Deleted: number }> {
	let d1Deleted = 0;
	let kvDeleted = 0;
	let r2Deleted = 0;

	try {
		const result = await db
			.prepare(`DELETE FROM sentinel_test_data WHERE tenant_id = ?`)
			.bind(tenantId)
			.run();
		d1Deleted = (result.meta as D1Meta).changes ?? 0;
	} catch {
		// Table may not exist
	}

	try {
		const result = await db
			.prepare(`DELETE FROM posts WHERE tenant_id = ? AND id LIKE ?`)
			.bind(tenantId, `${SENTINEL_PREFIX}%`)
			.run();
		d1Deleted += (result.meta as D1Meta).changes ?? 0;
	} catch {
		// Table may not exist
	}

	try {
		let cursor: string | undefined;
		do {
			const result = await kv.list({
				prefix: `${SENTINEL_PREFIX}${tenantId}_`,
				limit: 1000,
				cursor,
			});

			for (const key of result.keys) {
				await kv.delete(key.name);
				kvDeleted++;
			}

			cursor = result.list_complete ? undefined : (result as unknown as { cursor?: string }).cursor;
		} while (cursor);
	} catch {
		// KV cleanup errors
	}

	try {
		let cursor: string | undefined;
		do {
			const result = await r2.list({
				prefix: `${SENTINEL_PREFIX}${tenantId}/`,
				limit: 1000,
				cursor,
			});

			const r2List = result as unknown as {
				objects: { key: string }[];
				list_complete: boolean;
				cursor?: string;
			};
			const keys = r2List.objects.map((obj) => obj.key);
			if (keys.length > 0) {
				await r2.delete(keys);
				r2Deleted += keys.length;
			}

			cursor = r2List.list_complete ? undefined : r2List.cursor;
		} while (cursor);
	} catch {
		// R2 cleanup errors
	}

	return { d1Deleted, kvDeleted, r2Deleted };
}
