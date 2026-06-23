import type { OperationResult } from "../types.js";
import type { OperationFn } from "./registry.js";
import { SENTINEL_PREFIX } from "./registry.js";

export const kvGetOps: OperationFn[] = [
	async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
		const key = `${SENTINEL_PREFIX}${tenantId}_${index % 100}`;
		const start = performance.now();

		const value = await kv.get(key);
		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "kv_get_simple",
			bytesTransferred: value ? new TextEncoder().encode(String(value)).length : 0,
		};
	},

	async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
		const key = `${SENTINEL_PREFIX}${tenantId}_json_${index % 50}`;
		const start = performance.now();

		const value = await kv.get(key, { type: "json" });
		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "kv_get_json",
			bytesTransferred: value ? JSON.stringify(value).length : 0,
		};
	},

	async (_db, kv, _r2, tenantId, _index): Promise<OperationResult> => {
		const start = performance.now();

		const result = await kv.list({
			prefix: `${SENTINEL_PREFIX}${tenantId}_`,
			limit: 20,
		});
		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "kv_list",
			rowsAffected: result.keys.length,
		};
	},
];

export const kvPutOps: OperationFn[] = [
	async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
		const key = `${SENTINEL_PREFIX}${tenantId}_${index % 100}`;
		const value = JSON.stringify({
			index,
			timestamp: Date.now(),
			random: Math.random(),
		});
		const start = performance.now();

		await kv.put(key, value, { expirationTtl: 3600 });
		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "kv_put_simple",
			bytesTransferred: new TextEncoder().encode(value).length,
		};
	},

	async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
		const key = `${SENTINEL_PREFIX}${tenantId}_meta_${index % 50}`;
		const value = JSON.stringify({
			index,
			timestamp: Date.now(),
			data: Array(100).fill("x").join(""),
		});
		const start = performance.now();

		await kv.put(key, value, {
			expirationTtl: 3600,
			metadata: { createdBy: "sentinel", index: String(index) },
		});
		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "kv_put_with_metadata",
			bytesTransferred: new TextEncoder().encode(value).length,
		};
	},
];
