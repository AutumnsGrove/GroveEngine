/**
 * Security Middleware - Security headers and protections
 */

import type { MiddlewareHandler } from "hono";
import type { Env } from "../types.js";
import { SECURITY_HEADERS } from "../utils/constants.js";

/**
 * Add security headers to all responses
 */
export const securityHeaders: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
	await next();

	// Add security headers
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		c.res.headers.set(key, value);
	}
};

/**
 * Extract client IP address from request
 */
export function getClientIP(request: Request): string {
	// CF-Connecting-IP is set by Cloudflare at the edge and can't be spoofed
	// by the client in production. The X-Real-IP/X-Forwarded-For fallbacks
	// ARE client-controlled — safe only because CF-Connecting-IP is always
	// present on real Cloudflare traffic; they'd allow trivial rate-limit-key
	// rotation if this worker were ever reachable off-CF (direct workers.dev
	// access, local dev, or a future non-CF deployment).
	return (
		request.headers.get("CF-Connecting-IP") ||
		request.headers.get("X-Real-IP") ||
		request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
		"unknown"
	);
}

/**
 * Extract user agent from request
 */
export function getUserAgent(request: Request): string {
	return request.headers.get("User-Agent") || "unknown";
}
