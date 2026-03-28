/**
 * Shelf Service Tests
 *
 * Business logic tests for bookmark shelf CRUD operations.
 * Mocks the database module at the boundary — the service under test
 * never touches a real D1 instance.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@autumnsgrove/lattice/server/services/database", () => ({
	queryOne: vi.fn(),
	queryMany: vi.fn(),
	execute: vi.fn(),
}));

vi.mock("@autumnsgrove/lattice/errors", () => ({
	ARBOR_ERRORS: {
		SAVE_FAILED: { code: "ARBOR_SAVE_FAILED", userMessage: "Failed to save. Please try again." },
		OPERATION_FAILED: {
			code: "ARBOR_OPERATION_FAILED",
			userMessage: "Operation failed. Please try again.",
		},
	},
	logGroveError: vi.fn(),
}));

vi.mock("@autumnsgrove/lattice/curios/shelves", () => ({
	generateShelfId: vi.fn(() => "shelf-generated-id"),
	generateItemId: vi.fn(() => "item-generated-id"),
	getPresetDefaults: vi.fn((preset: string) => ({
		displayMode: "grid",
		material: "wood",
		creatorLabel: "Author",
		status1Label: "Reading",
		status2Label: "Favorite",
		autoFavicon: true,
	})),
	isValidPreset: vi.fn((v: string) => ["books", "links", "custom"].includes(v)),
	isValidDisplayMode: vi.fn((v: string) => ["grid", "list"].includes(v)),
	isValidMaterial: vi.fn((v: string) => ["wood", "stone", "glass"].includes(v)),
	isValidUrl: vi.fn((v: string) => v.startsWith("http")),
	sanitizeShelfName: vi.fn((v: string) => v.trim().slice(0, 100)),
	sanitizeTitle: vi.fn((v: string) => v.trim().slice(0, 200)),
	sanitizeCreator: vi.fn((v: string) => v.trim().slice(0, 100)),
	sanitizeDescription: vi.fn((v: string) => v.trim().slice(0, 500)),
	sanitizeCategory: vi.fn((v: string) => v.trim().slice(0, 50)),
	sanitizeNote: vi.fn((v: string) => v.trim().slice(0, 1000)),
	sanitizeRating: vi.fn((v: string) => (v ? Number(v) : null)),
	buildFaviconUrl: vi.fn((url: string) => {
		const { hostname } = new URL(url);
		return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
	}),
	SHELF_PRESET_OPTIONS: [],
	SHELF_DISPLAY_MODE_OPTIONS: [],
	SHELF_MATERIAL_OPTIONS: [],
	DEFAULT_CATEGORIES_BOOKS: [],
	DEFAULT_CATEGORIES_LINKS: [],
	MAX_URL_LENGTH: 2048,
}));

import { queryOne, queryMany, execute } from "@autumnsgrove/lattice/server/services/database";
import {
	loadShelves,
	addShelf,
	addItem,
	updateShelf,
	updateItem,
	removeShelf,
	removeItem,
} from "./shelf-service";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** A minimal D1Database stand-in — the service never calls it directly. */
const mockDb = {} as D1Database;
const TENANT = "tenant-abc";

function makeShelfRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "shelf-1",
		name: "My Books",
		description: "A reading list",
		preset: "books",
		display_mode: "grid",
		material: "wood",
		creator_label: "Author",
		status1_label: "Reading",
		status2_label: "Favorite",
		is_featured: 0,
		group_by_category: 0,
		auto_favicon: 1,
		sort_order: 0,
		...overrides,
	};
}

function makeItemRow(overrides: Partial<Record<string, unknown>> = {}) {
	return {
		id: "item-1",
		shelf_id: "shelf-1",
		url: "https://example.com/book",
		title: "Great Book",
		author: "Jane Doe",
		description: "A wonderful read",
		cover_url: null,
		thumbnail_url: null,
		category: "fiction",
		is_currently_reading: 0,
		is_favorite: 1,
		rating: 5,
		note: "Loved it",
		...overrides,
	};
}

// ── loadShelves ───────────────────────────────────────────────────────────────

