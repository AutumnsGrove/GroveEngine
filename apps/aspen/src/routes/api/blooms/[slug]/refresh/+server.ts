/**
 * POST /api/blooms/[slug]/refresh - Refresh live version by purging all caches
 *
 * This endpoint clears both KV cache and CDN edge cache for a published post,
 * forcing the live site to fetch and display the latest version immediately.
 */

import { json } from "@sveltejs/kit";
import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { invalidatePostCaches } from "../bloom-service";

/**
 * POST /api/blooms/[slug]/refresh - Purge KV and CDN caches
 */
export const POST: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	if (!platform?.env?.DB) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	if (!locals.tenantId) throwGroveError(401, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");

	const { slug } = params;
	if (!slug) throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");

	try {
		const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);

		// Step 1: Clear KV cache
		await invalidatePostCaches(platform.env.CACHE_KV, tenantId, slug);

		// Step 2: Purge CDN cache (if credentials available)
		const cdnPurged = await purgeCDNCache(slug, tenantId, {
			CF_API_TOKEN: platform.env.CF_API_TOKEN,
			CF_ZONE_ID: platform.env.CF_ZONE_ID,
			TENANT_DOMAIN: platform.env.TENANT_DOMAIN,
		});

		return json({
			success: true,
			kvCacheCleared: true,
			cdnCachePurged: cdnPurged,
			message: cdnPurged
				? "Cache cleared successfully. Your live site will show the latest version within seconds."
				: "KV cache cleared. CDN cache purge unavailable (no CF_API_TOKEN configured).",
		});
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		console.error("[Cache Refresh] Failed:", err);
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};

/**
 * Purge Cloudflare CDN cache for a specific post URL
 * Returns true if purge succeeded, false if credentials missing or purge failed
 */
async function purgeCDNCache(
	slug: string,
	tenantId: string,
	env: {
		CF_API_TOKEN?: string;
		CF_ZONE_ID?: string;
		TENANT_DOMAIN?: string;
	},
): Promise<boolean> {
	const { CF_API_TOKEN, CF_ZONE_ID, TENANT_DOMAIN } = env;

	// If credentials not configured, skip CDN purge (fail gracefully)
	if (!CF_API_TOKEN || !CF_ZONE_ID) {
		console.warn("[CDN Purge] Skipped: CF_API_TOKEN or CF_ZONE_ID not configured");
		return false;
	}

	// Build the full URL to purge
	// For multi-tenant, we'd need to know the tenant's domain
	// For now, assume grove.place as the main domain
	const baseUrl = TENANT_DOMAIN || `https://${tenantId}.grove.place`;
	const postUrl = `${baseUrl}/garden/${slug}`;

	try {
		const response = await fetch(
			`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${CF_API_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					files: [postUrl],
				}),
			},
		);

		const result = (await response.json()) as { success?: boolean; errors?: unknown[] };

		if (!result.success) {
			console.error("[CDN Purge] Failed:", result.errors);
			return false;
		}

		console.log(`[CDN Purge] Success: ${postUrl}`);
		return true;
	} catch (err) {
		console.error("[CDN Purge] Error:", err);
		return false;
	}
}
