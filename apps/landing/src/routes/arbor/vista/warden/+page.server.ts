/**
 * Vista Warden — server load
 */

import type { PageServerLoad } from "./$types";
import { aggregateWarden } from "@autumnsgrove/lattice/monitoring/observability";
import type { WardenAggregateResult } from "@autumnsgrove/lattice/monitoring/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.DB;

	if (!db) {
		return { warden: null as WardenAggregateResult | null, dbAvailable: false };
	}

	const result = await aggregateWarden(db).catch(() => null);
	const warden = result?.data ?? null;
	return { warden, dbAvailable: true };
};