describe("loadShelves", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns shelves with their items joined by shelf id", async () => {
		vi.mocked(queryMany)
			.mockResolvedValueOnce([makeShelfRow()]) // shelves query
			.mockResolvedValueOnce([makeItemRow()]); // items query

		const result = await loadShelves(mockDb, TENANT);

		expect(result.shelves).toHaveLength(1);
		const shelf = result.shelves[0];
		expect(shelf.id).toBe("shelf-1");
		expect(shelf.name).toBe("My Books");
		expect(shelf.items).toHaveLength(1);
		expect(shelf.items[0].id).toBe("item-1");
		expect(shelf.items[0].title).toBe("Great Book");
	});

	it("maps numeric booleans to JS booleans correctly", async () => {
		vi.mocked(queryMany)
			.mockResolvedValueOnce([
				makeShelfRow({ is_featured: 1, group_by_category: 1, auto_favicon: 0 }),
			])
			.mockResolvedValueOnce([makeItemRow({ is_currently_reading: 1, is_favorite: 0 })]);

		const result = await loadShelves(mockDb, TENANT);

		const shelf = result.shelves[0];
		expect(shelf.isFeatured).toBe(true);
		expect(shelf.groupByCategory).toBe(true);
		expect(shelf.autoFavicon).toBe(false);

		const item = shelf.items[0];
		expect(item.isStatus1).toBe(true);
		expect(item.isStatus2).toBe(false);
	});

	it("returns shelves with no items when tenant has no bookmarks", async () => {
		vi.mocked(queryMany).mockResolvedValueOnce([makeShelfRow()]).mockResolvedValueOnce([]);

		const result = await loadShelves(mockDb, TENANT);

		expect(result.shelves[0].items).toEqual([]);
	});

	it("returns empty shelves list when tenant has no shelves", async () => {
		vi.mocked(queryMany).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		const result = await loadShelves(mockDb, TENANT);

		expect(result.shelves).toEqual([]);
	});

	it("items not belonging to any shelf are not attached to shelves", async () => {
		vi.mocked(queryMany)
			.mockResolvedValueOnce([makeShelfRow({ id: "shelf-A" })])
			.mockResolvedValueOnce([makeItemRow({ shelf_id: "shelf-B" })]);

		const result = await loadShelves(mockDb, TENANT);

		// shelf-A has no items because the item belongs to shelf-B (not returned)
		expect(result.shelves[0].items).toHaveLength(0);
	});

	it("swallows database errors and returns empty results", async () => {
		vi.mocked(queryMany)
			.mockRejectedValueOnce(new Error("D1 connection error"))
			.mockRejectedValueOnce(new Error("D1 connection error"));

		const result = await loadShelves(mockDb, TENANT);

		expect(result.shelves).toEqual([]);
	});

	it("returns metadata options alongside shelves", async () => {
		vi.mocked(queryMany).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

		const result = await loadShelves(mockDb, TENANT);

		expect(result).toHaveProperty("presetOptions");
		expect(result).toHaveProperty("displayModeOptions");
		expect(result).toHaveProperty("materialOptions");
		expect(result).toHaveProperty("defaultCategoriesBooks");
		expect(result).toHaveProperty("defaultCategoriesLinks");
	});
});

// ── addShelf ─────────────────────────────────────────────────────────────────

