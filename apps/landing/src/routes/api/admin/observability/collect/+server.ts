/**
 * POST /api/admin/observability/collect — Manual collection trigger
 *
 * Calls the grove-vista-collector worker via service binding to trigger
 * a manual collection run. Wayfinder access required.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { isWayfinder } from "@autumnsgrove/lattice/config";

export const POST: RequestHandler = async ({ platform, locals }) => {
	const db = platform?.env?.DB;
	if (!db)
		return json(
			{ error: "GROVE-OBS-503", error_description: "Database unavailable" },
			{ status: 503 },
		);
	if (!isWayfinder(locals.user?.email ?? ""))
		return json(
			{ error: "GROVE-OBS-403", error_description: "Wayfinder access required" },
			{ status: 403 },
		);

	const vistaCollector = platform?.env?.VISTA_COLLECTOR;
	if (!vistaCollector) {
		return json(
			{
				success: false,
				message:
					"Manual collection is not yet available — the VISTA_COLLECTOR service binding is not configured.",
			},
			{ status: 501 },
		);
	}

	const token = platform?.env?.CF_OBSERVABILITY_TOKEN;
	if (!token) {
		return json(
			{
				success: false,
				message:
					"CF_OBSERVABILITY_TOKEN is not configured. Set it in the landing app's environment.",
			},
			{ status: 503 },
		);
	}

	try {
		const response = await vistaCollector.fetch("https://vista-collector.internal/", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		});

		const result = await response.json();

		if (!response.ok) {
			return json(
				{ success: false, message: "Collector returned an error.", detail: result },
				{ status: response.status },
			);
		}

		return json({ success: true, result });
	} catch (err) {
		console.error("[Vista Collect API] Service binding call failed:", err);
		return json(
			{ success: false, message: "Failed to reach the collector worker." },
			{ status: 502 },
		);
	}
};
