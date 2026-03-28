import type { Component } from "svelte";
import {
	greens,
	earth,
	natural,
	bark,
	pinks,
	autumn,
} from "@autumnsgrove/lattice/ui/components/nature/palette";

export type AssetInfo = {
	component: Component<Record<string, unknown>>;
	category: string;
	props: string[];
};

// Color presets for the nature asset viewer
// Color presets
const colorPresets = [
	{ name: "Grove Green", value: greens.grove },
	{ name: "Deep Green", value: greens.deepGreen },
	{ name: "Meadow", value: greens.meadow },
	{ name: "Autumn Amber", value: autumn.amber },
	{ name: "Autumn Rust", value: autumn.rust },
	{ name: "Gold", value: autumn.gold },
	{ name: "Cherry Pink", value: pinks.blush },
	{ name: "Warm Bark", value: bark.warmBark },
	{ name: "Stone", value: earth.stone },
	{ name: "Cream", value: natural.cream },
];

// Prop options
const propOptions: Record<string, string[]> = {
	season: ["spring", "summer", "autumn", "winter"],
	variant: ["default"],
	facing: ["left", "right"],
	phase: ["full", "waning", "crescent", "new"],
	speed: ["slow", "normal", "fast"],
	breathingSpeed: ["slow", "normal", "fast"],
	intensity: ["subtle", "normal", "bright"],
	density: ["sparse", "normal", "dense"],
	direction: ["left", "right"],
};

const assetVariants: Record<string, string[]> = {
	GlassLogo: ["default", "accent", "frosted", "dark", "ethereal"],
	Rock: ["round", "flat", "jagged"],
	Leaf: ["oak", "maple", "simple", "aspen"],
	LeafFalling: ["simple", "maple"],
	PetalFalling: ["round", "pointed", "heart", "curled", "tiny"],
	Berry: ["cluster", "single", "branch"],
	Vine: ["tendril", "ivy", "flowering"],
	Reeds: ["cattail", "grass"],
	Star: ["twinkle", "point", "burst", "classic", "tiny"],
	Lattice: ["trellis", "fence", "archway"],
	FencePost: ["pointed", "flat", "round"],
	Lantern: ["hanging", "standing", "post"],
	Tulip: ["red", "pink", "yellow", "purple"],
	Crocus: ["purple", "yellow", "white"],
};

// Numeric prop ranges configuration
export const numericPropRanges: Record<string, { min: number; max: number; step: number }> = {
	opacity: { min: 0, max: 1, step: 0.1 },
};

export function getNumericRange(prop: string) {
	return numericPropRanges[prop] ?? { min: 0, max: 100, step: 1 };
}

export function isColorProp(prop: string): boolean {
	return prop.toLowerCase().includes("color");
}

export function isBooleanProp(prop: string): boolean {
	return [
		"animate",
		"animateEntrance",
		"breathing",
		"spotted",
		"rays",
		"hasFlower",
		"hasFlowers",
		"lit",
		"open",
	].includes(prop);
}

export function isValidHexColor(value: string): boolean {
	return /^#[0-9A-Fa-f]{6}$/.test(value);
}

// Carousel demo images
export const carouselImages = [
	{
		url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%2310b981"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 1%3C/text%3E%3C/svg%3E',
		alt: "Placeholder slide 1",
		caption: "First slide caption",
	},
	{
		url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23059669"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 2%3C/text%3E%3C/svg%3E',
		alt: "Placeholder slide 2",
		caption: "Second slide caption",
	},
	{
		url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23047857"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 3%3C/text%3E%3C/svg%3E',
		alt: "Placeholder slide 3",
		caption: "Third slide caption",
	},
];

// Glass variants for interactive demo
export const glassVariants = ["surface", "overlay", "card", "tint", "accent", "muted"] as const;
export const glassIntensities = ["none", "light", "medium", "strong"] as const;
