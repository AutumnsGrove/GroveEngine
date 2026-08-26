import type { TierKey, PaidTierKey, TierConfig } from "./types.js";

export const TIERS: Record<TierKey, TierConfig> = {
	wanderer: {
		id: "wanderer",
		order: 0,
		status: "available",
		limits: {
			posts: 25,
			drafts: 100,
			storage: 100 * 1024 * 1024, // 100 MB
			storageDisplay: "100 MB",
			themes: 1,
			curioTypes: 5,
			navPages: 1,
			commentsPerWeek: 20,
			aiWordsPerMonth: 0,
		},
		features: {
			blog: true,
			customDomain: false,
			byod: false,
			themeCustomizer: false,
			customFonts: false,
			shop: false,
			ai: false,
			analytics: false,
		},
		rateLimits: {
			requests: { limit: 60, windowSeconds: 60 },
			writes: { limit: 20, windowSeconds: 3600 },
			uploads: { limit: 5, windowSeconds: 86400 },
			ai: { limit: 0, windowSeconds: 86400 },
		},
		pricing: {
			monthlyPrice: 0,
			yearlyPrice: 0,
			monthlyPriceCents: 0,
			yearlyPriceCents: 0,
		},
		display: {
			name: "Wanderer",
			tagline: "Your first steps in the grove",
			description: "A quiet clearing to try your hand at writing. No commitment, no credit card.",
			icon: "footprints",
			bestFor: "Trying it out",
			featureStrings: [
				"25 blooms",
				"100 MB storage",
				"Your own grove.place address",
				"RSS feed",
				"No credit card needed",
			],
			standardName: "Free",
			standardFeatureStrings: [
				"25 posts",
				"100 MB storage",
				"Your own grove.place address",
				"RSS feed",
				"No credit card needed",
			],
		},
		support: { level: "help_center", displayString: "Help Center" },
	},

	seedling: {
		id: "seedling",
		order: 1,
		status: "available",
		limits: {
			posts: 100,
			drafts: Infinity,
			storage: 1 * 1024 * 1024 * 1024, // 1 GB
			storageDisplay: "1 GB",
			themes: 1,
			curioTypes: Infinity,
			navPages: 3,
			commentsPerWeek: Infinity,
			aiWordsPerMonth: 750, // ~25/day * 30 days
		},
		features: {
			blog: true,
			customDomain: false,
			byod: false,
			themeCustomizer: false,
			customFonts: false,
			shop: false,
			ai: true,
			analytics: false,
		},
		rateLimits: {
			requests: { limit: 100, windowSeconds: 60 },
			writes: { limit: 50, windowSeconds: 3600 },
			uploads: { limit: 10, windowSeconds: 86400 },
			ai: { limit: 25, windowSeconds: 86400 },
		},
		pricing: {
			monthlyPrice: 8,
			yearlyPrice: 81.6,
			monthlyPriceCents: 800,
			yearlyPriceCents: 8160,
		},
		display: {
			name: "Seedling",
			tagline: "Just planted",
			description: "Your own corner of the internet. Room to write, no distractions, no ads.",
			icon: "sprout",
			bestFor: "Writers finding their voice",
			featureStrings: [
				"100 blooms",
				"1 GB storage",
				// TODO(foliage): uncomment when themes launch
				// "3 curated themes",
				"Unlimited comments",
				"No ads, no tracking",
			],
			standardName: "Starter",
			standardFeatureStrings: [
				"100 posts",
				"1 GB storage",
				// TODO(foliage): uncomment when themes launch
				// "3 curated themes",
				"Unlimited comments",
				"No ads, no tracking",
			],
		},
		support: { level: "community", displayString: "Community" },
	},

	sapling: {
		id: "sapling",
		order: 2,
		status: "available",
		limits: {
			posts: Infinity,
			drafts: Infinity,
			storage: 5 * 1024 * 1024 * 1024, // 5 GB
			storageDisplay: "5 GB",
			themes: 1,
			curioTypes: Infinity,
			navPages: 5,
			commentsPerWeek: Infinity,
			aiWordsPerMonth: 3000, // ~100/day * 30 days
		},
		features: {
			blog: true,
			customDomain: false,
			byod: false,
			themeCustomizer: false,
			customFonts: false,
			shop: true,
			ai: true,
			analytics: false,
		},
		rateLimits: {
			requests: { limit: 500, windowSeconds: 60 },
			writes: { limit: 200, windowSeconds: 3600 },
			uploads: { limit: 50, windowSeconds: 86400 },
			ai: { limit: 100, windowSeconds: 86400 },
		},
		pricing: {
			monthlyPrice: 12,
			yearlyPrice: 122.4,
			monthlyPriceCents: 1200,
			yearlyPriceCents: 12240,
		},
		display: {
			name: "Sapling",
			tagline: "Growing strong",
			description: "For blogs finding their voice. Room to stretch and grow.",
			icon: "tree-deciduous",
			bestFor: "Regular writers",
			featureStrings: [
				"Unlimited blooms",
				"5 GB storage",
				// TODO(foliage): uncomment when themes launch
				// "10 themes",
				"5 nav pages",
				"Unlimited curios",
				"Centennial eligible",
				"Everything in Seedling",
			],
			standardName: "Growth",
			standardFeatureStrings: [
				"Unlimited posts",
				"5 GB storage",
				// TODO(foliage): uncomment when themes launch
				// "10 themes",
				"5 nav pages",
				"Unlimited curios",
				"100-year preservation eligible",
				"Everything in Starter",
			],
		},
		support: { level: "email", displayString: "Email" },
	},

	oak: {
		id: "oak",
		order: 3,
		status: "future",
		limits: {
			posts: Infinity,
			drafts: Infinity,
			storage: 20 * 1024 * 1024 * 1024, // 20 GB
			storageDisplay: "20 GB",
			themes: 1,
			curioTypes: Infinity,
			navPages: 10,
			commentsPerWeek: Infinity,
			aiWordsPerMonth: 15000, // ~500/day * 30 days
		},
		features: {
			blog: true,
			customDomain: true,
			byod: true,
			themeCustomizer: true,
			customFonts: false,
			shop: true,
			ai: true,
			analytics: true,
		},
		rateLimits: {
			requests: { limit: 1000, windowSeconds: 60 },
			writes: { limit: 500, windowSeconds: 3600 },
			uploads: { limit: 200, windowSeconds: 86400 },
			ai: { limit: 500, windowSeconds: 86400 },
		},
		pricing: {
			monthlyPrice: 25,
			yearlyPrice: 255,
			monthlyPriceCents: 2500,
			yearlyPriceCents: 25500,
		},
		display: {
			name: "Oak",
			tagline: "Deep roots",
			description: "Your own domain, full email, and complete creative control.",
			icon: "trees",
			bestFor: "Established writers",
			featureStrings: [
				"Unlimited blooms",
				"20 GB storage",
				// TODO(foliage): uncomment when themes launch
				// "Theme customizer",
				"10 nav pages",
				"Bring your own domain",
				"Centennial eligible",
				"Priority support",
			],
			standardName: "Pro",
			standardFeatureStrings: [
				"Unlimited posts",
				"20 GB storage",
				// TODO(foliage): uncomment when themes launch
				// "Theme customizer",
				"10 nav pages",
				"Bring your own domain",
				"100-year preservation eligible",
				"Priority support",
			],
		},
		support: { level: "priority", displayString: "Priority" },
	},

	evergreen: {
		id: "evergreen",
		order: 4,
		status: "future",
		limits: {
			posts: Infinity,
			drafts: Infinity,
			storage: 100 * 1024 * 1024 * 1024, // 100 GB
			storageDisplay: "100 GB",
			themes: 1,
			curioTypes: Infinity,
			navPages: 20,
			commentsPerWeek: Infinity,
			aiWordsPerMonth: 75000, // ~2500/day * 30 days
		},
		features: {
			blog: true,
			customDomain: true,
			byod: false, // Domain included
			themeCustomizer: true,
			customFonts: true,
			shop: true,
			ai: true,
			analytics: true,
		},
		rateLimits: {
			requests: { limit: 5000, windowSeconds: 60 },
			writes: { limit: 2000, windowSeconds: 3600 },
			uploads: { limit: 1000, windowSeconds: 86400 },
			ai: { limit: 2500, windowSeconds: 86400 },
		},
		pricing: {
			monthlyPrice: 35,
			yearlyPrice: 357,
			monthlyPriceCents: 3500,
			yearlyPriceCents: 35700,
		},
		display: {
			name: "Evergreen",
			tagline: "Always flourishing",
			description: "Domain included, dedicated support, and everything Grove has to offer.",
			icon: "crown",
			bestFor: "Professionals",
			featureStrings: [
				"Unlimited everything",
				"100 GB storage",
				"Custom fonts",
				"20 nav pages",
				"Domain included",
				"Centennial eligible",
				"8 hrs/mo dedicated support",
			],
			standardName: "Ultra",
			standardFeatureStrings: [
				"Unlimited everything",
				"100 GB storage",
				"Custom fonts",
				"20 nav pages",
				"Domain included",
				"100-year preservation eligible",
				"8 hrs/mo dedicated support",
			],
		},
		support: {
			level: "dedicated",
			displayString: "8hrs + Priority",
			includedHours: 8,
		},
	},
} as const;

export const DEFAULT_TIER: TierKey = "seedling";

export const TIER_ORDER: TierKey[] = ["wanderer", "seedling", "sapling", "oak", "evergreen"];
export const PAID_TIERS: PaidTierKey[] = ["seedling", "sapling", "oak", "evergreen"];

export const TIER_STORAGE_GB: Record<TierKey, number> = Object.fromEntries(
	TIER_ORDER.map((key) => [key, Math.floor(TIERS[key].limits.storage / (1024 * 1024 * 1024))]),
) as Record<TierKey, number>;
