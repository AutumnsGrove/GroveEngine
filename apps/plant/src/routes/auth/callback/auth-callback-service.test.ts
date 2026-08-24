/**
 * Auth Callback Service Tests
 *
 * Unit tests for the session verification, identity resolution,
 * and onboarding upsert logic in auth-callback-service.ts.
 *
 * Functions under test:
 *   getSessionToken     — cookie extraction, redirect on missing
 *   fetchSessionData    — auth binding call, redirect on failure
 *   resolveOnboarding   — D1 lookup by groveauth_id then email
 *   upsertOnboarding    — create or update onboarding record
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { isRedirect } from "@sveltejs/kit";
import {
	getSessionToken,
	fetchSessionData,
	resolveOnboarding,
	upsertOnboarding,
} from "./auth-callback-service";
import type { GroveDatabase } from "@autumnsgrove/infra";

// ============================================================================
// Mock helpers
// ============================================================================

/**
 * Creates a mock GroveDatabase with chainable prepare/bind/first/run.
 * The `_bound` handle lets individual tests override first() / run()
 * return values via mockResolvedValueOnce.
 */
function createMockDb() {
	const boundStatement = {
		bind: vi.fn().mockReturnThis(),
		run: vi.fn().mockResolvedValue({ success: true }),
		first: vi.fn().mockResolvedValue(null),
	};
	return {
		prepare: vi.fn().mockReturnValue(boundStatement),
		execute: vi.fn().mockResolvedValue({ results: [], meta: { changes: 0 } }),
		transaction: vi.fn().mockImplementation(async (fn: () => unknown) => fn()),
		info: vi.fn().mockReturnValue({ name: "test-db" }),
		_bound: boundStatement,
	};
}

/** Minimal cookies stub */
function makeCookies(pairs: Record<string, string> = {}) {
	return {
		get: (name: string) => pairs[name],
		getAll: () => Object.keys(pairs).map((name) => ({ name })),
	};
}

/** Fake auth service binding */
function makeAuthBinding(response: { ok: boolean; status?: number; body?: unknown }) {
	return {
		fetch: vi.fn().mockResolvedValue({
			ok: response.ok,
			status: response.status ?? (response.ok ? 200 : 401),
			json: vi.fn().mockResolvedValue(response.body ?? {}),
		}),
	};
}

/** Minimal user fixture */
const TEST_USER = {
	id: "user-abc-123",
	email: "wanderer@grove.place",
	name: "Forest Wanderer",
	emailVerified: true,
};

/** Minimal session fixture */
const TEST_SESSION = {
	id: "sess-xyz",
	userId: TEST_USER.id,
	token: "tok-secret",
	expiresAt: "2099-01-01T00:00:00Z",
};

// ============================================================================
// getSessionToken
// ============================================================================

