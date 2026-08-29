/**
 * Integration tests for verify routes
 * Tests token introspection, userinfo, and logout endpoints
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv, TEST_USER } from "../test-helpers.js";

// Mock database queries
vi.mock("../db/queries.js", () => ({
	getUserById: vi.fn(),
	revokeAllUserTokens: vi.fn(),
	revokeAllUserSessions: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
	createDbSession: vi.fn().mockReturnValue({}),
}));

// Mock JWT services
vi.mock("../services/jwt.js", () => ({
	verifyAccessToken: vi.fn(),
}));

// Mock user services
vi.mock("../services/user.js", () => ({
	logLogout: vi.fn(),
}));

// Mock security middleware
vi.mock("../middleware/security.js", () => ({
	getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
	getUserAgent: vi.fn().mockReturnValue("test-agent"),
}));

// Mock the Better Auth session invalidation used by /logout's revocation fan-out
vi.mock("../lib/server/session.js", () => ({
	invalidateAllUserSessions: vi.fn().mockResolvedValue(true),
}));

// Keep the real verifyRateLimiter (skips under ENVIRONMENT === "test", which
// mockEnv sets) but mock checkRouteRateLimit, which /logout calls directly
// against createDbSession's mock (an empty object — the real implementation
// would throw calling .prepare() on it).
vi.mock("../middleware/rateLimit.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../middleware/rateLimit.js")>();
	return {
		...actual,
		checkRouteRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
	};
});

import verifyRoutes from "./verify.js";
import { getUserById, revokeAllUserTokens, revokeAllUserSessions } from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import { logLogout } from "../services/user.js";
import { invalidateAllUserSessions } from "../lib/server/session.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";

// Type-safe response interfaces for tests
interface TokenInfo {
	active: boolean;
	sub?: string;
	exp?: number;
	iat?: number;
	client_id?: string;
}

interface UserInfo {
	sub: string;
	email: string;
	name: string | null;
	picture: string | null;
	provider: string;
}

interface ErrorResponse {
	error: string;
	error_description?: string;
}

interface LogoutResponse {
	success: boolean;
	redirect_uri?: string;
}

// Create test app
function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("", verifyRoutes);
	return app;
}

const revokeAllSessions = vi.fn().mockResolvedValue(0);
const mockEnv = createMockEnv({
	SESSIONS: {
		idFromName: vi.fn().mockReturnValue("do-id"),
		get: vi.fn().mockReturnValue({ revokeAllSessions }),
	} as unknown as Env["SESSIONS"],
});

// =============================================================================
// GET /verify - Token Introspection
// =============================================================================

describe("GET /verify", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	async function makeVerifyRequest(token?: string) {
		const app = createApp();
		const headers: Record<string, string> = {};
		if (token) {
			headers["Authorization"] = `Bearer ${token}`;
		}
		return app.request("/", { method: "GET", headers }, mockEnv);
	}

	describe("token extraction", () => {
		it("returns inactive for missing Authorization header", async () => {
			const res = await makeVerifyRequest();
			expect(res.status).toBe(200);
			const json = (await res.json()) as TokenInfo;
			expect(json.active).toBe(false);
		});

		it("returns inactive for malformed Bearer token", async () => {
			const app = createApp();
			const res = await app.request(
				"/",
				{
					method: "GET",
					headers: { Authorization: "Basic some-credentials" },
				},
				mockEnv,
			);
			expect(res.status).toBe(200);
			const json = (await res.json()) as TokenInfo;
			expect(json.active).toBe(false);
		});

		it("returns inactive for invalid token", async () => {
			(verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeVerifyRequest("invalid-token");
			expect(res.status).toBe(200);
			const json = (await res.json()) as TokenInfo;
			expect(json.active).toBe(false);
		});
	});

	describe("valid token", () => {
		const mockPayload = {
			sub: TEST_USER.id,
			exp: Math.floor(Date.now() / 1000) + 3600,
			iat: Math.floor(Date.now() / 1000),
			client_id: "test-app",
			email: TEST_USER.email,
			name: TEST_USER.name,
		};

		beforeEach(() => {
			(verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockPayload);
			(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
		});

		it("returns active=true with token info", async () => {
			const res = await makeVerifyRequest("valid-token");
			expect(res.status).toBe(200);
			const json = (await res.json()) as TokenInfo;
			expect(json.active).toBe(true);
		});

		it("includes sub, exp, iat, client_id", async () => {
			const res = await makeVerifyRequest("valid-token");
			expect(res.status).toBe(200);
			const json = (await res.json()) as TokenInfo;
			expect(json.sub).toBe(TEST_USER.id);
			expect(json.exp).toBe(mockPayload.exp);
			expect(json.iat).toBe(mockPayload.iat);
			expect(json.client_id).toBe("test-app");
		});

		it("does NOT include email or name (privacy)", async () => {
			const res = await makeVerifyRequest("valid-token");
			expect(res.status).toBe(200);
			const json = (await res.json()) as TokenInfo;
			// Per comment in verify.ts: email and name intentionally excluded
			// Clients should use /userinfo endpoint
			expect((json as unknown as Record<string, unknown>).email).toBeUndefined();
			expect((json as unknown as Record<string, unknown>).name).toBeUndefined();
		});
	});

	describe("expired token", () => {
		it("returns active=false", async () => {
			(verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeVerifyRequest("expired-token");
			expect(res.status).toBe(200);
			const json = (await res.json()) as TokenInfo;
			expect(json.active).toBe(false);
		});
	});

	describe("deleted user (MEDIUM-3 regression)", () => {
		it("returns active=false for a signature-valid token whose user no longer exists, agreeing with /userinfo", async () => {
			(verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
				sub: "deleted-user",
				exp: Math.floor(Date.now() / 1000) + 3600,
				iat: Math.floor(Date.now() / 1000),
				client_id: "test-app",
			});
			(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeVerifyRequest("token-for-deleted-user");
			expect(res.status).toBe(200);
			const json = (await res.json()) as TokenInfo;
			expect(json.active).toBe(false);
		});
	});
});

// =============================================================================
// GET /userinfo - Get User Information
// =============================================================================

describe("GET /userinfo", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	async function makeUserInfoRequest(token?: string) {
		const app = createApp();
		const headers: Record<string, string> = {};
		if (token) {
			headers["Authorization"] = `Bearer ${token}`;
		}
		return app.request("/userinfo", { method: "GET", headers }, mockEnv);
	}

	describe("authentication", () => {
		it("returns 401 for missing token", async () => {
			const res = await makeUserInfoRequest();
			expect(res.status).toBe(401);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_token");
		});

		it("returns 401 for invalid token", async () => {
			(verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeUserInfoRequest("invalid-token");
			expect(res.status).toBe(401);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_token");
		});

		it("returns same error as invalid token when user not found (prevents enumeration)", async () => {
			(verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
				sub: "nonexistent-user",
				client_id: "test-app",
			});
			(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeUserInfoRequest("valid-token");
			expect(res.status).toBe(401);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_token");
			// SECURITY: Must NOT reveal that the user was deleted/not found
			expect(json.error_description).toBe("Token is invalid or expired");
		});
	});

	describe("valid request", () => {
		beforeEach(() => {
			(verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue({
				sub: TEST_USER.id,
				client_id: "test-app",
			});
			(getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(TEST_USER);
		});

		it("returns user info (sub, email, name, picture, provider)", async () => {
			const res = await makeUserInfoRequest("valid-token");
			expect(res.status).toBe(200);
			const json = (await res.json()) as UserInfo;
			expect(json.sub).toBe(TEST_USER.id);
			expect(json.email).toBe(TEST_USER.email);
			expect(json.name).toBe(TEST_USER.name);
			expect(json.picture).toBe(TEST_USER.avatar_url || "");
			expect(json.provider).toBe(TEST_USER.provider);
		});
	});
});

// =============================================================================
// POST /logout - Logout and Revoke Tokens
// =============================================================================

describe("POST /logout", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	async function makeLogoutRequest(token?: string, body?: object) {
		const app = createApp();
		const headers: Record<string, string> = {};
		if (token) {
			headers["Authorization"] = `Bearer ${token}`;
		}
		if (body) {
			headers["Content-Type"] = "application/json";
		}
		return app.request(
			"/logout",
			{
				method: "POST",
				headers,
				body: body ? JSON.stringify(body) : undefined,
			},
			mockEnv,
		);
	}

	describe("authentication", () => {
		it("returns 401 for missing token", async () => {
			const res = await makeLogoutRequest();
			expect(res.status).toBe(401);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_token");
		});

		it("returns 401 for invalid token", async () => {
			(verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const res = await makeLogoutRequest("invalid-token");
			expect(res.status).toBe(401);
			const json = (await res.json()) as ErrorResponse;
			expect(json.error).toBe("invalid_token");
		});
	});

	describe("logout flow", () => {
		const mockPayload = {
			sub: TEST_USER.id,
			client_id: "test-app",
		};

		beforeEach(() => {
			(verifyAccessToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockPayload);
			(revokeAllUserTokens as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
			(logLogout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
		});

		it("revokes all user tokens", async () => {
			const res = await makeLogoutRequest("valid-token");
			expect(res.status).toBe(200);
			expect(revokeAllUserTokens).toHaveBeenCalledWith(expect.anything(), TEST_USER.id);
		});

		it("creates audit log event", async () => {
			const res = await makeLogoutRequest("valid-token");
			expect(res.status).toBe(200);
			expect(logLogout).toHaveBeenCalledWith(
				expect.anything(),
				TEST_USER.id,
				expect.objectContaining({
					client_id: "test-app",
				}),
			);
		});

		it("returns success response", async () => {
			const res = await makeLogoutRequest("valid-token");
			expect(res.status).toBe(200);
			const json = (await res.json()) as LogoutResponse;
			expect(json.success).toBe(true);
		});

		it("includes redirect_uri if provided", async () => {
			const res = await makeLogoutRequest("valid-token", {
				redirect_uri: "https://app.example.com/logged-out",
			});
			expect(res.status).toBe(200);
			const json = (await res.json()) as LogoutResponse;
			expect(json.success).toBe(true);
			expect(json.redirect_uri).toBe("https://app.example.com/logged-out");
		});

		it("drops a non-string redirect_uri instead of echoing it untyped", async () => {
			const res = await makeLogoutRequest("valid-token", { redirect_uri: { evil: true } });
			expect(res.status).toBe(200);
			const json = (await res.json()) as LogoutResponse;
			expect(json.redirect_uri).toBeUndefined();
		});

		it("revokes SessionDO, Better Auth, and legacy D1 sessions in addition to refresh tokens (HIGH-1 regression)", async () => {
			const res = await makeLogoutRequest("valid-token");
			expect(res.status).toBe(200);

			expect(revokeAllSessions).toHaveBeenCalled();
			expect(invalidateAllUserSessions).toHaveBeenCalledWith(TEST_USER.id, mockEnv);
			expect(revokeAllUserSessions).toHaveBeenCalledWith(expect.anything(), TEST_USER.id);
		});

		it("clears every auth cookie in the response (HIGH-1 regression)", async () => {
			const res = await makeLogoutRequest("valid-token");
			expect(res.status).toBe(200);

			const setCookies = (res.headers as unknown as { getSetCookie(): string[] }).getSetCookie();
			expect(setCookies.some((c) => c.startsWith("grove_session=;"))).toBe(true);
			expect(setCookies.some((c) => c.startsWith("access_token=;"))).toBe(true);
			expect(setCookies.some((c) => c.startsWith("refresh_token=;"))).toBe(true);
			expect(setCookies.some((c) => c.startsWith("better-auth.session_token=;"))).toBe(true);
		});

		it("is rate limited per user (MEDIUM-1/2 regression)", async () => {
			vi.mocked(checkRouteRateLimit).mockResolvedValueOnce({
				allowed: false,
				remaining: 0,
				retryAfter: 30,
			});

			const res = await makeLogoutRequest("valid-token");
			expect(res.status).toBe(429);
			expect(revokeAllUserTokens).not.toHaveBeenCalled();
		});
	});
});
