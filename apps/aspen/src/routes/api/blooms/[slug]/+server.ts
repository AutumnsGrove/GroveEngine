/**
 * Blooms CRUD - Route Handler
 *
 * Thin routing layer — delegates to bloom-service.ts.
 * GET, PUT, DELETE /api/blooms/[slug]
 */

import { json } from "@sveltejs/kit";
import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session";
import type { RequestHandler } from "./$types.js";
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import { getPost, updatePost, deletePost } from "./bloom-service";

/**
 * GET /api/posts/[slug] - Get a single post
 */
export const GET: RequestHandler = async ({ params, platform, locals }) => {
	const { slug } = params;

	if (!slug) throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	if (!locals.tenantId) throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");

	// Determine access level
	let isOwner = false;
	if (locals.user && platform?.env?.DB) {
		try {
			await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);
			isOwner = true;
		} catch {
			isOwner = false;
		}
	}

	const result = await getPost(slug, locals.tenantId, isOwner, platform?.env?.DB);

	return json(
		{ source: result.source, post: result.post },
		{ headers: { "Cache-Control": result.cacheControl } },
	);
};

/**
 * PUT /api/posts/[slug] - Update an existing post
 */
export const PUT: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!locals.user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	if (!platform?.env?.DB) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	if (!locals.tenantId) throwGroveError(401, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");

	const { slug } = params;
	if (!slug) throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");

	try {
		const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);
		const requestData = await request.json();

		const result = await updatePost(
			slug,
			requestData,
			platform.env.DB,
			tenantId,
			locals.user.id,
			{
				AI: platform.env.AI,
				OPENROUTER_API_KEY: platform.env.OPENROUTER_API_KEY,
				CACHE_KV: platform.env.CACHE_KV,
			},
			platform.context?.waitUntil.bind(platform.context),
		);

		return json({
			success: true,
			slug: result.slug,
			message: "Post updated successfully",
		});
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};

/**
 * DELETE /api/posts/[slug] - Delete a post
 */
export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	if (!platform?.env?.DB) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
	if (!locals.tenantId) throwGroveError(401, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");

	const { slug } = params;
	if (!slug) throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");

	try {
		const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);
		await deletePost(slug, platform.env.DB, tenantId, platform.env.CACHE_KV);

		return json({
			success: true,
			message: "Post deleted successfully",
		});
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
	}
};
