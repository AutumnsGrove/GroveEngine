/**
 * Shelves CRUD - Business Logic Service
 *
 * Handles all shelf and item CRUD operations with proper
 * sanitization, validation, and tenant isolation.
 */

import { ARBOR_ERRORS, logGroveError } from "@autumnsgrove/lattice/errors";
import { queryOne, queryMany, execute } from "@autumnsgrove/lattice/server/services/database";
import {
	generateShelfId,
	generateItemId,
	getPresetDefaults,
	isValidPreset,
	isValidDisplayMode,
	isValidMaterial,
	isValidUrl,
	sanitizeShelfName,
	sanitizeTitle,
	sanitizeCreator,
	sanitizeDescription,
	sanitizeCategory,
	sanitizeNote,
	sanitizeRating,
	buildFaviconUrl,
	SHELF_PRESET_OPTIONS,
	SHELF_DISPLAY_MODE_OPTIONS,
	SHELF_MATERIAL_OPTIONS,
	DEFAULT_CATEGORIES_BOOKS,
	DEFAULT_CATEGORIES_LINKS,
	MAX_URL_LENGTH,
	type ShelfPreset,
} from "@autumnsgrove/lattice/curios/shelves";

// ============================================================================
// Types
// ============================================================================

interface ShelfRow {
	id: string;
	name: string;
	description: string | null;
	preset: string;
	display_mode: string;
	material: string;
	creator_label: string;
	status1_label: string;
	status2_label: string;
	is_featured: number;
	group_by_category: number;
	auto_favicon: number;
	sort_order: number;
}

interface ItemRow {
	id: string;
	shelf_id: string;
	url: string;
	title: string;
	author: string | null;
	description: string | null;
	cover_url: string | null;
	thumbnail_url: string | null;
	category: string | null;
	is_currently_reading: number;
	is_favorite: number;
	rating: number | null;
	note: string | null;
}

type ServiceResult<T = Record<string, unknown>> =
	| ({ success: true } & T)
	| { success: false; error: string; error_code: string; status?: number };

// ============================================================================
// Load
// ============================================================================

export async function loadShelves(db: D1Database, tenantId: string) {
	const [shelvesList, itemsList] = await Promise.all([
		queryMany<ShelfRow>(
			db,
			`SELECT id, name, description, preset, display_mode, material,
			        creator_label, status1_label, status2_label,
			        is_featured, group_by_category, auto_favicon, sort_order
			 FROM bookmark_shelves WHERE tenant_id = ?
			 ORDER BY sort_order ASC, created_at ASC`,
			[tenantId],
		).catch(() => [] as ShelfRow[]),
		queryMany<ItemRow>(
			db,
			`SELECT b.id, b.shelf_id, b.url, b.title, b.author, b.description,
			        b.cover_url, b.thumbnail_url, b.category,
			        b.is_currently_reading, b.is_favorite, b.rating, b.note
			 FROM bookmarks b
			 JOIN bookmark_shelves s ON b.shelf_id = s.id
			 WHERE s.tenant_id = ?
			 ORDER BY b.sort_order ASC, b.added_at ASC`,
			[tenantId],
		).catch(() => [] as ItemRow[]),
	]);

	const itemsByShelf = new Map<string, typeof formattedItems>();
	const formattedItems = itemsList.map((row) => ({
		id: row.id,
		shelfId: row.shelf_id,
		url: row.url,
		title: row.title,
		creator: row.author,
		description: row.description,
		coverUrl: row.cover_url,
		thumbnailUrl: row.thumbnail_url,
		category: row.category,
		isStatus1: row.is_currently_reading === 1,
		isStatus2: row.is_favorite === 1,
		rating: row.rating,
		note: row.note,
	}));

	for (const item of formattedItems) {
		const list = itemsByShelf.get(item.shelfId) || [];
		list.push(item);
		itemsByShelf.set(item.shelfId, list);
	}

	const shelves = shelvesList.map((row) => ({
		id: row.id,
		name: row.name,
		description: row.description,
		preset: row.preset,
		displayMode: row.display_mode,
		material: row.material,
		creatorLabel: row.creator_label,
		status1Label: row.status1_label,
		status2Label: row.status2_label,
		isFeatured: row.is_featured === 1,
		groupByCategory: row.group_by_category === 1,
		autoFavicon: row.auto_favicon === 1,
		items: itemsByShelf.get(row.id) || [],
	}));

	return {
		shelves,
		presetOptions: SHELF_PRESET_OPTIONS,
		displayModeOptions: SHELF_DISPLAY_MODE_OPTIONS,
		materialOptions: SHELF_MATERIAL_OPTIONS,
		defaultCategoriesBooks: DEFAULT_CATEGORIES_BOOKS,
		defaultCategoriesLinks: DEFAULT_CATEGORIES_LINKS,
	};
}

// ============================================================================
// Add Shelf
// ============================================================================

