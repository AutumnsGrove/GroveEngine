/// <reference types="@cloudflare/workers-types" />

/**
 * FeedDO — Per-User Social Feed Durable Object
 *
 * Manages a user's personalized following feed and saved items list.
 * Each user gets their own DO instance (ID pattern: feed:{userId}).
 *
 * Responsibilities:
 * - Ingest published posts from followed groves (via queue consumer fan-out)
 * - Serve paginated feed with cursor-based pagination
 * - Track unread count since last-read timestamp
 * - Manage a unified saved/bookmarked items list
 * - Prune old feed items (1 year retention, alarm-based)
 *
 * Part of the Loom pattern — Grove's coordination layer.
 *
 * @see https://github.com/AutumnsGrove/Lattice/issues/1423
 */

import {
	LoomDO,
	type LoomRoute,
	type LoomConfig,
	type LoomRequestContext,
	LoomResponse,
	safeJsonParse,
} from "@autumnsgrove/lattice/loom";

// ============================================================================
// Types
// ============================================================================

interface FeedState {
	userId: string;
	lastReadAt: number;
}

interface FeedEnv extends Record<string, unknown> {
	DB?: D1Database;
}

/** Payload received from the queue consumer when a grove publishes a post. */
export interface FeedIngestPayload {
	tenantId: string;
	tenantName: string;
	tenantSubdomain: string;
	postSlug: string;
	postTitle: string;
	postExcerpt?: string | null;
	postImage?: string | null;
	publishedAt: number;
}

/** Payload for saving/bookmarking an item. */
export interface SaveItemPayload {
	itemType: "bloom";
	tenantId: string;
	tenantSubdomain: string;
	postSlug: string;
	postTitle: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Daily alarm for pruning old feed items. */
const ALARM_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Feed items older than this are pruned (seconds). */
const RETENTION_SECONDS = 365 * 24 * 60 * 60;

/** Default page size for feed and saved list queries. */
const DEFAULT_PAGE_SIZE = 25;

/** Maximum page size to prevent abuse. */
const MAX_PAGE_SIZE = 100;

/** Maximum string length for text fields to prevent storage abuse. */
const MAX_TITLE_LENGTH = 500;
const MAX_SLUG_LENGTH = 200;
const MAX_EXCERPT_LENGTH = 1000;
const MAX_NAME_LENGTH = 100;

/** Truncate a string to a max length. */
function truncate(value: string, max: number): string {
	return value.length > max ? value.slice(0, max) : value;
}

// ============================================================================
// FeedDO Class
// ============================================================================

export class FeedDO extends LoomDO<FeedState, FeedEnv> {
	config(): LoomConfig {
		return { name: "FeedDO" };
	}

	protected schema(): string {
		return `
      CREATE TABLE IF NOT EXISTS feed_items (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        tenant_name TEXT NOT NULL,
        tenant_subdomain TEXT NOT NULL,
        post_slug TEXT NOT NULL,
        post_title TEXT NOT NULL,
        post_excerpt TEXT,
        post_image TEXT,
        published_at INTEGER NOT NULL,
        ingested_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_feed_published ON feed_items(published_at DESC);
      CREATE INDEX IF NOT EXISTS idx_feed_tenant ON feed_items(tenant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_feed_dedup ON feed_items(tenant_id, post_slug);

      CREATE TABLE IF NOT EXISTS saved_items (
        id TEXT PRIMARY KEY,
        item_type TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        tenant_subdomain TEXT NOT NULL,
        post_slug TEXT NOT NULL,
        post_title TEXT NOT NULL,
        saved_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_saved_at ON saved_items(saved_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_dedup ON saved_items(tenant_id, post_slug);
    `;
	}

	protected async loadState(): Promise<FeedState | null> {
		const stored = this.store.get<FeedState>("feed_state");
		return stored;
	}

