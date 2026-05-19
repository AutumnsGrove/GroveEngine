import type { PageServerLoad } from "./$types";

interface FunnelStep {
	step: string;
	count: number;
	conversion: number | null;
}

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.OBS_DB;
	if (!db) {
		return { funnel: null, dbAvailable: false };
	}

	const since = Math.floor(Date.now() / 1000) - 30 * 86_400;

	const stepsResult = await db
		.prepare(
			`SELECT event as step, COUNT(*) as count FROM pulse_events
			 WHERE category = 'signup' AND recorded_at >= ?
			 GROUP BY event ORDER BY count DESC`,
		)
		.bind(since)
		.all<{ step: string; count: number }>()
		.catch(() => ({ results: [] as { step: string; count: number }[] }));

	const stepOrder = [
		"signup.oauth_complete",
		"signup.profile_done",
		"signup.email_verified",
		"signup.plan_selected",
		"signup.checkout_complete",
		"signup.tenant_created",
	];

	const countMap = new Map((stepsResult.results ?? []).map((r) => [r.step, r.count]));

	const funnel: FunnelStep[] = stepOrder.map((step, i) => {
		const count = countMap.get(step) ?? 0;
		const prevCount = i === 0 ? count : (countMap.get(stepOrder[i - 1]) ?? 0);
		return {
			step,
			count,
			conversion: prevCount > 0 ? (count / prevCount) * 100 : null,
		};
	});

	return { funnel, dbAvailable: true };
};
