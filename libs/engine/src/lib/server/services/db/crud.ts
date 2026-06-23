import type { D1DatabaseOrSession } from "./types.js";
import { DatabaseError } from "./types.js";
import { validateTableName, validateColumnNames } from "./validation.js";
import { queryOne, queryMany, execute } from "./query.js";
import { generateId, unixNow } from "./timestamps.js";

export async function findById<T>(
	db: D1DatabaseOrSession,
	table: string,
	id: string,
): Promise<T | null> {
	validateTableName(table);
	const sql = `SELECT * FROM ${table} WHERE id = ? LIMIT 1`;
	return queryOne<T>(db, sql, [id]);
}

export async function findByIdOrThrow<T>(
	db: D1DatabaseOrSession,
	table: string,
	id: string,
	errorMessage = "Record not found",
): Promise<T> {
	const result = await findById<T>(db, table, id);
	if (result === null) {
		throw new DatabaseError(errorMessage, "NOT_FOUND");
	}
	return result;
}

export async function insert(
	db: D1DatabaseOrSession,
	table: string,
	data: Record<string, unknown>,
	options?: { id?: string },
): Promise<string> {
	validateTableName(table);
	validateColumnNames(Object.keys(data));

	const id = options?.id ?? generateId();
	const timestamp = unixNow();

	const dataWithMeta = {
		id,
		created_at: timestamp,
		updated_at: timestamp,
		...data,
	};

	const columns = Object.keys(dataWithMeta);
	const placeholders = columns.map(() => "?").join(", ");
	const values = Object.values(dataWithMeta);

	const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

	try {
		await db
			.prepare(sql)
			.bind(...values)
			.run();
		return id;
	} catch (err) {
		if (err instanceof Error && err.message.includes("UNIQUE constraint")) {
			throw new DatabaseError(
				`Duplicate entry in ${table} (columns: ${columns.join(", ")})`,
				"CONSTRAINT_VIOLATION",
				err,
			);
		}
		throw new DatabaseError(
			`Insert into ${table} failed (columns: ${columns.join(", ")})`,
			"QUERY_FAILED",
			err,
		);
	}
}

export async function upsert(
	db: D1DatabaseOrSession,
	table: string,
	data: Record<string, unknown>,
	options?: { id?: string },
): Promise<string> {
	validateTableName(table);
	validateColumnNames(Object.keys(data));

	const id = options?.id ?? data.id ?? generateId();
	const timestamp = unixNow();

	const dataWithMeta = {
		id,
		created_at: timestamp,
		updated_at: timestamp,
		...data,
	};

	const columns = Object.keys(dataWithMeta);
	const placeholders = columns.map(() => "?").join(", ");
	const values = Object.values(dataWithMeta);

	const sql = `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;

	try {
		await db
			.prepare(sql)
			.bind(...values)
			.run();
		return id as string;
	} catch (err) {
		throw new DatabaseError(
			`Upsert into ${table} failed (columns: ${columns.join(", ")})`,
			"QUERY_FAILED",
			err,
		);
	}
}

export async function update(
	db: D1DatabaseOrSession,
	table: string,
	data: Record<string, unknown>,
	where: string,
	whereParams: unknown[] = [],
): Promise<number> {
	validateTableName(table);
	validateColumnNames(Object.keys(data));

	const dataWithTimestamp = {
		updated_at: unixNow(),
		...data,
	};

	const setClauses = Object.keys(dataWithTimestamp)
		.map((key) => `${key} = ?`)
		.join(", ");
	const values = [...Object.values(dataWithTimestamp), ...whereParams];

	const sql = `UPDATE ${table} SET ${setClauses} WHERE ${where}`;

	try {
		const result = await db
			.prepare(sql)
			.bind(...values)
			.run();
		return (result.meta as D1Meta).changes ?? 0;
	} catch (err) {
		const fields = Object.keys(dataWithTimestamp).join(", ");
		throw new DatabaseError(
			`Update ${table} failed (fields: ${fields}, where: ${where})`,
			"QUERY_FAILED",
			err,
		);
	}
}

export async function deleteWhere(
	db: D1DatabaseOrSession,
	table: string,
	where: string,
	whereParams: unknown[] = [],
): Promise<number> {
	validateTableName(table);
	const sql = `DELETE FROM ${table} WHERE ${where}`;

	try {
		const result = await db
			.prepare(sql)
			.bind(...whereParams)
			.run();
		return (result.meta as D1Meta).changes ?? 0;
	} catch (err) {
		throw new DatabaseError(`Delete from ${table} failed (where: ${where})`, "QUERY_FAILED", err);
	}
}

export async function deleteById(
	db: D1DatabaseOrSession,
	table: string,
	id: string,
): Promise<boolean> {
	const changes = await deleteWhere(db, table, "id = ?", [id]);
	return changes > 0;
}

export async function exists(
	db: D1DatabaseOrSession,
	table: string,
	where: string,
	whereParams: unknown[] = [],
): Promise<boolean> {
	validateTableName(table);
	const sql = `SELECT 1 FROM ${table} WHERE ${where} LIMIT 1`;

	try {
		const result = await db
			.prepare(sql)
			.bind(...whereParams)
			.first();
		return result !== null;
	} catch (err) {
		throw new DatabaseError(`Existence check on ${table} failed`, "QUERY_FAILED", err);
	}
}

export async function count(
	db: D1DatabaseOrSession,
	table: string,
	where?: string,
	whereParams: unknown[] = [],
): Promise<number> {
	validateTableName(table);
	const sql = where
		? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
		: `SELECT COUNT(*) as count FROM ${table}`;

	try {
		const result = await db
			.prepare(sql)
			.bind(...whereParams)
			.first<{ count: number }>();
		return result?.count ?? 0;
	} catch (err) {
		throw new DatabaseError(`Count on ${table} failed`, "QUERY_FAILED", err);
	}
}
