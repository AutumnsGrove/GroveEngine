/**
 * Shared Auth Middleware Factory
 *
 * Creates Hono middleware for API key authentication — the common pattern
 * across Grove's internal worker-to-worker service calls.
 *
 * Handles:
 *   1. Extract token from a configurable header (default: "X-API-Key")
 *   2. Timing-safe comparison against a secret resolved from env
 *   3. Optional context header extraction (tenant ID, tier, etc.)
 *   4. Optional tier allowlist enforcement
 *
 * Workers with unique auth chains (Warden, Zephyr) stay fully custom.
 */

import type { Context, MiddlewareHandler } from "hono";
import { createMiddleware } from "hono/factory";

// =============================================================================
// Timing-safe comparison
// =============================================================================

/**
 * Constant-time string comparison to prevent timing attacks.
 * Compares all characters regardless of match (no early exit).
 * Handles different-length strings safely without leaking length info.
 *
 * Inlined here so infra stays independent of engine's util exports.
 */
function timingSafeEqual(a: string, b: string): boolean {
	const maxLength = Math.max(a.length, b.length);
	let result = a.length ^ b.length;
	for (let i = 0; i < maxLength; i++) {
		result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
	}
	return result === 0;
}

// =============================================================================
// Factory options
// =============================================================================

export interface AuthMiddlewareOptions<
	TEnv extends Record<string, unknown> = Record<string, unknown>,
> {
	/**
	 * Header containing the API key.
	 * Default: "X-API-Key"
	 */
	headerName?: string;

	/**
	 * Optional prefix to strip from the header value before comparison.
	 * Use for Authorization: Bearer <token> — set prefix to "Bearer ".
	 */
	tokenPrefix?: string;

	/**
	 * Resolve the expected secret from env.
	 * Called inside the middleware so the secret is read per-request.
	 */
	getSecret: (env: TEnv) => string | undefined;

	/**
	 * Context headers to extract from the request and set as Hono variables.
	 * Map of { variableName: headerName }, e.g. { tenantId: "X-Tenant-Id" }.
	 *
	 * If a required header is missing the middleware returns 401.
	 * Headers listed here are treated as required.
	 */
	requiredContextHeaders?: Record<string, string>;

	/**
	 * Context headers to extract optionally (missing = undefined, not a failure).
	 * Map of { variableName: headerName }.
	 */
	optionalContextHeaders?: Record<string, string>;

	/**
	 * Tier header name — when set, the middleware reads this header and
	 * validates it against allowedTiers (if provided).
	 */
	tierHeader?: string;

	/**
	 * Valid tier values. If the header value is not in this set, falls back
	 * to the first entry in this array.
	 * Only used when tierHeader is also set.
	 */
	validTiers?: readonly string[];

	/**
	 * Tiers that are NOT allowed to proceed. If the resolved tier is in this
	 * set the middleware returns 403.
	 * Only used when tierHeader is also set.
	 */
	forbiddenTiers?: readonly string[];

	/**
	 * Variable name to set for the resolved tier value.
	 * Default: "tier"
	 */
	tierVariableName?: string;

	/**
	 * Error response builders for each failure case.
	 * Each returns a Response or a { body, status } tuple — use whichever
	 * matches what your worker's error helpers produce.
	 */
	errors?: {
		missingToken?: (c: Context) => Response;
		secretNotConfigured?: (c: Context) => Response;
		invalidToken?: (c: Context) => Response;
		missingContextHeader?: (c: Context, headerName: string) => Response;
		tierForbidden?: (c: Context) => Response;
	};
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a Hono middleware that authenticates via API key.
 *
 * @example Basic API key check
 * ```typescript
 * export const myAuth = createAuthMiddleware<{ Bindings: Env; Variables: MyVars }>({
 *   getSecret: (env) => env.MY_API_KEY,
 *   errors: { ... },
 * });
 * ```
 *
 * @example Bearer token with context headers
 * ```typescript
 * export const myAuth = createAuthMiddleware<{ Bindings: Env; Variables: MyVars }>({
 *   headerName: "Authorization",
 *   tokenPrefix: "Bearer ",
 *   getSecret: (env) => env.MY_API_KEY,
 *   requiredContextHeaders: { tenantId: "X-Tenant-Id" },
 *   tierHeader: "X-Tier",
 *   validTiers: ["wanderer", "seedling", "sapling"],
 *   forbiddenTiers: ["wanderer"],
 *   errors: { ... },
 * });
 * ```
 */
export function createAuthMiddleware<
	THono extends { Bindings: Record<string, any>; Variables: Record<string, any> } = {
		Bindings: Record<string, any>;
		Variables: Record<string, any>;
	},
>(options: AuthMiddlewareOptions<THono["Bindings"]>): MiddlewareHandler<THono> {
	const {
		headerName = "X-API-Key",
		tokenPrefix,
		getSecret,
		requiredContextHeaders = {},
		optionalContextHeaders = {},
		tierHeader,
		validTiers,
		forbiddenTiers,
		tierVariableName = "tier",
		errors = {},
	} = options;

	return createMiddleware<THono>(async (c, next) => {
		// Step 1: Extract token from header
		const rawHeader = c.req.header(headerName);

		if (!rawHeader) {
			if (errors.missingToken) return errors.missingToken(c);
			return c.json(
				{
					success: false,
					error: { code: "AUTH_REQUIRED", message: `Missing ${headerName} header` },
				},
				401,
			);
		}

		const token =
			tokenPrefix && rawHeader.startsWith(tokenPrefix)
				? rawHeader.slice(tokenPrefix.length)
				: rawHeader;

		// Step 2: Resolve secret and timing-safe compare
		const expected = getSecret(c.env as THono["Bindings"]);
		if (!expected) {
			if (errors.secretNotConfigured) return errors.secretNotConfigured(c);
			return c.json(
				{
					success: false,
					error: { code: "INTERNAL_ERROR", message: "API key secret not configured" },
				},
				500,
			);
		}

		if (!timingSafeEqual(token, expected)) {
			if (errors.invalidToken) return errors.invalidToken(c);
			return c.json(
				{ success: false, error: { code: "AUTH_REQUIRED", message: "Invalid API key" } },
				401,
			);
		}

		// Step 3: Extract required context headers
		for (const [varName, hdrName] of Object.entries(requiredContextHeaders)) {
			const value = c.req.header(hdrName);
			if (!value) {
				if (errors.missingContextHeader) return errors.missingContextHeader(c, hdrName);
				return c.json(
					{
						success: false,
						error: { code: "AUTH_REQUIRED", message: `Missing ${hdrName} header` },
					},
					401,
				);
			}
			c.set(varName as never, value as never);
		}

		// Step 4: Extract optional context headers
		for (const [varName, hdrName] of Object.entries(optionalContextHeaders)) {
			const value = c.req.header(hdrName);
			if (value != null) {
				c.set(varName as never, value as never);
			}
		}

		// Step 5: Tier extraction and validation
		if (tierHeader) {
			const rawTier = c.req.header(tierHeader);
			const resolvedTier =
				rawTier && validTiers && validTiers.includes(rawTier)
					? rawTier
					: (validTiers?.[0] ?? rawTier ?? "");

			if (forbiddenTiers && forbiddenTiers.includes(resolvedTier)) {
				if (errors.tierForbidden) return errors.tierForbidden(c);
				return c.json(
					{
						success: false,
						error: { code: "TIER_FORBIDDEN", message: "Access not available on your current tier" },
					},
					403,
				);
			}

			c.set(tierVariableName as never, resolvedTier as never);
		}

		await next();
	});
}
