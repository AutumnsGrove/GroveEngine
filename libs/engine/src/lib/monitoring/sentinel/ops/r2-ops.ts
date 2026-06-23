import type { OperationResult } from "../types.js";
import type { OperationFn } from "./registry.js";
import { SENTINEL_PREFIX } from "./registry.js";

export const r2UploadOps: OperationFn[] = [
	async (_db, _kv, r2, tenantId, index): Promise<OperationResult> => {
		const key = `${SENTINEL_PREFIX}${tenantId}/small_${index}.txt`;
		const content = `Sentinel test file ${index} - ${new Date().toISOString()}\n${"x".repeat(1000)}`;
		const start = performance.now();

		await r2.put(key, content, {
			httpMetadata: { contentType: "text/plain" },
			customMetadata: { sentinelTest: "true", index: String(index) },
		});
		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "r2_upload_small",
			bytesTransferred: new TextEncoder().encode(content).length,
		};
	},

	async (_db, _kv, r2, tenantId, index): Promise<OperationResult> => {
		const key = `${SENTINEL_PREFIX}${tenantId}/medium_${index}.json`;
		const content = JSON.stringify({
			index,
			timestamp: Date.now(),
			data: Array(100)
				.fill(null)
				.map((_, i) => ({
					id: i,
					value: `item_${i}_${"x".repeat(50)}`,
				})),
		});
		const start = performance.now();

		await r2.put(key, content, {
			httpMetadata: { contentType: "application/json" },
			customMetadata: { sentinelTest: "true", index: String(index) },
		});
		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "r2_upload_medium",
			bytesTransferred: new TextEncoder().encode(content).length,
		};
	},
];

export const r2DownloadOps: OperationFn[] = [
	async (_db, _kv, r2, tenantId, index): Promise<OperationResult> => {
		const key = `${SENTINEL_PREFIX}${tenantId}/small_${index % 100}.txt`;
		const start = performance.now();

		const object = await r2.get(key);
		let bytesTransferred = 0;

		if (object) {
			const content = await object.text();
			bytesTransferred = new TextEncoder().encode(content).length;
		}

		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "r2_download",
			bytesTransferred,
		};
	},

	async (_db, _kv, r2, tenantId, _index): Promise<OperationResult> => {
		const start = performance.now();

		const result = await r2.list({
			prefix: `${SENTINEL_PREFIX}${tenantId}/`,
			limit: 20,
		});
		return {
			success: true,
			latencyMs: performance.now() - start,
			operationName: "r2_list",
			rowsAffected: result.objects.length,
		};
	},
];
