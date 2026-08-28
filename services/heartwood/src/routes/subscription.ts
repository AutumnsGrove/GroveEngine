/**
 * Subscription Routes - User subscription management and post limits
 *
 * Read endpoints (GET) are reachable with the requesting user's own Bearer
 * token — a user is always allowed to see their own billing state.
 *
 * Mutation endpoints (POST /post-count, PUT /tier) are internal-service-only,
 * gated behind SERVICE_SECRET rather than a user's own token. Both directly
 * control billing enforcement (post_limit is derived from tier, and
 * post_count is the paywall counter) — if either were reachable with a
 * user's own token, that user could grant themselves any tier or reset
 * their own post count with no payment verification at all. Mutations
 * belong to whatever service actually verifies payment (a Stripe webhook
 * handler, the billing hub) and to the post-creation path (which increments
 * the counter when a post is actually created) — never to the end user.
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
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
import { createDbSession } from "../db/session.js";
import { verifyBearerAuth } from "../middleware/bearerAuth.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import { timingSafeEqual } from "../utils/crypto.js";
import {
	subscriptionTierUpdateSchema,
	subscriptionPostCountUpdateSchema,
} from "../utils/validation.js";
import {
	RATE_LIMIT_WINDOW,
	RATE_LIMIT_SUBSCRIPTION_READ,
	RATE_LIMIT_SUBSCRIPTION_WRITE,
} from "../utils/constants.js";

const subscription = new Hono<{ Bindings: Env }>();

/**
 * Verify the caller is a trusted internal service. Fails closed: a
 * missing/empty SERVICE_SECRET rejects every request rather than skipping
 * the check — mirrors session.ts's /validate-service, so a misconfigured
 * deploy can't silently turn "internal-only" into "anyone with a guess."
 */
function verifyServiceAuth(
	c: { req: { header: (name: string) => string | undefined } },
	env: Env,
): boolean {
	const provided = c.req.header("Authorization") || "";
	const expected = env.SERVICE_SECRET || "";
	if (!expected) return false;
	return timingSafeEqual(provided, `Bearer ${expected}`);
}

/**
 * GET /subscription - Get current user's subscription (requires Bearer token)
 */
