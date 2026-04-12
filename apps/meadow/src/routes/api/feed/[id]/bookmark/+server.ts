/**
 * Bookmark API — Toggle bookmark state
 *
 * POST /api/feed/[id]/bookmark — Toggle bookmark (idempotent)
 */

import { json } from "@sveltejs/kit";
import { guardAuth } from "@autumnsgrove/lattice/server";
import type { RequestHandler } from "./$types";
import { toggleBookmark } from "$lib/server/bookmarks";
import { validateUUID } from "@autumnsgrove/lattice/utils/validation";
import { createThreshold } from "@autumnsgrove/lattice/platform/threshold";
import { thresholdCheck } from "@autumnsgrove/lattice/platform/threshold/sveltekit";

export const POST: RequestHandler = async ({ params, platform, locals }) => {
	const authGuard = guardAuth(locals.user);
	if (authGuard) return authGuard;

	if (!validateUUID(params.id)) {
		return json(
			{
				error: "GROVE-API-040",
				error_code: "INVALID_REQUEST_BODY",
				error_description: "Invalid post ID format.",
			},
			{ status: 400 },
		);
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ error: "Service unavailable" }, { status: 503 });
	}

	// Rate limit
	const threshold = createThreshold(platform?.env, {
		identifier: locals.user.id,
	});
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: "meadow/bookmark",
			limit: 120,
			windowSeconds: 3600,
			failMode: "open",
		});
		if (denied) return denied;
	}

	const bookmarked = await toggleBookmark(db, locals.user.id, params.id);
	return json({ success: true, bookmarked });
};
