/**
 * Integration tests for subscription routes
 * Tests GET /subscription, /subscription/:userId, POST /post-count, PUT /tier
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, UserSubscription, SubscriptionStatus } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Type-safe response interfaces for tests
interface ErrorResponse {
	error: string;
	error_description?: string;
	retry_after?: number;
}

interface SubscriptionResponse {
	subscription: UserSubscription;
	status: SubscriptionStatus;
}

interface CanPostResponse {
	can_create_post: boolean;
	posts_remaining: number | null;
}

// Mock database queries
vi.mock("../db/queries.js", () => ({
	getUserSubscription: vi.fn(),
	getOrCreateUserSubscription: vi.fn(),
	canUserCreatePost: vi.fn(),
	incrementPostCount: vi.fn(),
	decrementPostCount: vi.fn(),
	setPostCount: vi.fn(),
	updateSubscriptionTier: vi.fn(),
	getSubscriptionStatus: vi.fn(),
	checkRateLimit: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
	createDbSession: vi.fn().mockReturnValue({}),
}));

// Mock rate limiting to allow all requests by default
vi.mock("../middleware/rateLimit.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../middleware/rateLimit.js")>();
	return {
		...actual,
		checkRouteRateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
	};
});

// Mock bearer auth (used by the GET/read routes only)
vi.mock("../middleware/bearerAuth.js", () => ({
	verifyBearerAuth: vi.fn(),
	extractBearerToken: vi.fn(),
}));

import subscriptionRoutes from "./subscription.js";
import {
	getUserSubscription,
	getOrCreateUserSubscription,
	canUserCreatePost,
	incrementPostCount,
	decrementPostCount,
	setPostCount,
	updateSubscriptionTier,
	getSubscriptionStatus,
} from "../db/queries.js";
import { verifyBearerAuth } from "../middleware/bearerAuth.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";

// Test data
const TEST_USER_ID = "user-123";
const SERVICE_SECRET = "test-service-secret-value";

const mockSubscription: UserSubscription = {
	id: "sub-1",
	user_id: TEST_USER_ID,
	tier: "sapling",
	post_limit: null, // TIER_POST_LIMITS.sapling is null (unlimited) — fixture must match
	post_count: 150,
	grace_period_start: null,
	grace_period_days: 14,
	stripe_customer_id: null,
	stripe_subscription_id: null,
	billing_period_start: null,
	billing_period_end: null,
	custom_domain: null,
	custom_domain_verified: 0,
	created_at: "2025-01-01T00:00:00Z",
	updated_at: "2025-01-01T00:00:00Z",
};

const mockStatus: SubscriptionStatus = {
	tier: "sapling",
	post_count: 150,
	post_limit: null,
	posts_remaining: null,
	percentage_used: null,
	is_at_limit: false,
	is_in_grace_period: false,
	grace_period_days_remaining: null,
	can_create_post: true,
	upgrade_required: false,
};

// Create test app
function createApp() {
	const app = new Hono<{ Bindings: Env }>();
	app.route("/subscription", subscriptionRoutes);
	return app;
}

let mockEnv: Env;

beforeEach(() => {
	vi.clearAllMocks();
	mockEnv = createMockEnv();
});

function serviceHeaders(extra: Record<string, string> = {}) {
	return {
		"Content-Type": "application/json",
		Authorization: `Bearer ${SERVICE_SECRET}`,
		...extra,
	};
}

// =============================================================================
// GET /subscription - Get current user's subscription
// =============================================================================

describe("GET /subscription", () => {
	beforeEach(() => {
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			remaining: 10,
		});
		(verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
			sub: TEST_USER_ID,
		});
		(getOrCreateUserSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubscription);
		(getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(mockStatus);
	});

	it("returns 401 when no Bearer token", async () => {
		(verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request("/subscription", { method: "GET" }, mockEnv);

		expect(res.status).toBe(401);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("unauthorized");
		expect(json.error_description).toContain("Missing or invalid token");
	});

	it("checks authentication before rate limiting", async () => {
		(verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const app = createApp();
		await app.request("/subscription", { method: "GET" }, mockEnv);

		expect(checkRouteRateLimit).not.toHaveBeenCalled();
	});

	it("returns 429 when rate limited", async () => {
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: false,
			remaining: 0,
			retryAfter: 30,
		});

		const app = createApp();
		const res = await app.request("/subscription", { method: "GET" }, mockEnv);

		expect(res.status).toBe(429);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("rate_limit");
		expect(json.retry_after).toBe(30);
	});

	it("keys the rate limit on the authenticated user's ID, not IP", async () => {
		const app = createApp();
		await app.request("/subscription", { method: "GET" }, mockEnv);

		expect(checkRouteRateLimit).toHaveBeenCalledWith(
			expect.anything(),
			"subscription_read",
			TEST_USER_ID,
			expect.any(Number),
			expect.any(Number),
		);
	});

	it("returns current user's subscription and status", async () => {
		const app = createApp();
		const res = await app.request("/subscription", { method: "GET" }, mockEnv);

		expect(res.status).toBe(200);
		const json = (await res.json()) as SubscriptionResponse;
		expect(json.subscription).toEqual(mockSubscription);
		expect(json.status).toEqual(mockStatus);
		expect(getOrCreateUserSubscription as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.anything(),
			TEST_USER_ID,
		);
	});
});

// =============================================================================
// GET /subscription/:userId - Get specific user's subscription
// =============================================================================

describe("GET /subscription/:userId", () => {
	beforeEach(() => {
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			remaining: 10,
		});
		(verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
			sub: TEST_USER_ID,
		});
		(getUserSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubscription);
		(getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(mockStatus);
	});

	it("returns 401 when no Bearer token", async () => {
		(verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(`/subscription/${TEST_USER_ID}`, { method: "GET" }, mockEnv);

		expect(res.status).toBe(401);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("unauthorized");
	});

	it("returns 403 when accessing another user's data", async () => {
		const otherUserId = "other-user-456";
		(verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
			sub: TEST_USER_ID,
		});

		const app = createApp();
		const res = await app.request(`/subscription/${otherUserId}`, { method: "GET" }, mockEnv);

		expect(res.status).toBe(403);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("forbidden");
		expect(json.error_description).toContain("Cannot access other user data");
	});

	it("returns 404 when subscription not found", async () => {
		(getUserSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(`/subscription/${TEST_USER_ID}`, { method: "GET" }, mockEnv);

		expect(res.status).toBe(404);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("not_found");
		expect(json.error_description).toContain("Subscription not found");
	});

	it("returns user's subscription and status", async () => {
		const app = createApp();
		const res = await app.request(`/subscription/${TEST_USER_ID}`, { method: "GET" }, mockEnv);

		expect(res.status).toBe(200);
		const json = (await res.json()) as SubscriptionResponse;
		expect(json.subscription).toEqual(mockSubscription);
		expect(json.status).toEqual(mockStatus);
		expect(getUserSubscription as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.anything(),
			TEST_USER_ID,
		);
	});
});

// =============================================================================
// GET /subscription/:userId/can-post - Check if user can create post
// =============================================================================

describe("GET /subscription/:userId/can-post", () => {
	beforeEach(() => {
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			remaining: 10,
		});
		(verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
			sub: TEST_USER_ID,
		});
		(canUserCreatePost as ReturnType<typeof vi.fn>).mockResolvedValue({
			can_create_post: true,
			posts_remaining: 1850,
		});
	});

	it("returns 401 when no Bearer token", async () => {
		(verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/can-post`,
			{ method: "GET" },
			mockEnv,
		);

		expect(res.status).toBe(401);
	});

	it("returns 403 when accessing another user's data", async () => {
		const otherUserId = "other-user-456";

		const app = createApp();
		const res = await app.request(
			`/subscription/${otherUserId}/can-post`,
			{ method: "GET" },
			mockEnv,
		);

		expect(res.status).toBe(403);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("forbidden");
	});

	it("returns can_create_post status", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/can-post`,
			{ method: "GET" },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as CanPostResponse;
		expect(json.can_create_post).toBe(true);
		expect(json.posts_remaining).toBe(1850);
		expect(canUserCreatePost as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.anything(),
			TEST_USER_ID,
		);
	});

	it("returns false when at post limit", async () => {
		(canUserCreatePost as ReturnType<typeof vi.fn>).mockResolvedValue({
			can_create_post: false,
			posts_remaining: 0,
		});

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/can-post`,
			{ method: "GET" },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as CanPostResponse;
		expect(json.can_create_post).toBe(false);
		expect(json.posts_remaining).toBe(0);
	});
});

// =============================================================================
// POST /subscription/:userId/post-count - Update post count
// Internal-service-only: gated on SERVICE_SECRET, not a user's own token.
// =============================================================================

describe("POST /subscription/:userId/post-count", () => {
	const updatedSub = { ...mockSubscription, post_count: 151 };

	beforeEach(() => {
		mockEnv.SERVICE_SECRET = SERVICE_SECRET;
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			remaining: 10,
		});
		(getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(mockStatus);
	});

	it("rejects a request with no Authorization header at all", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "increment" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(401);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("unauthorized");
	});

	it("rejects a valid user Bearer token — this endpoint is not user-reachable", async () => {
		// This is the direct regression test for the critical finding: a
		// user's own access token must never be sufficient to mutate their
		// own post count, since post_count is the paywall enforcement
		// variable. Only SERVICE_SECRET grants access here.
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer some-users-own-valid-access-token",
				},
				body: JSON.stringify({ count: 0 }),
			},
			mockEnv,
		);

		expect(res.status).toBe(401);
		expect(setPostCount).not.toHaveBeenCalled();
	});

	it("fails closed when SERVICE_SECRET is unset, even with a correctly-shaped Bearer header", async () => {
		mockEnv.SERVICE_SECRET = undefined;

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: "Bearer " },
				body: JSON.stringify({ action: "increment" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(401);
	});

	it("returns 429 when rate limited", async () => {
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: false,
			remaining: 0,
			retryAfter: 30,
		});

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: serviceHeaders(),
				body: JSON.stringify({ action: "increment" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(429);
	});

	it("keys the rate limit on the target userId", async () => {
		const app = createApp();
		await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: serviceHeaders(),
				body: JSON.stringify({ action: "increment" }),
			},
			mockEnv,
		);

		expect(checkRouteRateLimit).toHaveBeenCalledWith(
			expect.anything(),
			"subscription_write",
			TEST_USER_ID,
			expect.any(Number),
			expect.any(Number),
		);
	});

	it("returns 400 for invalid JSON body", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{ method: "POST", headers: serviceHeaders(), body: "not valid json" },
			mockEnv,
		);

		expect(res.status).toBe(400);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("invalid_request");
		expect(json.error_description).toContain("Invalid JSON body");
	});

	it("returns 400 for invalid action", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: serviceHeaders(),
				body: JSON.stringify({ action: "invalid_action" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(400);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("invalid_request");
	});

	it("rejects a non-integer count", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{ method: "POST", headers: serviceHeaders(), body: JSON.stringify({ count: 1.5 }) },
			mockEnv,
		);

		expect(res.status).toBe(400);
		expect(setPostCount).not.toHaveBeenCalled();
	});

	it("rejects a negative count", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{ method: "POST", headers: serviceHeaders(), body: JSON.stringify({ count: -5 }) },
			mockEnv,
		);

		expect(res.status).toBe(400);
		expect(setPostCount).not.toHaveBeenCalled();
	});

	it("rejects an unreasonably large count", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{ method: "POST", headers: serviceHeaders(), body: JSON.stringify({ count: 1e308 }) },
			mockEnv,
		);

		expect(res.status).toBe(400);
		expect(setPostCount).not.toHaveBeenCalled();
	});

	it("increments post count", async () => {
		(incrementPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(updatedSub);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: serviceHeaders(),
				body: JSON.stringify({ action: "increment" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as SubscriptionResponse;
		expect(json.subscription.post_count).toBe(151);
		expect(incrementPostCount as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.anything(),
			TEST_USER_ID,
		);
	});

	it("decrements post count", async () => {
		const decrementedSub = { ...mockSubscription, post_count: 149 };
		(decrementPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(decrementedSub);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: serviceHeaders(),
				body: JSON.stringify({ action: "decrement" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as SubscriptionResponse;
		expect(json.subscription.post_count).toBe(149);
		expect(decrementPostCount as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.anything(),
			TEST_USER_ID,
		);
	});

	it("sets post count to a specific valid number", async () => {
		const setCountSub = { ...mockSubscription, post_count: 500 };
		(setPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(setCountSub);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{ method: "POST", headers: serviceHeaders(), body: JSON.stringify({ count: 500 }) },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as SubscriptionResponse;
		expect(json.subscription.post_count).toBe(500);
		expect(setPostCount as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.anything(),
			TEST_USER_ID,
			500,
		);
	});

	it("accepts count as zero (a legitimate internal-service correction, now gated behind SERVICE_SECRET)", async () => {
		const zeroCountSub = { ...mockSubscription, post_count: 0 };
		(setPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(zeroCountSub);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{ method: "POST", headers: serviceHeaders(), body: JSON.stringify({ count: 0 }) },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as SubscriptionResponse;
		expect(json.subscription.post_count).toBe(0);
	});

	it("returns 404 when subscription not found after increment", async () => {
		(incrementPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: serviceHeaders(),
				body: JSON.stringify({ action: "increment" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(404);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("not_found");
	});

	it("returns 404 when subscription not found after decrement", async () => {
		(decrementPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{
				method: "POST",
				headers: serviceHeaders(),
				body: JSON.stringify({ action: "decrement" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(404);
	});

	it("returns 404 when subscription not found after set count", async () => {
		(setPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/post-count`,
			{ method: "POST", headers: serviceHeaders(), body: JSON.stringify({ count: 100 }) },
			mockEnv,
		);

		expect(res.status).toBe(404);
	});
});

// =============================================================================
// PUT /subscription/:userId/tier - Update subscription tier
// Internal-service-only: gated on SERVICE_SECRET, not a user's own token.
// =============================================================================

describe("PUT /subscription/:userId/tier", () => {
	beforeEach(() => {
		mockEnv.SERVICE_SECRET = SERVICE_SECRET;
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: true,
			remaining: 10,
		});
		(getOrCreateUserSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubscription);
		(getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(mockStatus);
	});

	it("rejects a request with no Authorization header at all", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tier: "evergreen" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(401);
	});

	it("rejects a valid user Bearer token — self-serve tier upgrade must not be possible", async () => {
		// Direct regression test for the critical finding: a user granting
		// themselves any tier (and therefore an unlimited post_limit, since
		// every tier above seedling maps to null) with their own valid
		// access token and no payment verification whatsoever.
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer some-users-own-valid-access-token",
				},
				body: JSON.stringify({ tier: "evergreen" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(401);
		expect(updateSubscriptionTier).not.toHaveBeenCalled();
	});

	it("fails closed when SERVICE_SECRET is unset", async () => {
		mockEnv.SERVICE_SECRET = undefined;

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json", Authorization: "Bearer " },
				body: JSON.stringify({ tier: "evergreen" }),
			},
			mockEnv,
		);

		expect(res.status).toBe(401);
	});

	it("returns 429 when rate limited", async () => {
		(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: false,
			remaining: 0,
			retryAfter: 30,
		});

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{ method: "PUT", headers: serviceHeaders(), body: JSON.stringify({ tier: "evergreen" }) },
			mockEnv,
		);

		expect(res.status).toBe(429);
	});

	it("returns 400 for invalid JSON body", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{ method: "PUT", headers: serviceHeaders(), body: "not valid json" },
			mockEnv,
		);

		expect(res.status).toBe(400);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("invalid_request");
		expect(json.error_description).toContain("Invalid JSON body");
	});

	it("returns 400 for missing tier", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{ method: "PUT", headers: serviceHeaders(), body: JSON.stringify({}) },
			mockEnv,
		);

		expect(res.status).toBe(400);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("invalid_request");
		expect(json.error_description).toContain('tier: "seedling"');
	});

	it("returns 400 for invalid tier", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{ method: "PUT", headers: serviceHeaders(), body: JSON.stringify({ tier: "invalid_tier" }) },
			mockEnv,
		);

		expect(res.status).toBe(400);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("invalid_request");
	});

	it("returns 400 for a tier with different casing (case-sensitive match)", async () => {
		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{ method: "PUT", headers: serviceHeaders(), body: JSON.stringify({ tier: "Evergreen" }) },
			mockEnv,
		);

		expect(res.status).toBe(400);
	});

	it("upgrades tier to evergreen", async () => {
		const upgradedSub = { ...mockSubscription, tier: "evergreen" as const };
		(updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(upgradedSub);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{ method: "PUT", headers: serviceHeaders(), body: JSON.stringify({ tier: "evergreen" }) },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as SubscriptionResponse;
		expect(json.subscription.tier).toBe("evergreen");
		expect(updateSubscriptionTier as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.anything(),
			TEST_USER_ID,
			"evergreen",
		);
	});

	it("downgrades tier to seedling", async () => {
		const downgradedSub = { ...mockSubscription, tier: "seedling" as const };
		(updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(downgradedSub);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{ method: "PUT", headers: serviceHeaders(), body: JSON.stringify({ tier: "seedling" }) },
			mockEnv,
		);

		expect(res.status).toBe(200);
		const json = (await res.json()) as SubscriptionResponse;
		expect(json.subscription.tier).toBe("seedling");
	});

	it("allows all valid tiers", async () => {
		const validTiers = ["seedling", "sapling", "oak", "evergreen"] as const;

		for (const tier of validTiers) {
			vi.clearAllMocks();
			mockEnv.SERVICE_SECRET = SERVICE_SECRET;
			(checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
				allowed: true,
				remaining: 10,
			});
			(getOrCreateUserSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubscription);

			const tierSub = { ...mockSubscription, tier };
			(updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(tierSub);
			(getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(mockStatus);

			const app = createApp();
			const res = await app.request(
				`/subscription/${TEST_USER_ID}/tier`,
				{ method: "PUT", headers: serviceHeaders(), body: JSON.stringify({ tier }) },
				mockEnv,
			);

			expect(res.status).toBe(200);
			const json = (await res.json()) as SubscriptionResponse;
			expect(json.subscription.tier).toBe(tier);
		}
	});

	it("returns 404 when subscription not found after update", async () => {
		(updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(null);

		const app = createApp();
		const res = await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{ method: "PUT", headers: serviceHeaders(), body: JSON.stringify({ tier: "evergreen" }) },
			mockEnv,
		);

		expect(res.status).toBe(404);
		const json = (await res.json()) as ErrorResponse;
		expect(json.error).toBe("not_found");
	});

	it("calls getOrCreateUserSubscription before updating tier", async () => {
		(updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(mockSubscription);

		const app = createApp();
		await app.request(
			`/subscription/${TEST_USER_ID}/tier`,
			{ method: "PUT", headers: serviceHeaders(), body: JSON.stringify({ tier: "evergreen" }) },
			mockEnv,
		);

		expect(getOrCreateUserSubscription as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.anything(),
			TEST_USER_ID,
		);
	});
});
