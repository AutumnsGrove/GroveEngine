/**
 * Comped Invites Admin Page Server (Landing)
 *
 * Thin routing layer — delegates business logic to invite-service.ts.
 * Allows the Wayfinder to manage comped invites - pre-approving
 * users by email to skip payment and receive a free premium tier.
 */

import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { parseFormData } from "@autumnsgrove/lattice/server";
import { isWayfinder } from "@autumnsgrove/lattice/platform/config";
import { VALID_TIERS, VALID_INVITE_TYPES, CreateInviteSchema, InviteIdSchema } from "./schemas";
import { loadInviteData, createInvite, resendInvite, revokeInvite } from "./invite-service";

export const load: PageServerLoad = async ({ parent, platform, url }) => {
	const { isWayfinder, user } = await parent();

	if (!isWayfinder) {
		throw error(403, "Access denied. This page is for the Wayfinder only.");
	}

	if (!platform?.env?.DB) {
		throw error(500, "Database not available");
	}

	const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
	const pageSize = 50;
	const search = url.searchParams.get("search") || "";
	const statusFilter = url.searchParams.get("status") || "";
	const typeFilter = url.searchParams.get("type") || "";

	try {
		const data = await loadInviteData(platform.env.DB, {
			page,
			pageSize,
			search,
			statusFilter,
			typeFilter,
		});

		return {
			...data,
			filters: { search, status: statusFilter, type: typeFilter },
			validTiers: VALID_TIERS,
			validInviteTypes: VALID_INVITE_TYPES,
		};
	} catch (err) {
		console.error("[Comped Invites] Error loading data:", err);
		throw error(500, "Failed to load comped invites");
	}
};

export const actions: Actions = {
	create: async ({ request, locals, platform }) => {
		const user = locals.user;
		if (!user) return fail(403, { error: "Not authenticated" });
		if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
		if (!platform?.env?.DB) return fail(500, { error: "Database not available" });

		const formData = await request.formData();
		const result = parseFormData(formData, CreateInviteSchema);
		if (!result.success) {
			const firstError = Object.values(result.errors).flat()[0];
			return fail(400, { error: firstError || "Invalid form data" });
		}

		const serviceResult = await createInvite(
			platform.env.DB,
			{
				email: result.data.email,
				tier: result.data.tier,
				customMessage: result.data.custom_message || null,
				notes: result.data.notes || null,
				actorEmail: user.email,
			},
			{
				ZEPHYR_API_KEY: platform.env.ZEPHYR_API_KEY,
				RESEND_API_KEY: platform.env.RESEND_API_KEY,
				ZEPHYR_URL: platform.env.ZEPHYR_URL,
				ZEPHYR: platform.env.ZEPHYR,
			},
		);

		if (!serviceResult.success) {
			return fail(serviceResult.status || 400, { error: serviceResult.error });
		}

		return {
			success: true,
			emailStatus: serviceResult.emailStatus,
			emailError: serviceResult.emailError,
			message: serviceResult.message,
		};
	},

	resend: async ({ request, locals, platform }) => {
		const user = locals.user;
		if (!user) return fail(403, { error: "Not authenticated" });
		if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
		if (!platform?.env?.DB) return fail(500, { error: "Database not available" });

		const formData = await request.formData();
		const result = parseFormData(formData, InviteIdSchema);
		if (!result.success) return fail(400, { error: "Invite ID is required" });

		const serviceResult = await resendInvite(platform.env.DB, result.data.invite_id, user.email, {
			ZEPHYR_API_KEY: platform.env.ZEPHYR_API_KEY,
			RESEND_API_KEY: platform.env.RESEND_API_KEY,
			ZEPHYR_URL: platform.env.ZEPHYR_URL,
			ZEPHYR: platform.env.ZEPHYR,
		});

		if (!serviceResult.success) {
			return fail(serviceResult.status || 500, { error: serviceResult.error });
		}

		return {
			success: true,
			emailStatus: serviceResult.emailStatus,
			emailError: serviceResult.emailError,
			message: serviceResult.message,
		};
	},

	revoke: async ({ request, locals, platform }) => {
		const user = locals.user;
		if (!user) return fail(403, { error: "Not authenticated" });
		if (!isWayfinder(user.email)) return fail(403, { error: "Access denied" });
		if (!platform?.env?.DB) return fail(500, { error: "Database not available" });

		const formData = await request.formData();
		const result = parseFormData(formData, InviteIdSchema);
		if (!result.success) return fail(400, { error: "Invite ID is required" });

		const serviceResult = await revokeInvite(
			platform.env.DB,
			result.data.invite_id,
			result.data.notes || null,
			user.email,
		);

		if (!serviceResult.success) {
			return fail(serviceResult.status || 500, { error: serviceResult.error });
		}

		return { success: true, message: serviceResult.message };
	},
};
