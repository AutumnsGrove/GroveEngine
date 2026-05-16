/**
 * Signup Flow — Integration Tests
 *
 * Tests the full free-tier signup sequence by calling the real service
 * functions in the same order the route handlers do — without HTTP.
 *
 * Scenarios covered:
 *   1. Happy path: free (wanderer) plan creates tenant end-to-end
 *   2. Idempotent tenant creation — second call skips duplicate
 *   3. IP rate limiting blocks excessive signups
 *   4. Missing prerequisites block plan selection
 *   5. Paid plan (seedling) does not create a tenant
 *   6. DB failure is surfaced, not silently swallowed
 *
 * Functions under test (imported from their canonical locations):
 *   createTenant, getTenantForOnboarding  — $lib/server/tenant
 *   checkFreeAccountIPLimit, logFreeAccountCreation — $lib/server/free-account-limits
 *   shouldSkipCheckout                    — $lib/server/onboarding-helper
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GroveDatabase } from "@autumnsgrove/infra";
import { createTenant, getTenantForOnboarding } from "$lib/server/tenant";
import type { CreateTenantInput } from "$lib/server/tenant";
import { checkFreeAccountIPLimit, logFreeAccountCreation } from "$lib/server/free-account-limits";
import { shouldSkipCheckout } from "$lib/server/onboarding-helper";

// ============================================================================
// Configurable mock DB
// ============================================================================

/**
 * Creates a stateful mock GroveDatabase.
 *
 * - `first()` returns items from `firstQueue` in order (FIFO), then falls
 *   back to `defaultFirst`.
 * - `run()` always resolves successfully by default; individual tests can
 *   override with `mockRun`.
 * - `calls` records every { sql, bindings } pair for assertion.
 */
function createMockDb(
	opts: {
		defaultFirst?: unknown;
		mockRun?: (sql: string) => Promise<{ success: boolean }>;
	} = {},
) {
	const calls: Array<{ sql: string; bindings: unknown[] }> = [];
	const firstQueue: unknown[] = [];

	const boundStatement = {
		bind: vi.fn().mockImplementation((...args: unknown[]) => {
			const last = calls[calls.length - 1];
			if (last) last.bindings = args;
			return boundStatement;
		}),
		run: vi.fn().mockImplementation(async () => {
			const last = calls[calls.length - 1];
			if (opts.mockRun) return opts.mockRun(last?.sql ?? "");
			return { success: true };
		}),
		first: vi.fn().mockImplementation(async () => {
			if (firstQueue.length > 0) return firstQueue.shift();
			return opts.defaultFirst ?? null;
		}),
	};

	const db = {
		prepare: vi.fn().mockImplementation((sql: string) => {
			calls.push({ sql, bindings: [] });
			return boundStatement;
		}),
		execute: vi.fn().mockResolvedValue({ results: [], meta: { changes: 0 } }),
		transaction: vi.fn().mockImplementation(async (fn: () => unknown) => fn()),
		info: vi.fn().mockReturnValue({ name: "test-db" }),
		/** Push items to be returned by first(), in order */
		_queueFirst: (...items: unknown[]) => {
			firstQueue.push(...items);
		},
		_bound: boundStatement,
		_calls: calls,
	};

	return db;
}

// ============================================================================
// Shared fixtures
// ============================================================================

function makeInput(overrides?: Partial<CreateTenantInput>): CreateTenantInput {
	return {
		onboardingId: "onb-integration-001",
		username: "forest-wanderer",
		displayName: "Forest Wanderer",
		email: "wanderer@grove.place",
		plan: "wanderer",
		favoriteColor: null,
		providerCustomerId: null,
		providerSubscriptionId: null,
		...overrides,
	};
}

// ============================================================================
// Scenario 1: Happy path — free tier signup
// ============================================================================

