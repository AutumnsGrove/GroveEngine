import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPulseErrorHook } from "../error-hook.js";

vi.mock("../emitter.js", () => ({
	emitPulseEvent: vi.fn(),
}));

import { emitPulseEvent } from "../emitter.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(pathname = "/garden", routeId: string | null = null) {
	return {
		url: new URL(`https://example.com${pathname}`),
		request: new Request(`https://example.com${pathname}`, {
			method: "GET",
		}),
		route: { id: routeId },
	};
}

// ---------------------------------------------------------------------------
// createPulseErrorHook
// ---------------------------------------------------------------------------

describe("createPulseErrorHook", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("emits error.server event with the correct app name", () => {
		const handleError = createPulseErrorHook({ app: "aspen" });
		const event = makeEvent("/garden", "/garden/[slug]");

		handleError({
			error: new Error("boom"),
			event: event as never,
			status: 500,
			message: "Internal Server Error",
		});

		expect(emitPulseEvent).toHaveBeenCalledOnce();
		const [eventName, opts] = vi.mocked(emitPulseEvent).mock.calls[0];
		expect(eventName).toBe("error.server");
		expect(opts?.app).toBe("aspen");
	});

	it("captures error message from Error objects", () => {
		const handleError = createPulseErrorHook({ app: "aspen" });
		const event = makeEvent("/garden");

		handleError({
			error: new Error("something broke"),
			event: event as never,
			status: 500,
			message: "fallback",
		});

		const opts = vi.mocked(emitPulseEvent).mock.calls[0][1];
		expect((opts?.metadata as Record<string, unknown>)?.message).toBe("something broke");
	});

	it("falls back to message param when error is not an Error instance", () => {
		const handleError = createPulseErrorHook({ app: "aspen" });
		const event = makeEvent("/garden");

		handleError({
			error: { weird: true },
			event: event as never,
			status: 500,
			message: "fallback message",
		});

		const opts = vi.mocked(emitPulseEvent).mock.calls[0][1];
		expect((opts?.metadata as Record<string, unknown>)?.message).toBe("fallback message");
	});

	it("truncates stack to MAX_STACK_LINES (5 lines)", () => {
		const handleError = createPulseErrorHook({ app: "aspen" });
		const event = makeEvent("/garden");

		const err = new Error("deep stack");
		err.stack = [
			"Error: deep stack",
			"  at a",
			"  at b",
			"  at c",
			"  at d",
			"  at e",
			"  at f",
			"  at g",
		].join("\n");

		handleError({
			error: err,
			event: event as never,
			status: 500,
			message: "Internal Server Error",
		});

		const opts = vi.mocked(emitPulseEvent).mock.calls[0][1];
		const stack = (opts?.metadata as Record<string, unknown>)?.stack as string;
		expect(stack.split("\n")).toHaveLength(5);
	});

	it("returns a generic user-facing error object", () => {
		const handleError = createPulseErrorHook({ app: "aspen" });
		const event = makeEvent("/garden");

		const result = handleError({
			error: new Error("oops"),
			event: event as never,
			status: 500,
			message: "Internal Server Error",
		});

		expect(result).toEqual({ message: "An unexpected error occurred.", code: "INTERNAL_ERROR" });
	});

	it("includes route from route.id when available", () => {
		const handleError = createPulseErrorHook({ app: "aspen" });
		const event = makeEvent("/garden/my-post", "/garden/[slug]");

		handleError({
			error: new Error("oops"),
			event: event as never,
			status: 500,
			message: "Internal Server Error",
		});

		const opts = vi.mocked(emitPulseEvent).mock.calls[0][1];
		expect(opts?.route).toBe("/garden/[slug]");
	});

	it("falls back to pathname when route.id is null", () => {
		const handleError = createPulseErrorHook({ app: "aspen" });
		const event = makeEvent("/some/path", null);

		handleError({
			error: new Error("oops"),
			event: event as never,
			status: 500,
			message: "Internal Server Error",
		});

		const opts = vi.mocked(emitPulseEvent).mock.calls[0][1];
		expect(opts?.route).toBe("/some/path");
	});

	it("handles undefined error gracefully", () => {
		const handleError = createPulseErrorHook({ app: "aspen" });
		const event = makeEvent("/garden");

		expect(() =>
			handleError({
				error: undefined,
				event: event as never,
				status: 500,
				message: "Unknown failure",
			}),
		).not.toThrow();

		const opts = vi.mocked(emitPulseEvent).mock.calls[0][1];
		expect((opts?.metadata as Record<string, unknown>)?.message).toBe("Unknown failure");
	});
});
