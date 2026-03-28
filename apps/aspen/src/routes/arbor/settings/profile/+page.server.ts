/**
 * Profile Settings - Route Handler
 *
 * Thin routing layer — delegates data loading to profile-service.ts.
 * Username change, graft toggles, greenhouse enrollment, flag mutations.
 */

import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import type { PageServerLoad, Actions } from "./$types";
import {
	getGreenhouseTenant,
	setTenantGraftOverride,
	resetTenantGraftOverrides,
	enrollInGreenhouse,
	removeFromGreenhouse,
	toggleGreenhouseStatus,
	setFlagEnabled,
} from "@autumnsgrove/lattice/platform/feature-flags";
import { isWayfinder } from "@autumnsgrove/lattice/config/wayfinder";
import { isValidTier, type TierKey } from "@autumnsgrove/lattice/platform/config/tiers";
import {
	validateUsernameAvailability,
	canChangeUsername,
	changeUsername,
} from "@autumnsgrove/lattice/server/services/username";
import { loadProfileData, migrateTenantDODrafts } from "./profile-service";

export const load: PageServerLoad = async ({ locals, platform }) => {
	const env = platform?.env;

	if (!env?.DB || !locals.tenantId) {
		return loadProfileData(
			{ DB: null as unknown as D1Database },
			"",
			locals.user?.email,
			locals.user?.picture ?? null,
		);
	}

	return loadProfileData(
		{ DB: env.DB, CACHE_KV: env.CACHE_KV },
		locals.tenantId,
		locals.user?.email,
		locals.user?.picture ?? null,
	);
};

