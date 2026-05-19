import type { PageServerLoad } from "./$types";

interface PulseError {
	event: string;
	route: string;
	app: string;
	method: string | null;
	status: number | null;
	message: string | null;
	stack: string | null;
	recorded_at: number;
}

export const load: PageServerLoad = async ({ parent, platform, url }) => {
	await parent();

	const db = platform?.env?.OBS_DB;
	if (!db) {
		return { errors: [], dbAvailable: false, total: 0 };
	}

	const appFilter = url.searchParams.get("app");
	const limit = 50;

	const whereClause = appFilter
		? "WHERE category = 'error' AND app = ?"
		: "WHERE category = 'error'";
	const bindings = appFilter ? [appFilter] : [];

	const [errorsResult, countResult] = await Promise.allSettled([
		db
			.prepare(
				`SELECT event, route, app, method, status, metadata, recorded_at FROM pulse_events
				 ${whereClause}
				 ORDER BY recorded_at DESC LIMIT ${limit}`,
			)
			.bind(...bindings)
			.all<{
				event: string;
				route: string;
				app: string;
				method: string | null;
				status: number | null;
				metadata: string | null;
				recorded_at: number;
			}>(),
		db
			.prepare(`SELECT COUNT(*) as count FROM pulse_events ${whereClause}`)
			.bind(...bindings)
			.first<{ count: number }>(),
	]);

	const rawErrors = errorsResult.status === "fulfilled" ? (errorsResult.value.results ?? []) : [];
	const total = countResult.status === "fulfilled" ? (countResult.value?.count ?? 0) : 0;

	const errors: PulseError[] = rawErrors.map((e) => {
		let meta: Record<string, unknown> = {};
		try {
			if (e.metadata) meta = JSON.parse(e.metadata) as Record<string, unknown>;
		} catch {
			// Corrupted metadata row — degrade gracefully
		}
		return {
			event: e.event,
			route: e.route,
			app: e.app,
			method: e.method,
			status: e.status,
			message: typeof meta.message === "string" ? meta.message : null,
			stack: typeof meta.stack === "string" ? meta.stack : null,
			recorded_at: e.recorded_at,
		};
	});

	return { errors, dbAvailable: true, total, appFilter };
};
