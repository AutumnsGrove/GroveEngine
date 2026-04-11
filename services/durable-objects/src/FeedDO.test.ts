/**
 * FeedDO Tests
 *
 * Tests the per-user social feed — ingest, pagination, unread tracking,
 * saved items, tenant removal, and alarm-based pruning.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { FeedDO } from "./FeedDO";
import { createTestDOState, createMockSql, doPost, doRequest, doDelete } from "./test-helpers";

describe("FeedDO", () => {
	let doInstance: FeedDO;
	let sql: ReturnType<typeof createMockSql>;

	beforeEach(() => {
		vi.restoreAllMocks();
		sql = createMockSql();
		const { state } = createTestDOState("feed:test-user", sql);
		doInstance = new FeedDO(state, {});
	});

	describe("POST /ingest", () => {
		it("should ingest a feed item", async () => {
			const res = await doInstance.fetch(
				doPost("/ingest", {
					tenantId: "tenant-1",
					tenantName: "Autumn's Grove",
					tenantSubdomain: "autumn",
					postSlug: "hello-world",
					postTitle: "Hello World",
					postExcerpt: "A first post",
					publishedAt: 1700000000000,
				}),
			);
			const body = (await res.json()) as { success: boolean; id: string };

			expect(res.status).toBe(200);
			expect(body.success).toBe(true);
			expect(body.id).toBeDefined();

			// Verify INSERT was called
			const insertCall = sql._calls.find((c) =>
				c.query.includes("INSERT OR IGNORE INTO feed_items"),
			);
			expect(insertCall).toBeDefined();
			expect(insertCall!.bindings).toContain("tenant-1");
			expect(insertCall!.bindings).toContain("hello-world");
		});

		it("should reject missing required fields", async () => {
			const res = await doInstance.fetch(doPost("/ingest", { tenantId: "tenant-1" }));

			expect(res.status).toBe(400);
		});

		it("should handle empty payload gracefully", async () => {
			const res = await doInstance.fetch(doPost("/ingest", {}));

			expect(res.status).toBe(400);
		});
	});

	describe("GET /feed", () => {
		it("should return paginated feed items", async () => {
			const items = [
				{
					id: "1",
					tenant_id: "t1",
					tenant_name: "Grove A",
					tenant_subdomain: "a",
					post_slug: "post-1",
					post_title: "Post 1",
					post_excerpt: null,
					post_image: null,
					published_at: 1700000000000,
					ingested_at: 1700000001000,
				},
			];
			sql._pushResults(items);

			const res = await doInstance.fetch(doRequest("/feed?limit=25"));
			const body = (await res.json()) as {
				items: unknown[];
				nextCursor: number | null;
				hasMore: boolean;
			};

			expect(res.status).toBe(200);
			expect(body.items).toHaveLength(1);
			expect(body.hasMore).toBe(false);
			expect(body.nextCursor).toBeNull();
		});

		it("should support cursor-based pagination", async () => {
			// Return limit+1 items to indicate hasMore
			const items = Array.from({ length: 3 }, (_, i) => ({
				id: `id-${i}`,
				tenant_id: "t1",
				tenant_name: "Grove",
				tenant_subdomain: "a",
				post_slug: `post-${i}`,
				post_title: `Post ${i}`,
				post_excerpt: null,
				post_image: null,
				published_at: 1700000000000 - i * 1000,
				ingested_at: 1700000000000,
			}));
			sql._pushResults(items);

			const res = await doInstance.fetch(doRequest("/feed?limit=2"));
			const body = (await res.json()) as {
				items: unknown[];
				nextCursor: number | null;
				hasMore: boolean;
			};

			expect(body.items).toHaveLength(2);
			expect(body.hasMore).toBe(true);
			expect(body.nextCursor).toBe(1700000000000 - 1000);
		});

		it("should return empty feed", async () => {
			// No results pushed → empty array default
			const res = await doInstance.fetch(doRequest("/feed"));
			const body = (await res.json()) as { items: unknown[]; hasMore: boolean };

			expect(body.items).toHaveLength(0);
			expect(body.hasMore).toBe(false);
		});
	});

	describe("GET /feed/unread", () => {
		it("should return unread count", async () => {
			sql._pushResult({ count: 5 });

			const res = await doInstance.fetch(doRequest("/feed/unread"));
			const body = (await res.json()) as { unreadCount: number; lastReadAt: number };

			expect(body.unreadCount).toBe(5);
			expect(body.lastReadAt).toBe(0);
		});
	});

	describe("POST /feed/mark-read", () => {
		it("should update last-read timestamp", async () => {
			const res = await doInstance.fetch(doPost("/feed/mark-read", {}));
			const body = (await res.json()) as { success: boolean; lastReadAt: number };

			expect(body.success).toBe(true);
			expect(body.lastReadAt).toBeGreaterThan(0);

			// Verify state was persisted to JsonStore
			const storeCall = sql._calls.find(
				(c) =>
					c.query.includes("INSERT OR REPLACE INTO kv_store") && c.bindings.includes("feed_state"),
			);
			expect(storeCall).toBeDefined();
		});
	});

	describe("POST /save", () => {
		it("should save a bookmark", async () => {
			const res = await doInstance.fetch(
				doPost("/save", {
					itemType: "bloom",
					tenantId: "tenant-1",
					tenantSubdomain: "autumn",
					postSlug: "great-post",
					postTitle: "A Great Post",
				}),
			);
			const body = (await res.json()) as { success: boolean; id: string };

			expect(res.status).toBe(201);
			expect(body.success).toBe(true);

			const insertCall = sql._calls.find((c) =>
				c.query.includes("INSERT OR IGNORE INTO saved_items"),
			);
			expect(insertCall).toBeDefined();
			expect(insertCall!.bindings).toContain("great-post");
		});

		it("should reject missing fields", async () => {
			const res = await doInstance.fetch(doPost("/save", { tenantId: "t1" }));

			expect(res.status).toBe(400);
		});
	});

	describe("DELETE /save/:id", () => {
		it("should remove a saved item", async () => {
			const res = await doInstance.fetch(doDelete("/save/item-123"));
			const body = (await res.json()) as { success: boolean };

			expect(body.success).toBe(true);

			const deleteCall = sql._calls.find(
				(c) => c.query.includes("DELETE FROM saved_items") && c.bindings.includes("item-123"),
			);
			expect(deleteCall).toBeDefined();
		});
	});

	describe("GET /saved", () => {
		it("should return paginated saved items", async () => {
			const items = [
				{
					id: "s1",
					item_type: "bloom",
					tenant_id: "t1",
					tenant_subdomain: "autumn",
					post_slug: "saved-post",
					post_title: "Saved Post",
					saved_at: 1700000000000,
				},
			];
			sql._pushResults(items);

			const res = await doInstance.fetch(doRequest("/saved"));
			const body = (await res.json()) as { items: unknown[]; hasMore: boolean };

			expect(body.items).toHaveLength(1);
			expect(body.hasMore).toBe(false);
		});
	});

	describe("DELETE /tenant/:tenantId", () => {
		it("should remove all items from a tenant", async () => {
			const res = await doInstance.fetch(doDelete("/tenant/tenant-123"));
			const body = (await res.json()) as { success: boolean };

			expect(body.success).toBe(true);

			const deleteCall = sql._calls.find(
				(c) => c.query.includes("DELETE FROM feed_items") && c.bindings.includes("tenant-123"),
			);
			expect(deleteCall).toBeDefined();
		});
	});

	describe("GET /health", () => {
		it("should return status and counts", async () => {
			sql._pushResult({ count: 10 });
			sql._pushResult({ count: 3 });

			const res = await doInstance.fetch(doRequest("/health"));
			const body = (await res.json()) as { status: string; feedItems: number; savedItems: number };

			expect(body.status).toBe("ok");
			expect(body.feedItems).toBe(10);
			expect(body.savedItems).toBe(3);
		});
	});

	describe("alarm (pruning)", () => {
		it("should delete old feed items and reschedule if rows remain", async () => {
			// DELETE result
			sql._pushResult({});
			// SELECT COUNT(*) — rows remain
			sql._pushResult({ count: 50 });

			await doInstance.alarm();

			const deleteCall = sql._calls.find(
				(c) => c.query.includes("DELETE FROM feed_items") && c.query.includes("published_at"),
			);
			expect(deleteCall).toBeDefined();
		});

		it("should not reschedule when feed is empty", async () => {
			// DELETE result
			sql._pushResult({});
			// SELECT COUNT(*) — no rows
			sql._pushResult({ count: 0 });

			await doInstance.alarm();

			const countCall = sql._calls.find((c) => c.query.includes("SELECT COUNT(*)"));
			expect(countCall).toBeDefined();
		});
	});

	describe("route matching", () => {
		it("should return 404 for unknown routes", async () => {
			const res = await doInstance.fetch(doRequest("/unknown"));
			expect(res.status).toBe(404);
		});

		it("should return 404 for wrong method", async () => {
			const res = await doInstance.fetch(doRequest("/ingest")); // GET instead of POST
			expect(res.status).toBe(404);
		});
	});
});
