/**
 * Sentinel Operations — Re-export Barrel
 *
 * This file re-exports from the ops/ module for backward compatibility.
 * Prefer importing directly from the focused modules:
 *   - ops/registry.ts    — OperationFn type, getOperation, executeOperation
 *   - ops/d1-ops.ts      — D1 read/write operation generators
 *   - ops/kv-ops.ts      — KV get/put operation generators
 *   - ops/r2-ops.ts      — R2 upload/download operation generators
 *   - ops/domain-ops.ts  — auth, post CRUD, media operation generators
 *   - ops/cleanup.ts     — cleanupSentinelData
 */

export type { OperationFn } from "./ops/index.js";
export { getOperation, executeOperation, cleanupSentinelData } from "./ops/index.js";
