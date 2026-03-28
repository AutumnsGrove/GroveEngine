/**
 * Shelves CRUD - Route Handler
 *
 * Thin routing layer — delegates to shelf-service.ts.
 */

import type { PageServerLoad, Actions } from "./$types";
import { fail } from "@sveltejs/kit";
import { ARBOR_ERRORS } from "@autumnsgrove/lattice/errors";
import { parseFormData } from "@autumnsgrove/lattice/server/utils/form-data";
import {
	AddShelfSchema,
	AddItemSchema,
	UpdateShelfSchema,
	UpdateItemSchema,
	ShelfIdSchema,
	ItemIdSchema,
} from "./schemas";
import {
	loadShelves,
	addShelf,
	addItem,
	updateShelf,
	updateItem,
	removeShelf,
	removeItem,
} from "./shelf-service";

export const load: PageServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.CURIO_DB;
	const tenantId = locals.tenantId;

	if (!db || !tenantId) {
		return {
			shelves: [],
			presetOptions: [],
			displayModeOptions: [],
			materialOptions: [],
			defaultCategoriesBooks: [],
			defaultCategoriesLinks: [],
			error: "Database not available",
		};
	}

	return loadShelves(db, tenantId);
};

function failFromService(result: { error: string; error_code: string; status?: number }) {
	return fail(result.status || 400, { error: result.error, error_code: result.error_code });
}

export const actions: Actions = {
	addShelf: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;
		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, AddShelfSchema);
		if (!parsed.success)
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });

		const result = await addShelf(db, tenantId, parsed.data);
		if (!result.success) return failFromService(result);
		return { success: true, shelfAdded: true };
	},

	addItem: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;
		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, AddItemSchema);
		if (!parsed.success)
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });

		const result = await addItem(db, tenantId, parsed.data);
		if (!result.success) return failFromService(result);
		return { success: true, itemAdded: true };
	},

	updateShelf: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;
		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, UpdateShelfSchema);
		if (!parsed.success)
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });

		const result = await updateShelf(db, tenantId, parsed.data);
		if (!result.success) return failFromService(result);
		return result;
	},

	updateItem: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;
		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, UpdateItemSchema);
		if (!parsed.success)
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });

		const result = await updateItem(db, tenantId, parsed.data);
		if (!result.success) return failFromService(result);
		return result;
	},

	removeShelf: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;
		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, ShelfIdSchema);
		if (!parsed.success)
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });

		const result = await removeShelf(db, tenantId, parsed.data.shelfId);
		if (!result.success) return failFromService(result);
		return { success: true, shelfRemoved: true };
	},

	removeItem: async ({ request, platform, locals }) => {
		const db = platform?.env?.CURIO_DB;
		const tenantId = locals.tenantId;
		if (!db || !tenantId) {
			return fail(500, {
				error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
				error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
			});
		}

		const formData = await request.formData();
		const parsed = parseFormData(formData, ItemIdSchema);
		if (!parsed.success)
			return fail(400, { error: "Invalid form data", error_code: "INVALID_INPUT" });

		const result = await removeItem(db, tenantId, parsed.data.itemId);
		if (!result.success) return failFromService(result);
		return { success: true, itemRemoved: true };
	},
};