	routes(): LoomRoute[] {
		return [
			{ method: "POST", path: "/ingest", handler: (ctx) => this.handleIngest(ctx) },
			{ method: "GET", path: "/feed", handler: (ctx) => this.handleGetFeed(ctx) },
			{ method: "GET", path: "/feed/unread", handler: () => this.handleGetUnread() },
			{ method: "POST", path: "/feed/mark-read", handler: () => this.handleMarkRead() },
			{ method: "POST", path: "/save", handler: (ctx) => this.handleSave(ctx) },
			{ method: "DELETE", path: "/save/:id", handler: (ctx) => this.handleUnsave(ctx) },
			{ method: "GET", path: "/saved", handler: (ctx) => this.handleGetSaved(ctx) },
			{
				method: "DELETE",
				path: "/tenant/:tenantId",
				handler: (ctx) => this.handleRemoveTenant(ctx),
			},
			{ method: "GET", path: "/health", handler: () => this.handleHealth() },
		];
	}

	// ════════════════════════════════════════════════════════════════════
	// Route Handlers
	// ════════════════════════════════════════════════════════════════════

	/**
	 * POST /ingest — Receive a new published post from the queue consumer.
	 * Idempotent: duplicate tenant_id+post_slug is silently ignored.
	 */
	private async handleIngest(ctx: LoomRequestContext): Promise<Response> {
		const data = safeJsonParse<FeedIngestPayload | null>(await ctx.request.text(), null);

		if (!data?.tenantId || !data?.postSlug || !data?.postTitle) {
			return LoomResponse.badRequest("Missing required fields: tenantId, postSlug, postTitle");
		}

		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		try {
			this.sql.exec(
				`INSERT OR IGNORE INTO feed_items
				 (id, tenant_id, tenant_name, tenant_subdomain, post_slug, post_title, post_excerpt, post_image, published_at, ingested_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				id,
				data.tenantId,
				truncate(data.tenantName || "", MAX_NAME_LENGTH),
				truncate(data.tenantSubdomain || "", MAX_NAME_LENGTH),
				truncate(data.postSlug, MAX_SLUG_LENGTH),
				truncate(data.postTitle, MAX_TITLE_LENGTH),
				data.postExcerpt ? truncate(data.postExcerpt, MAX_EXCERPT_LENGTH) : null,
				data.postImage || null,
				data.publishedAt || now,
				now,
			);
		} catch (err) {
			this.log.errorWithCause("Feed ingest failed", err);
			return LoomResponse.error({
				code: "GROVE-LOOM-080",
				category: "bug",
				userMessage: "Failed to save feed item.",
				adminMessage: "Feed ingest INSERT failed in FeedDO.",
			});
		}

		// Ensure pruning alarm is scheduled
		await this.alarms.ensureScheduled(ALARM_INTERVAL_MS);

		return Response.json({ success: true, id });
	}

	/**
	 * GET /feed — Paginated feed, newest first.
	 * Query params: ?cursor={published_at}&limit={number}
	 */
	private async handleGetFeed(ctx: LoomRequestContext): Promise<Response> {
		const cursorTime = parseInt(ctx.query.get("cursor") || "0", 10) || 0;
		const cursorId = ctx.query.get("cursor_id") || "";
		const limit = Math.min(
			parseInt(ctx.query.get("limit") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE,
			MAX_PAGE_SIZE,
		);

		// Compound cursor: (published_at DESC, id DESC) for stable pagination
		// when multiple items share the same published_at timestamp
		const items =
			cursorTime > 0
				? this.sql.queryAll<Record<string, unknown>>(
						`SELECT id, tenant_id, tenant_name, tenant_subdomain, post_slug, post_title, post_excerpt, post_image, published_at, ingested_at
					 FROM feed_items
					 WHERE (published_at < ?) OR (published_at = ? AND id < ?)
					 ORDER BY published_at DESC, id DESC
					 LIMIT ?`,
						cursorTime,
						cursorTime,
						cursorId,
						limit + 1,
					)
				: this.sql.queryAll<Record<string, unknown>>(
						`SELECT id, tenant_id, tenant_name, tenant_subdomain, post_slug, post_title, post_excerpt, post_image, published_at, ingested_at
					 FROM feed_items
					 ORDER BY published_at DESC, id DESC
					 LIMIT ?`,
						limit + 1,
					);

		const hasMore = items.length > limit;
		const page = hasMore ? items.slice(0, limit) : items;
		const lastItem = page.length > 0 ? page[page.length - 1] : null;

		return Response.json({
			items: page,
			nextCursor: hasMore && lastItem ? (lastItem.published_at as number) : null,
			nextCursorId: hasMore && lastItem ? (lastItem.id as string) : null,
			hasMore,
		});
	}

	/**
	 * GET /feed/unread — Count of items since last-read timestamp.
	 */
	private handleGetUnread(): Response {
		const lastReadAt = this.state_data?.lastReadAt || 0;

		const result = this.sql.queryOne<{ count: number }>(
			"SELECT COUNT(*) as count FROM feed_items WHERE published_at > ?",
			lastReadAt,
		);

		return Response.json({
			unreadCount: result?.count || 0,
			lastReadAt,
		});
	}

	/**
	 * POST /feed/mark-read — Update last-read cursor to now.
	 */
	private handleMarkRead(): Response {
		const now = Math.floor(Date.now() / 1000);

		if (!this.state_data) {
			this.state_data = { userId: this.state.id.toString(), lastReadAt: now };
		} else {
			this.state_data.lastReadAt = now;
		}

		this.store.set("feed_state", this.state_data);

		return Response.json({ success: true, lastReadAt: now });
	}

	/**
	 * POST /save — Add an item to the user's saved list.
	 * Idempotent: duplicate tenant_id+post_slug is silently ignored.
	 */
	private async handleSave(ctx: LoomRequestContext): Promise<Response> {
		const data = safeJsonParse<SaveItemPayload | null>(await ctx.request.text(), null);

		if (!data?.tenantId || !data?.postSlug || !data?.postTitle) {
			return LoomResponse.badRequest("Missing required fields: tenantId, postSlug, postTitle");
		}

		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		try {
			this.sql.exec(
				`INSERT OR IGNORE INTO saved_items
				 (id, item_type, tenant_id, tenant_subdomain, post_slug, post_title, saved_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
				id,
				data.itemType || "bloom",
				data.tenantId,
				truncate(data.tenantSubdomain || "", MAX_NAME_LENGTH),
				truncate(data.postSlug, MAX_SLUG_LENGTH),
				truncate(data.postTitle, MAX_TITLE_LENGTH),
				now,
			);
		} catch (err) {
			this.log.errorWithCause("Save item failed", err);
			return LoomResponse.error({
				code: "GROVE-LOOM-080",
				category: "bug",
				userMessage: "Failed to save item.",
				adminMessage: "Save item INSERT failed in FeedDO.",
			});
		}

		return Response.json({ success: true, id }, { status: 201 });
	}

	/**
	 * DELETE /save/:id — Remove an item from the saved list.
	 */
	private handleUnsave(ctx: LoomRequestContext): Response {
		const { id } = ctx.params;

		try {
			this.sql.exec("DELETE FROM saved_items WHERE id = ?", id);
		} catch (err) {
			this.log.errorWithCause("Unsave failed", err);
			return LoomResponse.error({
				code: "GROVE-LOOM-080",
				category: "bug",
				userMessage: "Failed to remove saved item.",
				adminMessage: "Unsave DELETE failed in FeedDO.",
			});
		}

		return Response.json({ success: true });
	}

	/**
	 * GET /saved — Paginated saved list, newest first.
	 * Query params: ?cursor={saved_at}&limit={number}
	 */
	private handleGetSaved(ctx: LoomRequestContext): Response {
		const cursorTime = parseInt(ctx.query.get("cursor") || "0", 10) || 0;
		const cursorId = ctx.query.get("cursor_id") || "";
		const limit = Math.min(
			parseInt(ctx.query.get("limit") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE,
			MAX_PAGE_SIZE,
		);

		const items =
			cursorTime > 0
				? this.sql.queryAll<Record<string, unknown>>(
						`SELECT id, item_type, tenant_id, tenant_subdomain, post_slug, post_title, saved_at
					 FROM saved_items
					 WHERE (saved_at < ?) OR (saved_at = ? AND id < ?)
					 ORDER BY saved_at DESC, id DESC
					 LIMIT ?`,
						cursorTime,
						cursorTime,
						cursorId,
						limit + 1,
					)
				: this.sql.queryAll<Record<string, unknown>>(
						`SELECT id, item_type, tenant_id, tenant_subdomain, post_slug, post_title, saved_at
					 FROM saved_items
					 ORDER BY saved_at DESC, id DESC
					 LIMIT ?`,
						limit + 1,
					);

		const hasMore = items.length > limit;
		const page = hasMore ? items.slice(0, limit) : items;
		const lastItem = page.length > 0 ? page[page.length - 1] : null;

		return Response.json({
			items: page,
			nextCursor: hasMore && lastItem ? (lastItem.saved_at as number) : null,
			nextCursorId: hasMore && lastItem ? (lastItem.id as string) : null,
			hasMore,
		});
	}

	/**
	 * DELETE /tenant/:tenantId — Remove all feed items from an unfollowed tenant.
	 * Called when a user unfollows a grove.
	 */
	/**
	 * DELETE /tenant/:tenantId — Remove all feed items from an unfollowed tenant.
	 * Called when a user unfollows a grove.
	 *
	 * AUTH NOTE: FeedDO is only addressable via service bindings from the DO worker.
	 * The FeedDO namespace is never exposed to client-addressable code paths.
	 * Security relies on the DO addressing invariant (feed:{userId}).
	 */
	private handleRemoveTenant(ctx: LoomRequestContext): Response {
		const { tenantId } = ctx.params;

		try {
			this.sql.exec("DELETE FROM feed_items WHERE tenant_id = ?", tenantId);
		} catch (err) {
			this.log.errorWithCause("Remove tenant failed", err);
			return LoomResponse.error({
				code: "GROVE-LOOM-080",
				category: "bug",
				userMessage: "Failed to remove tenant items.",
				adminMessage: "Remove tenant DELETE failed in FeedDO.",
			});
		}

		return Response.json({ success: true });
	}

	/**
	 * GET /health — Health check with item counts.
	 */
	private handleHealth(): Response {
		const feedCount = this.sql.queryOne<{ count: number }>(
			"SELECT COUNT(*) as count FROM feed_items",
		);
		const savedCount = this.sql.queryOne<{ count: number }>(
			"SELECT COUNT(*) as count FROM saved_items",
		);

		return Response.json({
			status: "ok",
			feedItems: feedCount?.count || 0,
			savedItems: savedCount?.count || 0,
			lastReadAt: this.state_data?.lastReadAt || 0,
		});
	}

	// ════════════════════════════════════════════════════════════════════
	// Alarm — Pruning
	// ════════════════════════════════════════════════════════════════════

	protected async onAlarm(): Promise<void> {
		const cutoff = Math.floor(Date.now() / 1000) - RETENTION_SECONDS;

		this.sql.exec("DELETE FROM feed_items WHERE published_at < ?", cutoff);
		this.log.info("Pruned feed items", { cutoff });

		// Check if there are still items to prune in the future
		const remaining = this.sql.queryOne<{ count: number }>(
			"SELECT COUNT(*) as count FROM feed_items",
		);

		if ((remaining?.count || 0) > 0) {
			await this.alarms.schedule(ALARM_INTERVAL_MS);
		}
	}
}
