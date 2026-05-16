import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GroveErrorDef } from "./types";
import { logGroveError, buildErrorUrl, buildErrorJson } from "./helpers";

const SAMPLE_ERROR: GroveErrorDef = {
	code: "TEST-001",
	category: "bug",
	userMessage: "Something went wrong. Please try again.",
	adminMessage: "D1 database binding unavailable.",
};

const USER_ERROR: GroveErrorDef = {
	code: "TEST-020",
	category: "user",
	userMessage: "Your session has expired. Please sign in again.",
	adminMessage: "Session token expired or invalidated.",
};

describe("logGroveError", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("logs error code, admin message, and prefix", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		logGroveError("TestPkg", SAMPLE_ERROR);
		expect(spy).toHaveBeenCalledOnce();
		expect(spy.mock.calls[0][0]).toBe("[TestPkg] TEST-001: D1 database binding unavailable.");
	});

	it("includes structured JSON with code and category", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		logGroveError("TestPkg", SAMPLE_ERROR);
		const parsed = JSON.parse(spy.mock.calls[0][1] as string);
		expect(parsed.code).toBe("TEST-001");
		expect(parsed.category).toBe("bug");
	});

	it("includes context fields", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		logGroveError("Engine", SAMPLE_ERROR, { path: "/api/posts", userId: "user-123" });
		const parsed = JSON.parse(spy.mock.calls[0][1] as string);
		expect(parsed.path).toBe("/api/posts");
		expect(parsed.userId).toBe("user-123");
	});

	it("sanitizes Error cause to message string only", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		logGroveError("Engine", SAMPLE_ERROR, { cause: new Error("connection refused") });
		const parsed = JSON.parse(spy.mock.calls[0][1] as string);
		expect(parsed.cause).toBe("connection refused");
	});

	it("omits cause field when cause is undefined", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		logGroveError("Engine", SAMPLE_ERROR, { path: "/test" });
		const parsed = JSON.parse(spy.mock.calls[0][1] as string);
		expect(parsed).not.toHaveProperty("cause");
	});
});

describe("buildErrorUrl", () => {
	it("builds URL with error and error_code params", () => {
		const url = buildErrorUrl(SAMPLE_ERROR);
		expect(url).toContain("error=");
		expect(url).toContain("error_code=TEST-001");
	});

	it("uses custom base URL", () => {
		const url = buildErrorUrl(SAMPLE_ERROR, "/login");
		expect(url).toMatch(/^\/login\?/);
	});

	it("includes extra query params", () => {
		const url = buildErrorUrl(SAMPLE_ERROR, "/", { redirect: "/dashboard" });
		const parsed = new URL(url, "https://example.com");
		expect(parsed.searchParams.get("redirect")).toBe("/dashboard");
	});

	it("does not allow extra to overwrite error or error_code", () => {
		const url = buildErrorUrl(SAMPLE_ERROR, "/", { error: "hijacked", error_code: "FAKE" });
		const parsed = new URL(url, "https://example.com");
		expect(parsed.searchParams.get("error")).toBe(SAMPLE_ERROR.userMessage);
		expect(parsed.searchParams.get("error_code")).toBe("TEST-001");
	});

	it("round-trips through URLSearchParams", () => {
		const url = buildErrorUrl(USER_ERROR, "/auth/callback");
		const parsed = new URL(url, "https://example.com");
		expect(parsed.searchParams.get("error")).toBe(USER_ERROR.userMessage);
		expect(parsed.searchParams.get("error_code")).toBe(USER_ERROR.code);
	});
});

describe("buildErrorJson", () => {
	it("returns object with error, error_code, and error_description", () => {
		const json = buildErrorJson(SAMPLE_ERROR);
		expect(json).toEqual({
			error: "TEST-001",
			error_code: "TEST-001",
			error_description: "Something went wrong. Please try again.",
		});
	});

	it("uses userMessage for error_description (not adminMessage)", () => {
		const json = buildErrorJson(SAMPLE_ERROR);
		expect(json.error_description).not.toContain("D1");
	});
});
