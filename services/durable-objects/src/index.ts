/**
 * Grove Durable Objects Worker
 *
 * This worker hosts all Durable Objects for the Grove Platform.
 * Other services (Lattice Pages, post-migrator) reference these
 * via service bindings with script_name: "grove-durable-objects".
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

// Export DO classes for Cloudflare to instantiate
export { TenantDO } from "./TenantDO.js";
export { PostMetaDO } from "./PostMetaDO.js";
export { PostContentDO } from "./PostContentDO.js";
export { SentinelDO } from "./sentinel/SentinelDO.js";
export { ExportDO } from "./ExportDO.js";
export { TriageDO } from "./TriageDO.js";
export { ThresholdDO } from "./ThresholdDO.js";
export { ChatDO } from "./ChatDO.js";
export { FeedDO } from "./FeedDO.js";

// ============================================================================
// Types
// ============================================================================

interface FeedQueueMessage {
	type: string;
	payload: {
		tenantId: string;
		slug: string;
		title: string;
		excerpt?: string | null;
		image?: string | null;
		publishedAt: number;
		_offset?: number;
	};
	timestamp: string;
}

interface QueueEnv {
	DB: D1Database;
	FEED: DurableObjectNamespace;
	FEED_QUEUE?: Queue;
}

// ============================================================================
// Queue Consumer — Fan-out published posts to subscriber FeedDOs
// ============================================================================

/**
 * Maximum followers to fan out per queue message.
 * CF Workers have a 1000 subrequest limit; we stay well under with batched
 * concurrency. If a tenant has more followers than this, the remaining are
 * processed via a continuation message.
 */
const FAN_OUT_BATCH_SIZE = 200;

/** Concurrent DO fetches per batch — prevents subrequest burst. */
const FAN_OUT_CONCURRENCY = 50;

/**
 * Fan out to a slice of followers with bounded concurrency.
 * Returns the number of successful deliveries.
 */
async function fanOutToFollowers(
	followers: { user_id: string }[],
	ingestPayload: string,
	env: QueueEnv,
): Promise<number> {
	let delivered = 0;

	for (let i = 0; i < followers.length; i += FAN_OUT_CONCURRENCY) {
		const chunk = followers.slice(i, i + FAN_OUT_CONCURRENCY);
		const results = await Promise.allSettled(
			chunk.map(async (follower) => {
				const feedId = env.FEED.idFromName(`feed:${follower.user_id}`);
				const feedDO = env.FEED.get(feedId);
				const res = await feedDO.fetch(
					new Request("http://do/ingest", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: ingestPayload,
					}),
				);
				if (!res.ok) {
					console.warn(`[FeedQueue] Ingest failed for user ${follower.user_id}: ${res.status}`);
				}
				return res.ok;
			}),
		);
		delivered += results.filter((r) => r.status === "fulfilled" && r.value).length;
	}

	return delivered;
}

async function handleFeedQueue(
	batch: MessageBatch<FeedQueueMessage>,
	env: QueueEnv,
): Promise<void> {
	for (const message of batch.messages) {
		const { type, payload } = message.body;

		if (type !== "post.published") {
			message.ack();
			continue;
		}

		try {
			// Look up tenant info for enrichment
			const tenant = await env.DB.prepare(
				"SELECT id, subdomain, display_name FROM tenants WHERE id = ? AND active = 1",
			)
				.bind(payload.tenantId)
				.first<{ id: string; subdomain: string; display_name: string }>();

			if (!tenant) {
				console.warn(`[FeedQueue] Tenant ${payload.tenantId} not found or inactive`);
				message.ack();
				continue;
			}

			// Record pending notification for email digest (INSERT OR IGNORE for dedup).
			// Only on the first batch (offset=0) to avoid duplicate inserts on continuation.
			const offset = (payload as { _offset?: number })._offset || 0;
			if (offset === 0) {
				try {
					await env.DB.prepare(
						`INSERT OR IGNORE INTO pending_notifications
						 (id, target_tenant_id, tenant_name, tenant_subdomain, post_slug, post_title, post_excerpt, post_image, published_at)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					)
						.bind(
							crypto.randomUUID(),
							tenant.id,
							tenant.display_name || tenant.subdomain,
							tenant.subdomain,
							payload.slug,
							payload.title,
							payload.excerpt || null,
							payload.image || null,
							payload.publishedAt,
						)
						.run();
				} catch (err) {
					// Non-fatal — digest will just miss this post
					console.warn("[FeedQueue] Failed to record pending notification:", err);
				}
			}

			// Find followers in bounded batches
			const followers = await env.DB.prepare(
				"SELECT user_id FROM friends WHERE friend_tenant_id = ? LIMIT ? OFFSET ?",
			)
				.bind(payload.tenantId, FAN_OUT_BATCH_SIZE + 1, offset)
				.all<{ user_id: string }>();

			if (!followers.results.length) {
				message.ack();
				continue;
			}

			// Check if there are more followers beyond this batch
			const hasMore = followers.results.length > FAN_OUT_BATCH_SIZE;
			const batch_followers = hasMore
				? followers.results.slice(0, FAN_OUT_BATCH_SIZE)
				: followers.results;

			const ingestPayload = JSON.stringify({
				tenantId: tenant.id,
				tenantName: tenant.display_name || tenant.subdomain,
				tenantSubdomain: tenant.subdomain,
				postSlug: payload.slug,
				postTitle: payload.title,
				postExcerpt: payload.excerpt || null,
				postImage: payload.image || null,
				publishedAt: payload.publishedAt,
			});

			const delivered = await fanOutToFollowers(batch_followers, ingestPayload, env);
			const failed = batch_followers.length - delivered;

			// If more followers remain, re-enqueue with offset for next batch.
			// Throw on send failure so the message retries instead of silently
			// truncating the fan-out for remaining followers.
			if (hasMore) {
				if (!env.FEED_QUEUE) {
					throw new Error("[FeedQueue] FEED_QUEUE binding missing — cannot send continuation");
				}
				await env.FEED_QUEUE.send({
					type: "post.published",
					payload: { ...payload, _offset: offset + FAN_OUT_BATCH_SIZE },
					timestamp: new Date().toISOString(),
				});
			}

			// Retry the entire message if any deliveries failed.
			// INSERT OR IGNORE dedup makes retries safe for already-delivered followers.
			if (failed > 0) {
				console.warn(
					`[FeedQueue] ${failed}/${batch_followers.length} deliveries failed for "${payload.title}" from ${tenant.subdomain} (offset=${offset}) — retrying`,
				);
				message.retry();
			} else {
				message.ack();
				console.log(
					`[FeedQueue] Delivered "${payload.title}" from ${tenant.subdomain} to ${delivered} followers (offset=${offset}${hasMore ? ", continuation queued" : ""})`,
				);
			}
		} catch (err) {
			console.error("[FeedQueue] Error processing message:", err);
			message.retry();
		}
	}
}

// ============================================================================
// Worker Export
// ============================================================================

// Minimal fetch handler for health checks
export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/health") {
			return Response.json({
				status: "ok",
				service: "grove-durable-objects",
				classes: [
					"TenantDO",
					"PostMetaDO",
					"PostContentDO",
					"SentinelDO",
					"ExportDO",
					"TriageDO",
					"ThresholdDO",
					"ChatDO",
					"FeedDO",
				],
			});
		}

		return new Response("Grove Durable Objects Worker", {
			headers: { "Content-Type": "text/plain" },
		});
	},

	async queue(batch: MessageBatch<FeedQueueMessage>, env: QueueEnv): Promise<void> {
		await handleFeedQueue(batch, env);
	},
};
