import type { PageServerLoad } from "./$types";

/**
 * Traffic source classification — applied at query time via SQL CASE.
 * "monitor" = health checks, uptime probes, verification loops
 * "bot"     = vulnerability scanners, crawlers, known attack patterns
 * "organic" = real user traffic
 */
const SOURCE_CLASSIFIER = `
CASE
  WHEN route LIKE '%health%' OR route LIKE '%verify%' OR route LIKE '%healthz%' THEN 'monitor'
  WHEN route LIKE '%.env%'
    OR route LIKE '%wp-%'
    OR route LIKE '%.php%'
    OR route LIKE '%.git%'
    OR route LIKE '%xmlrpc%'
    OR route LIKE '%wlwmanifest%'
    OR route LIKE '%Alvin%'
    OR route LIKE '%kuailian%'
    OR route LIKE '%fanfan%'
    OR route LIKE '%/assets/index/%'
    OR route LIKE '%/assets/images/%'
    OR route LIKE '%/admin%'
    OR route LIKE '%.sql%'
    OR route LIKE '%.bak%'
    OR route LIKE '%.asp%'
    OR route LIKE '%.jsp%'
    OR route LIKE '%/cgi-%'
    THEN 'bot'
  ELSE 'organic'
END`;

interface TrafficSegment {
	source: string;
	requests: number;
	uniqueVisitors: number;
	errorCount: number;
	errorRate: number;
}

interface PulseOverview {
	totalRequests24h: number;
	uniqueVisitors24h: number;
	errorRate24h: number;
	segments: TrafficSegment[];
	organicTopRoutes: Array<{ route: string; app: string; count: number }>;
	organicEventsByCategory: Array<{ category: string; count: number }>;
	monitorRoutes: Array<{ route: string; app: string; count: number; errors: number }>;
	botRoutes: Array<{ route: string; app: string; count: number; status: number | null }>;
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
		totalResult,
		visitorsResult,
		segmentsResult,
		organicRoutesResult,
		organicCategoriesResult,
		monitorRoutesResult,
		botRoutesResult,
		recentErrorsResult,
	] = await Promise.allSettled([
		// Total requests
		db
			.prepare("SELECT COUNT(*) as count FROM pulse_events WHERE recorded_at >= ?")
			.bind(since)
			.first<{ count: number }>(),

		// Unique visitors (organic only)
		db
			.prepare(
				`SELECT COUNT(DISTINCT visitor_hash) as count FROM pulse_events
				 WHERE recorded_at >= ? AND visitor_hash IS NOT NULL
				 AND ${SOURCE_CLASSIFIER} = 'organic'`,
			)
			.bind(since)
			.first<{ count: number }>(),

		// Traffic segments breakdown
		db
			.prepare(
				`SELECT
				   ${SOURCE_CLASSIFIER} as source,
				   COUNT(*) as requests,
				   COUNT(DISTINCT visitor_hash) as unique_visitors,
				   SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count
				 FROM pulse_events
				 WHERE recorded_at >= ?
				 GROUP BY source
				 ORDER BY requests DESC`,
			)
			.bind(since)
			.all<{ source: string; requests: number; unique_visitors: number; error_count: number }>(),

		// Organic top routes
		db
			.prepare(
				`SELECT route, app, COUNT(*) as count FROM pulse_events
				 WHERE recorded_at >= ? AND route IS NOT NULL
				 AND ${SOURCE_CLASSIFIER} = 'organic'
				 GROUP BY route, app ORDER BY count DESC LIMIT 15`,
			)
			.bind(since)
			.all<{ route: string; app: string; count: number }>(),

		// Organic events by category
		db
			.prepare(
				`SELECT category, COUNT(*) as count FROM pulse_events
				 WHERE recorded_at >= ?
				 AND ${SOURCE_CLASSIFIER} = 'organic'
				 GROUP BY category ORDER BY count DESC`,
			)
			.bind(since)
			.all<{ category: string; count: number }>(),

		// Monitor routes with error counts
		db
			.prepare(
				`SELECT route, app, COUNT(*) as count,
				   SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors
				 FROM pulse_events
				 WHERE recorded_at >= ? AND ${SOURCE_CLASSIFIER} = 'monitor'
				 GROUP BY route, app ORDER BY count DESC LIMIT 15`,
			)
			.bind(since)
			.all<{ route: string; app: string; count: number; errors: number }>(),

		// Bot routes
		db
			.prepare(
				`SELECT route, app, COUNT(*) as count, status
				 FROM pulse_events
				 WHERE recorded_at >= ? AND ${SOURCE_CLASSIFIER} = 'bot'
				 GROUP BY route, app, status ORDER BY count DESC LIMIT 15`,
			)
			.bind(since)
			.all<{ route: string; app: string; count: number; status: number | null }>(),

		// Recent organic errors only
		db
			.prepare(
				`SELECT event, route, app, status, metadata, recorded_at FROM pulse_events
				 WHERE category = 'error' AND recorded_at >= ?
				 AND ${SOURCE_CLASSIFIER} = 'organic'
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

	const totalRequests = totalResult.status === "fulfilled" ? (totalResult.value?.count ?? 0) : 0;
	const uniqueVisitors =
		visitorsResult.status === "fulfilled" ? (visitorsResult.value?.count ?? 0) : 0;

	const rawSegments =
		segmentsResult.status === "fulfilled" ? (segmentsResult.value.results ?? []) : [];

	const segments: TrafficSegment[] = rawSegments.map((s) => ({
		source: s.source,
		requests: s.requests,
		uniqueVisitors: s.unique_visitors,
		errorCount: s.error_count,
		errorRate: s.requests > 0 ? (s.error_count / s.requests) * 100 : 0,
	}));

	const organicSegment = segments.find((s) => s.source === "organic");
	const organicErrorRate = organicSegment?.errorRate ?? 0;

	const overview: PulseOverview = {
		totalRequests24h: totalRequests,
		uniqueVisitors24h: uniqueVisitors,
		errorRate24h: organicErrorRate,
		segments,
		organicTopRoutes:
			organicRoutesResult.status === "fulfilled" ? (organicRoutesResult.value.results ?? []) : [],
		organicEventsByCategory:
			organicCategoriesResult.status === "fulfilled"
				? (organicCategoriesResult.value.results ?? [])
				: [],
		monitorRoutes:
			monitorRoutesResult.status === "fulfilled" ? (monitorRoutesResult.value.results ?? []) : [],
		botRoutes: botRoutesResult.status === "fulfilled" ? (botRoutesResult.value.results ?? []) : [],
		recentErrors: (recentErrorsResult.status === "fulfilled"
			? (recentErrorsResult.value.results ?? [])
			: []
		).map((e) => {
			let meta: Record<string, unknown> = {};
			try {
				if (e.metadata) meta = JSON.parse(e.metadata) as Record<string, unknown>;
			} catch {
				// Corrupted metadata — degrade gracefully
			}
			return {
				event: e.event,
				route: e.route,
				app: e.app,
				status: e.status,
				message: typeof meta.message === "string" ? meta.message : null,
				recorded_at: e.recorded_at,
			};
		}),
	};

	return { overview, dbAvailable: true };
};