describe("addShelf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(execute).mockResolvedValue({
			success: true,
			meta: { changes: 1, duration: 1, lastRowId: 1, rowsRead: 0, rowsWritten: 1 },
		});
	});

	it("creates a shelf and returns success", async () => {
		vi.mocked(queryOne).mockResolvedValueOnce({ max_sort: 2 }); // existing max sort_order

		const result = await addShelf(mockDb, TENANT, {
			name: "Reading List",
			description: "Books I want to read",
			preset: "books",
			displayMode: "grid",
			material: "wood",
		});

		expect(result.success).toBe(true);
		if (result.success) expect(result.shelfAdded).toBe(true);
	});

	it("uses max_sort + 1 for the new shelf's sort_order", async () => {
		vi.mocked(queryOne).mockResolvedValueOnce({ max_sort: 4 });

		await addShelf(mockDb, TENANT, {
			name: "New Shelf",
			description: "",
			preset: "custom",
			displayMode: "grid",
			material: "wood",
		});

		// The execute call receives sort_order as the last positional param
		const callArgs = vi.mocked(execute).mock.calls[0][2] as unknown[];
		expect(callArgs[callArgs.length - 1]).toBe(5);
	});

	it("uses sort_order 0 when no shelves exist yet", async () => {
		vi.mocked(queryOne).mockResolvedValueOnce({ max_sort: -1 });

		await addShelf(mockDb, TENANT, {
			name: "First Shelf",
			description: "",
			preset: "custom",
			displayMode: "grid",
			material: "wood",
		});

		const callArgs = vi.mocked(execute).mock.calls[0][2] as unknown[];
		expect(callArgs[callArgs.length - 1]).toBe(0);
	});

	it("returns MISSING_NAME error when name is empty", async () => {
		const result = await addShelf(mockDb, TENANT, {
			name: "  ", // sanitizeShelfName trims → empty string
			description: "",
			preset: "custom",
			displayMode: "grid",
			material: "wood",
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error_code).toBe("MISSING_NAME");
		}
		expect(execute).not.toHaveBeenCalled();
	});

	it("falls back to custom preset when preset is unrecognized", async () => {
		vi.mocked(queryOne).mockResolvedValueOnce({ max_sort: 0 });

		await addShelf(mockDb, TENANT, {
			name: "Mystery Shelf",
			description: "",
			preset: "invalid-preset",
			displayMode: "grid",
			material: "wood",
		});

		// Preset written to DB is the third positional arg in the INSERT params
		const callArgs = vi.mocked(execute).mock.calls[0][2] as unknown[];
		// id, tenantId, name, description, preset ... preset is index 4
		expect(callArgs[4]).toBe("custom");
	});

	it("returns SAVE_FAILED error when execute throws", async () => {
		vi.mocked(queryOne).mockResolvedValueOnce({ max_sort: 0 });
		vi.mocked(execute).mockRejectedValueOnce(new Error("D1 write failure"));

		const result = await addShelf(mockDb, TENANT, {
			name: "Bad Shelf",
			description: "",
			preset: "custom",
			displayMode: "grid",
			material: "wood",
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error_code).toBe("ARBOR_SAVE_FAILED");
			expect(result.status).toBe(500);
		}
	});
});

// ── addItem ───────────────────────────────────────────────────────────────────

