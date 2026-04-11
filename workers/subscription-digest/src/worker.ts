/**
 * Subscription Digest Worker
 *
 * Hourly cron that sends timezone-aware email digests to subscribers.
 * Each hour, it identifies subscribers whose local time matches their
 * preferred notification hour, then sends a batched digest of new posts
 * from the groves they follow.
 *
 * Flow:
 * 1. Query subscriptions where current UTC hour = preferred_hour in their timezone
 * 2. For each eligible subscriber, query pending_notifications for their subscribed groves
 * 3. Group by grove, send one digest email per grove via Zephyr
 * 4. Clean up sent notifications
 */

import { TZDate } from "@date-fns/tz";
import { ZephyrClient } from "@autumnsgrove/lattice/zephyr";
import { getOrCreateUnsubscribeToken } from "@autumnsgrove/lattice/server/services/subscriptions";

interface Env {
	DB: D1Database;
	ZEPHYR: Fetcher;
	ZEPHYR_API_KEY: string;
	ZEPHYR_URL: string;
	UNSUBSCRIBE_BASE_URL: string;
}

interface EligibleSubscriber {
	subscription_id: string;
	user_id: string;
	email: string;
	target_tenant_id: string;
}

interface PendingPost {
	id: string;
	tenant_name: string;
	tenant_subdomain: string;
	post_slug: string;
	post_title: string;
	post_excerpt: string | null;
	post_image: string | null;
	published_at: number;
}

/**
 * Get all distinct timezones that have subscribers, then check which ones
 * have their current local hour matching any subscriber's preferred_hour.
 *
 * Returns subscription IDs of eligible subscribers.
 */
async function getEligibleSubscribers(db: D1Database): Promise<EligibleSubscriber[]> {
	// Get distinct timezone + preferred_hour combos
	const combos = await db
		.prepare(`SELECT DISTINCT timezone, preferred_hour FROM subscriptions`)
		.all<{ timezone: string; preferred_hour: number }>();

	if (!combos.results?.length) return [];

	// Check which combos match the current hour
	const matchingTimezones: { tz: string; hour: number }[] = [];
	for (const combo of combos.results) {
		try {
			const now = new TZDate(new Date(), combo.timezone);
			const currentHour = now.getHours();
			if (currentHour === combo.preferred_hour) {
				matchingTimezones.push({ tz: combo.timezone, hour: combo.preferred_hour });
			}
		} catch {
			// Invalid timezone — skip
			console.warn(`[Digest] Invalid timezone: ${combo.timezone}`);
		}
	}

	if (!matchingTimezones.length) return [];

	// Query all eligible subscribers
	const conditions = matchingTimezones
		.map(() => "(timezone = ? AND preferred_hour = ?)")
		.join(" OR ");
	const binds = matchingTimezones.flatMap((m) => [m.tz, m.hour]);

	const result = await db
		.prepare(
			`SELECT id as subscription_id, user_id, email, target_tenant_id
			 FROM subscriptions
			 WHERE ${conditions}`,
		)
		.bind(...binds)
		.all<EligibleSubscriber>();

	return result.results ?? [];
}

/**
 * Get pending notifications for a specific tenant.
 */
async function getPendingForTenant(db: D1Database, tenantId: string): Promise<PendingPost[]> {
	const result = await db
		.prepare(
			`SELECT id, tenant_name, tenant_subdomain, post_slug, post_title,
			        post_excerpt, post_image, published_at
			 FROM pending_notifications
			 WHERE target_tenant_id = ?
			 ORDER BY published_at DESC`,
		)
		.bind(tenantId)
		.all<PendingPost>();

	return result.results ?? [];
}

/**
 * Send a digest email for one subscriber + one grove's pending posts.
 */
async function sendDigestEmail(
	zephyr: ZephyrClient,
	subscriber: EligibleSubscriber,
	posts: PendingPost[],
	unsubscribeUrl: string,
): Promise<boolean> {
	const groveName = posts[0].tenant_name;
	const groveSubdomain = posts[0].tenant_subdomain;
	const today = new Date().toISOString().split("T")[0];

	try {
		const result = await zephyr.send({
			type: "notification",
			template: "SubscriptionDigestEmail",
			to: subscriber.email,
			subject:
				posts.length === 1
					? `New from ${groveName}: ${posts[0].post_title}`
					: `${posts.length} new posts from ${groveName}`,
			data: {
				groveName,
				groveSubdomain,
				posts: posts.map((p) => ({
					title: p.post_title,
					excerpt: p.post_excerpt,
					slug: p.post_slug,
					image: p.post_image,
					url: `https://${groveSubdomain}.grove.place/garden/${p.post_slug}`,
				})),
				unsubscribeUrl,
			},
			source: "subscription-digest",
			idempotencyKey: `sub-digest:${subscriber.user_id}:${subscriber.target_tenant_id}:${today}`,
			headers: {
				"List-Unsubscribe": `<${unsubscribeUrl}>`,
				"List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
			},
		});

		return result.success;
	} catch (err) {
		console.error(
			`[Digest] Failed to send digest for user ${subscriber.user_id} / ${groveSubdomain}:`,
			err,
		);
		return false;
	}
}

export default {
	async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		console.log("[Digest] Starting subscription digest run");

		const zephyr = new ZephyrClient({
			baseUrl: env.ZEPHYR_URL,
			apiKey: env.ZEPHYR_API_KEY,
			fetcher: env.ZEPHYR,
		});

		// 1. Find eligible subscribers (whose local time matches their preferred hour)
		const eligible = await getEligibleSubscribers(env.DB);
		if (!eligible.length) {
			console.log("[Digest] No eligible subscribers this hour");
			return;
		}
		console.log(`[Digest] Found ${eligible.length} eligible subscribers`);

		// 2. Group subscribers by target tenant
		const byTenant = new Map<string, EligibleSubscriber[]>();
		for (const sub of eligible) {
			const group = byTenant.get(sub.target_tenant_id) ?? [];
			group.push(sub);
			byTenant.set(sub.target_tenant_id, group);
		}

		// 3. For each tenant, get pending posts and send digests
		let sent = 0;
		let failed = 0;
		const processedNotificationIds = new Set<string>();

		for (const [tenantId, subscribers] of byTenant) {
			const posts = await getPendingForTenant(env.DB, tenantId);
			if (!posts.length) continue;

			// Track notification IDs for cleanup
			for (const post of posts) {
				processedNotificationIds.add(post.id);
			}

			// Send to each subscriber for this tenant
			for (const subscriber of subscribers) {
				const token = await getOrCreateUnsubscribeToken(env.DB, subscriber.subscription_id);
				const unsubscribeUrl = `${env.UNSUBSCRIBE_BASE_URL}?token=${token}`;

				const success = await sendDigestEmail(zephyr, subscriber, posts, unsubscribeUrl);
				if (success) {
					sent++;
				} else {
					failed++;
				}
			}
		}

		// 4. Clean up processed pending notifications
		if (processedNotificationIds.size > 0) {
			const ids = [...processedNotificationIds];
			// D1 doesn't support IN with > 100 binds, batch if needed
			for (let i = 0; i < ids.length; i += 100) {
				const batch = ids.slice(i, i + 100);
				const placeholders = batch.map(() => "?").join(",");
				await env.DB.prepare(`DELETE FROM pending_notifications WHERE id IN (${placeholders})`)
					.bind(...batch)
					.run();
			}
		}

		console.log(
			`[Digest] Complete: ${sent} sent, ${failed} failed, ${processedNotificationIds.size} notifications cleared`,
		);
	},
};
