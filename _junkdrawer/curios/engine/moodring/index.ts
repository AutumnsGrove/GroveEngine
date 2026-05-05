/**
 * Mood Ring Curio
 *
 * Visual mood indicator — a mystical artifact that changes color
 * based on time of day, season, manual setting, or randomness.
 *
 * Features:
 * - Time-based mode (smooth interpolation between dawn → morning → afternoon → evening → night)
 * - Manual mood with custom color
 * - Seasonal mode (follows Grove seasons, including midnight)
 * - Random mode (gentle color drift on each visit)
 * - Optional mood log (dot constellation)
 * - 7 display styles: ring, gem, orb, crystal, flame, leaf, moon
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Mood ring mode
 */
export type MoodRingMode = "time" | "manual" | "seasonal" | "random";

/**
 * Display style for the mood indicator
 */
export type MoodDisplayStyle = "ring" | "gem" | "orb" | "crystal" | "flame" | "leaf" | "moon";

/**
 * Color scheme
 */
export type ColorScheme = "default" | "warm" | "cool" | "forest" | "sunset";

/**
 * Mood ring config record
 */
export interface MoodRingConfigRecord {
	tenantId: string;
	mode: MoodRingMode;
	manualMood: string | null;
	manualColor: string | null;
	colorScheme: ColorScheme;
	displayStyle: MoodDisplayStyle;
	updatedAt: string;
}

/**
 * Mood ring config for public display
 */
export interface MoodRingConfigDisplay {
	mode: MoodRingMode;
	manualMood: string | null;
	manualColor: string | null;
	colorScheme: ColorScheme;
	displayStyle: MoodDisplayStyle;
	currentColor: string;
	currentMoodName: string;
}

/**
 * Mood log entry
 */
export interface MoodLogEntry {
	id: string;
	tenantId: string;
	mood: string;
	color: string;
	note: string | null;
	loggedAt: string;
}

/**
 * Mood log for public display
 */
