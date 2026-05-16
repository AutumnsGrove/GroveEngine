import type { PageServerLoad } from "./$types";

interface PulseOverview {
	totalRequests24h: number;
	uniqueVisitors24h: number;
	errorRate24h: number;
	topRoutes: Array<{ route: string; app: string; count: number }>;
	eventsByCategory: Array<{ category: string; count: number }>;
	recentErrors: Array<{
		event: string;
		route: string;
		app: string;
		status: number | null;
		message: string | null;
		recorded_at: number;
	}>;
}

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.OBS_DB;
	if (!db) {
		return { overview: null, dbAvailable: false };
	}

	const since = Math.floor(Date.now() / 1000) - 86_400;

	const [
		requestsResult,
		visitorsResult,
		errorsCountResult,
		topRoutesResult,
		categoriesResult,
		recentErrorsResult,
	] = await Promise.allSettled([
		db
			.prepare("SELECT COUNT(*) as count FROM pulse_events WHERE recorded_at >= ?")
			.bind(since)
			.first<{ count: number }>(),
		db
			.prepare(
				"SELECT COUNT(DISTINCT visitor_hash) as count FROM pulse_events WHERE recorded_at >= ? AND visitor_hash IS NOT NULL",
			)
			.bind(since)
			.first<{ count: number }>(),
		db
			.prepare(
				"SELECT COUNT(*) as count FROM pulse_events WHERE recorded_at >= ? AND category = 'error'",
			)
			.bind(since)
			.first<{ count: number }>(),
		db
			.prepare(
				`SELECT route, app, COUNT(*) as count FROM pulse_events
					 WHERE recorded_at >= ? AND route IS NOT NULL
					 GROUP BY route, app ORDER BY count DESC LIMIT 15`,
			)
			.bind(since)
			.all<{ route: string; app: string; count: number }>(),
		db
			.prepare(
				`SELECT category, COUNT(*) as count FROM pulse_events
					 WHERE recorded_at >= ?
					 GROUP BY category ORDER BY count DESC`,
			)
			.bind(since)
			.all<{ category: string; count: number }>(),
		db
			.prepare(
				`SELECT event, route, app, status, metadata, recorded_at FROM pulse_events
					 WHERE category = 'error' AND recorded_at >= ?
					 ORDER BY recorded_at DESC LIMIT 20`,
			)
			.bind(since)
			.all<{
				event: string;
				route: string;
				app: string;
				status: number | null;
				metadata: string | null;
				recorded_at: number;
			}>(),
	]);

	const totalRequests =
		requestsResult.status === "fulfilled" ? (requestsResult.value?.count ?? 0) : 0;
	const uniqueVisitors =
		visitorsResult.status === "fulfilled" ? (visitorsResult.value?.count ?? 0) : 0;
	const errorCount =
		errorsCountResult.status === "fulfilled" ? (errorsCountResult.value?.count ?? 0) : 0;

	const overview: PulseOverview = {
		totalRequests24h: totalRequests,
		uniqueVisitors24h: uniqueVisitors,
		errorRate24h: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
		topRoutes: topRoutesResult.status === "fulfilled" ? (topRoutesResult.value.results ?? []) : [],
		eventsByCategory:
			categoriesResult.status === "fulfilled" ? (categoriesResult.value.results ?? []) : [],
		recentErrors: (recentErrorsResult.status === "fulfilled"
			? (recentErrorsResult.value.results ?? [])
			: []
		).map((e) => {
			const meta = e.metadata ? (JSON.parse(e.metadata) as Record<string, unknown>) : {};
			return {
				event: e.event,
				route: e.route,
				app: e.app,
				status: e.status,
				message: (meta.message as string) ?? null,
				recorded_at: e.recorded_at,
			};
		}),
	};

	return { overview, dbAvailable: true };
};
