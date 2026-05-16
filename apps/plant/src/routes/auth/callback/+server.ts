/**
 * OAuth Callback - Handle Better Auth authentication response
 *
 * Thin routing layer — delegates to auth-callback-service.ts.
 * Steps: check errors, verify session, resolve identity, upsert onboarding, redirect.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { PLANT_ERRORS, logPlantError, buildPlantErrorUrl } from "$lib/errors";
import { AUTH_HUB_URL } from "@autumnsgrove/lattice/platform/config";
import { emitPulseEvent } from "@autumnsgrove/lattice/pulse";
import {
	getSessionToken,
	fetchSessionData,
	resolveOnboarding,
	upsertOnboarding,
} from "./auth-callback-service";
import { CloudflareDatabase } from "@autumnsgrove/infra/cloudflare";

function errorRedirect(
	error: (typeof PLANT_ERRORS)[keyof typeof PLANT_ERRORS],
	context: { path?: string; userId?: string; detail?: string; cause?: unknown },
	extra?: Record<string, string>,
): never {
	logPlantError(error, context);
	redirect(302, buildPlantErrorUrl(error, "/", extra));
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	const env = platform?.env as Record<string, string> | undefined;
	const authBaseUrl = env?.GROVEAUTH_URL || AUTH_HUB_URL;
	const rawDb = platform?.env?.DB;
	const db = rawDb ? new CloudflareDatabase(rawDb) : null;
	const path = url.pathname;

	// Check for error from OAuth provider
	const errorParam = url.searchParams.get("error");
	if (errorParam) {
		if (errorParam === "access_denied") {
			errorRedirect(PLANT_ERRORS.OAUTH_ACCESS_DENIED, {
				path,
				detail: `OAuth error: ${errorParam}`,
			});
		}
		errorRedirect(PLANT_ERRORS.OAUTH_PROVIDER_ERROR, {
			path,
			detail: `OAuth error: ${errorParam}`,
		});
	}

	// Pre-flight checks
	if (!db) errorRedirect(PLANT_ERRORS.DB_UNAVAILABLE, { path });
	if (!platform?.env?.AUTH) errorRedirect(PLANT_ERRORS.AUTH_BINDING_MISSING, { path });

	// Step 1: Verify session cookie
	getSessionToken(cookies, path);

	// Step 2: Fetch session/user data
	const allCookies = cookies.getAll();
	const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

	const { user, session } = await fetchSessionData(
		platform.env.AUTH,
		authBaseUrl,
		cookieHeader,
		path,
	);

	console.log(`[Auth Callback] Session verified for user ${user.id.slice(0, 8)}...`);

	emitPulseEvent("signup.oauth_complete", {
		app: "plant",
		route: "/auth/callback",
		metadata: { user_id: user.id, is_new: !user.name },
	});

	// Step 3: Check existing onboarding record
	const existingOnboarding = await resolveOnboarding(db, user.id, user.email, path);

	// Step 4: Create or update onboarding record
	const { onboardingId, isNewUser, tenantSubdomain } = await upsertOnboarding(
		db,
		existingOnboarding,
		user,
		path,
	);

	// If they have a tenant, redirect to arbor
	if (tenantSubdomain) {
		redirect(302, `https://${tenantSubdomain}.grove.place/arbor`);
	}

	// Step 5: Set cookies
	try {
		const isProduction = url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

		const cookieOptions = {
			path: "/",
			httpOnly: true,
			secure: isProduction,
			sameSite: "lax" as const,
			maxAge: 60 * 60 * 24 * 30,
		};

		cookies.set("onboarding_id", onboardingId, cookieOptions);

		if (session.token) {
			cookies.set("access_token", session.token, {
				...cookieOptions,
				maxAge: 60 * 60,
			});
		}
	} catch (err) {
		errorRedirect(PLANT_ERRORS.COOKIE_ERROR, { path, userId: user.id, cause: err });
	}

	// Step 6: Redirect to next step
	const hasCompletedProfile = existingOnboarding?.profile_completed_at != null;

	// Clean up old PKCE cookies
	cookies.delete("auth_state", { path: "/" });
	cookies.delete("auth_code_verifier", { path: "/" });

	if (!hasCompletedProfile) {
		redirect(302, "/profile");
	} else {
		redirect(302, "/plans");
	}
};
