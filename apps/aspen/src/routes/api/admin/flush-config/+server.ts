import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";

export const prerender = false;

/**
 * Flush a tenant's TenantDO config cache.
 *
 * Platform admins can flush any tenant by passing ?subdomain=xxx.
 * Tenant owners can flush their own (no query param needed).
 */
export const POST: RequestHandler = async ({ platform, locals, url }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const tenants = platform?.env?.TENANTS;
	if (!tenants) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	const isAdmin = locals.user.isAdmin === true;
	const targetSubdomain = url.searchParams.get("subdomain");

	let subdomain: string;

	if (targetSubdomain && isAdmin) {
		// Platform admin flushing any tenant
		subdomain = targetSubdomain;
	} else if (locals.context.type === "tenant") {
		// Tenant owner flushing their own
		subdomain = locals.context.tenant.subdomain;
	} else {
		return throwGroveError(403, API_ERRORS.UNAUTHORIZED, "API");
	}

	const doId = tenants.idFromName(`tenant:${subdomain}`);
	const stub = tenants.get(doId);
	const response = await stub.fetch("https://tenant.internal/config/flush", {
		method: "POST",
		headers: { "X-Tenant-Subdomain": subdomain },
	});

	const result = await response.json();

	return json({ success: true, subdomain, flushed: result });
};
