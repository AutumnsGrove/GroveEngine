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

export const POST: RequestHandler = async ({ platform }) => {
	const env = platform?.env;
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
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
};
