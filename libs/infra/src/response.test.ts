/**
 * Tests for the shared response builder utilities.
 *
 * Each builder is a pure function that produces a Web API Response — the tests
 * inspect status, headers, and the parsed JSON body directly.
 */

import { describe, it, expect } from "vitest";
import { jsonResponse, errorResponse, noContentResponse, groveResponse } from "./response.js";

// =============================================================================
// jsonResponse
// =============================================================================

describe("jsonResponse", () => {
	it("should return status 200 by default", () => {
		const res = jsonResponse({ id: "abc" });

		expect(res.status).toBe(200);
	});

	it("should wrap data in the success envelope", async () => {
		const data = { id: "abc", status: "ok" };
		const res = jsonResponse(data);
		const body = await res.json();

		expect(body).toEqual({ success: true, data });
	});

	it("should accept a custom status code", async () => {
		const res = jsonResponse({ created: true }, 201);
		const body = await res.json();

		expect(res.status).toBe(201);
		expect(body.success).toBe(true);
		expect(body.data).toEqual({ created: true });
	});

	it("should set Content-Type to application/json", () => {
		const res = jsonResponse({ x: 1 });

		expect(res.headers.get("Content-Type")).toBe("application/json");
	});

	it("should handle null data without error", async () => {
		const res = jsonResponse(null);
		const body = await res.json();

		expect(body).toEqual({ success: true, data: null });
	});

	it("should handle array data", async () => {
		const data = [1, 2, 3];
		const res = jsonResponse(data);
		const body = await res.json();

		expect(body).toEqual({ success: true, data });
	});

	it("should handle nested object data", async () => {
		const data = { user: { id: "u1", name: "Robin" }, meta: { count: 1 } };
		const res = jsonResponse(data);
		const body = await res.json();

		expect(body.data).toEqual(data);
	});
});

// =============================================================================
// errorResponse
// =============================================================================

describe("errorResponse", () => {
	it("should return status 400 by default", () => {
		const res = errorResponse("something went wrong");

		expect(res.status).toBe(400);
	});

	it("should wrap error in the failure envelope", async () => {
		const res = errorResponse("something went wrong");
		const body = await res.json();

		expect(body.success).toBe(false);
		expect(body.error.message).toBe("something went wrong");
	});

	it("should default error code to HTTP_<status>", async () => {
		const res = errorResponse("not found", 404);
		const body = await res.json();

		expect(res.status).toBe(404);
		expect(body.error.code).toBe("HTTP_404");
	});

	it("should accept a custom error code", async () => {
		const res = errorResponse("not found", 404, "NOT_FOUND");
		const body = await res.json();

		expect(body.error.code).toBe("NOT_FOUND");
	});

	it("should use the provided status code", async () => {
		const res = errorResponse("server error", 500, "INTERNAL");
		const body = await res.json();

		expect(res.status).toBe(500);
		expect(body.error.code).toBe("INTERNAL");
		expect(body.error.message).toBe("server error");
	});

	it("should set Content-Type to application/json", () => {
		const res = errorResponse("oops");

		expect(res.headers.get("Content-Type")).toBe("application/json");
	});

	it("should produce a 401 with AUTH_REQUIRED code", async () => {
		const res = errorResponse("Unauthorized", 401, "AUTH_REQUIRED");
		const body = await res.json();

		expect(res.status).toBe(401);
		expect(body.error.code).toBe("AUTH_REQUIRED");
	});
});

// =============================================================================
// noContentResponse
// =============================================================================

describe("noContentResponse", () => {
	it("should return status 204", () => {
		const res = noContentResponse();

		expect(res.status).toBe(204);
	});

	it("should return a null body", () => {
		const res = noContentResponse();

		expect(res.body).toBeNull();
	});

	it("should not set Content-Type header", () => {
		const res = noContentResponse();

		// null body responses should carry no content-type
		expect(res.headers.get("Content-Type")).toBeNull();
	});
});

// =============================================================================
// groveResponse
// =============================================================================

describe("groveResponse", () => {
	it("should serialise a pre-built success envelope with status 200 by default", async () => {
		const envelope = { success: true as const, data: { id: "x" } };
		const res = groveResponse(envelope);
		const body = await res.json();

		expect(res.status).toBe(200);
		expect(body).toEqual(envelope);
	});

	it("should use the provided successStatus", async () => {
		const envelope = { success: true as const, data: {} };
		const res = groveResponse(envelope, 201);

		expect(res.status).toBe(201);
	});

	it("should serialise a pre-built error envelope with status 400 by default", async () => {
		const envelope = {
			success: false as const,
			error: { code: "NOT_FOUND", message: "missing" },
		};
		const res = groveResponse(envelope);
		const body = await res.json();

		expect(res.status).toBe(400);
		expect(body).toEqual(envelope);
	});

	it("should use the provided errorStatus", async () => {
		const envelope = {
			success: false as const,
			error: { code: "GONE", message: "deleted" },
		};
		const res = groveResponse(envelope, 200, 410);

		expect(res.status).toBe(410);
	});

	it("should set Content-Type to application/json for success responses", () => {
		const res = groveResponse({ success: true as const, data: null });

		expect(res.headers.get("Content-Type")).toBe("application/json");
	});

	it("should set Content-Type to application/json for error responses", () => {
		const res = groveResponse({
			success: false as const,
			error: { code: "ERR", message: "bad" },
		});

		expect(res.headers.get("Content-Type")).toBe("application/json");
	});
});