describe("Happy path: free (wanderer) plan signup", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shouldSkipCheckout returns true for wanderer — no payment needed", () => {
		expect(shouldSkipCheckout("wanderer")).toBe(true);
	});

	it("checkFreeAccountIPLimit allows a new IP with zero prior accounts", async () => {
		const db = createMockDb({ defaultFirst: { count: 0 } });
		const allowed = await checkFreeAccountIPLimit(db as unknown as GroveDatabase, "10.0.0.1");
		expect(allowed).toBe(true);
	});

	it("getTenantForOnboarding returns null before tenant is created", async () => {
		const db = createMockDb({ defaultFirst: null });
		const existing = await getTenantForOnboarding(
			db as unknown as GroveDatabase,
			"onb-integration-001",
		);
		expect(existing).toBeNull();
	});

	it("createTenant succeeds and returns tenantId + subdomain", async () => {
		const db = createMockDb({ defaultFirst: null });
		const input = makeInput();
		const result = await createTenant(db as unknown as GroveDatabase, input);
		expect(result.tenantId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
		);
		expect(result.subdomain).toBe("forest-wanderer");
	});

	it("logFreeAccountCreation inserts a log row after tenant creation", async () => {
		const db = createMockDb();
		await logFreeAccountCreation(db as unknown as GroveDatabase, "10.0.0.1");
		const logCall = db._calls.find((c) => c.sql.includes("INSERT INTO free_account_creation_log"));
		expect(logCall).toBeDefined();
		expect(logCall!.bindings).toContain("10.0.0.1");
	});

	it("full happy-path sequence: check limit → no existing tenant → create → log", async () => {
		// Each DB call gets its own mock so state doesn't cross-contaminate
		const limitDb = createMockDb({ defaultFirst: { count: 0 } });
		const tenantCheckDb = createMockDb({ defaultFirst: null });
		const createDb = createMockDb({ defaultFirst: null });
		const logDb = createMockDb();

		// Step 1: IP limit allows
		const allowed = await checkFreeAccountIPLimit(limitDb as unknown as GroveDatabase, "192.0.2.1");
		expect(allowed).toBe(true);

		// Step 2: No existing tenant
		const existing = await getTenantForOnboarding(
			tenantCheckDb as unknown as GroveDatabase,
			"onb-integration-001",
		);
		expect(existing).toBeNull();

		// Step 3: Create tenant
		const result = await createTenant(createDb as unknown as GroveDatabase, makeInput());
		expect(result.subdomain).toBe("forest-wanderer");

		// Step 4: Log creation
		await logFreeAccountCreation(logDb as unknown as GroveDatabase, "192.0.2.1");
		const logCall = logDb._calls.find((c) =>
			c.sql.includes("INSERT INTO free_account_creation_log"),
		);
		expect(logCall).toBeDefined();
	});
});

// ============================================================================
// Scenario 2: Idempotent tenant creation
// ============================================================================

describe("Idempotent tenant creation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getTenantForOnboarding returns existing tenant on second call", async () => {
		const db = createMockDb();
		db._queueFirst({ id: "tenant-already-exists", subdomain: "forest-wanderer" });

		const result = await getTenantForOnboarding(
			db as unknown as GroveDatabase,
			"onb-integration-001",
		);
		expect(result).toEqual({ tenantId: "tenant-already-exists", subdomain: "forest-wanderer" });
	});

	it("does not call createTenant when getTenantForOnboarding returns a record", async () => {
		// Simulate the idempotency guard the route handler performs:
		// if getTenantForOnboarding returns a result, skip createTenant entirely.
		const db = createMockDb();
		db._queueFirst({ id: "tenant-already-exists", subdomain: "forest-wanderer" });

		const existing = await getTenantForOnboarding(
			db as unknown as GroveDatabase,
			"onb-integration-001",
		);

		// Route handler logic: only call createTenant when existing is null
		let createCalled = false;
		if (!existing) {
			createCalled = true;
			await createTenant(db as unknown as GroveDatabase, makeInput());
		}

		expect(createCalled).toBe(false);
		expect(existing!.tenantId).toBe("tenant-already-exists");
	});

	it("returns the same subdomain on both calls (idempotent result)", async () => {
		// First check: no tenant
		const db1 = createMockDb({ defaultFirst: null });
		const first = await getTenantForOnboarding(
			db1 as unknown as GroveDatabase,
			"onb-integration-001",
		);
		expect(first).toBeNull();

		// After creation, second check finds the tenant
		const db2 = createMockDb();
		db2._queueFirst({ id: "t-new", subdomain: "forest-wanderer" });
		const second = await getTenantForOnboarding(
			db2 as unknown as GroveDatabase,
			"onb-integration-001",
		);
		expect(second!.subdomain).toBe("forest-wanderer");
	});
});

