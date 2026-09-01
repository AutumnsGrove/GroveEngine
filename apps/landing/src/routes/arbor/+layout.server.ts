import { redirect, error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { loadChannelMessages } from "@autumnsgrove/lattice/services";
import { isWayfinder, WAYFINDER_EMAILS } from "@autumnsgrove/lattice/platform/config";

/**
 * Admin Layout Server
 *
 * Handles authentication once for all /arbor/* routes.
 * Child pages can access user data via `await parent()`.
 *
 * Wayfinder-only pages (greenhouse, porch) should check
 * `parentData.isWayfinder` before allowing access.
 */

// Demo mode: off by default, only live when DEMO_MODE_SECRET is set (never in
// production) — mirrors apps/aspen's ?demo=<secret> bypass so the Wayfinder
// /arbor tools can be exercised locally without a real Google OAuth round
// trip. Unlike Aspen's demo user (a stand-in tenant owner), this one must be
// a REAL Wayfinder email, since every page here gates on isWayfinder(email),
// not tenant ownership.
const DEMO_MODE_COOKIE_NAME = "grove_demo_mode";

function isDemoRequest(
	url: URL,
	envSecret: string | undefined,
	cookieValue: string | undefined,
): boolean {
	if (!envSecret) return false;
	if (url.searchParams.get("demo") === envSecret) return true;
	return cookieValue === envSecret;
}

function getDemoWayfinderUser() {
	return {
		id: "demo-wayfinder-001",
		email: WAYFINDER_EMAILS[0],
		name: "Demo Wayfinder",
		is_admin: true,
	};
}

// Landing has no real "-beta.grove.place" deployment of its own (only Aspen
// does — see docs/plans/planned/beta-environment-architecture.md), so unlike
// apps/aspen/src/lib/server/beta.ts, there's no remote signal to check here.
// This is just the local-branch half of that same idea: show the chip when
// the beta branch is checked out locally, gated to localhost so it can never
// mean anything on a real deployment.
function isLocalBetaBranch(url: URL): boolean {
	return url.hostname === "localhost" && __GIT_BRANCH__ === "beta";
}

export const load: LayoutServerLoad = async ({ locals, url, platform, cookies }) => {
	// Allow access to login page (its +page.server.ts handles the redirect to login hub)
	if (url.pathname === "/arbor/login") {
		return { user: locals.user, isWayfinder: false, messages: [] };
	}

	const isDemoMode = isDemoRequest(
		url,
		platform?.env?.DEMO_MODE_SECRET,
		cookies.get(DEMO_MODE_COOKIE_NAME),
	);

	if (isDemoMode) {
		// Keep the ?demo= proof alive across navigation the same way Aspen
		// does, so clicking around /arbor doesn't drop back out to login.
		cookies.set(DEMO_MODE_COOKIE_NAME, platform!.env!.DEMO_MODE_SECRET!, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			maxAge: 60 * 60 * 8,
		});
	}

	const user = isDemoMode ? getDemoWayfinderUser() : locals.user;

	// Auth check - redirect to login if not authenticated (and not demoing)
	if (!user) {
		throw redirect(302, `/arbor/login?redirect=${encodeURIComponent(url.pathname)}`);
	}

	// Admin check - only admins can access /arbor/*
	if (!user.is_admin) {
		throw error(403, "Admin access required");
	}

	// Determine if user is the Wayfinder (has access to greenhouse, porch, etc.)
	const wayfinderCheck = isWayfinder(user.email);

	// Fetch arbor-channel messages for admin panel banner
	const messages = platform?.env?.DB
		? await loadChannelMessages(platform.env.DB, "arbor").catch((err) => {
				console.error("[Arbor] Failed to load messages:", err);
				return [];
			})
		: [];

	return {
		user,
		isWayfinder: wayfinderCheck,
		isDemoMode,
		isBeta: isLocalBetaBranch(url),
		messages,
	};
};
