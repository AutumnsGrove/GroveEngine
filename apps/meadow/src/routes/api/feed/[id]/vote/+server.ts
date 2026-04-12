/**
 * Vote API — Cast or remove an upvote
 *
 * POST   /api/feed/[id]/vote — Cast vote
 * DELETE /api/feed/[id]/vote — Remove vote
 */

import { json } from "@sveltejs/kit";
import { guardAuth } from "@autumnsgrove/lattice/server";
import type { RequestHandler } from "./$types";
import { castVote, removeVote } from "$lib/server/votes";
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
			key: "meadow/vote",
			limit: 60,
			windowSeconds: 3600,
			failMode: "open",
		});
		if (denied) return denied;
	}

	const created = await castVote(db, locals.user.id, params.id);
	return json({ success: true, created });
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
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
			key: "meadow/vote",
			limit: 60,
			windowSeconds: 3600,
			failMode: "open",
		});
		if (denied) return denied;
	}

	const removed = await removeVote(db, locals.user.id, params.id);
	return json({ success: true, removed });
};
