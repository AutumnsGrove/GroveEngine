import type { ExecuteResult } from "./types.js";
import { DatabaseError } from "./types.js";

export async function batch(
	db: D1Database,
	statements: Array<{ sql: string; params?: unknown[] }>,
): Promise<ExecuteResult[]> {
	try {
		const prepared = statements.map((stmt, index) => {
			try {
				return db.prepare(stmt.sql).bind(...(stmt.params ?? []));
			} catch (prepareErr) {
				throw new DatabaseError(
					`Batch statement ${index + 1}/${statements.length} failed to prepare: ${stmt.sql.slice(0, 100)}`,
					"INVALID_QUERY",
					prepareErr,
				);
			}
		});

		const results = await db.batch(prepared);

		return results.map((result) => {
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
		});
	} catch (err) {
		if (err instanceof DatabaseError) {
			throw err;
		}
		const stmtSummary = statements.map((s, i) => `${i + 1}: ${s.sql.slice(0, 50)}...`).join("; ");
		throw new DatabaseError(
			`Batch operation failed (${statements.length} statements: ${stmtSummary})`,
			"TRANSACTION_FAILED",
			err,
		);
	}
}

export async function withSession<T>(
	db: D1Database,
	fn: (session: D1DatabaseSession) => Promise<T>,
): Promise<T> {
	const session = db.withSession();
	try {
		return await fn(session);
	} catch (err) {
		throw new DatabaseError("Session operation failed", "TRANSACTION_FAILED", err);
	}
}
