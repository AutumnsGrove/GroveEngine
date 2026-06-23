/**
 * Database Service — Re-export Barrel
 *
 * This file re-exports from the db/ module for backward compatibility.
 * Prefer importing directly from the focused modules:
 *   - db/types.ts      — D1DatabaseOrSession, QueryMeta, ExecuteResult, DatabaseError
 *   - db/timestamps.ts — now, unixNow, futureTimestamp, isExpired, generateId
 *   - db/query.ts      — queryOne, queryMany, execute, etc.
 *   - db/batch.ts      — batch, withSession
 *   - db/crud.ts       — insert, update, deleteWhere, exists, count, etc.
 *   - db/tenant.ts     — TenantDb, getTenantDb
 */

export {
	// Types
	type D1DatabaseOrSession,
	type QueryMeta,
	type ExecuteResult,
	type DatabaseErrorCode,
	DatabaseError,
	// Timestamps
	generateId,
	now,
	unixNow,
	futureTimestamp,
	isExpired,
	// Query Helpers
	queryOne,
	queryOneOrThrow,
	queryMany,
	execute,
	executeOrThrow,
	// Batch
	batch,
	withSession,
	// CRUD
	findById,
	findByIdOrThrow,
	insert,
	upsert,
	update,
	deleteWhere,
	deleteById,
	exists,
	count,
	// Tenant
	type TenantContext,
	TenantContextError,
	TenantDb,
	getTenantDb,
} from "./db/index.js";
