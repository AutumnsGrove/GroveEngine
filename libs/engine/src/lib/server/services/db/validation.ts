import { DatabaseError } from "./types.js";

const VALID_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function validateTableName(table: string): void {
	if (!VALID_IDENTIFIER.test(table)) {
		throw new DatabaseError(
			`Invalid table name: ${table}. Table names must be alphanumeric with underscores only.`,
			"INVALID_QUERY",
		);
	}
}

export function validateColumnName(column: string): void {
	if (!VALID_IDENTIFIER.test(column)) {
		throw new DatabaseError(
			`Invalid column name: ${column}. Column names must be alphanumeric with underscores only.`,
			"INVALID_QUERY",
		);
	}
}

export function validateColumnNames(columns: string[]): void {
	for (const column of columns) {
		validateColumnName(column);
	}
}
