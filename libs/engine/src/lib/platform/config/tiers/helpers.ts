import type {
	TierKey,
	PaidTierKey,
	TierConfig,
	TierFeatures,
	TierLimits,
	TierRateLimits,
} from "./types.js";
import { TIERS, TIER_ORDER, PAID_TIERS } from "./definitions.js";

export function getTier(key: TierKey): TierConfig {
	return TIERS[key];
}

export function getTierSafe(key: string): TierConfig | undefined {
	return isValidTier(key) ? TIERS[key] : undefined;
}

export function isValidTier(key: string): key is TierKey {
	return key in TIERS;
}

export function isPaidTier(key: string): key is PaidTierKey {
	return PAID_TIERS.includes(key as PaidTierKey);
}

export function getAvailableTiers(): TierConfig[] {
	return TIER_ORDER.map((k) => TIERS[k]).filter((t) => t.status === "available");
}

export function getTiersInOrder(): TierConfig[] {
	return TIER_ORDER.map((k) => TIERS[k]);
}

export function tierHasFeature(tier: TierKey, feature: keyof TierFeatures): boolean {
	return TIERS[tier].features[feature];
}

export function getTierLimit(tier: TierKey, limit: keyof TierLimits): number | string {
	return TIERS[tier].limits[limit];
}

export function getTierRateLimits(tier: TierKey): TierRateLimits {
	return TIERS[tier].rateLimits;
}

export function formatStorage(bytes: number): string {
	if (bytes === 0) return "0 MB";
	if (bytes === Infinity) return "Unlimited";
	const gb = bytes / (1024 * 1024 * 1024);
	return gb >= 1 ? `${gb} GB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatLimit(value: number): string {
	if (value === 0) return "—";
	if (value === Infinity) return "Unlimited";
	return value.toString();
}

export function getNextTier(current: TierKey): TierKey | null {
	const idx = TIER_ORDER.indexOf(current);
	return idx === -1 || idx === TIER_ORDER.length - 1 ? null : TIER_ORDER[idx + 1];
}

export function getTiersWithFeature(feature: keyof TierFeatures): TierKey[] {
	return TIER_ORDER.filter((key) => TIERS[key].features[feature]);
}