describe("getSessionToken", () => {
	it("returns the secure cookie when present", () => {
		const cookies = makeCookies({
			"__Secure-better-auth.session_token": "secure-tok",
		});
		const token = getSessionToken(cookies, "/auth/callback");
		expect(token).toBe("secure-tok");
	});

	it("falls back to the non-secure cookie when secure cookie is absent", () => {
		const cookies = makeCookies({
			"better-auth.session_token": "plain-tok",
		});
		const token = getSessionToken(cookies, "/auth/callback");
		expect(token).toBe("plain-tok");
	});

	it("prefers the secure cookie over the non-secure one", () => {
		const cookies = makeCookies({
			"__Secure-better-auth.session_token": "secure-tok",
			"better-auth.session_token": "plain-tok",
		});
		const token = getSessionToken(cookies, "/auth/callback");
		expect(token).toBe("secure-tok");
	});

	it("throws a redirect when neither cookie is present", () => {
		const cookies = makeCookies({});
		let threw = false;
		try {
			getSessionToken(cookies, "/auth/callback");
		} catch (e) {
			threw = true;
			expect(isRedirect(e)).toBe(true);
		}
		expect(threw).toBe(true);
	});

	it("redirect target is / (root) when no cookie", () => {
		const cookies = makeCookies({});
		try {
			getSessionToken(cookies, "/auth/callback");
		} catch (e: unknown) {
			expect(isRedirect(e)).toBe(true);
			// SvelteKit redirect objects carry a `location` property
			expect((e as { location: string }).location).toMatch(/^\//);
		}
	});

	it("does not throw when a session cookie exists", () => {
		const cookies = makeCookies({ "better-auth.session_token": "tok" });
		expect(() => getSessionToken(cookies, "/auth/callback")).not.toThrow();
	});
});

// ============================================================================
// fetchSessionData
// ============================================================================

describe("fetchSessionData", () => {
	it("returns user and session from a 200 response", async () => {
		const binding = makeAuthBinding({
			ok: true,
			body: { user: TEST_USER, session: TEST_SESSION },
		});
		const result = await fetchSessionData(
			binding,
			"https://auth.grove.place",
			"better-auth.session_token=tok",
			"/auth/callback",
		);
		expect(result.user).toEqual(TEST_USER);
		expect(result.session).toEqual(TEST_SESSION);
	});

	it("calls the auth binding with /api/auth/get-session", async () => {
		const binding = makeAuthBinding({
			ok: true,
			body: { user: TEST_USER, session: TEST_SESSION },
		});
		await fetchSessionData(
			binding,
			"https://auth.grove.place",
			"better-auth.session_token=tok",
			"/auth/callback",
		);
		expect(binding.fetch).toHaveBeenCalledOnce();
		const [url] = binding.fetch.mock.calls[0] as [string, unknown];
		expect(url).toBe("https://auth.grove.place/api/auth/get-session");
	});

	it("forwards the Cookie header to the auth binding", async () => {
		const binding = makeAuthBinding({
			ok: true,
			body: { user: TEST_USER, session: TEST_SESSION },
		});
		const cookieHeader = "better-auth.session_token=tok; other=val";
		await fetchSessionData(binding, "https://auth.grove.place", cookieHeader, "/auth/callback");
		const [, opts] = binding.fetch.mock.calls[0] as [string, { headers: Record<string, string> }];
		expect(opts.headers.Cookie).toBe(cookieHeader);
	});

	it("uses GET method", async () => {
		const binding = makeAuthBinding({
			ok: true,
			body: { user: TEST_USER, session: TEST_SESSION },
		});
		await fetchSessionData(binding, "https://auth.grove.place", "tok=x", "/auth/callback");
		const [, opts] = binding.fetch.mock.calls[0] as [string, { method: string }];
		expect(opts.method).toBe("GET");
	});

	it("throws a redirect when auth binding returns non-200", async () => {
		const binding = makeAuthBinding({ ok: false, status: 401 });
		let threw = false;
		try {
			await fetchSessionData(binding, "https://auth.grove.place", "tok=x", "/auth/callback");
		} catch (e) {
			threw = true;
			expect(isRedirect(e)).toBe(true);
		}
		expect(threw).toBe(true);
	});

	it("throws a redirect when response is 200 but has no user/session fields", async () => {
		const binding = makeAuthBinding({ ok: true, body: {} });
		let threw = false;
		try {
			await fetchSessionData(binding, "https://auth.grove.place", "tok=x", "/auth/callback");
		} catch (e) {
			threw = true;
			expect(isRedirect(e)).toBe(true);
		}
		expect(threw).toBe(true);
	});

	it("throws a redirect when response is 200 but only has session (no user)", async () => {
		const binding = makeAuthBinding({ ok: true, body: { session: TEST_SESSION } });
		let threw = false;
		try {
			await fetchSessionData(binding, "https://auth.grove.place", "tok=x", "/auth/callback");
		} catch (e) {
			threw = true;
			expect(isRedirect(e)).toBe(true);
		}
		expect(threw).toBe(true);
	});

	it("throws a redirect when network fetch throws", async () => {
		const binding = {
			fetch: vi.fn().mockRejectedValue(new Error("network timeout")),
		};
		let threw = false;
		try {
			await fetchSessionData(binding, "https://auth.grove.place", "tok=x", "/auth/callback");
		} catch (e) {
			threw = true;
			expect(isRedirect(e)).toBe(true);
		}
		expect(threw).toBe(true);
	});
});

// ============================================================================
// resolveOnboarding
// ============================================================================

describe("resolveOnboarding", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns null when no onboarding record exists", async () => {
		const mock = createMockDb();
		const result = await resolveOnboarding(
			mock as unknown as GroveDatabase,
			"uid-1",
			"a@b.com",
			"/",
		);
		expect(result).toBeNull();
	});

	it("queries by groveauth_id first", async () => {
		const mock = createMockDb();
		await resolveOnboarding(mock as unknown as GroveDatabase, "uid-1", "a@b.com", "/");
		const firstSql = (mock.prepare.mock.calls[0] as [string])[0];
		expect(firstSql).toContain("groveauth_id");
		expect(firstSql).toContain("user_onboarding");
	});

	it("returns the record when found by groveauth_id", async () => {
		const record = { id: "onb-1", tenant_id: null, profile_completed_at: null };
		const mock = createMockDb();
		mock._bound.first.mockResolvedValueOnce(record);
		const result = await resolveOnboarding(
			mock as unknown as GroveDatabase,
			"uid-1",
			"a@b.com",
			"/",
		);
		expect(result).toEqual(record);
	});

	it("does not query by email when groveauth_id lookup succeeds", async () => {
		const record = { id: "onb-1", tenant_id: null, profile_completed_at: null };
		const mock = createMockDb();
		mock._bound.first.mockResolvedValueOnce(record);
		await resolveOnboarding(mock as unknown as GroveDatabase, "uid-1", "a@b.com", "/");
		// Only one prepare call (groveauth_id lookup); no email fallback
		expect(mock.prepare).toHaveBeenCalledTimes(1);
	});

	it("falls back to email lookup when groveauth_id returns null", async () => {
		const mock = createMockDb();
		// first() returns null for groveauth_id, then finds by email
		mock._bound.first
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ id: "onb-2", tenant_id: null, profile_completed_at: null });

		await resolveOnboarding(mock as unknown as GroveDatabase, "uid-1", "a@b.com", "/");

		const sqlCalls = mock.prepare.mock.calls.map((c: any[]) => c[0]);
		const emailQuery = sqlCalls.find((s: string) => s.includes("LOWER(email)"));
		expect(emailQuery).toBeDefined();
	});

	it("lowercases the email in the fallback query", async () => {
		const mock = createMockDb();
		mock._bound.first
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ id: "onb-2", tenant_id: null, profile_completed_at: null });

		await resolveOnboarding(mock as unknown as GroveDatabase, "uid-1", "UPPER@GROVE.PLACE", "/");

		// Find the bind call that carries the email argument
		const bindCalls = mock._bound.bind.mock.calls as unknown[][];
		const emailBind = bindCalls.find((args) =>
			args.some((a) => typeof a === "string" && a.includes("@")),
		);
		expect(emailBind).toBeDefined();
		expect(emailBind!.some((a) => a === "upper@grove.place")).toBe(true);
	});

	it("updates groveauth_id when record found by email (migration path)", async () => {
		const mock = createMockDb();
		mock._bound.first
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce({ id: "onb-2", tenant_id: null, profile_completed_at: null });

		await resolveOnboarding(mock as unknown as GroveDatabase, "uid-new", "a@b.com", "/");

		const sqlCalls = mock.prepare.mock.calls.map((c: any[]) => c[0]);
		const updateCall = sqlCalls.find(
			(s: string) => s.includes("UPDATE user_onboarding") && s.includes("groveauth_id"),
		);
		expect(updateCall).toBeDefined();
	});

	it("returns the email-found record with original shape", async () => {
		const record = { id: "onb-2", tenant_id: "t-99", profile_completed_at: 1700000000 };
		const mock = createMockDb();
		mock._bound.first.mockResolvedValueOnce(null).mockResolvedValueOnce(record);

		const result = await resolveOnboarding(
			mock as unknown as GroveDatabase,
			"uid-1",
			"a@b.com",
			"/",
		);
		expect(result).toEqual(record);
	});

	it("throws redirect when groveauth_id query throws", async () => {
		const mock = createMockDb();
		mock._bound.first.mockRejectedValueOnce(new Error("D1 error"));

		let threw = false;
		try {
			await resolveOnboarding(mock as unknown as GroveDatabase, "uid-1", "a@b.com", "/");
		} catch (e) {
			threw = true;
			expect(isRedirect(e)).toBe(true);
		}
		expect(threw).toBe(true);
	});
});

