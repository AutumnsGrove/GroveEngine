import type {
	UserSubscription,
	SubscriptionTier,
	SubscriptionStatus,
	SubscriptionAuditEventType,
	D1DatabaseOrSession,
} from "../../types.js";
import { TIER_POST_LIMITS, SUBSCRIPTION_TIERS } from "../../types.js";
import { generateUUID } from "../../utils/crypto.js";
import { GRACE_PERIOD_DAYS } from "../../utils/constants.js";
import { createSubscriptionAuditLog } from "./audit.js";

export async function getUserSubscription(
	db: D1DatabaseOrSession,
	userId: string,
): Promise<UserSubscription | null> {
	return db
		.prepare("SELECT * FROM user_subscriptions WHERE user_id = ?")
		.bind(userId)
		.first<UserSubscription>();
}

export async function createUserSubscription(
	db: D1DatabaseOrSession,
	userId: string,
	tier: SubscriptionTier = "seedling",
): Promise<UserSubscription> {
	const id = generateUUID();
	const postLimit = TIER_POST_LIMITS[tier];
	const now = new Date().toISOString();

	await db
		.prepare(
			`INSERT INTO user_subscriptions (id, user_id, tier, post_limit, post_count, grace_period_days, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
		)
		.bind(id, userId, tier, postLimit, GRACE_PERIOD_DAYS, now, now)
		.run();

	await createSubscriptionAuditLog(db, {
		user_id: userId,
		event_type: "subscription_created",
		new_value: JSON.stringify({ tier, post_limit: postLimit }),
	});

	return (await getUserSubscription(db, userId))!;
}

export async function getOrCreateUserSubscription(
	db: D1DatabaseOrSession,
	userId: string,
): Promise<UserSubscription> {
	const existing = await getUserSubscription(db, userId);
	if (existing) return existing;
	return createUserSubscription(db, userId, "seedling");
}

/**
 * All three post-count mutators below use a single atomic
 * UPDATE...RETURNING statement rather than the previous read-then-write
 * shape. Two concurrent increments both reading post_count = N and both
 * writing N+1 would silently lose a count — the same class of race fixed
 * for refresh tokens and device codes earlier in this audit. Expressing
 * the grace-period transition as a SQL CASE (instead of computing it in JS
 * from a stale read) keeps the whole mutation — count and grace state — in
 * one statement.
 */

export async function incrementPostCount(
	db: D1DatabaseOrSession,
	userId: string,
): Promise<UserSubscription | null> {
	const now = new Date().toISOString();

	const before = await getUserSubscription(db, userId);
	if (!before) return null;

	const updated = await db
		.prepare(
			`UPDATE user_subscriptions
       SET post_count = post_count + 1,
           grace_period_start = CASE
             WHEN grace_period_start IS NOT NULL THEN grace_period_start
             WHEN post_limit IS NOT NULL AND post_count + 1 >= post_limit THEN ?
             ELSE grace_period_start
           END,
           updated_at = ?
       WHERE user_id = ?
       RETURNING *`,
		)
		.bind(now, now, userId)
		.first<UserSubscription>();

	if (updated) {
		await createSubscriptionAuditLog(db, {
			user_id: userId,
			event_type: "post_count_updated",
			old_value: JSON.stringify({ post_count: before.post_count }),
			new_value: JSON.stringify({ post_count: updated.post_count }),
		});
	}

	return updated;
}

export async function decrementPostCount(
	db: D1DatabaseOrSession,
	userId: string,
): Promise<UserSubscription | null> {
	const now = new Date().toISOString();

	const before = await getUserSubscription(db, userId);
	if (!before) return null;

	const updated = await db
		.prepare(
			`UPDATE user_subscriptions
       SET post_count = max(0, post_count - 1),
           grace_period_start = CASE
             WHEN post_limit IS NOT NULL AND max(0, post_count - 1) < post_limit THEN NULL
             ELSE grace_period_start
           END,
           updated_at = ?
       WHERE user_id = ?
       RETURNING *`,
		)
		.bind(now, userId)
		.first<UserSubscription>();

	if (updated) {
		await createSubscriptionAuditLog(db, {
			user_id: userId,
			event_type: "post_count_updated",
			old_value: JSON.stringify({ post_count: before.post_count }),
			new_value: JSON.stringify({ post_count: updated.post_count }),
		});
	}

	return updated;
}

/**
 * Set post_count to an explicit value. `count` must already be validated as
 * a non-negative integer by the caller (see subscriptionPostCountUpdateSchema)
 * — this function clamps defensively but does not itself bound-check.
 */
export async function setPostCount(
	db: D1DatabaseOrSession,
	userId: string,
	count: number,
): Promise<UserSubscription | null> {
	const newCount = Math.max(0, count);
	const now = new Date().toISOString();

	const before = await getUserSubscription(db, userId);
	if (!before) return null;

	const updated = await db
		.prepare(
			`UPDATE user_subscriptions
       SET post_count = ?,
           grace_period_start = CASE
             WHEN post_limit IS NOT NULL AND ? >= post_limit AND grace_period_start IS NULL THEN ?
             WHEN post_limit IS NULL OR ? < post_limit THEN NULL
             ELSE grace_period_start
           END,
           updated_at = ?
       WHERE user_id = ?
       RETURNING *`,
		)
		.bind(newCount, newCount, now, newCount, now, userId)
		.first<UserSubscription>();

	if (updated) {
		await createSubscriptionAuditLog(db, {
			user_id: userId,
			event_type: "post_count_updated",
			old_value: JSON.stringify({ post_count: before.post_count }),
			new_value: JSON.stringify({ post_count: updated.post_count }),
		});
	}

	return updated;
}

export async function updateSubscriptionTier(
	db: D1DatabaseOrSession,
	userId: string,
	newTier: SubscriptionTier,
): Promise<UserSubscription | null> {
	const subscription = await getUserSubscription(db, userId);
	if (!subscription) return null;

	const oldTier = subscription.tier;
	const newPostLimit = TIER_POST_LIMITS[newTier];
	const now = new Date().toISOString();

	let graceStart = subscription.grace_period_start;
	if (newPostLimit === null || subscription.post_count < newPostLimit) {
		graceStart = null;
	}

	await db
		.prepare(
			`UPDATE user_subscriptions SET tier = ?, post_limit = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
		)
		.bind(newTier, newPostLimit, graceStart, now, userId)
		.run();

	const eventType: SubscriptionAuditEventType =
		SUBSCRIPTION_TIERS.indexOf(newTier) > SUBSCRIPTION_TIERS.indexOf(oldTier)
			? "tier_upgraded"
			: "tier_downgraded";

	await createSubscriptionAuditLog(db, {
		user_id: userId,
		event_type: eventType,
		old_value: JSON.stringify({
			tier: oldTier,
			post_limit: subscription.post_limit,
		}),
		new_value: JSON.stringify({ tier: newTier, post_limit: newPostLimit }),
	});

	return getUserSubscription(db, userId);
}

