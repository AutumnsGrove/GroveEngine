import type { D1DatabaseOrSession, ExecuteResult } from "./types.js";
import { DatabaseError } from "./types.js";
import { validateTableName, validateColumnName } from "./validation.js";
import { queryOne, queryMany, execute } from "./query.js";
import { insert, upsert, update, deleteWhere, exists, count } from "./crud.js";

export class TenantContextError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "TenantContextError";
	}
}

export interface TenantContext {
	tenantId: string;
	userId?: string;
}

export class TenantDb {
	private db: D1DatabaseOrSession;
	private context: TenantContext;

	constructor(db: D1DatabaseOrSession, context: TenantContext) {
		if (!context.tenantId) {
			throw new TenantContextError("Tenant ID is required for database operations");
		}
		this.db = db;
		this.context = context;
	}

	get tenantId(): string {
		return this.context.tenantId;
	}

	async queryOne<T>(table: string, where?: string, whereParams: unknown[] = []): Promise<T | null> {
		validateTableName(table);
		const tenantWhere = where ? `tenant_id = ? AND (${where})` : "tenant_id = ?";
		const params = [this.context.tenantId, ...whereParams];
		const sql = `SELECT * FROM ${table} WHERE ${tenantWhere} LIMIT 1`;
		return queryOne<T>(this.db, sql, params);
	}

	async queryOneOrThrow<T>(
		table: string,
		where?: string,
		whereParams: unknown[] = [],
		errorMessage = "Record not found",
	): Promise<T> {
		const result = await this.queryOne<T>(table, where, whereParams);
		if (result === null) {
			throw new DatabaseError(errorMessage, "NOT_FOUND");
		}
		return result;
	}

	async findById<T>(table: string, id: string): Promise<T | null> {
		return this.queryOne<T>(table, "id = ?", [id]);
	}

	async findByIdOrThrow<T>(
		table: string,
		id: string,
		errorMessage = "Record not found",
	): Promise<T> {
		const result = await this.findById<T>(table, id);
		if (result === null) {
			throw new DatabaseError(errorMessage, "NOT_FOUND");
		}
		return result;
	}

	async queryMany<T>(
		table: string,
		where?: string,
		whereParams: unknown[] = [],
		options?: { orderBy?: string; limit?: number; offset?: number },
	): Promise<T[]> {
		validateTableName(table);
		const tenantWhere = where ? `tenant_id = ? AND (${where})` : "tenant_id = ?";
		const params = [this.context.tenantId, ...whereParams];

		let sql = `SELECT * FROM ${table} WHERE ${tenantWhere}`;

		if (options?.orderBy) {
			const orderClauses = options.orderBy.split(",").map((clause) => clause.trim());
			const validatedClauses: string[] = [];

			for (const clause of orderClauses) {
				const parts = clause.split(/\s+/);
				if (parts.length > 2) {
					throw new DatabaseError(
						`Invalid ORDER BY clause: "${clause}" has too many parts`,
						"VALIDATION_ERROR",
					);
				}
				validateColumnName(parts[0]);
				const direction = parts[1]?.toUpperCase();
				if (direction && direction !== "ASC" && direction !== "DESC") {
					throw new DatabaseError(`Invalid ORDER BY direction: ${direction}`, "VALIDATION_ERROR");
				}
				validatedClauses.push(`${parts[0]}${direction ? ` ${direction}` : ""}`);
			}

			sql += ` ORDER BY ${validatedClauses.join(", ")}`;
		}

		if (options?.limit !== undefined) {
			const limit = Math.max(0, Math.min(Math.floor(options.limit), 1000));
			sql += ` LIMIT ${limit}`;
		}

		if (options?.offset !== undefined) {
			const offset = Math.max(0, Math.min(Math.floor(options.offset), 100000));
			sql += ` OFFSET ${offset}`;
		}

		return queryMany<T>(this.db, sql, params);
	}

	async insert(
		table: string,
		data: Record<string, unknown>,
		options?: { id?: string },
	): Promise<string> {
		const dataWithTenant = {
			...data,
			tenant_id: this.context.tenantId,
		};
		return insert(this.db, table, dataWithTenant, options);
	}

	async upsert(
		table: string,
		data: Record<string, unknown>,
		options?: { id?: string },
	): Promise<string> {
		const dataWithTenant = {
			...data,
			tenant_id: this.context.tenantId,
		};
		return upsert(this.db, table, dataWithTenant, options);
	}

	async update(
		table: string,
		data: Record<string, unknown>,
		where: string,
		whereParams: unknown[] = [],
	): Promise<number> {
		validateTableName(table);
		const tenantWhere = `tenant_id = ? AND (${where})`;
		const params = [this.context.tenantId, ...whereParams];
		return update(this.db, table, data, tenantWhere, params);
	}

	async updateById(table: string, id: string, data: Record<string, unknown>): Promise<boolean> {
		const changes = await this.update(table, data, "id = ?", [id]);
		return changes > 0;
	}

	async delete(table: string, where: string, whereParams: unknown[] = []): Promise<number> {
		validateTableName(table);
		const tenantWhere = `tenant_id = ? AND (${where})`;
		const params = [this.context.tenantId, ...whereParams];
		return deleteWhere(this.db, table, tenantWhere, params);
	}

	async deleteById(table: string, id: string): Promise<boolean> {
		const changes = await this.delete(table, "id = ?", [id]);
		return changes > 0;
	}

	async exists(table: string, where: string, whereParams: unknown[] = []): Promise<boolean> {
		validateTableName(table);
		const tenantWhere = `tenant_id = ? AND (${where})`;
		const params = [this.context.tenantId, ...whereParams];
		return exists(this.db, table, tenantWhere, params);
	}

	async count(table: string, where?: string, whereParams: unknown[] = []): Promise<number> {
		validateTableName(table);
		const tenantWhere = where ? `tenant_id = ? AND (${where})` : "tenant_id = ?";
		const params = [this.context.tenantId, ...whereParams];
		return count(this.db, table, tenantWhere, params);
	}

	async rawQuery<T>(sql: string, params: unknown[] = []): Promise<T[]> {
		if (!sql.toLowerCase().includes("tenant_id")) {
			throw new TenantContextError(
				"Raw queries must include tenant_id filtering. Use the scoped methods or add tenant_id to your WHERE clause.",
			);
		}
		return queryMany<T>(this.db, sql, params);
	}

	async rawExecute(sql: string, params: unknown[] = []): Promise<ExecuteResult> {
		const sqlLower = sql.toLowerCase();
		if (sqlLower.startsWith("insert") && !sqlLower.includes("tenant_id")) {
			throw new TenantContextError(
				"INSERT statements must include tenant_id. Use the insert() method instead.",
			);
		}
		if (
			(sqlLower.startsWith("update") || sqlLower.startsWith("delete")) &&
			!sqlLower.includes("tenant_id")
		) {
			throw new TenantContextError(
				"UPDATE/DELETE statements must include tenant_id in WHERE clause. Use the scoped methods instead.",
			);
		}
		return execute(this.db, sql, params);
	}
}

export function getTenantDb(db: D1DatabaseOrSession, context: TenantContext): TenantDb {
	return new TenantDb(db, context);
}