// ============================================================================
// upsertOnboarding — existing user
// ============================================================================

describe("upsertOnboarding (existing user)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const existingRecord = {
		id: "onb-existing",
		tenant_id: null,
		profile_completed_at: null,
	};

	it("returns isNewUser=false for an existing record", async () => {
		const mock = createMockDb();
		const result = await upsertOnboarding(
			mock as unknown as GroveDatabase,
			existingRecord,
			TEST_USER,
			"/",
		);
		expect(result.isNewUser).toBe(false);
	});

	it("returns the onboardingId from the existing record", async () => {
		const mock = createMockDb();
		const result = await upsertOnboarding(
			mock as unknown as GroveDatabase,
			existingRecord,
			TEST_USER,
			"/",
		);
		expect(result.onboardingId).toBe("onb-existing");
	});

	it("issues an UPDATE user_onboarding with the onboarding id", async () => {
		const mock = createMockDb();
		await upsertOnboarding(mock as unknown as GroveDatabase, existingRecord, TEST_USER, "/");

		const sqlCalls = mock.prepare.mock.calls.map((c: any[]) => c[0]);
		const updateCall = sqlCalls.find(
			(s: string) => s.includes("UPDATE user_onboarding") && s.includes("auth_completed_at"),
		);
		expect(updateCall).toBeDefined();
	});

	it("marks email_verified via 'oauth' in the UPDATE for existing users", async () => {
		const mock = createMockDb();
		await upsertOnboarding(mock as unknown as GroveDatabase, existingRecord, TEST_USER, "/");

		const sqlCalls = mock.prepare.mock.calls.map((c: any[]) => c[0]);
		const updateSql = sqlCalls.find(
			(s: string) => s.includes("email_verified_via") && s.includes("oauth"),
		);
		expect(updateSql).toBeDefined();
	});

	it("returns tenantSubdomain=null when no tenant_id on record", async () => {
		const mock = createMockDb();
		const result = await upsertOnboarding(
			mock as unknown as GroveDatabase,
			{ ...existingRecord, tenant_id: null },
			TEST_USER,
			"/",
		);
		expect(result.tenantSubdomain).toBeNull();
	});

	it("resolves tenantSubdomain from tenants table when tenant_id present", async () => {
		const mock = createMockDb();
		mock._bound.first.mockResolvedValueOnce({ subdomain: "my-grove" });

		const result = await upsertOnboarding(
			mock as unknown as GroveDatabase,
			{ id: "onb-existing", tenant_id: "t-999", profile_completed_at: 1700000000 },
			TEST_USER,
			"/",
		);
		expect(result.tenantSubdomain).toBe("my-grove");
	});

	it("queries tenants table by tenant_id when resolving subdomain", async () => {
		const mock = createMockDb();
		mock._bound.first.mockResolvedValueOnce({ subdomain: "grove-home" });

		await upsertOnboarding(
			mock as unknown as GroveDatabase,
			{ id: "onb-existing", tenant_id: "t-999", profile_completed_at: null },
			TEST_USER,
			"/",
		);

		const sqlCalls = mock.prepare.mock.calls.map((c: any[]) => c[0]);
		const tenantQuery = sqlCalls.find((s: string) => s.includes("SELECT subdomain FROM tenants"));
		expect(tenantQuery).toBeDefined();
	});

	it("throws redirect when UPDATE user_onboarding fails", async () => {
		const mock = createMockDb();
		mock._bound.run.mockRejectedValueOnce(new Error("D1 write failed"));

		let threw = false;
		try {
			await upsertOnboarding(mock as unknown as GroveDatabase, existingRecord, TEST_USER, "/");
		} catch (e) {
			threw = true;
			expect(isRedirect(e)).toBe(true);
		}
		expect(threw).toBe(true);
	});
});