// ============================================================================
// Scenario 3: IP rate limiting
// ============================================================================

describe("IP rate limiting blocks excessive free signups", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("blocks when IP has reached the 3-account limit", async () => {
		const db = createMockDb({ defaultFirst: { count: 3 } });
		const allowed = await checkFreeAccountIPLimit(db as unknown as GroveDatabase, "203.0.113.5");
		expect(allowed).toBe(false);
	});

	it("blocks when IP has exceeded the limit (count > 3)", async () => {
		const db = createMockDb({ defaultFirst: { count: 10 } });
		const allowed = await checkFreeAccountIPLimit(db as unknown as GroveDatabase, "203.0.113.5");
		expect(allowed).toBe(false);
	});

	it("allows at count=2 (one slot remaining)", async () => {
		const db = createMockDb({ defaultFirst: { count: 2 } });
		const allowed = await checkFreeAccountIPLimit(db as unknown as GroveDatabase, "203.0.113.5");
		expect(allowed).toBe(true);
	});

	it("rate limit check queries free_account_creation_log with the IP", async () => {
		const db = createMockDb({ defaultFirst: { count: 0 } });
		await checkFreeAccountIPLimit(db as unknown as GroveDatabase, "198.51.100.7");

		const limitCall = db._calls.find((c) => c.sql.includes("free_account_creation_log"));
		expect(limitCall).toBeDefined();
		expect(limitCall!.bindings).toContain("198.51.100.7");
	});

	it("allows invalid IP without querying DB (fail-open)", async () => {
		const db = createMockDb();
		const allowed = await checkFreeAccountIPLimit(db as unknown as GroveDatabase, "not-an-ip!");
		expect(allowed).toBe(true);
		expect(db.prepare).not.toHaveBeenCalled();
	});
});

// ============================================================================
// Scenario 4: Missing prerequisites block plan selection
// ============================================================================

describe("Missing prerequisites block plan selection", () => {
	/**
	 * Mirrors the prerequisite check the /api/select-plan route performs
	 * before allowing tenant creation. Extracted here for testability.
	 */
	function canSelectPlan(onboarding: {
		profile_completed_at: number | null;
		email_verified: 0 | 1;
		auth_completed_at: number | null;
	}): { allowed: boolean; reason?: string } {
		if (!onboarding.profile_completed_at) {
			return { allowed: false, reason: "profile_not_complete" };
		}
		if (!onboarding.email_verified && !onboarding.auth_completed_at) {
			return { allowed: false, reason: "email_not_verified" };
		}
		return { allowed: true };
	}

	it("blocks when profile_completed_at is null", () => {
		const result = canSelectPlan({
			profile_completed_at: null,
			email_verified: 0,
			auth_completed_at: null,
		});
		expect(result.allowed).toBe(false);
		expect(result.reason).toBe("profile_not_complete");
	});

	it("blocks when profile complete but neither email_verified nor auth_completed_at", () => {
		const result = canSelectPlan({
			profile_completed_at: 1700000000,
			email_verified: 0,
			auth_completed_at: null,
		});
		expect(result.allowed).toBe(false);
		expect(result.reason).toBe("email_not_verified");
	});

	it("allows when profile complete and email_verified=1 (even without auth_completed_at)", () => {
		const result = canSelectPlan({
			profile_completed_at: 1700000000,
			email_verified: 1,
			auth_completed_at: null,
		});
		expect(result.allowed).toBe(true);
	});

	it("allows when profile complete and auth_completed_at set (even without explicit email_verified)", () => {
		// OAuth flow always sets auth_completed_at; this is the happy-path guard
		const result = canSelectPlan({
			profile_completed_at: 1700000000,
			email_verified: 0,
			auth_completed_at: 1700000001,
		});
		expect(result.allowed).toBe(true);
	});

	it("allows when all fields are present", () => {
		const result = canSelectPlan({
			profile_completed_at: 1700000000,
			email_verified: 1,
			auth_completed_at: 1700000001,
		});
		expect(result.allowed).toBe(true);
	});
});

