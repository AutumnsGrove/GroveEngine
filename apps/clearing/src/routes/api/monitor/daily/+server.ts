/**
 * POST /api/monitor/daily — Manual daily aggregation trigger
 *
 * Triggers the daily history aggregation that normally runs at midnight UTC.
 * Mirrors the old grove-clearing-monitor worker's POST /daily endpoint.
 * Useful for backfilling missed aggregations or testing.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { recordDailyHistory, cleanupOldHistory } from "$lib/server/monitor/daily-history";

export const POST: RequestHandler = async ({ request, platform }) => {
	const env = platform?.env;

	// Verify API key — same secret used by the Sentinel endpoint
	const apiKey = env?.SENTINEL_API_KEY;
	if (!apiKey) {
		console.warn("[api/monitor/daily] SENTINEL_API_KEY not configured");
		return json({ success: false, error: "API not configured" }, { status: 503 });
	}

	const authHeader = request.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ") || authHeader.slice(7) !== apiKey) {
		return json({ success: false, error: "Unauthorized" }, { status: 401 });
	}

	if (!env?.DB) {
		return json({ success: false, error: "Missing required bindings" }, { status: 503 });
	}

	try {
		await recordDailyHistory(env);
		await cleanupOldHistory(env);

		return json({
			success: true,
			message: "Daily aggregation completed",
		});
	} catch (err) {
		console.error("[api/monitor/daily] Error during aggregation:", err);
		return json(
			{
				success: false,
				error: "Internal processing error",
			},
			{ status: 500 },
		);
	}
};
