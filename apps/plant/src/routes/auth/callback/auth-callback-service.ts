/**
 * Auth Callback - Business Logic Service
 *
 * Session verification, identity resolution, onboarding upsert,
 * and pre-Plant user detection.
 */

import { redirect, isRedirect } from "@sveltejs/kit";
import { PLANT_ERRORS, logPlantError, buildPlantErrorUrl } from "$lib/errors";
import { queryOne, execute } from "@autumnsgrove/lattice/server/services/database";

/** Better Auth session cookie names */
const BETTER_AUTH_COOKIE = "better-auth.session_token";
const BETTER_AUTH_COOKIE_SECURE = "__Secure-better-auth.session_token";

/**
 * Redirect with a structured error (logs and throws).
 */
function errorRedirect(
	error: (typeof PLANT_ERRORS)[keyof typeof PLANT_ERRORS],
	context: { path?: string; userId?: string; detail?: string; cause?: unknown },
	extra?: Record<string, string>,
): never {
	logPlantError(error, context);
	redirect(302, buildPlantErrorUrl(error, "/", extra));
}

// ============================================================================
// Types
// ============================================================================

interface SessionData {
	session?: {
		id: string;
		userId: string;
		token: string;
		expiresAt: string;
	};
	user?: {
		id: string;
		email: string;
		name?: string;
		emailVerified?: boolean;
	};
}

interface OnboardingRecord {
	id: string;
	tenant_id: string | null;
	profile_completed_at: number | null;
}

// ============================================================================
// Step 1: Get Session Token
// ============================================================================

export function getSessionToken(
	cookies: { get: (name: string) => string | undefined; getAll: () => Array<{ name: string }> },
	path: string,
): string {
	const sessionToken = cookies.get(BETTER_AUTH_COOKIE_SECURE) || cookies.get(BETTER_AUTH_COOKIE);

	if (!sessionToken) {
		// Log available cookies to diagnose why the session cookie is missing
		const availableCookies = cookies.getAll().map((c) => c.name);
		console.error("[Auth Callback] Missing session cookie. Available cookies:", availableCookies);

		errorRedirect(PLANT_ERRORS.NO_SESSION_COOKIE, {
			path,
			detail: `No Better Auth session cookie found. Available: [${availableCookies.join(", ")}]`,
		});
	}

	return sessionToken;
}

// ============================================================================
// Step 2: Fetch Session Data
// ============================================================================

export async function fetchSessionData(
	authBinding: { fetch: typeof fetch },
	authBaseUrl: string,
	cookieHeader: string,
	path: string,
): Promise<{
	user: NonNullable<SessionData["user"]>;
	session: NonNullable<SessionData["session"]>;
}> {
	let sessionData: SessionData;

	try {
		const sessionResponse = await authBinding.fetch(`${authBaseUrl}/api/auth/get-session`, {
			method: "GET",
			headers: { Cookie: cookieHeader },
		});

		if (!sessionResponse.ok) {
			errorRedirect(PLANT_ERRORS.SESSION_FETCH_FAILED, {
				path,
				detail: `Status ${sessionResponse.status}`,
			});
		}

		sessionData = (await sessionResponse.json()) as SessionData;
	} catch (err) {
		if (isRedirect(err)) throw err;
		errorRedirect(PLANT_ERRORS.SESSION_FETCH_FAILED, {
			path,
			detail: "Network or parse error fetching session",
			cause: err,
		});
	}

	if (!sessionData!.session || !sessionData!.user) {
		errorRedirect(PLANT_ERRORS.NO_SESSION_DATA, {
			path,
			detail: "Session response was 200 but missing session/user fields",
		});
	}

	return { user: sessionData!.user!, session: sessionData!.session! };
}

// ============================================================================
// Step 3: Resolve Onboarding Record
// ============================================================================

export async function resolveOnboarding(
	db: D1Database,
	userId: string,
	userEmail: string,
	path: string,
): Promise<OnboardingRecord | null> {
	// Try by groveauth_id first
	let existing: OnboardingRecord | null = null;

	try {
		existing = await queryOne<OnboardingRecord>(
			db,
			"SELECT id, tenant_id, profile_completed_at FROM user_onboarding WHERE groveauth_id = ?",
			[userId],
		);
	} catch (err) {
		errorRedirect(PLANT_ERRORS.ONBOARDING_QUERY_FAILED, {
			path,
			userId,
			detail: "SELECT user_onboarding by groveauth_id failed",
			cause: err,
		});
	}

	// Fallback: look up by email
	if (!existing) {
		try {
			existing = await queryOne<OnboardingRecord>(
				db,
				"SELECT id, tenant_id, profile_completed_at FROM user_onboarding WHERE LOWER(email) = ?",
				[userEmail.toLowerCase()],
			);

			if (existing) {
				console.log(
					`[Auth Callback] Found onboarding by email, updating groveauth_id for ${userId.slice(0, 8)}...`,
				);
				await execute(
					db,
					"UPDATE user_onboarding SET groveauth_id = ?, updated_at = unixepoch() WHERE id = ?",
					[userId, existing.id],
				);
			}
		} catch (err) {
			console.warn("[Auth Callback] Email fallback query failed:", err);
		}
	}

	return existing;
}

