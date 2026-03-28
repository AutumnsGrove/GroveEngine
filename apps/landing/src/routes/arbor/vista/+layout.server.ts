/**
 * Vista Dashboard Layout Server
 *
 * Wayfinder gate — redirects back to /arbor if not Wayfinder.
 * Auth is already checked by the parent /arbor/+layout.server.ts.
 */

import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { isWayfinder } from "@autumnsgrove/lattice/platform/config";

export const load: LayoutServerLoad = async ({ parent }) => {
	const parentData = await parent();
	if (!parentData.user || !isWayfinder(parentData.user.email)) {
		throw redirect(302, "/arbor");
	}
	return {};
};
