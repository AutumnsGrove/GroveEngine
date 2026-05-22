import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

/**
 * GET /api/health/payments - Payment subsystem health check (REDIRECT)
 *
 * The authoritative payments health check is now at BillingHub
 * (billing.grove.place/api/health). The Clearing Monitor checks
 * billing directly — this endpoint exists only as a compatibility shim.
 */
export const GET: RequestHandler = async () => {
	return json(
		{
			status: "healthy",
			service: "grove-payments",
			reason: "Payments health check moved to BillingHub (billing.grove.place/api/health)",
			redirect: "https://billing.grove.place/api/health",
			checks: [
				{
					name: "redirect_notice",
					status: "pass",
					error: "This endpoint is deprecated — check BillingHub instead",
				},
			],
			timestamp: new Date().toISOString(),
		},
		{
			status: 200,
			headers: {
				"Cache-Control": "no-cache, no-store, must-revalidate",
			},
		},
	);
};