// Step 3b (checkPrePlantUser) removed — migration 107 backfills users.tenant_id
// from user_onboarding, so resolveOnboarding() handles all cases.

// ============================================================================
// Step 4: Upsert Onboarding Record
// ============================================================================

export async function upsertOnboarding(
	db: D1Database,
	existingOnboarding: OnboardingRecord | null,
	user: { id: string; email: string; name?: string; emailVerified?: boolean },
	path: string,
): Promise<{ onboardingId: string; isNewUser: boolean; tenantSubdomain: string | null }> {
	if (existingOnboarding) {
		const onboardingId = existingOnboarding.id;
		const emailVerified = user.emailVerified === true;

		try {
			if (emailVerified) {
				await execute(
					db,
					`UPDATE user_onboarding
             SET auth_completed_at = unixepoch(),
                 email_verified = CASE WHEN email_verified = 0 THEN 1 ELSE email_verified END,
                 email_verified_at = CASE WHEN email_verified = 0 THEN unixepoch() ELSE email_verified_at END,
                 email_verified_via = CASE WHEN email_verified = 0 THEN 'oauth' ELSE email_verified_via END,
                 updated_at = unixepoch()
             WHERE id = ?`,
					[onboardingId],
				);
			} else {
				await execute(
					db,
					"UPDATE user_onboarding SET auth_completed_at = unixepoch(), updated_at = unixepoch() WHERE id = ?",
					[onboardingId],
				);
			}
		} catch (err) {
			errorRedirect(PLANT_ERRORS.ONBOARDING_UPDATE_FAILED, {
				path,
				userId: user.id,
				detail: `UPDATE user_onboarding id=${onboardingId}`,
				cause: err,
			});
		}

		// Resolve tenant subdomain
		const tenantSubdomain = await resolveTenantSubdomain(
			db,
			existingOnboarding,
			user,
			onboardingId,
			path,
		);

		return { onboardingId, isNewUser: false, tenantSubdomain };
	} else {
		// New user
		const onboardingId = crypto.randomUUID();
		const displayName = user.name || user.email.split("@")[0];
		const emailVerified = user.emailVerified === true;

		try {
			if (emailVerified) {
				await execute(
					db,
					`INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, email_verified, email_verified_at, email_verified_via, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), 1, unixepoch(), 'oauth', unixepoch(), unixepoch())`,
					[onboardingId, user.id, user.email, displayName],
				);
			} else {
				await execute(
					db,
					`INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), unixepoch(), unixepoch())`,
					[onboardingId, user.id, user.email, displayName],
				);
			}

			console.log("[Auth Callback] Created onboarding record:", onboardingId);
		} catch (err) {
			errorRedirect(PLANT_ERRORS.ONBOARDING_INSERT_FAILED, {
				path,
				userId: user.id,
				detail: `INSERT user_onboarding for ${user.email}`,
				cause: err,
			});
		}

		return { onboardingId, isNewUser: true, tenantSubdomain: null };
	}
}

// ============================================================================
// Internal: Resolve Tenant Subdomain for Existing Users
// ============================================================================

async function resolveTenantSubdomain(
	db: D1Database,
	existingOnboarding: OnboardingRecord,
	user: { id: string; email: string },
	_onboardingId: string,
	path: string,
): Promise<string | null> {
	if (!existingOnboarding.tenant_id) {
		return null;
	}

	try {
		const tenant = await queryOne<{ subdomain: string }>(
			db,
			"SELECT subdomain FROM tenants WHERE id = ?",
			[existingOnboarding.tenant_id],
		);

		if (tenant && /^[a-z0-9-]+$/.test(tenant.subdomain)) {
			return tenant.subdomain;
		}
	} catch (err) {
		if (isRedirect(err)) throw err;
		errorRedirect(PLANT_ERRORS.TENANT_QUERY_FAILED, {
			path,
			userId: user.id,
			detail: `SELECT tenants for id=${existingOnboarding.tenant_id}`,
			cause: err,
		});
	}

	return null;
}
