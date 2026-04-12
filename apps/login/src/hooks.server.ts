import type { Handle } from "@sveltejs/kit";
import { isGroveOrigin, isLocalOrigin, setSecurityHeaders } from "@autumnsgrove/lattice/server";

/**
 * Server hooks for the Login app
 *
 * Security headers are set here. CSRF protection is handled by SvelteKit's
 * built-in csrf.checkOrigin (configured in svelte.config.js trustedOrigins).
 * CSP with nonces is handled by SvelteKit's kit.csp config.
 *
 * CORS: The login hub serves as a proxy for auth API requests. Engine tenant
 * sites (*.grove.place) make cross-origin fetch() calls to /api/auth/* and
 * /session/* endpoints. Without CORS headers, browsers block these requests.
 * This mirrors the CORS behavior previously provided by Heartwood's Hono
 * middleware when auth traffic went directly to auth-api.grove.place.
 *
 * Lightweight — no session resolution (login doesn't have a DB binding).
 * Session presence is checked per-route where needed.
 *
 * Rate limiting: Not implemented at the proxy layer. Handled by Heartwood's
 * D1-based rate limiters + Better Auth's built-in rate limiting (enabled),
 * with Cloudflare WAF rules recommended as an additional layer.
 * See HAWK-001 in docs/security/hawk-report-2026-02-10-login-auth-hub.md
 */

/** Check if a request path is a proxied API route that needs CORS */
function isApiRoute(path: string): boolean {
	return path.startsWith("/api/auth/") || path.startsWith("/session/");
}

/** Build CORS headers for a validated origin */
function getCorsHeaders(origin: string): Record<string, string> {
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Credentials": "true",
		"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, Authorization",
		"Access-Control-Max-Age": "86400",
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	const { request, url } = event;
	const origin = request.headers.get("Origin");
	const isApi = isApiRoute(url.pathname);
	const isAllowedOrigin = !!origin && (isGroveOrigin(origin) || isLocalOrigin(origin));

	// Handle CORS preflight (OPTIONS) for API routes
	if (isApi && request.method === "OPTIONS" && isAllowedOrigin) {
		return new Response(null, {
			status: 204,
			headers: getCorsHeaders(origin),
		});
	}

	const response = await resolve(event);

	// Add CORS headers to API route responses for allowed origins
	if (isApi && isAllowedOrigin) {
		const corsHeaders = getCorsHeaders(origin);
		for (const [key, value] of Object.entries(corsHeaders)) {
			response.headers.set(key, value);
		}
		// Vary: Origin ensures CDN/proxies don't serve cached CORS headers
		// intended for one origin to a different origin
		response.headers.append("Vary", "Origin");
	}

	// Security headers (CSP is handled by SvelteKit's kit.csp config with nonces)
	setSecurityHeaders(response);

	return response;
};
