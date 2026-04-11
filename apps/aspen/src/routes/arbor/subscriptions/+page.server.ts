/**
 * Arbor Subscriptions — Manage email notification subscriptions
 *
 * Lists all groves the current user has subscribed to for email updates.
 * Allows managing preferences (timezone, preferred hour) and unsubscribing.
 */

import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
	getUserSubscriptions,
	unsubscribe,
	updatePreferences,
} from "@autumnsgrove/lattice/server/services/subscriptions";

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user || !platform?.env?.DB) {
		return { subscriptions: [] };
	}

	const subscriptions = await getUserSubscriptions(platform.env.DB, locals.user.id);

	return { subscriptions };
};

export const actions: Actions = {
	unsubscribe: async ({ request, locals, platform }) => {
		if (!locals.user || !platform?.env?.DB) {
			return fail(401, { error: "Unauthorized" });
		}

		const formData = await request.formData();
		const tenantId = formData.get("tenantId")?.toString();
		if (!tenantId) return fail(400, { error: "Missing tenant ID" });

		await unsubscribe(platform.env.DB, locals.user.id, tenantId);
		return { success: true, action: "unsubscribed" };
	},

	updatePreferences: async ({ request, locals, platform }) => {
		if (!locals.user || !platform?.env?.DB) {
			return fail(401, { error: "Unauthorized" });
		}

		const formData = await request.formData();
		const tenantId = formData.get("tenantId")?.toString();
		const timezone = formData.get("timezone")?.toString();
		const preferredHourStr = formData.get("preferredHour")?.toString();

		if (!tenantId) return fail(400, { error: "Missing tenant ID" });

		const prefs: { preferredHour?: number; timezone?: string } = {};
		if (timezone) prefs.timezone = timezone;
		if (preferredHourStr) {
			const hour = parseInt(preferredHourStr, 10);
			if (hour >= 0 && hour <= 23) prefs.preferredHour = hour;
		}

		const updated = await updatePreferences(platform.env.DB, locals.user.id, tenantId, prefs);
		if (!updated) return fail(400, { error: "Could not update preferences" });

		return { success: true, action: "updated" };
	},
};
