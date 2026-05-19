/**
 * Grove Pulse — Event Emitter
 *
 * Fire-and-forget event emission to the pulse-collector worker via service
 * binding. Falls silent on failure — observability must never break the
 * product it's observing.
 *
 * @module pulse/emitter
 */

import type {
	PulseEvent,
	PulseEventName,
	PulseCategory,
	PulseCollector,
	PulseRequestEvent,
	PulseBatchPayload,
} from "./types.js";

// Derived from PulseEventName prefixes in types.ts. When adding new event
// types, ensure this map is updated — unknown prefixes fall through to "page".
const CATEGORY_MAP: Record<string, PulseCategory> = {
	page: "page",
	signup: "signup",
	post: "publish",
	comment: "social",
	curio: "curio",
	lantern: "feature",
	reeds: "feature",
	error: "error",
};

function categoryFromEvent(event: PulseEventName): PulseCategory {
	const prefix = event.split(".")[0];
	return CATEGORY_MAP[prefix] ?? "page";
}

let eventBuffer: PulseEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let currentCollector: PulseCollector | null = null;

const FLUSH_INTERVAL_MS = 5_000;
/** Client-side buffer flush threshold. See also: PulseBuffer DO (FLUSH_THRESHOLD = 100) */
const FLUSH_THRESHOLD = 50;

function scheduleFlush(): void {
	if (flushTimer) return;
	flushTimer = setTimeout(() => {
		flushTimer = null;
		flush();
	}, FLUSH_INTERVAL_MS);
}

async function flush(): Promise<void> {
	if (eventBuffer.length === 0 || !currentCollector) return;

	const batch = eventBuffer;
	eventBuffer = [];

	try {
		const payload: PulseBatchPayload = { events: batch };
		await currentCollector.fetch(
			new Request("https://pulse-collector.internal/ingest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			}),
		);
	} catch {
		// Observability must never break the product. Drop silently.
	}
}

/**
 * Initialize the Pulse emitter with a service binding reference.
 * Call once during app startup (e.g., in SvelteKit hooks.server.ts).
 */
export function initPulse(collector: PulseCollector): void {
	currentCollector = collector;
}

/**
 * Emit a single product event. Fire-and-forget — never throws.
 */
export function emitPulseEvent(
	event: PulseEventName,
	options?: {
		route?: string;
		method?: string;
		status?: number;
		duration_ms?: number;
		tenant_id?: string;
		visitor_hash?: string;
		app?: string;
		metadata?: Record<string, unknown>;
	},
): void {
	const pulseEvent: PulseEvent = {
		event,
		category: categoryFromEvent(event),
		timestamp: Math.floor(Date.now() / 1000),
		...options,
	};

	eventBuffer.push(pulseEvent);

	if (eventBuffer.length >= FLUSH_THRESHOLD) {
		flush();
	} else {
		scheduleFlush();
	}
}

/**
 * Emit an automatic request event from a SvelteKit handle hook.
 * Convenience wrapper that maps request data to a page.viewed event.
 */
export function emitRequestEvent(req: PulseRequestEvent): void {
	emitPulseEvent("page.viewed", {
		route: req.route,
		method: req.method,
		status: req.status,
		duration_ms: req.duration_ms,
		tenant_id: req.tenant_id,
		visitor_hash: req.visitor_hash,
		app: req.app,
	});
}

/**
 * Force-flush any buffered events. Call in SvelteKit hooks or worker
 * shutdown to avoid losing the tail of the buffer.
 */
export async function flushPulse(): Promise<void> {
	if (flushTimer) {
		clearTimeout(flushTimer);
		flushTimer = null;
	}
	await flush();
}
