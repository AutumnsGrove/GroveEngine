/**
 * Roadmap feature data and phase styling.
 *
 * Single source of truth for:
 * - Phase configuration (order, titles, seasons, features)
 * - Phase visual styles (li classes, text colors, icon defaults)
 * - Per-feature color/border overrides
 *
 * Separated from the template to keep +page.svelte focused on layout
 * and nature scene decoration.
 */

import type { Season } from "@autumnsgrove/lattice/ui/nature";

// =============================================================================
// TYPES
// =============================================================================

export type PhaseKey =
	| "first-frost"
	| "thaw"
	| "first-buds"
	| "full-bloom"
	| "golden-hour"
	| "deep-roots"
	| "midnight-bloom";

export type Feature = {
	name: string;
	description: string;
	done: boolean;
	icon?: string;
	internal?: boolean;
	major?: boolean;
	dream?: boolean;
	articleSlug?: string;
	termSlug?: string;
};

export type PhaseData = {
	title: string;
	subtitle: string;
	season: Season;
	description: string;
	features: Feature[];
};

/**
 * Visual style contract for RoadmapFeatureItem.
 * Each phase defines one of these to control how its feature list renders.
 */
export type PhaseStyle = {
	/** Classes applied to the <li> element */
	li: string;
	/** Default icon color class (used when no per-feature override exists) */
	iconColor: string;
	/** Text color for feature name */
	nameColor: string;
	/** Text color for feature description */
	descColor: string;
	/** FeatureStar variant — 'midnight' for dark backgrounds */
	featureStar: "default" | "midnight";
	/** First Frost: always shows Check instead of feature-specific icon */
	useCheckIcon: boolean;
	/** Only Thaw shows the "Internal" badge on internal features */
	showInternalBadge: boolean;
};

// =============================================================================
// PHASE ORDER & CURRENT PHASE
// =============================================================================

export const PHASE_ORDER = [
	"first-frost",
	"thaw",
	"first-buds",
	"full-bloom",
	"golden-hour",
	"deep-roots",
	"midnight-bloom",
] as const;

/**
 * HOWTO: Update this constant as Grove reaches new phases.
 * This controls the "You are here" indicator and phase status styling.
 */
export const currentPhase: PhaseKey = "thaw";

// =============================================================================
// FEATURE DATA
// =============================================================================