export async function addShelf(
	db: D1Database,
	tenantId: string,
	data: {
		name: string;
		description: string;
		preset: string;
		displayMode: string;
		material: string;
	},
): Promise<ServiceResult<{ shelfAdded: true }>> {
	const name = sanitizeShelfName(data.name);
	if (!name) {
		return { success: false, error: "Shelf name is required", error_code: "MISSING_NAME" };
	}

	const description = sanitizeDescription(data.description);
	const presetRaw = data.preset || "custom";
	const preset: ShelfPreset = isValidPreset(presetRaw) ? (presetRaw as ShelfPreset) : "custom";
	const defaults = getPresetDefaults(preset);

	const displayMode = isValidDisplayMode(data.displayMode)
		? data.displayMode
		: defaults.displayMode;
	const material = isValidMaterial(data.material) ? data.material : defaults.material;

	const id = generateShelfId();

	try {
		const maxSortRow = await queryOne<{ max_sort: number }>(
			db,
			`SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM bookmark_shelves WHERE tenant_id = ?`,
			[tenantId],
		);

		const sortOrder = (maxSortRow?.max_sort ?? -1) + 1;

		await execute(
			db,
			`INSERT INTO bookmark_shelves
			 (id, tenant_id, name, description, preset, display_mode, material,
			  creator_label, status1_label, status2_label, auto_favicon, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				tenantId,
				name,
				description,
				preset,
				displayMode,
				material,
				defaults.creatorLabel,
				defaults.status1Label,
				defaults.status2Label,
				defaults.autoFavicon ? 1 : 0,
				sortOrder,
			],
		);

		return { success: true, shelfAdded: true };
	} catch (error) {
		logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
		return {
			success: false,
			error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
			error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			status: 500,
		};
	}
}

// ============================================================================
// Add Item
// ============================================================================

export async function addItem(
	db: D1Database,
	tenantId: string,
	data: {
		shelfId: string;
		url: string;
		title: string;
		creator: string;
		description: string;
		category: string;
		coverUrl: string;
		thumbnailUrl: string;
		isStatus1?: string;
		isStatus2?: string;
		rating: string;
		note: string;
	},
): Promise<ServiceResult<{ itemAdded: true }>> {
	const { shelfId } = data;

	const shelf = await queryOne<{ id: string; auto_favicon: number }>(
		db,
		`SELECT id, auto_favicon FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`,
		[shelfId, tenantId],
	);

	if (!shelf) {
		return { success: false, error: "Shelf not found", error_code: "INVALID_SHELF" };
	}

	const url = data.url.trim();
	if (url && (!isValidUrl(url) || url.length > MAX_URL_LENGTH)) {
		return { success: false, error: "Please enter a valid URL", error_code: "INVALID_URL" };
	}

	const title = sanitizeTitle(data.title);
	if (!title) {
		return { success: false, error: "Title is required", error_code: "MISSING_TITLE" };
	}

	const creator = sanitizeCreator(data.creator);
	const description = sanitizeDescription(data.description);
	const category = sanitizeCategory(data.category);
	const coverUrl = data.coverUrl.trim() || null;
	const thumbnailUrl = data.thumbnailUrl.trim() || null;
	const isStatus1 = data.isStatus1 === "on" ? 1 : 0;
	const isStatus2 = data.isStatus2 === "on" ? 1 : 0;
	const rating = sanitizeRating(data.rating);
	const note = sanitizeNote(data.note);

	const finalCoverUrl = coverUrl || (shelf.auto_favicon === 1 && url ? buildFaviconUrl(url) : null);

	const id = generateItemId();

	try {
		const maxSortRow = await queryOne<{ max_sort: number }>(
			db,
			`SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM bookmarks WHERE shelf_id = ?`,
			[shelfId],
		);

		const sortOrder = (maxSortRow?.max_sort ?? -1) + 1;

		await execute(
			db,
			`INSERT INTO bookmarks
			 (id, tenant_id, shelf_id, url, title, author, description,
			  cover_url, thumbnail_url, category,
			  is_currently_reading, is_favorite, rating, note, sort_order)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				tenantId,
				shelfId,
				url,
				title,
				creator,
				description,
				finalCoverUrl,
				thumbnailUrl,
				category,
				isStatus1,
				isStatus2,
				rating,
				note,
				sortOrder,
			],
		);

		return { success: true, itemAdded: true };
	} catch (error) {
		logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
		return {
			success: false,
			error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
			error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			status: 500,
		};
	}
}

// ============================================================================
// Update Shelf
// ============================================================================

