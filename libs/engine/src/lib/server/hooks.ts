/**
 * Grove Hooks Utilities
 *
 * Shared helpers for SvelteKit hooks.server.ts files.
 * Import via: import { ... } from "@autumnsgrove/lattice/server"
 */

/** Parse a specific cookie by name from the cookie header (word-boundary safe). */
export function getCookie(cookieHeader: string | null, name: string): string | null {
	if (!cookieHeader) return null;
	// Word boundary ((?:^|;\s*)) prevents matching substrings,
	// e.g. "session=" must not match inside "grove_session="
	const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
	return match ? match[1] : null;
}

/** Extract the Grove or Better Auth session cookie from a cookie header. */
export function extractSessionCookie(cookieHeader: string | null): string | null {
	const groveSession = getCookie(cookieHeader, "grove_session");
	const betterAuthSession =
		getCookie(cookieHeader, "__Secure-better-auth.session_token") ||
		getCookie(cookieHeader, "better-auth.session_token");
	return groveSession || betterAuthSession;
}

/** Apply the five core Grove security headers to a response. */
export function setSecurityHeaders(response: Response): Response {
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
	response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
	return response;
}

/** Matches https://<single-level-subdomain>.grove.place — prevents nested subdomain abuse. */
export const GROVE_ORIGIN_RE = /^https:\/\/[a-z0-9-]+\.grove\.place$/;

/** True for any valid https://*.grove.place origin (single-level subdomain only). */
export function isGroveOrigin(origin: string): boolean {
	return GROVE_ORIGIN_RE.test(origin);
}

/** True for localhost and 127.0.0.1 origins (local development). */
export function isLocalOrigin(origin: string): boolean {
	try {
		const url = new URL(origin);
		return url.hostname === "localhost" || url.hostname === "127.0.0.1";
	} catch {
		return false;
	}
}
