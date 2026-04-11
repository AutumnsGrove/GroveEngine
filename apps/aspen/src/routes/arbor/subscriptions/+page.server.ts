/**
 * Arbor Subscriptions — Manage email notification subscriptions
 *
 * Lists all groves the current user has subscribed to for email updates.
 * Allows managing preferences (timezone, preferred hour) and unsubscribing.
 */

import { z } from "zod";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { parseFormData } from "@autumnsgrove/lattice/server/utils/form-data";
import { validateUUID } from "@autumnsgrove/lattice/utils/validation";
import {
	getUserSubscriptions,
	unsubscribe,
	updatePreferences,
} from "@autumnsgrove/lattice/server/services/subscriptions";

const UnsubscribeSchema = z.object({
	tenantId: z.string().min(1),
});

const PreferencesSchema = z.object({
	tenantId: z.string().min(1),
	timezone: z.string().optional(),
	preferredHour: z.coerce.number().min(0).max(23).optional(),
});

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
		const result = parseFormData(formData, UnsubscribeSchema);
		if (!result.success) return fail(400, { error: "Invalid request" });

		if (!validateUUID(result.data.tenantId)) {
			return fail(400, { error: "Invalid tenant ID" });
		}

		await unsubscribe(platform.env.DB, locals.user.id, result.data.tenantId);
		return { success: true, action: "unsubscribed" };
	},

	updatePreferences: async ({ request, locals, platform }) => {
		if (!locals.user || !platform?.env?.DB) {
			return fail(401, { error: "Unauthorized" });
		}

		const formData = await request.formData();
		const result = parseFormData(formData, PreferencesSchema);
		if (!result.success) return fail(400, { error: "Invalid request" });

		if (!validateUUID(result.data.tenantId)) {
			return fail(400, { error: "Invalid tenant ID" });
		}

		const prefs: { preferredHour?: number; timezone?: string } = {};
		if (result.data.timezone) prefs.timezone = result.data.timezone;
		if (result.data.preferredHour !== undefined) prefs.preferredHour = result.data.preferredHour;

		const updated = await updatePreferences(
			platform.env.DB,
			locals.user.id,
			result.data.tenantId,
			prefs,
		);
		if (!updated) return fail(400, { error: "Could not update preferences" });

		return { success: true, action: "updated" };
	},
};