// ============================================================================
// upsertOnboarding — new user
// ============================================================================

describe("upsertOnboarding (new user)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns isNewUser=true when existingOnboarding is null", async () => {
		const mock = createMockDb();
		const result = await upsertOnboarding(mock as unknown as GroveDatabase, null, TEST_USER, "/");
		expect(result.isNewUser).toBe(true);
	});

	it("generates a UUID for onboardingId", async () => {
		const mock = createMockDb();
		const result = await upsertOnboarding(mock as unknown as GroveDatabase, null, TEST_USER, "/");
		expect(result.onboardingId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
	});

	it("returns tenantSubdomain=null for new users", async () => {
		const mock = createMockDb();
		const result = await upsertOnboarding(mock as unknown as GroveDatabase, null, TEST_USER, "/");
		expect(result.tenantSubdomain).toBeNull();
	});

	it("inserts a new row into user_onboarding", async () => {
		const mock = createMockDb();
		await upsertOnboarding(mock as unknown as GroveDatabase, null, TEST_USER, "/");

		const sqlCalls = mock.prepare.mock.calls.map((c: any[]) => c[0]);
		const insertCall = sqlCalls.find((s: string) => s.includes("INSERT INTO user_onboarding"));
		expect(insertCall).toBeDefined();
	});

	it("binds groveauth_id and email in the INSERT", async () => {
		const mock = createMockDb();
		await upsertOnboarding(mock as unknown as GroveDatabase, null, TEST_USER, "/");

		// bind calls include [onboardingId, groveauth_id, email, displayName]
		const bindCalls = mock._bound.bind.mock.calls as unknown[][];
		const insertBind = bindCalls.find(
			(args) => args.some((a) => a === TEST_USER.id) && args.some((a) => a === TEST_USER.email),
		);
		expect(insertBind).toBeDefined();
	});

	it("marks email_verified=1 and email_verified_via='oauth' in INSERT", async () => {
		const mock = createMockDb();
		await upsertOnboarding(mock as unknown as GroveDatabase, null, TEST_USER, "/");

		const sqlCalls = mock.prepare.mock.calls.map((c: any[]) => c[0]);
		const insertSql = sqlCalls.find((s: string) => s.includes("INSERT INTO user_onboarding"));
		expect(insertSql).toContain("email_verified");
		expect(insertSql).toContain("'oauth'");
	});

	it("uses email prefix as display name when user.name is absent", async () => {
		const mock = createMockDb();
		const user = { id: "uid-2", email: "tree@grove.place" };
		await upsertOnboarding(mock as unknown as GroveDatabase, null, user, "/");

		const bindCalls = mock._bound.bind.mock.calls as unknown[][];
		const insertBind = bindCalls.find((args) => args.some((a) => a === "tree@grove.place"));
		// display_name should be "tree" (email prefix)
		expect(insertBind).toBeDefined();
		expect(insertBind!.some((a) => a === "tree")).toBe(true);
	});

	it("normalizes email case before the INSERT (#1580)", async () => {
		const mock = createMockDb();
		const user = { id: "uid-3", email: "MiXedCase@Example.COM", name: "Mixed Case" };
		await upsertOnboarding(mock as unknown as GroveDatabase, null, user, "/");

		const bindCalls = mock._bound.bind.mock.calls as unknown[][];
		const insertBind = bindCalls.find((args) => args.some((a) => a === user.id));
		expect(insertBind).toBeDefined();
		expect(insertBind).toContain("mixedcase@example.com");
		expect(insertBind).not.toContain(user.email);
	});

	it("uses user.name as display name when present", async () => {
		const mock = createMockDb();
		await upsertOnboarding(mock as unknown as GroveDatabase, null, TEST_USER, "/");

		const bindCalls = mock._bound.bind.mock.calls as unknown[][];
		const insertBind = bindCalls.find((args) => args.some((a) => a === TEST_USER.email));
		expect(insertBind!.some((a) => a === "Forest Wanderer")).toBe(true);
	});

	it("throws redirect when INSERT fails", async () => {
		const mock = createMockDb();
		mock._bound.run.mockRejectedValueOnce(new Error("UNIQUE constraint failed"));

		let threw = false;
		try {
			await upsertOnboarding(mock as unknown as GroveDatabase, null, TEST_USER, "/");
		} catch (e) {
			threw = true;
			expect(isRedirect(e)).toBe(true);
		}
		expect(threw).toBe(true);
	});

	it("two calls with same user produce different onboardingIds", async () => {
		const mock1 = createMockDb();
		const mock2 = createMockDb();
		const r1 = await upsertOnboarding(mock1 as unknown as GroveDatabase, null, TEST_USER, "/");
		const r2 = await upsertOnboarding(mock2 as unknown as GroveDatabase, null, TEST_USER, "/");
		expect(r1.onboardingId).not.toBe(r2.onboardingId);
	});
});
