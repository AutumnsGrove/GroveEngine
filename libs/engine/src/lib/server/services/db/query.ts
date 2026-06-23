import type { D1DatabaseOrSession, ExecuteResult } from "./types.js";
import { DatabaseError } from "./types.js";

export async function queryOne<T>(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = [],
): Promise<T | null> {
	try {
		const result = await db
			.prepare(sql)
			.bind(...params)
			.first<T>();
		return result ?? null;
	} catch (err) {
		throw new DatabaseError(`Query failed: ${sql}`, "QUERY_FAILED", err);
	}
}

export async function queryOneOrThrow<T>(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = [],
	errorMessage = "Record not found",
): Promise<T> {
	const result = await queryOne<T>(db, sql, params);
	if (result === null) {
		throw new DatabaseError(errorMessage, "NOT_FOUND");
	}
	return result;
}

export async function queryMany<T>(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = [],
): Promise<T[]> {
	try {
		const result = await db
			.prepare(sql)
			.bind(...params)
			.all<T>();
		return result.results ?? [];
	} catch (err) {
		throw new DatabaseError(`Query failed: ${sql}`, "QUERY_FAILED", err);
	}
}

export async function execute(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = [],
): Promise<ExecuteResult> {
	try {
		const result = await db
			.prepare(sql)
			.bind(...params)
			.run();

		const meta = result.meta as D1Meta;
		return {
			success: result.success,
			meta: {
				changes: meta.changes ?? 0,
				duration: meta.duration,
				lastRowId: meta.last_row_id ?? 0,
				rowsRead: meta.rows_read ?? 0,
				rowsWritten: meta.rows_written ?? 0,
			},
		};
	} catch (err) {
		throw new DatabaseError(`Execute failed: ${sql}`, "QUERY_FAILED", err);
	}
}

export async function executeOrThrow(
	db: D1DatabaseOrSession,
	sql: string,
	params: unknown[] = [],
	errorMessage = "No rows affected",
): Promise<ExecuteResult> {
	const result = await execute(db, sql, params);
	if (result.meta.changes === 0) {
		throw new DatabaseError(errorMessage, "NOT_FOUND");
	}
	return result;
}
