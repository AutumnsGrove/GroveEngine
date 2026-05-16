/**
 * Grove Pulse Collector
 *
 * Product observability event pipeline. Receives batched events from
 * all Grove apps via service binding, routes them to a PulseBuffer
 * Durable Object for buffered D1 writes.
 *
 * Cron: Daily at 1 AM UTC — aggregate raw events into daily rollups,
 * prune events older than 90 days.
 */

export { PulseBuffer } from "./pulse-buffer.js";

interface Env {
	OBS_DB: D1Database;
	PULSE_BUFFER: DurableObjectNamespace;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method === "GET") {
			return Response.json({ status: "ready", service: "pulse-collector" });
		}

		if (request.method !== "POST") {
			return Response.json({ error: "Method not allowed" }, { status: 405 });
		}

		try {
			const body = await request.json<{ events?: unknown[] }>();
			if (!body.events || !Array.isArray(body.events) || body.events.length === 0) {
				return Response.json({ error: "No events provided" }, { status: 400 });
			}

			const bufferId = env.PULSE_BUFFER.idFromName(todayPartition());
			const buffer = env.PULSE_BUFFER.get(bufferId);

			const resp = await buffer.fetch(
				new Request("https://pulse-buffer.internal/ingest", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				}),
			);

			return Response.json(
				{ accepted: body.events.length, buffered: true },
				{ status: resp.ok ? 202 : 500 },
			);
		} catch {
			return Response.json({ error: "Failed to process events" }, { status: 500 });
		}
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log(`[Pulse] Scheduled run — cron: ${event.cron}`);
		ctx.waitUntil(runDailyAggregation(env.OBS_DB));
	},
};

function todayPartition(): string {
	return new Date().toISOString().split("T")[0];
}

async function runDailyAggregation(db: D1Database): Promise<void> {
	const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
	const cutoff = Math.floor(Date.now() / 1000) - 90 * 86_400;

	try {
		await db
			.prepare(
				`INSERT OR REPLACE INTO pulse_daily (date, event, category, route, app, count, unique_visitors, avg_duration_ms, error_count)
			 SELECT
			   ? as date,
			   event,
			   category,
			   route,
			   app,
			   COUNT(*) as count,
			   COUNT(DISTINCT visitor_hash) as unique_visitors,
			   AVG(duration_ms) as avg_duration_ms,
			   SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count
			 FROM pulse_events
			 WHERE recorded_at >= ? AND recorded_at < ?
			 GROUP BY event, category, route, app`,
			)
			.bind(yesterday, dateToEpoch(yesterday), dateToEpoch(yesterday) + 86_400)
			.run();

		console.log(`[Pulse] Aggregated events for ${yesterday}`);
	} catch (err) {
		console.error("[Pulse] Aggregation failed:", err);
	}

	try {
		const result = await db
			.prepare("DELETE FROM pulse_events WHERE recorded_at < ?")
			.bind(cutoff)
			.run();
		console.log(`[Pulse] Pruned ${result.meta.changes} events older than 90 days`);
	} catch (err) {
		console.error("[Pulse] Retention cleanup failed:", err);
	}
}

function dateToEpoch(dateStr: string): number {
	return Math.floor(new Date(dateStr + "T00:00:00Z").getTime() / 1000);
}