export const phases: Record<PhaseKey, PhaseData> = {
	"first-frost": {
		title: "First Frost",
		subtitle: "The quiet before dawn",
		season: "winter" as Season,
		description: "The groundwork has been laid. Foundations built in stillness.",
		features: [
			{
				name: "Lattice",
				description: "Core engine — powers the grove",
				done: true,
				major: true,
				articleSlug: "what-is-lattice",
				termSlug: "lattice",
			},
			{
				name: "Heartwood",
				description: "Authentication — keeps you safe",
				done: true,
				major: true,
				articleSlug: "what-is-heartwood",
				termSlug: "heartwood",
			},
			{ name: "Landing Site", description: "grove.place welcomes visitors", done: true },
			{
				name: "Clearing",
				description: "Status page — transparent platform health",
				done: true,
				icon: "clearing",
				articleSlug: "what-is-clearing",
				termSlug: "clearing",
			},
			{
				name: "Patina",
				description: "Nightly backups — age as armor",
				done: true,
				icon: "database",
				internal: true,
				termSlug: "patina",
			},
			{
				name: "Petal",
				description: "Image moderation — protection without surveillance",
				done: true,
				icon: "petal",
				major: true,
				articleSlug: "what-is-petal",
				termSlug: "petal",
			},
			{
				name: "Forage",
				description: "Domain discovery — AI-powered name hunting",
				done: true,
				icon: "forage",
				articleSlug: "what-is-forage",
				termSlug: "forage",
			},
			{ name: "Email Waitlist", description: "Seeds, waiting to sprout", done: true },
		],
	},
	thaw: {
		title: "Thaw",
		subtitle: "The ice begins to crack",
		season: "winter" as Season,
		description: "Grove opens its doors. The first trees take root.",
		features: [
			{
				name: "Wanderer Tier",
				description: "Free forever — your space on the web",
				done: true,
				icon: "footprints",
				major: true,
				termSlug: "wanderer",
			},
			{
				name: "Seedling Tier",
				description: "$8/month — your corner of the grove",
				done: true,
				icon: "sprout",
				major: true,
				termSlug: "seedling",
			},
			{
				name: "Sign Up",
				description: "Google, email, or Hub account",
				done: true,
				icon: "userplus",
			},
			{ name: "Your Blog", description: "username.grove.place", done: true, icon: "globe" },
			{
				name: "Markdown Writing",
				description: "Write beautifully, simply",
				done: true,
				icon: "penline",
			},
			{ name: "Image Hosting", description: "Upload, we optimize", done: true, icon: "imageplus" },
			{ name: "RSS Feed", description: "Built-in, because it should be", done: true, icon: "rss" },
			{
				name: "Data Export",
				description: "Your words, always portable — a core feature",
				done: true,
				icon: "download",
				major: true,
			},
			{
				name: "Waystone",
				description: "Contextual help — guidance where you need it",
				done: true,
				icon: "signpost",
				articleSlug: "what-are-waystones",
				termSlug: "waystone",
			},
			{
				name: "Shade",
				description: "AI content protection — crawlers blocked at the gate",
				done: true,
				icon: "shieldcheck",
				major: true,
				articleSlug: "what-is-shade",
				termSlug: "shade",
			},
			{
				name: "Reeds",
				description: "Comments — replies and thoughtful discussions",
				done: true,
				icon: "reeds",
				major: true,
				articleSlug: "what-is-reeds",
				termSlug: "reeds",
			},
			{
				name: "Thorn",
				description: "Content moderation — keeping the grove safe",
				done: true,
				icon: "thorn",
				major: true,
				articleSlug: "what-is-thorn",
				termSlug: "thorn",
			},
			{
				name: "Porch",
				description: "Support conversations — come sit and talk",
				done: true,
				icon: "porch",
				articleSlug: "what-is-porch",
				termSlug: "porch",
			},
			{
				name: "Curios — Phase 1",
				description: "Guestbook, gallery, timeline, polls — the cabinet opens",
				done: true,
				icon: "curios",
				termSlug: "curios",
			},
		],
	},
	"first-buds": {
		title: "First Buds",
		subtitle: "Green emerging through snow",
		season: "spring" as Season,
		description: "New growth appears. The grove finds its voice.",
		features: [
			{
				name: "Sapling Tier",
				description: "More space, more themes",
				done: false,
				icon: "tree",
				major: true,
				termSlug: "sapling",
			},
			{
				name: "Foliage",
				description: "Theme library — more color for your corner",
				done: false,
				icon: "swatchbook",
				major: true,
				articleSlug: "what-is-foliage",
				termSlug: "foliage",
			},
			{
				name: "Fireside Mode",
				description: "Conversational drafting — have a chat, get a draft",
				done: false,
				icon: "fireside",
				major: true,
				termSlug: "fireside",
			},
			{
				name: "Scribe",
				description: "Voice transcription — speak it, we'll write it",
				done: false,
				icon: "scribe",
				termSlug: "scribe",
			},
			{
				name: "Curios — Phase 2",
				description: "Mood Ring, Badges, Shelves, Cursors, Hit Counter",
				done: false,
				icon: "curios",
				termSlug: "curios",
			},
		],
	},
	"full-bloom": {
		title: "Full Bloom",
		subtitle: "Petals everywhere",
		season: "summer" as Season,
		description: "The grove becomes a community. Roots intertwine.",
		features: [
			{
				name: "Forests",
				description: "Community groves — find your people",
				done: false,
				icon: "forests",
				major: true,
				termSlug: "forests",
			},
			{
				name: "Amber",
				description: "Storage dashboard — see and manage your files",
				done: false,
				icon: "amber",
				articleSlug: "what-is-amber",
				termSlug: "amber",
			},
			{
				name: "Rings",
				description: "Private analytics — your growth, reflected",
				done: false,
				icon: "trending",
				articleSlug: "what-is-rings",
				termSlug: "rings",
			},
			{
				name: "Oak & Evergreen Tiers",
				description: "Custom domains, full control",
				done: false,
				icon: "crown",
				major: true,
			},
			{
				name: "Foliage",
				description: "Theme customizer — make it truly yours",
				done: false,
				icon: "paintbrush",
				articleSlug: "what-is-foliage",
				termSlug: "foliage",
			},
			{
				name: "Community Themes",
				description: "Share what you create",
				done: false,
				icon: "users",
			},
			{
				name: "Curios — Phase 3",
				description: "Webring, Status Badge, Activity Status, Now Playing, Blogroll",
				done: false,
				icon: "curios",
				termSlug: "curios",
			},
		],
	},
	"golden-hour": {
		title: "Golden Hour",
		subtitle: "Warm light through the canopy",
		season: "autumn" as Season,
		description: "The grove settles into itself. A time for refinement.",
		features: [
			{
				name: "Import Tools",
				description: "Bring your words home — WordPress, Medium, Substack, Ghost, RSS",
				done: false,
				icon: "download",
			},
			{
				name: "Newsletter Integration",
				description: "Email your readers, straight from your grove",
				done: false,
				icon: "mail",
			},
			{
				name: "Theme Marketplace",
				description: "Community creations, shared and shown off",
				done: false,
				icon: "swatchbook",
			},
			{
				name: "Curios — Phase 4",
				description: "Ambient, Clip Art, Custom Uploads",
				done: false,
				icon: "curios",
				termSlug: "curios",
			},
		],
	},
	"deep-roots": {
		title: "Deep Roots",
		subtitle: "What the grove becomes, given time",
		season: "autumn" as Season,
		description:
			"These need the platform itself to mature first — more infrastructure, more trust, more time. Not cut. Not soon. Real, and worth the wait.",
		features: [
			{
				name: "Wander",
				description: "Immersive discovery — walk through the forest",
				done: false,
				major: true,
				icon: "wander",
				termSlug: "wander",
			},
			{
				name: "Meadow",
				description: "Social feed — connection without competition",
				done: false,
				major: true,
				icon: "meadow",
				articleSlug: "what-is-meadow",
				termSlug: "meadow",
			},
			{
				name: "Chirp",
				description: "Direct messages — a quiet word between two people",
				done: false,
				icon: "chirp",
				termSlug: "chirp",
			},
			{
				name: "Centennial",
				description: "The 100-year promise — your grove, preserved",
				done: false,
				major: true,
				icon: "centennial",
				termSlug: "centennial",
			},
			{
				name: "Curios — Phase 5",
				description: "Shrines, Artifacts — the most ambitious curios",
				done: false,
				icon: "curios",
				termSlug: "curios",
			},
		],
	},
	"midnight-bloom": {
		title: "Midnight Bloom",
		subtitle: "The far horizon — a dream taking shape",
		season: "winter" as Season,
		description:
			"Where digital roots meet physical ground. A late-night tea shop, and nothing else.",
		features: [
			{
				name: "The Café",
				description: "A late-night tea shop for the sleepless and searching",
				done: false,
				dream: true,
				icon: "coffee",
			},
			{
				name: "Community Boards",
				description: "QR codes linking physical to digital",
				done: false,
				dream: true,
				icon: "qrcode",
			},
			{
				name: "Local Zines",
				description: "Grove blogs printed and shared",
				done: false,
				dream: true,
				icon: "bookopen",
			},
			{
				name: "A Third Place",
				description: "That becomes a first home",
				done: false,
				dream: true,
				icon: "home",
				major: true,
			},
		],
	},
};

