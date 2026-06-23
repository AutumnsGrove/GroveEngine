export type TierKey = "wanderer" | "seedling" | "sapling" | "oak" | "evergreen";
export type PaidTierKey = Exclude<TierKey, "wanderer">;
export type TierStatus = "available" | "coming_soon" | "future" | "deprecated";
export type TierIcon = "user" | "footprints" | "sprout" | "tree-deciduous" | "trees" | "crown";

export interface TierLimits {
	posts: number;
	drafts: number;
	storage: number;
	storageDisplay: string;
	themes: number;
	navPages: number;
	commentsPerWeek: number;
	aiWordsPerMonth: number;
}

export interface TierFeatures {
	blog: boolean;
	emailForwarding: boolean;
	fullEmail: boolean;
	customDomain: boolean;
	byod: boolean;
	themeCustomizer: boolean;
	customFonts: boolean;
	shop: boolean;
	ai: boolean;
	analytics: boolean;
}

export interface RateLimitConfig {
	limit: number;
	windowSeconds: number;
}

export interface TierRateLimits {
	requests: RateLimitConfig;
	writes: RateLimitConfig;
	uploads: RateLimitConfig;
	ai: RateLimitConfig;
}

export interface TierPricing {
	monthlyPrice: number;
	yearlyPrice: number;
	monthlyPriceCents: number;
	yearlyPriceCents: number;
}

export interface TierDisplay {
	name: string;
	tagline: string;
	description: string;
	icon: TierIcon;
	bestFor: string;
	featureStrings: string[];
	standardName?: string;
	standardFeatureStrings?: string[];
}

export type SupportLevel = "help_center" | "community" | "email" | "priority" | "dedicated";

export interface TierSupport {
	level: SupportLevel;
	displayString: string;
	includedHours?: number;
}

export interface TierConfig {
	id: TierKey;
	order: number;
	status: TierStatus;
	limits: TierLimits;
	features: TierFeatures;
	rateLimits: TierRateLimits;
	pricing: TierPricing;
	display: TierDisplay;
	support: TierSupport;
}
