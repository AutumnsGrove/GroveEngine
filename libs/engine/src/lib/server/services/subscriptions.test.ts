/**
 * Subscriptions Service Tests
 *
 * Tests subscribe/unsubscribe, token lifecycle (creation, lookup, TTL),
 * timezone validation, and preference updates.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	subscribe,
	unsubscribe,
	unsubscribeByToken,
	lookupUnsubscribeToken,
	isSubscribed,
	getSubscribersForTenant,
	getUserSubscriptions,
	updatePreferences,
	getOrCreateUnsubscribeToken,
} from "./subscriptions";

// ── Mock D1 ────────────────────────────────────────────────────────────────

function createMockDB(overrides?: {
	firstResult?: unknown;
	allResults?: unknown[];
	runChanges?: number;
}) {
	const runResult = {
		success: true,
		meta: { changes: overrides?.runChanges ?? 1 },
	};

	return {
		prepare: vi.fn(() => ({
			bind: vi.fn().mockReturnThis(),
			first: vi.fn().mockResolvedValue(overrides?.firstResult ?? null),
			all: vi.fn().mockResolvedValue({ results: overrides?.allResults ?? [] }),
			run: vi.fn().mockResolvedValue(runResult),
		})),
	} as unknown as D1Database;
}

// ── subscribe ──────────────────────────────────────────────────────────────

describe("subscribe", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should insert a subscription and return created=true", async () => {
		const db = createMockDB({ runChanges: 1 });

		const result = await subscribe(db, "user-1", "test@example.com", "tenant-1");

		expect(result.created).toBe(true);
		expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT OR IGNORE"));
	});

	it("should return created=false for duplicate subscription (INSERT OR IGNORE)", async () => {
		const db = createMockDB({ runChanges: 0 });

		const result = await subscribe(db, "user-1", "test@example.com", "tenant-1");

		expect(result.created).toBe(false);
	});

	it("should use provided timezone when valid", async () => {
		const db = createMockDB();

		await subscribe(db, "user-1", "test@example.com", "tenant-1", "Europe/London");

		const prepareCall = vi.mocked(db.prepare).mock.results[0].value;
		const bindCall = prepareCall.bind.mock.calls[0];
		expect(bindCall[4]).toBe("Europe/London");
	});

	it("should fall back to America/New_York for invalid timezone", async () => {
		const db = createMockDB();

		await subscribe(db, "user-1", "test@example.com", "tenant-1", "Invalid/Timezone");

		const prepareCall = vi.mocked(db.prepare).mock.results[0].value;
		const bindCall = prepareCall.bind.mock.calls[0];
		expect(bindCall[4]).toBe("America/New_York");
	});

	it("should fall back to America/New_York when no timezone provided", async () => {
		const db = createMockDB();

		await subscribe(db, "user-1", "test@example.com", "tenant-1");

		const prepareCall = vi.mocked(db.prepare).mock.results[0].value;
		const bindCall = prepareCall.bind.mock.calls[0];
		expect(bindCall[4]).toBe("America/New_York");
	});
});

// ── unsubscribe ────────────────────────────────────────────────────────────

describe("unsubscribe", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should delete and return true when subscription exists", async () => {
		const db = createMockDB({ runChanges: 1 });

		const result = await unsubscribe(db, "user-1", "tenant-1");

		expect(result).toBe(true);
		expect(db.prepare).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM subscriptions"));
	});

	it("should return false when subscription doesn't exist", async () => {
		const db = createMockDB({ runChanges: 0 });

		const result = await unsubscribe(db, "user-1", "tenant-nonexistent");

		expect(result).toBe(false);
	});
});

// ── isSubscribed ───────────────────────────────────────────────────────────

describe("isSubscribed", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should return true when subscription exists", async () => {
		const db = createMockDB({ firstResult: { "1": 1 } });

		const result = await isSubscribed(db, "user-1", "tenant-1");

		expect(result).toBe(true);
	});

	it("should return false when subscription doesn't exist", async () => {
		const db = createMockDB({ firstResult: null });

		const result = await isSubscribed(db, "user-1", "tenant-1");

		expect(result).toBe(false);
	});
});

// ── lookupUnsubscribeToken ─────────────────────────────────────────────────

describe("lookupUnsubscribeToken", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should return grove name for valid token", async () => {
		const now = Math.floor(Date.now() / 1000);
		const db = createMockDB({
			firstResult: { token_created: now - 100, grove_name: "Autumn's Grove" },
		});

		const result = await lookupUnsubscribeToken(db, "valid-token");

		expect(result).toEqual({ groveName: "Autumn's Grove" });
	});

	it("should return null for nonexistent token", async () => {
		const db = createMockDB({ firstResult: null });

		const result = await lookupUnsubscribeToken(db, "bad-token");

		expect(result).toBeNull();
	});

	it("should return null for expired token (>30 days)", async () => {
		const thirtyOneDaysAgo = Math.floor(Date.now() / 1000) - 31 * 24 * 60 * 60;
		const db = createMockDB({
			firstResult: { token_created: thirtyOneDaysAgo, grove_name: "Old Grove" },
		});

		const result = await lookupUnsubscribeToken(db, "expired-token");

		expect(result).toBeNull();
	});

	it("should return grove name for token at exactly 30 days (still valid)", async () => {
		const exactlyThirtyDays = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
		const db = createMockDB({
			firstResult: { token_created: exactlyThirtyDays, grove_name: "Edge Grove" },
		});

		const result = await lookupUnsubscribeToken(db, "edge-token");

		expect(result).toEqual({ groveName: "Edge Grove" });
	});

	it("should fall back to 'this grove' when display_name is null", async () => {
		const now = Math.floor(Date.now() / 1000);
		const db = createMockDB({
			firstResult: { token_created: now - 100, grove_name: null },
		});

		const result = await lookupUnsubscribeToken(db, "valid-token");

		expect(result).toEqual({ groveName: "this grove" });
	});
});

// ── unsubscribeByToken ─────────────────────────────────────────────────────

describe("unsubscribeByToken", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should delete subscription for valid token", async () => {
		const now = Math.floor(Date.now() / 1000);
		const db = createMockDB({
			firstResult: { id: "sub-1", token_created: now - 100, grove_name: "Test Grove" },
		});

		const result = await unsubscribeByToken(db, "valid-token");

		expect(result.success).toBe(true);
		expect(result.groveName).toBe("Test Grove");
		// Should have called prepare twice: first for lookup, then for delete
		expect(db.prepare).toHaveBeenCalledTimes(2);
	});

	it("should return success=false for nonexistent token", async () => {
		const db = createMockDB({ firstResult: null });

		const result = await unsubscribeByToken(db, "bad-token");

		expect(result.success).toBe(false);
	});

	it("should return success=false for expired token", async () => {
		const thirtyOneDaysAgo = Math.floor(Date.now() / 1000) - 31 * 24 * 60 * 60;
		const db = createMockDB({
			firstResult: { id: "sub-1", token_created: thirtyOneDaysAgo, grove_name: "Old" },
		});

		const result = await unsubscribeByToken(db, "expired-token");

		expect(result.success).toBe(false);
		// Should NOT have called delete
		expect(db.prepare).toHaveBeenCalledTimes(1);
	});
});

// ── getSubscribersForTenant ────────────────────────────────────────────────

describe("getSubscribersForTenant", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should return mapped subscriber list", async () => {
		const db = createMockDB({
			allResults: [
				{
					id: "sub-1",
					user_id: "user-1",
					email: "test@example.com",
					preferred_hour: 9,
					timezone: "America/New_York",
				},
			],
		});

		const result = await getSubscribersForTenant(db, "tenant-1");

		expect(result).toEqual([
			{
				subscriptionId: "sub-1",
				userId: "user-1",
				email: "test@example.com",
				preferredHour: 9,
				timezone: "America/New_York",
			},
		]);
	});

	it("should return empty array when no subscribers", async () => {
		const db = createMockDB({ allResults: [] });

		const result = await getSubscribersForTenant(db, "tenant-empty");

		expect(result).toEqual([]);
	});
});

// ── getUserSubscriptions ───────────────────────────────────────────────────

describe("getUserSubscriptions", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should return subscriptions with grove info", async () => {
		const db = createMockDB({
			allResults: [
				{
					id: "sub-1",
					user_id: "user-1",
					target_tenant_id: "tenant-1",
					email: "test@example.com",
					preferred_hour: 9,
					timezone: "America/New_York",
					created_at: 1700000000,
					grove_name: "Autumn's Grove",
					grove_subdomain: "autumn",
				},
			],
		});

		const result = await getUserSubscriptions(db, "user-1");

		expect(result).toHaveLength(1);
		expect(result[0].groveName).toBe("Autumn's Grove");
		expect(result[0].groveSubdomain).toBe("autumn");
		expect(result[0].preferredHour).toBe(9);
	});
});

// ── updatePreferences ──────────────────────────────────────────────────────

describe("updatePreferences", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should update preferred hour", async () => {
		const db = createMockDB({ runChanges: 1 });

		const result = await updatePreferences(db, "user-1", "tenant-1", { preferredHour: 14 });

		expect(result).toBe(true);
	});

	it("should reject hour < 0", async () => {
		const db = createMockDB();

		const result = await updatePreferences(db, "user-1", "tenant-1", { preferredHour: -1 });

		expect(result).toBe(false);
	});

	it("should reject hour > 23", async () => {
		const db = createMockDB();

		const result = await updatePreferences(db, "user-1", "tenant-1", { preferredHour: 24 });

		expect(result).toBe(false);
	});

	it("should reject invalid timezone", async () => {
		const db = createMockDB();

		const result = await updatePreferences(db, "user-1", "tenant-1", {
			timezone: "Not/A/Timezone",
		});

		expect(result).toBe(false);
	});

	it("should accept valid timezone", async () => {
		const db = createMockDB({ runChanges: 1 });

		const result = await updatePreferences(db, "user-1", "tenant-1", {
			timezone: "Asia/Tokyo",
		});

		expect(result).toBe(true);
	});

	it("should return false when no preferences provided", async () => {
		const db = createMockDB();

		const result = await updatePreferences(db, "user-1", "tenant-1", {});

		expect(result).toBe(false);
	});

	it("should update both hour and timezone together", async () => {
		const db = createMockDB({ runChanges: 1 });

		const result = await updatePreferences(db, "user-1", "tenant-1", {
			preferredHour: 8,
			timezone: "Europe/Berlin",
		});

		expect(result).toBe(true);
	});
});

// ── getOrCreateUnsubscribeToken ────────────────────────────────────────────

describe("getOrCreateUnsubscribeToken", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should return existing token when one exists", async () => {
		const db = createMockDB({ firstResult: { token: "existing-token-uuid" } });

		const token = await getOrCreateUnsubscribeToken(db, "sub-1");

		expect(token).toBe("existing-token-uuid");
		// Should only prepare once (the SELECT), not the INSERT
		expect(db.prepare).toHaveBeenCalledTimes(1);
	});

	it("should create new token when none exists", async () => {
		const db = createMockDB({ firstResult: null });

		const token = await getOrCreateUnsubscribeToken(db, "sub-1");

		expect(token).toBeTruthy();
		expect(typeof token).toBe("string");
		// Should prepare twice: SELECT then INSERT
		expect(db.prepare).toHaveBeenCalledTimes(2);
	});
});
