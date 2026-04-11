/**
 * Grove Subscription Unsubscribe
 *
 * One-click, no-login unsubscribe for email subscription notifications.
 * Token-based: URL contains a unique token that maps to a specific subscription.
 *
 * GET /unsubscribe/grove?token=<uuid>
 *   → Immediately unsubscribes and shows confirmation.
 *   → Shows error if token is invalid/expired.
 */

import type { PageServerLoad } from "./$types";
import { unsubscribeByToken } from "@autumnsgrove/lattice/server/services/subscriptions";

export const load: PageServerLoad = async ({ url, platform }) => {
	const token = url.searchParams.get("token");

	if (!token) {
		return { status: "invalid" as const, groveName: null };
	}

	const db = platform?.env?.DB;
	if (!db) {
		return { status: "error" as const, groveName: null };
	}

	const result = await unsubscribeByToken(db, token);

	if (result.success) {
		return { status: "success" as const, groveName: result.groveName ?? "this grove" };
	}

	// Token not found — could be already unsubscribed or invalid
	return { status: "already" as const, groveName: null };
};
