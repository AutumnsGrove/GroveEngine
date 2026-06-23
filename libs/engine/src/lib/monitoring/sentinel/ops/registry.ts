import type { TargetSystem, OperationResult } from "../types.js";

export const SENTINEL_PREFIX = "sentinel_test_";

export type OperationFn = (
	db: D1Database,
	kv: KVNamespace,
	r2: R2Bucket,
	tenantId: string,
	index: number,
) => Promise<OperationResult>;

const operationRegistry: Map<TargetSystem, OperationFn[]> = new Map();

export function registerOperations(system: TargetSystem, ops: OperationFn[]): void {
	operationRegistry.set(system, ops);
}

export function getOperation(system: TargetSystem): OperationFn | null {
	const operations = operationRegistry.get(system);
	if (!operations || operations.length === 0) return null;
	return operations[Math.floor(Math.random() * operations.length)];
}

export async function executeOperation(
	system: TargetSystem,
	db: D1Database,
	kv: KVNamespace,
	r2: R2Bucket,
	tenantId: string,
	index: number,
): Promise<OperationResult> {
	const operation = getOperation(system);
	if (!operation) {
		return {
			success: false,
			latencyMs: 0,
			operationName: "unknown",
			errorMessage: `No operations registered for system: ${system}`,
			errorCode: "NO_OPERATION",
		};
	}

	const start = performance.now();
	try {
		const result = await operation(db, kv, r2, tenantId, index);
		const latencyMs = performance.now() - start;
		return {
			...result,
			latencyMs,
		};
	} catch (error) {
		const latencyMs = performance.now() - start;
		return {
			success: false,
			latencyMs,
			operationName: "unknown",
			errorMessage: error instanceof Error ? error.message : String(error),
			errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
		};
	}
}
