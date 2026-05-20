import type { Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import { error } from "@sveltejs/kit";
import { validateCSRF } from "@autumnsgrove/lattice/utils";
import { setSecurityHeaders } from "@autumnsgrove/lattice/server";
import {
	pulseHandle,
	createPulseFlushHook,
	createPulseErrorHook,
} from "@autumnsgrove/lattice/pulse";

/**
 * Server hooks for the Plant app
 *
 * Handles CSRF origin checking for all state-changing requests.
 * Pulse observability instrumentation on all requests.
 */

const plantHandle: Handle = async ({ event, resolve }) => {
	// CSRF validation for all state-changing methods (not just POST)
	if (["POST", "PUT", "DELETE", "PATCH"].includes(event.request.method)) {
		if (!validateCSRF(event.request, true)) {
			console.error(
				`[CSRF] Blocked ${event.request.method} ${event.url.pathname}`,
				JSON.stringify({
					origin: event.request.headers.get("origin"),
					host: event.request.headers.get("host"),
					xForwardedHost: event.request.headers.get("x-forwarded-host"),
				}),
			);
			throw error(403, "Cross-site request blocked");
		}
	}

	const response = await resolve(event);

	setSecurityHeaders(response);

	// CSP for plant (Stripe uses redirect-based checkout, simpler CSP)
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' https://cdn.grove.place data: blob:",
		"frame-src https://challenges.cloudflare.com",
		"connect-src 'self' https://*.grove.place",
		"frame-ancestors 'none'",
		"upgrade-insecure-requests",
	].join("; ");

	response.headers.set("Content-Security-Policy", csp);

	return response;
};

export const handle = sequence(pulseHandle({ app: "plant" }), plantHandle, createPulseFlushHook());
export const handleError = createPulseErrorHook({ app: "plant" });
