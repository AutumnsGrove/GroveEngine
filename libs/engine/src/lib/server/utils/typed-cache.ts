/**
 * Typed Cache Reader with Zod Validation
 *
 * Replaces unsafe `(cacheData as any) ?? fallback` patterns with
 * validated cache reads that fall back gracefully on schema mismatch.
 *
 * @module server/utils/typed-cache
 */

import { type ZodSchema } from "zod";

/**
 * Create a typed cache reader that validates on read.
 *
 * Wraps an existing cache service's get method with Zod validation.
 * If the cached data doesn't match the schema (corrupted, stale, different shape),
 * the fallback value is returned instead of crashing.
 *
 * @example
 * ```typescript
 * const TimelineActiveSchema = z.object({
 *   isActive: z.boolean(),
 *   lastRun: z.number(),
 *   summary: z.string(),
 * });
 *
 * const typedCache = createTypedCacheReader(cache);
 * const active = await typedCache.get(
 *   "timeline:active", tenantId,
 *   TimelineActiveSchema,
 *   { isActive: false, lastRun: 0, summary: "" }
 * );
 * // active is TimelineActive — guaranteed by the schema, with safe fallback
 * ```
 */
export function createTypedCacheReader(cache: {
	get: <T>(key: string, tenantId: string) => Promise<T | null>;
}) {
	return {
		async get<T>(key: string, tenantId: string, schema: ZodSchema<T>, fallback: T): Promise<T> {
			const raw = await cache.get(key, tenantId);
			if (raw === null || raw === undefined) return fallback;
			const result = schema.safeParse(raw);
			return result.success ? result.data : fallback;
		},
	};
}

/**
 * Safely parse a JSON string through a Zod schema.
 *
 * Replaces `JSON.parse(raw) as T` with validated parsing.
 * Returns null if the string is invalid JSON or fails validation.
 *
 * @example
 * ```typescript
 * const config = safeJsonParse(rawString, TenantConfigSchema);
 * if (!config) {
 *   // Handle invalid/missing data
 * }
 * ```
 */
export function safeJsonParse<T>(raw: string | null | undefined, schema: ZodSchema<T>): T | null {
	if (raw === null || raw === undefined) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		const result = schema.safeParse(parsed);
		return result.success ? result.data : null;
	} catch {
		return null;
	}
}
