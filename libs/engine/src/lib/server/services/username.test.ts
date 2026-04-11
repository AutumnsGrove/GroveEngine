/**
 * Username Service Tests
 *
 * Exercises the atomic batch produced by changeUsername(). The service
 * file is otherwise a mostly-declarative wrapper around a D1 batch, so
 * we test by spying on the prepared statements and their bindings —
 * the mock createMockD1 in __mocks__/cloudflare.ts has a known parser
 * quirk around `unixepoch()` inside SET clauses, and we want
 * assertion-level control over which statement got which parameters
 * anyway.
 *
 * Primary focus: the `display_name` sync rule added after a real user
 * reported their old username leaking into tab titles / header chrome
 * after renaming their subdomain. See the docblock on changeUsername
 * for the rationale.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { changeUsername } from "./username";

// ============================================================================
// Spy D1
// ============================================================================

interface SpyStatement {
	sql: string;
	bindings: readonly unknown[];
}

/**
 * Build a D1 double that records every prepared statement (SQL text +
 * bound params) in insertion order, and returns the caller-supplied
 * per-statement metadata from batch().
 */
function createSpyD1(
	batchResults: Array<{ success: boolean; meta: { changes: number } }> = [
		{ success: true, meta: { changes: 1 } }, // 1. subdomain update
		{ success: true, meta: { changes: 1 } }, // 2. display_name sync
		{ success: true, meta: { changes: 1 } }, // 3. history insert
		{ success: true, meta: { changes: 1 } }, // 4. user_onboarding
		{ success: true, meta: { changes: 0 } }, // 5. meadow_posts (often 0)
	],
): { db: D1Database; statements: SpyStatement[] } {
	const statements: SpyStatement[] = [];

	const prepare = vi.fn((sql: string) => {
		const stmt = {
			sql,
			bindings: [] as unknown[],
			bind(...params: unknown[]) {
				this.bindings = params;
				statements.push({ sql: this.sql, bindings: [...params] });
				return this;
			},
			run: vi.fn(async () => batchResults[0]),
		};
		return stmt;
	});

	const batch = vi.fn(async () => batchResults);

	return {
		db: { prepare, batch } as unknown as D1Database,
		statements,
	};
}

const BASE_REQUEST = {
	tenantId: "tenant-abc",
	currentSubdomain: "2012art",
	newSubdomain: "art-blog",
	actorEmail: "art@example.com",
	tier: "seedling" as const,
};

// ============================================================================
// Tests
// ============================================================================

describe("changeUsername() — batch composition", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("issues five statements in the expected order", async () => {
		const { db, statements } = createSpyD1();

		const result = await changeUsername(db, BASE_REQUEST);

		expect(result.success).toBe(true);
		expect(statements).toHaveLength(5);
		expect(statements[0].sql).toMatch(/UPDATE tenants SET subdomain/);
		expect(statements[1].sql).toMatch(/UPDATE tenants SET display_name/);
		expect(statements[2].sql).toMatch(/INSERT INTO username_history/);
		expect(statements[3].sql).toMatch(/UPDATE user_onboarding/);
		expect(statements[4].sql).toMatch(/UPDATE meadow_posts/);
	});

	it("gates the display_name sync on the OLD subdomain literally matching", async () => {
		// The second statement is `UPDATE tenants SET display_name = ?
		// WHERE id = ? AND display_name = ?`. Its WHERE clause is what
		// preserves any tenant who deliberately set a custom display name
		// like "Autumn's Blog" — the update is a no-op unless their
		// display_name is still literally the old subdomain string.
		const { db, statements } = createSpyD1();

		await changeUsername(db, BASE_REQUEST);

		const displayNameStmt = statements[1];
		expect(displayNameStmt.sql).toContain(
			"UPDATE tenants SET display_name = ? WHERE id = ? AND display_name = ?",
		);
		expect(displayNameStmt.bindings).toEqual([
			"art-blog", // new subdomain (the value being written)
			"tenant-abc", // tenant id gate
			"2012art", // the old subdomain string — only matches if display_name was never customized
		]);
	});

	it("normalizes the new subdomain (lowercase + trim) for all statements that receive it", async () => {
		const { db, statements } = createSpyD1();

		await changeUsername(db, {
			...BASE_REQUEST,
			newSubdomain: "  Art-Blog  ",
		});

		// subdomain update gets the normalized value, not the raw input
		expect(statements[0].bindings[0]).toBe("art-blog");
		// display_name sync gets the same normalized value
		expect(statements[1].bindings[0]).toBe("art-blog");
		// so does the history insert
		expect(statements[2].bindings[3]).toBe("art-blog");
	});

	it("fails when the subdomain update affected 0 rows (race with another rename)", async () => {
		// If the first statement's changes count is 0 the batch treated
		// the tenant row as gone or out from under us — changeUsername
		// must surface that as an error rather than silently reporting
		// success. The display_name statement landing 1 row shouldn't
		// rescue the overall result.
		const { db } = createSpyD1([
			{ success: true, meta: { changes: 0 } }, // subdomain update didn't land
			{ success: true, meta: { changes: 1 } },
			{ success: true, meta: { changes: 1 } },
			{ success: true, meta: { changes: 1 } },
			{ success: true, meta: { changes: 0 } },
		]);

		const result = await changeUsername(db, BASE_REQUEST);

		expect(result.success).toBe(false);
		expect(result.errorCode).toBe("GROVE-ARBOR-048");
	});

	it("maps a unique-constraint race to a friendly error code", async () => {
		// Simulates the D1 driver throwing when two renames collide on
		// the unique subdomain index.
		const { db } = createSpyD1();
		(db.batch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error("UNIQUE constraint failed: tenants.subdomain"),
		);

		const result = await changeUsername(db, BASE_REQUEST);

		expect(result.success).toBe(false);
		expect(result.errorCode).toBe("GROVE-ARBOR-045");
	});
});
