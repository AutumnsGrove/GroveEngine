/**
 * Pricing Page Server Load
 *
 * Shows available tiers - Wanderer, Seedling ($8/mo), and Sapling ($12/mo).
 * See /pricing/full for the complete 5-tier view.
 */

import { transformAllTiers } from "@autumnsgrove/lattice/platform/pricing";

export function load() {
	// Available tiers: Wanderer first, then Seedling, then Sapling
	const tiers = transformAllTiers({
		includeTiers: ["wanderer", "seedling", "sapling"],
		highlightTier: "wanderer",
		badges: {
			wanderer: "Free",
			seedling: "$8/mo",
			sapling: "$12/mo",
		},
	});

	return { tiers };
}
