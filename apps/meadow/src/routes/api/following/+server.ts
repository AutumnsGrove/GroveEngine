/**
 * Following API — User's followed blogs
 *
 * GET /api/following
 */

import { json } from "@sveltejs/kit";
import { guardAuth } from "@autumnsgrove/lattice/server";
import type { RequestHandler } from "./$types";
import { getFollowing } from "$lib/server/follows";

export const GET: RequestHandler = async ({ platform, locals }) => {
	const authGuard = guardAuth(locals.user);
	if (authGuard) return authGuard;

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: "Service unavailable" }, { status: 503 });
	}

	const following = await getFollowing(db, locals.user.id);
	return json({ following });
};