export async function updateShelf(
	db: D1Database,
	tenantId: string,
	data: {
		shelfId: string;
		name: string;
		description?: string | null;
		displayMode: string;
		material: string;
		creatorLabel: string;
		status1Label: string;
		status2Label: string;
	},
): Promise<ServiceResult<{ shelfUpdated?: true; noChanges?: true }>> {
	const { shelfId } = data;

	const updates: string[] = [];
	const values: unknown[] = [];

	const name = sanitizeShelfName(data.name);
	if (name) {
		updates.push("name = ?");
		values.push(name);
	}

	if (data.description !== undefined && data.description !== null) {
		updates.push("description = ?");
		values.push(sanitizeDescription(data.description));
	}

	if (data.displayMode && isValidDisplayMode(data.displayMode)) {
		updates.push("display_mode = ?");
		values.push(data.displayMode);
	}

	if (data.material && isValidMaterial(data.material)) {
		updates.push("material = ?");
		values.push(data.material);
	}

	if (data.creatorLabel) {
		updates.push("creator_label = ?");
		values.push(data.creatorLabel.slice(0, 50));
	}

	if (data.status1Label) {
		updates.push("status1_label = ?");
		values.push(data.status1Label.slice(0, 50));
	}

	if (data.status2Label) {
		updates.push("status2_label = ?");
		values.push(data.status2Label.slice(0, 50));
	}

	if (updates.length === 0) {
		return { success: true, noChanges: true };
	}

	values.push(shelfId, tenantId);

	try {
		await execute(
			db,
			`UPDATE bookmark_shelves SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
			values,
		);

		return { success: true, shelfUpdated: true };
	} catch (error) {
		logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
		return {
			success: false,
			error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
			error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			status: 500,
		};
	}
}

// ============================================================================
// Update Item
// ============================================================================

export async function updateItem(
	db: D1Database,
	tenantId: string,
	data: {
		itemId: string;
		title: string;
		url: string;
		creator?: string | null;
		description?: string | null;
		category?: string | null;
		rating?: string | null;
		note?: string | null;
	},
): Promise<ServiceResult<{ itemUpdated?: true; noChanges?: true }>> {
	const { itemId } = data;

	const updates: string[] = [];
	const values: unknown[] = [];

	const title = sanitizeTitle(data.title);
	if (title) {
		updates.push("title = ?");
		values.push(title);
	}

	const url = data.url.trim();
	if (url) {
		if (!isValidUrl(url) || url.length > MAX_URL_LENGTH) {
			return { success: false, error: "Invalid URL", error_code: "INVALID_URL" };
		}
		updates.push("url = ?");
		values.push(url);
	}

	if (data.creator !== undefined && data.creator !== null) {
		updates.push("author = ?");
		values.push(sanitizeCreator(data.creator));
	}

	if (data.description !== undefined && data.description !== null) {
		updates.push("description = ?");
		values.push(sanitizeDescription(data.description));
	}

	if (data.category !== undefined && data.category !== null) {
		updates.push("category = ?");
		values.push(sanitizeCategory(data.category));
	}

	if (data.rating !== undefined && data.rating !== null) {
		updates.push("rating = ?");
		values.push(sanitizeRating(data.rating));
	}

	if (data.note !== undefined && data.note !== null) {
		updates.push("note = ?");
		values.push(sanitizeNote(data.note));
	}

	if (updates.length === 0) {
		return { success: true, noChanges: true };
	}

	values.push(itemId, tenantId);

	try {
		await execute(
			db,
			`UPDATE bookmarks SET ${updates.join(", ")}
			 WHERE id = ? AND shelf_id IN (SELECT id FROM bookmark_shelves WHERE tenant_id = ?)`,
			values,
		);

		return { success: true, itemUpdated: true };
	} catch (error) {
		logGroveError("Arbor", ARBOR_ERRORS.SAVE_FAILED, { cause: error });
		return {
			success: false,
			error: ARBOR_ERRORS.SAVE_FAILED.userMessage,
			error_code: ARBOR_ERRORS.SAVE_FAILED.code,
			status: 500,
		};
	}
}

// ============================================================================
// Remove Shelf / Item
// ============================================================================

export async function removeShelf(
	db: D1Database,
	tenantId: string,
	shelfId: string,
): Promise<ServiceResult<{ shelfRemoved: true }>> {
	try {
		await execute(db, `DELETE FROM bookmark_shelves WHERE id = ? AND tenant_id = ?`, [
			shelfId,
			tenantId,
		]);

		return { success: true, shelfRemoved: true };
	} catch (error) {
		logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
		return {
			success: false,
			error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
			error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			status: 500,
		};
	}
}

export async function removeItem(
	db: D1Database,
	tenantId: string,
	itemId: string,
): Promise<ServiceResult<{ itemRemoved: true }>> {
	try {
		await execute(
			db,
			`DELETE FROM bookmarks WHERE id = ? AND shelf_id IN (SELECT id FROM bookmark_shelves WHERE tenant_id = ?)`,
			[itemId, tenantId],
		);

		return { success: true, itemRemoved: true };
	} catch (error) {
		logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: error });
		return {
			success: false,
			error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
			error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
			status: 500,
		};
	}
}
