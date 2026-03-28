/**
 * Vista Storage — server load
 */

import type { PageServerLoad } from "./$types";
import {
	getStorageMetrics,
	getCollectionStatus,
} from "@autumnsgrove/lattice/monitoring/observability";
import type { CollectionStatus } from "@autumnsgrove/lattice/monitoring/observability";

export const load: PageServerLoad = async ({ parent, platform }) => {
	await parent();

	const db = platform?.env?.OBS_DB;

	if (!db) {
		return {
			r2: [],
			kv: [],
			collectionStatus: null as CollectionStatus | null,
			dbAvailable: false,
		};
	}

	const [storage, collectionStatus] = await Promise.all([
		getStorageMetrics(db).catch(() => ({ r2: [], kv: [] })),
		getCollectionStatus(db),
	]);
	return { ...storage, collectionStatus, dbAvailable: true };
};
