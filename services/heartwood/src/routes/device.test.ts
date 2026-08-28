/**
 * Integration tests for device authorization routes (RFC 8628)
 * Tests device code generation, authorization UI, and approve/deny flows
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv, TEST_USER, formBody } from "../test-helpers.js";
import { base64UrlEncode } from "../utils/crypto.js";

// Mock database queries
vi.mock("../db/queries.js", () => ({
	getClientByClientId: vi.fn(),
	createDeviceCode: vi.fn(),
	getDeviceCodeByUserCode: vi.fn(),
	authorizeDeviceCode: vi.fn(),
	denyDeviceCode: vi.fn(),
	isUserCodeUnique: vi.fn(),
	createAuditLog: vi.fn(),
	getUserById: vi.fn(),
	cleanupExpiredDeviceCodes: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
	createDbSession: vi.fn().mockReturnValue({}),
}));

// Mock rate limiting to allow all requests by default
vi.mock("../middleware/rateLimit.js", () => ({
	checkRouteRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

// Mock security middleware
vi.mock("../middleware/security.js", () => ({
	getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
	getUserAgent: vi.fn().mockReturnValue("test-agent"),
}));

// lib/session.js is NOT mocked — device.ts uses its real, pure
// parseCookieHeader() to read the device-code carrier cookie, and there's
// nothing worth stubbing out.

import deviceRoutes from "./device.js";
import {
	getClientByClientId,
	createDeviceCode,
	getDeviceCodeByUserCode,
	authorizeDeviceCode,
	denyDeviceCode,
	isUserCodeUnique,
	createAuditLog,
	getUserById,
} from "../db/queries.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";

// Type-safe response interfaces for tests
interface DeviceCodeResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	verification_uri_complete: string;
	expires_in: number;
	interval: number;
}

interface ErrorResponse {
	error: string;
	error_description?: string;
	retry_after?: number;
}

interface SuccessResponse {
	success: boolean;
	message?: string;
}

// Create test app
function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/auth", deviceRoutes);
	return app;
}

const mockEnv = createMockEnv();

// Mirrors device.ts's signConsentToken exactly, so tests can construct a
// valid token for the user + user_code they're about to submit.
async function signConsentToken(userId: string, userCode: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(mockEnv.SESSION_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(`${userId}:${userCode}`),
	);
	return base64UrlEncode(signature);
}

// Mock execution context for Cloudflare Workers waitUntil
const mockExecutionCtx = {
	waitUntil: vi.fn(),
	passThroughOnException: vi.fn(),
	props: {},
} as unknown as ExecutionContext;

// =============================================================================
// POST /auth/device-code - Device Authorization Request
// =============================================================================

describe("POST /auth/device-code", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default happy path mocks
		(getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: "client-1",
			client_id: "grove-cli",
			name: "Grove CLI",
		});
		(isUserCodeUnique as ReturnType<typeof vi.fn>).mockResolvedValue(true);
		(createDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
		(createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			remaining: 10,
		});
	});

	async function makeDeviceCodeRequest(body: Record<string, string>) {
		const app = createApp();
		return app.request(
			"/auth/device-code",
			{
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: formBody(body),
			},
			mockEnv,
			mockExecutionCtx,
		);
	}

	async function makeDeviceCodeJsonRequest(body: object) {
		const app = createApp();
		return app.request(
			"/auth/device-code",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			},
			mockEnv,
			mockExecutionCtx,
		);
	}

	describe("validation", () => {
		it("returns 400 for missing client_id", async () => {
			const res = await makeDeviceCodeRequest({});
			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_request");
		});

		it("returns 400 for invalid request body", async () => {
			const app = createApp();
			const res = await app.request(
				"/auth/device-code",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: "not valid json",
				},
				mockEnv,
			);
			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_request");
		});

		it("returns 401 for unknown client", async () => {
			(getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeDeviceCodeRequest({ client_id: "unknown-client" });
			expect(res.status).toBe(401);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_client");
		});

		it("does not consume rate-limit quota for a malformed body", async () => {
			// Body parsing/schema validation happens before rate limiting, so
			// a request that fails validation shouldn't cost the IP anything.
			await makeDeviceCodeRequest({});
			expect(checkRouteRateLimit).not.toHaveBeenCalled();
		});
	});

	describe("rate limiting", () => {
		it("returns 429 when rate limited", async () => {
			(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 30,
			});

			const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(res.status).toBe(429);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("slow_down");
			expect(json.retry_after).toBe(30);
		});

		it("keys the rate limit on IP + client_id", async () => {
			await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(checkRouteRateLimit).toHaveBeenCalledWith(
				expect.anything(),
				"device_init",
				"127.0.0.1:grove-cli",
				expect.any(Number),
			);
		});
	});

	describe("code generation", () => {
		it("returns device_code and user_code", async () => {
			const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(res.status).toBe(200);
			const json = (await res.json()) as DeviceCodeResponse;
			expect(json.device_code).toBeDefined();
			expect(json.user_code).toBeDefined();
			// User code should be in XXXX-XXXX format
			expect(json.user_code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
		});

		it("returns verification URIs", async () => {
			const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(res.status).toBe(200);
			const json = (await res.json()) as DeviceCodeResponse;
			expect(json.verification_uri).toBe(`${mockEnv.AUTH_BASE_URL}/auth/device`);
			expect(json.verification_uri_complete).toContain(
				`${mockEnv.AUTH_BASE_URL}/auth/device?user_code=`,
			);
		});

		it("returns expires_in and interval", async () => {
			const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(res.status).toBe(200);
			const json = (await res.json()) as DeviceCodeResponse;
			expect(json.expires_in).toBeGreaterThan(0);
			expect(json.interval).toBeGreaterThan(0);
		});

		it("generates unique user codes (retry on collision)", async () => {
			// First call returns false (collision), second returns true
			(isUserCodeUnique as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(true);

			const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(res.status).toBe(200);
			expect(isUserCodeUnique).toHaveBeenCalledTimes(2);
		});

		it("succeeds when uniqueness is only achieved on the final attempt", async () => {
			// Regression test: the generation loop used to infer failure from
			// the attempt counter reaching maxAttempts, which incorrectly
			// rejected a code that became unique on the very last try.
			(isUserCodeUnique as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(false)
				.mockResolvedValueOnce(true);

			const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(res.status).toBe(200);
			expect(isUserCodeUnique).toHaveBeenCalledTimes(5);
		});

		it("returns 500 after max retry attempts", async () => {
			// Always return false (permanent collision)
			(isUserCodeUnique as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(res.status).toBe(500);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("server_error");
		});

		it("returns a clean 500 if createDeviceCode throws (e.g. a UNIQUE constraint race)", async () => {
			(createDeviceCode as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error("UNIQUE constraint failed: device_codes.user_code"),
			);

			const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(res.status).toBe(500);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("server_error");
		});

		it("accepts JSON request body", async () => {
			const res = await makeDeviceCodeJsonRequest({
				client_id: "grove-cli",
				scope: "openid email",
			});
			expect(res.status).toBe(200);
			const json = (await res.json()) as DeviceCodeResponse;
			expect(json.device_code).toBeDefined();
		});
	});

	describe("audit logging", () => {
		it("creates device_code_created audit event without the plaintext user_code", async () => {
			const res = await makeDeviceCodeRequest({ client_id: "grove-cli" });
			expect(res.status).toBe(200);

			expect(createAuditLog).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					event_type: "device_code_created",
					client_id: "grove-cli",
				}),
			);
			// The user_code is a live credential for the code's lifetime —
			// it must never land in the audit log's details.
			const call = (createAuditLog as ReturnType<typeof vi.fn>).mock.calls[0][1];
			expect(JSON.stringify(call)).not.toContain("user_code");
		});
	});
});

// =============================================================================
// GET /auth/device - Device Authorization Page
// =============================================================================

describe("GET /auth/device", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Reset all mocks to default state
		(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		(getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			remaining: 10,
		});

		// Mock global fetch for Better Auth session check
		global.fetch = vi.fn().mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({}),
		});
	});

	async function makeDevicePageRequest(query: string = "", cookie?: string) {
		const app = createApp();
		return app.request(
			`/auth/device${query}`,
			{ method: "GET", headers: cookie ? { Cookie: cookie } : {} },
			mockEnv,
			mockExecutionCtx,
		);
	}

	describe("rate limiting", () => {
		it("returns 429 when rate limited", async () => {
			(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 15,
			});

			const res = await makeDevicePageRequest();
			expect(res.status).toBe(429);
		});
	});

	describe("unauthenticated user", () => {
		it("redirects to /login with returnTo", async () => {
			const res = await makeDevicePageRequest("?user_code=ABCD-1234");
			expect(res.status).toBe(302);

			const location = res.headers.get("Location");
			expect(location).toContain("/login");
			expect(location).toContain("returnTo=");
		});

		it("carries user_code via an HttpOnly cookie, not the returnTo URL", async () => {
			// The code is a live credential for its ~15-minute lifetime —
			// it shouldn't sit in the URL (CF logs, browser history) for the
			// length of the login round-trip.
			const res = await makeDevicePageRequest("?user_code=WXYZ-5678");
			expect(res.status).toBe(302);

			const location = res.headers.get("Location");
			expect(location).not.toContain("WXYZ-5678");

			const setCookie = res.headers.get("Set-Cookie");
			expect(setCookie).toContain("device_code_pending=WXYZ-5678");
			expect(setCookie).toContain("HttpOnly");
			expect(setCookie).toContain("SameSite=Lax");
		});
	});

	describe("authenticated via Better Auth", () => {
		beforeEach(() => {
			// Mock Better Auth session
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ user: { id: TEST_USER.id } }),
			});
			(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
		});

		it("shows authorization page", async () => {
			const res = await makeDevicePageRequest();
			expect(res.status).toBe(200);
			const html = await res.text();
			// Page title is "Authorize Device - Heartwood"
			expect(html).toContain("Heartwood");
			expect(html).toContain("Authorize Device");
		});

		it("displays user code, client name, and requested scope when valid code provided", async () => {
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				user_code: "ABCD-1234",
				status: "pending",
				scope: "openid email",
				expires_at: Math.floor(Date.now() / 1000) + 900,
			});
			(getClientByClientId as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "client-1",
				client_id: "grove-cli",
				name: "Grove CLI",
			});

			const res = await makeDevicePageRequest("?user_code=ABCD-1234");
			expect(res.status).toBe(200);
			const html = await res.text();
			expect(html).toContain("ABCD-1234");
			expect(html).toContain("Grove CLI");
			// Consent screen must not be a blank cheque — requested scopes render.
			expect(html).toContain("View your email address");
			// A consent token is embedded for the approve/deny form to submit back.
			expect(html).toContain('name="consent_token"');
		});

		it("reads user_code from the pending-code cookie when no query param is present", async () => {
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				user_code: "COOK-1E23",
				status: "pending",
				scope: null,
				expires_at: Math.floor(Date.now() / 1000) + 900,
			});

			const res = await makeDevicePageRequest("", "device_code_pending=COOK-1E23");
			expect(res.status).toBe(200);
			expect(getDeviceCodeByUserCode).toHaveBeenCalledWith(expect.anything(), "COOK-1E23");
			// The carrier cookie is cleared once it's been read and rendered.
			const setCookie = res.headers.get("Set-Cookie");
			expect(setCookie).toContain("device_code_pending=;");
			expect(setCookie).toContain("Max-Age=0");
		});
	});

	describe("device code validation", () => {
		beforeEach(() => {
			// User is authenticated
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ user: { id: TEST_USER.id } }),
			});
			(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
		});

		it("shows error for invalid user code", async () => {
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeDevicePageRequest("?user_code=INVALID");
			expect(res.status).toBe(200);
			const html = await res.text();
			expect(html).toContain("Invalid or expired");
		});

		it("shows error for expired code", async () => {
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				user_code: "ABCD-1234",
				status: "pending",
				expires_at: Math.floor(Date.now() / 1000) - 100, // Expired
			});

			const res = await makeDevicePageRequest("?user_code=ABCD-1234");
			expect(res.status).toBe(200);
			const html = await res.text();
			expect(html).toContain("expired");
		});

		it("shows error for already used code", async () => {
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				user_code: "ABCD-1234",
				status: "authorized", // Already used
				expires_at: Math.floor(Date.now() / 1000) + 900,
			});

			const res = await makeDevicePageRequest("?user_code=ABCD-1234");
			expect(res.status).toBe(200);
			const html = await res.text();
			expect(html).toContain("already been");
		});
	});

	describe("success states", () => {
		beforeEach(() => {
			// User must be authenticated to see success states
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ user: { id: TEST_USER.id } }),
			});
			(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
		});

		it("shows approved message when success=approved", async () => {
			const res = await makeDevicePageRequest("?success=approved");
			expect(res.status).toBe(200);
			const html = await res.text();
			// Template shows "Device Authorized" in the success box
			expect(html).toContain("Device Authorized");
		});

		it("shows denied message when success=denied", async () => {
			const res = await makeDevicePageRequest("?success=denied");
			expect(res.status).toBe(200);
			const html = await res.text();
			// Template shows "Authorization Denied" in the success box
			expect(html).toContain("Authorization Denied");
		});

		it("ignores an unrecognized success value instead of trusting the raw query param", async () => {
			const res = await makeDevicePageRequest("?success=<script>alert(1)</script>");
			expect(res.status).toBe(200);
			const html = await res.text();
			expect(html).not.toContain("<script>alert(1)</script>");
		});
	});
});

// =============================================================================
// POST /auth/device/authorize - Authorize or Deny Device Code
// =============================================================================

describe("POST /auth/device/authorize", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default: no authentication
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: false,
			json: () => Promise.resolve({}),
		});
		(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			remaining: 10,
		});
	});

	async function makeAuthorizeRequest(
		body: Record<string, string>,
		asJson = false,
		headers: Record<string, string> = {},
	) {
		const app = createApp();
		if (asJson) {
			return app.request(
				"/auth/device/authorize",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Origin: mockEnv.AUTH_BASE_URL,
						...headers,
					},
					body: JSON.stringify(body),
				},
				mockEnv,
				mockExecutionCtx,
			);
		}
		return app.request(
			"/auth/device/authorize",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Origin: mockEnv.AUTH_BASE_URL,
					...headers,
				},
				body: formBody(body),
			},
			mockEnv,
			mockExecutionCtx,
		);
	}

	function setupAuthenticatedUser() {
		(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ user: { id: TEST_USER.id } }),
		});
		(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
	}

	describe("CSRF protection", () => {
		beforeEach(() => {
			setupAuthenticatedUser();
		});

		it("rejects a mismatched Origin", async () => {
			const res = await makeAuthorizeRequest(
				{ user_code: "ABCD-1234", action: "approve", consent_token: "x" },
				true,
				{ Origin: "https://evil.example.com" },
			);
			expect(res.status).toBe(403);
		});

		it("accepts a valid Referer when Origin is absent", async () => {
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				user_code: "ABCD-1234",
				status: "pending",
				expires_at: Math.floor(Date.now() / 1000) + 900,
			});
			(authorizeDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				status: "authorized",
			});

			const app = createApp();
			const res = await app.request(
				"/auth/device/authorize",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Referer: `${mockEnv.AUTH_BASE_URL}/auth/device?user_code=ABCD-1234`,
					},
					body: JSON.stringify({
						user_code: "ABCD-1234",
						action: "approve",
						consent_token: await signConsentToken(TEST_USER.id, "ABCD-1234"),
					}),
				},
				mockEnv,
				mockExecutionCtx,
			);
			expect(res.status).toBe(200);
		});

		it("rejects a mismatched Referer when Origin is absent", async () => {
			const app = createApp();
			const res = await app.request(
				"/auth/device/authorize",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Referer: "https://evil.example.com/",
					},
					body: JSON.stringify({ user_code: "ABCD-1234", action: "approve" }),
				},
				mockEnv,
				mockExecutionCtx,
			);
			expect(res.status).toBe(403);
		});

		it("rejects a malformed Referer instead of throwing", async () => {
			const app = createApp();
			const res = await app.request(
				"/auth/device/authorize",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Referer: "not-a-url",
					},
					body: JSON.stringify({ user_code: "ABCD-1234", action: "approve" }),
				},
				mockEnv,
				mockExecutionCtx,
			);
			expect(res.status).toBe(403);
		});

		it("denies by default when both Origin and Referer are missing", async () => {
			const app = createApp();
			const res = await app.request(
				"/auth/device/authorize",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ user_code: "ABCD-1234", action: "approve" }),
				},
				mockEnv,
				mockExecutionCtx,
			);
			expect(res.status).toBe(403);
		});
	});

	describe("rate limiting", () => {
		it("returns 429 when rate limited, before checking authentication", async () => {
			(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowed: false,
				remaining: 0,
				retryAfter: 9,
			});

			const res = await makeAuthorizeRequest(
				{ user_code: "ABCD-1234", action: "approve", consent_token: "x" },
				true,
			);
			expect(res.status).toBe(429);
			expect(getUserById).not.toHaveBeenCalled();
		});
	});

	describe("authentication", () => {
		it("returns 401 when not authenticated", async () => {
			const res = await makeAuthorizeRequest(
				{ user_code: "ABCD-1234", action: "approve", consent_token: "x" },
				true,
			);
			expect(res.status).toBe(401);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("unauthorized");
		});
	});

	describe("consent token", () => {
		beforeEach(() => {
			setupAuthenticatedUser();
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				user_code: "ABCD-1234",
				status: "pending",
				expires_at: Math.floor(Date.now() / 1000) + 900,
			});
		});

		it("rejects a missing consent_token", async () => {
			const res = await makeAuthorizeRequest({ user_code: "ABCD-1234", action: "approve" }, true);
			expect(res.status).toBe(400);
		});

		it("rejects a forged consent_token", async () => {
			const res = await makeAuthorizeRequest(
				{ user_code: "ABCD-1234", action: "approve", consent_token: "forged" },
				true,
			);
			expect(res.status).toBe(403);
			expect(authorizeDeviceCode).not.toHaveBeenCalled();
		});

		it("rejects a consent_token signed for a different user_code", async () => {
			const wrongToken = await signConsentToken(TEST_USER.id, "WXYZ-9999");
			const res = await makeAuthorizeRequest(
				{ user_code: "ABCD-1234", action: "approve", consent_token: wrongToken },
				true,
			);
			expect(res.status).toBe(403);
			expect(authorizeDeviceCode).not.toHaveBeenCalled();
		});
	});

	describe("validation", () => {
		beforeEach(() => {
			setupAuthenticatedUser();
		});

		it("returns 400 for missing user_code", async () => {
			const res = await makeAuthorizeRequest({ action: "approve", consent_token: "x" }, true);
			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_request");
		});

		it("returns 400 for invalid action", async () => {
			const res = await makeAuthorizeRequest(
				{ user_code: "ABCD-1234", action: "invalid", consent_token: "x" },
				true,
			);
			expect(res.status).toBe(400);
		});

		it("returns a generic invalid_grant for an invalid/expired/already-resolved code alike (no enumeration oracle)", async () => {
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeAuthorizeRequest(
				{
					user_code: "INVALID",
					action: "approve",
					consent_token: await signConsentToken(TEST_USER.id, "INVALID"),
				},
				true,
			);
			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_grant");
			expect(json.error_description).toBe("Invalid or expired code");
		});

		it("returns the same generic message for an already-authorized code", async () => {
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				user_code: "ABCD-1234",
				status: "authorized",
				expires_at: Math.floor(Date.now() / 1000) + 900,
			});

			const res = await makeAuthorizeRequest(
				{
					user_code: "ABCD-1234",
					action: "approve",
					consent_token: await signConsentToken(TEST_USER.id, "ABCD-1234"),
				},
				true,
			);
			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error_description).toBe("Invalid or expired code");
		});
	});

	describe("approve action", () => {
		beforeEach(() => {
			setupAuthenticatedUser();
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				user_code: "ABCD-1234",
				status: "pending",
				expires_at: Math.floor(Date.now() / 1000) + 900,
			});
			(authorizeDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				status: "authorized",
			});
			(createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
		});

		async function approveBody() {
			return {
				user_code: "ABCD-1234",
				action: "approve",
				consent_token: await signConsentToken(TEST_USER.id, "ABCD-1234"),
			};
		}

		it("authorizes device code", async () => {
			const res = await makeAuthorizeRequest(await approveBody(), true);
			expect(res.status).toBe(200);
			expect(authorizeDeviceCode).toHaveBeenCalledWith(expect.anything(), "dc-1", TEST_USER.id);
		});

		it("creates audit log event without the plaintext user_code", async () => {
			const res = await makeAuthorizeRequest(await approveBody(), true);
			expect(res.status).toBe(200);
			expect(createAuditLog).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					event_type: "device_code_authorized",
					user_id: TEST_USER.id,
				}),
			);
			const call = (createAuditLog as ReturnType<typeof vi.fn>).mock.calls[0][1];
			expect(JSON.stringify(call)).not.toContain("ABCD-1234");
		});

		it("redirects to success page (form submission)", async () => {
			const res = await makeAuthorizeRequest(await approveBody());
			expect(res.status).toBe(302);
			const location = res.headers.get("Location");
			expect(location).toContain("success=approved");
		});

		it("returns JSON success (API call)", async () => {
			const res = await makeAuthorizeRequest(await approveBody(), true);
			expect(res.status).toBe(200);
			const json = (await res.json()) as SuccessResponse;
			expect(json.success).toBe(true);
		});

		it("returns invalid_grant if a concurrent request already resolved the code (lost the atomic-consume race)", async () => {
			// authorizeDeviceCode's WHERE status = 'pending' guard returns
			// null when another request (approve or deny) already
			// transitioned this code first.
			(authorizeDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeAuthorizeRequest(await approveBody(), true);
			expect(res.status).toBe(400);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_grant");
			expect(createAuditLog).not.toHaveBeenCalled();
		});
	});

	describe("deny action", () => {
		beforeEach(() => {
			setupAuthenticatedUser();
			(getDeviceCodeByUserCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				user_code: "ABCD-1234",
				status: "pending",
				expires_at: Math.floor(Date.now() / 1000) + 900,
			});
			(denyDeviceCode as ReturnType<typeof vi.fn>).mockResolvedValue({
				id: "dc-1",
				client_id: "grove-cli",
				status: "denied",
			});
			(createAuditLog as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
		});

		async function denyBody() {
			return {
				user_code: "ABCD-1234",
				action: "deny",
				consent_token: await signConsentToken(TEST_USER.id, "ABCD-1234"),
			};
		}

		it("denies device code", async () => {
			const res = await makeAuthorizeRequest(await denyBody(), true);
			expect(res.status).toBe(200);
			expect(denyDeviceCode).toHaveBeenCalledWith(expect.anything(), "dc-1");
		});

		it("creates audit log event", async () => {
			const res = await makeAuthorizeRequest(await denyBody(), true);
			expect(res.status).toBe(200);
			expect(createAuditLog).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					event_type: "device_code_denied",
					user_id: TEST_USER.id,
				}),
			);
		});

		it("redirects to denied page (form submission)", async () => {
			const res = await makeAuthorizeRequest(await denyBody());
			expect(res.status).toBe(302);
			const location = res.headers.get("Location");
			expect(location).toContain("success=denied");
		});

		it("returns JSON success (API call)", async () => {
			const res = await makeAuthorizeRequest(await denyBody(), true);
			expect(res.status).toBe(200);
			const json = (await res.json()) as SuccessResponse;
			expect(json.success).toBe(true);
		});
	});
});
