export type D1DatabaseOrSession = D1Database | D1DatabaseSession;

export interface QueryMeta {
	changes: number;
	duration: number;
	lastRowId: number;
	rowsRead: number;
	rowsWritten: number;
}

export interface ExecuteResult {
	success: boolean;
	meta: QueryMeta;
}

export class DatabaseError extends Error {
	constructor(
		message: string,
		public readonly code: DatabaseErrorCode,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = "DatabaseError";
	}
}

export type DatabaseErrorCode =
	| "QUERY_FAILED"
	| "NOT_FOUND"
	| "CONSTRAINT_VIOLATION"
	| "TRANSACTION_FAILED"
	| "CONNECTION_ERROR"
	| "INVALID_QUERY"
	| "VALIDATION_ERROR";
