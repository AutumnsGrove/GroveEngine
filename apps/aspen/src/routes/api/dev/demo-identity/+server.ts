/**
 * Dev-only Demo Identity Switcher
 *
 * Lets a local demo session act as a DIFFERENT seeded tenant's owner than
 * the one currently being viewed, via the grove_demo_identity cookie read
 * in hooks.server.ts. Needed to test cross-account features (Lantern
 * friends, Reeds comments) where viewing and acting-as can't be the same
 * tenant.
 *
 * Inert unless DEMO_MODE_SECRET is set (never in production).
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getCookie } from "@autumnsgrove/lattice/server";
import { listDemoIdentities } from "@autumnsgrove/lattice/server/services/users";

const DEMO_IDENTITY_COOKIE_NAME = "grove_demo_identity";
const SEED_TENANT_PREFIX = "example-tenant-";

export const GET: RequestHandler = async ({ platform, request, locals }) => {
	const demoSecret = platform?.env?.DEMO_MODE_SECRET;
	if (!demoSecret) {
		return new Response("Not found", { status: 404 });
	}

	const db = platform?.env?.DB;
	if (!db) {
		return new Response("Database not available", { status: 503 });
	}

	const options = await listDemoIdentities(db);
	const cookieIdentity = getCookie(request.headers.get("cookie"), DEMO_IDENTITY_COOKIE_NAME);
	const current = cookieIdentity ?? locals.tenantId ?? options[0]?.tenantId ?? "";

	return json({ options, current });
};

export const POST: RequestHandler = async ({ platform, request }) => {
	const demoSecret = platform?.env?.DEMO_MODE_SECRET;
	if (!demoSecret) {
		return new Response("Not found", { status: 404 });
	}

	let body: { tenantId?: string };
	try {
		body = (await request.json()) as { tenantId?: string };
	} catch {
		return new Response("Invalid body", { status: 400 });
	}

	// Restricted to the example-tenant-* seed convention so switching can
	// never resolve to a real, unrelated tenant — even in local dev.
	const tenantId = body.tenantId;
	if (!tenantId || !tenantId.startsWith(SEED_TENANT_PREFIX)) {
		return new Response("Invalid tenant", { status: 400 });
	}

	return json(
		{ success: true },
		{
			headers: {
				"Set-Cookie": `${DEMO_IDENTITY_COOKIE_NAME}=${tenantId}; Path=/; Max-Age=86400; SameSite=Lax`,
			},
		},
	);
};
