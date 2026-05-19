import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { initPulse, emitPulseEvent, emitRequestEvent, flushPulse } from "../emitter.js";
import type { PulseBatchPayload, PulseCollector } from "../types.js";

function createMockCollector(): PulseCollector & { calls: PulseBatchPayload[] } {
	const calls: PulseBatchPayload[] = [];
	return {
		calls,
		async fetch(request: Request): Promise<Response> {
			const body = (await request.json()) as PulseBatchPayload;
			calls.push(body);
			return new Response("ok");
		},
	};
}

describe("emitPulseEvent", () => {
	let collector: ReturnType<typeof createMockCollector>;

	beforeEach(() => {
		vi.useFakeTimers();
		collector = createMockCollector();
		initPulse(collector);
	});

	afterEach(async () => {
		await flushPulse();
		vi.useRealTimers();
	});

	it("buffers events and flushes on timer", async () => {
		emitPulseEvent("page.viewed", { route: "/garden", app: "aspen" });
		expect(collector.calls).toHaveLength(0);

		vi.advanceTimersByTime(5_000);
		await vi.runAllTimersAsync();
		await flushPulse();

		expect(collector.calls).toHaveLength(1);
		expect(collector.calls[0].events).toHaveLength(1);
		expect(collector.calls[0].events[0].event).toBe("page.viewed");
		expect(collector.calls[0].events[0].category).toBe("page");
	});

	it("flushes immediately at threshold (50 events)", async () => {
		for (let i = 0; i < 50; i++) {
			emitPulseEvent("page.viewed", { route: `/page/${i}`, app: "aspen" });
		}

		await vi.runAllTimersAsync();
		await flushPulse();

		expect(collector.calls.length).toBeGreaterThanOrEqual(1);
		const total = collector.calls.reduce((sum, c) => sum + c.events.length, 0);
		expect(total).toBe(50);
	});

	it("maps event prefixes to correct categories", async () => {
		emitPulseEvent("signup.started", { app: "plant" });
		emitPulseEvent("post.published", { app: "aspen" });
		emitPulseEvent("comment.posted", { app: "aspen" });
		emitPulseEvent("curio.deployed", { app: "aspen" });
		emitPulseEvent("lantern.navigated", { app: "aspen" });
		emitPulseEvent("error.server", { app: "landing" });

		await flushPulse();

		const events = collector.calls[0].events;
		expect(events[0].category).toBe("signup");
		expect(events[1].category).toBe("publish");
		expect(events[2].category).toBe("social");
		expect(events[3].category).toBe("curio");
		expect(events[4].category).toBe("feature");
		expect(events[5].category).toBe("error");
	});

	it("includes timestamp as unix epoch seconds", async () => {
		const before = Math.floor(Date.now() / 1000);
		emitPulseEvent("page.viewed", { app: "landing" });
		await flushPulse();

		const ts = collector.calls[0].events[0].timestamp;
		expect(ts).toBeGreaterThanOrEqual(before);
		expect(ts).toBeLessThanOrEqual(before + 1);
	});

	it("does not throw when collector is unavailable", async () => {
		const failingCollector: PulseCollector = {
			async fetch(): Promise<Response> {
				throw new Error("network down");
			},
		};
		initPulse(failingCollector);

		emitPulseEvent("page.viewed", { app: "landing" });
		await expect(flushPulse()).resolves.toBeUndefined();
	});
});

describe("emitRequestEvent", () => {
	let collector: ReturnType<typeof createMockCollector>;

	beforeEach(() => {
		vi.useFakeTimers();
		collector = createMockCollector();
		initPulse(collector);
	});

	afterEach(async () => {
		await flushPulse();
		vi.useRealTimers();
	});

	it("emits a page.viewed event with request metadata", async () => {
		emitRequestEvent({
			route: "/garden/my-first-post",
			method: "GET",
			status: 200,
			duration_ms: 42,
			tenant_id: "t_abc123",
			visitor_hash: "deadbeef01234567",
			app: "aspen",
		});

		await flushPulse();

		const event = collector.calls[0].events[0];
		expect(event.event).toBe("page.viewed");
		expect(event.route).toBe("/garden/my-first-post");
		expect(event.method).toBe("GET");
		expect(event.status).toBe(200);
		expect(event.duration_ms).toBe(42);
		expect(event.tenant_id).toBe("t_abc123");
		expect(event.visitor_hash).toBe("deadbeef01234567");
		expect(event.app).toBe("aspen");
	});
});
