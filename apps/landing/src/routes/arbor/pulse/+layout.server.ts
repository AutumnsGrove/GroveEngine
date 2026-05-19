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
