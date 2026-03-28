/**
 * Wisp - Grove Writing Assistant API
 *
 * Thin routing layer — delegates analysis to wisp-service.ts.
 * POST /api/grove/wisp - Analyze content
 * GET /api/grove/wisp - Get usage statistics
 */

import { json, type RequestHandler } from "@sveltejs/kit";
import { API_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { MAX_CONTENT_LENGTH, RATE_LIMIT, COST_CAP } from "@autumnsgrove/lattice/config/wisp";
import { stripMarkdown, smartTruncate } from "@autumnsgrove/lattice/server/inference-client";
import { createLumenClient } from "@autumnsgrove/lattice/lumen";
import { calculateReadability } from "@autumnsgrove/lattice/utils/readability";
import { createThreshold } from "@autumnsgrove/lattice/threshold/factory";
import { thresholdCheck } from "@autumnsgrove/lattice/threshold/adapters/sveltekit";
import { checkFeatureAccess } from "@autumnsgrove/lattice/server/billing";
import { analyzeGrammar, analyzeTone, logWispUsage, getWispUsageStats } from "./wisp-service";

export const prerender = false;

// ============================================================================
// POST - Analyze Content
// ============================================================================

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		return json(
			{ error: API_ERRORS.UNAUTHORIZED.userMessage, error_code: API_ERRORS.UNAUTHORIZED.code },
			{ status: 401 },
		);
	}

	const db = platform?.env?.DB;

	// Check subscription access
	if (db && locals.tenantId) {
		const featureCheck = await checkFeatureAccess(db, locals.tenantId, "ai");
		if (!featureCheck.allowed) {
			return json(
				{ error: featureCheck.reason || "AI features require an active subscription" },
				{ status: 403 },
			);
		}
	}

	// Parse request body
	let body: {
		content?: string;
		action?: string;
		mode?: "quick" | "thorough";
		context?: { slug?: string; title?: string } | null;
	};
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

	const { content, action, mode = "quick", context } = body;

	// Validate content
	if (!content || typeof content !== "string") {
		return json(
			{
				error: API_ERRORS.MISSING_REQUIRED_FIELDS.userMessage,
				error_code: API_ERRORS.MISSING_REQUIRED_FIELDS.code,
			},
			{ status: 400 },
		);
	}

	if (content.length > MAX_CONTENT_LENGTH) {
		return json(
			{ error: `Content too long. Maximum ${MAX_CONTENT_LENGTH.toLocaleString()} characters.` },
			{ status: 400 },
		);
	}

	// Validate action
	const validActions = ["grammar", "tone", "readability", "all"];
	if (!action || !validActions.includes(action)) {
		return json(
			{
				error: API_ERRORS.INVALID_REQUEST_BODY.userMessage,
				error_code: API_ERRORS.INVALID_REQUEST_BODY.code,
			},
			{ status: 400 },
		);
	}

	// Validate mode
	if (!["quick", "thorough"].includes(mode)) {
		return json(
			{
				error: API_ERRORS.VALIDATION_FAILED.userMessage,
				error_code: API_ERRORS.VALIDATION_FAILED.code,
			},
			{ status: 400 },
		);
	}

	// Validate context object
	if (context !== undefined) {
		if (context !== null && typeof context !== "object") {
			return json(
				{
					error: API_ERRORS.VALIDATION_FAILED.userMessage,
					error_code: API_ERRORS.VALIDATION_FAILED.code,
				},
				{ status: 400 },
			);
		}
		if (context?.slug !== undefined && typeof context.slug !== "string") {
			return json(
				{
					error: API_ERRORS.VALIDATION_FAILED.userMessage,
					error_code: API_ERRORS.VALIDATION_FAILED.code,
				},
				{ status: 400 },
			);
		}
		if (context?.title !== undefined && typeof context.title !== "string") {
			return json(
				{
					error: API_ERRORS.VALIDATION_FAILED.userMessage,
					error_code: API_ERRORS.VALIDATION_FAILED.code,
				},
				{ status: 400 },
			);
		}
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

	// Monthly cost cap check
	if (db && COST_CAP.enabled) {
		const now = new Date();
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

		let usage: { monthly_cost: number } | null;
		try {
			usage = (await db
				.prepare(
					"SELECT COALESCE(SUM(cost), 0) as monthly_cost FROM wisp_requests WHERE user_id = ? AND created_at > ?",
				)
				.bind(locals.user.id, monthStart)
				.first()) as { monthly_cost: number } | null;
		} catch (err) {
			logGroveError("API", API_ERRORS.SERVICE_UNAVAILABLE, { cause: err });
			return json(
				{
					error: API_ERRORS.SERVICE_UNAVAILABLE.userMessage,
					error_code: API_ERRORS.SERVICE_UNAVAILABLE.code,
				},
				{ status: 503 },
			);
		}

		if (usage && usage.monthly_cost >= COST_CAP.maxCostUSD) {
			return json(
				{
					error: `Monthly usage limit reached ($${COST_CAP.maxCostUSD.toFixed(2)}). Resets on the 1st.`,
				},
				{ status: 429 },
			);
		}
	}

	// Create Lumen client
	const openrouterApiKey = platform?.env?.OPENROUTER_API_KEY;
	if (!openrouterApiKey && (action === "grammar" || action === "tone" || action === "all")) {
		return json(
			{
				error: API_ERRORS.AI_SERVICE_NOT_CONFIGURED.userMessage,
				error_code: API_ERRORS.AI_SERVICE_NOT_CONFIGURED.code,
			},
			{ status: 503 },
		);
	}

	const lumen = openrouterApiKey
		? createLumenClient({ openrouterApiKey, ai: platform?.env?.AI, db })
		: null;

	const result: { grammar?: unknown; tone?: unknown; readability?: unknown } = {};
	const totalTokens = { input: 0, output: 0 };
	let totalCost = 0;
	let modelUsed: string | null = null;
	let providerUsed: string | null = null;

	try {
		const cleanContent = stripMarkdown(content);
		const truncatedContent = smartTruncate(cleanContent);

		if ((action === "grammar" || action === "all") && lumen) {
			const grammarResult = await analyzeGrammar(truncatedContent, mode, lumen);
			result.grammar = grammarResult.result;
			totalTokens.input += grammarResult.usage.input;
			totalTokens.output += grammarResult.usage.output;
			totalCost += grammarResult.usage.cost;
			modelUsed = grammarResult.model;
			providerUsed = grammarResult.provider;
		}

		if ((action === "tone" || action === "all") && lumen) {
			const toneResult = await analyzeTone(truncatedContent, mode, lumen, context);
			result.tone = toneResult.result;
			totalTokens.input += toneResult.usage.input;
			totalTokens.output += toneResult.usage.output;
			totalCost += toneResult.usage.cost;
			modelUsed = modelUsed || toneResult.model;
			providerUsed = providerUsed || toneResult.provider;
		}

		if (action === "readability" || action === "all") {
			result.readability = calculateReadability(content);
		}

		// Log usage
		if (db) {
			await logWispUsage(
				db,
				locals.user.id,
				action,
				mode,
				modelUsed,
				providerUsed,
				totalTokens,
				totalCost,
				context?.slug || null,
			);
		}

		return json({
			...result,
			meta: {
				tokensUsed: totalTokens.input + totalTokens.output,
				cost: totalCost,
				model: modelUsed || "local",
				provider: providerUsed || "local",
				mode,
			},
		});
	} catch (err) {
		logGroveError("API", API_ERRORS.INTERNAL_ERROR, { cause: err });
		return json(
			{ error: API_ERRORS.INTERNAL_ERROR.userMessage, error_code: API_ERRORS.INTERNAL_ERROR.code },
			{ status: 500 },
		);
	}
};

// ============================================================================
// GET - Usage Statistics
// ============================================================================

export const GET: RequestHandler = async ({ platform, locals }) => {
	if (!locals.user) {
		return json(
			{ error: API_ERRORS.UNAUTHORIZED.userMessage, error_code: API_ERRORS.UNAUTHORIZED.code },
			{ status: 401 },
		);
	}

	const db = platform?.env?.DB;
	if (!db) {
		return json({ requests: 0, tokens: 0, cost: 0 });
	}

	return json(await getWispUsageStats(db, locals.user.id));
};
