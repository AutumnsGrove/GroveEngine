/**
 * Vista AI Usage — server load
 */

import type { PageServerLoad } from "./$types";
import { aggregateLumen } from "@autumnsgrove/lattice/monitoring/observability";
import type { LumenAggregateResult } from "@autumnsgrove/lattice/monitoring/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return { lumen: null as LumenAggregateResult | null, dbAvailable: false };
	}

	const result = await aggregateLumen(db).catch(() => null);
	const lumen = result?.data ?? null;
	return { lumen, dbAvailable: true };
};
