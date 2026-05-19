/**
 * Heartwood Auth Client
 *
 * Client-side auth client for Grove services.
 * Integrates Better Auth with Cloudflare-specific optimizations.
 * Auth method: Google OAuth only.
 */

import { createAuthClient } from "better-auth/client";
import { twoFactorClient as twoFactorClientPlugin } from "better-auth/client/plugins";

const AUTH_BASE_URL = "https://login.grove.place";

export const authClient = createAuthClient({
	baseURL: AUTH_BASE_URL,
	plugins: [twoFactorClientPlugin()],
});

export type Session = typeof authClient.$Infer.Session.session;
export type User = typeof authClient.$Infer.Session.user;

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(options?: { callbackURL?: string }) {
	return authClient.signIn.social({
		provider: "google",
		callbackURL: options?.callbackURL || "/",
	});
}

/**
 * Get the current session
 */
export async function getSession() {
	return authClient.getSession();
}

/**
 * Get the current user
 */
export async function getUser() {
	const session = await authClient.getSession();
	return session.data?.user || null;
}

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated() {
	const session = await authClient.getSession();
	return !!session.data?.session;
}

/**
 * Sign out
 */
export async function signOut() {
	return authClient.signOut();
}

// =============================================================================
// TWO-FACTOR AUTHENTICATION
// =============================================================================

/**
 * Enable 2FA - generates TOTP secret and returns setup info
 * Note: For OAuth users without password, pass empty string
 */
export async function enableTwoFactor(password = "") {
	return authClient.twoFactor.enable({ password });
}

/**
 * Verify 2FA setup with a TOTP code
 */
export async function verifyTwoFactorSetup(code: string) {
	return authClient.twoFactor.verifyTotp({ code });
}

/**
 * Disable 2FA - requires password (empty for OAuth users)
 */
export async function disableTwoFactor(password = "") {
	return authClient.twoFactor.disable({ password });
}

/**
 * Verify 2FA during login
 */
export async function verifyTwoFactor(code: string) {
	return authClient.twoFactor.verifyTotp({ code });
}

/**
 * Generate new backup codes
 */
export async function generateBackupCodes(password = "") {
	return authClient.twoFactor.generateBackupCodes({ password });
}

/**
 * Get the raw 2FA client for direct access to all methods
 */
export const twoFactorClient = authClient.twoFactor;

export default authClient;