export const actions: Actions = {
	changeUsername: async ({ request, locals, platform }) => {
		const env = platform?.env;
		if (!env?.DB) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		if (!locals.user || !locals.tenantId) {
			return fail(403, {
				error: ARBOR_ERRORS.UNAUTHORIZED.userMessage,
				error_code: ARBOR_ERRORS.UNAUTHORIZED.code,
			});
		}

		const formData = await request.formData();
		const newUsername = formData.get("newUsername")?.toString()?.toLowerCase().trim();

		if (!newUsername) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const tenantRow = await env.DB.prepare("SELECT subdomain, plan FROM tenants WHERE id = ?")
			.bind(locals.tenantId)
			.first<{ subdomain: string; plan: string | null }>();

		if (!tenantRow) {
			return fail(404, {
				error: ARBOR_ERRORS.RESOURCE_NOT_FOUND.userMessage,
				error_code: ARBOR_ERRORS.RESOURCE_NOT_FOUND.code,
			});
		}

		const currentSubdomain = tenantRow.subdomain;

		if (newUsername === currentSubdomain) {
			return fail(400, {
				error: ARBOR_ERRORS.USERNAME_SAME_AS_CURRENT.userMessage,
				error_code: ARBOR_ERRORS.USERNAME_SAME_AS_CURRENT.code,
			});
		}

		const validation = await validateUsernameAvailability(env.DB, newUsername, locals.tenantId);

		if (!validation.available) {
			return fail(400, {
				error: validation.error || ARBOR_ERRORS.USERNAME_UNAVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.USERNAME_UNAVAILABLE.code,
			});
		}

		const tier: TierKey = isValidTier(tenantRow.plan || "seedling")
			? ((tenantRow.plan || "seedling") as TierKey)
			: "seedling";
		const rateLimit = await canChangeUsername(env.DB, locals.tenantId, tier);

		if (!rateLimit.allowed) {
			return fail(429, {
				error: rateLimit.reason || ARBOR_ERRORS.USERNAME_CHANGE_RATE_LIMITED.userMessage,
				error_code: ARBOR_ERRORS.USERNAME_CHANGE_RATE_LIMITED.code,
			});
		}

		const result = await changeUsername(env.DB, {
			tenantId: locals.tenantId,
			currentSubdomain,
			newSubdomain: newUsername,
			actorEmail: locals.user.email || "unknown",
			tier,
		});

		if (!result.success) {
			logGroveError("Arbor", ARBOR_ERRORS.USERNAME_CHANGE_FAILED, {
				tenantId: locals.tenantId,
				from: currentSubdomain,
				to: newUsername,
				error: result.error,
			});
			return fail(500, {
				error: result.error || ARBOR_ERRORS.USERNAME_CHANGE_FAILED.userMessage,
				error_code: result.errorCode || ARBOR_ERRORS.USERNAME_CHANGE_FAILED.code,
			});
		}

		// Migrate drafts from old TenantDO to new TenantDO (best-effort)
		const tenantsDO = env.TENANTS as DurableObjectNamespace | undefined;
		if (tenantsDO) {
			await migrateTenantDODrafts(tenantsDO, currentSubdomain, newUsername);
		}

		return {
			success: true,
			message: `Username changed to ${newUsername}`,
			newSubdomain: newUsername,
		};
	},

	toggleGraft: async ({ request, locals, platform }) => {
		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		if (!locals.tenantId) {
			return fail(403, {
				error: ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED.code,
			});
		}

		const tenant = await getGreenhouseTenant(locals.tenantId, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!tenant?.enabled) {
			return fail(403, {
				error: ARBOR_ERRORS.GREENHOUSE_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.GREENHOUSE_REQUIRED.code,
			});
		}

		const formData = await request.formData();
		const graftId = formData.get("graftId")?.toString();
		const enabled = formData.get("enabled") === "true";

		if (!graftId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await setTenantGraftOverride(graftId, locals.tenantId, enabled, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return {
			success: true,
			message: enabled ? `${graftId} enabled for your site` : `${graftId} disabled for your site`,
		};
	},

	resetGrafts: async ({ locals, platform }) => {
		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		if (!locals.tenantId) {
			return fail(403, {
				error: ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED.code,
			});
		}

		const tenant = await getGreenhouseTenant(locals.tenantId, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!tenant?.enabled) {
			return fail(403, {
				error: ARBOR_ERRORS.GREENHOUSE_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.GREENHOUSE_REQUIRED.code,
			});
		}

		const count = await resetTenantGraftOverrides(locals.tenantId, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		return {
			success: true,
			message:
				count > 0
					? `Reset ${count} graft preference${count === 1 ? "" : "s"} to defaults`
					: "No custom preferences to reset",
		};
	},

	// Wayfinder-only actions
	enrollTenant: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const tenantId = formData.get("tenantId")?.toString();
		const notes = formData.get("notes")?.toString() || undefined;

		if (!tenantId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await enrollInGreenhouse(tenantId, locals.user?.email || "wayfinder", notes, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return { success: true, message: "Tenant enrolled in greenhouse" };
	},

	removeTenant: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const tenantId = formData.get("tenantId")?.toString();

		if (!tenantId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await removeFromGreenhouse(tenantId, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return { success: true, message: "Tenant removed from greenhouse" };
	},

	toggleTenant: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const tenantId = formData.get("tenantId")?.toString();
		const enabled = formData.get("enabled") === "true";

		if (!tenantId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await toggleGreenhouseStatus(tenantId, enabled, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return {
			success: true,
			message: enabled ? "Greenhouse access enabled" : "Greenhouse access disabled",
		};
	},

	cultivateFlag: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const flagId = formData.get("flagId")?.toString();

		if (!flagId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await setFlagEnabled(flagId, true, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return { success: true, message: `${flagId} is now cultivated` };
	},

	pruneFlag: async ({ request, locals, platform }) => {
		if (!isWayfinder(locals.user?.email)) {
			return fail(403, {
				error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
				error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
			});
		}

		const env = platform?.env;
		if (!env?.DB || !env?.CACHE_KV) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const flagId = formData.get("flagId")?.toString();

		if (!flagId) {
			return fail(400, {
				error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
				error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
			});
		}

		const success = await setFlagEnabled(flagId, false, {
			DB: env.DB,
			FLAGS_KV: env.CACHE_KV,
		});

		if (!success) {
			return fail(500, {
				error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
				error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			});
		}

		return { success: true, message: `${flagId} is now pruned` };
	},
};
