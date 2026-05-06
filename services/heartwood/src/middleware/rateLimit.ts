/**
 * Rate Limiting Middleware
 */

import type { MiddlewareHandler, Context } from "hono";
import type { Env, D1DatabaseOrSession } from "../types.js";
import { checkRateLimit } from "../db/queries.js";
import { getClientIP } from "./security.js";
import {
	RATE_LIMIT_TOKEN_PER_CLIENT,
	RATE_LIMIT_VERIFY_PER_CLIENT,
	RATE_LIMIT_ADMIN_PER_IP,
	RATE_LIMIT_WINDOW,
} from "../utils/constants.js";

interface RateLimitConfig {
	keyPrefix: string;
	limit: number;
	windowSeconds: number;
	getKey: (c: Context<{ Bindings: Env }>) => string | null;
}

/**
 * Create a rate limiting middleware with custom configuration
 */
export function createRateLimiter(config: RateLimitConfig): MiddlewareHandler<{ Bindings: Env }> {
	return async (c, next) => {
		// Skip rate limiting in test environment (E2E tests)
		if (c.env.ENVIRONMENT === "test") {
			return next();
		}

		const keyPart = config.getKey(c);
		if (!keyPart) {
			// Can't identify the key, skip rate limiting
			return next();
		}

		const key = `${config.keyPrefix}:${keyPart}`;
		const { allowed, remaining, resetAt } = await checkRateLimit(
			c.env.DB,
			key,
			config.limit,
			config.windowSeconds,
		);

		// Add rate limit headers
		c.res.headers.set("X-RateLimit-Limit", String(config.limit));
		c.res.headers.set("X-RateLimit-Remaining", String(remaining));
		c.res.headers.set("X-RateLimit-Reset", String(Math.floor(resetAt.getTime() / 1000)));

		if (!allowed) {
			const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
			return c.json(
				{
					error: "rate_limit",
					message: "Too many requests. Please try again later.",
					retry_after: retryAfter,
				},
				429,
				{
					"Retry-After": String(retryAfter),
				},
			);
		}

		return next();
	};
}

/**
 * Rate limiter for token endpoint (by client, falls back to IP)
 *
 * OAuth clients typically send client_id in the POST body, not query params.
 * Since reading the body is async and consumes the stream, we check query
 * params first and fall back to IP-based rate limiting. This ensures the
 * token endpoint is always rate-limited regardless of how client_id is sent.
 */
export const tokenRateLimiter = createRateLimiter({
	keyPrefix: "token",
	limit: RATE_LIMIT_TOKEN_PER_CLIENT,
	windowSeconds: RATE_LIMIT_WINDOW,
	getKey: (c) => {
		const url = new URL(c.req.url);
		return url.searchParams.get("client_id") || getClientIP(c.req.raw);
	},
});

/**
 * Rate limiter for verify endpoint (by client/token)
 */
export const verifyRateLimiter = createRateLimiter({
	keyPrefix: "verify",
	limit: RATE_LIMIT_VERIFY_PER_CLIENT,
	windowSeconds: RATE_LIMIT_WINDOW,
	getKey: (c) => {
		// Use IP as key since we don't know client_id before verification
		return getClientIP(c.req.raw);
	},
});

/**
 * Rate limiter for admin endpoints (by IP)
 * Prevents rapid enumeration of users and audit logs
 */
export const adminRateLimiter = createRateLimiter({
	keyPrefix: "admin",
	limit: RATE_LIMIT_ADMIN_PER_IP,
	windowSeconds: RATE_LIMIT_WINDOW,
	getKey: (c) => getClientIP(c.req.raw),
});

/**
 * Check rate limit for a specific key (for use in routes)
 */
export async function checkRouteRateLimit(
	db: D1DatabaseOrSession,
	keyPrefix: string,
	keyPart: string,
	limit: number,
	windowSeconds: number = RATE_LIMIT_WINDOW,
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
	const key = `${keyPrefix}:${keyPart}`;
	const { allowed, remaining, resetAt } = await checkRateLimit(db, key, limit, windowSeconds);

	if (!allowed) {
		const retryAfter = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
		return { allowed: false, remaining: 0, retryAfter };
	}

	return { allowed: true, remaining };
}