export interface MoodLogDisplay {
	mood: string;
	color: string;
	note: string | null;
	loggedAt: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Mode options
 */
export const MODE_OPTIONS: {
	value: MoodRingMode;
	label: string;
	description: string;
}[] = [
	{
		value: "time",
		label: "Time-Based",
		description: "Changes color with the time of day",
	},
	{
		value: "manual",
		label: "Manual",
		description: "Set your mood with a custom color",
	},
	{
		value: "seasonal",
		label: "Seasonal",
		description: "Follows the Grove seasons",
	},
	{
		value: "random",
		label: "Random",
		description: "Subtle color shifts on each visit",
	},
];

/**
 * Display style options
 */
export const DISPLAY_STYLE_OPTIONS: {
	value: MoodDisplayStyle;
	label: string;
	description: string;
}[] = [
	{ value: "ring", label: "Ring", description: "A hollow circle with a glowing border" },
	{ value: "gem", label: "Gem", description: "A faceted diamond shape" },
	{ value: "orb", label: "Orb", description: "A solid sphere with an inner highlight" },
	{ value: "crystal", label: "Crystal", description: "A hexagonal prism with prismatic light" },
	{ value: "flame", label: "Flame", description: "A flickering teardrop shape" },
	{ value: "leaf", label: "Leaf", description: "An organic leaf with gentle rotation" },
	{ value: "moon", label: "Moon", description: "A crescent moon with a soft glow" },
];

/**
 * Color scheme options
 */
export const COLOR_SCHEME_OPTIONS: {
	value: ColorScheme;
	label: string;
}[] = [
	{ value: "default", label: "Default" },
	{ value: "warm", label: "Warm" },
	{ value: "cool", label: "Cool" },
	{ value: "forest", label: "Forest" },
	{ value: "sunset", label: "Sunset" },
];

/**
 * Time-of-day color mapping
 */
export const TIME_COLORS: {
	name: string;
	color: string;
	startHour: number;
}[] = [
	{ name: "Deep Night", color: "#2a2d5e", startHour: 0 },
	{ name: "Dawn", color: "#6b7fb5", startHour: 5 },
	{ name: "Morning", color: "#d4a843", startHour: 7 },
	{ name: "Midday", color: "#5a9e4b", startHour: 11 },
	{ name: "Afternoon", color: "#7cb85c", startHour: 14 },
	{ name: "Evening", color: "#8b5eb0", startHour: 18 },
	{ name: "Night", color: "#3d4a7a", startHour: 21 },
];

/**
 * Seasonal color mapping
 */
export const SEASONAL_COLORS: Record<string, { name: string; color: string }> = {
	spring: { name: "Spring Growth", color: "#6abf69" },
	summer: { name: "Summer Warmth", color: "#e8b84b" },
	autumn: { name: "Autumn Harvest", color: "#d4853b" },
	winter: { name: "Winter Rest", color: "#7ba3c9" },
	midnight: { name: "Midnight Dreams", color: "#6b5eb0" },
};

/**
 * Random palette colors
 */
export const RANDOM_PALETTE: string[] = [
	"#7cb85c",
	"#d4a843",
	"#8b5eb0",
	"#5a9e9e",
	"#c76b6b",
	"#6b7fb5",
	"#b5856b",
	"#6bb58b",
];

/**
 * Valid sets
 */
export const VALID_MODES = new Set<string>(MODE_OPTIONS.map((m) => m.value));
export const VALID_DISPLAY_STYLES = new Set<string>(DISPLAY_STYLE_OPTIONS.map((s) => s.value));
export const VALID_COLOR_SCHEMES = new Set<string>(COLOR_SCHEME_OPTIONS.map((c) => c.value));

/**
 * Limits
 */
export const MAX_MOOD_TEXT_LENGTH = 50;
export const MAX_NOTE_LENGTH = 200;
export const MAX_LOG_ENTRIES = 365;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate mood log ID
 */
export function generateMoodLogId(): string {
	return `ml_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validate mode
 */
export function isValidMode(mode: string): mode is MoodRingMode {
	return VALID_MODES.has(mode);
}

/**
 * Validate display style
 */
export function isValidDisplayStyle(style: string): style is MoodDisplayStyle {
	return VALID_DISPLAY_STYLES.has(style);
}

/**
 * Validate color scheme
 */
export function isValidColorScheme(scheme: string): scheme is ColorScheme {
	return VALID_COLOR_SCHEMES.has(scheme);
}

/**
 * Validate hex color
 */
export function isValidHexColor(color: string): boolean {
	return /^#[0-9a-fA-F]{6}$/.test(color);
}

/**
 * Sanitize mood text
 */
export function sanitizeMoodText(text: string | null | undefined): string | null {
	if (!text) return null;
	const cleaned = stripHtml(text).trim();
	if (cleaned.length === 0) return null;
	if (cleaned.length > MAX_MOOD_TEXT_LENGTH) return cleaned.slice(0, MAX_MOOD_TEXT_LENGTH);
	return cleaned;
}

/**
 * Sanitize note text
 */
export function sanitizeNote(text: string | null | undefined): string | null {
	if (!text) return null;
	const cleaned = stripHtml(text).trim();
	if (cleaned.length === 0) return null;
	if (cleaned.length > MAX_NOTE_LENGTH) return cleaned.slice(0, MAX_NOTE_LENGTH);
	return cleaned;
}

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Parse a hex color string to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const n = parseInt(hex.slice(1), 16);
	return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/**
 * Convert RGB to HSL (all values 0-1)
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;

	if (max === min) return { h: 0, s: 0, l };

	const d = max - min;
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	let h = 0;
	if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
	else if (max === g) h = ((b - r) / d + 2) / 6;
	else h = ((r - g) / d + 4) / 6;

	return { h, s, l };
}

/**
 * Convert HSL (all values 0-1) back to hex
 */
export function hslToHex(h: number, s: number, l: number): string {
	const hue2rgb = (p: number, q: number, t: number) => {
		if (t < 0) t += 1;
		if (t > 1) t -= 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};

	let r: number, g: number, b: number;
	if (s === 0) {
		r = g = b = l;
	} else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	const toHex = (c: number) =>
		Math.round(Math.min(255, Math.max(0, c * 255)))
			.toString(16)
			.padStart(2, "0");
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Interpolate between two hex colors in HSL space.
 * Takes the shortest path around the hue wheel.
 */
export function lerpHexColors(a: string, b: string, t: number): string {
	const clamp = Math.min(1, Math.max(0, t));
	const rgbA = hexToRgb(a);
	const rgbB = hexToRgb(b);
	const hslA = rgbToHsl(rgbA.r, rgbA.g, rgbA.b);
	const hslB = rgbToHsl(rgbB.r, rgbB.g, rgbB.b);

	// Shortest arc for hue interpolation
	let dh = hslB.h - hslA.h;
	if (dh > 0.5) dh -= 1;
	if (dh < -0.5) dh += 1;

	const h = (hslA.h + dh * clamp + 1) % 1;
	const s = hslA.s + (hslB.s - hslA.s) * clamp;
	const l = hslA.l + (hslB.l - hslA.l) * clamp;

	return hslToHex(h, s, l);
}

/**
 * Lighten a hex color by shifting HSL lightness up
 */
export function lightenHex(hex: string, amount = 0.15): string {
	const { r, g, b } = hexToRgb(hex);
	const { h, s, l } = rgbToHsl(r, g, b);
	return hslToHex(h, s, Math.min(1, l + amount));
}

/**
 * Darken a hex color by shifting HSL lightness down
 */
export function darkenHex(hex: string, amount = 0.15): string {
	const { r, g, b } = hexToRgb(hex);
	const { h, s, l } = rgbToHsl(r, g, b);
	return hslToHex(h, s, Math.max(0, l - amount));
}

// =============================================================================
// Time, Season, Random Functions
// =============================================================================

/**
 * Get the current time-based color (discrete snap — original behavior)
 */
export function getTimeColor(hour?: number): { name: string; color: string } {
	const h = hour ?? new Date().getHours();
	let matched = TIME_COLORS[TIME_COLORS.length - 1];
	for (const tc of TIME_COLORS) {
		if (h >= tc.startHour) {
			matched = tc;
		}
	}
	return { name: matched.name, color: matched.color };
}

/**
 * Get a smoothly interpolated time color.
 * Instead of snapping between discrete time bands, blends between
 * the current and next color based on how far through the period we are.
 */
export function getInterpolatedTimeColor(
	hour?: number,
	minute?: number,
): { name: string; color: string } {
	const now = new Date();
	const h = hour ?? now.getHours();
	const m = minute ?? now.getMinutes();
	const totalMinutes = h * 60 + m;

	// Find current and next time period
	let currentIdx = 0;
	for (let i = 0; i < TIME_COLORS.length; i++) {
		if (h >= TIME_COLORS[i].startHour) {
			currentIdx = i;
		}
	}

	const nextIdx = (currentIdx + 1) % TIME_COLORS.length;
	const current = TIME_COLORS[currentIdx];
	const next = TIME_COLORS[nextIdx];

	// Calculate how far through the current period we are
	const currentStart = current.startHour * 60;
	const nextStart = nextIdx === 0 ? 24 * 60 : next.startHour * 60;
	const periodLength = nextStart - currentStart;
	const elapsed = totalMinutes - currentStart;
	const t = periodLength > 0 ? elapsed / periodLength : 0;

	return {
		name: current.name,
		color: lerpHexColors(current.color, next.color, t),
	};
}

/**
 * Get current season (simple northern hemisphere)
 */
export function getCurrentSeason(): string {
	const month = new Date().getMonth(); // 0-11
	if (month >= 2 && month <= 4) return "spring";
	if (month >= 5 && month <= 7) return "summer";
	if (month >= 8 && month <= 10) return "autumn";
	return "winter";
}

/**
 * Get seasonal color.
 * Accepts an optional season override (e.g. from seasonStore.current,
 * which includes "midnight" — a season the server doesn't auto-detect).
 */
export function getSeasonalColor(season?: string): { name: string; color: string } {
	const s = season || getCurrentSeason();
	return SEASONAL_COLORS[s] || SEASONAL_COLORS.autumn;
}

/**
 * Get a random palette color with drift data for smooth client-side transitions.
 * The seed window is 1 hour, so the color holds steady during a visit
 * but changes naturally between visits.
 */
export function getRandomColor(tenantId: string): {
	color: string;
	nextColor: string;
	driftT: number;
} {
	const hourSeed = Math.floor(Date.now() / 3600000); // changes every hour

	const hashStr = (s: string) => {
		let h = 0;
		for (let i = 0; i < s.length; i++) {
			h = (h << 5) - h + s.charCodeAt(i);
			h |= 0;
		}
		return Math.abs(h);
	};

	const currentHash = hashStr(`${tenantId}:${hourSeed}`);
	const nextHash = hashStr(`${tenantId}:${hourSeed + 1}`);
	const currentIdx = currentHash % RANDOM_PALETTE.length;
	const nextIdx = nextHash % RANDOM_PALETTE.length;

	// How far through the current hour we are (0-1)
	const minuteInHour = (Date.now() % 3600000) / 3600000;

	return {
		color: RANDOM_PALETTE[currentIdx],
		nextColor: RANDOM_PALETTE[nextIdx],
		driftT: minuteInHour,
	};
}

/**
 * Transform mood log to display
 */
export function toDisplayMoodLog(entry: MoodLogEntry): MoodLogDisplay {
	return {
		mood: entry.mood,
		color: entry.color,
		note: entry.note,
		loggedAt: entry.loggedAt,
	};
}