// =============================================================================
// ONGOING WORK (not a phase — always happening, never "done")
// =============================================================================

/**
 * Work that never completes on a single phase's timeline — revisited at every
 * stage rather than checked off once. Rendered separately from the seasonal
 * phase sequence; not part of PHASE_ORDER.
 */
export const ongoingFeatures: Feature[] = [
	{ name: "Accessibility", description: "Grove for everyone", icon: "accessibility", done: false },
	{ name: "Performance", description: "Fast everywhere, always", icon: "zap", done: false },
	{
		name: "Mobile Experience",
		description: "Beautiful on every screen",
		icon: "smartphone",
		done: false,
	},
	{ name: "Edge Cases", description: "The small things that matter", icon: "puzzle", done: false },
];

// =============================================================================
// PHASE STYLES
// =============================================================================

export const phaseStyles: Record<PhaseKey, PhaseStyle> = {
	"first-frost": {
		li: "bg-white/80 dark:bg-cream-50/25 backdrop-blur-sm shadow-sm",
		iconColor: "text-success",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: true,
		showInternalBadge: false,
	},
	thaw: {
		li: "bg-white/80 dark:bg-cream-50/25 backdrop-blur-sm border-l-4 border-accent shadow-sm",
		iconColor: "text-accent",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: false,
		showInternalBadge: true,
	},
	"first-buds": {
		li: "bg-white/80 dark:bg-cream-50/25 backdrop-blur-sm shadow-sm",
		iconColor: "text-bark-400",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: false,
		showInternalBadge: false,
	},
	"full-bloom": {
		li: "bg-white/80 dark:bg-cream-50/25 backdrop-blur-sm shadow-sm",
		iconColor: "text-bark-400",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: false,
		showInternalBadge: false,
	},
	"golden-hour": {
		li: "bg-white/70 dark:bg-cream-50/25 backdrop-blur-sm shadow-sm border-l-4 border-warning",
		iconColor: "text-warning",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: false,
		showInternalBadge: false,
	},
	"deep-roots": {
		li: "bg-white/60 dark:bg-cream-50/20 backdrop-blur-sm shadow-sm border-l-4 border-bark-400",
		iconColor: "text-bark-500",
		nameColor: "text-foreground",
		descColor: "text-foreground-muted",
		featureStar: "default",
		useCheckIcon: false,
		showInternalBadge: false,
	},
	"midnight-bloom": {
		li: "bg-surface-subtle backdrop-blur-sm border border-border",
		iconColor: "text-warning",
		nameColor: "text-white",
		descColor: "text-foreground-subtle",
		featureStar: "midnight",
		useCheckIcon: false,
		showInternalBadge: false,
	},
};

