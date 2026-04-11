/**
 * Grove Subscription Unsubscribe
 *
 * Two-step, no-login unsubscribe for email subscription notifications.
 * Token-based: URL contains a unique token that maps to a specific subscription.
 *
 * GET /unsubscribe/grove?token=<uuid>
 *   → Shows confirmation page (no mutation — safe from prefetch/bots).
 * POST (form action)
 *   → Performs the actual unsubscribe.
 */

import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
	unsubscribeByToken,
	lookupUnsubscribeToken,
} from "@autumnsgrove/lattice/server/services/subscriptions";

export const load: PageServerLoad = async ({ url, platform }) => {
	const token = url.searchParams.get("token");

	if (!token) {
		return { status: "invalid" as const, groveName: null };
	}

	const db = platform?.env?.DB;
	if (!db) {
		return { status: "error" as const, groveName: null };
	}

	// Read-only lookup — no mutation on GET
	const lookup = await lookupUnsubscribeToken(db, token);

	if (!lookup) {
		return { status: "already" as const, groveName: null };
	}

	return { status: "confirm" as const, groveName: lookup.groveName, token };
};

export const actions: Actions = {
	default: async ({ request, platform }) => {
		const formData = await request.formData();
		const token = formData.get("token")?.toString();

		if (!token) return fail(400, { error: "Missing token" });

		const db = platform?.env?.DB;
		if (!db) return fail(503, { error: "Service unavailable" });

		const result = await unsubscribeByToken(db, token);

		if (result.success) {
			return { success: true, groveName: result.groveName ?? "this grove" };
		}

		return { success: true, groveName: "this grove" }; // Show success even if already gone (prevent enumeration)
	},
};
