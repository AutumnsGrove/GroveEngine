/**
 * OAuth Callback - Handle Better Auth authentication response
 *
 * With Better Auth, the OAuth flow is handled entirely by GroveAuth.
 * This callback just verifies the session cookie was set and redirects
 * to the requested destination.
 *
 * Flow:
 * 1. User clicks "Sign in with Google" → redirects to Better Auth
 * 2. Better Auth handles OAuth with Google
 * 3. Better Auth sets session cookie and redirects here
 * 4. We verify cookie exists and redirect to /arbor (or returnTo)
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { sanitizeReturnTo } from "@autumnsgrove/lattice/utils/grove-url";

// =============================================================================
// Constants
// =============================================================================

/** Better Auth session cookie names (production uses __Secure- prefix) */
const BETTER_AUTH_COOKIE = "better-auth.session_token";
const BETTER_AUTH_COOKIE_SECURE = "__Secure-better-auth.session_token";

// =============================================================================
// Error Messages
// =============================================================================

const ERROR_MESSAGES: Record<string, string> = {
	access_denied: "You cancelled the login process",
	auth_failed: "Authentication failed, please try again",
	no_session: "Session was not created, please try again",
};

function getFriendlyErrorMessage(errorCode: string): string {
	return ERROR_MESSAGES[errorCode] || "An error occurred during login";
}

// =============================================================================
// Handler
// =============================================================================

export const GET: RequestHandler = async ({ url, cookies }) => {
	// Check for error from OAuth provider
	const errorParam = url.searchParams.get("error");
	if (errorParam) {
		console.error("[Auth Callback] Error from provider:", errorParam);
		const friendlyMessage = getFriendlyErrorMessage(
			errorParam === "access_denied" ? "access_denied" : "auth_failed",
		);
		throw redirect(302, `/arbor/login?error=${encodeURIComponent(friendlyMessage)}`);
	}

	// Get return URL from query params (set by LoginGraft), sanitized to prevent open redirects
	const returnTo = sanitizeReturnTo(url.searchParams.get("returnTo"), "/arbor");

	// Verify Better Auth session cookie was set
	// Better Auth sets this cookie during the OAuth callback at GroveAuth
	// Check both prefixed (production HTTPS) and unprefixed (development) variants
	const sessionToken = cookies.get(BETTER_AUTH_COOKIE_SECURE) || cookies.get(BETTER_AUTH_COOKIE);

	if (!sessionToken) {
		console.warn("[Auth Callback] No session cookie found");
		throw redirect(
			302,
			`/arbor/login?error=${encodeURIComponent(getFriendlyErrorMessage("no_session"))}`,
		);
	}

	// Success! Redirect to the requested destination
	throw redirect(302, returnTo);
};
