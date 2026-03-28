/**
 * Fireside - Conversational Writing Mode
 *
 * Thin routing layer — delegates to fireside-service.ts.
 * POST /api/grove/wisp/fireside
 */

import { json, type RequestHandler } from "@sveltejs/kit";
import { API_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { RATE_LIMIT } from "@autumnsgrove/lattice/config/wisp";
import { createLumenClient } from "@autumnsgrove/lattice/lumen";
import { createThreshold } from "@autumnsgrove/lattice/threshold/factory";
import { thresholdCheck } from "@autumnsgrove/lattice/threshold/adapters/sveltekit";
import { checkFeatureAccess } from "@autumnsgrove/lattice/server/billing";

import type { FiresideMessage } from "./fireside.js";
import { handleStart, handleRespond, handleDraft } from "./fireside-service";

export const prerender = false;

interface FiresideRequest {
	action: "start" | "respond" | "draft";
	message?: string;
	conversation?: FiresideMessage[];
	starterPrompt?: string;
	conversationId?: string;
}

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json(
			{ error: API_ERRORS.UNAUTHORIZED.userMessage, error_code: API_ERRORS.UNAUTHORIZED.code },
			{ status: 401 },
		);
	}

	const db = platform?.env?.DB;

	// Check subscription access (fail-open for billing bugs)
	if (db && locals.tenantId) {
		try {
			const featureCheck = await checkFeatureAccess(db, locals.tenantId, "ai");
			if (!featureCheck.allowed) {
				return json(
					{ error: featureCheck.reason || "AI features require an active subscription" },
					{ status: 403 },
				);
			}
		} catch (err) {
			console.warn(
				"[Fireside] Feature access check failed:",
				err instanceof Error ? err.message : "Unknown error",
			);
		}
	}

	// Parse request body
	let body: FiresideRequest;
	try {
		body = await request.json();
	} catch {
		return json(
			{
				error: API_ERRORS.INVALID_REQUEST_BODY.userMessage,
				error_code: API_ERRORS.INVALID_REQUEST_BODY.code,
			},
			{ status: 400 },
		);
	}

	const { action, message, conversation, starterPrompt, conversationId } = body;

	if (!["start", "respond", "draft"].includes(action)) {
		return json(
			{
				error: API_ERRORS.INVALID_REQUEST_BODY.userMessage,
				error_code: API_ERRORS.INVALID_REQUEST_BODY.code,
			},
			{ status: 400 },
		);
	}

	// Rate limiting (fail-closed)
	const threshold = createThreshold(platform?.env, { identifier: locals.user?.id });
	if (!threshold) {
		logGroveError("API", API_ERRORS.SERVICE_UNAVAILABLE);
		return json(
			{
				error: API_ERRORS.SERVICE_UNAVAILABLE.userMessage,
				error_code: API_ERRORS.SERVICE_UNAVAILABLE.code,
			},
			{ status: 503 },
		);
	}

	const denied = await thresholdCheck(threshold, {
		key: `wisp:${locals.user.id}`,
		limit: RATE_LIMIT.maxRequestsPerHour,
		windowSeconds: RATE_LIMIT.windowSeconds,
		failMode: "closed",
	});
	if (denied) return denied;

	// Create Lumen client
	const openrouterApiKey = platform?.env?.OPENROUTER_API_KEY;
	if (!openrouterApiKey) {
		return json(
			{
				error: API_ERRORS.AI_SERVICE_NOT_CONFIGURED.userMessage,
				error_code: API_ERRORS.AI_SERVICE_NOT_CONFIGURED.code,
			},
			{ status: 503 },
		);
	}

	const lumen = createLumenClient({ openrouterApiKey, ai: platform?.env?.AI, db });

	try {
		switch (action) {
			case "start":
				return handleStart(locals.user.id, starterPrompt);
			case "respond":
				return await handleRespond(message, conversation, lumen);
			case "draft":
				return await handleDraft(conversation, lumen, db, locals.user.id, conversationId);
			default:
				return json(
					{
						error: API_ERRORS.INVALID_REQUEST_BODY.userMessage,
						error_code: API_ERRORS.INVALID_REQUEST_BODY.code,
					},
					{ status: 400 },
				);
		}
	} catch (err) {
		logGroveError("API", API_ERRORS.INTERNAL_ERROR, { cause: err });
		return json(
			{ error: API_ERRORS.INTERNAL_ERROR.userMessage, error_code: API_ERRORS.INTERNAL_ERROR.code },
			{ status: 500 },
		);
	}
};
