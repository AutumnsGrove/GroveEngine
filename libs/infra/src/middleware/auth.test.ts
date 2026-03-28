/**
 * Tests for createAuthMiddleware factory.
 *
 * The middleware is tested by calling it directly with a minimal Hono context
 * mock — no Hono app required. Each test exercises one behavioural concern.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuthMiddleware } from "./auth.js";

// =============================================================================
// Mock context helpers
// =============================================================================

type MockContextOptions = {
	headers?: Record<string, string>;
	env?: Record<string, unknown>;
};

function createMockContext(options: MockContextOptions = {}) {
	const vars: Record<string, unknown> = {};
	const responses: Response[] = [];

	// Normalize header keys to lowercase for case-insensitive lookup
	const normalizedHeaders: Record<string, string> = {};
	for (const [k, v] of Object.entries(options.headers ?? {})) {
		normalizedHeaders[k.toLowerCase()] = v;
	}

	const c = {
		req: {
			header: (name: string) => normalizedHeaders[name.toLowerCase()] ?? null,
		},
		env: options.env ?? {},
		set: (key: string, value: unknown) => {
			vars[key] = value;
		},
		get: (key: string) => vars[key],
		// json() mirrors what Hono does — builds a Response and returns it
		json: (body: unknown, status = 200) => {
			const r = new Response(JSON.stringify(body), {
				status,
				headers: { "Content-Type": "application/json" },
			});
			responses.push(r);
			return r;
		},
		// Expose internals for assertions
		_vars: vars,
		_responses: responses,
	};

	return c;
}

const VALID_KEY = "super-secret-key";

const defaultNext = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
	vi.clearAllMocks();
});

// =============================================================================
// Token extraction
// =============================================================================

describe("token extraction", () => {
	it("should pass with correct key in default X-API-Key header", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
		});

		const c = createMockContext({ headers: { "X-API-Key": VALID_KEY } });
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeUndefined(); // middleware called next(), no early return
		expect(defaultNext).toHaveBeenCalledOnce();
	});

	it("should pass with correct key in a custom header", async () => {
		const middleware = createAuthMiddleware({
			headerName: "X-Service-Token",
			getSecret: () => VALID_KEY,
		});

		const c = createMockContext({ headers: { "X-Service-Token": VALID_KEY } });
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeUndefined();
		expect(defaultNext).toHaveBeenCalledOnce();
	});

	it("should strip a Bearer prefix before comparison", async () => {
		const middleware = createAuthMiddleware({
			headerName: "Authorization",
			tokenPrefix: "Bearer ",
			getSecret: () => VALID_KEY,
		});

		const c = createMockContext({ headers: { Authorization: `Bearer ${VALID_KEY}` } });
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeUndefined();
		expect(defaultNext).toHaveBeenCalledOnce();
	});

	it("should not strip prefix when header value does not start with it", async () => {
		// Value without "Bearer " must match the full raw header against the secret
		const middleware = createAuthMiddleware({
			headerName: "Authorization",
			tokenPrefix: "Bearer ",
			getSecret: () => VALID_KEY,
		});

		// Raw header equals the key (no prefix) — comparison uses the raw value
		const c = createMockContext({ headers: { Authorization: VALID_KEY } });
		const result = await middleware(c as never, defaultNext);

		// VALID_KEY without stripping still equals VALID_KEY, so this passes
		expect(result).toBeUndefined();
		expect(defaultNext).toHaveBeenCalledOnce();
	});
});

// =============================================================================
// Timing-safe comparison
// =============================================================================

describe("timing-safe comparison", () => {
	it("should reject a request with an incorrect API key", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
		});

		const c = createMockContext({ headers: { "X-API-Key": "wrong-key" } });
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
		expect(defaultNext).not.toHaveBeenCalled();
	});

	it("should reject a key that is a prefix of the correct key", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
		});

		const c = createMockContext({ headers: { "X-API-Key": VALID_KEY.slice(0, -1) } });
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
	});

	it("should reject an empty string key", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
		});

		const c = createMockContext({ headers: { "X-API-Key": "" } });
		// An empty string is falsy — `!rawHeader` is true, so the middleware
		// treats this the same as a missing header and returns 401 immediately.
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
	});
});

// =============================================================================
// Missing token
// =============================================================================

describe("missing token", () => {
	it("should return 401 when the API key header is absent", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
		});

		const c = createMockContext({ headers: {} });
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
		expect(defaultNext).not.toHaveBeenCalled();
	});

	it("should include AUTH_REQUIRED code in the 401 body", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
		});

		const c = createMockContext();
		const result = (await middleware(c as never, defaultNext)) as Response;
		const body = await result.json();

		expect(body.success).toBe(false);
		expect(body.error.code).toBe("AUTH_REQUIRED");
	});

	it("should call custom missingToken error builder when provided", async () => {
		const customResponse = new Response("custom missing", { status: 403 });
		const missingToken = vi.fn().mockReturnValue(customResponse);

		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			errors: { missingToken },
		});

		const c = createMockContext();
		const result = await middleware(c as never, defaultNext);

		expect(missingToken).toHaveBeenCalledOnce();
		expect(result).toBe(customResponse);
	});
});

// =============================================================================
// Missing secret (not configured)
// =============================================================================

describe("missing secret", () => {
	it("should return 500 when getSecret returns undefined", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => undefined,
		});

		const c = createMockContext({ headers: { "X-API-Key": "any-key" } });
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(500);
		expect(defaultNext).not.toHaveBeenCalled();
	});

	it("should include INTERNAL_ERROR code in the 500 body", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => undefined,
		});

		const c = createMockContext({ headers: { "X-API-Key": "any-key" } });
		const result = (await middleware(c as never, defaultNext)) as Response;
		const body = await result.json();

		expect(body.success).toBe(false);
		expect(body.error.code).toBe("INTERNAL_ERROR");
	});

	it("should call custom secretNotConfigured error builder when provided", async () => {
		const customResponse = new Response("secret missing", { status: 500 });
		const secretNotConfigured = vi.fn().mockReturnValue(customResponse);

		const middleware = createAuthMiddleware({
			getSecret: () => undefined,
			errors: { secretNotConfigured },
		});

		const c = createMockContext({ headers: { "X-API-Key": "any-key" } });
		const result = await middleware(c as never, defaultNext);

		expect(secretNotConfigured).toHaveBeenCalledOnce();
		expect(result).toBe(customResponse);
	});
});

// =============================================================================
// Required context headers
// =============================================================================

describe("required context headers", () => {
	it("should extract required headers and set them as variables on success", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			requiredContextHeaders: { tenantId: "X-Tenant-Id" },
		});

		const c = createMockContext({
			headers: { "X-API-Key": VALID_KEY, "X-Tenant-Id": "tenant-abc" },
		});
		await middleware(c as never, defaultNext);

		expect(c._vars["tenantId"]).toBe("tenant-abc");
	});

	it("should return 401 when a required context header is missing", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			requiredContextHeaders: { tenantId: "X-Tenant-Id" },
		});

		// Correct key but missing X-Tenant-Id
		const c = createMockContext({ headers: { "X-API-Key": VALID_KEY } });
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(401);
		expect(defaultNext).not.toHaveBeenCalled();
	});

	it("should extract multiple required headers into separate variables", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			requiredContextHeaders: {
				tenantId: "X-Tenant-Id",
				requestId: "X-Request-Id",
			},
		});

		const c = createMockContext({
			headers: {
				"X-API-Key": VALID_KEY,
				"X-Tenant-Id": "tenant-abc",
				"X-Request-Id": "req-123",
			},
		});
		await middleware(c as never, defaultNext);

		expect(c._vars["tenantId"]).toBe("tenant-abc");
		expect(c._vars["requestId"]).toBe("req-123");
	});

	it("should call custom missingContextHeader error builder with the header name", async () => {
		const customResponse = new Response("missing header", { status: 400 });
		const missingContextHeader = vi.fn().mockReturnValue(customResponse);

		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			requiredContextHeaders: { tenantId: "X-Tenant-Id" },
			errors: { missingContextHeader },
		});

		const c = createMockContext({ headers: { "X-API-Key": VALID_KEY } });
		await middleware(c as never, defaultNext);

		expect(missingContextHeader).toHaveBeenCalledWith(expect.anything(), "X-Tenant-Id");
	});
});

// =============================================================================
// Optional context headers
// =============================================================================

describe("optional context headers", () => {
	it("should extract optional header when present", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			optionalContextHeaders: { correlationId: "X-Correlation-Id" },
		});

		const c = createMockContext({
			headers: { "X-API-Key": VALID_KEY, "X-Correlation-Id": "corr-xyz" },
		});
		await middleware(c as never, defaultNext);

		expect(c._vars["correlationId"]).toBe("corr-xyz");
		expect(defaultNext).toHaveBeenCalledOnce();
	});

	it("should not set the variable when the optional header is absent", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			optionalContextHeaders: { correlationId: "X-Correlation-Id" },
		});

		const c = createMockContext({ headers: { "X-API-Key": VALID_KEY } });
		await middleware(c as never, defaultNext);

		expect(c._vars["correlationId"]).toBeUndefined();
		expect(defaultNext).toHaveBeenCalledOnce();
	});

	it("should not return an error when optional header is absent", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			optionalContextHeaders: { correlationId: "X-Correlation-Id" },
		});

		const c = createMockContext({ headers: { "X-API-Key": VALID_KEY } });
		const result = await middleware(c as never, defaultNext);

		// No early return — undefined means next() was called
		expect(result).toBeUndefined();
	});
});

// =============================================================================
// Tier validation
// =============================================================================

describe("tier validation", () => {
	const tierMiddleware = () =>
		createAuthMiddleware({
			getSecret: () => VALID_KEY,
			tierHeader: "X-Tier",
			validTiers: ["wanderer", "seedling", "sapling"],
			forbiddenTiers: ["wanderer"],
			tierVariableName: "tier",
		});

	it("should accept a valid non-forbidden tier and set the variable", async () => {
		const middleware = tierMiddleware();
		const c = createMockContext({
			headers: { "X-API-Key": VALID_KEY, "X-Tier": "seedling" },
		});
		await middleware(c as never, defaultNext);

		expect(c._vars["tier"]).toBe("seedling");
		expect(defaultNext).toHaveBeenCalledOnce();
	});

	it("should return 403 when the resolved tier is in forbiddenTiers", async () => {
		const middleware = tierMiddleware();
		const c = createMockContext({
			headers: { "X-API-Key": VALID_KEY, "X-Tier": "wanderer" },
		});
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(403);
		expect(defaultNext).not.toHaveBeenCalled();
	});

	it("should include TIER_FORBIDDEN code in the 403 body", async () => {
		const middleware = tierMiddleware();
		const c = createMockContext({
			headers: { "X-API-Key": VALID_KEY, "X-Tier": "wanderer" },
		});
		const result = (await middleware(c as never, defaultNext)) as Response;
		const body = await result.json();

		expect(body.success).toBe(false);
		expect(body.error.code).toBe("TIER_FORBIDDEN");
	});

	it("should resolve an unrecognised tier to validTiers[0] — forbidden case", async () => {
		// "unknown-tier" is not in validTiers so resolves to validTiers[0] = "wanderer",
		// which is in forbiddenTiers — the middleware must return 403.
		const middleware = tierMiddleware();
		const c = createMockContext({
			headers: { "X-API-Key": VALID_KEY, "X-Tier": "unknown-tier" },
		});
		const result = await middleware(c as never, defaultNext);

		expect(result).toBeInstanceOf(Response);
		expect((result as Response).status).toBe(403);
	});

	it("should resolve an unrecognised tier to validTiers[0] — allowed case", async () => {
		// When validTiers[0] is not forbidden the request should pass through
		// with the resolved tier variable set to validTiers[0].
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			tierHeader: "X-Tier",
			validTiers: ["seedling", "sapling"],
			forbiddenTiers: [],
			tierVariableName: "tier",
		});

		const c = createMockContext({
			headers: { "X-API-Key": VALID_KEY, "X-Tier": "unknown-tier" },
		});
		await middleware(c as never, defaultNext);

		expect(c._vars["tier"]).toBe("seedling");
		expect(defaultNext).toHaveBeenCalled();
	});

	it("should use a custom tierVariableName when provided", async () => {
		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			tierHeader: "X-Tier",
			validTiers: ["seedling", "sapling"],
			tierVariableName: "userTier",
		});

		const c = createMockContext({
			headers: { "X-API-Key": VALID_KEY, "X-Tier": "sapling" },
		});
		await middleware(c as never, defaultNext);

		expect(c._vars["userTier"]).toBe("sapling");
	});

	it("should call custom tierForbidden error builder when provided", async () => {
		const customResponse = new Response("tier forbidden", { status: 403 });
		const tierForbidden = vi.fn().mockReturnValue(customResponse);

		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			tierHeader: "X-Tier",
			validTiers: ["wanderer", "seedling"],
			forbiddenTiers: ["wanderer"],
			errors: { tierForbidden },
		});

		const c = createMockContext({
			headers: { "X-API-Key": VALID_KEY, "X-Tier": "wanderer" },
		});
		const result = await middleware(c as never, defaultNext);

		expect(tierForbidden).toHaveBeenCalledOnce();
		expect(result).toBe(customResponse);
	});
});

// =============================================================================
// Custom error builder — invalidToken
// =============================================================================

describe("custom invalidToken error builder", () => {
	it("should call custom invalidToken builder with the context on wrong key", async () => {
		const customResponse = new Response("bad token", { status: 401 });
		const invalidToken = vi.fn().mockReturnValue(customResponse);

		const middleware = createAuthMiddleware({
			getSecret: () => VALID_KEY,
			errors: { invalidToken },
		});

		const c = createMockContext({ headers: { "X-API-Key": "wrong" } });
		const result = await middleware(c as never, defaultNext);

		expect(invalidToken).toHaveBeenCalledOnce();
		expect(invalidToken).toHaveBeenCalledWith(c);
		expect(result).toBe(customResponse);
	});
});
