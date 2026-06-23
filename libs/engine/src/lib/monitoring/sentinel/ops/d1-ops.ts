import type { OperationResult } from "../types.js";
import type { OperationFn } from "./registry.js";
import { SENTINEL_PREFIX } from "./registry.js";

export const d1WriteOps: OperationFn[] = [
	async (db, _kv, _r2, tenantId, index): Promise<OperationResult> => {
		const id = `${SENTINEL_PREFIX}${tenantId}_${Date.now()}_${index}`;
		const start = performance.now();

		try {
			const result = await db
				.prepare(
					`INSERT INTO sentinel_test_data (id, tenant_id, data, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET data = excluded.data, created_at = excluded.created_at`,
				)
				.bind(
					id,
					tenantId,
					JSON.stringify({ index, timestamp: Date.now() }),
					Math.floor(Date.now() / 1000),
				)
				.run();

			return {
				success: result.success,
				latencyMs: performance.now() - start,
				operationName: "insert_test_record",
				rowsAffected: (result.meta as D1Meta).changes ?? 1,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				throw new Error("sentinel_test_data table missing — run migration 032_sentinel.sql");
			}
			throw error;
		}
	},

	async (db, _kv, _r2, tenantId, index): Promise<OperationResult> => {
		const start = performance.now();

		try {
			const result = await db
				.prepare(
					`UPDATE sentinel_test_data
           SET data = ?, created_at = ?
           WHERE tenant_id = ?
           LIMIT 1`,
				)
				.bind(
					JSON.stringify({ index, timestamp: Date.now(), updated: true }),
					Math.floor(Date.now() / 1000),
					tenantId,
				)
				.run();

			return {
				success: true,
				latencyMs: performance.now() - start,
				operationName: "update_test_record",
				rowsAffected: (result.meta as D1Meta).changes ?? 0,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				return {
					success: true,
					latencyMs: performance.now() - start,
					operationName: "update_test_record_no_table",
					rowsAffected: 0,
				};
			}
			throw error;
		}
	},

	async (db, _kv, _r2, tenantId, index): Promise<OperationResult> => {
		const batchSize = 5;
		const start = performance.now();

		try {
			const statements = [];
			for (let i = 0; i < batchSize; i++) {
				const id = `${SENTINEL_PREFIX}${tenantId}_batch_${Date.now()}_${index}_${i}`;
				statements.push(
					db
						.prepare(
							`INSERT INTO sentinel_test_data (id, tenant_id, data, created_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
						)
						.bind(
							id,
							tenantId,
							JSON.stringify({ batch: index, item: i }),
							Math.floor(Date.now() / 1000),
						),
				);
			}

			const results = await db.batch(statements);
			const allSuccess = results.every((r) => r.success);

			return {
				success: allSuccess,
				latencyMs: performance.now() - start,
				operationName: "batch_insert",
				rowsAffected: batchSize,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				throw new Error("sentinel_test_data table missing — run migration 032_sentinel.sql");
			}
			throw error;
		}
	},
];

export const d1ReadOps: OperationFn[] = [
	async (db, _kv, _r2, tenantId, _index): Promise<OperationResult> => {
		const start = performance.now();

		try {
			const result = await db
				.prepare(`SELECT * FROM sentinel_test_data WHERE tenant_id = ? LIMIT 10`)
				.bind(tenantId)
				.all();

			return {
				success: true,
				latencyMs: performance.now() - start,
				operationName: "select_test_records",
				rowsAffected: (result.results ?? []).length,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				return {
					success: true,
					latencyMs: performance.now() - start,
					operationName: "select_test_records_no_table",
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
				.prepare(`SELECT COUNT(*) as count FROM sentinel_test_data WHERE tenant_id = ?`)
				.bind(tenantId)
				.first<{ count: number }>();

			return {
				success: true,
				latencyMs: performance.now() - start,
				operationName: "count_test_records",
				rowsAffected: result?.count ?? 0,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				return {
					success: true,
					latencyMs: performance.now() - start,
					operationName: "count_test_records_no_table",
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
					`SELECT p.id, p.title, p.slug, p.status
           FROM posts p
           WHERE p.tenant_id = ?
           ORDER BY p.created_at DESC
           LIMIT 20`,
				)
				.bind(tenantId)
				.all();

			return {
				success: true,
				latencyMs: performance.now() - start,
				operationName: "select_posts_listing",
				rowsAffected: (result.results ?? []).length,
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes("no such table")) {
				return {
					success: true,
					latencyMs: performance.now() - start,
					operationName: "select_posts_listing_fallback",
					rowsAffected: 0,
				};
			}
			throw error;
		}
	},
];
