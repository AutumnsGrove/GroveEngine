/**
 * PulseBuffer Durable Object
 *
 * Buffers incoming product events in memory and flushes to D1 in batches.
 * One instance per day partition (named by date string).
 *
 * Flush triggers:
 * - Buffer reaches 100 events
 * - 10-second alarm fires (set on first event received)
 *
 * D1 write pattern: single INSERT with multiple value rows per flush,
 * keeping write operations low while maintaining near-real-time ingestion.
 */

import { DurableObject } from "cloudflare:workers";

interface PulseEventRow {
	event: string;
	category: string;
	route?: string;
	method?: string;
	status?: number;
	duration_ms?: number;
	tenant_id?: string;
	visitor_hash?: string;
	app?: string;
	metadata?: Record<string, unknown>;
	timestamp?: number;
}

interface Env {
	OBS_DB: D1Database;
}

const FLUSH_THRESHOLD = 100;
const ALARM_INTERVAL_MS = 10_000;

export class PulseBuffer extends DurableObject<Env> {
	private buffer: PulseEventRow[] = [];
	private alarmSet = false;

	async fetch(request: Request): Promise<Response> {
		if (request.method !== "POST") {
			return Response.json({ buffered: this.buffer.length });
		}

		try {
			const body = await request.json<{ events?: PulseEventRow[] }>();
			if (!body.events) {
				return Response.json({ error: "No events" }, { status: 400 });
			}

			this.buffer.push(...body.events);

			if (!this.alarmSet) {
				await this.ctx.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
				this.alarmSet = true;
			}

			if (this.buffer.length >= FLUSH_THRESHOLD) {
				await this.flush();
			}

			return Response.json({ buffered: this.buffer.length, accepted: body.events.length });
		} catch {
			return Response.json({ error: "Failed to buffer events" }, { status: 500 });
		}
	}

	async alarm(): Promise<void> {
		this.alarmSet = false;
		await this.flush();
	}

	private async flush(): Promise<void> {
		if (this.buffer.length === 0) return;

		const batch = this.buffer.splice(0, FLUSH_THRESHOLD);
		const now = Math.floor(Date.now() / 1000);

		try {
			const stmt = this.env.OBS_DB.prepare(
				`INSERT INTO pulse_events (event, category, route, method, status, duration_ms, tenant_id, visitor_hash, app, metadata, recorded_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			);

			const stmts = batch.map((e) =>
				stmt.bind(
					e.event,
					e.category,
					e.route ?? null,
					e.method ?? null,
					e.status ?? null,
					e.duration_ms ?? null,
					e.tenant_id ?? null,
					e.visitor_hash ?? null,
					e.app ?? null,
					e.metadata ? JSON.stringify(e.metadata) : null,
					e.timestamp ?? now,
				),
			);

			await this.env.OBS_DB.batch(stmts);
			console.log(`[PulseBuffer] Flushed ${batch.length} events to D1`);
		} catch (err) {
			console.error(`[PulseBuffer] Flush failed, ${batch.length} events lost:`, err);
		}

		if (this.buffer.length > 0) {
			await this.ctx.storage.setAlarm(Date.now() + ALARM_INTERVAL_MS);
			this.alarmSet = true;
		}
	}
}