export function getSubscriptionStatus(subscription: UserSubscription): SubscriptionStatus {
	const { tier, post_count, post_limit, grace_period_start, grace_period_days } = subscription;

	const posts_remaining = post_limit !== null ? Math.max(0, post_limit - post_count) : null;
	const percentage_used =
		post_limit !== null ? Math.min(100, (post_count / post_limit) * 100) : null;
	const is_at_limit = post_limit !== null && post_count >= post_limit;

	let grace_period_days_remaining: number | null = null;
	let grace_expired = false;

	if (grace_period_start) {
		const graceStart = new Date(grace_period_start);
		const graceEnd = new Date(graceStart.getTime() + grace_period_days * 24 * 60 * 60 * 1000);
		const msRemaining = graceEnd.getTime() - Date.now();
		grace_period_days_remaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
		grace_expired = msRemaining <= 0;
	}

	// A grace_period_start being set doesn't mean the grace period is still
	// active — without checking expiry, a user 30 days past a 14-day grace
	// window still read as "in grace period" here, which would render as
	// such in any UI consuming this field even though upgrade_required
	// (derived correctly below) already required an upgrade.
	const is_in_grace_period = grace_period_start !== null && !grace_expired;
	const can_create_post = !is_at_limit || is_in_grace_period;
	const upgrade_required = is_at_limit && grace_expired;

	return {
		tier,
		post_count,
		post_limit,
		posts_remaining,
		percentage_used,
		is_at_limit,
		is_in_grace_period,
		grace_period_days_remaining,
		can_create_post,
		upgrade_required,
	};
}

export async function canUserCreatePost(
	db: D1DatabaseOrSession,
	userId: string,
): Promise<{
	allowed: boolean;
	status: SubscriptionStatus;
	subscription: UserSubscription;
}> {
	const subscription = await getOrCreateUserSubscription(db, userId);
	const status = getSubscriptionStatus(subscription);
	return { allowed: status.can_create_post, status, subscription };
}