subscription.get("/", async (c) => {
	const payload = await verifyBearerAuth(c.req, c.env);
	if (!payload) {
		return c.json({ error: "unauthorized", error_description: "Missing or invalid token" }, 401);
	}

	const rateLimit = await checkRouteRateLimit(
		c.env.DB,
		"subscription_read",
		payload.sub,
		RATE_LIMIT_SUBSCRIPTION_READ,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	const db = createDbSession(c.env);
	const sub = await getOrCreateUserSubscription(db, payload.sub);
	const status = getSubscriptionStatus(sub);

	return c.json({
		subscription: sub,
		status,
	});
});

/**
 * GET /subscription/:userId - Get specific user's subscription
 */
subscription.get("/:userId", async (c) => {
	const payload = await verifyBearerAuth(c.req, c.env);
	if (!payload) {
		return c.json({ error: "unauthorized", error_description: "Missing or invalid token" }, 401);
	}

	const userId = c.req.param("userId");
	if (payload.sub !== userId) {
		return c.json(
			{
				error: "forbidden",
				error_description: "Cannot access other user data",
			},
			403,
		);
	}

	const rateLimit = await checkRouteRateLimit(
		c.env.DB,
		"subscription_read",
		payload.sub,
		RATE_LIMIT_SUBSCRIPTION_READ,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	const db = createDbSession(c.env);
	const sub = await getUserSubscription(db, userId);

	if (!sub) {
		return c.json({ error: "not_found", error_description: "Subscription not found" }, 404);
	}

	const status = getSubscriptionStatus(sub);

	return c.json({
		subscription: sub,
		status,
	});
});

/**
 * GET /subscription/:userId/can-post - Check if user can create a post
 */
subscription.get("/:userId/can-post", async (c) => {
	const payload = await verifyBearerAuth(c.req, c.env);
	if (!payload) {
		return c.json({ error: "unauthorized", error_description: "Missing or invalid token" }, 401);
	}

	const userId = c.req.param("userId");
	if (payload.sub !== userId) {
		return c.json(
			{
				error: "forbidden",
				error_description: "Cannot access other user data",
			},
			403,
		);
	}

	const rateLimit = await checkRouteRateLimit(
		c.env.DB,
		"subscription_read",
		payload.sub,
		RATE_LIMIT_SUBSCRIPTION_READ,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	const db = createDbSession(c.env);
	const result = await canUserCreatePost(db, userId);

	return c.json(result);
});

/**
 * POST /subscription/:userId/post-count - Update post count
 * Body: { action: 'increment' | 'decrement' } or { count: number }
 *
 * Internal-service-only (SERVICE_SECRET) — see module docstring.
 */
subscription.post("/:userId/post-count", async (c) => {
	if (!verifyServiceAuth(c, c.env)) {
		return c.json(
			{ error: "unauthorized", error_description: "Service authentication required" },
			401,
		);
	}

	const userId = c.req.param("userId");

	// Keyed on the target user so a single misbehaving/compromised internal
	// caller can't hammer one user's row unboundedly, rather than on IP
	// (which is not a meaningful identity for service-to-service calls).
	const rateLimit = await checkRouteRateLimit(
		c.env.DB,
		"subscription_write",
		userId,
		RATE_LIMIT_SUBSCRIPTION_WRITE,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_request", error_description: "Invalid JSON body" }, 400);
	}

	const parsed = subscriptionPostCountUpdateSchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json(
			{
				error: "invalid_request",
				error_description: parsed.error.issues[0]?.message || "Invalid request body",
			},
			400,
		);
	}

	const db = createDbSession(c.env);
	let updatedSub;

	if ("action" in parsed.data && parsed.data.action === "increment") {
		updatedSub = await incrementPostCount(db, userId);
	} else if ("action" in parsed.data && parsed.data.action === "decrement") {
		updatedSub = await decrementPostCount(db, userId);
	} else if ("count" in parsed.data) {
		updatedSub = await setPostCount(db, userId, parsed.data.count);
	}

	if (!updatedSub) {
		return c.json({ error: "not_found", error_description: "Subscription not found" }, 404);
	}

	const status = getSubscriptionStatus(updatedSub);

	return c.json({
		subscription: updatedSub,
		status,
	});
});

/**
 * PUT /subscription/:userId/tier - Update subscription tier
 * Body: { tier: 'seedling' | 'sapling' | 'oak' | 'evergreen' }
 *
 * Internal-service-only (SERVICE_SECRET) — see module docstring.
 */
subscription.put("/:userId/tier", async (c) => {
	if (!verifyServiceAuth(c, c.env)) {
		return c.json(
			{ error: "unauthorized", error_description: "Service authentication required" },
			401,
		);
	}

	const userId = c.req.param("userId");

	const rateLimit = await checkRouteRateLimit(
		c.env.DB,
		"subscription_write",
		userId,
		RATE_LIMIT_SUBSCRIPTION_WRITE,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json({ error: "invalid_request", error_description: "Invalid JSON body" }, 400);
	}

	const parsed = subscriptionTierUpdateSchema.safeParse(rawBody);
	if (!parsed.success) {
		return c.json(
			{
				error: "invalid_request",
				error_description:
					'Body must contain { tier: "seedling" | "sapling" | "oak" | "evergreen" }',
			},
			400,
		);
	}

	const db = createDbSession(c.env);

	// Ensure subscription exists first
	await getOrCreateUserSubscription(db, userId);

	const updatedSub = await updateSubscriptionTier(db, userId, parsed.data.tier);

	if (!updatedSub) {
		return c.json({ error: "not_found", error_description: "Subscription not found" }, 404);
	}

	const status = getSubscriptionStatus(updatedSub);

	return c.json({
		subscription: updatedSub,
		status,
	});
});

export default subscription;
