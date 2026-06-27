import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session";

export const prerender = false;

export const POST: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	const db = platform?.env?.DB;
	if (!db) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const tenantId = await getVerifiedTenantId(db, locals.tenantId, locals.user, {
		isInternalService: locals.isInternalService,
	});

	const context = locals.context;
	if (context.type !== "tenant") {
		throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	const tenants = platform?.env?.TENANTS;
	if (!tenants) {
		throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	}

	const doId = tenants.idFromName(`tenant:${context.tenant.subdomain}`);
	const stub = tenants.get(doId);
	const response = await stub.fetch("https://tenant.internal/config/flush", {
		method: "POST",
		headers: { "X-Tenant-Subdomain": context.tenant.subdomain },
	});

	const result = await response.json();

	return json({ success: true, tenantId, flushed: result });
};
