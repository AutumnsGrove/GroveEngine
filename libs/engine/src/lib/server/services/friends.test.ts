/**
 * Friends Service Unit Tests
 *
 * Tests the service layer that owns all friends SQL queries.
 * Mocks D1 at the prepare() boundary since the queries use INSERT OR IGNORE
 * and LIKE with ESCAPE which the in-memory mock D1 doesn't support.
 *
 * User-scoped: all functions use user_id as the primary scope.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { listFriends, addFriend, removeFriend, isFriend, searchTenants } from "./friends";

// ── Helpers ─────────────────────────────────────────────────────────────────

function createMockDB(overrides?: {
	allResults?: unknown[];
	firstResult?: unknown;
	changes?: number;
}) {
	const allResults = overrides?.allResults ?? [];
	const firstResult = overrides?.firstResult ?? null;
	const changes = overrides?.changes ?? 1;

	return {
		prepare: vi.fn(() => ({
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({ results: allResults }),
			first: vi.fn().mockResolvedValue(firstResult),
			run: vi.fn().mockResolvedValue({ success: true, meta: { changes } }),
		})),
	} as unknown as D1Database;
}

// ── listFriends ─────────────────────────────────────────────────────────────

describe("listFriends", () => {
	it("should return mapped friends from D1 results", async () => {
		const db = createMockDB({
			allResults: [
				{
					friend_tenant_id: "friend-1",
					friend_name: "Art's Grove",
					friend_subdomain: "a2a0",
					source: "manual",
				},
				{
					friend_tenant_id: "friend-2",
					friend_name: "River's Place",
					friend_subdomain: "river",
					source: "manual",
				},
			],
		});

		const result = await listFriends(db, "user-1");

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			tenantId: "friend-1",
			name: "Art's Grove",
			subdomain: "a2a0",
			source: "manual",
		});
		expect(result[1]).toEqual({
			tenantId: "friend-2",
			name: "River's Place",
			subdomain: "river",
			source: "manual",
		});
	});

	it("should return empty array when no friends exist", async () => {
		const db = createMockDB({ allResults: [] });

		const result = await listFriends(db, "user-1");

		expect(result).toEqual([]);
	});

	it("should query the friends table scoped to user_id", async () => {
		const db = createMockDB();
		await listFriends(db, "user-1");

		const prepareCall = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(prepareCall).toContain("FROM friends");
		expect(prepareCall).toContain("WHERE user_id = ?");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind;
		expect(bindCall).toHaveBeenCalledWith("user-1");
	});
});

// ── addFriend ───────────────────────────────────────────────────────────────

describe("addFriend", () => {
	it("should return friend when subdomain resolves to a tenant", async () => {
		const db = createMockDB({
			firstResult: { id: "friend-tenant", subdomain: "a2a0", display_name: "Art's Grove" },
		});

		const result = await addFriend(db, "user-1", "a2a0");

		expect("friend" in result).toBe(true);
		if ("friend" in result) {
			expect(result.friend).toEqual({
				tenantId: "friend-tenant",
				name: "Art's Grove",
				subdomain: "a2a0",
				source: "manual",
			});
		}
	});

	it("should return not_found error when subdomain doesn't exist", async () => {
		const db = createMockDB({ firstResult: null });

		const result = await addFriend(db, "user-1", "nonexistent");

		expect(result).toEqual({ error: "not_found" });
	});

	it("should return self_add error when adding own grove", async () => {
		const db = createMockDB({
			firstResult: { id: "home-tenant", subdomain: "autumn", display_name: "My Grove" },
		});

		const result = await addFriend(db, "user-1", "autumn", "home-tenant");

		expect(result).toEqual({ error: "self_add" });
	});

	it("should allow grove-less users to follow (no self_add check without tenantId)", async () => {
		const db = createMockDB({
			firstResult: { id: "any-tenant", subdomain: "a2a0", display_name: "Art" },
		});

		const result = await addFriend(db, "user-1", "a2a0");

		expect("friend" in result).toBe(true);
	});

	it("should use INSERT OR IGNORE for duplicate handling", async () => {
		const db = createMockDB({
			firstResult: { id: "friend-tenant", subdomain: "a2a0", display_name: "Art" },
		});

		await addFriend(db, "user-1", "a2a0");

		// Second prepare call is the INSERT
		const insertCall = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[1][0] as string;
		expect(insertCall).toContain("INSERT OR IGNORE INTO friends");
	});

	it("should store tenant_id when user has a grove", async () => {
		const db = createMockDB({
			firstResult: { id: "friend-tenant", subdomain: "a2a0", display_name: "Art" },
		});

		await addFriend(db, "user-1", "a2a0", "home-tenant");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[1].value.bind;
		expect(bindCall).toHaveBeenCalledWith("user-1", "home-tenant", "friend-tenant", "Art", "a2a0");
	});

	it("should store null tenant_id when user has no grove", async () => {
		const db = createMockDB({
			firstResult: { id: "friend-tenant", subdomain: "a2a0", display_name: "Art" },
		});

		await addFriend(db, "user-1", "a2a0");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[1].value.bind;
		expect(bindCall).toHaveBeenCalledWith("user-1", null, "friend-tenant", "Art", "a2a0");
	});
});

// ── removeFriend ────────────────────────────────────────────────────────────

describe("removeFriend", () => {
	it("should return true when connection existed (changes > 0)", async () => {
		const db = createMockDB({ changes: 1 });

		const result = await removeFriend(db, "user-1", "friend-tenant");

		expect(result).toBe(true);
	});

	it("should return false when connection didn't exist (changes = 0)", async () => {
		const db = createMockDB({ changes: 0 });

		const result = await removeFriend(db, "user-1", "nonexistent");

		expect(result).toBe(false);
	});

	it("should use a single DELETE query (no SELECT round-trip)", async () => {
		const db = createMockDB({ changes: 1 });

		await removeFriend(db, "user-1", "friend-tenant");

		// Only one prepare call — the DELETE
		expect(db.prepare).toHaveBeenCalledTimes(1);
		const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(sql).toContain("DELETE FROM friends");
	});

	it("should scope deletion to the user and friend pair", async () => {
		const db = createMockDB({ changes: 1 });

		await removeFriend(db, "user-1", "friend-tenant");

		const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(sql).toContain("user_id = ?");
		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind;
		expect(bindCall).toHaveBeenCalledWith("user-1", "friend-tenant");
	});
});

// ── isFriend ────────────────────────────────────────────────────────────────

describe("isFriend", () => {
	it("should return true when connection exists", async () => {
		const db = createMockDB({ firstResult: { "1": 1 } });

		const result = await isFriend(db, "user-1", "friend");

		expect(result).toBe(true);
	});

	it("should return false when connection doesn't exist", async () => {
		const db = createMockDB({ firstResult: null });

		const result = await isFriend(db, "user-1", "nobody");

		expect(result).toBe(false);
	});

	it("should query by user_id", async () => {
		const db = createMockDB({ firstResult: null });
		await isFriend(db, "user-1", "friend");

		const sql = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(sql).toContain("user_id = ?");
	});
});

// ── searchTenants ───────────────────────────────────────────────────────────

describe("searchTenants", () => {
	it("should return mapped search results", async () => {
		const db = createMockDB({
			allResults: [{ id: "t-1", subdomain: "a2a0", display_name: "Art's Grove" }],
		});

		const result = await searchTenants(db, "a2a0", "exclude-me");

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			tenantId: "t-1",
			name: "Art's Grove",
			subdomain: "a2a0",
		});
	});

	it("should escape LIKE wildcards in user input", async () => {
		const db = createMockDB();

		await searchTenants(db, "test%name", "exclude-me");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind;
		expect(bindCall).toHaveBeenCalledWith("%test\\%name%", "%test\\%name%", "exclude-me");
	});

	it("should escape underscore wildcards", async () => {
		const db = createMockDB();

		await searchTenants(db, "test_name", "exclude-me");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind;
		expect(bindCall).toHaveBeenCalledWith("%test\\_name%", "%test\\_name%", "exclude-me");
	});

	it("should exclude the specified tenant from results", async () => {
		const db = createMockDB();

		await searchTenants(db, "grove", "my-tenant");

		const prepareCall = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(prepareCall).toContain("id != ?");

		const bindCall = (db.prepare as ReturnType<typeof vi.fn>).mock.results[0].value.bind;
		expect(bindCall).toHaveBeenCalledWith("%grove%", "%grove%", "my-tenant");
	});

	it("should limit results to 10", async () => {
		const db = createMockDB();

		await searchTenants(db, "grove", "");

		const prepareCall = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(prepareCall).toContain("LIMIT 10");
	});

	it("should use LOWER() for case-insensitive matching", async () => {
		const db = createMockDB();

		await searchTenants(db, "a2a0", "exclude-me");

		const prepareCall = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(prepareCall).toContain("LOWER(subdomain)");
		expect(prepareCall).toContain("LOWER(display_name)");
	});

	it("should only return active tenants", async () => {
		const db = createMockDB();

		await searchTenants(db, "grove", "");

		const prepareCall = (db.prepare as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(prepareCall).toContain("active = 1");
	});
});