// ============================================================================
// Scenario 5: Paid plan redirects to checkout (no tenant created)
// ============================================================================

describe("Paid plan skips tenant creation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("shouldSkipCheckout returns false for seedling", () => {
		expect(shouldSkipCheckout("seedling")).toBe(false);
	});

	it("shouldSkipCheckout returns false for sapling", () => {
		expect(shouldSkipCheckout("sapling")).toBe(false);
	});

	it("shouldSkipCheckout returns false for oak", () => {
		expect(shouldSkipCheckout("oak")).toBe(false);
	});

	it("shouldSkipCheckout returns false for evergreen", () => {
		expect(shouldSkipCheckout("evergreen")).toBe(false);
	});

	it("paid plan route does not call createTenant (verified via mock)", async () => {
		// Simulate the route handler decision branch:
		// if (!shouldSkipCheckout(plan)) → redirect to /checkout, no createTenant
		const db = createMockDb();
		const plan = "seedling";

		let tenantCreated = false;
		if (shouldSkipCheckout(plan)) {
			await createTenant(db as unknown as GroveDatabase, makeInput({ plan: "wanderer" }));
			tenantCreated = true;
		}

		expect(tenantCreated).toBe(false);
		// No DB calls made — createTenant was never invoked
		expect(db._calls).toHaveLength(0);
	});

	it("wanderer plan does call createTenant (control case)", async () => {
		const db = createMockDb({ defaultFirst: null });
		const plan = "wanderer";

		let tenantCreated = false;
		if (shouldSkipCheckout(plan)) {
			await createTenant(db as unknown as GroveDatabase, makeInput({ plan: "wanderer" }));
			tenantCreated = true;
		}

		expect(tenantCreated).toBe(true);
		expect(db._calls.length).toBeGreaterThan(0);
	});
});

// ============================================================================
// Scenario 6: DB failure handling
// ============================================================================

describe("DB failure handling", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("createTenant re-throws when the tenants INSERT fails", async () => {
		const db = createMockDb({
			mockRun: async (sql) => {
				if (sql.includes("INSERT INTO tenants")) {
					throw new Error("D1: UNIQUE constraint failed: tenants.subdomain");
				}
				return { success: true };
			},
		});

		await expect(createTenant(db as unknown as GroveDatabase, makeInput())).rejects.toThrow(
			"UNIQUE constraint",
		);
	});

	it("createTenant re-throws when platform_billing INSERT fails", async () => {
		let calls = 0;
		const db = createMockDb({
			mockRun: async (sql) => {
				calls++;
				// First run = tenants INSERT (succeeds), second = platform_billing (fails)
				if (sql.includes("INSERT INTO platform_billing")) {
					throw new Error("D1: platform_billing insert error");
				}
				return { success: true };
			},
		});

		await expect(createTenant(db as unknown as GroveDatabase, makeInput())).rejects.toThrow(
			"platform_billing insert error",
		);
	});

	it("checkFreeAccountIPLimit propagates D1 errors to the caller", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockRejectedValue(new Error("D1 connection refused")),
				}),
			}),
			execute: vi.fn(),
			transaction: vi.fn(),
			info: vi.fn(),
		} as unknown as GroveDatabase;

		await expect(checkFreeAccountIPLimit(db, "10.0.0.1")).rejects.toThrow("D1 connection refused");
	});

	it("logFreeAccountCreation propagates D1 write errors", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					run: vi.fn().mockRejectedValue(new Error("D1 write failed")),
				}),
			}),
			execute: vi.fn(),
			transaction: vi.fn(),
			info: vi.fn(),
		} as unknown as GroveDatabase;

		await expect(logFreeAccountCreation(db, "10.0.0.1")).rejects.toThrow("D1 write failed");
	});

	it("getTenantForOnboarding propagates D1 errors", async () => {
		const db = {
			prepare: vi.fn().mockReturnValue({
				bind: vi.fn().mockReturnValue({
					first: vi.fn().mockRejectedValue(new Error("D1 read failed")),
				}),
			}),
			execute: vi.fn(),
			transaction: vi.fn(),
			info: vi.fn(),
		} as unknown as GroveDatabase;

		await expect(getTenantForOnboarding(db, "onb-fail")).rejects.toThrow("D1 read failed");
	});
});
