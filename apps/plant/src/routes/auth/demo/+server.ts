/**
 * Demo Mode — Local Dev Google Sign-In Bypass
 *
 * Stands in for the real OAuth round trip (Google → Better Auth → Heartwood)
 * so the full onboarding flow can be exercised locally without those services
 * running. Reuses resolveOnboarding/upsertOnboarding from the real callback —
 * a demo visit produces the exact same user_onboarding row shape a real
 * sign-in would, just with a generated placeholder email instead of a Google
 * identity.
 *
 * Inert unless DEMO_MODE_SECRET is set (never in production). See
 * apps/aspen/src/routes/arbor/+layout.server.ts for the sibling pattern.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { CloudflareDatabase } from "@autumnsgrove/infra/cloudflare";
import { resolveOnboarding, upsertOnboarding } from "../callback/auth-callback-service";

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
	const demoSecret = platform?.env?.DEMO_MODE_SECRET;
	if (!demoSecret || url.searchParams.get("demo") !== demoSecret) {
		return new Response("Not found", { status: 404 });
	}

	const rawDb = platform?.env?.DB;
	if (!rawDb) {
		return new Response("Database not available", { status: 503 });
	}
	const db = new CloudflareDatabase(rawDb);

	const demoId = crypto.randomUUID();
	const groveauthId = `demo-${demoId}`;
	const email = `demo+${demoId.slice(0, 8)}@grove.place`;

	const existingOnboarding = await resolveOnboarding(db, groveauthId, email, url.pathname);
	const { onboardingId, tenantSubdomain } = await upsertOnboarding(
		db,
		existingOnboarding,
		{ id: groveauthId, email, emailVerified: true },
		url.pathname,
	);

	if (tenantSubdomain) {
		redirect(302, `https://${tenantSubdomain}.grove.place/arbor`);
	}

	const cookieOptions = {
		path: "/",
		httpOnly: true,
		secure: false,
		sameSite: "lax" as const,
		maxAge: 60 * 60 * 24 * 30,
	};

	cookies.set("onboarding_id", onboardingId, cookieOptions);
	// No real Better Auth session exists in demo mode — this dummy token only
	// satisfies the `!accessToken` presence check in +layout.server.ts. It
	// will fail if something tries to use it against Heartwood (e.g. account
	// page 2FA actions), which is out of scope for the signup flow.
	cookies.set("access_token", `demo-${demoId}`, { ...cookieOptions, maxAge: 60 * 60 });
	// Matches Aspen's grove_demo_mode cookie — +layout.server.ts reads this
	// to show the same DemoBadge chip throughout the onboarding flow.
	cookies.set("grove_demo_mode", demoSecret, cookieOptions);

	redirect(302, "/profile");
};
