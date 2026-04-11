/**
 * Subscriptions API Tests
 *
 * Tests POST (subscribe), DELETE (unsubscribe), and GET (check status) endpoints.
 * Mocks the subscriptions service at the boundary.
 *
 * User-scoped: endpoints use locals.user.id directly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, DELETE, GET } from "./[tenantId]/+server";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@autumnsgrove/lattice/platform/threshold/factory", () => ({
	createThreshold: vi.fn(() => null),
}));

vi.mock("@autumnsgrove/lattice/platform/threshold/sveltekit", () => ({
	thresholdCheck: vi.fn(),
}));

vi.mock("@autumnsgrove/lattice/server/services/subscriptions", () => ({
	subscribe: vi.fn(),
	unsubscribe: vi.fn(),
	isSubscribed: vi.fn(),
}));

import {
	subscribe,
	unsubscribe,
	isSubscribed,
} from "@autumnsgrove/lattice/server/services/subscriptions";

// ── Helpers ─────────────────────────────────────────────────────────────────

const TEST_USER = { id: "user-1", email: "test@example.com" };
const VALID_TENANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

function createMockDB() {
	return {
		prepare: vi.fn(() => ({
			bind: vi.fn().mockReturnThis(),
			all: vi.fn().mockResolvedValue({ results: [] }),
			first: vi.fn().mockResolvedValue(null),
			run: vi.fn().mockResolvedValue({ success: true, meta: { changes: 1 } }),
		})),
	};
}

function createPOSTEvent(
	tenantId: string,
	db: ReturnType<typeof createMockDB>,
	user = TEST_USER,
	body: Record<string, unknown> = {},
) {
	return {
		params: { tenantId },
		request: new Request("https://example.com/api/subscriptions/" + tenantId, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
		platform: { env: { DB: db } },
		locals: { user, tenantId: "user-own-tenant" },
	} as unknown as Parameters<typeof POST>[0];
}

function createDELETEEvent(
	tenantId: string,
	db: ReturnType<typeof createMockDB>,
	user = TEST_USER,
) {
	return {
		params: { tenantId },
		platform: { env: { DB: db } },
		locals: { user },
	} as unknown as Parameters<typeof DELETE>[0];
}

function createGETEvent(tenantId: string, db: ReturnType<typeof createMockDB>, user = TEST_USER) {
	return {
		params: { tenantId },
		platform: { env: { DB: db } },
		locals: { user },
	} as unknown as Parameters<typeof GET>[0];
}

// ── POST /api/subscriptions/[tenantId] ─────────────────────────────────────

describe("POST /api/subscriptions/[tenantId]", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should subscribe and return success", async () => {
		vi.mocked(subscribe).mockResolvedValue({ created: true });

		const db = createMockDB();
		const response = await POST(createPOSTEvent(VALID_TENANT_ID, db));
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.subscribed).toBe(true);
		expect(data.created).toBe(true);
	});

	it("should pass timezone from request body", async () => {
		vi.mocked(subscribe).mockResolvedValue({ created: true });

		const db = createMockDB();
		await POST(createPOSTEvent(VALID_TENANT_ID, db, TEST_USER, { timezone: "Europe/London" }));

		expect(subscribe).toHaveBeenCalledWith(
			db,
			"user-1",
			"test@example.com",
			VALID_TENANT_ID,
			"Europe/London",
		);
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		const event = createPOSTEvent(VALID_TENANT_ID, db, null as any);

		await expect(POST(event)).rejects.toThrow();
	});

	it("should reject invalid UUID tenant ID", async () => {
		const db = createMockDB();
		const event = createPOSTEvent("not-a-uuid", db);

		await expect(POST(event)).rejects.toThrow();
	});

	it("should prevent self-subscription", async () => {
		const db = createMockDB();
		// Create event where the user's own tenantId matches the target
		const event = {
			params: { tenantId: "user-own-tenant" },
			request: new Request("https://example.com/api/subscriptions/user-own-tenant", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({}),
			}),
			platform: { env: { DB: db } },
			locals: { user: TEST_USER, tenantId: "user-own-tenant" },
		} as unknown as Parameters<typeof POST>[0];

		await expect(POST(event)).rejects.toThrow();
	});

	it("should handle idempotent subscription (already exists)", async () => {
		vi.mocked(subscribe).mockResolvedValue({ created: false });

		const db = createMockDB();
		const response = await POST(createPOSTEvent(VALID_TENANT_ID, db));
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.created).toBe(false);
	});
});

// ── DELETE /api/subscriptions/[tenantId] ────────────────────────────────────

describe("DELETE /api/subscriptions/[tenantId]", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should unsubscribe and return success", async () => {
		vi.mocked(unsubscribe).mockResolvedValue(true);

		const db = createMockDB();
		const response = await DELETE(createDELETEEvent(VALID_TENANT_ID, db));
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.success).toBe(true);
		expect(data.subscribed).toBe(false);
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		const event = createDELETEEvent(VALID_TENANT_ID, db, null as any);

		await expect(DELETE(event)).rejects.toThrow();
	});

	it("should reject invalid UUID tenant ID", async () => {
		const db = createMockDB();
		const event = createDELETEEvent("not-a-uuid", db);

		await expect(DELETE(event)).rejects.toThrow();
	});

	it("should call unsubscribe with user ID and tenant ID", async () => {
		vi.mocked(unsubscribe).mockResolvedValue(true);

		const db = createMockDB();
		await DELETE(createDELETEEvent(VALID_TENANT_ID, db));

		expect(unsubscribe).toHaveBeenCalledWith(db, "user-1", VALID_TENANT_ID);
	});
});

// ── GET /api/subscriptions/[tenantId] ──────────────────────────────────────

describe("GET /api/subscriptions/[tenantId]", () => {
	beforeEach(() => vi.clearAllMocks());

	it("should return subscribed=true when subscribed", async () => {
		vi.mocked(isSubscribed).mockResolvedValue(true);

		const db = createMockDB();
		const response = await GET(createGETEvent(VALID_TENANT_ID, db));
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.subscribed).toBe(true);
	});

	it("should return subscribed=false when not subscribed", async () => {
		vi.mocked(isSubscribed).mockResolvedValue(false);

		const db = createMockDB();
		const response = await GET(createGETEvent(VALID_TENANT_ID, db));
		const data = (await response.json()) as any;

		expect(response.status).toBe(200);
		expect(data.subscribed).toBe(false);
	});

	it("should reject unauthenticated requests", async () => {
		const db = createMockDB();
		const event = createGETEvent(VALID_TENANT_ID, db, null as any);

		await expect(GET(event)).rejects.toThrow();
	});

	it("should reject invalid UUID tenant ID", async () => {
		const db = createMockDB();
		const event = createGETEvent("not-a-uuid", db);

		await expect(GET(event)).rejects.toThrow();
	});

	it("should call isSubscribed with user ID and tenant ID", async () => {
		vi.mocked(isSubscribed).mockResolvedValue(false);

		const db = createMockDB();
		await GET(createGETEvent(VALID_TENANT_ID, db));

		expect(isSubscribed).toHaveBeenCalledWith(db, "user-1", VALID_TENANT_ID);
	});
});
