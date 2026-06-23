import type { OperationResult } from "../types.js";
import type { OperationFn } from "./registry.js";
import { SENTINEL_PREFIX } from "./registry.js";

export const authFlowOps: OperationFn[] = [
	async (db, kv, _r2, tenantId, index): Promise<OperationResult> => {
		const sessionId = `sentinel_session_${tenantId}_${index % 50}`;
		const start = performance.now();

		try {
			const kvSession = await kv.get(`session:${sessionId}`);

			if (!kvSession) {
				await db
					.prepare(`SELECT * FROM sessions WHERE id = ? AND tenant_id = ?`)
					.bind(sessionId, tenantId)
					.first();
			}

			return {
				success: true,
				latencyMs: performance.now() - start,
				operationName: "session_lookup",
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				return {
					success: true,
					latencyMs: performance.now() - start,
					operationName: "session_lookup_no_table",
				};
			}
			throw error;
		}
	},

	async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
		const ip = `192.168.${index % 256}.${(index * 7) % 256}`;
		const key = `rate_limit:${tenantId}:${ip}`;
		const start = performance.now();

		const current = (await kv.get(key, { type: "json" })) as {
			count: number;
		} | null;
		const count = (current?.count ?? 0) + 1;
		await kv.put(key, JSON.stringify({ count, timestamp: Date.now() }), {
			expirationTtl: 60,
		});

		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "rate_limit_check",
		};
	},
];

export const postCrudOps: OperationFn[] = [
	async (db, _kv, _r2, tenantId, index): Promise<OperationResult> => {
		const id = `${SENTINEL_PREFIX}post_${tenantId}_${Date.now()}_${index}`;
		const slug = `sentinel-test-post-${index}-${Date.now()}`;
		const start = performance.now();

		try {
			const result = await db
				.prepare(
					`INSERT INTO posts (id, tenant_id, title, slug, markdown_content, html_content, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`,
				)
				.bind(
					id,
					tenantId,
					`Sentinel Test Post ${index}`,
					slug,
					`# Test Post\n\nThis is a sentinel test post created at ${new Date().toISOString()}`,
					`<h1>Test Post</h1><p>This is a sentinel test post.</p>`,
					"draft",
					Math.floor(Date.now() / 1000),
					Math.floor(Date.now() / 1000),
				)
				.run();

			return {
				success: result.success,
				latencyMs: performance.now() - start,
				operationName: "create_post",
				rowsAffected: (result.meta as D1Meta).changes ?? 1,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				return {
					success: true,
					latencyMs: performance.now() - start,
					operationName: "create_post_no_table",
					rowsAffected: 0,
				};
			}
			throw error;
		}
	},

	async (db, _kv, _r2, tenantId, _index): Promise<OperationResult> => {
		const start = performance.now();

		try {
			const result = await db
				.prepare(
					`SELECT id, title, slug, status, created_at
           FROM posts
           WHERE tenant_id = ? AND status = 'published'
           ORDER BY created_at DESC
           LIMIT 20`,
				)
				.bind(tenantId)
				.all();

			return {
				success: true,
				latencyMs: performance.now() - start,
				operationName: "list_posts",
				rowsAffected: (result.results ?? []).length,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				return {
					success: true,
					latencyMs: performance.now() - start,
					operationName: "list_posts_no_table",
					rowsAffected: 0,
				};
			}
			throw error;
		}
	},
];

export const mediaOps: OperationFn[] = [
	async (db, _kv, _r2, tenantId, _index): Promise<OperationResult> => {
		const start = performance.now();

		try {
			const result = await db
				.prepare(
					`SELECT id, filename, r2_key, mime_type, size, created_at
           FROM media
           WHERE tenant_id = ?
           ORDER BY created_at DESC
           LIMIT 50`,
				)
				.bind(tenantId)
				.all();

			return {
				success: true,
				latencyMs: performance.now() - start,
				operationName: "list_media",
				rowsAffected: (result.results ?? []).length,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				return {
					success: true,
					latencyMs: performance.now() - start,
					operationName: "list_media_no_table",
					rowsAffected: 0,
				};
			}
			throw error;
		}
	},
];