describe("addItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(execute).mockResolvedValue({
			success: true,
			meta: { changes: 1, duration: 1, lastRowId: 1, rowsRead: 0, rowsWritten: 1 },
		});
	});

	it("adds an item to an existing shelf and returns success", async () => {
		vi.mocked(queryOne)
			.mockResolvedValueOnce({ id: "shelf-1", auto_favicon: 0 }) // shelf lookup
			.mockResolvedValueOnce({ max_sort: -1 }); // item sort_order

		const result = await addItem(mockDb, TENANT, {
			shelfId: "shelf-1",
			url: "https://example.com",
			title: "Example Site",
			creator: "",
			description: "",
			category: "",
			coverUrl: "",
			thumbnailUrl: "",
			rating: "",
			note: "",
		});

		expect(result.success).toBe(true);
		if (result.success) expect(result.itemAdded).toBe(true);
	});

	it("returns INVALID_SHELF when shelf does not exist", async () => {
		vi.mocked(queryOne).mockResolvedValueOnce(null); // shelf not found

		const result = await addItem(mockDb, TENANT, {
			shelfId: "nonexistent",
			url: "https://example.com",
			title: "Something",
			creator: "",
			description: "",
			category: "",
			coverUrl: "",
			thumbnailUrl: "",
			rating: "",
			note: "",
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error_code).toBe("INVALID_SHELF");
		expect(execute).not.toHaveBeenCalled();
	});

	it("returns MISSING_TITLE when title is empty", async () => {
		vi.mocked(queryOne).mockResolvedValueOnce({ id: "shelf-1", auto_favicon: 0 });

		const result = await addItem(mockDb, TENANT, {
			shelfId: "shelf-1",
			url: "https://example.com",
			title: "  ",
			creator: "",
			description: "",
			category: "",
			coverUrl: "",
			thumbnailUrl: "",
			rating: "",
			note: "",
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error_code).toBe("MISSING_TITLE");
	});

	it("returns INVALID_URL when url is malformed", async () => {
		vi.mocked(queryOne).mockResolvedValueOnce({ id: "shelf-1", auto_favicon: 0 });

		const result = await addItem(mockDb, TENANT, {
			shelfId: "shelf-1",
			url: "not-a-url",
			title: "Some Book",
			creator: "",
			description: "",
			category: "",
			coverUrl: "",
			thumbnailUrl: "",
			rating: "",
			note: "",
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error_code).toBe("INVALID_URL");
	});

	it("generates favicon url when auto_favicon is enabled and no cover provided", async () => {
		vi.mocked(queryOne)
			.mockResolvedValueOnce({ id: "shelf-1", auto_favicon: 1 })
			.mockResolvedValueOnce({ max_sort: -1 });

		await addItem(mockDb, TENANT, {
			shelfId: "shelf-1",
			url: "https://example.com/page",
			title: "Example",
			creator: "",
			description: "",
			category: "",
			coverUrl: "",
			thumbnailUrl: "",
			rating: "",
			note: "",
		});

		// The INSERT params include finalCoverUrl — verify favicon was injected
		const insertParams = vi.mocked(execute).mock.calls[0][2] as unknown[];
		// cover_url is at index 7 (id, tenantId, shelfId, url, title, author, description, cover_url, ...)
		expect(insertParams[7]).toContain("example.com");
	});

	it("does not generate favicon when a cover url is already provided", async () => {
		vi.mocked(queryOne)
			.mockResolvedValueOnce({ id: "shelf-1", auto_favicon: 1 })
			.mockResolvedValueOnce({ max_sort: -1 });

		await addItem(mockDb, TENANT, {
			shelfId: "shelf-1",
			url: "https://example.com/page",
			title: "Example",
			creator: "",
			description: "",
			category: "",
			coverUrl: "https://covers.example.com/image.jpg",
			thumbnailUrl: "",
			rating: "",
			note: "",
		});

		const insertParams = vi.mocked(execute).mock.calls[0][2] as unknown[];
		expect(insertParams[7]).toBe("https://covers.example.com/image.jpg");
	});

	it("maps isStatus1 / isStatus2 from form checkbox values", async () => {
		vi.mocked(queryOne)
			.mockResolvedValueOnce({ id: "shelf-1", auto_favicon: 0 })
			.mockResolvedValueOnce({ max_sort: -1 });

		await addItem(mockDb, TENANT, {
			shelfId: "shelf-1",
			url: "https://example.com",
			title: "Book",
			creator: "",
			description: "",
			category: "",
			coverUrl: "",
			thumbnailUrl: "",
			isStatus1: "on",
			isStatus2: undefined,
			rating: "",
			note: "",
		});

		const insertParams = vi.mocked(execute).mock.calls[0][2] as unknown[];
		// is_currently_reading is index 10, is_favorite is index 11
		expect(insertParams[10]).toBe(1);
		expect(insertParams[11]).toBe(0);
	});
});

// ── updateShelf ───────────────────────────────────────────────────────────────

describe("updateShelf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(execute).mockResolvedValue({
			success: true,
			meta: { changes: 1, duration: 1, lastRowId: 0, rowsRead: 0, rowsWritten: 1 },
		});
	});

	it("updates name and description when both are provided", async () => {
		const result = await updateShelf(mockDb, TENANT, {
			shelfId: "shelf-1",
			name: "Updated Name",
			description: "Updated description",
			displayMode: "grid",
			material: "wood",
			creatorLabel: "Author",
			status1Label: "Reading",
			status2Label: "Loved",
		});

		expect(result.success).toBe(true);
		if (result.success) expect(result.shelfUpdated).toBe(true);
		expect(execute).toHaveBeenCalledOnce();
	});

	it("returns noChanges when no updateable fields are provided", async () => {
		const result = await updateShelf(mockDb, TENANT, {
			shelfId: "shelf-1",
			name: "  ", // sanitizeShelfName → empty
			displayMode: "invalid-mode",
			material: "invalid-material",
			creatorLabel: "",
			status1Label: "",
			status2Label: "",
		});

		expect(result.success).toBe(true);
		if (result.success) expect(result.noChanges).toBe(true);
		expect(execute).not.toHaveBeenCalled();
	});

	it("returns SAVE_FAILED when execute throws", async () => {
		vi.mocked(execute).mockRejectedValueOnce(new Error("constraint error"));

		const result = await updateShelf(mockDb, TENANT, {
			shelfId: "shelf-1",
			name: "Good Name",
			displayMode: "grid",
			material: "wood",
			creatorLabel: "",
			status1Label: "",
			status2Label: "",
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error_code).toBe("ARBOR_SAVE_FAILED");
	});
});

// ── updateItem ────────────────────────────────────────────────────────────────

