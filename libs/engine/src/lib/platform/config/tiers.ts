/**
 * Tier Configuration — Re-export Barrel
 *
 * This file re-exports from the tiers/ module for backward compatibility.
 * Prefer importing directly from the focused modules:
 *   - tiers/types.ts       — TierKey, TierConfig, TierFeatures, etc.
 *   - tiers/definitions.ts — TIERS data, DEFAULT_TIER, TIER_ORDER
 *   - tiers/helpers.ts     — getTier, isValidTier, formatStorage, etc.
 */

export {
	// Types
	type TierKey,
	type PaidTierKey,
	type TierStatus,
	type TierIcon,
	type TierLimits,
	type TierFeatures,
	type RateLimitConfig,
	type TierRateLimits,
	type TierPricing,
	type TierDisplay,
	type SupportLevel,
	type TierSupport,
	type TierConfig,
	// Data
	TIERS,
	DEFAULT_TIER,
	TIER_ORDER,
	PAID_TIERS,
	TIER_STORAGE_GB,
	// Helpers
	getTier,
	getTierSafe,
	isValidTier,
	isPaidTier,
	getAvailableTiers,
	getTiersInOrder,
	tierHasFeature,
	getTierLimit,
	getTierRateLimits,
	formatStorage,
	formatLimit,
	getNextTier,
	getTiersWithFeature,
} from "./tiers/index.js";
