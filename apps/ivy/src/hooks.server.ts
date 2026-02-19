/**
 * SvelteKit Server Hooks
 *
 * Handles session validation via Heartwood (login.grove.place) for all server-side requests.
 * Sets locals.isOwner for triage access control.
 */

import type { Handle } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";

const AUTH_URL = "https://login.grove.place";

// Routes that skip session validation entirely
const PUBLIC_ROUTES = ["/auth/callback", "/auth/logout"];

// Routes with their own auth (HMAC signature verification)
const WEBHOOK_ROUTES = ["/api/webhook/"];

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Skip auth for webhook routes (they have HMAC verification)
	if (WEBHOOK_ROUTES.some((route) => pathname.startsWith(route))) {
		return resolve(event);
	}

	// Skip auth for public routes
	if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
		return resolve(event);
	}

	// Check session with Heartwood
	try {
		const sessionRes = await fetch(`${AUTH_URL}/api/auth/session`, {
			headers: {
				cookie: event.request.headers.get("cookie") || "",
			},
		});

		if (sessionRes.ok) {
			const { user, session } = await sessionRes.json();
			event.locals.user = user;
			event.locals.session = session;

			// Owner check — only the configured owner gets full triage access
			const ownerEmail = event.platform?.env?.OWNER_EMAIL;
			event.locals.isOwner = !!(
				ownerEmail &&
				user?.email &&
				user.email.toLowerCase() === ownerEmail.toLowerCase()
			);
		} else {
			event.locals.isOwner = false;
			// No valid session — redirect to login for protected routes
			if (pathname !== "/" && !pathname.startsWith("/api/")) {
				throw redirect(302, "/");
			}
		}
	} catch (error) {
		// Re-throw redirects
		if (error && typeof error === "object" && "status" in error) {
			throw error;
		}
		event.locals.isOwner = false;
		// On network error, redirect to login page
		if (pathname !== "/" && !pathname.startsWith("/api/")) {
			throw redirect(302, "/");
		}
	}

	return resolve(event);
};