// =============================================================================
// PER-FEATURE COLOR/BORDER OVERRIDES
// =============================================================================

/** Per-feature icon color overrides for phases that need them */
export const featureColorMaps: Partial<Record<PhaseKey, Record<string, string>>> = {
	"first-buds": {
		tree: "text-success",
		swatchbook: "text-accent-subtle",
		fireside: "text-warning",
		scribe: "text-info",
		curios: "text-warning",
	},
	"full-bloom": {
		forests: "text-success",
		amber: "text-warning",
		trending: "text-success",
		crown: "text-warning",
		paintbrush: "text-accent-subtle",
		users: "text-accent",
		curios: "text-warning",
	},
	"golden-hour": {
		download: "text-info",
		mail: "text-accent",
		swatchbook: "text-warning",
		curios: "text-warning",
	},
	"deep-roots": {
		wander: "text-accent",
		meadow: "text-success",
		chirp: "text-info",
		centennial: "text-warning",
		curios: "text-warning",
	},
	"midnight-bloom": {
		coffee: "text-warning",
		qrcode: "text-accent",
		bookopen: "text-foreground-subtle",
		home: "text-warning",
	},
};

/** Per-feature border overrides (only First Buds uses per-feature borders) */
export const featureBorderMaps: Partial<Record<PhaseKey, Record<string, string>>> = {
	"first-buds": {
		tree: "border-l-4 border-success",
		swatchbook: "border-l-4 border-accent-subtle",
		fireside: "border-l-4 border-warning",
		scribe: "border-l-4 border-info",
		curios: "border-l-4 border-warning",
	},
};

// =============================================================================
// HELPERS
// =============================================================================

/** Get the status of a phase relative to the current phase */
export function getPhaseStatus(phaseKey: PhaseKey): "past" | "current" | "future" {
	const currentIndex = PHASE_ORDER.indexOf(currentPhase);
	const thisIndex = PHASE_ORDER.indexOf(phaseKey);

	if (thisIndex < currentIndex) return "past";
	if (thisIndex === currentIndex) return "current";
	return "future";
}

/** Pre-computed status for each phase */
export const phaseStatus: Record<PhaseKey, "past" | "current" | "future"> = {
	"first-frost": getPhaseStatus("first-frost"),
	thaw: getPhaseStatus("thaw"),
	"first-buds": getPhaseStatus("first-buds"),
	"full-bloom": getPhaseStatus("full-bloom"),
	"golden-hour": getPhaseStatus("golden-hour"),
	"deep-roots": getPhaseStatus("deep-roots"),
	"midnight-bloom": getPhaseStatus("midnight-bloom"),
};

/** Table of Contents headers derived from phase data */
export const tocHeaders = PHASE_ORDER.map((key) => ({
	id: key,
	text: phases[key].title,
	level: 2,
}));

/** Resolve the icon color for a feature within a phase */
export function getFeatureIconColor(phaseKey: PhaseKey, featureIcon?: string): string {
	if (!featureIcon) return phaseStyles[phaseKey].iconColor;
	return featureColorMaps[phaseKey]?.[featureIcon] ?? phaseStyles[phaseKey].iconColor;
}

/** Resolve the border class for a feature within a phase */
export function getFeatureBorderClass(phaseKey: PhaseKey, featureIcon?: string): string {
	if (!featureIcon) return "";
	return featureBorderMaps[phaseKey]?.[featureIcon] ?? "";
}
