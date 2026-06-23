import type {
	UserSubscription,
	SubscriptionTier,
	SubscriptionStatus,
	SubscriptionAuditEventType,
	D1DatabaseOrSession,
} from "../../types.js";
import { TIER_POST_LIMITS } from "../../types.js";
import { generateUUID } from "../../utils/crypto.js";
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
     VALUES (?, ?, ?, ?, 0, 14, ?, ?)`,
		)
		.bind(id, userId, tier, postLimit, now, now)
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

export async function incrementPostCount(
	db: D1DatabaseOrSession,
	userId: string,
): Promise<UserSubscription | null> {
	const subscription = await getUserSubscription(db, userId);
	if (!subscription) return null;

	const newCount = subscription.post_count + 1;
	const now = new Date().toISOString();
	const isAtLimit = subscription.post_limit !== null && newCount >= subscription.post_limit;

	let graceStart = subscription.grace_period_start;
	if (isAtLimit && !graceStart) {
		graceStart = now;
	}

	await db
		.prepare(
			`UPDATE user_subscriptions SET post_count = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
		)
		.bind(newCount, graceStart, now, userId)
		.run();

	return getUserSubscription(db, userId);
}

export async function decrementPostCount(
	db: D1DatabaseOrSession,
	userId: string,
): Promise<UserSubscription | null> {
	const subscription = await getUserSubscription(db, userId);
	if (!subscription) return null;

	const newCount = Math.max(0, subscription.post_count - 1);
	const now = new Date().toISOString();

	let graceStart = subscription.grace_period_start;
	if (subscription.post_limit !== null && newCount < subscription.post_limit) {
		graceStart = null;
	}

	await db
		.prepare(
			`UPDATE user_subscriptions SET post_count = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
		)
		.bind(newCount, graceStart, now, userId)
		.run();

	return getUserSubscription(db, userId);
}

export async function setPostCount(
	db: D1DatabaseOrSession,
	userId: string,
	count: number,
): Promise<UserSubscription | null> {
	const subscription = await getUserSubscription(db, userId);
	if (!subscription) return null;

	const newCount = Math.max(0, count);
	const now = new Date().toISOString();
	const isAtLimit = subscription.post_limit !== null && newCount >= subscription.post_limit;

	let graceStart = subscription.grace_period_start;
	if (isAtLimit && !graceStart) {
		graceStart = now;
	} else if (subscription.post_limit !== null && newCount < subscription.post_limit) {
		graceStart = null;
	}

	await db
		.prepare(
			`UPDATE user_subscriptions SET post_count = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
		)
		.bind(newCount, graceStart, now, userId)
		.run();

	return getUserSubscription(db, userId);
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

	const tierOrder: Record<SubscriptionTier, number> = {
		seedling: 0,
		sapling: 1,
		oak: 2,
		evergreen: 3,
	};
	const eventType: SubscriptionAuditEventType =
		tierOrder[newTier] > tierOrder[oldTier] ? "tier_upgraded" : "tier_downgraded";

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

	let is_in_grace_period = false;
	let grace_period_days_remaining: number | null = null;

	if (grace_period_start) {
		is_in_grace_period = true;
		const graceStart = new Date(grace_period_start);
		const graceEnd = new Date(graceStart.getTime() + grace_period_days * 24 * 60 * 60 * 1000);
		const msRemaining = graceEnd.getTime() - Date.now();
		grace_period_days_remaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
	}

	const grace_expired = grace_period_days_remaining !== null && grace_period_days_remaining <= 0;
	const can_create_post = !is_at_limit || (is_in_grace_period && !grace_expired);
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