describe("updateItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(execute).mockResolvedValue({
			success: true,
			meta: { changes: 1, duration: 1, lastRowId: 0, rowsRead: 0, rowsWritten: 1 },
		});
	});

	it("updates item fields and returns success", async () => {
		const result = await updateItem(mockDb, TENANT, {
			itemId: "item-1",
			title: "Updated Title",
			url: "https://example.com",
			creator: "New Author",
			description: "New description",
		});

		expect(result.success).toBe(true);
		if (result.success) expect(result.itemUpdated).toBe(true);
		expect(execute).toHaveBeenCalledOnce();
	});

	it("returns noChanges when all fields produce empty updates", async () => {
		// title sanitizes to empty, url is empty, others are null/undefined
		const result = await updateItem(mockDb, TENANT, {
			itemId: "item-1",
			title: "  ",
			url: "   ",
		});

		expect(result.success).toBe(true);
		if (result.success) expect(result.noChanges).toBe(true);
		expect(execute).not.toHaveBeenCalled();
	});

	it("returns INVALID_URL when url is malformed", async () => {
		const result = await updateItem(mockDb, TENANT, {
			itemId: "item-1",
			title: "Good Title",
			url: "ftp://invalid",
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error_code).toBe("INVALID_URL");
	});

	it("returns SAVE_FAILED when execute throws", async () => {
		vi.mocked(execute).mockRejectedValueOnce(new Error("write error"));

		const result = await updateItem(mockDb, TENANT, {
			itemId: "item-1",
			title: "Title",
			url: "https://example.com",
		});

		expect(result.success).toBe(false);
		if (!result.success) expect(result.error_code).toBe("ARBOR_SAVE_FAILED");
	});
});

// ── removeShelf ───────────────────────────────────────────────────────────────

describe("removeShelf", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deletes the shelf and returns success", async () => {
		vi.mocked(execute).mockResolvedValueOnce({
			success: true,
			meta: { changes: 1, duration: 1, lastRowId: 0, rowsRead: 0, rowsWritten: 1 },
		});

		const result = await removeShelf(mockDb, TENANT, "shelf-1");

		expect(result.success).toBe(true);
		if (result.success) expect(result.shelfRemoved).toBe(true);
		expect(execute).toHaveBeenCalledOnce();
	});

	it("passes shelf id and tenant id to the DELETE query", async () => {
		vi.mocked(execute).mockResolvedValueOnce({
			success: true,
			meta: { changes: 1, duration: 1, lastRowId: 0, rowsRead: 0, rowsWritten: 1 },
		});

		await removeShelf(mockDb, TENANT, "shelf-xyz");

		const [, , params] = vi.mocked(execute).mock.calls[0];
		expect(params).toContain("shelf-xyz");
		expect(params).toContain(TENANT);
	});

	it("returns OPERATION_FAILED when execute throws", async () => {
		vi.mocked(execute).mockRejectedValueOnce(new Error("delete error"));

		const result = await removeShelf(mockDb, TENANT, "shelf-1");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error_code).toBe("ARBOR_OPERATION_FAILED");
			expect(result.status).toBe(500);
		}
	});
});

// ── removeItem ────────────────────────────────────────────────────────────────

describe("removeItem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deletes the item and returns success", async () => {
		vi.mocked(execute).mockResolvedValueOnce({
			success: true,
			meta: { changes: 1, duration: 1, lastRowId: 0, rowsRead: 0, rowsWritten: 1 },
		});

		const result = await removeItem(mockDb, TENANT, "item-1");

		expect(result.success).toBe(true);
		if (result.success) expect(result.itemRemoved).toBe(true);
		expect(execute).toHaveBeenCalledOnce();
	});

	it("passes item id and tenant id to the DELETE query", async () => {
		vi.mocked(execute).mockResolvedValueOnce({
			success: true,
			meta: { changes: 1, duration: 1, lastRowId: 0, rowsRead: 0, rowsWritten: 1 },
		});

		await removeItem(mockDb, TENANT, "item-xyz");

		const [, , params] = vi.mocked(execute).mock.calls[0];
		expect(params).toContain("item-xyz");
		expect(params).toContain(TENANT);
	});

	it("returns OPERATION_FAILED when execute throws", async () => {
		vi.mocked(execute).mockRejectedValueOnce(new Error("delete error"));

		const result = await removeItem(mockDb, TENANT, "item-1");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error_code).toBe("ARBOR_OPERATION_FAILED");
			expect(result.status).toBe(500);
		}
	});
});
