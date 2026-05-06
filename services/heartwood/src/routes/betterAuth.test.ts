/**
 * Integration tests for Better Auth routes
 * Tests request routing, passkey security, and audit logging
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Mock the auth module
vi.mock("../auth/index.js", () => ({
	createAuth: vi.fn(() => ({
		handler: vi.fn(),
	})),
}));

// Mock database queries
vi.mock("../db/queries.js", () => ({
	createAuditLog: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
	createDbSession: vi.fn().mockReturnValue({}),
}));

// Mock security middleware
vi.mock("../middleware/security.js", () => ({
	getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
	getUserAgent: vi.fn().mockReturnValue("test-agent"),
}));

// Mock rate limiters - middleware that calls next()
vi.mock("../middleware/rateLimit.js", () => ({}));

import betterAuthRoutes from "./betterAuth.js";
import { createAuth } from "../auth/index.js";

// Type-safe response interfaces for tests
interface ErrorResponse {
	error: string;
	message?: string;
	debug?: string;
}

// Create test app
function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/api/auth", betterAuthRoutes);
	return app;
}

const mockEnv = createMockEnv();

// Helper to create mock Better Auth handler
function mockAuthHandler(response: Response) {
	return vi.fn().mockResolvedValue(response);
}

// =============================================================================
// Request Routing
// =============================================================================

describe("Better Auth Handler - request routing", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("routes GET requests to Better Auth", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ session: null })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();
		const res = await app.request("/api/auth/session", { method: "GET" }, mockEnv);

		expect(mockHandler).toHaveBeenCalled();
		expect(res.status).toBe(200);
	});

	it("routes POST requests to Better Auth", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ success: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();
		const res = await app.request(
			"/api/auth/sign-out",
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
			},
			mockEnv,
		);

		expect(mockHandler).toHaveBeenCalled();
		expect(res.status).toBe(200);
	});

	it("handles all /api/auth/* paths", async () => {
		const mockHandler = mockAuthHandler(new Response(JSON.stringify({ ok: true })));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();

		// Test various paths
		const paths = ["/api/auth/session", "/api/auth/sign-in/social", "/api/auth/callback/google"];

		for (const path of paths) {
			mockHandler.mockClear();
			await app.request(path, { method: "GET" }, mockEnv);
			expect(mockHandler).toHaveBeenCalled();
		}
	});
});

// =============================================================================
// Error Handling
// =============================================================================

describe("Better Auth Handler - error handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns 500 on handler error", async () => {
		const mockHandler = vi.fn().mockRejectedValue(new Error("Database connection failed"));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();
		const res = await app.request("/api/auth/session", { method: "GET" }, mockEnv);

		expect(res.status).toBe(500);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("server_error");
	});

	it("logs errors to console", async () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const mockHandler = vi.fn().mockRejectedValue(new Error("Test error"));
		(createAuth as ReturnType<typeof vi.fn>).mockReturnValue({
			handler: mockHandler,
		});

		const app = createApp();
		await app.request("/api/auth/session", { method: "GET" }, mockEnv);

		expect(consoleSpy).toHaveBeenCalled();
		consoleSpy.mockRestore();
	});
});
