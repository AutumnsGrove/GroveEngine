/**
 * Subscriptions API — Email notification subscriptions
 *
 * POST   /api/subscriptions/[tenantId] — Subscribe to email notifications
 * DELETE /api/subscriptions/[tenantId] — Unsubscribe
 * GET    /api/subscriptions/[tenantId] — Check subscription status
 *
 * User-scoped: uses locals.user.id directly. No grove required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "@autumnsgrove/lattice/errors";
import {
	subscribe,
	unsubscribe,
	isSubscribed,
} from "@autumnsgrove/lattice/server/services/subscriptions";
import { validateUUID } from "@autumnsgrove/lattice/utils/validation";
import { createThreshold } from "@autumnsgrove/lattice/platform/threshold";
import { thresholdCheck } from "@autumnsgrove/lattice/platform/threshold/sveltekit";

export const POST: RequestHandler = async ({ params, request, platform, locals }) => {
	if (!locals.user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");

	const tenantId = params.tenantId;
	if (!tenantId || !validateUUID(tenantId)) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	const db = platform?.env?.DB;
	if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");

	// Prevent subscribing to your own grove
	if (locals.tenantId && tenantId === locals.tenantId) {
		throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
	}

	// Rate limit: 30 subscription actions per hour
	const threshold = createThreshold(platform?.env, { identifier: locals.user.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: "subscriptions/toggle",
			limit: 30,
			windowSeconds: 3600,
			failMode: "open",
		});
		if (denied) return denied;
	}

	try {
		const body = await request.json().catch(() => ({}));
		const timezone =
			(body as Record<string, string>).timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

		const result = await subscribe(db, locals.user.id, locals.user.email, tenantId, timezone);
		return json({ success: true, subscribed: true, created: result.created });
	} catch (error) {
		if (error && typeof error === "object" && "status" in error) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Subscription create failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");

	const tenantId = params.tenantId;
	if (!tenantId || !validateUUID(tenantId)) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	const db = platform?.env?.DB;
	if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");

	// Rate limit
	const threshold = createThreshold(platform?.env, { identifier: locals.user.id });
	if (threshold) {
		const denied = await thresholdCheck(threshold, {
			key: "subscriptions/toggle",
			limit: 30,
			windowSeconds: 3600,
			failMode: "open",
		});
		if (denied) return denied;
	}

	try {
		const removed = await unsubscribe(db, locals.user.id, tenantId);
		return json({ success: true, subscribed: false, removed });
	} catch (error) {
		if (error && typeof error === "object" && "status" in error) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Subscription delete failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};

export const GET: RequestHandler = async ({ params, platform, locals }) => {
	if (!locals.user) throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");

	const tenantId = params.tenantId;
	if (!tenantId || !validateUUID(tenantId)) {
		throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
	}

	const db = platform?.env?.DB;
	if (!db) throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");

	try {
		const subscribed = await isSubscribed(db, locals.user.id, tenantId);
		return json({ subscribed });
	} catch (error) {
		if (error && typeof error === "object" && "status" in error) throw error;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, {
			detail: "Subscription check failed",
			cause: error,
		});
		throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
	}
};
