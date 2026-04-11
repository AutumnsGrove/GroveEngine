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
	};
	timestamp: string;
}

interface QueueEnv {
	DB: D1Database;
	FEED: DurableObjectNamespace;
}

// ============================================================================
// Queue Consumer — Fan-out published posts to subscriber FeedDOs
// ============================================================================

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

			// Find all users following this tenant
			const followers = await env.DB.prepare(
				"SELECT user_id FROM friends WHERE friend_tenant_id = ?",
			)
				.bind(payload.tenantId)
				.all<{ user_id: string }>();

			if (!followers.results.length) {
				message.ack();
				continue;
			}

			// Fan out to each follower's FeedDO
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

			const fanOutPromises = followers.results.map(async (follower) => {
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
			});

			await Promise.allSettled(fanOutPromises);
			message.ack();

			console.log(
				`[FeedQueue] Fanned out "${payload.title}" from ${tenant.subdomain} to ${followers.results.length} followers`,
			);
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
