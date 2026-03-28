/**
 * Auth Callback - Business Logic Service
 *
 * Session verification, identity resolution, onboarding upsert,
 * and pre-Plant user detection.
 */

import { redirect } from "@sveltejs/kit";
import { PLANT_ERRORS, logPlantError, buildPlantErrorUrl } from "$lib/errors";

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

/** Check if a thrown value is a SvelteKit redirect */
function isRedirect(err: unknown): boolean {
	return (
		err != null &&
		typeof err === "object" &&
		"status" in err &&
		typeof (err as { status: unknown }).status === "number" &&
		(err as { status: number }).status >= 300 &&
		(err as { status: number }).status < 400
	);
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
	cookies: { get: (name: string) => string | undefined },
	path: string,
): string {
	const sessionToken = cookies.get(BETTER_AUTH_COOKIE_SECURE) || cookies.get(BETTER_AUTH_COOKIE);

	if (!sessionToken) {
		errorRedirect(PLANT_ERRORS.NO_SESSION_COOKIE, {
			path,
			detail: "No Better Auth session cookie found after OAuth callback",
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
		existing = (await db
			.prepare(
				"SELECT id, tenant_id, profile_completed_at FROM user_onboarding WHERE groveauth_id = ?",
			)
			.bind(userId)
			.first()) as OnboardingRecord | null;
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
			existing = (await db
				.prepare(
					"SELECT id, tenant_id, profile_completed_at FROM user_onboarding WHERE LOWER(email) = ?",
				)
				.bind(userEmail.toLowerCase())
				.first()) as OnboardingRecord | null;

			if (existing) {
				console.log(
					`[Auth Callback] Found onboarding by email, updating groveauth_id for ${userId.slice(0, 8)}...`,
				);
				await db
					.prepare(
						"UPDATE user_onboarding SET groveauth_id = ?, updated_at = unixepoch() WHERE id = ?",
					)
					.bind(userId, existing.id)
					.run();
			}
		} catch (err) {
			console.warn("[Auth Callback] Email fallback query failed:", err);
		}
	}

	return existing;
}

// ============================================================================
// Step 3b: Check for Pre-Plant Users
// ============================================================================

export async function checkPrePlantUser(db: D1Database, userEmail: string): Promise<void> {
	try {
		const existingUser = (await db
			.prepare("SELECT tenant_id FROM users WHERE LOWER(email) = ? AND tenant_id IS NOT NULL")
			.bind(userEmail.toLowerCase())
			.first()) as { tenant_id: string } | null;

		if (existingUser) {
			const tenant = (await db
				.prepare("SELECT subdomain FROM tenants WHERE id = ? AND active = 1")
				.bind(existingUser.tenant_id)
				.first()) as { subdomain: string } | null;

			if (tenant && /^[a-z0-9-]+$/.test(tenant.subdomain)) {
				console.log(
					`[Auth Callback] Pre-Plant user detected, redirecting to ${tenant.subdomain}.grove.place/arbor`,
				);
				redirect(302, `https://${tenant.subdomain}.grove.place/arbor`);
			}
		}

		if (!existingUser) {
			const tenant = (await db
				.prepare("SELECT subdomain FROM tenants WHERE LOWER(email) = ? AND active = 1")
				.bind(userEmail.toLowerCase())
				.first()) as { subdomain: string } | null;

			if (tenant && /^[a-z0-9-]+$/.test(tenant.subdomain)) {
				console.log(
					`[Auth Callback] Tenant found by email, redirecting to ${tenant.subdomain}.grove.place/arbor`,
				);
				redirect(302, `https://${tenant.subdomain}.grove.place/arbor`);
			}
		}
	} catch (err) {
		if (isRedirect(err)) throw err;
		console.warn("[Auth Callback] Tenant fallback lookup failed:", err);
	}
}

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
				await db
					.prepare(
						`UPDATE user_onboarding
             SET auth_completed_at = unixepoch(),
                 email_verified = CASE WHEN email_verified = 0 THEN 1 ELSE email_verified END,
                 email_verified_at = CASE WHEN email_verified = 0 THEN unixepoch() ELSE email_verified_at END,
                 email_verified_via = CASE WHEN email_verified = 0 THEN 'oauth' ELSE email_verified_via END,
                 updated_at = unixepoch()
             WHERE id = ?`,
					)
					.bind(onboardingId)
					.run();
			} else {
				await db
					.prepare(
						"UPDATE user_onboarding SET auth_completed_at = unixepoch(), updated_at = unixepoch() WHERE id = ?",
					)
					.bind(onboardingId)
					.run();
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
				await db
					.prepare(
						`INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, email_verified, email_verified_at, email_verified_via, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), 1, unixepoch(), 'oauth', unixepoch(), unixepoch())`,
					)
					.bind(onboardingId, user.id, user.email, displayName)
					.run();
			} else {
				await db
					.prepare(
						`INSERT INTO user_onboarding (id, groveauth_id, email, display_name, auth_completed_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, unixepoch(), unixepoch(), unixepoch())`,
					)
					.bind(onboardingId, user.id, user.email, displayName)
					.run();
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
	onboardingId: string,
	path: string,
): Promise<string | null> {
	let tenantSubdomain: string | null = null;

	if (existingOnboarding.tenant_id) {
		try {
			const tenant = (await db
				.prepare("SELECT subdomain FROM tenants WHERE id = ?")
				.bind(existingOnboarding.tenant_id)
				.first()) as { subdomain: string } | null;

			if (tenant && /^[a-z0-9-]+$/.test(tenant.subdomain)) {
				tenantSubdomain = tenant.subdomain;
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
	} else {
		// Cross-reference users/tenants tables
		try {
			const existingUser = (await db
				.prepare("SELECT tenant_id FROM users WHERE LOWER(email) = ? AND tenant_id IS NOT NULL")
				.bind(user.email.toLowerCase())
				.first()) as { tenant_id: string } | null;

			if (existingUser) {
				const tenant = (await db
					.prepare("SELECT id, subdomain FROM tenants WHERE id = ? AND active = 1")
					.bind(existingUser.tenant_id)
					.first()) as { id: string; subdomain: string } | null;

				if (tenant && /^[a-z0-9-]+$/.test(tenant.subdomain)) {
					await db
						.prepare(
							"UPDATE user_onboarding SET tenant_id = ?, updated_at = unixepoch() WHERE id = ?",
						)
						.bind(tenant.id, onboardingId)
						.run();
					tenantSubdomain = tenant.subdomain;
				}
			}

			if (!tenantSubdomain) {
				const tenant = (await db
					.prepare("SELECT id, subdomain FROM tenants WHERE LOWER(email) = ? AND active = 1")
					.bind(user.email.toLowerCase())
					.first()) as { id: string; subdomain: string } | null;

				if (tenant && /^[a-z0-9-]+$/.test(tenant.subdomain)) {
					await db
						.prepare(
							"UPDATE user_onboarding SET tenant_id = ?, updated_at = unixepoch() WHERE id = ?",
						)
						.bind(tenant.id, onboardingId)
						.run();
					tenantSubdomain = tenant.subdomain;
				}
			}
		} catch (err) {
			console.warn("[Auth Callback] Cross-reference tenant lookup failed:", err);
		}
	}

	return tenantSubdomain;
}
